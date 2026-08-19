# 09 · La suite mide menos de lo que parece

**Escrito el 18 de agosto de 2026. Todos los conteos de este documento se midieron ese
día**, con los comandos que van al lado de cada uno.

Este documento existe por una razón muy concreta: en algún momento alguien va a leer
"4,372 pruebas en verde" y va a concluir que la aplicación se ve bien. **No lo concluye.**
Ese número es cierto y no significa lo que parece.

> **Nota sobre el 4,372, que es un ejemplo de lo que este handoff predica.** Ese número
> sale de una corrida, y una corrida solo la puede hacer el dueño (ver
> `08_PUNTO_UNICO_DE_FALLA.md`). Contando estáticamente el 18 de agosto de 2026 salen
> **3,858** llamadas a `it(` y `test(` en **347 archivos**. La diferencia se explica sobre
> todo por los `it.each` y `test.each`, que son 40 y generan varios casos cada uno en
> tiempo de ejecución. **No son números contradictorios, son dos cosas distintas:** uno
> cuenta bloques escritos, el otro cuenta casos ejecutados. Si citas cualquiera de los dos,
> di cuál es y con qué fecha.

---

## Primero, lo bueno, porque también es cierto

La suite no está inflada de relleno. Esto se midió:

- **Cero `.skip`, cero `.todo`, cero `xit`.** Una sola coincidencia en 347 archivos, y no
  es una prueba desactivada.
- **Cero `expect(true).toBe(true)`.** No hay pruebas de mentira puestas para subir el
  conteo.
- Las pruebas que existen prueban de verdad lo que dicen probar.

O sea que el problema **no es que las pruebas sean malas**. Es que están apuntando a otro
lado.

---

## El hueco, en una frase

**No hay una sola prueba de renderizado en todo el repositorio. Ninguna prueba monta una
pantalla.**

Verificado de tres formas:

1. `vitest.config.ts` fija `environment: 'node'`. No hay DOM.
2. `package.json` **no tiene `jsdom`, ni `@testing-library`, ni `react-test-renderer`.** No
   están ni como dependencia de desarrollo.
3. Archivos `*.test.tsx` en el repositorio: **cero**.

Con 142 pantallas y un ciclo entero de migración de tema, esto significa que **nada
verifica que una pantalla se dibuje.** Ni que monte, ni que no truene, ni que se lea.

### Y hay una trampa peor escondida en el patrón de inclusión

El `include` de vitest es `src/**/__tests__/**/*.test.ts`. Exige carpeta `__tests__` **y
extensión `.ts`**.

El día que alguien haga lo correcto y escriba la primera prueba de componente con extensión
`.tsx`, **el archivo no se ejecuta y la suite sigue verde.** No falla, no avisa, no aparece
en el conteo. Simplemente no corre.

Si vas a agregar pruebas de renderizado, lo primero que hay que tocar es ese patrón, antes
que la primera prueba.

---

## Por qué un contraste de 1.0 pasó todas las pruebas

Esta es la historia que hay que entender completa, porque la conclusión fácil es la
equivocada.

La caja "RESUMEN PARA PACIENTE" de `ClientDetailScreen.tsx` llegó a tener **contraste 1.0
en tema claro**, o sea texto invisible sobre su fondo, en una pantalla clínica. Pasó toda la
suite. Lo encontró un ojo humano mirando una captura.

**La conclusión fácil es "faltan pruebas de contraste". Es falsa: sí existen.** Viven en
`src/utils/contrast.ts` (`contrastRatio`, `relativeLuminance`, `compositeOver`), las usan
cinco suites, y calculan la razón de verdad. No comparan cadenas de texto.

El problema real es otro, y es más difícil de arreglar: **las listas de pares están escritas
a mano.** Son arreglos literales de `[nombre, frente, fondo, mínimo]`. **Ninguna prueba
deriva el par de color de frente y fondo del código real de una pantalla.**

O sea que la suite verifica que **los tokens son sanos**, nunca que **una pantalla los
use**. Un token perfecto usado mal es invisible para todo el arnés.

La ironía que remata el punto: después del arreglo, el par que quedó **sí está cubierto**
por una prueba. Por coincidencia. La prueba valida ese par de tokens en abstracto, no que
esta pantalla lo use.

---

## Cincuenta archivos leen texto en vez de comportamiento

**50 de los 347 archivos de prueba usan `readFileSync` o `readdirSync`**, o sea el 14.4% de
la suite. Medido con:

```powershell
grep -rln "readFileSync\|readdirSync" --include="*.test.ts" src supabase
```

Son guards estáticos: abren un archivo fuente y verifican que diga o no diga ciertas cosas.
Once de ellos leen SQL de migraciones.

**No son inútiles.** Atrapan regresiones reales, son baratos y corren rápido. Pero hay que
saber exactamente qué garantizan, porque la diferencia es la que dejó pasar el problema de
seguridad que la migración 296 intenta cerrar:

> **Un guard que lee un archivo de migración verifica una intención. Solo una consulta
> contra la base verifica un hecho.**

El permiso de `invite_client_by_email` se reabrió en la base sin que ninguna migración lo
tocara, casi seguro por una edición desde el editor de SQL. El guard estático de la
superficie de seguridad **siguió en verde todo el tiempo**, porque el archivo que él lee no
había cambiado. Tenía razón sobre el archivo y estaba equivocado sobre el mundo.

---

## Ninguna prueba toca una consulta real

**51 archivos simulan Supabase**, la mayoría con un objeto vacío del estilo
`() => ({ supabase: {} })`.

