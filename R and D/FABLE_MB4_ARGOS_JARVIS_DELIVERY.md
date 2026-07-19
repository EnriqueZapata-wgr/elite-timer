# 🐺 MB-4 · ARGOS JARVIS (orb + voz) — Delivery

**Fecha:** 2026-07-19 · **Branch:** `feat/mb4-argos-jarvis` · **CI:** tsc 0 errores · 1879 tests verdes (17 nuevos) · 6 commits

## ⚠️ Nota de ramificación (para Cowork)
El brief decía "desde main actualizado — los tramos 2+3 ya están mergeados". Al arrancar, `main` seguía en `66fdfa1` (sin tramos 2/3); `git pull` = "Already up to date". La selección de voz (`ArgosVoicePicker`) que debía migrar de TTS-device a ElevenLabs, y la migración 205 (`argos_voice`), viven en `feat/mb10-onboarding`. Apliqué el método (ramificar de la anterior terminada) → **`feat/mb4-argos-jarvis` sale de `feat/mb10-onboarding`**. Contiene tramos 2+3+4. Orden de merge: 2 → 3 → 4.

## ⚠️ Alcance real: código completo, verificación = device + keys
El brief marca "build nativo instalado" como prerequisito duro y "NO se puede probar por OTA". No tengo device ni API keys de ElevenLabs, así que **entrego el código, la edge function y los cores testeados; los gates de device (60fps, <2s, conversación real) los verifica Enrique** tras `eas build` + configurar secrets. Es el mismo patrón de todo el away-run.

---

## Definición de terminado — estado

| # | Criterio | Estado |
|---|---|---|
| 1 | Orb 4 estados 60fps + reduced-motion | ✅ código + tests · **60fps = device gate** |
| 2 | Voz M/F ElevenLabs | ✅ edge function + cliente · **secrets + deploy = Enrique** |
| 3 | Conversación primer audio <2s + interrumpible | ✅ pipeline completo + alcanzable · **<2s real = device gate** |
| 4 | H+ instrumentado | ✅ action `voice_turn` + migración 206 + cobro server-side |
| 5 | Copy Meet ARGOS sin tocar, flag intacto | ✅ verificado, cero cambios al copy |

---

## Qué se hizo

### Config nativo (commit 1)
- `app.json`: `NSMicrophoneUsageDescription` honesto en español MX. `UIBackgroundModes:['audio']` ya existía (MB-5, no dupliqué); Android `RECORD_AUDIO` ya estaba.
- **`react-native-keyboard-controller`: NO está en deps** (el brief lo daba por instalado). NO añadí una dep nativa no verificable por OTA — el chat maneja el teclado manualmente hoy y funciona. Flag para Enrique: si lo quiere, es `npm i` + build nativo.

### Orb glass lime→teal, 4 estados (commit 2) — Gate J2
- **`argos-orb-core`** (puro, 10 tests): idle (respira ~4s) · escuchando (expande) · pensando (rota núcleo) · hablando (waveform reactiva). reduced-motion → pulso mínimo por opacidad, **no se apaga** (accesibilidad, spec §2.3). `waveformBars` determinístico (sin Math.random → testeable).
- **`ArgosOrb`**: RadialGradient lime→teal (tokens `brand.ts`), Reanimated 4 en UI thread (escala/rotación/opacidad/waveform), **cero dep nueva**. Lee reduce-motion del sistema (`AccessibilityInfo`).
- Integrado en Meet ARGOS (cinemática + `ArgosVoicePicker`) — presentación solo ahí (decisión Enrique). Copy #141 intacto (mapeo de estado con `orbStateFromAvatar`).

### Voz ElevenLabs + STT Gemini (commit 3) — Gate J5 parte 1
- **Edge function `argos-voice`**: `action:'tts'` (ElevenLabs, modelo **Flash de baja latencia** — el <2s manda; voice IDs + API key SOLO en `Deno.env`) y `action:'stt'` (**Gemini audio-input, JAMÁS OpenAI**). Fallback a texto si falta config (503/502, nunca voz robótica).
- **`argos-tts.ts`** (cliente): `synthesizeSpeech` (edge → base64 → cache mp3 con expo-file-system) + `playAudioFile`/`stopPlayback` (expo-audio, una pista, barge-in) + `transcribeAudio`. Todo import perezoso, fail-soft → texto.
- **`argos-voice-service`**: el preview de Meet ARGOS ahora usa la voz REAL (ElevenLabs) con fallback a expo-speech. `resolveArgosVoice`/`DEFAULT_ARGOS_VOICE`: NULL → masculina, **nunca por biological_sex**.

