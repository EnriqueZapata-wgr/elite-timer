# AUDITORÍA FINAL MB-4 — Re-auditoría focalizada del delta de fixes
**Fecha:** 2026-07-20 · **Auditor:** Cowork (solo lectura)
**Rama:** `feat/mb4-argos-jarvis` · **Delta auditado:** `860a3ee` (M1+M2) + `adef2ee` (M4/M5/M6) — exactamente los 2 commits posteriores a `348f923` (último estado auditado en `AUDITORIA_REMERGE_MB4_FIXES_2026-07-19.md`).

---

## VEREDICTO DE MERGE: ✅ APTO
Los dos hallazgos duros de la re-auditoría (M1 replay de idempotency key, M2 RPC abiertas a anon) están cerrados correctamente. Los menores M3-M6 están bien resueltos. Sin regresiones sobre lo ya aprobado, sin secretos en el diff, sin imports rotos.

## VEREDICTO 207: ✅ "207 segura para aplicar YA: SÍ"
Con una nota operativa: `npx supabase db push` desde esta rama aplica también **205 y 206** (pendientes las tres). Verifiqué ambas: son aditivas, idempotentes y no rompen nada del código en producción (ver §1.3). Si quieres aplicar SOLO 207 hoy, no hay forma limpia con `db push` — pero no hace falta: las tres pueden ir juntas sin riesgo.

---

## PRIORIDAD 1 — Migración 207 (`supabase/migrations/207_economy_rpc_revoke_anon.sql`)

### 1.1 Contenido — todo lo pedido está y nada más ✅
- **REVOKE EXECUTE FROM PUBLIC, anon** en las 4: `spend_protons(uuid, bigint, text, jsonb)`, `convert_electrons_to_protons(uuid, int)`, `join_challenge(uuid, uuid)`, `activate_pro_boost(uuid, integer, integer)` ✅
- **GRANT a authenticated** en las 4 ✅
- **GRANT a service_role SOLO en spend_protons** ✅ — y este GRANT es **necesario**, no opcional: 091 nunca dio EXECUTE explícito a service_role sobre `spend_protons` (vivía del default PUBLIC); sin él, el REVOKE rompería el cobro de argos-proxy/argos-voice. Está en el mismo archivo, después del REVOKE. Correcto.
- **Firmas verificadas** contra las definiciones vigentes: `spend_protons` (094:29-31), `convert_electrons_to_protons` (091:94, re-CREATE OR REPLACE en 164 con la misma firma), `join_challenge` (091:137), `activate_pro_boost` (103:66-69, re-CREATE en 158 con la misma firma). Las 4 coinciden exactamente → los REVOKE/GRANT no fallarán por "function does not exist".
- **Idempotente** ✅ — REVOKE/GRANT son idempotentes por naturaleza; re-ejecutarla no da error ni cambia estado.
- **NO toca guards ni cuerpos** ✅ — cero `CREATE OR REPLACE FUNCTION`; solo privilegios. El comentario que justifica NO endurecer el guard (service_role también entra con `auth.uid()` NULL) es correcto y coincide con el código: `activate_pro_boost` llama internamente `spend_protons` vía PERFORM, pero eso corre como owner de la función SECURITY DEFINER (postgres) — no lo afecta el REVOKE.
- La nota del header sobre `activate_pro_boost` es cierta: ni 103 ni 158 le dieron GRANT explícito a authenticated — sin el GRANT de 207 el Boost se rompía desde la app. Bien cazado.

### 1.2 Call-sites — ¿algún flujo legítimo llama como anon? NO ✅
Verifiqué TODOS los call-sites de las 4 RPC en el cliente (grep exhaustivo de `rpc(` en src/ y app/):

| RPC | Wrapper | Caller final | ¿Sesión garantizada? |
|---|---|---|---|
| `spend_protons` | `proton-service.ts:61` | `braverman-premium-service.ts:135` (userId de sesión, pantalla `app/braverman-premium.tsx` con `useAuth`) | Sí |
| `convert_electrons_to_protons` | `electron-to-proton-converter.ts:48` | `app/economy/convert.tsx:54` (`user.id` de `useAuth`, guard `!user?.id`) | Sí |
| `join_challenge` | `challenge-service.ts:29` | `app/economy/challenges.tsx:42` (idem, guard en :40) | Sí |
| `activate_pro_boost` | `subscription-service.ts:87` | `useSubscription.ts:198` (guard explícito `if (!userId) return no_session`) + `app/economy/shop.tsx:116` (`useAuth`) | Sí |

