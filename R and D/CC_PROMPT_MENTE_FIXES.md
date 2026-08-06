# 🔧 CC — Mente fixes: N-Back opt-in + letras reales + app.json

**Repo:** este (ELITE_Timer). CLAUDE.md aplica. **Rama** `feat/mente-fixes` desde `main`. NO mergees — Cowork audita.
**⚠️ Este run termina en BUILD NATIVO** (las letras son assets nuevos empaquetados + posible cambio en app.json). No es OTA.

## 1 · N-Back opt-in (quitar de mandatory)
Decisión Enrique: N-Back **NO** es hábito universal — es opt-in.
- En `src/services/hoy/day-booleans.ts`: **quitar `'nback'` de `MANDATORY_BOOLEANS`**. Así deja de sumar 2.5 al denominador diario de TODOS.
- N-Back sigue siendo un booleano válido y toggleable: si el usuario lo activa en sus hábitos, su card refleja estado y otorga e- como siempre. Solo deja de ser forzado.
- Ajusta el test de `day-booleans.test.ts` acorde (nback ya no en el set mandatory).

## 2 · Cablear las 8 letras reales (hoy TTS)
Las grabaciones ya están en el repo: **`assets/audio/nback/`** → `nback_a.wav`, `nback_o.wav`, `nback_f.wav`, `nback_l.wav`, `nback_r.wav`, `nback_z.wav`, `nback_h.wav`, `nback_j.wav` (8 letras: A · O · F · L · R · Z · H · J, ~0.5s, mono, nivel parejo).
- Llena el **manifest en `src/services/nback-audio.ts`**: el set de estímulos auditivos = estas 8, mapeadas a los assets (require de cada .wav).
- **Conserva el fallback a TTS es-MX** si un asset faltara (defensa), pero el default ahora son las grabaciones.
- Verifica que el juego suene con las reales (no TTS) al reproducir.

## 3 · Limpiar `app.json` (diff sucio pre-existente, 5ª vez reportado)
- `UIBackgroundModes: ["audio","audio"]` → **`["audio"]`** (dedupe, es bug).
- **Permisos de ubicación** (`ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` Android + cualquier iOS): **revisa si algo del código usa ubicación** (`expo-location`, geolocalización, índice UV / ATP SOL). Si **NO se usa** → quítalos (permiso sin uso = fricción/rechazo en stores). Si **SÍ se usa** → déjalos pero scope "when in use", no "always".
- Conserva `ITSAppUsesNonExemptEncryption: false` y `NSSpeechRecognitionUsageDescription` (sirven).
- Commitea el `app.json` limpio intencionalmente (dejó de ser diff sucio sin commitear).

## 4 · Binaurales (3 piezas — feature nueva chica)
Los 3 archivos ya están producidos y se suben a `audio/` (`binaural_alpha.m4a`, `binaural_theta.m4a`, `binaural_delta.m4a`, 30 min, estéreo, beats puros L/R + cama tenue). Son DISTINTOS de las meditaciones: **sin voz, sin cuenco, sin gate, sin economía** (son audio-utilidad de fondo, no una sesión que otorgue e-).

**Migración (nueva, idempotente):**
- `ALTER TABLE audio_pieces ALTER COLUMN voz DROP NOT NULL` (los binaurales no tienen voz) — verifica que nada asuma voz NOT NULL.
- Agrega `'binaural'` al CHECK de `categoria` (recrear como la 215: DROP + ADD con las 6).
- Seed idempotente de las 3 filas (`ON CONFLICT (slug) DO NOTHING`):
  - `binaural_alpha` · "Enfoque relajado (alpha)" · subtítulo "Ondas alpha para foco relajado" · categoria `binaural` · 1800s · voz NULL · `audio/binaural_alpha.m4a` · imagen_path NULL (fallback) · orden 40 · tier base · publicado true.
  - `binaural_theta` · "Descanso profundo (theta)" · "Ondas theta para calma profunda" · 1800s · NULL · `audio/binaural_theta.m4a` · orden 41 · base · true.
  - `binaural_delta` · "Desconexión total (delta)" · "Ondas delta para desconectar" · 1800s · NULL · `audio/binaural_delta.m4a` · orden 42 · base · true.

**UI:** sección **Binaurales** en `app/meditation.tsx` (categoria `binaural`), como las otras secciones. En el player, categoria `binaural` = reproducción simple: **sin cuenco, sin gate, sin `logAudioSession`/e-** (no es sesión). El resto del player (controles, background, artwork fallback) igual.
**Copy honesto:** cero claim de "frecuencia sanadora"/curativa; descripción neutra (ondas + estado). Auriculares recomendados (el efecto binaural los necesita) — un hint sutil, no obligatorio.

## Protocolo
`feat/mente-fixes`, NO merge, `tsc` + tests verdes, migración idempotente. Delivery corto. Cowork audita. **Cierra en build nativo** (assets de letras + app.json). Orden post-merge: merge → `db push` (binaurales) → **build nativo**.