Es una decisión razonable para pruebas unitarias. La consecuencia hay que tenerla presente
igual: **ninguna prueba del repositorio ejerce una consulta real contra la base.** Todo lo
que dependa de que una columna exista, de que una política de acceso deje pasar, o de que
un filtro se serialice bien, no está cubierto por nada.

---

## El motor de rutinas está excluido de la suite

En `vitest.config.ts`:

```ts
exclude: ['node_modules', 'src/engine/__tests__/**'],  // engine.test.ts existente NO se toca
```

`src/engine/__tests__/engine.test.ts` son **384 líneas** que cubren el motor de ejecución de
rutinas: Tabata, la rutina de récord con sus cientos de pasos, el aplanado de rutinas, el
armado del árbol, la acumulación de descansos.

**No es una prueba de vitest.** Es un script a mano con `assert()` que se corre con
`npx tsx`, y **nada en `package.json` lo invoca.**

O sea: `npm test` **no corre toda la suite**, y lo que deja fuera es el motor. Lleva meses
sin verificarse y el verde no lo sabe.

---

## El archivo de mayor riesgo está excluido a propósito

`src/screens/coach/ClientDetailScreen.tsx` son **4,250 líneas** (medido con `wc -l`), con
unas 1,200 de diferencia por la migración de tema, y es la pantalla clínica del panel de
coach.

**Cobertura: cero.** La búsqueda de `ClientDetailScreen` en todos los `*.test.ts` devuelve
dos resultados, **y los dos son exclusiones**. La operativa está en
`src/__tests__/registro-comida.test.ts:178`, que lo salta por nombre:

```ts
if (f === WRITER || f === LEGACY_COACH_WRITER || f === 'src/screens/coach/ClientDetailScreen.tsx') continue;
```

Ningún test lo ejecuta, lo importa, lo renderiza ni lo lee. La única red que existe sobre
esas 4,250 líneas es `tsc`.

Y hay una segunda capa: **los ratchets que impiden colores a mano no cubren
`src/screens/coach/`.** Barren listas explícitas de rutas y esa carpeta no está en ninguna.
Quedan colores a mano en el archivo que ningún guard vigila.

**Tampoco lo cubre una prueba humana.** La pantalla solo se monta con ancho de 1024 o más y
usuario coach (`COACH_PANEL_MIN_WIDTH = 1024`). **En un teléfono no se ve nunca**, así que
ningún recorrido manual la iba a atrapar.

Es el único módulo del proyecto sin pruebas automáticas **ni** pruebas humanas. Ahí es
donde apareció el contraste 1.0, y no es casualidad.

---

## Entonces, ¿qué garantiza el verde?

**Lo que garantiza:**

- Que la lógica pura hace lo que dice: cálculos, transformaciones, reglas de negocio,
  helpers de las funciones de borde.
- Que ciertos archivos no volvieron a introducir un patrón prohibido (los 50 guards).
- Que los tokens de color, en abstracto, cumplen los mínimos de contraste.

**Lo que NO garantiza, y hay que decirlo cada vez que alguien cite el número:**

- Que una pantalla monte sin tronar.
- Que una pantalla se **vea**. Ni contraste real, ni cosas encimadas, ni texto cortado.
- Que una consulta a la base funcione, o que una política de acceso deje pasar a quien debe.
- Que el estado real de la base coincida con lo que dicen los archivos de migración.
- Que el motor de rutinas siga funcionando.
- Absolutamente nada sobre `ClientDetailScreen.tsx`.

Y encima de todo eso, el recordatorio que gobierna el resto: **nadie ha corrido esa suite
en este ciclo.** Ver `08_PUNTO_UNICO_DE_FALLA.md`. El verde que estamos discutiendo es un
verde que nadie vio.

---

## La frase que hay que usar

Cuando alguien pregunte si la aplicación está probada, la respuesta honesta es:

> **La lógica está bien cubierta. La interfaz no está cubierta en absoluto. Ninguna prueba
> abre una pantalla, así que ningún número en verde dice nada sobre cómo se ve la
> aplicación. Eso solo lo dice un teléfono.**

Por eso el recorrido en el dispositivo (`R and D/RECORRIDO_EN_TELEFONO.md`) no es opcional
ni es un extra de calidad: **es el único arnés que cubre la capa visual del producto.** Son
treinta minutos y no tiene sustituto automatizado hoy.

---

## Qué arreglaría, en orden

1. **Meter `src/screens/coach/` en los ratchets de tema y quitar la exclusión de
   `ClientDetailScreen`.** Es el cambio más barato con más rendimiento: dos listas.
2. **Agregar `jsdom` y `@testing-library/react-native`, y ampliar el `include` a `.tsx`.**
   Con una sola prueba que monte cada pantalla y verifique que no truena, se cubre la clase
   de bug más cara. No hace falta hacerlo para las 142 de golpe: empieza por las clínicas.
3. **Derivar los pares de contraste del código real** en vez de listarlos a mano. Es el
   arreglo de fondo del contraste 1.0, y el más laborioso de la lista.
4. **Invocar `engine.test.ts` desde `package.json`**, aunque sea con `npx tsx`, para que
   deje de estar fuera del verde.
5. **Cambiar los guards de seguridad para que le pregunten al servidor** en vez de leer el
   archivo de migración. Mientras lean archivos, van a seguir dando verde sobre una base
   que dice otra cosa.

Nada de esto se alcanza antes del 1 de septiembre y no debería intentarse ahora. Se escribe
para que el que llegue sepa **qué está creyendo cuando lee un número en verde**.
