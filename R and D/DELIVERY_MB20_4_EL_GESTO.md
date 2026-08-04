# 👆 DELIVERY MB-20.4 · El gesto se invirtió

**Rama:** `feat/mb20-1-editorial` · 7 commits (uno por pieza + entrega)
**Verificación en cada commit:** `tsc --noEmit` 0 errores · Vitest 2626 tests en verde (245 archivos) · `npm run censo` en verde
**Cero migraciones**, como pedía el run.

| Commit | Pieza |
|---|---|
| `0aba6ee` | P1 · se invierte el gesto: tap palomea, tap largo navega |
| `3e916e6` | P2 · lo que enseña el gesto también se invierte |
| `95c0537` | P3 · la retroalimentación cambia de dueño |
| `2dca7ce` | P4 · el riesgo del gesto barato, amarrado |
| `a7c9c3a` | P5 · audit del ledger: fábrica de fechas nulas y el malformado |
| `bbc7608` | NOTAS · rastro en revocaciones, registro muerto fuera, copy honesto |

---

# 🔁 AJUSTE (post-run, decisión de Enrique) · "El tap hace la acción principal"

El flag del primer reporte era correcto: el tap en filas `navegar` quedaba mudo.
La regla no es "tap palomea" — es **el tap hace la acción principal de esa fila**:

| Gesto | Tap | Tap largo |
|---|---|---|
| palomear | palomea (en hechas destacha) | navega si hay ruta; sin ruta nada |
| navegar | **NAVEGA** (su única acción) | **nada** |
| experiencia | abre la paloma inteligente | va directo a la función |
| agua (inline) | sus botones capturan; el tap del resto navega a hidratación | nada |

Todo sigue en `useTareaGesto` (un solo lugar) y el contrato se reescribió a la
regla nueva: ninguna fila con ruta queda muda al toque; el tap largo solo es
atajo donde el tap hace otra cosa.

## Las tres decisiones que no se pierden

1. **La card grande de hidratación lleva LOS TRES botones**: +250 ml, +500 ml
   y −250 ml. `onInline` ahora pasa el delta con signo y `addWater` ya clampa
   en 0 (la resta corrige el toque de más y no celebra al vibrar). ⚠️ La fila
   compacta de AGENDA conserva solo +250 — no cabe la botonera; los tres viven
   en la card. Si los tres deben ir también ahí, es un cambio de layout de la
   fila (decide Enrique).
2. **Todas las tareas son cards editoriales**: intacto — en la lente TAREAS
   toda pendiente es `TareaCard` sin excepción (palomear, navegar, experiencia
   y agua con su botonera); nada se degradó a versión chica con este ajuste.
   *Interpretación aplicada:* la cinta de HECHAS (colapsada por decisión
   MB-20.1) y las filas compactas de la lente AGENDA ("la lente que se opera",
   MB-20.1) se conservan como estaban. Si "sin versión chica" también aplica a
   AGENDA, es rediseño de esa lente: se decide aparte.
3. **Toda card con dato disponible lo muestra**: intacto — `datoForTarea`
   sigue igual (dato real o card sin línea de dato, nunca texto de catálogo).

## El círculo palomeable — propuesta aplicada

**El círculo es la promesa de que un toque lo llena; solo las palomeables la
cumplen.** En verificadas (`navegar`, `experiencia`) y cuantitativas el check
nace de actividad real: un círculo que nada llena mentía. Lo aplicado:

- **Pendientes palomeables** → círculo vacío, como hoy (el tap lo llena).
- **Pendientes verificadas y cuantitativas** → **el círculo no va**. La card
  queda como puerta con su dato; la fila de AGENDA conserva la alineación con
  un slot invisible del mismo ancho.
- **Hechas (todas)** → la paloma pintada se queda: ahí es **estado**, no
  promesa de gesto (la cinta de colores y el `checkDone` de AGENDA no cambian).

Alternativa considerada y descartada: círculo punteado ("check que se gana con
actividad") — `borderStyle: 'dashed'` + `borderRadius` pinta mal en Android y
agregaba un tercer lenguaje visual. Si en device se extraña una señal de
"esto también cuenta para tu día" en las verificadas, la vuelta es un glifo
distinto, no el círculo.

## El copy describe la regla, no "un toque palomea" a secas

- **Tour paso 2:** *"Un toque hace lo principal: palomear el hábito o abrir su
  función. Mantener presionado abre los que se palomean. Pruébalo aquí
  mismo."* (test actualizado que amarra este copy).
- **Burbuja:** *"Un toque hace la acción principal de cada fila. Los hábitos
  que se palomean se abren manteniendo presionado."* (header de nudge-store
  actualizado; disparadores sin cambio: siguen detectando el despalomeo
  accidental y el descarte de la paloma inteligente).

## Device test — puntos que cambian con el ajuste

- (5′) Tap en Ayuno **abre su pantalla** (antes: no abría); tap largo en Ayuno
  no hace nada.
