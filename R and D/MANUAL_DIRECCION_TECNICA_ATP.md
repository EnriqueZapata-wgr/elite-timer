# 🎓 Manual de dirección técnica · ATP

**Para:** Enrique Zapata
**Objetivo:** entender el sistema completo lo suficiente para **dirigir** su construcción
con criterio, no para escribirlo a mano.
**Cómo usarlo:** está escrito para meterse a NotebookLM y hacer preguntas. Cada capítulo
es autocontenido y usa ejemplos reales de este repositorio.

---

# PARTE 0 · LA TESIS

Hay dos oficios distintos y suelen confundirse.

**Programar** es traducir una intención a instrucciones que una máquina ejecuta.
**Dirigir** es decidir qué se construye, en qué orden, con qué criterio de calidad, y
saber distinguir cuándo lo entregado está bien de cuándo solo lo parece.

El segundo oficio requiere entender el primero, **pero no ejecutarlo.** Un director de
orquesta no toca el violín mejor que el violinista; entiende lo suficiente de violín para
saber cuándo suena mal y por qué.

**Lo que te vuelve bueno dirigiendo:**

1. **Vocabulario preciso.** Si no sabes nombrar una cosa, no puedes pedirla ni evaluarla.
2. **Modelo mental del sistema.** Saber qué toca qué, para anticipar dónde va a romperse.
3. **Criterio de calidad.** Saber qué preguntar para descubrir si algo está mal.
4. **Sentido del tamaño.** Saber cuándo un encargo es demasiado grande antes de darlo.
5. **Doctrina.** Reglas que no se renegocian, para no volver a discutir lo mismo.

Este manual construye las cinco.

---

# PARTE I · EL MAPA MENTAL

## 1.1 · De qué está hecha una app moderna

Una app como ATP son **tres cosas separadas** que la gente confunde en una:

**El cliente.** El programa que vive en el teléfono. Dibuja pantallas, responde a los
toques, y guarda muy poco. En ATP está escrito en React Native con TypeScript.

**El servidor.** Donde viven los datos de verdad. Cuando registras una comida, el teléfono
no la guarda: se la manda al servidor. En ATP el servidor es Supabase, que por dentro es
una base de datos Postgres con una capa de acceso.

**Los servicios externos.** Cosas que no construimos: el modelo de Claude que hace pensar a
ARGOS, el servicio de UV que dice cuánto sol hay en tu ubicación, la pasarela de pagos.

⚠️ **La distinción que más importa dirigiendo:** cambiar el cliente es barato y reversible;
cambiar el servidor es caro y a veces irreversible. Por eso las migraciones se auditan
distinto que las pantallas.

## 1.2 · El stack de ATP, pieza por pieza

| Pieza | Qué es | Por qué está |
|---|---|---|
| **React Native** | permite escribir una app para iPhone y Android con un solo código | no escribir la app dos veces |
| **Expo** | una capa encima de React Native que resuelve lo difícil (cámara, notificaciones, actualizaciones) | sin Expo habría que tocar código nativo de Apple y Google |
| **TypeScript** | JavaScript con tipos: obliga a declarar de qué clase es cada dato | atrapa errores antes de que lleguen al usuario |
| **expo-router** | el sistema de navegación: cada archivo en `app/` es una pantalla | la estructura de carpetas ES el mapa de la app |
| **Supabase** | base de datos Postgres + autenticación + almacenamiento + funciones | backend completo sin construir un servidor |
| **EAS** | el servicio de Expo que compila la app y publica actualizaciones | es como llega tu código al teléfono |
| **Vitest** | corre las pruebas automáticas | evita que un arreglo rompa otras tres cosas |
| **Sentry** | avisa cuando la app truena en el teléfono de alguien | sin esto te enteras por una reseña de una estrella |
| **PostHog** | registra qué hace la gente dentro de la app | saber qué usan de verdad, no qué crees que usan |

---

# PARTE II · EL TALLER

Las herramientas alrededor del código. Casi todas las dudas que has tenido viven aquí.

## 2.1 · Git: la máquina del tiempo

**Git** guarda la historia completa de tu código: cada cambio, quién lo hizo, cuándo, y
por qué. Su unidad es el **commit**.

**Un commit** es una foto del proyecto en un instante, con un mensaje que explica qué
cambió. Cuando ves `9a1cf38 MB-27 V3 audit: muere el em dash en copy visible`, eso es un
commit: un identificador y su mensaje.