### Streaming <2s + conversación + H+ (commit 4) — Gate J5 parte 2
- **`voice-chunker-core`** (puro, 7 tests): corta el token-stream por frase con umbral **más bajo en el primer chunk** → el primer audio sale antes (el cómo del <2s). No parte decimales, no pierde ni duplica texto.
- **`voice-conversation`**: orquesta el turno — STT → LLM token-stream (`requestType='voice_turn'`) → chunker → TTS por chunk → cola de playback secuencial. **Barge-in**: `abort()` corta stream+TTS+audio → orb idle. Fallback a texto.
- **H+**: `voice_turn` (400 H+ inicial, calibrable con `argos_logs`) en economy-config + **migración 206** (idempotente). `generateResponseStream` acepta `requestType` → cobra como voz server-side (argos-proxy ya tiene la maquinaria de cobro/refund atómico).

### Modo voz alcanzable (commit 5)
- **`argos-recorder`**: captura audio con expo-audio (record→base64 m4a) para STT Gemini. Permiso de micrófono, fail-soft.
- **`ArgosVoiceMode`**: overlay full-screen con el orb — tap graba → tap envía → tap durante habla = barge-in. Mensajes honestos si falla.
- **`argos-chat`**: botón mic-circle abre el modo voz; carga la voz elegida. El pipeline es alcanzable de punta a punta.

## Qué NO se hizo (y por qué)
- **System prompt Jarvis (J1), proactividad (J3), multimodal (J4)**: son fases separadas del spec (~8 semanas). La DoD del brief acota a orb + voz + streaming + H+ + flag. Las otras fases quedan para sus tracks. El system prompt actual (persona ya reescrita en triple-audit P1.5) sigue vivo.
- **keyboard-controller**: no está en deps (arriba).
- **VAD automático de barge-in**: hoy el barge-in es por tap del usuario (corta el audio). Un VAD que detecte voz entrante mientras ARGOS habla (interrupción sin tap) es device + audio-capture concurrente — anotado como refinamiento. El corte por tap ya cumple "interrumpible".
- **Migrar el modelo a Sonnet 4-6**: el proxy YA está en `claude-sonnet-5` (upgrade previo). No lo toqué.

## Dudas / acciones para Enrique
1. **Secrets de la edge function** (Supabase → Edge Function secrets): `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_MASCULINA`, `ELEVENLABS_VOICE_FEMENINA` (los voice IDs del catálogo ES-MX que elijas — 1 masculina + 1 femenina). `GEMINI_API_KEY` ya existe. **Deploy**: `supabase functions deploy argos-voice`.
2. **db push**: migración **206** (voice_turn cost). Idempotente.
3. **Voces del catálogo**: elige 2 voces ElevenLabs ES-MX (mentor cálido con autoridad) y pon sus IDs en los secrets. El modelo Flash está fijado por latencia — confirma que las voces existan en Flash v2.5.
4. **Precio H+ de voz**: puse 400 inicial. Calíbralo con `argos_logs` (costo real por turno) una vez tengas datos.
5. **60fps del orb en device gama media**: si no llega, bajar `WAVE_BARS` (hoy 5) o simplificar — un orb que tartamudea mata más que uno simple (tu criterio del brief).

## Checklist device (Enrique) — los 3 gates
- [ ] **Orb (J2)**: en Meet ARGOS, ver los 4 estados distinguibles, transiciones fluidas, 60fps. Activar reduce-motion del sistema → el orb no se apaga, solo deja de animarse.
- [ ] **Voz (J5)**: tras secrets + deploy + build nativo → Meet ARGOS, tocar "Muestra" de cada voz → suena la voz REAL de ElevenLabs (no TTS del SO).
- [ ] **Conversación (J5)**: chat ARGOS → botón mic → hablar → cronometrar primer audio (<2s objetivo) → interrumpir tocando el orb → 5 turnos seguidos.
- [ ] **H+**: un turno de voz descuenta `voice_turn` H+ (visible en balance / argos_logs).
- [ ] Copy de Meet ARGOS sin cambios (flag #141 vivo).

## Commits
1. Config: NSMicrophoneUsageDescription
2. Orb glass 4 estados + reduced-motion (J2)
3. Voz ElevenLabs + STT Gemini (edge function + cliente)
4. Streaming <2s (chunker) + conversación + H+ (migración 206)
5. Modo voz alcanzable (recorder + overlay + botón)
