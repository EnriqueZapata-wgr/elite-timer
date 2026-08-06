# 🎯 CC PROMPT (frío) — Delta economía meditación/respiración

**De:** Cowork · **Para:** CC (sin contexto — recién /clear) · **Fecha:** 2026-07-23
**Repo:** este (ELITE_Timer). CLAUDE.md aplica (str_replace quirúrgico, migraciones idempotentes + RLS, generateUUID, getLocalToday, `tsc --noEmit` verde, NO OTA aquí).
**Rama:** `feat/mente-audio` (YA pusheada, NO mergeada — Cowork audita antes del merge). **Trabaja EN ESA RAMA**, no en main, no rama nueva.

## Primero: carga contexto (fuiste /cleared)
Lee, en orden:
1. `R and D/DELIVERY_MENTE_AUDIO_SPRINT_2026-07-23.md` — el sprint de Audio Mente que TÚ construiste en esta rama (11 audios, bucket privado, edge function `mente-audio-url`, player, Audioteca).
2. `src/services/mente-audio-service.ts` (función `logAudioSession`), `app/meditation.tsx` (~línea 230-240), `app/breathing.tsx` (~550), `src/services/electron-service.ts` (`awardBooleanElectron`), y el cliente de economía `src/services/economy/electron-award-client.ts` (`fireElectronAward`).

## Contexto de la economía (dos sistemas distintos)
- **e- (electrón):** `awardBooleanElectron(userId, source)` → inserta en `electron_logs` (category `boolean_daily`), **una vez al día** por source (idempotency determinística `user:source:día`). Es la moneda que queremos para meditación/respiración.
- **Economía/H+:** `fireElectronAward({ habit_type, evidence_tier, ... })` → sistema aparte. Hoy meditación dispara `habit_type: 'meditation_in_app'`. **Enrique quiere ELIMINAR este award de meditación** (las meditaciones deben dar e-, no H+).
  - ⚠️ Confirma en el código qué otorga `fireElectronAward`. Si NO es H+/economía sino otra cosa que sí queremos conservar, PARA y avísame antes de quitarlo.

## La regla nueva (decisión de Enrique 2026-07-23)
Meditación **y** respiración (audio + timer) otorgan **solo e-**, atado a duración comprobada, con cap diario y espaciado. En concreto:

### 1. Quitar el H+ de meditación (2 lugares)
- `src/services/mente-audio-service.ts` → en `logAudioSession`, borra el bloque `if (source === 'meditation') { fireElectronAward({ habit_type: 'meditation_in_app', ... }) }`.
- `app/meditation.tsx` → borra la llamada `fireElectronAward({ habit_type: 'meditation_in_app', ... })` (~línea 236).
- `app/breathing.tsx` **ya está** e--only (solo `awardBooleanElectron('breathwork')`) — no toca H+, no hay nada que quitar ahí.

### 2. e- atado a duración COMPROBADA (≥80% real)
- Otorga el electrón solo si el tiempo REAL practicado ≥ 80% de la duración de la pieza.
- **Audio** (`app/mente/player.tsx` + `mente-audio-service.ts`): acumula segundos EFECTIVAMENTE reproducidos (ignora seeks — que brincar al final NO cuente) y pásalo a `logAudioSession`. Si < 80% → registra `mind_sessions` pero **NO** otorga electrón.
- **Timers** (`app/meditation.tsx`, `app/breathing.tsx`): ya miden tiempo real de práctica; asegúrate de que solo otorguen al completar genuinamente (≥80%), no al salir temprano.

### 3. Cap + espaciado, SERVER-SIDE (anti-farm)
Hoy `awardBooleanElectron` es once/día por source. Para `meditation` y `breathwork` cámbialo a:
- **Máximo 3 e- por día local**, por source.
- Cada award **≥ 3 horas después del anterior** del mismo source.
- **Enfórzalo server-side** (no confiar en cliente): trigger/RPC/constraint sobre el insert en `electron_logs`. NADA de timer de fondo — al otorgar, una consulta indexada al último log de ese source (timestamp + conteo del día local) decide en ms. El "candado" es implícito en los datos.
- Si no cumple (ya van 3, o <3h) → NO inserta y falla-suave (mensaje tipo "ya registraste tu práctica, vuelve en un rato" o silencioso). Nada de error feo.
- `meditation` y `breathwork` llevan cap **INDEPENDIENTE** (3+3).
- ⚠️ **Cuida la integración:** hoy meditación/respiración son boolean-once/día — probablemente alimentan la card de HOY, rachas y atribución ARGOS. Pasar a 3/día NO debe romper eso. Forma limpia sugerida: la card de HOY / racha se marca con el **1er** award del día; los e- 2º y 3º entran por la misma vía capeada sin re-marcar el hábito. Si ves conflicto, decídelo limpio y anótalo en el delivery (nada de parches).

### 4. `mind_sessions` intacto
Solo cambia QUÉ moneda se otorga y BAJO QUÉ condición. El registro de sesión (`mind_sessions`, respetando el CHECK de la migración 049) se mantiene igual.

## Entregable
- Probablemente migración **213** (lógica cap/espaciado en el award de electrón), idempotente.
- `tsc --noEmit` verde + tests.
- **NO mergear.** Actualiza el delivery doc con lo que cambió. Cowork audita el delta antes del merge.