**Una rama (branch)** es una línea de trabajo paralela. `main` es la rama principal, la
que representa "lo que es verdad hoy". Cuando CC trabaja en `feat/mb28a-comida`, está en
una realidad alterna donde puede romper todo sin afectar `main`.

**Mergear** es traer una rama a otra. Cuando `feat/mb27-cuerpo` se mergeó a `main`, sus 28
commits pasaron a formar parte de la historia oficial.

⚠️ **Por qué el merge es el momento delicado:** es cuando lo experimental se vuelve real.
Por eso auditamos ANTES de mergear, nunca después. Después ya está en la historia y sacarlo
es cirugía.

**Un conflicto** ocurre cuando dos ramas cambiaron la misma línea del mismo archivo y git
no sabe cuál gana. Por eso el brief de MB-28C dice qué archivos NO tocar: dos ramas
paralelas que editan el mismo archivo garantizan conflicto.

## 2.2 · GitHub: la copia que vive fuera de tu casa

Git corre en tu máquina. **GitHub** es un servicio que guarda una copia de tu repositorio
en internet.

- **`git push`** — manda tus commits locales a GitHub.
- **`git pull`** — trae a tu máquina los commits que otros subieron.
- **`origin`** — el apodo de tu copia en GitHub. `origin/main` significa "la rama main como
  está en GitHub", que puede ser distinta de tu `main` local.

⚠️ **El error que más te ha mordido:** `rejected · non-fast-forward` significa que GitHub
tiene commits que tú no tienes, y git se niega a sobrescribirlos. Se resuelve con
`git pull --rebase` (trae lo de allá y pone lo tuyo encima) y luego `git push`.

**`git status`** contesta tres preguntas: en qué rama estoy, qué cambié y no he
commiteado, y si estoy al día con GitHub. Es el primer comando cuando algo se siente raro.

## 2.3 · `.gitignore`: lo que NO se guarda

Un archivo de texto que lista lo que git debe ignorar. En ATP incluye:

- **`node_modules/`** — las librerías descargadas. Son cientos de megas y se reconstruyen
  con un comando: guardarlas sería absurdo.
- **`.env`** — tus llaves y contraseñas. **Nunca deben entrar al repositorio.** Es la
  razón por la que tu repo público no te expuso.
- **`.expo/`** — archivos que Expo genera solo.

⚠️ **La consecuencia práctica:** lo ignorado **no viaja.** Por eso cada worktree nuevo
necesita `npm install` y que copies el `.env` a mano. No es un capricho: es que git nunca
los tuvo.

## 2.4 · Worktrees: varias mesas de trabajo

Normalmente una rama a la vez: cambias de rama y los archivos de tu carpeta cambian.

Un **worktree** es una carpeta adicional del mismo repositorio, parada en otra rama. Por
eso puedes tener `ATP-MB28A` y `ATP-MB28C` trabajando en paralelo sin estorbarse: son
carpetas distintas, ramas distintas, misma historia compartida.

**La regla de ATP:** el checkout principal (`EliteTimer`) es de Enrique. CC siempre trabaja
en un worktree hermano. Nació de un accidente real: CC trabajaba en el principal con una
rama a medias, se lanzó un OTA, y salió código incompleto a producción.

## 2.5 · `package.json` y `node_modules`

**`package.json`** es la lista de ingredientes: qué librerías necesita el proyecto y en qué
versión. Es un archivo chico y sí se guarda en git.

**`node_modules/`** es la despensa: las librerías ya descargadas. Son miles de carpetas y
**no** se guarda en git.

**`npm install`** lee la lista y llena la despensa. Por eso tarda: está descargando.

**`npm run <algo>`** ejecuta un atajo definido en `package.json`. Cuando corres
`npm run censo`, estás llamando un script propio de ATP que revisa que no haya pantallas
huérfanas.

## 2.6 · TypeScript y `tsc`

JavaScript te deja escribir `usuario.nombre` aunque `usuario` sea un número. Truena cuando
el usuario ya lo está usando.

**TypeScript** te obliga a declarar de qué tipo es cada cosa, y **`tsc`** (TypeScript
Compiler) revisa que todo cuadre **antes** de que corra.

`npx tsc --noEmit` significa: revisa todo y dime si hay errores, sin generar archivos.
**Cero errores es el mínimo, no una meta.**

