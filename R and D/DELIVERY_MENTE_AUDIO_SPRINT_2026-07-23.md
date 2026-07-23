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
