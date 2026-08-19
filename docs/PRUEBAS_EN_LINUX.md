# Correr la suite desde Linux

Este documento resuelve el cuello de botella más caro del proyecto: durante
semanas, el dueño fue el único que pudo correr `npm test`. Cada ciclo terminaba
con él corriendo la suite de noche y reportando fallas que el agente pudo haber
cachado solo.

Ya no. Cualquier agente puede correr la suite completa desde el sandbox de
Linux, sin tocar el `node_modules` del dueño y sin que él haga nada.

---

## Cómo se corre

```bash
bash scripts/testing/pruebas-linux.sh
```

Con filtro, igual que vitest:

```bash
bash scripts/testing/pruebas-linux.sh src/services
bash scripts/testing/pruebas-linux.sh src/engine/__tests__/edad-atp.test.ts
```

La primera corrida de cada sandbox baja dos paquetes (unos 20 MB, un segundo).
Las siguientes ya no bajan nada.

**El dueño no tiene que correr nada.** Ni una vez. Todo pasa dentro del sandbox.

### Se tarda, y es normal

La suite completa son 347 archivos y toma alrededor de **85 minutos** en el
sandbox (2 CPUs, y el repo se lee por un mount de red lento). En Windows tarda
minutos. La diferencia es I/O del mount, no de los tests.

Por eso, cuando corras la suite completa, lánzala desacoplada y haz polling en
vez de esperar en una sola llamada:

```bash
setsid nohup bash -c 'cd /ruta/al/repo && stdbuf -oL bash scripts/testing/pruebas-linux.sh \
  --reporter=basic --reporter=json --outputFile.json=/tmp/suite.json \
  > /tmp/suite.log 2>&1; echo $? > /tmp/suite.done' < /dev/null > /dev/null 2>&1 &
```

Dos detalles que cuestan una hora si no los sabes:

- **`setsid`.** Sin eso, el sandbox mata el árbol de procesos cuando termina la
  llamada de shell, y la corrida muere en silencio dejando un log vacío.
- **`stdbuf -oL`.** Al redirigir a archivo, Node bufferiza por bloques. Sin esto
  el log se ve vacío por minutos y parece colgado cuando en realidad avanza.

Para iterar rápido, filtra por carpeta. La suite completa déjala para el cierre.

---

## Qué NO hay que hacer, y por qué

### Nunca `npm install` ni `npm ci` dentro del repo

Ni con banderas. Ni `--no-save`. Ni "solo para agregar un paquete".

El `node_modules` del repo está instalado desde Windows. Cuando npm corre desde
Linux sobre ese árbol, resuelve las dependencias opcionales para Linux y **poda
los paquetes de Windows** que ya no le parecen necesarios. Desde el sandbox esos
paquetes ya no se pueden volver a bajar en su versión de Windows.

Ya pasó una vez. Un agente destruyó el `node_modules` del dueño así y costó
horas recuperarlo.

### Nunca escribir dentro de `node_modules/`

Incluye el cache. Vite escribe por default en `node_modules/.vite`, que es
justamente el árbol intocable. Por eso existe
`scripts/testing/vitest.linux.config.mts`: lo único que cambia respecto al
config normal es mandar el cache a `/tmp/atp-vitest-cache`.

Si algún día alguien corre `vitest` a pelo desde Linux sin ese config, va a
escribir en el node_modules del dueño. Usa siempre el script.

### Nunca tocar `package.json` ni `package-lock.json` para esto

La solución no los necesita. Si alguna vez parece que sí, es señal de que se
tomó el camino equivocado.

---

## Cómo funciona (y por qué son 2 paquetes, no 1,500)

Vitest necesita **rollup** y **esbuild**, y los dos usan binarios nativos por
plataforma. El `node_modules` del repo solo trae los de Windows:

```
@rollup/rollup-win32-x64-msvc
@rollup/rollup-win32-x64-gnu
@esbuild/win32-x64
```

En Linux faltan sus equivalentes y vitest no arranca. **Eso es todo lo que
falta.** El resto de los 1,500 paquetes son JavaScript puro y corren igual en
cualquier plataforma.

El script instala esos dos, y nada más, en `/tmp/atp-linux-deps` (fuera del
repo) y se los presta a Node con `NODE_PATH`:

```
@rollup/rollup-linux-x64-gnu@<misma versión que el repo>
@esbuild/linux-x64@<misma versión que el repo>
```

`NODE_PATH` funciona aquí por una razón concreta: tanto rollup como esbuild
cargan su binario con un `require()` de CommonJS, y CommonJS sí consulta
`NODE_PATH` cuando no encuentra el módulo por la vía normal. Los `import` de
ESM lo ignorarían, pero esos resuelven contra el `node_modules` del repo, donde
sí están rollup y esbuild en JavaScript. Cada mitad se resuelve por donde le
toca.

Resultado: el `node_modules` del dueño se lee, nunca se escribe.

---

## Cómo se actualiza cuando cambien las dependencias

**No se actualiza a mano.** El script lee en cada corrida las versiones que hay
instaladas en el repo:

```bash
node -p "require('<repo>/node_modules/rollup/package.json').version"
node -p "require('<repo>/node_modules/esbuild/package.json').version"
```

y pide exactamente esas al instalar. Si el dueño actualiza vite, vitest o expo
desde Windows y con eso cambia la versión de rollup o de esbuild, la siguiente
corrida en Linux detecta que lo cacheado ya no coincide y baja la versión nueva
sola. No hay número escrito en ningún lado que se pueda quedar viejo.

Lo mismo con la máquina: el script detecta `x64` o `arm64` y si la libc es
`gnu` o `musl`, y arma el nombre del paquete de rollup que corresponde.

Lo único que rompería esto es que vitest empezara a necesitar un tercer binario
nativo. Se notaría de inmediato: el error sería el mismo tipo de mensaje
("Cannot find module @<algo>/<algo>-linux-x64"). En ese caso se agrega ese
paquete a la lista del script y ya.

---

## Si algo falla

**"Cannot find module @rollup/rollup-linux-x64-gnu"**
No se instalaron los nativos. Casi siempre es falta de red en el sandbox. El
script imprime los dos paquetes exactos que necesita.

**"No test files found"**
El filtro no pegó, o el `root` quedó mal. Los globs de `vitest.config.ts` son
relativos a la raíz del repo.

**El log se ve vacío y parece colgado**
Es el buffer, no un cuelgue. Ver `stdbuf -oL` arriba. Confirma con
`ps -eo args | grep 'vites[t]'`.

**Se murió sin dejar log**
Falta `setsid`. Ver arriba.

---

## Qué queda obsoleto

`scripts/run-tests-sin-vitest.js` y `scripts/shim-vitest.js` fueron intentos
previos de rodear este problema corriendo los tests sin vitest. Ya no hacen
falta: ahora corre el vitest de verdad, con el mismo config que en Windows, y
por lo tanto con los mismos resultados. Se dejan por ahora para no romper nada
que dependa de ellos, pero no son el camino.

---

## La regla corta

- Correr suite: `bash scripts/testing/pruebas-linux.sh`
- `npm install` dentro del repo desde Linux: **jamás**
- Escribir en `node_modules/`: **jamás**
- Versiones de los nativos: se detectan solas, no las escribas