⚠️ **El caso que te ha costado tres veces:** `.expo/types/router.d.ts` es un archivo que
Expo genera con la lista de rutas válidas. Si agregas una pantalla y no lo regeneras, `tsc`
truena diciendo que la ruta no existe — **y no es tu código, es el índice viejo.**

## 2.7 · Tests: el cinturón de seguridad

Un **test** es código que prueba otro código. Ejemplo real de ATP: *"si el usuario despierta
a las 7:00, la hora del sol debe salir 7:30"*. Si alguien rompe esa lógica, el test truena.

ATP tiene ~2,979 tests. **No están para demostrar que funciona: están para avisar cuando
algo dejó de funcionar.**

**El test de mutación** es la técnica que usamos para verificar que un test sirve de
verdad: rompes el código a propósito y confirmas que el test truena. Si no truena, el test
era decorativo. Por eso los briefs piden *"reporta el resultado real de las mutaciones, no
la intención"*.

⚠️ **La pregunta de director:** no preguntes "¿pasaron los tests?" Pregunta **"¿qué mutación
probaste y qué tronó?"** La primera se contesta con un sí vacío; la segunda no se puede
fingir.

---

# PARTE III · LA APP POR DENTRO

## 3.1 · La estructura de carpetas

```
app/                    ← las pantallas. Cada archivo es una ruta.
  (tabs)/               ← las pestañas de abajo
  food-register.tsx     ← se abre en /food-register
  centro/[appKey].tsx   ← ruta dinámica: /centro/meditar, /centro/ayuno...
src/
  components/           ← piezas reutilizables de interfaz
  services/             ← la lógica
  constants/            ← datos fijos: el registro de apps, los packs
docs/                   ← el design system
supabase/migrations/    ← los cambios a la base de datos
R and D/                ← briefs, auditorías, planes (esto no es código)
```

**Lo que hay que entender:** en `app/` la carpeta ES el mapa. Crear un archivo crea una
ruta. Por eso el censo revisa que no haya pantallas a las que nadie pueda llegar.

## 3.2 · El patrón `core` y `service` — el más importante de ATP

Fíjate en estos pares reales:

```
pack-core.ts        pack-service.ts
habit-states-core.ts   habit-states-service.ts
graduacion-core.ts     graduacion-service.ts
```

**`core`** contiene **funciones puras**: reciben datos, devuelven datos, no tocan nada
externo. `anclarHora(regla, despertar, dormir)` recibe tres valores y devuelve una hora.
Nada más.

**`service`** contiene los **efectos**: leer la base, escribir, mandar eventos.

**Por qué importa dirigiendo:** las funciones puras se prueban trivialmente — le das
entradas, verificas salidas, sin base de datos ni internet. Los efectos son caros de
probar. **Por eso ATP tiene 2,979 tests: la lógica difícil vive donde es barato probarla.**

⚠️ **Y por eso el hallazgo "cero tests de servicios" es deuda legítima:** los núcleos están
blindados y los efectos no. Es la deuda que más crece con cada bloque.

## 3.3 · Componentes, estado y hooks

Un **componente** es una pieza de pantalla reutilizable. `AppIcon` es un componente:
le pasas un nombre y dibuja el icono.

El **estado** es lo que la pantalla recuerda mientras la usas: qué escribiste, qué está
seleccionado. Se declara con `useState`.

Un **hook** es una función que engancha comportamiento a un componente. `useEffect` corre
código cuando algo pasa: al abrir la pantalla, al cambiar un dato, al salir.

⚠️ **`useEffect` es donde nacen los bugs feos.** El de los dos audios de meditación
empalmados es exactamente eso: cinco `useEffect` en la misma pantalla, y algún camino monta
un sonido nuevo sin apagar el anterior. **Cuando veas "cinco useEffect en un archivo",
sospecha.**

## 3.4 · El design system

`docs/DESIGN_SYSTEM.md` define colores, tipografía, espaciados y las reglas de composición
de ATP. Existe para que 89 pantallas se vean como una sola app.

**Los "colores legacy" del backlog** son pantallas hechas antes de que existiera, que
siguen usando la paleta de ELITE (el lima). Por eso todos los briefs dicen *"lee el design
system antes de tocar una pantalla"*.

---

# PARTE IV · EL SERVIDOR