- Ninguna pantalla pre-auth (onboarding, welcome tour, deep links) toca economía: todas las rutas viven detrás de `useAuth` y hacen early-return sin `user.id`. Un deep link sin sesión ni siquiera llega al `rpc()`.
- Server-side: solo `argos-proxy` y `argos-voice` llaman `spend_protons`/`award_protons`, ambas con `SERVICE_ROLE_KEY` → cubiertas por el GRANT a service_role (y `award_protons` ya tenía el suyo desde 091).
- El `spend_protons` directo de Braverman premium manda su propia idempotency_key client-side (`braverman-premium-${result.id}`) — eso es intencional (#143, cobro por resultado), es self-spend con guard activo y no entrega servicio desde una edge function, así que el vector M1 no aplica ahí. Sin cambio requerido.

### 1.3 Independencia del branch ✅
207 solo referencia funciones definidas en 091/094/103/158/164 — todas anteriores al branch (el merge-base con main es 204; el branch solo agrega 205/206/207). No toca columnas, tablas ni nada del código nuevo de MB-4.
- **Nota operativa (no bloqueante):** `db push` hoy arrastra 205 y 206. Auditadas: 205 = columna `profiles.argos_voice` con DO $$ IF NOT EXISTS (aditiva, el cliente en prod no la lee); 206 = 3 filas en `proton_action_costs` con ON CONFLICT DO NOTHING (aditivas, `voice_turn`/`voice_tts`/`voice_stt` no los usa nadie hasta que se deployeen las edge functions nuevas). Las tres pueden aplicarse hoy sin el merge.

---

## PRIORIDAD 2 — M1: derivación server-side de la idempotency key

### 2.a La key del body se ignora de verdad ✅
- **argos-voice** (`index.ts:248-265`): única referencia a `idempotency_key` es la derivada (`userId:requestType:SHA-256(bucket|payload)[:32hex]`). `body.idempotency_key` ya no se lee en ningún punto del archivo.
- **argos-proxy** (`index.ts:503-515`): `economyIdemKey` es 100% server-derived; `body.idempotency_key` solo sobrevive en el evento SSE `start` (:570).
- Payload hasheado correcto: TTS = `voice|text`, STT = `audio_base64`, proxy = `requestType|JSON(messages)`. El prefijo `userId:` mata cualquier colisión cross-user aunque el índice de `proton_transactions` sea global. 128 bits de hash → colisión accidental despreciable.

### 2.b Borde del bucket de 10 min — doble cobro posible pero MARGINAL y en la dirección correcta ✅
El bucket es de reloj fijo (`floor(Date.now()/600000)`), no una ventana relativa al primer request. Un retry legítimo que cruza la frontera del bucket (p.ej. request a las hh:09:59, retry a las hh:10:01) obtiene otra key → **cobra dos veces**. Probabilidad ≈ (gap del retry)/600s — un retry de 2s cae en frontera ~0.3% de las veces. Es aceptable: el error va hacia COBRAR de más ocasionalmente (H+ internos, montos chicos), nunca hacia regalar servicio. Un cliente no puede explotarlo a su favor.

### 2.c Exclusión de `system` en el hash del proxy — no reabre nada que el bucket no permita ya ✅
`system` sí es client-supplied (body:385 → Anthropic :554/:643). Dentro del bucket, mismos `messages`+`requestType` con `system` variado → `idempotent:true` → llamada a Claude sin cobro. **PERO**: replayar el payload idéntico sin tocar `system` ya produce lo mismo — Claude es no-determinista, cada replay da respuesta nueva. Es decir: la ventana de 10 min *por diseño* permite N llamadas por 1 cobro para el mismo payload; variar `system` no agrega superficie económica sobre eso. El tope real es el rate limit diario del proxy, que se cuenta ANTES del cobro y cuenta también las llamadas idempotentes. La razón documentada para excluir `system` (el retry stream→no-stream lo reconstruye con contexto volátil — hora, stats) es legítima: incluirlo rompería la idempotencia del retry real.

### 2.d Echo en SSE `start` = solo cosmético ✅
`:570` — `idempotency_key: idempotency_key ?? null` va al evento `start` para compat de UI. No participa en cobro, refund (:345 usa `economyIdemKey`) ni logging de economía. Confirmado por grep: `body.idempotency_key` no tiene ningún otro uso.

### Q5 — ¿La ventana deja replay rentable? Acotado y NO peor que lo ya aceptado ✅
Un cliente modificado puede repetir el MISMO payload dentro del bucket: paga 1 vez (5 H+ chunk TTS / 15 H+ STT / costo chat) y las repeticiones no debitan H+, aunque cada una sí quema provider (ElevenLabs/Gemini/Anthropic — costo USD de ATP). Techo real:
- Cada llamada (idempotente o no) **sí inserta en `argos_logs` y sí cuenta contra el rate limit** (voice: TTS 1200/día, STT 200/día; proxy: límite por tier, contado al inicio).
- Requiere cuenta autenticada (B1) — no es anónimo.
- El burn máximo de provider por cuenta/día es exactamente el mismo que ANTES de M1 (el rate limit siempre fue el techo); M1 solo cierra el regalo de H+ ilimitado. Las grietas conocidas del rate limit (count-then-act, fail-open) ya quedaron registradas como 🟡 aceptadas en la re-auditoría — sin cambio de postura.

**Conclusión M1: cerrado correctamente. El replay económico infinito ya no existe; lo que queda está acotado por el rate limit y es deuda ya documentada.**

---

## PRIORIDAD 3 — Menores

### M3 — Refund por transcripción vacía: el SERVER decide ✅
`argos-voice/index.ts` (bloque post-provider): `sttEmpty` se calcula sobre `resp.clone().json().text` donde `resp` es la respuesta que la propia función construyó desde el JSON de Gemini (`handleStt` → `json({ text })`). El cliente no participa en la decisión — no puede fingir vacío. Y aunque provoque vacíos reales (mandar silencio), el refund es exactamente `debitedCost` → neto cero H+, sin minteo posible (`award_protons` es service_role-only desde 091). El único costo es provider, acotado por STT 200/día. `error_message: "empty_transcript"` queda en telemetría. Correcto.

### M4 — AbortController cancela TTS en vuelo ✅
`voice-conversation.ts:70-76,138`: un `AbortController` por turno; `abort()` marca `aborted`, aborta la señal y para playback. `argos-tts.ts:73` pasa `signal` al fetch. Test de regresión (`voice-conversation.test.ts` — "M4: el barge-in aborta la síntesis TTS en vuelo") verifica que la señal llega abortada al synth en vuelo y que el turno termina. `argos-voice-service.ts:47` (preview de voz) llama sin `opts` — el parámetro es opcional, compila y no necesita abort. Correcto.

### M5 — Persistencia de turnos de voz, roles intactos ✅
`app/argos-chat.tsx` `onTurnComplete`: construye `next` con `{role:'user', content:userText}` + `{role:'assistant', content:argosText}` — roles correctos, mismo shape que el flujo de texto. Filtra `!m.degraded` antes de `saveConversation` — **B2 sigue intacto** (los turnos degraded no se persisten ni contaminan historial). Reusa `conversationId` y lo setea del retorno — no fragmenta la conversación entre voz y texto.
- 🟡 **Nota menor (no bloqueante):** el callback captura `messages` del render (antes era `setMessages(prev => ...)`). Si algún día un turno de voz pudiera completarse en paralelo con otra mutación de `messages` sin re-render intermedio, se perdería esa mutación. Hoy no hay ruta para eso (el overlay de voz es modal, los turnos son secuenciales y cada `setMessages` re-renderiza y refresca el prop). Vigilarlo si el overlay deja de ser exclusivo.

### M6 — clipId con length ✅
`argos-tts.ts:clipId`: `hash31(text).toString(36) + '-' + text.length`. Colisión de cache ahora exige hash de 32 bits Y longitud iguales. Suficiente para un cache de clips locales.

### Regresiones / secretos / imports ✅
- Delta exacto = 2 commits sobre el estado ya auditado (`348f923`) — nada más cambió.
- Sin secretos en el diff (scan de api keys/tokens/JWT: solo referencias a `Deno.env` y comentarios). El fix extra de no ecoar `detail` del provider al cliente (URL de Gemini con key en query string) es una mejora de seguridad neta.
- Imports verificados: `saveConversation` ya estaba importado en argos-chat; `synthesizeSpeech` con `opts` opcional no rompe al caller de preview. Test viejo `argos-idempotency.test.ts` sigue siendo válido (testea el transporte client-side de la key, que sigue viajando en el body — ahora informativa; el server la ignora para cobro).
- El commit reporta suite 1891 verdes + tsc 0 errores. Nota de método: lancé `tsc --noEmit` en el workspace pero sobre el mount de red no terminó en tiempo razonable — lo que valida tipos aquí es la revisión línea por línea del delta (4 archivos TS, firmas compatibles, imports presentes) + la corrida de tsc que el propio commit declara. La regla #8 (tsc antes de push) aplica igual antes del merge.

---

## Resumen ejecutivo
| Ítem | Estado |
|---|---|
| M1 key server-side (voice + proxy) | ✅ Cerrado |
| M2 / migración 207 | ✅ Correcta, completa, idempotente, independiente |
| M3 refund STT vacío | ✅ Server decide, sin farming posible |
| M4 abort TTS en vuelo + test | ✅ |
| M5 persistencia voz (roles/B2) | ✅ (1 nota menor de closure, no bloqueante) |
| M6 clipId + length | ✅ |
| Regresiones / secretos / imports | ✅ Limpio |

**MERGE: ✅ APTO. · 207 segura para aplicar YA: ✅ SÍ** (db push arrastra 205+206 — también seguras hoy).