- (nuevo) Tap en Suplementos / Check-in / Ciclo / Proteína / Pasos / Sueño
  abre su pantalla; tap largo en ellas no hace nada.
- (nuevo) Card de agua: +250, +500 y −250 funcionan, −250 no baja de 0, y el
  tap fuera de los botones abre Hidratación.
- (nuevo) Las cards de verificadas y cuantitativas **no pintan círculo**; las
  palomeables sí; las hechas conservan su paloma.
- Los demás puntos del run original siguen igual (1-4, 6-9).

---

## 📋 La lista pedida: TODOS los lugares donde se invirtió el copy del gesto

### Copy que VE el usuario (2)

1. **`src/components/tour/orb-tour-core.ts`** — paso 2 del tour (`gestos`):
   - Antes: *"Tocar una fila te lleva a su función. Mantener presionado la palomea. Pruébalo aquí mismo."*
   - Ahora: *"Tocar una fila la palomea. Mantener presionado te lleva a su función. Pruébalo aquí mismo."*
   - El "ejercicio" del paso es el mismo de siempre: la capa del tour no bloquea toques (`pointerEvents box-none`), así que el usuario prueba el gesto NUEVO sobre la pantalla real.
   - **Test nuevo** en `orb-tour-core.test.ts` que amarra el copy nuevo: si truena, la app está enseñando lo contrario de lo que hace.
2. **`src/components/hoy/TareasView.tsx`** — la burbuja contextual:
   - Antes: *"Para palomear un hábito, mantén presionado."*
   - Ahora: *"Un toque palomea. Para abrir la función, mantén presionado."*

### Comentarios de código y docs de props que describían los gestos (9 archivos)

3. `src/components/hoy/useTareaGesto.ts` — header completo + docs de `TareaGestoCallbacks` (`onNavigate` ahora "Tap largo", `onPalomear`/`onExperiencia` ahora "Tap simple") + comentarios de los handlers.
4. `src/components/hoy/TareaRow.tsx` — header (los dos gestos) + docs de props + comentario del círculo (ya sin llenado).
5. `src/components/hoy/TareaCard.tsx` — header + docs de props + comentario del círculo.
6. `src/components/hoy/TareaHechaRow.tsx` — header ("un toque destacha… tap largo navega") + docs de props.
7. `src/services/hoy/tareas-core.ts` — el doc del tipo `TareaGesto` ("Qué hace el TAP SIMPLE… El tap largo SIEMPRE navega") + comentario de ayuno en `smartAgendaTareas`.
8. `src/services/hoy/nudge-store.ts` — header completo (patrón viejo → patrón nuevo).
9. `src/components/hoy/TareasView.tsx` — bloque de comentarios del nudge, del viaje de la card y de `handleIrRegistro`.
10. `src/components/hoy/SmartCheckModal.tsx` — doc del prop nuevo `onDismissSinElegir`.
11. `src/services/hoy/__tests__/tareas-core.test.ts` — título del test "sin ruta ⇒ ni el tap largo navega".

### Lo que se revisó y NO se tocó (describe SUS propios gestos, no el del checklist)

- `app/fasting.tsx`, `app/fitness-strength.tsx`, `app/journal.tsx`, `app/nutrition.tsx`, `app/my-routines.tsx`, `app/my-recipes.tsx`, `app/supplements.tsx` — "mantén presionado para **eliminar/editar**" de sus propias listas.
- `src/components/atp/AppTile.tsx` — tap largo instala/desinstala en la sala ATP (gesto propio de la sala).
- `src/screens/coach/ClientDetailScreen.tsx` — "Long press en pill" del panel coach.
- `SmartCheckModal` (títulos y subtítulos) — hablan del check honesto, no del gesto que lo dispara.

---

## Lo entregado por pieza

### P1 · La inversión (un solo lugar: `useTareaGesto`)

- **Tap simple PALOMEA** (toggle on/off) o abre la paloma inteligente si es experiencia pendiente. En hechas, el mismo tap destacha.
- **Tap largo NAVEGA**. Sin ruta (los ocho de `ELECTRONS_SIN_APP`) el tap largo **no hace nada** — ni vibra. Ayuno y los `navegar` (suplementos, check-in, ciclo, cuantitativos) solo abren con tap largo; su tap simple no hace nada.
- El **llenado progresivo de 350 ms murió**: era la enseñanza del hold-palomea. Con él se fueron `fillStyle`, el `reducedMotion` del hook y los estilos `checkFill`.
- Aplica idéntico en las dos lentes (TAREAS y AGENDA) y las tres superficies: todas pasan por el hook (amarrado por test).
- **Contrato nuevo** `useTareaGesto-contrato.test.ts` (patrón source-contract de reconcile-core, CRLF-safe): tap nunca navega, tap largo nunca palomea, guard de ruta antes de vibrar, llenado muerto, tres superficies por el hook.