## 4.1 · Postgres, tablas y filas

Una **base de datos** es un conjunto de tablas. Una **tabla** es como una hoja de cálculo
con columnas definidas. Una **fila** es un registro.

`user_habit_states` tiene columnas `user_id`, `habit_key`, `state`, `graduated_at`. Cada
fila dice "este usuario tiene este hábito en este estado".

**Una llave primaria** identifica cada fila sin ambigüedad. En esa tabla es la pareja
`(user_id, habit_key)`: un usuario tiene un solo estado por hábito.

**Un `CHECK`** es una regla que la base impone. En `user_packs`:

```sql
wake_time TEXT NOT NULL CHECK (wake_time ~ '^[0-2][0-9]:[0-5][0-9]$')
```

Eso obliga a que la hora tenga dos dígitos.

⚠️ **De ahí salió el bug que se me pasó:** el teléfono aceptaba `7:00` y la base exigía
`07:00`. Cliente y servidor validaban distinto. **Cuando veas una validación en dos lados,
pregunta si son idénticas.**

## 4.2 · Migraciones

Una **migración** es un archivo que cambia la estructura de la base: crea una tabla, agrega
una columna, modifica una regla. Están numeradas y se aplican en orden: `254_user_packs`,
`255_habit_states`, `256_health_measurements_medidas`.

**Las tres reglas de ATP, y su porqué:**

**Idempotente.** Correrla dos veces debe dar el mismo resultado que correrla una. Por eso
`CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS`. Sin esto, un reintento tumba
todo.

**`ENABLE ROW LEVEL SECURITY` + policy.** RLS significa que cada usuario solo ve sus
propias filas. **Sin RLS, cualquiera puede leer los datos de todos.** La policy define la
regla: `auth.uid() = user_id`.

**`ALTER`, no `CREATE`, cuando la tabla ya existe.** La 256 agregó tres columnas a
`health_measurements` en vez de crear una tabla nueva. Si hubiera creado otra, tendrías dos
tablas de medidas y ningún criterio de cuál manda.

⚠️ **El orden que no se rompe nunca:** `merge` → `supabase db push` → `eas update`. Si el
OTA sale antes que la migración, la app le pide a la base algo que no existe y truena.

## 4.3 · Edge Functions

Código que corre en el servidor, no en el teléfono. ATP usa `anthropic-proxy` para hablar
con Claude.

**Por qué no llamar a Claude directo desde el teléfono:** habría que poner la llave de API
dentro de la app, y cualquiera podría sacarla y gastar tu dinero. **La llave vive en el
servidor y el teléfono nunca la ve.**

Ese es el mismo principio de los 4 secrets pendientes: sin verificación de firma, el
webhook de pagos es una puerta donde cualquiera se da Pro solo.

---

# PARTE V · DEL CÓDIGO AL TELÉFONO

## 5.1 · Las dos formas de actualizar

**OTA (over the air)** — manda solo el JavaScript. Llega en minutos, sin pasar por Apple ni
Google. `eas update --branch preview`.

**Build nativo** — compila la app completa. Tarda, y para publicar hay que pasar revisión
de tiendas.

**La regla:** si el cambio es JavaScript o TypeScript, OTA. Si toca código nativo (un
permiso nuevo, una librería que usa la cámara o el micrófono, un icono de la app), build.

⚠️ **Por eso todo el plan tiene UN SOLO build (MB-30):** cada build es días de revisión de
tiendas. Se junta todo lo nativo y se paga el peaje una vez.

⚠️ **Y por eso `app.json` no se toca en un OTA:** ahí vive la versión, y cambiarla sin
compilar deja la app diciendo que es una versión que nunca se construyó.

## 5.2 · Runtime version

Un OTA solo llega a teléfonos cuya versión nativa lo soporta. Si el binario instalado es
viejo, el OTA nuevo lo ignora.

**Consecuencia práctica:** un OTA manda imágenes nuevas, pero **las viejas siguen dentro
del binario instalado** hasta el próximo build. Por eso "optimizamos las imágenes" no
siempre se nota de inmediato.

---

# PARTE VI · DIRIGIR

Aquí está el oficio que quieres dominar.

## 6.1 · El ciclo de ATP

