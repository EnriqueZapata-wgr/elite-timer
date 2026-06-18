# COWORK REPORT — Sprint OVERNIGHT 2: Labs PDFs grandes bulletproof

**Branch:** `feat/labs-pdfs-grandes` · **Estado:** push, NO merge, NO OTA · **tsc:** 0 errores · **tests:** 465 pasan (445 previos + 20 nuevos)

## Problema raíz
PDFs > ~500KB revientan el cap de 60s de la Edge Function. UNILABS (254KB) funciona; un PDF de 1.3MB hace timeout con `input_tokens=0`. El parser corría EN EL CLIENTE vía `argos-proxy`, atado al request → cap de 60s. La compresión-cliente fue rechazada ("que jale bien, sin workarounds"): el fix real es sacar el LLM del request y hacerlo **async server-side**.

## Arquitectura (3 capas)
```
Cliente sube PDF (cualquier tamaño)
  → Capa 4: gating si >2MB (compresión PDF→JPG)        [INERTE — ver flag #1]
  → uploadLabFile → Storage + INSERT lab_uploads
  → enqueueLabWorker → status='pending'                 [solo si flag #2 ON]
       └─ trigger 076 (pg_net) → lab-parser-worker
            → Capa 3: split si >5 págs en chunks de 3 (pdf-lib)
            → chunks EN PARALELO (Promise.allSettled, 1 call Anthropic c/u)
            → Capa 9: EdgeRuntime.waitUntil (sin cap de 60s)
            → merge (1ª ocurrencia gana) → UPDATE 'extracted'/'failed'
  → Supabase Realtime → banner del cliente se actualiza
  → tap "Revisar" → loadReviewFromDb (reconstruye desde extracted_data)
```
El cliente **ya no espera al LLM**.

## Antes / Después por capa

### Capa 4 — Compresión cliente PDF→JPG
- **Antes:** no existía.
- **Después:** `src/services/lab-compressor.ts` — `needsCompression()` (gating PDF >2MB) + `compressLabFile()`.
- **Honestidad:** la conversión real PDF→JPG necesita un **renderer nativo** (react-native-pdf / pdf.js+canvas; `expo-image-manipulator` NO rasteriza PDFs). Ninguno está en deps y el sprint prohíbe deps nativas nuevas. Por eso el gating es correcto pero la compresión cae a "no comprimido" (sube el original). **No es bloqueante**: el worker + splitting resuelven el PDF grande sin compresión cliente. Wired en `my-health.tsx` solo como breadcrumb. → **FLAG #1**.

### Capa 3 — Splitting en chunks paralelos
- **Antes:** un solo call con el PDF entero → timeout.
- **Después:** `src/services/lab-pdf-splitter.ts` (math pura testeable: `planChunks`/`shouldSplit`) + `src/services/lab-chunked-parser.ts` (`mergeChunkResults`). El split de bytes real vive en el worker (pdf-lib vía esm.sh, Deno). Chunks de 3 páginas, umbral >5.
- **Merge (doctrina):** 1ª ocurrencia gana (la página 1 suele traer los totales), válido le gana a no-válido, errores parciales no tumban el resultado (`Promise.allSettled`).

