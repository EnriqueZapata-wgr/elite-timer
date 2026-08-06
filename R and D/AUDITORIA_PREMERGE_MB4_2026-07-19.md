# 🔍 Auditoría pre-merge · MB-4 ARGOS JARVIS (orb + voz) — 2026-07-19

**Auditor:** Cowork · **Alcance:** diff `feat/mb10-onboarding..feat/mb4-argos-jarvis` (6 commits)
**Fuentes:** brief FABLE_MB4_ARGOS_JARVIS_2026-07-18.md · SPEC_ARGOS_JARVIS_v1.md · delivery FABLE_MB4_ARGOS_JARVIS_DELIVERY.md
**Contexto:** tramos anteriores (mb10 y previos) ya auditados APTOS. Esta auditoría cubre SOLO lo nuevo de MB-4.

---

## VEREDICTO: ❌ NO APTO — 1 bloqueador de seguridad + 3 funcionales

El diseño general es correcto (keys server-side, STT Gemini, cobro H+ vía argos-proxy, chunker sólido, copy #141 intacto). Pero la edge function de voz quedó **abierta al mundo**, y hay 3 bugs de cliente que rompen la Definición de Terminado en device. Los 4 fixes son quirúrgicos (ninguno es rediseño). Con B1–B4 resueltos, el bloque queda APTO.

---

## 🚨 BLOQUEADORES

### B1 · SEGURIDAD — `argos-voice` sin autenticación, sin cobro y sin rate limit
**Archivo:** `supabase/functions/argos-voice/index.ts` (handler completo, líneas 120–138)

- La función NO valida al usuario. No hay `supabase.auth.getUser()`, no hay lectura del JWT. El cliente la llama con la **anon key** (`src/services/argos-tts.ts` líneas 33–36 y 69–72: `Authorization: Bearer ${SUPABASE_ANON_KEY}`).
- La anon key viaja en el bundle de la app → **cualquiera que la extraiga puede llamar TTS/STT ilimitadamente**: quema créditos de ElevenLabs y cuota de Gemini sin ser usuario, sin pagar H+, sin límite alguno.
- `config.toml` no declara `verify_jwt` para `argos-voice`. Aun con el default `verify_jwt=true` del deploy, **la anon key ES un JWT válido** — no protege nada per-user.
- El cobro de `voice_turn` (400 H+) vive SOLO en el tramo LLM (argos-proxy). **TTS y STT — las llamadas caras a APIs externas — son gratis**: un cliente modificado puede usar la voz de ARGOS para leer cualquier texto sin pagar un solo H+.
- Cero rate limiting, y NO está anotado como pendiente ni en el código ni en el delivery.

**Fix mínimo antes de deployar la función (puede mergearse el código, NO deployarse sin esto):**
1. Validar JWT del user: crear client con el header Authorization entrante + `auth.getUser()`; 401 si no hay user real (la anon key sola no pasa `getUser()`).
2. Rate limit per-user (patrón `checkAndIncrementUsage` de argos-proxy, o contador simple diario por user en tabla).
3. Idealmente: cobrar/medir TTS+STT dentro de `argos-voice` (o al menos loguear a `argos_logs` para telemetría — hoy la voz NO instrumenta el costo real de ElevenLabs/Gemini, solo el LLM).

### B2 · FUNCIONAL — los turnos de voz nunca entran al historial del chat (closure stale + semántica invertida)
**Archivo:** `src/components/argos/ArgosVoiceMode.tsx` (~línea 103): `if (argosText && transcript) onTurnComplete?.(transcript, argosText);`

Dos bugs en una línea:
1. **Closure stale:** `transcript` es state capturado cuando se creó `onOrbTap` — en el primer turno vale `''` → la condición es falsa → `onTurnComplete` **nunca dispara** → los mensajes de voz no se inyectan a `messages` en argos-chat → el `history` del siguiente turno no incluye los turnos de voz previos → **la conversación de 5 turnos (gate J5) pierde contexto**.
2. **Semántica:** `transcript` contiene el texto de **ARGOS** (lo setea `onText`), no lo que dijo el user. En turnos siguientes (closure re-creado) inyectaría la respuesta previa de ARGOS como mensaje del USER.

**Causa raíz:** `runVoiceTurn` (voice-conversation.ts) transcribe el audio del user internamente pero **nunca expone el userText** al caller. **Fix:** callback `onUserTranscript(text)` en `VoiceTurnCallbacks` + usar variables locales (no state) en `ArgosVoiceMode` para armar `onTurnComplete(userText, argosText)`.

### B3 · FUNCIONAL — `waveformBars` sin directiva `'worklet'` → error de runtime en estado 'hablando'
**Archivos:** `src/components/argos/argos-orb-core.ts` (~línea 88) + `ArgosOrb.tsx` (WaveBar, `useDerivedValue`)

`useDerivedValue` corre como worklet en el UI thread y llama a `waveformBars`, importada de otro módulo **sin `'worklet'`**. Reanimated exige la directiva para funciones cross-módulo llamadas desde worklets → alto riesgo de `ReanimatedError: Tried to synchronously call a non-worklet function on the UI thread` en cuanto el orb entre a 'hablando' (waveform). Es el primer uso de `useDerivedValue`/`useAnimatedProps` en todo el repo — no hay precedente que lo valide.

**Fix de 1 línea:** agregar `'worklet';` como primera línea del cuerpo de `waveformBars` (inerte en Vitest, los 17 tests siguen verdes). Verificar en device (gate J2/J5).

### B4 · FUNCIONAL — la cola de playback no es secuencial: cada chunk corta al anterior
**Archivo:** `src/services/voice/voice-conversation.ts` (`pump`, ~líneas 78–92)

`pump` reproduce un clip y espera **40ms** (`setTimeout(r, 40)`) antes de seguir; `playAudioFile` (argos-tts.ts) hace `stopPlayback()` del clip anterior al arrancar uno nuevo. Resultado estructural: **cada chunk de TTS mata al anterior a media frase** — el audio de un turno multi-chunk sale picado/ininteligible. El comentario lo reconoce ("el device gate afina la sincronía real"), pero no es calibración: falta el mecanismo. Además, al vaciarse la cola entre chunks el orb parpadea hablando→idle→hablando.

**Fix:** esperar el fin real del clip con `player.addListener('playbackStatusUpdate', s => s.didJustFinish)` (expo-audio lo expone) o `player.duration`; no marcar `idle` hasta que el stream terminó Y la cola quedó vacía.

---

## 🟡 HALLAZGOS DE SEGURIDAD (no bloquean merge, sí endurecer pronto)

- **H1 · `requestType` lo declara el cliente y un action_key desconocido cuesta 0.** En argos-proxy (~línea 470): `costRow` null → `economyCost = 0` → **LLM gratis mandando un requestType inventado**; y un cliente modificado puede mandar `'chat'` (280) en un turno de voz para evadir la prima (400). Pre-existente (no lo introduce este diff), pero MB-4 cuelga de ese mecanismo la acción más cara. Recomendación (mismo patrón del hardening #23): whitelist server-side de action_keys + fallback a costo de 'chat' si el key no existe.
- **H2 · `userId` viene del body sin verificar contra el JWT** en argos-proxy (pre-existente): un cliente podría cargar H+ a otro user (griefing) u omitir userId y no pagar. Deuda arquitectónica a resolver en el hardening del proxy, no de este diff.
- **H3 · STT corre ANTES del cobro:** un user sin H+ consume Gemini STT (gratis para él) y recién falla en el LLM (402). Se resuelve junto con B1 (metering en argos-voice).
- **H4 · Sin H+ en modo voz → mensaje engañoso.** El 402 `insufficient_protons` del proxy llega como `ArgosStreamUnavailableError` → el catch dice "Sin voz ahora — te respondo por texto"… y no llega ningún texto. El rechazo server-side ES limpio (402, no sintetiza gratis ✓), pero el cliente debe detectar `proxy_402` y decir la verdad: "Te quedaste sin H+ para el modo voz" + ruta a la tienda.

## 🟢 SEGURIDAD — lo que SÍ está bien

- **Cero keys/voice IDs hardcodeados.** Grep exhaustivo del diff: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_MASCULINA/FEMENINA`, `GEMINI_API_KEY` solo como `Deno.env.get()` en la edge function. En cliente y repo: nada (solo nombres de secrets en docs/comentarios).
- **STT = Gemini audio-input** (`gemini-2.5-flash`, inline_data). **Cero referencias a OpenAI/Whisper** en todo el diff. Doctrina cumplida.
- **Cobro `voice_turn` server-side de verdad** (dentro de lo que cubre H1/H2): argos-proxy descuenta ANTES del LLM vía `spend_protons` atómico con idempotency_key, 402 limpio sin llamar al LLM, refund si el LLM falla. El cliente no escribe balances.
- **Migración 206:** idempotente (`ON CONFLICT DO NOTHING` — no pisa override manual de precio), solo seed de `proton_action_costs` (tabla con RLS habilitada desde 086, policy SELECT-only para users). No toca ledger ni filas de user. Numeración única (205 es de mb10). ✓
- **Fallback honesto en la function:** sin key/config → 503 `{fallback:'text'}`, nunca voz robótica. ✓

---

## Resto del checklist

| # | Punto | Estado |
|---|---|---|
| Orb 4 estados | idle/escuchando/pensando/hablando en Reanimated, specs en core puro testeado | ✅ (con B3) |
| Reduced-motion | No se apaga, sin animación continua ✓. **Pero:** estados por pares indistinguibles (idle=pensando glow 0.4; escuchando=hablando glow 0.6). El brief pedía "estados distinguibles sin animación" — diferenciar los 4 glows (p.ej. 0.3/0.45/0.6/0.75) es fix de 4 números | 🟡 |
| Tokens brand.ts | `ORB_LIME/ORB_TEAL` son **espejo hardcodeado** de brand.ts (justificado: brand.ts arrastra require() de imágenes y rompe Vitest; valores verificados idénticos `#A8E02A`/`#1ABC9C`). Extra: `#EAFFC0`/`#ffffff` decorativos en el orb y `#a8e02a` en el icono mic de argos-chat (== lime, pero literal) | 🟡 menor |
| Leaks orb | Listener de AccessibilityInfo con cleanup ✓; animaciones canceladas al cambiar estado; Reanimated limpia shared values al desmontar | ✅ |
| Leak playback | Salir de argos-chat mientras ARGOS habla NO detiene el audio nuevo (el cleanup solo llama `stopSpeaking` legacy, no `stopPlayback` de argos-tts). Agregar al cleanup del unmount | 🟡 |
| Chunker <2s | `FIRST_CHUNK_CHARS=10` < `MIN_CHUNK_CHARS=16` — primer chunk sale antes ✓; no parte decimales ✓; sin pérdida/duplicado ✓ (test de reconstrucción) | ✅ |
| Interrupción | `abort()` corta playback y deja de consumir el stream ✓. **Pero** no cancela el fetch TTS en vuelo (sin AbortController — ≤1 chunk de ElevenLabs se sintetiza y se tira) y el `finally` de `callAnthropicStream` hace `releaseLock` sin `reader.cancel()` (la conexión SSE puede seguir descargando en background). Sin costo extra de H+ (cobro flat upfront), sí desperdicio menor de tokens/red | 🟡 |
| Cache TTS | **Write-only:** `synthesizeSpeech` escribe `argos-tts-<hash>.mp3` en `cacheDirectory` pero NUNCA verifica si ya existe antes de re-sintetizar (el preview de Meet ARGOS re-paga ElevenLabs en cada tap). Sin eviction propia; el OS puede purgar cacheDirectory (crecimiento acotado por el SO, no por la app). Añadir check de existencia = ahorro directo | 🟡 |
| expo-audio | Cero expo-av ✓; expo-audio, expo-file-system, expo/fetch y expo-speech todos con import perezoso + fail-soft | ✅ |
| Meet ARGOS copy #141 | `src/constants/argos-meet-copy.ts`: **0 líneas de diff**. Flag vivo (task #141 sigue pending). meet.tsx solo swap ArgosAvatar→ArgosOrb | ✅ |
| ArgosVoicePicker | Reutilizado de MB-10, modificado in-place (avatar→orb). Cero duplicación | ✅ |
| Mic → overlay | Botón mic-circle en argos-chat abre `ArgosVoiceMode` como `Modal` (no navegación, cero casts). Ruta alcanzable de punta a punta | ✅ |
| Borrado filas user | Cero DELETE/DROP/`.delete()` en el diff | ✅ |
| Nombres propios | Cero en copy user-facing (solo "Enrique" en docs internos/comentarios, permitido) | ✅ |
| Español MX | Copy nuevo correcto y honesto. Detalle de criterio: "Toca el orb para interrumpir" — anglicismo "orb" user-facing; ¿"esfera"? Decisión de Enrique | 🟡 menor |
| Tests (17) | 10 orb + 7 chunker. Cubren cores de verdad: el chunker ES el mecanismo del <2s (umbral primer chunk, decimales, reconstrucción sin pérdida) y el orb cubre spec de los 4 estados + reduced-motion. No es teatro. Gap honesto: voice-conversation (impuro) sin test — y ahí viven B2/B4 | ✅ |
| Imports | Spot-check verde (haptics, stopSpeaking, EliteText, brand, theme). Delivery reporta tsc 0 errores + 1879 tests en CI (no verificable en este entorno Linux — node_modules es de Windows) | ✅ |

---

## ✅ Checklist de deploy de Enrique (orden exacto — DESPUÉS de los fixes B1–B4)

> ⚠️ **Regla dura:** NO deployar `argos-voice` sin el fix B1 (auth + rate limit). El resto del código puede mergear con B2–B4 resueltos en la misma branch.

1. **Fixes B1–B4 en la branch** (Fable) → re-audit rápido del delta → tsc verde en CI.
2. **Merge** (orden de la cadena): `feat/mb10-onboarding` → main (ya APTO), luego `feat/mb4-argos-jarvis` → main.
3. **Secrets** (Supabase → Edge Functions → Secrets):
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_MASCULINA` + `ELEVENLABS_VOICE_FEMENINA` (elegir 2 voces catálogo ES-MX mentor cálido; **confirmar que existan en `eleven_flash_v2_5`**)
   - `GEMINI_API_KEY` ya existe — verificar.
4. **Deploy function:** `supabase functions deploy argos-voice` (con verify_jwt default; la protección real es el fix B1).
5. **db push:** `npx supabase db push` → aplica migración 206 (idempotente). Verificar: `SELECT * FROM proton_action_costs WHERE action_key='voice_turn';` → 400.
6. **OTA:** `eas update --branch preview` (JS/TS para binarios que ya tengan mic permission).
7. **Build nativo:** `eas build --profile preview --platform ios` — **obligatorio**: `NSMicrophoneUsageDescription` es cambio de infoPlist, la voz NO funciona por OTA en binarios viejos.
8. **Device gates (en el binario nuevo):**
   - Orb: 4 estados distinguibles en Meet ARGOS, 60fps, sin crash en 'hablando' (B3). Reduce-motion ON → presente sin animación.
   - Voz: "Muestra" M/F en Meet ARGOS suena ElevenLabs real (no TTS del SO).
   - Conversación: mic → hablar → primer audio <2s (cronometrar) → audio SIN cortes entre frases (B4) → interrumpir con tap → **5 turnos seguidos con contexto** (B2: el turno 3 debe recordar el turno 1).
   - H+: un turno descuenta 400 (balance + argos_logs `request_type='voice_turn'`).
   - Sin H+: mensaje honesto, sin síntesis gratis.
   - Copy Meet ARGOS idéntico, flag #141 vivo.
9. **Post-deploy:** calibrar precio `voice_turn` con `argos_logs` (costo real ElevenLabs+Gemini+LLM por turno) — hoy la telemetría solo captura el LLM (ver B1.3).

---

*Auditoría sobre commits `8179b23..6967d3d`. Cambios posteriores a esta fecha requieren re-audit del delta.*
