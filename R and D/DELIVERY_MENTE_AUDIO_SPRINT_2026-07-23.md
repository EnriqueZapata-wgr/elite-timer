# ✅ DELIVERY · Sprint Audio Mente — Storage + Catálogo + Reproductor + Interfaz

**Fecha:** 2026-07-23 · **Rama:** `feat/mente-audio` (desde `main`)
**Estado:** construido, tsc 0 errores, 1952 tests verdes (5 nuevos). **NO mergeado — Cowork audita el branch.**
**⚠️ Entrega por BUILD NATIVO, no OTA** (ver "Post-merge" abajo — con matiz importante).

---

## 1 · Backend — hecho Y ejecutado (infra remota ya viva)

- **Bucket `mente-audio` PRIVADO creado** en el proyecto (ELITE-APP-FULLDB) vía SQL:
  - `storage.buckets` insert idempotente.
  - Policy `mente_audio_covers_read` en `storage.objects`: cualquier autenticado lee `covers/*`.
  - **`audio/*` SIN policy → solo service_role firma** — un Base no puede tocar los .m4a ni firmándolos client-side. Este es el gate real.
  - (Bucket/policies NO van en migración: policies sobre `storage.objects` no aplican confiablemente vía `db push`. Quedaron ejecutadas + documentadas aquí.)
