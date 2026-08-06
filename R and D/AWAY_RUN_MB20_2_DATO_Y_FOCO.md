# 📊 AWAY RUN MB-20.2 · el dato de verdad y el foco que se rompió

**Rama:** seguir en `feat/mb20-1-editorial`. Un commit por pieza.
**Cero migraciones.** `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

## La decisión de Enrique, textual

> *"Todas las que tengan algún dato se le pone, y las que no se quedan como cards editoriales
> sin dato y luego lo imaginamos. TODAS las tareas son cards editoriales. Fin."*

**No hay versión chica. No hay fila para las que no tienen dato.** Card editorial para todas.
Las que no tengan dato van **sin línea de dato**, no con un texto de relleno.

---

# 🚨 PIEZA 1 · El auto-foco (bloquea el merge)

El brief anterior decía que el comportamiento no se tocaba. **La extracción de gestos quedó fiel**
(comparada valor por valor contra main), pero el auto-foco se rompió como daño colateral del
reordenamiento de bloques.

## 1.1 · La coordenada quedó relativa al contenedor equivocado

`TareasView.tsx:333` y `:255-269`. En `main` los bloques eran hijos directos de la raíz, así que
la `y` que capturaba `captureBlockY` era relativa a lo que espera el consumidor
(`app/(tabs)/index.tsx:330`). En la rama los hijos viven dentro de un `<View>` nuevo, y la `y`
perdió todo lo que va arriba: la fila de lentes, la fila global, la burbuja del nudge y `OrbCard`.

**El scroll cae entre 150 y 250 px arriba del bloque.**

Arreglo: medir contra la raíz. O mueves el `onLayout` a un envoltorio que sea hijo directo del
`<View>` raíz, o sumas la `y` del contenedor.

## 1.2 · Si el bloque de la hora ya está completo, no hay foco

`TareasView.tsx:106-111` y `:262-272`. `pendingBlocks` filtra los bloques sin pendientes, así que
si el momento actual ya está terminado su encabezado nunca se monta, `captureBlockY` nunca corre
y **no hay auto-foco de ningún tipo.**

Es exactamente el escenario que este run celebra: el muro que encoge a media tarde.

**Qué debe pasar:** si el bloque de la hora ya no tiene pendientes, el foco va **al siguiente
bloque con pendientes.** Y si ya no queda ninguno, no scrollea: el usuario terminó su día y
merece ver la cinta de hechas completa.

## 1.3 · Y ponle test

`pickHeroTarea` tiene cinco tests y es lo menos riesgoso del run. **El reparto hechas contra
pendientes y la regla del foco tienen cero**, y son justo lo que se rompió. Que no vuelva.

---

# PIEZA 2 · El dato de verdad, y sale casi gratis

## 2.1 · El hallazgo que hace esto barato

**Las queries ya existen. Solo tiran el dato.**

En `day-compiler.ts:192-210`, seis consultas usan `.select('id', { count: 'exact', head: true })`:
`exercise_logs`, `supplement_logs`, `cardio_sessions`, `journal_entries`, `nback_sessions` y las
de `electron_logs`. **`head: true` significa "no me traigas filas, solo cuéntalas".** Cambiar eso
para que además devuelva la última fila **no agrega un round trip: es la misma consulta.**

Y el check-in es todavía más barato: `day-compiler.ts:184` **ya trae el último `emotional_checkin`
completo**, con su `quadrant` y su `created_at`. El dato ya está en memoria y nadie lo usa para
la card.

## 2.2 · Qué muestra cada card

| Card | Dato | De dónde |
|---|---|---|
| Agua | `750 ml de 2.5 L` + barra + `+250 ml` | ✅ ya funciona |
| Proteína | `0 g de 150 g` + barra | ✅ ya funciona |
| Sol | UV ahora + ventana | ✅ ya funciona |
| Ayuno | horas + a qué hora rompe | ✅ ya funciona |
| **Suplementos** | `2 de 5 tomados` | `supplement_logs`, ya consultada |
| **Entrenar** | la rutina de hoy, o la última sesión | `exercise_logs`, ya consultada |
| **Cardio** | última sesión: distancia y tiempo | `cardio_sessions`, ya consultada |
| **Journal** | última entrada, o su racha | `journal_entries`, ya consultada |
| **N-Back** | último nivel o partida | `nback_sessions`, ya consultada |
| **Check-in emocional** | dónde terminó la última vez | `emotional_checkins`, **ya está en memoria** |
| Meditación | minutos de la última sesión | `mind_sessions`, ver 2.3 |

## 2.3 · Si algo no alcanza, se queda sin dato

Si para alguna card el dato exige **una consulta nueva de verdad** (no modificar una existente),
**esa card se queda sin línea de dato** y lo reportas. Enrique fue explícito: *"luego lo
imaginamos."*

⚠️ **El techo sigue siendo el mismo: nada de una query por card.** Si al terminar hay más
consultas nuevas que una, algo se hizo mal.

## 2.4 · Fuera el folleto, y fuera el campo que lo trajo

Hoy nueve cards muestran texto de catálogo: *"Reduce cortisol, mejora enfoque y regula sistema
nervioso."* Es el mismo todos los días, para siempre, y **ocupa el lugar donde debería ir el dato.**

- **Se retira de la card.** La que no tiene dato va sin línea de dato.
- **Y se revierte el campo `description` que se agregó al modelo** (`tareas-core.ts:30, 183, 221`
  y `TareaBoolLike`). Se agregó para rellenar un hueco de piel tocando el esqueleto, que es justo
  lo que el brief anterior prohibía. **Si el dato no está, la card va vacía.**

---

# 🚨 PIEZA 2.5 · Las cards mandan al lugar equivocado (device test de Enrique)

## Lo que reportó

| Card | A dónde va | A dónde debería |
|---|---|---|
| Luz solar | ATP Salud | **/solar** |
| Baño frío | ATP Salud | **a ningún lado** |
| Grounding | ATP Salud | **a ningún lado** |
| Sin alcohol | ATP Nutrición | **a ningún lado** |
| Lentes rojos | ATP Salud | **a ningún lado** |

Meditación, check-in, fuerza y registrar ciclo funcionan bien.

**Decisión de Enrique, textual:** *"los que no tengan a dónde mandar, que no manden a nada."*

## La causa

`tareas-core.ts:203-204`:

```ts
const route: TareaRoute | undefined =
  (VERIFIED_ELECTRON_ROUTES as Record<string, string>)[e.source] ?? e.pillarRoute;