```
1. Cowork escribe el brief        → R and D/AWAY_RUN_*.md
2. Enrique se lo pasa a CC        → CC trabaja en su worktree
3. CC entrega y SE DETIENE        → nunca mergea solo
4. Cowork audita sobre la rama    → veredicto verde o rojo
5. Con el verde, CC cierra        → merge, push, db push, OTA
6. Enrique verifica en dispositivo
```

**Por qué CC se detiene:** porque quien hace el trabajo no puede ser quien lo aprueba. No
es desconfianza, es estructura. Un auditor independiente encuentra lo que el ejecutor no
puede ver, porque el ejecutor ya decidió que estaba bien cuando lo escribió.

## 6.2 · Cómo se escribe un brief que no genera retrabajo

Los briefs buenos de ATP comparten anatomía:

**Diagnóstico antes que solución.** Empiezan explicando *por qué* existe el problema.
MB-26 abre con "HOY tiene puerta de entrada y no tiene puerta de salida". Con el porqué,
quien ejecuta puede tomar decisiones que no anticipaste.

**Piezas numeradas.** Cada una es un commit. Se puede auditar por partes.

**Avisos ANTES del paso, nunca después.** Es tu propia regla y aplica a todo.

**Decir qué NO se toca.** Tan importante como lo que sí. Es lo que evita conflictos entre
ramas paralelas.

**Pedir el resultado real, no la intención.** *"Reporta qué mutación probaste y qué tronó."*

**Verificación en dispositivo.** Una lista concreta de qué debe verse distinto.

## 6.3 · El tamaño: la lección de MB-27

MB-27 llevó 66 archivos, 4,507 líneas y **tres vueltas de audit.** MB-25 y MB-26 cerraron
en una.

**No fue culpa de la ejecución: el brief era demasiado grande.** Con esa superficie, cada
vuelta destapa cosas nuevas — no porque el código sea malo, sino porque hay demasiado que
revisar de un jalón, y los arreglos de una vuelta introducen problemas para la siguiente.

**La regla que sale de ahí:** un bloque debe caber en una vuelta de auditoría. Si tiene más
de tres o cuatro superficies distintas, pártelo. **Dos briefs de 30 archivos cuestan menos
que uno de 60.**

## 6.4 · Las preguntas que descubren problemas

Un director no revisa código; hace preguntas que el código tiene que contestar.

| Pregunta | Qué destapa |
|---|---|
| ¿Qué mutación probaste y qué tronó? | tests decorativos |
| ¿Esto valida igual en el cliente y en la base? | el bug de `7:00` |
| ¿Qué pasa si falla a la mitad? | estados corruptos |
| ¿Qué pasa si no hay red? | pantallas colgadas |
| ¿Quién más lee este dato? | efectos colaterales |
| ¿Esto borra algo? | pérdida de datos |
| ¿Qué NO tocaste que creí que ibas a tocar? | huecos silenciosos |
| ¿Qué inventaste que no estaba en el brief? | alcance creciendo solo |

## 6.5 · Los patrones de falla que ya viviste

**El fail-open.** Cuando algo falla, el sistema abre en vez de cerrar. La lectura de
preferencias de notificación fallaba y devolvía "sí notifica". La regla que salió: *"la
ausencia de evidencia no es evidencia de ausencia"* — tres estados, no dos: sí, no, y **no
se sabe**.

**El toggle silencioso.** El usuario enciende algo y no aparece nunca. Pasó con `checkin`,
y por eso MB-26 obliga a que toda puerta que encienda un hábito lo reactive.

**El código inofensivo que se vuelve peligroso.** `getCycleReport` no tenía protección y
daba igual, porque los hombres no podían llegar ahí. MB-22 abrió esa puerta y el bug nació
solo. **Cuando abras un camino nuevo, revisa qué código asumía que nadie llegaría.**

**El verde falso.** Un merge que dice "Aborting" y aun así corres las pruebas: pasan, pero
estabas probando lo viejo. Pasó dos veces. Por eso el protocolo dice correr los checks
**sobre el resultado del merge**.

**El botón que miente.** Un control cuyo efecto no existe. "Desactivar pack" no hacía nada
visible. **Un control que miente es peor que no tenerlo.**

## 6.6 · Doctrina de ATP

Reglas que no se renegocian. Existen para no volver a discutir lo mismo.

1. **El dato del usuario es sagrado.** Desinstalar, graduar o desactivar **nunca** borran
   historial.
