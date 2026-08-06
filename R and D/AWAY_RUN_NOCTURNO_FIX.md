# 🔧 AWAY RUN NOCTURNO-FIX · lo que el audit encontró

**Rama:** seguir en `feat/nocturno` (no abrir otra: esto se mergea junto).
**Solo JS/TS salvo donde se diga.** Un commit por pieza.

Todo esto sale del audit de Cowork, `R and D/AUDIT_NOCTURNO_2026-08-02.md`. Cada hallazgo trae
**por qué importa**, no solo qué cambiar: si el porqué no encaja con lo que ves en el código,
párate y repórtalo en vez de forzar el arreglo.

`tsc`, Vitest y `npm run censo` en verde antes de cada commit.
**Cero em dash en copy de usuario. Cero nombres propios.**

---

# 🚨 PIEZA 1 · El copy de instalar miente (bloquea el merge)

## Qué pasa

El Alert de instalación en `app/(tabs)/kit.tsx` y el paso 7 del tour
(`src/components/tour/orb-tour-core.ts:59`) dicen lo mismo:

> *"Aparece su fila en TAREAS y su hábito empieza a contar desde hoy."*

**Es falso para cinco de las dieciséis apps con `installable: true`.** Cruzando
`electron-app-bridge.ts:24-50` contra `install-core.ts:23-34`:

| App | Por qué no genera fila |
|---|---|
| Sueño | `QUANTS_SIN_FUENTE` lo excluye de `QUANT_KEYS` |
| Ayuno | sus electrones no están en `ALL_BOOLEAN_OPTIONS` ni `DEFAULT_BOOLEANS` |
| Glucosa | ídem |
| Cetonas | ídem |
| Movilidad | `electronsForApp('movilidad')` devuelve `[]` |

Lo único que ocurre al instalarlas es que su llave entra a `installed_apps` y se prende el punto
lima. **El usuario toca Instalar, lee que aparecerá su fila, va a TAREAS, y no hay nada.**

## Por qué importa más que un texto

Es la primera promesa que la app le hace al usuario en el momento en que decide comprometerse
con un hábito. Si esa promesa falla, no pierde una fila: **pierde la confianza en que instalar
sirva de algo.** Y es justo el gesto sobre el que se construye todo MB-20.

## Qué hacer

**1.1 · Movilidad deja de ser instalable.** `installable: false` en el registro. **No es un
hábito diario, es una evaluación** (su ruta es `/mobility-assessment` y su propio alias dice
"evaluación"). Esto ya se había señalado en el audit de MB-19.2 y no se corrigió. Con esto son
cuatro casos, no cinco.

**1.2 · El copy se ramifica por lo que de verdad pasa.** Si la app genera fila, se dice. Si no
la genera, **se dice lo que sí hace**, sin inventar. Que el texto salga de una función que
consulte el mismo cruce que decide si hay fila, no de una constante escrita a mano: así no
pueden volver a desincronizarse.

**1.3 · El paso 7 del tour deja de prometer la fila como si fuera universal.**

⚠️ **Lo que NO se hace:** quitarles el punto lima o volverlas no instalables a las cuatro
restantes. Que alguien marque que le importa el ayuno o su glucosa **sí es información válida**,
y el punto es señal honesta. Lo que estaba mal era el texto, no el estado.

---

# 🟠 PIEZA 2 · La paloma inteligente existe en la mitad

## Qué pasa

`SmartCheckModal.tsx:82` solo pinta el botón SÍ cuando la experiencia es capturable, y la lista
es `EXPERIENCIA_CAPTURA = ['meditation','breathwork','cardio']` (`tareas-core.ts:135`).

Para **Entrenar, Journal y N-Back el modal tiene un único botón: "IR AHORA".**

⚠️ **Y el reporte de entrega afirma otra cosa:** dice *"Journal, N-Back y Entrenar: el SÍ navega
a su registro real"*. **Eso no está en el código.** No hay un SÍ que navegue: hay un modal de un
botón. **Corrige también esa línea del delivery doc**, porque un reporte que describe algo
distinto de lo entregado es peor que un bug.

## Por qué importa

En esas tres filas el tap largo **agrega un paso para terminar haciendo exactamente lo mismo que
el tap simple.** El gesto que se diseñó para ser el atajo se volvió el camino largo. Es peor que
no haberlo puesto.

## Qué hacer