```

`VERIFIED_ELECTRON_ROUTES` (`day-booleans.ts:73-83`) tiene **solo nueve entradas** y no incluye
`sunlight`. Todo lo que no esté ahí **cae al hub del pilar**. Por eso baño frío, grounding y
lentes rojos terminan en ATP Salud, y sin alcohol en ATP Nutrición.

## El arreglo, y es el bonito: la respuesta ya existe

`src/constants/electron-app-bridge.ts` **ya sabe todo esto**, y se construyó en MB-19.2 justo
para no tener dos verdades:

- `ELECTRON_TO_APP` mapea `sunlight → 'sol'`, y también glucosa, cetonas, labs, protocolos y ayuno.
- `ELECTRONS_SIN_APP` declara los ocho que **deliberadamente no tienen app**: `cold_shower`,
  `grounding`, `no_alcohol`, `red_glasses`, `steps`, `no_processed_foods`, `screen_time_cutoff`,
  `functional_quiz`.
- Y tiene **un test que obliga a clasificar todo electrón nuevo**.

**Qué hacer:**

1. Que `tareas-core` resuelva la ruta **desde el puente**, no desde la lista incompleta. La app
   del electrón da su ruta desde `app-registry`.
2. **Quitar el `?? e.pillarRoute`.** Ese fallback es el que inventa destinos. Si el electrón está
   en `ELECTRONS_SIN_APP`, la tarea **no lleva ruta**.

## Y que se note en la card

⚠️ Una card sin ruta **no debe verse tocable para navegar**: fuera la flecha o el chevron que
promete que algo va a pasar. **Solo responde al tap largo**, que la palomea.

Es la doctrina de siempre: **navegación honesta, cero puertas a lugares que no existen.**

⚠️ **Sin procesados** y **off-pantallas** están en la misma lista y Enrique no los mencionó
porque no llegó a probarlos. **Tienen el mismo bug.**

---

# PIEZA 3 · Los tres arreglos chicos

**3.1 · El héroe de AGENDA se duplica.** `TareasView.tsx:337-364`: `heroTarea` sale de
`agendaItems` y nada lo excluye de los bloques de abajo, así que Proteína aparece como card
grande **y** como fila de las 14:30. Dos superficies palomeables para la misma tarea. Excluirla.

**3.2 · La cinta de hechas muestra el electrón, no el cierre.** `TareasView.tsx:249` pasa
`dato={t.meta}`, que para booleanos es `+1.5 e-`. Debe ser el dato de cierre: `12 min`, `7:40`,
`3 de 3`. Si para alguna no hay dato de cierre, va solo el nombre tachado.

**3.3 · Un test no puede fallar.** `tareas-editorial-core.test.ts:110-116` construye el input con
la propia constante (`7*60 + 30 + HERO_VENTANA_MIN`), así que pasa valga lo que valga. Fijar el 90
literal. Y falta el caso del borde (`delta === 0`, la tarea justo en su minuto).

---

# 🟡 NOTAS DEL AUDIT, no bloquean

- `TareasView.tsx:235` dice que degrada con reduce motion pero `LinearTransition` pelón sigue
  animando 300 ms. Funciona por otra vía (reanimated lee la señal del sistema), pero **el código
  dice una cosa y hace otra**. Que sea `layout={reducedMotion ? undefined : ...}`.
- Las bandas de AGENDA usan los `.jpg` de `assets/backgrounds/`, **no el set WebP optimizado**.
  Esa carpeta sigue en 35 MB y no la cubre ningún guard.
- `hechas` vuelve a llamar `agendaLens(result)` en vez de reusar `agendaItems`, memoizado dos
  líneas arriba.
- Mayúscula inconsistente: `Rompe a las` contra `· rompe a las` (`tareas-editorial-core.ts:79`).
- **Los cuatro screenshots están sin commitear.** Viven en `R and D/MB20_1_SCREENSHOTS/` pero no
  entraron a git, así que no son parte de la entrega. **Agrégalos.**

---

# 📦 ENTREGA

Un commit por pieza. Screenshot nuevo de TAREAS a media tarde, **donde se vea que las cards
llevan su dato y ninguna lleva folleto.**

En el reporte: **qué cards quedaron sin dato y por qué**, y **cuántas consultas nuevas se
agregaron** (la respuesta esperada es cero o una).

**Verificación en dispositivo:**
1. Abrir HOY: el scroll cae **en el bloque de la hora**, no arriba de él.
2. Con el bloque de la hora ya completo, el foco va **al siguiente con pendientes**.
3. Suplementos, Entrenar, Cardio, Journal, N-Back y Check-in **muestran su dato**.
4. **Ninguna card muestra texto de catálogo.**
5. En AGENDA, la tarea del héroe **no aparece dos veces**.
6. La cinta de hechas muestra el dato de cierre, no `+1.5 e-`.
7. **Luz solar abre `/solar`**, no ATP Salud.
8. **Baño frío, grounding, sin alcohol, lentes rojos, sin procesados y off-pantallas no navegan
   a ningún lado**, no muestran flecha, y **el tap largo sí los palomea.**
