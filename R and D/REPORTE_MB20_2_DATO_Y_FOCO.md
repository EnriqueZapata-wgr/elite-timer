# 📊 REPORTE · AWAY RUN MB-20.2 — el dato de verdad y el foco que se rompió

**Rama:** `feat/mb20-1-editorial` · 5 commits (uno por pieza + notas)
**Fecha:** 2026-08-03 · **Gates:** `tsc` 0 errores · Vitest 2584/2584 · `npm run censo` en verde

| Commit | Pieza |
|---|---|
| `MB-20.2 P1` | Auto-foco: coordenada contra la raíz + foco al siguiente bloque + tests |
| `MB-20.2 P2` | Dato de verdad en cards + revert de `description` del modelo |
| `MB-20.2 P2.5` | Rutas desde el puente electrón→app, fuera `?? pillarRoute` |
| `MB-20.2 P3` | Héroe sin duplicar, cinta con dato de cierre, test del 90 literal |
| `MB-20.2 NOTAS` | reduce motion honesto, backgrounds 34.6→5.8 MB + guard, screenshots a git |

---

## Consultas nuevas: UNA (la respuesta esperada era cero o una)

**`mind_sessions`** (minutos de la última meditación) — exactamente la que el
brief marcaba "ver 2.3". Todo lo demás salió de modificar consultas existentes:

- `exercise_logs`, `cardio_sessions`, `journal_entries`, `nback_sessions`:
  el conteo `head:true` se volvió `select(...).order(date desc).limit(1)` —
  la MISMA consulta trae la última fila y `completed` se deriva de si esa fila
  es de hoy. Cero round trips extra.
- **Suplementos**: la consulta a `supplement_logs` se REEMPLAZÓ por una a
  `user_supplements` con los logs de hoy embebidos (FK de la migración 055).
  Mismo round trip, y da el "X de Y" que `supplement_logs` solo no puede dar
  (las filas solo existen para tomas interactuadas; el total vive en
  `dose_times`). El conteo usa `supplementsTodayProgress`, el mismo core que
  `/supplements` — un solo criterio en toda la app.
- **Check-in**: el `quadrant` ya estaba en memoria (`moodRes`); solo se cablea.

⚠️ **Flag para el audit (cambio de semántica menor):** `completed` de
suplementos ahora solo considera suplementos **activos** (antes contaba
cualquier log `taken=true` de hoy). Un log de un suplemento desactivado ya no
palomea la card — más honesto, pero que Cowork lo sepa por el reconcile.

## Qué card muestra qué

| Card | Dato | Estado |
|---|---|---|
| Agua / Proteína / Sol / Ayuno | los de siempre | ya funcionaban |
| Suplementos | `2 de 5 tomados` | ✅ |
| Entrenar | `Última sesión: hoy/ayer/hace N días` | ✅ (recencia; el nombre de la rutina exigiría otra tabla) |
| Cardio | `Última: 5.2 km · 32 min` | ✅ |
| Journal | `Última entrada: ayer` | ✅ (recencia; la racha exigiría más filas) |
| N-Back | `Último nivel: 3` | ✅ |
| Check-in | `Última vez: Baja energía · Agradable` (etiqueta canónica de QUADRANTS) | ✅ |
| Meditación | `Última sesión: 12 min` | ✅ (la única consulta nueva) |

**Cards que quedaron SIN dato y por qué:**

- **Respirar (breathwork)** — el brief no la lista; darle minutos exigiría una
  segunda consulta a `mind_sessions` (`type='breathing'`). Se queda sin línea
  de dato. *"Luego lo imaginamos."*
- **Baño frío, grounding, sin alcohol, lentes rojos, sin procesados,
  off-pantallas, registrar ciclo** — no tienen fuente de dato vivo en el
  compile. Sin línea de dato, sin folleto.

**Fuera el folleto:** ninguna card muestra ya `ELECTRON_DESCRIPTIONS`, y el
campo `description`/`desc` del modelo de tareas (`TareaBoolLike`, `Tarea`) se
revirtió. `pillarRoute` también salió del modelo (quedó muerto tras 2.5).

## PIEZA 2.5 — decisión de diseño que el audit debe conocer

`routeForBool` resuelve en dos capas, sin fallback inventor:

1. **Granular** (`VERIFIED_ELECTRON_ROUTES`): se CONSERVA porque el device
   test la dio por buena — checkin → `/checkin` (no `/emotions`, que es la
   ruta de la app en el registro) y cardio → `/log-cardio` (decisión FIT-3).
   Cambiarlas al puente habría movido destinos que Enrique reportó como
   "funcionan bien".
2. **El puente** (`ELECTRON_TO_APP` → `app-registry`): cubre todo lo demás —
   `sunlight → 'sol' → /solar`, el bug reportado.
3. **Nada**: `ELECTRONS_SIN_APP` va sin ruta. Sin chevron (los palomeables
   nunca lo tuvieron), y ahora **sin haptic fantasma**: el tap en una tarea
   sin ruta no hace nada; el tap largo palomea.

Test nuevo: los 8 sin-app sin ruta, los granulares intactos, y todo el puente
resuelve a una ruta real del registro.

## PIEZA 1 — el auto-foco

- **1.1**: la `y` del bloque era relativa al `<View>` interno; el consumidor
  (`index.tsx:330`) espera la raíz. Ahora se suma la `y` del contenedor; los
  dos `onLayout` llegan en orden no garantizado, así que el primero deja el
  dato y el segundo dispara.
- **1.2**: `pickFocusMomento` (puro): bloque de la hora si tiene pendientes →
  siguiente con pendientes → primero pendiente que quede → `null` (día
  terminado: sin scroll, se ve la cinta completa).
- **1.3**: `repartoTareas` + `pickFocusMomento` con 8 tests nuevos.

## Notas del audit

- reduce motion: `layout={reducedMotion ? undefined : …}` — ya no anima nada.
- `assets/backgrounds`: **34.6 MB → 5.8 MB** in-place (sharp q85 mozjpeg, máx
  2048px, mismas rutas `.jpg`, cero recableado). `npm run optimize-images`
  ahora también barre esa carpeta (el guard que faltaba). De pilón: el script
  tronaba en Windows (sharp mantiene el archivo abierto y el overwrite
  in-place da `UNKNOWN -4094`, reproducido aquí) — ahora lee a buffer.
- Mayúscula unificada: `Ayuno 16h · Rompe a las 13:40`.
- `hechas` reusa `agendaItems` memoizado (resuelto dentro de P1).
- Los 4 screenshots de MB-20.1 entraron a git.

## Pendiente (requiere device, no lo puede dar este run)

- **Screenshot nuevo de TAREAS a media tarde** con cards y dato — sale del
  device test.
- Los 8 puntos de verificación del brief: foco en el bloque de la hora, foco
  al siguiente con el bloque completo, datos en las 6 cards, cero folleto,
  héroe sin duplicar, cinta con dato de cierre, Luz solar → `/solar`, y los
  sin-app que no navegan, no muestran flecha y sí palomean con tap largo.
- Audit Cowork + merge + OTA (sin migraciones: este run no toca SQL).