Dos botones siempre. Para las tres no capturables, **el SÍ navega a su pantalla de registro real**
(Entrenar a su sesión, Journal a una entrada nueva, N-Back a su partida) y el NO cierra sin más.
Que el modal nunca tenga un solo botón.

Si para alguna no existe un destino de registro claro, **no la metas al modal**: que su tap largo
palomee directo, como los binarios. Un gesto que no ofrece opción no debería preguntar.

---

# 🟠 PIEZA 3 · La card de la orbe puede no aparecer nunca

## Qué pasa

`OrbCard.tsx:37-50` lee `argos_daily_insights` **una sola vez al montar**, con dependencias
`[userId, today]`, y devuelve `null` si no hay nada.

El insight lo **genera** `app/(tabs)/index.tsx:229`, en otro efecto, en paralelo.

En la primera entrada del día la lectura casi siempre gana la carrera: no hay insight todavía,
la card devuelve `null`, y **como el tab HOY no se desmonta, se queda invisible todo el día.**
Además `invalidateDailyInsight` (`index.tsx:104`) borra el cache sin que la card se entere.

## Por qué importa

Es el Morning Report, la pieza que la barrida de referentes identificó como **la feature más
querida de las once apps estudiadas**. Si aparece la mitad de los días, no existe.

## Qué hacer

Que la card se vuelva a enterar: listener de `day_changed` (y de lo que emita la generación del
insight), o refetch al enfocar la pantalla. **Y que no dependa del orden de montaje.**

Detalle del mismo archivo: `OrbCard.tsx:30` arranca en `useState(true)` y el store devuelve
`false` de forma asíncrona, así que la card **parpadea colapsada antes de abrirse.**

---

# 🟠 PIEZA 4 · El orden se rompe con horas de un dígito

## Qué pasa

`tareas-core.ts:262` y `:285` ordenan **comparando strings** sobre `time`. Todas las horas
canónicas llevan cero a la izquierda, pero `day-compiler.ts:715` construye la de romper ayuno
sin `padStart`:

```ts
time: `${breakTime.getHours()}:${mm}`
```

Con el ayuno terminando a las 9:30, el string es `"9:30"`, que **ordena después de `"22:30"`**.
La fila se va al final de su bloque y de la lente AGENDA, y se pinta desalineada en la columna
de hora.

## Por qué importa

Romper el ayuno es de las pocas filas con hora real y consecuencia real. Verla al final del día
es exactamente el tipo de detalle que hace que alguien deje de confiar en la lista.

## Qué hacer

`padStart(2,'0')` en el origen. **Y de paso, que el orden no dependa de comparar strings:**
ordena por minutos desde medianoche, que no se rompe nunca.

**Y arregla el bug de medianoche que vive al lado:** `tareas-core.ts:231` hace
`parseInt(i.time.slice(0,2), 10) || 12`. Con `"00:30"` el `parseInt` da `0`, que es falsy, y cae
a `12` → tarde. **Media noche y media se clasifica como tarde.**

---

# 🟠 PIEZA 5 · El tour secuestra al usuario

## Qué pasa

`OrbTour.tsx:46-53`: cada cambio de paso dispara `router.navigate(step.route)`. **No hay ninguna
detección de que el usuario navegó por su cuenta.** Si se sale, la burbuja lo persigue, y el
siguiente "SIGUIENTE" lo arrastra de vuelta a donde el tour quería.

## Por qué importa

El tour es lo primero que vive alguien que acaba de pagar. Un tour del que no puedes salirte no
enseña: **entrena a cerrar la app.**

## Qué hacer

Si la ruta actual deja de ser la del paso porque el usuario navegó, **el tour se pausa**: la
burbuja se esconde y aparece una forma discreta de continuar. Nunca lo regresa a la fuerza.

"Terminar tour" ya está en todos los pasos y eso está bien: no lo toques.

---

# 🟠 PIEZA 6 · La divergencia de Respiración quedó viva donde sí se ve

## Qué pasa

A3 migró `mente-hub-core.ts`, que **no lo renderiza ningún componente** (su único import desde
UI es `formatRelativeTime`).

La copia que **sí se pinta** está en `mente-streaks-core.ts:29`: `label: 'Respiración'`,
`icon: 'leaf-outline'`. Y `leaf-outline` significa **Grounding** en el mapa. Se renderiza en
`app/mente/progreso.tsx:109` y `:145`, o sea la pantalla Rachas.

Del mismo archivo: `journal-outline` (:25), `sparkles-outline` (:33) y `heart-outline` (:37).

## Qué hacer

