# 🔍 Re-auditoría FOCALIZADA · fixes MB-4 (B1–B4 + menores) — 2026-07-19

**Alcance:** SOLO el delta `4473d1e..348f923` (commits `2b70c8b` + `348f923`), rama `feat/mb4-argos-jarvis`.
11 archivos, +651/−49. El resto de MB-4 ya fue auditado en `AUDITORIA_PREMERGE_MB4_2026-07-19.md`.
**Método:** lectura línea por línea de la edge function y de las RPC de economía que invoca (091/094/086),
trazado del flujo de dinero de punta a punta, verificación de que los tests prueban el mecanismo y no la fachada.

---

## VEREDICTO: ❌ NO APTO — 1 condición dura (M1, ~10 líneas en la misma función)

**B1, B2, B3, B4 y los 5 menores: verificados, hechos de verdad.** No hay teatro: el código hace lo que
dice el commit message. La auth es real, el cobro es previo al provider, el refund no puede mintear,
los tests de B2/B4 prueban el mecanismo con promesas diferidas (no asserts de fachada).

**Pero el fix B1 introdujo su propio agujero de dinero:** la `idempotency_key` la manda el CLIENTE y el
índice único de `proton_transactions` es **global y sin caducidad**. Reusar UNA sola key deja el TTS/STT
**gratis para siempre**. Es exactamente el hoyo que B1 venía a cerrar ("TTS/STT gratis con cliente
modificado"), un paso más abajo. Se cierra con ~10 líneas → aplicarlo antes del merge, no como deuda.

Exposición residual tras el fix, para dimensionar: de *"cualquiera en internet con la anon key, ilimitado"*
a *"usuario autenticado, tope 1200 TTS + 200 STT al día"* ≈ **$10–15 USD/día/cuenta** de ElevenLabs+Gemini
a costo 0 H+. La reducción es enorme, el hoyo sigue abierto.

---

## 🚨 M1 · NUEVO — replay de `idempotency_key` = voz gratis ilimitada
**Severidad: ALTA (dinero) · introducido por este delta**
**Ruta:** `supabase/functions/argos-voice/index.ts:243-255` + `supabase/migrations/094_proton_transactions_idempotency.sql`

```ts
const idemKey = typeof body.idempotency_key === "string" && body.idempotency_key
  ? body.idempotency_key : null;                 // ← 100% controlada por el cliente
const { data: debit } = await supabase.rpc("spend_protons", { ..., p_metadata: { idempotency_key: idemKey } });
...
debitedCost = debit.idempotent ? 0 : cost;      // ← replay ⇒ 0, y el provider se llama igual
```

`spend_protons` v2 (094) dedupe contra un **UNIQUE index global** sobre `proton_transactions.idempotency_key`
— sin scope por usuario, sin scope por acción, sin ventana de tiempo:

```sql
IF EXISTS (SELECT 1 FROM proton_transactions WHERE idempotency_key = v_idem) THEN
  RETURN jsonb_build_object('success', true, ..., 'idempotent', true);
END IF;
```

**Traza del ataque** (cliente modificado / curl con una sesión válida):
1. Llamada 1 con key `K`: cobra 5 H+, sintetiza. Normal.
2. Llamadas 2..N con la MISMA `K`: `spend_protons` devuelve `success:true, idempotent:true` →
   `debitedCost = 0` → **no se cobra** → ElevenLabs se llama igual y devuelve el audio.
3. Techo: solo el rate limit diario (1200 TTS / 200 STT). Nada más.

Variantes que también funcionan: forzar un fallo del provider en la llamada 1 (se refunda el cargo, la key
queda quemada, y a partir de ahí es gratis con saldo neto 0); o mandar una key que ya exista **de otro
usuario** (el índice es global) para no pagar ni la primera vez.

**Lo mismo, pre-existente, en el proxy:** `argos-proxy/index.ts:498-509` pasa la key del cliente igual →
**Claude gratis** replayando una key (más valioso para un atacante que el TTS). Misma raíz, mismo fix.

**Fix (una vez, aplicado en las dos funciones):** derivar la key en el servidor y **ignorar la del body**:

```ts
// key = usuario + acción + hash del payload → un retry real (mismo payload) no re-cobra;
// un texto/audio distinto SIEMPRE cobra. El replay deja de existir.
const payload = action === "tts" ? `${body.voice ?? ""}|${body.text ?? ""}` : String(body.audio_base64 ?? "");
const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload)))]
  .map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
const idemKey = `${userId}:${requestType}:${digest}`;
```

No hay costo legítimo: el cache de `argos-tts.ts` ya evita re-sintetizar el mismo texto en el cliente, y un
retry de red genuino manda el mismo payload → sigue siendo idempotente. Alternativa mínima si se prefiere no
tocar el hash: scoping del índice único a `(user_id, action_key, idempotency_key)` + ventana (`created_at >
now() - interval '10 minutes'`) en el `EXISTS`. **La key del cliente no debe seguir siendo la autoridad.**

---

## 🚨 M2 · PRE-EXISTENTE (descubierto auditando el fix) — `spend_protons` es llamable con la anon key contra CUALQUIER user_id
**Severidad: ALTA (seguridad economía) · fuera del delta, misma superficie**
**Ruta:** `supabase/migrations/091_economy_rpc.sql:75-77` y `:188` · replicado en 094, 158, `convert_electrons_to_protons`, `join_challenge`

```sql
IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN   -- ← con anon, auth.uid() ES NULL
  RETURN jsonb_build_object('success', false, 'error', 'forbidden');
END IF;
```

El guard solo dispara si `auth.uid()` **no** es NULL. Con la **anon key** (que viaja en el bundle) `auth.uid()`
es NULL → el guard no aplica. Y `EXECUTE` nunca se revocó de `PUBLIC` para `spend_protons` (091 revoca solo
`award_electrons` / `award_protons` / `settle_challenge`; PostgreSQL concede EXECUTE a PUBLIC por defecto y
no hay `ALTER DEFAULT PRIVILEGES` en ninguna migración). PostgREST expone el RPC a `anon`.

**Consecuencia:** cualquiera con la anon key puede hacer `POST /rest/v1/rpc/spend_protons` con el `user_id`
de otra persona y **vaciarle el saldo de H+**. No hay auto-enriquecimiento (es vandalismo, no minteo — los
créditos sí están bien blindados a `service_role`), pero es destrucción de saldo de terceros.

**Fix (1 línea por función, no rompe las edge functions, que entran como `service_role`):**
```sql
REVOKE EXECUTE ON FUNCTION spend_protons(uuid, bigint, text, jsonb) FROM PUBLIC, anon;
-- idem convert_electrons_to_protons, join_challenge, activate_pro_boost
```
⚠️ NO endurecer el guard a `auth.uid() IS NULL → forbidden`: rompería a argos-proxy y argos-voice, que
llaman con service_role (ahí `auth.uid()` también es NULL). El REVOKE es el corte correcto.

---

## ✅ B1 · SEGURIDAD Y DINERO — verificado punto por punto

| # | Pregunta | Veredicto |
|---|---|---|
| 1 | ¿`getUser()` valida el JWT de verdad? ¿La anon key sola pasa? | ✅ **Correcto.** `index.ts:198-206`: extrae el Bearer, `supabase.auth.getUser(jwt)` con jwt explícito (valida contra `/auth/v1/user`, no confía en el cliente). Sin `data.user.id` → `userId` null → **401 antes de tocar provider, cobro o rate limit**. La anon key y la service key son JWTs sin `sub` → getUser no devuelve user → 401. JWT expirado → error → 401. `try/catch` deja `userId` null (falla cerrado ✓). `config.toml` declara `verify_jwt = true` con el comentario honesto de que la protección real es el getUser interno. |
| 2a | ¿El cobro es ANTES del consumo del provider? | ✅ **Sí.** Orden estricto: auth (206) → rate limit (213) → cobro (233-257) → `handleTts/handleStt` (260). Cierra también **H3** del reporte previo (STT ya no corre gratis antes del cobro). |
| 2b | ¿La idempotency key permite replay / doble cobro? | ❌ **Replay SÍ — ver M1.** Doble cobro NO (esa mitad funciona: `spend_protons` es atómico vía UNIQUE index + `FOR UPDATE`). |
| 2c | ¿El refund puede regalar o mintear H+? | ✅ **No.** El refund es `award_protons(debitedCost)` y `debitedCost` es exactamente lo debitado en esta invocación, o **0 si el débito fue idempotente** (`:255`) → un replay no genera refund fantasma. No hay camino donde el refund supere al cargo. Forzar fallos del provider en bucle da saldo neto 0, no ganancia. `award_protons` está revocado a todos menos `service_role` (091:195,198) ✓. Ambos caminos de fallo cubiertos: `!resp.ok` (263) y excepción (293). |
| 2d | ¿Cuál es el default duro sin fila en `proton_action_costs`? | ✅ **Razonable.** `{ voice_tts: 5, voice_stt: 15 }` (`:49`), idéntico al seed de 206 → sin fila cobra lo mismo, **nunca 0**. Si la lectura de la tabla falla (catch `:241`) también cae al default. `enabled=false` → 0 (gratis explícito de Enrique, decisión de negocio, no accidente). |
| 3 | `LAB_ECONOMY_ENABLED` apagado → ¿voz gratis? | ✅ **Sí, e intencional y consistente.** Mismo flag y misma semántica que argos-proxy (`argos-proxy:331`) y `lab-parser-worker:180`: con la economía apagada NADA cobra, ni chat ni voz. Los secrets de edge functions son a nivel proyecto → no puede quedar el proxy cobrando y la voz gratis. **Sin riesgo de divergencia.** Nota operativa: con el flag OFF la voz queda sin muro económico y solo la protege el rate limit — está bien mientras `LAB_ECONOMY_ENABLED=true` esté verificado en producción antes de exponer la voz. |
| 4 | ¿El rate limit es fiable? | 🟡 **Funciona, con 3 grietas conocidas.** (a) El conteo es viable: `argos_logs.request_type` es `text` sin CHECK (060:13) → `voice_tts`/`voice_stt` insertan sin problema; `tier`/`estimated_cost_usd` idem. (b) **Race:** es count-then-act y el log se inserta DESPUÉS del provider → N llamadas concurrentes ven el mismo conteo y pasan todas. (c) **Fail-open doble:** el catch es explícito, y además supabase-js no lanza en error de query — devuelve `{count:null}` → `(null ?? 0) >= limit` es false → pasa. Si el insert de `logVoiceCall` fallara (error tragado en `:175`), el contador nunca sube y el límite deja de existir en silencio. Doctrina consistente con el proxy y documentada; para el tope del abuso (M1) conviene endurecerlo a fail-closed o a un contador dedicado. |
| 5 | ¿El cliente manda el token bien, sin filtrarlo? | ✅ **Correcto.** `argos-tts.ts:23-30`: `getSession().access_token`, `catch → null`. Sin sesión → `return null` antes del fetch (`:59`, `:94`) → fallback a texto, sin crash. El token va solo en el header `Authorization`, **nunca en URL, log, ni cuerpo**. Cero `console.log` del jwt en el archivo. |
| 6 | Migración 206: ¿idempotente, RLS, y el cliente no puede escribir costos? | ✅ **Las tres.** `ON CONFLICT (action_key) DO NOTHING` → re-ejecutable y no pisa un override manual de precio. `proton_action_costs` tiene RLS habilitada desde 086 con **una sola policy, `FOR SELECT USING (true)`** — sin policy de INSERT/UPDATE/DELETE, y ninguna migración posterior (162/175/186/189/206) agrega una. El cliente lee costos (necesario para el pre-flight) y **no puede escribirlos**. Numeración 206 única. |

---

## ✅ B2 / B3 / B4 — verificados

**B2 — roles del historial** ✅ **Cerrado de raíz.**
`voice-conversation.ts:88` emite `onUserTranscript(userText)` y `:175` devuelve `{ userText, argosText }`.
`ArgosVoiceMode.tsx` consume el resultado del `await handle.done` (no state) y el array de deps ya no
incluye `transcript` → **closure stale eliminado, no mitigado**. `argos-chat.tsx:710-716` inserta
`{role:'user', userText}` + `{role:'assistant', argosText}` y pasa `history` derivado de `messages` → el
gate de 5 turnos con contexto por fin es alcanzable. Verificado el ciclo completo.

**B3 — `'worklet'`** ✅ Presente como primera sentencia del cuerpo de `waveformBars` (`argos-orb-core.ts:94`),
después de comentarios (válido: sigue siendo prólogo de directiva).

**B4 — cola secuencial** ✅ **Correcto, incluidos los bordes.**
`playAudioFileToEnd` (`argos-tts.ts:153-192`) registra el listener **antes** de `player.play()` (no se pierde
el evento), guard `settled` contra doble resolución, handshake vía `releaseCurrentWait` que `stopPlayback`
dispara (`:203`).
- *¿Puede colgarse la cola si `didJustFinish` nunca llega?* **No.** Tres salidas: el evento, el
  `stopPlayback` del barge-in, y el backstop de 45 s.
- *¿El backstop deja audio huérfano sonando?* **No.** Al resolver por timeout, `currentPlayer === player`
  sigue siendo cierto → `player.remove()` (`:186`) corta el audio. Sin doble-remove tras `stopPlayback`
  (que ya puso `currentPlayer = null`).
- El drain de `voice-conversation.ts:168-171` no hace busy-loop (`pump()` asigna `playing` y `pumpDone`
  sincrónicamente antes de devolver el control) y ningún chunk puede encolarse después del drain
  (`speakChunk` se await-ea dentro del for del stream).

---

## ✅ Menores — los 5 verificados

| Menor | Estado |
|---|---|
| **402 honesto (H4)** | ✅ **Y la detección es real, no inventada por el test.** `anthropic-client.ts:155` lanza literalmente `` `proxy_${response.status}: …` `` → en un 402 el mensaje es `proxy_402: {…"insufficient_protons"…}`, que es exactamente lo que matchea `voice-conversation.ts:157`. El test fabrica ese string, pero **coincide con el formato de producción** (verificado en la fuente). `ArgosVoiceMode` muestra el mensaje honesto + CTA a `/economy/shop` (ruta existe). |
| **Cache TTS con la voz en la key** | ✅ `argos-tts.ts:49` (`argos-tts-${voice}-${clipId}`) + lectura previa con `getInfoAsync` (`:53-56`) antes de sintetizar. El preview de Meet ARGOS ya no re-paga. |
| **Reduced-motion 4 glows** | ✅ `0.3/0.45/0.6/0.75` + test que asserta que los 4 valores son distintos (`new Set(glows).size === 4`). |
| **`action_key` desconocido → costo de chat** | ✅ `argos-proxy:466-484`. Nota: si tampoco existiera la fila `chat`, vuelve a 0 — hoy está seeded en 086, riesgo teórico. No cierra H1 completo (whitelist + `requestType` client-declarado siguen pendientes, y así lo anota el propio comentario del código). |
| **Cleanup de playback al salir de argos-chat** | ✅ `argos-chat.tsx:159` — el `useFocusEffect` ahora hace `stopSpeaking()` **y** `stopPlayback()`. |

---

## 🟡 Hallazgos menores nuevos (no bloquean)

| # | Hallazgo | Sev | Ruta |
|---|---|---|---|
| M3 | **STT vacío se cobra igual.** Si Gemini responde 200 con `text: ""`, `resp.ok` es true → no hay refund → el usuario paga 15 H+ por una transcripción vacía. Sugerido: refundar cuando `action==='stt'` y el texto sale vacío. | Baja (dinero) | `argos-voice/index.ts:144-146`, `:263` |
| M4 | **El barge-in no cancela el TTS en vuelo.** Ya estaba en el reporte previo como desperdicio de red; ahora además **cuesta 5 H+** por chunk sintetizado y tirado. | Baja (dinero) | `voice-conversation.ts:132-137` |
| M5 | **Las conversaciones de voz no se persisten.** `saveConversation` solo se llama dentro del flujo de texto (`argos-chat.tsx:372-383`). Los turnos que ahora sí entran a `messages` (fix B2) se pierden al salir de la pantalla salvo que después se mande un mensaje de texto. Gap nuevo *revelado* por el fix, no causado por él. | Media (funcional) | `app/argos-chat.tsx:710-716` |
| M6 | **`clipId` es un hash de 32 bits** sobre el texto → colisión ⇒ se reproduce el clip equivocado desde cache. Improbable, barato de blindar (incluir `length` en la key). | Baja | `argos-tts.ts:83-87` |
| M7 | **El contrato real de expo-audio no está testeado.** `argos-tts` está 100% mockeado en los tests → si el evento no fuera `'playbackStatusUpdate'` o el flag no fuera `didJustFinish`, **cada chunk esperaría los 45 s del backstop** y la suite seguiría verde. Es el único supuesto de runtime sin red de seguridad. **Gate de device obligatorio para B4.** | Media (riesgo de verificación) | `argos-tts.ts:175-177` |
| M8 | **El test de B3 es un regex sobre la fuente** (`/export function waveformBars[^{]*\{[\s\S]{0,400}?'worklet';/`). Previene el borrado de la directiva, pero pasaría igual si alguien la moviera fuera del prólogo (donde Reanimated ya no la ve) o si un comentario largo rompiera el margen de 400 chars. Honestamente documentado en el propio test. | Baja (test frágil) | `argos-orb-core.test.ts:77-86` |

---

## 🧪 ¿Los 9 casos de `voice-conversation.test.ts` cubren los cores?

**Sí — no es teatro.** Los 3 de B4 son los buenos: usan promesas diferidas y **verifican que el clip N+1 no
arranca hasta que el N resuelve** (`expect(playAudioFileToEnd).toHaveBeenCalledTimes(1)` con 2 chunks ya
sintetizados), que `done` no resuelve mientras el clip suena, y que `idle` se emite **una sola vez** al final.
Eso es el mecanismo de B4, no su fachada. Los de B2 assertan el array exacto que recibe el LLM
(`[...history, {role:'user', content:'segundo turno'}]`) y que `requestType: 'voice_turn'` sobrevive.

**Gaps honestos:** (1) el contrato real de expo-audio queda fuera (M7); (2) `ArgosVoiceMode` no tiene test
— el fix del closure stale se verifica por lectura (lo hice: es correcto); (3) no hay test de que el drain
no se cuelgue con la cola vacía. Cobertura buena para lógica pura, **el device gate sigue siendo el juez de B4**.

---

## 🔁 Regresiones

- **Nada de MB-4 previamente aprobado se rompió.** El delta toca 11 archivos, todos en la superficie de los
  4 bloqueadores. Sin cambios en el chunker, el orb (salvo los 4 glows y el `'worklet'`), el recorder,
  `ArgosVoicePicker` ni el copy de Meet ARGOS (sigue con 0 líneas de diff → flag #141 intacto).
- **Secretos:** cero. Grep del diff completo por `api_key|secret|sk-|token=|password|Bearer <literal>|eyJ…`
  → sin coincidencias. Las keys siguen solo como `Deno.env.get()`.
- **Imports:** verificados los nuevos uno por uno — `AnimatedPressable` (`@/src/components/ui/AnimatedPressable`),
  `router` de expo-router, `ATP_BRAND` (ya importado), `stopPlayback` en argos-chat, `createClient` en la
  edge function. Ruta `/economy/shop` existe (`app/economy/shop.tsx`). **Sin referencias rotas.**
- **`tsc --noEmit` / vitest:** no verificables en este entorno — `node_modules` está instalado para Windows
  (`@rollup/rollup-linux-x64-gnu` ausente ⇒ vitest no arranca en el sandbox Linux) y `tsc` sobre el mount de
  OneDrive no terminó dentro de la ventana de la auditoría. Se toma el reporte de CC (1890 verdes, tsc 0)
  como declarado, no como verificado.
- **Fuga de info menor (pre-existente):** `handleTts/handleStt` devuelven al cliente `detail` del provider
  (200 chars). La URL de Gemini lleva la API key en query string; si un error del provider llegara a
  ecoar la URL, se filtraría. Riesgo bajo, pero el `detail` no le sirve al cliente — recortarlo a logs.

---

## 🎯 Condiciones para pasar a APTO

1. **M1 (bloqueante):** derivar la `idempotency_key` en el servidor en `argos-voice` **y** en `argos-proxy`.
   Ignorar la del body. ~10 líneas por función.
2. **M2 (misma sesión, es 1 línea × 4):** `REVOKE EXECUTE … FROM PUBLIC, anon` sobre `spend_protons`,
   `convert_electrons_to_protons`, `join_challenge`, `activate_pro_boost` (migración nueva, idempotente).
3. Antes de exponer la voz: confirmar `LAB_ECONOMY_ENABLED=true` en los secrets del proyecto.
4. **Gate de device para B4** (M7): un turno de 3+ chunks. Si cada frase tarda ~45 s, el nombre del evento
   de expo-audio está mal y ningún test lo va a decir.

Lo demás (M3–M8) es deuda menor, priorizable después del merge.