### P2 · El disparador nuevo de la burbuja (no quedó apagada)

El patrón viejo (tap → navegar → regresar sin completar) murió con el gesto. El nuevo detecta al que espera que el toque ABRA:

- **(a)** Despalomear una hecha y re-palomearla en ≤10 s (`RECHECK_ACCIDENTE_MS`) — el toque accidental que tocó el ledger. Detectado en `handlePalomear`.
- **(b)** Descartar la paloma inteligente **sin elegir** (backdrop / botón atrás), vía el prop nuevo `SmartCheckModal.onDismissSinElegir`. Contestar NO **sí es elegir** y no cuenta (evita falsos positivos de respuestas honestas).
- Umbral 3 señales/sesión + máximo 1/semana, igual que antes. **Llave nueva** (`gesto_nudge_v2`): quien vio la burbuja vieja merece ver la nueva una vez.

### P3 · La retroalimentación cambia de dueño

- Palomear con tap: **vibración inmediata** + **la card encoge y viaja a HECHAS** (la transición ya existía; ahora es la confirmación principal). Despalomear: camino inverso, y **deshacer no celebra** (vibra `light`, completar `success`).
- Tap largo: **vibración media al cruzar el umbral, antes de navegar** — sin el llenado, nada más avisaba que el hold registró algo.
- AGENDA (que no reordena) confirma con la paloma pintada y la fila atenuada.
- Reduce motion degrada como ya lo hacía: sin transición de layout; queda vibración + cambio de estado instantáneo.

### P4 · El riesgo del gesto barato (contrato `tarea-actions-contrato.test.ts`)

- **4.1** Despalomear cuesta lo mismo: mismo tap, mismo handler (toggle), y la fila de hechas cablea el MISMO `handlePalomear`.
- **4.2** Idempotencia verificada al nivel que el harness node permite: key determinística `user:source:día`, 23505 = éxito (no doble insert), revoke acotado a (user, source, hoy), y la réplica de la semántica del índice único demuestra que **palomear ×3 con despalomeos deja exactamente un electrón** y re-palomear nunca borra el que estaba. El punto 8 del device test cierra el círculo contra el remoto real.

### P5 · Audit del ledger

- **5.1** `logExerciseSet` / `logExerciseSets` **borradas** (con su tipo `LogSetData`): cero llamadores, insertaban sin `date` — la fábrica exacta de las 110 filas nulas. **Contrato de escritura nuevo** (`exercise-logs-escritura.test.ts`): censo de escritores de `exercise_logs` (solo `log-exercise.tsx` y `workout-session-service.ts`; uno nuevo truena y se une al contrato), cada `logged_at` lleva su `date` local adyacente, la fecha sale de los helpers canónicos, y exercise-service no puede volver a insertar.
- **5.2** `evidenciaDeUltimaFecha` ahora trata fecha malformada como **no se sabe**: si no matchea `^\d{4}-\d{2}-\d{2}$` (la familia `NaN-NaN-NaN` de un `created_at` con basura), el ledger no se toca. Mutación extendida: cada consulta rota también con fecha malformada → cero revocaciones.

### NOTAS

- Revocaciones con rastro: `tarea-actions` y `agenda-service` loggean llave y motivo, igual que el reconcile. Las tres puertas al borrado se ven en el log.
- `HOY_CARD_SPECS` / `HOY_CARD_BY_KEY` borrados (registro muerto); `hoy-cards-registry.test.ts` borrado entero (vigilaba un renderer inexistente); `HOY_CARD_ORDER_DEFAULT` vive (visibility-service). Ajustados los tres tests que los importaban.
- Suplementos: paloma con lista activa en 0 dice **"fuera de tu lista actual"** en vez del "0 de N" que mentía. Con test.

---

## 📱 Verificación en dispositivo (pendiente, la del run)

1. **Un toque palomea**, y la card encoge y viaja a hechas.
2. **Un toque en hechas despalomea**, y la card vuelve a su bloque.
3. **Tap largo navega**, con vibración al cruzar el umbral.
4. Tap en Meditar abre *"¿Ya meditaste?"*; tap largo abre meditación directo.
5. Tap largo en Ayuno abre su pantalla; un toque **no** la abre.
6. En baño frío y grounding, **el tap largo no hace nada** y el toque los palomea.
7. **El tour del paso 2 enseña el gesto NUEVO.**
8. Palomear, despalomear y volver a palomear tres veces **deja exactamente un electrón**.
9. Igual en las dos lentes, TAREAS y AGENDA.

**Flags para Enrique:**
- El disparador (b) del nudge cuenta solo backdrop/atrás como "sin elegir"; contestar NO no cuenta. Si en device se siente que el nudge tarda en salir, el umbral (3) vive en `NUDGE_THRESHOLD`.
- ~~El tap simple muda en filas `navegar`~~ → **resuelto por el AJUSTE de
  arriba**: el tap ahora navega en ellas (la acción principal).