2. **Guiado, no prisionero.** Se avisa una vez y se respeta la decisión.
3. **Cada superficie se toca una vez.** Los bugs viajan con el overhaul de su dominio.
4. **El motor antes que el contenido.** Se construye una vez y se reusa.
5. **Un solo build nativo.** Todo lo nativo se junta.
6. **Nunca prometer lo que no hace.** Ni en copy, ni en un ajuste, ni en un botón.
7. **Copy:** español de México, cero em dash, cero nombres de personas, nunca nombrar una
   enfermedad, diagnóstico o tratamiento.
8. **El checkout principal es tuyo.** Los agentes trabajan en worktrees.

## 6.7 · Dirigir un portafolio

Con varios proyectos a la vez, lo que escala no es tu tiempo sino **tu criterio codificado
en documentos.**

**Lo que hace que un proyecto avance sin ti:**

- **Un archivo de estado** que cualquiera lee para ponerse al día
  (`ESTADO_CONTINUIDAD.md`).
- **Un FIFO de pendientes** en un solo lugar (`FIFO_PENDIENTES.md`). Sin él, los pendientes
  se pierden entre auditorías.
- **Doctrina escrita** (`CLAUDE.md`). Lo que no está escrito se vuelve a discutir cada vez.
- **Un plan con orden y razones** (`PLAN_MAESTRO`). Sin el porqué, cualquiera reordena.

⚠️ **La lección más cara de esta semana:** mis briefs vivían solo en tu disco y nunca se
commitearon. Cuando tuviste que trabajar desde otro lado, el proyecto no podía continuar
sin tu computadora. **Si el conocimiento no está en el repositorio, no existe.**

**Tu trabajo real como director** son cinco cosas: decidir el orden, dimensionar los
encargos, exigir el criterio de calidad, proteger la doctrina, y **verificar en el
dispositivo** — porque eres el único que puede decir si se siente bien.

---

# PARTE VII · GLOSARIO

**Branch (rama)** · línea de trabajo paralela.
**Build** · compilar la app completa. Requiere revisión de tiendas.
**CHECK** · regla que la base de datos impone a una columna.
**Commit** · una foto del proyecto con su mensaje.
**Componente** · pieza reutilizable de interfaz.
**Core** · código puro: entra dato, sale dato, sin efectos.
**Edge Function** · código que corre en el servidor.
**Efecto** · cualquier acción que sale del programa: leer, escribir, mandar.
**Fail-open / fail-closed** · qué hace el sistema cuando algo falla: permitir o negar.
**Hook** · función que engancha comportamiento a un componente.
**Idempotente** · correrlo dos veces da el mismo resultado que una.
**Merge** · traer una rama a otra.
**Migración** · archivo que cambia la estructura de la base de datos.
**node_modules** · las librerías descargadas. No se guarda en git.
**OTA** · actualización que manda solo JavaScript, sin pasar por tiendas.
**Policy** · regla de RLS que define quién ve qué.
**Pull / Push** · traer de GitHub / mandar a GitHub.
**Rebase** · reacomodar tus commits encima de los de otro.
**RLS** · Row Level Security: cada quien ve solo sus filas.
**Runtime version** · qué binarios pueden recibir cierto OTA.
**Service** · código con efectos, en contraste con core.
**Test de mutación** · romper a propósito para verificar que el test avisa.
**tsc** · el revisor de tipos de TypeScript.
**Worktree** · carpeta adicional del mismo repo, en otra rama.

---

# CÓMO ESTUDIAR ESTO

**Semana 1 · Vocabulario.** Partes II y VII. Meta: leer cualquier salida de git sin dudar.

**Semana 2 · El sistema.** Partes I, III y IV. Meta: ante un cambio, poder decir qué otras
piezas toca.

**Semana 3 · El oficio.** Parte VI. Meta: leer un brief tuyo viejo y detectar dónde estaba
demasiado grande o ambiguo.

**Permanente.** Cada vez que algo se rompa, pregunta a qué patrón de 6.5 pertenece. La
mayoría de los errores nuevos son errores viejos con otra ropa.

⚠️ **Y lo más útil que puedes hacer:** cuando yo o CC te digamos algo que no entiendes,
pregunta qué significa. Cada vez que preguntaste esta semana — qué es `node_modules`, por
qué el `npm install`, qué es `claude.ai/code` — subiste un escalón. **Eso es el método.**