### Capa 9 — Worker server-side
- **Antes:** no existía; el LLM corría en el cliente atado al request.
- **Después:** `supabase/functions/lab-parser-worker/index.ts`. Responde 202 al instante y procesa con `EdgeRuntime.waitUntil()` (sin cap de 60s). Idempotente (no reprocesa `extracted`/`confirmed`). Ante error → `failed` + `error_message`. Llama Anthropic directo (Sonnet 4.6, sin beta header de PDFs — ya es GA; el beta inválido era la causa del `input_tokens=0`).
- **Migración:** `supabase/migrations/076_lab_uploads_async_worker.sql` — amplía el enum de status (+`pending`,`confirmed`,`cancelled`), `pg_net` + función `trigger_lab_parser_worker` + trigger `on_lab_upload_pending`. **NO ejecutada** (regla #12).

## Cómo el cliente reconstruye la revisión desde `extracted_data`
El worker guarda `extracted_data = {values:{key:{value,unit}}, other_values, lab_name, lab_date}`. El cliente NO re-procesa: `reconstructReviewFromExtractedData()` pasa eso por el **mismo** pipeline del flujo síncrono — `normalizeParserValues()` (acepta el shape objeto) → `processParserItems()` (conversión de unidades + derivados + validación clínica). Resultado: `LabReviewPayload` idéntico venga del worker o del cliente. `lab-confirmation.tsx` usa `loadReviewFromDb()` como fallback cuando el store en memoria está vacío (típico tras cerrar/reabrir la app con el worker async).

## Decisiones (overnight, conservadoras)
1. **Worker llama Anthropic directo, no vía `argos-proxy`** — el proxy hace logging/circuit-breaker pero el worker corre server-side con su propia API key; evita una dependencia extra en el path crítico. *Trade-off:* los chunks no quedan en `argos_logs`. Reconsiderar si se quiere telemetría por-chunk.
2. **Merge duplicado en el worker** (no puede importar `src/`). Documentado como intencional; misma doctrina que `lab-chunked-parser.ts`.
3. **Split de bytes en el worker, math pura en el cliente** — `planChunks` testeable en vitest; pdf-lib solo en Deno.
4. **Enum status ampliado en 076** — el cliente ya escribía `'pending'` (estado local del reducer) pero el CHECK de la tabla (018) solo permitía 4 valores; el flujo async lo necesita en DB.

## FLAGS (acción de Enrique)
- **FLAG #1 — Compresión cliente INERTE.** `lab-compressor.ts` gatea pero no comprime (sin renderer nativo). No bloqueante: el worker splitea. Para activar compresión real haría falta una dep nativa (fuera de scope) o un edge function `pdf-to-jpg`.
- **FLAG #2 — `LAB_ASYNC_WORKER_ENABLED = false`** (en `src/services/lab-service.ts`). **OFF por defecto**: el cliente sigue extrayendo en línea (flujo actual intacto). Encender SOLO cuando estén los 3:
  1. Edge Function `lab-parser-worker` desplegada (`supabase functions deploy lab-parser-worker`)
  2. Migración 076 corrida en SQL Editor
  3. GUC seteado: `app.settings.supabase_url` + `app.settings.service_role_key` (o hardcodear la URL en la función)
  - Si se enciende sin (1)/(2)/(3), los uploads quedarían en `'pending'` sin procesar → por eso default OFF y se enciende a mano tras validar backend.

## Orden de deploy (importa)
1. `supabase functions deploy lab-parser-worker` + secret `ANTHROPIC_API_KEY`.
2. Correr `076` en SQL Editor.
3. Setear GUC (`supabase_url`, `service_role_key`).
4. Smoke test (abajo).
5. Recién entonces flip `LAB_ASYNC_WORKER_ENABLED = true` + OTA.

## Smoke test (post-deploy)
1. PDF chico (1-2 págs): sube → 'pending' → 'extracted' en segundos → "Revisar" muestra valores.
2. PDF grande (>5 págs, >1.3MB): sube → worker splitea → chunks en paralelo → 'extracted' SIN timeout. (Este es el caso que antes reventaba.)
3. PDF basura/ilegible: → 'failed' con `error_message`, botones Reintentar / Capturar manual.
4. Cerrar app durante 'processing' → reabrir → banner se reanuda vía Realtime; al terminar, "Revisar" carga vía `loadReviewFromDb`.
5. Imagen (foto de lab): sigue por el flujo de imagen (1 chunk), sin regresión.

## Archivos
**Nuevos:** `lab-pdf-splitter.ts`, `lab-chunked-parser.ts`, `lab-compressor.ts` (+ 3 tests, 20 casos) · `supabase/functions/lab-parser-worker/index.ts` · `supabase/migrations/076_lab_uploads_async_worker.sql`
**Modificados:** `lab-service.ts` (flag, `enqueueLabWorker`, `loadReviewFromDb`, `reconstructReviewFromExtractedData`) · `useLabProcessing.tsx` (branch worker en `runExtraction`) · `lab-confirmation.tsx` (fallback `loadReviewFromDb`) · `my-health.tsx` (gating Capa 4)

## NO testeado en runtime aquí
El worker es Deno (no hay runtime local) y pg_net/EdgeRuntime solo existen en Supabase. Validar en deploy con el smoke test. La math pura (split plan, merge, gating) SÍ está cubierta por vitest.