- **11 .m4a SUBIDOS y verificados** en `audio/<slug>.m4a` (CLI `supabase storage cp`, origen `D:\Proyectos_ClaudeCode\ATP-audio-pipeline\output\mente\`). Los 4 archivos de `mindfulness_base` (variantes 5/10m × M/F) NO se subieron — variantes fuera de alcance del batch 1.
- **Migración `212_audio_pieces.sql`** (idempotente + RLS): tabla + policy lectura-solo-publicadas + seed de las 11 filas `ON CONFLICT (slug) DO NOTHING`, con `publicado=true` (los archivos ya están arriba) y **duración REAL medida con ffprobe** (`pausa_1min` = 68s, no 66; el resto coincidió con las nominales).
- **Covers: NO existen aún** (se buscó en pipeline y repo — cero .png de portada producidos). `imagen_path` queda NULL; la UI usa **fallback editorial local por categoría** (assets del bundle: meditacion-01/02/03, sleep-01/02, respiracion.jpg). Cuando lleguen las covers MJ: subir a `covers/<slug>.png` + `UPDATE audio_pieces SET imagen_path=...` — la UI cambia sola a la remota (firmada client-side, permitido por la policy).

## 2 · Edge function `mente-audio-url` (escrita, deploy post-merge)

`supabase/functions/mente-audio-url/index.ts`:
- Valida JWT (401 sin sesión) → lee pieza publicada por slug (404) → si `tier='pro'`: resuelve tier efectivo **server-side** espejo de `tier-logic.ts` (`profiles.tier` degradado por `tier_expires_at` + Boost H+ activo en `pro_boosts` eleva a pro) → 403 `pro_required` si no alcanza → **signed URL TTL 1h**.
- Cero precio/cobro (solo lee el tier ya resuelto). Ninguna pieza Pro se sirve a un Base: el bucket es privado y solo esta function firma `audio/*`.

## 3 · Reproductor (must-haves completos)

`app/mente/player.tsx` + `src/services/mente-audio-service.ts`:
- Play/pause, **scrubber con seek** (tap + drag, PanResponder — sin dependencia nativa nueva), ±15s, transcurrido/restante.
- **Background + lock screen**: `setAudioModeAsync({ shouldPlayInBackground: true, playsInSilentMode: true, interruptionMode: 'doNotMix' })` + `player.setActiveForLockScreen(true, {title, artist: 'ATP · Mente'})` (NowPlaying/MediaSession de expo-audio 1.1.1). Android: el **foreground service `mediaPlayback` viene declarado en el manifest del propio expo-audio** (MediaSessionService + permisos FOREGROUND_SERVICE_MEDIA_PLAYBACK) — no requirió cambio en app.json. iOS: `UIBackgroundModes: ['audio']` **ya estaba** en app.json.
- Suena con el switch de silencio activo; `doNotMix` interrumpe otro audio.
- **Progreso por pieza persistido** (AsyncStorage): retoma donde quedó; se limpia al inicio (<10s) o cerca del final (<30s restantes) — lógica pura testeada (`mente-audio-core.ts`).
- Al completar (`didJustFinish`): `mind_sessions` (respetando el CHECK de la 049: respiracion→'breathing', resto→'meditation') + electrón (`meditation`/`breathwork`) + eventos + economía (mismo `habit_type: meditation_in_app` que el timer) + "Sesión completada ✓".
- **expo-audio se importa LAZY** (doctrina "nativos siempre lazy"): un binario viejo que reciba este JS por OTA muestra "Actualiza ATP", no crashea.

## 4 · Interfaz Mente editorial

- **Audioteca en el hub** (`app/mente.tsx`): secciones Meditación / Respiración / Descanso con cards editoriales horizontales **dinámicas desde `audio_pieces`** (cero hardcode). Card = cover (o fallback) + gradient + título + duración + **badge PRO** (`AudioPieceCard`).
- **Pro para Base**: la card se ve; al abrir → `/paywall` (upsell existente, sin pantalla de compra nueva) — espejo del 403 server-side. El player también maneja el 403 (defensa en profundidad).
- Player full-bleed: portada de fondo + gradient + pill de categoría + título + controles (molde "Mis Datos", cero lime-brutalist).
- Los módulos existentes (Journal, timer de Respiración, Meditación por fases, Check-in) se conservan intactos debajo de la Audioteca.

## Fuera de alcance respetado

Variantes de duración NO (mindfulness_base excluido) · pacers visuales NO · Wim Hof/apneas no se tocaron (su gate de compliance vive aparte) · cero pantalla de cobro nueva.

## Post-merge (orden)

1. Cowork audita el branch (migración idempotente + RLS + function sin agujero de tier).
2. Merge → `npx supabase db push` (aplica la 212; el seed queda publicado de inmediato porque los archivos ya están en el bucket).
3. `npx supabase functions deploy mente-audio-url` (respetando el candado, la function NO se deployó aún — el archivo está en el branch).
4. **Build nativo** (`eas build`). Matiz honesto: expo-audio 1.1.1 + `UIBackgroundModes` ya estaban en el binario del 13-jul (MB-4 voz), y el foreground service Android viene en el manifest de la librería — es posible que el binario actual ya soporte todo y un OTA funcione. PERO el brief manda build nativo y es lo seguro (garantiza manifest merge + NowPlaying): planear build como indicado.
5. Device test: background/lockscreen en iOS y Android, pieza Pro con cuenta Base (upsell), retomar progreso, electrón al completar.

## Pendientes de contenido

- Covers MJ del batch 1 (11 png) → subir + UPDATE imagen_path.
- Piezas restantes del catálogo v1 (batch 2+: mindfulness_base con variantes, mantras, sos_panico con su disclaimer Mariana).

---

# ⚡ DELTA · Economía meditación/respiración (2026-07-23, misma rama)

**Brief:** `R and D/CC_PROMPT_MENTE_ECONOMIA_DELTA.md` (decisión Enrique 2026-07-23).
**Estado:** tsc 0 errores, **1968 tests verdes (16 nuevos)**. NO mergeado — Cowork audita el delta.

## 1 · Economía fuera de meditación (verificado antes de quitar)

Se confirmó en código qué otorga `fireElectronAward`: llama la edge function `award-electrons`, que acredita la moneda de la **Economía Lab** (`electron_balance` / `electron_transactions` vía RPC `award_electrons`, flag `LAB_ECONOMY_ENABLED` — hoy OFF). No es el e- booleano ni otra cosa a conservar → **procedió el retiro** (nota: el brief lo llama "H+"; técnicamente es el Electrón de la Economía Lab — H+/protones es otro ledger. Mismo veredicto: es el sistema Economía y se quita):

- `mente-audio-service.ts` → bloque `fireElectronAward` de `logAudioSession` **eliminado** (+ import + generateUUID huérfano).
- `app/meditation.tsx` → llamada `fireElectronAward` **eliminada** (+ import).
- `app/breathing.tsx` ya era e--only — sin cambios de retiro.

## 2 · e- atado a duración comprobada (≥80% real)

- **Lógica pura nueva** `src/services/practice-electron-core.ts`: `qualifiesForPracticeElectron` (≥80%, guards NaN/0), `classifyPracticeAwardError` (tokens del trigger), constantes cap/espaciado. Testeada.
- **Audio** (`player.tsx` + `mente-audio-core.ts`): `effectiveListenDelta` acumula solo avances normales de reproducción (≤2s por tick con updateInterval 500ms) — **seeks adelante/atrás NO suman** (brincar al final no cuenta). La escucha efectiva **persiste junto al progreso** (formato `{p, l}` en AsyncStorage, retrocompatible con el número viejo) para que retomar una pieza a la mitad siga acumulando hacia el 80%. `logAudioSession(userId, piece, effectiveSeconds)` registra `mind_sessions` SIEMPRE (duration = segundos efectivos) y otorga e- solo si efectivo ≥ 80% de `duracion_seg`. Re-escucha tras completar reinicia la acumulación.
- **Timers**: `meditation.tsx` otorga solo si `elapsed ≥ 80%` de la duración de la sesión; `breathing.tsx` solo si `totalElapsed ≥ 80%` de `templateTotalSeconds(template)` (el template CAPEADO por safety cuando aplica — el 80% se mide contra lo que realmente se le pidió al usuario). "TERMINAR" temprano sigue registrando el tiempo real en `mind_sessions`, sin e- si no llegó al 80%.
- **UI honesta**: las pantallas de completado ya no muestran "+X electrones" incondicional — solo si de verdad se otorgó; si no: mensaje suave (\"Registramos tu tiempo real…\" / \"Ya registraste tu práctica — vuelve en un rato\"). El player espeja lo mismo en su texto de completado.

## 3 · Cap + espaciado SERVER-SIDE — migración `213_practice_electron_cap.sql`

- Trigger `BEFORE INSERT` sobre `electron_logs` **solo** para `source IN ('meditation','breathwork') AND category='boolean_daily'`: máx **3 filas por día local** (por `NEW.date`, que escribe el cliente con `getLocalToday`) y **≥3h** desde el último `created_at` del mismo user+source. Rechazo → `RAISE EXCEPTION` con token `ATP_PRACTICE_CAP` / `ATP_PRACTICE_SPACING` que el cliente clasifica y falla-suave. Cero timers: una consulta indexada (índice nuevo `user_id, source, date`) decide en el insert.
- `pg_advisory_xact_lock(user+source)` serializa dos inserts en carrera (sin él, dos requests simultáneos verían count=2 y entrarían 4 filas).
- **Decisión anotada:** el espaciado se evalúa **dentro del mismo día local**. Así el 1er award de un día nuevo jamás se bloquea (meditar 23:00 y luego 07:00 marca HOY sin fricción); el anti-farm cross-medianoche lo sostiene el cap 3/día. Caps **independientes** meditation/breathwork (3+3).
- La RLS de `electron_logs` permite INSERT directo del cliente → el trigger es el gate real, no el cliente.

## 4 · Cliente del award — `awardPracticeElectron` (electron-service.ts)

- **1er award del día**: key determinística `user:source:día` (idéntica a antes) → es el que marca card de HOY / racha / toast ARGOS. **2º/3º**: misma vía con key+nonce (`user:source:día:nonce`); el dedup de doble-tap lo da el espaciado 3h del trigger, no la key. Estados: `awarded_first | awarded_extra | cap_reached | spacing | error`. Ruta legacy pre-mig-101 degradada a once/día.
- `awardBooleanElectron` **no se tocó** — los demás sources siguen once/día exactos.

## 5 · Integración HOY (sin romper card/racha/ARGOS)

- `day-compiler.ts`: `verifiedCompleted` de meditación/breathwork ya **NO cuenta `mind_sessions`** (una sesión <80% registraría pero NO debe palomear) — ahora cuenta `electron_logs` del día (source + category). La card se marca con el **1er e- del día**, exactamente la forma sugerida en el brief; los e- 2º/3º no re-marcan nada (count≥1 idempotente).
- `reconcileVerifiedLedger`: meditación/breathwork **excluidos** — su `completed` deriva del propio ledger (nunca hay drift que corregir), un award del reconcile brincaría el gate de ≥80%, y su revoke borraría los 3 e- del día. Los demás verificados reconcilian igual que antes.
- Consecuencia UX honesta: sesión <80% → aparece en historial de Mente (`mind_sessions`) pero la card de HOY queda pendiente. Es la semántica pedida ("duración comprobada").

## 6 · `mind_sessions` intacto

Mismo insert, mismo CHECK 049 (`breathing`/`meditation`), misma tabla y campos. Solo cambió la moneda y su condición. En audio, `duration_seconds` ahora es el tiempo efectivo escuchado (antes: duración de la pieza) — más honesto para stats.

## Post-merge (delta)

1. Cowork audita este delta (trigger 213 + exclusión reconcile + gate 80%).
2. Merge → `npx supabase db push` aplica **212 + 213** (ojo memoria: si `db push` falla por el wrapper, aplicar vía MCP `execute_sql`).
3. Device test añadido: (a) completar meditación timer <80% → sin e-, card HOY pendiente, sesión en historial; (b) audio con seek al final → sin e-; (c) 2ª práctica <3h → mensaje suave; (d) 4ª práctica del día → cap; (e) card HOY palomea con el 1er e- y NO cambia con el 2º.
