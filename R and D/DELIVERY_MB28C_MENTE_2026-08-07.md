# 📦 DELIVERY MB-28C · Las deudas de Mente — 2026-08-07

**Rama:** `feat/mb28c-mente` (desde `main` en `9a1cf38`, worktree `../ATP-MB28C`).
**NO mergeada — Cowork audita el branch y decide el orden contra `feat/mb28a-comida`.**
8 commits, 1 migración (258). `tsc` 0 · Vitest 2994/2994 · censo en verde en cada commit.

⚠️ **`R and D/FIFO_PENDIENTES.md` también lo tocó MB-28A: conflicto esperado al
mergear. Se avisa y NO se resolvió por cuenta propia.**

---

## P1 · El camino exacto del empalme de audios

**Historia del bug:** el reporte es del 1-ago; B8 (`8c86988`, 2-ago) ya puso un
singleton en `app/mente/player.tsx` que cierra el camino secuencial (reentrar
tras salir). Pero B8 dejó viva UNA carrera:

1. El kill del player anterior quedó ANTES de `await loadMenteAudioPrefs()` —
   entre "descargo al viejo" y "creo el nuevo" había una suspensión.
2. `openPiece` no tenía candado: **doble tap sobre una card = dos push del
   modal** = dos cargas concurrentes.
3. Ambas cargas pasan el check con `ACTIVE_PLAYER === null` (ninguna ha creado
   aún), ambas crean, ambas hacen `play()`: **dos voces encima**, y los
   controles de la pantalla visible solo mandan sobre la suya.

**Fix (commit `328307b`):**
- `src/services/mente-player-singleton.ts` (nuevo, puro, testeable):
  `claimActivePlayer` descarga al anterior **en el mismo paso síncrono** que el
  claim; generación de carga (`beginPlayerLoad`/`isLoadCurrent`) invalida
  cargas viejas en vuelo (tampoco navegan: una carga obsoleta ya no puede
  mandar a /paywall).
- `player.tsx`: prefs ANTES del kill (cero awaits entre kill y create), guard
  tras cada await, `togglePlay` defensivo — si la pantalla perdió su player
  pero algo suena (huérfano), el botón lo apaga; si el player nativo ya fue
  liberado y truena, se captura y se silencia igual.
- `meditation.tsx` / `breathing.tsx`: candado de navegación (un tap = un
  player, se suelta al recuperar foco) + red de seguridad al volver a la
  biblioteca (`stopActivePlayer()` idempotente).
- **El registro de sesión y el electrón NO se tocaron**: mismo insert a
  `mind_sessions`, mismo `awardPracticeElectron`.
- Matiz honesto: salir de la pantalla del player apaga el audio (cleanup);
  irse a OTRA APP con el player abierto NO lo apaga — ese es el background
  playback con controles en lockscreen que el Sprint Audio construyó a
  propósito, y ahí el control de parar es el del sistema.

## P2 · Las imágenes: medido, no supuesto

- Los assets LOCALES de meditación ya eran WebP de 17-90 KB — no eran ellos.
- Las lentas eran las **covers remotas** del bucket `mente-audio`: 31 JPEG
  1440×1802 de 160-850 KB, **13.45 MB el set** que la biblioteca baja en
  ráfaga al entrar en frío. Ahí viven los ~5 segundos.
- Conversión sharp WebP q80 máx 1080px: **2.47 MB total (81.7% menos)**,
  por pieza 16-233 KB. Las 31 `covers/<slug>.webp` **ya están subidas** al
  bucket junto a los .jpg (rollback intacto).
- **Migración 258** (idempotente): apunta `audio_pieces.imagen_path` a .webp.
  ⚠️ El switch ocurre al `npx supabase db push` DESPUÉS del merge.
- **Caveat OTA/binario:** aquí NO aplica — las covers se resuelven en runtime
  por `imagen_path`; ni OTA ni build nativo necesarios. Lo que sí sigue en el
  binario viejo hasta MB-30 son los assets locales del bundle, que ya eran
  ligeros.

## P3 · Las dos puertas de Emociones

**Eran destinos DISTINTOS** (la premisa del bug 6 ya no aplica): "¿Cómo
estás?" → `/checkin` (registra, 2 pasos, electrón); "Explorar el territorio"
→ `/emotion-exploration` (mismo plano 12×12, solo navegación, no guarda).
Como ambas abren "el mapa", el copy no comunicaba la diferencia: **era bug de
copy** y eso se arregló — la card de exploración ahora dice "El mismo mapa,
pero sin registrar nada…" y su CTA es "Solo explorar".

## P4 · "Tu historia": era la consulta, no la pintura