Migrar `CATEGORY_COPY` de `mente-streaks-core.ts` a nombres lógicos del registro y que
`progreso.tsx` dibuje con `<AppIcon>`. **Es la misma clase de arreglo de A3, en el archivo que
de verdad se ve.**

---

# 🧹 PIEZA 7 · La limpieza que estorba después

Cosas chicas, todas del audit. Si alguna no sale limpia, sáltala y dilo.

**7.1 · El test que miente.** `install-core.test.ts:85-90`, llamado "sol enciende sus dos
electrones", compara el resultado **contra sí mismo filtrado**, así que pasa siempre. Y
`sun_awareness` en realidad nunca se enciende porque no está en `ALL_BOOLEAN_OPTIONS`. **O el
test dice la verdad, o se borra.** Un test que miente es peor que no tenerlo.

**7.2 · El estado rojo sigue en el árbol.** `argos-avatar-core.ts:36` conserva
`const RED = '#fb7185'` y el spec `unavailable` con su cruz roja, más su test. No lo renderiza
nadie, pero es material para resucitar lo que acabamos de retirar. **Bórralo con el resto de
huérfanos.**

**7.3 · `ArgosMark` usa `useId()` como id de gradiente SVG** (`ArgosMark.tsx:22`), lo que produce
ids con dos puntos (`argosMark-:r3:`) dentro de un `url(#...)`. Es sintaxis inválida en SVG
estricto. Cambia a un id determinista y sin dos puntos. **Y déjalo anotado para el device test:
hay que ver que el mark se pinta con degradado y no en negro, sobre todo en el chat donde se
monta muchas veces.**

**7.4 · El contador del nudge cuenta rebotes falsos.** `TareasView.tsx:108-124` compara contra
un valor que todavía no se recompiló, así que cuenta como "regresó sin hacer nada" casos en que
sí hizo algo. Y el `setTimeout` de `:120` no tiene cleanup.

**7.5 · Comentarios que mienten.** `argos-orb-core.ts:15-16` dice que copia los colores de
`brand.ts` tres líneas antes del import que lo desmiente. Y quedan tres comentarios anunciando
el tour viejo: `app/(tabs)/index.tsx:11`, `app/onboarding/v2/notifications.tsx:4` y
`onboarding-v2-core.ts:17`. Los restos del tour viejo (`AppTour.tsx`, `app-tour-core.ts`) se
pueden borrar si no los usa nadie: **verifícalo con el censo antes.**

**7.6 · El header de `icon-censo.test.ts`** dice que excluye `heart-outline`, y el `EXCLUIDOS`
real trae `help-circle-outline`. Corrige el comentario.

---

# ⚠️ NO ES DE ESTE RUN, PERO REPÓRTALO

**La migración 246 necesita un gate humano antes del `db push`.** Su `DROP CONSTRAINT IF EXISTS
cardio_sessions_source_check` puede ser no-op si Postgres autogeneró otro nombre en 036, y
entonces el ADD crea un segundo CHECK aditivo: **el import sigue roto y la migración reporta
éxito.** Enrique va a correr la query de verificación de tu cabecera. **No la apliques tú.**

**`assets/backgrounds` sigue en 35 MB**, más que todo `assets/images` ya optimizado, y ningún
guard lo cubre. Es la siguiente bolsa de peso. No es de este run.

**Nadie ha corrido la suite completa en Linux limpio**, y el CI que montaste la volvió
bloqueante. Si puedes hacer un `npm ci && npm test` de verdad antes de entregar, hazlo y reporta
el resultado. Si no puedes, dilo claramente.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte, además de lo hecho: **la corrección de la línea del delivery
anterior sobre el SÍ de Journal, N-Back y Entrenar.**

**Verificación en dispositivo, para Enrique:**
1. Instalar Sueño, Glucosa o Cetonas dice **lo que de verdad pasa**, y Movilidad ya no ofrece instalar.
2. Tap largo en Entrenar, Journal y N-Back ofrece **dos** opciones, no una.
3. La card de la orbe aparece **la primera vez que abres HOY en el día**, no a la segunda.
4. Romper ayuno a las 9:30 aparece **en su lugar** de la mañana, no al final.
5. Empezar el tour, navegar por tu cuenta a otra pantalla: **el tour se pausa y no te regresa.**
6. La pantalla Rachas dibuja Respiración con su icono, no con la hoja de Grounding.
7. El mark de ARGOS en el chat se ve con degradado, no en negro.