`fetchSunDates` filtraba `electron_logs` por `source='sun_awareness'` (nombre
legacy del peso); el hábito vivo escribe `source='sunlight'`. En los datos
reales: **58 días de sol como 'sunlight', 2 como 'sun_awareness'** — la
correlación de Sol decía "sin datos" para siempre. Fix: `.in('source',
['sunlight','sun_awareness'])`. Ayuno NO estaba roto (32 días llegan bien);
su card puede decir "insuficiente" honestamente cuando no se junta el grupo
de comparación de 5 días sin ayunar — diseño, no bug.

## P5 · Box Breathing

"5 min · 18 ciclos · 4s-4s-4s-4s" → "5 min · 18 rondas" + "Cada ronda:
Inhala 4s · Retén 4s · Exhala 4s · Vacío 4s". "Ciclo X de Y" → "Ronda X de
Y" (mismo vocabulario que el cierre y que `rounds_completed`). Solo copy.

## P6 · Colores legacy

- **Amarillos en HIIT: ya no existían** — MB-3.6 §4.2 los pasó al amber de
  marca. Verificado por grep en todo Fitness/Mente: cero amarillos crudos.
- **Cardio azul → lima de categoría.** MB-3.6 lo había dejado en
  `SEMANTIC.info`; el recorrido lo siguió marcando y la doctrina es clara:
  cardio ES Fitness y cada pantalla usa el color de su sección
  (`fitness-train` y Fuerza ya iban en lima). `SEMANTIC.info` es para estados
  informativos, no acento de categoría.
- **`my-routines`:** modo timer `#38bdf8` → amber (los timers son la familia
  de HIIT); limas crudos → token.
- **Respiración:** `BLUE #60a5fa` muerto sin usos, retirado; el chip de
  segundos iba en lima decorativo dentro de Mente → neutro (el lima ahí no
  era CTA, ni héroe, ni estado hecho). Los limas semánticos de "hecho"
  (checkmarks, sesiones completadas) NO se tocaron: son el sistema.

## P7 · Rachas: SÍ cuentan (cerrado)

Cadena verificada en código Y datos: los 3 escritores (timer de meditación,
player de audio — meditación/descanso/mantra/visualización —, y "Ya medité")
insertan `mind_sessions` con `type='meditation'` y `date=getLocalToday()`;
la pantalla Rachas (`app/mente/progreso.tsx`) lee `fetchMenteStreaks` →
exactamente ese type. En el remoto hay 8 sesiones reales (última 5-ago).
**Origen probable de la sospecha:** la racha ancla en hoy/ayer — con la
última meditación hace 2+ días, Rachas muestra 0 y eso es una racha rota,
no un registro perdido. Binaurales no cuentan **por diseño** (no son sesión).
El test de contrato nuevo amarra que mantra/visualización/descanso siguen
alimentando la racha de meditación.

## P8 · Tests — resultado real de las mutaciones

- `mente-player-singleton.test.ts` (9): claim descarga al anterior, carrera
  de B8 simulada con la forma real del load, cleanup apaga y suelta, stop
  siempre está (incluye player nativo liberado que truena al tocarlo).
- `mente-audio-session.test.ts` (6): sesión SIEMPRE a `mind_sessions` salvo
  binaural; types correctos; e- solo ≥80% y nunca sin sesión.
- **Mutación A** (claim sin descarga): **1/9 falla** — "reclamar un segundo
  player descarga al primero". Truena. ✔
- **Mutación B** (guard de generación anulado): **2/9 fallan** — los dos de
  la carrera. Truena. ✔
- Restaurado: 9/9. Suite completa: **2994/2994**.

---

## Qué queda para después del audit

1. **Merge** (orden lo decide Cowork; conflicto esperado en
   `FIFO_PENDIENTES.md` con MB-28A).
2. **`npx supabase db push`** → aplica la 258 (activa las covers WebP).
3. **OTA** `eas update --branch preview` (P1, P3-P6 son JS).
4. Los `.jpg` viejos del bucket quedan como rollback; borrarlos es decisión
   posterior.

## Verificación en dispositivo (Enrique)

1. Entrar y salir de meditación 3×, incluido doble tap rápido sobre una
   card: **nunca dos audios, siempre se puede parar.**
2. Covers de meditación sin espera notoria (tras db push; primera carga
   fría baja ~2.5 MB en vez de ~13).
3. Emociones: dos puertas que se entienden distintas.
4. "Tu historia" → "TU ÁNIMO × TU VIDA" → card SOL con observación real.
5. Box Breathing: rondas y segundos claros.
6. Cardio en lima, timer en amber, cero lima decorativo en Respiración.
7. Meditar hoy y abrir Rachas: la racha de meditación se mueve.
