# COWORK_TASK — Sprint OVERNIGHT 2: Labs PDFs grandes BULLETPROOF

**Origen:** decisiones Enrique 2026-06-18. El sprint Overnight 1 (Bulletproof v1) resolvió 9 de 10 bugs. Queda 1 crítico: **PDFs >500KB exceden el cap 60s del Edge Function**. UNILABS 254KB funciona perfecto. PDF 1.3MB timeout consistente con `input_tokens=0`. Causa raíz: física del flow inline (base64 + Edge Function 60s cap). Workaround manual (comprimir cliente) descartado por Enrique — "no workarounds, que jale bien".

**Branch:** `feat/labs-pdfs-grandes` desde `main`.
**Estimado:** 8-10h CC overnight.
**SQL:** ⚠️ 2 migraciones (cola de jobs + queue triggers).
**Deploy:** ❌ NO merge, NO OTA — Enrique valida en la mañana.

**Filosofía:** cero compromiso. Cualquier PDF razonable (<20MB, <50 páginas) debe procesarse de forma bulletproof. Si Anthropic timeout 1 chunk, los demás continúan. Si app se mata, el worker server-side termina. Si el usuario regresa, el banner refleja el estado real.

**OVERNIGHT MODE:** Enrique NO disponible para preguntas. Si encuentras decisión bloqueante:
1. Toma opción más conservadora (bulletproof)
2. Documenta en COWORK_REPORT.md como flag con justificación
3. Continúa, NO te bloquees

---

# ARQUITECTURA GENERAL

```
Usuario sube PDF (cualquier tamaño)
   ↓
Capa 4: COMPRESIÓN CLIENTE — si >2MB, convierte páginas a JPG (calidad 80%)
   ↓
Upload a Storage + INSERT lab_uploads {status: 'pending'}
   ↓
Database webhook → trigger Edge Function `lab-parser-worker` (server-side)
   ↓
Capa 3: SPLITTING — si PDF >5 páginas, split en chunks de 3 páginas
   ↓
Procesar chunks en PARALELO (cada uno una llamada Anthropic)
   ↓
Capa 9: WORKER SERVER-SIDE — corre con EdgeRuntime.waitUntil() (sin cap 60s)
   ↓
Mergear resultados de chunks → consolidar biomarcadores
   ↓
UPDATE lab_uploads {status: 'extracted', extracted_data}
   ↓
Supabase Realtime emite → cliente recibe en cualquier pantalla
   ↓
Banner se transforma: verde "Lab listo ✅" → tap → confirmación
```

**Pieza clave:** el cliente YA NO espera la respuesta del LLM. Sube el archivo + sale. El worker server-side corre asíncrono. Cliente recibe notificación in-app cuando termina (via Realtime). Funciona aunque mate la app.

---

# CAPA 4 — Compresión cliente (2-3h)

## Path: `src/services/lab-compressor.ts`

**Cuándo aplica:**
- PDF + tamaño > 2MB → comprime
- PDF + tamaño ≤ 2MB → no toca
- Imágenes → ya están comprimidas, no toca

**Cómo:**

Usa `expo-file-system` + `expo-image-manipulator` para convertir cada página de PDF a JPG comprimido. Si `react-native-pdf-lib` o `pdf-lib` están disponibles, mejor. Si no, fallback con `pdf-poppler` server-side (Edge Function dedicada de compresión).

```typescript
type CompressionResult =
  | { compressed: false; reason: string; data: { base64: string; type: 'pdf' | 'image'; mimeType: string } }
  | { compressed: true; pages: Array<{ base64: string; mimeType: string }>; originalSizeBytes: number; compressedSizeBytes: number };

export async function compressLabFile(
  base64: string,
  fileType: 'pdf' | 'image',
  fileSize: number,
): Promise<CompressionResult> {
  const MB = 1024 * 1024;
  
  // No comprimir si chico o imagen
  if (fileType === 'image' || fileSize <= 2 * MB) {
    return { compressed: false, reason: 'No requiere compresión', data: { base64, type: fileType, mimeType: fileType === 'pdf' ? 'application/pdf' : 'image/jpeg' } };
  }
  
  // PDF >2MB: convertir cada página a JPG 80% calidad
  try {
    const pages = await convertPdfPagesToJpgs(base64, { quality: 0.8, maxWidth: 1600 });
    const compressedSize = pages.reduce((sum, p) => sum + (p.base64.length * 0.75), 0);
    return { compressed: true, pages, originalSizeBytes: fileSize, compressedSizeBytes: compressedSize };
  } catch (e) {
    logWarn('[compressor] PDF→JPG falló, subiendo original:', e);
    return { compressed: false, reason: 'Compresión falló, fallback PDF original', data: { base64, type: fileType, mimeType: 'application/pdf' } };
  }
}

async function convertPdfPagesToJpgs(
  base64: string,
  opts: { quality: number; maxWidth: number },
): Promise<Array<{ base64: string; mimeType: string }>> {
  // Implementación con react-native-pdf-lib o expo-document-picker
  // Si no hay librería disponible en RN: hacer llamada a Edge Function `pdf-to-jpg`
  // que use pdf-lib (Deno) para hacer la conversión server-side.
  
  // Para CC: investigar qué librería está en deps. Si nada sirve,
  // crear Edge Function `pdf-to-jpg` con pdf-lib y llamarla.
  // ...
}
```

**Fallback:** si compresión falla → subir PDF original (deja que Capa 3 splitting lo maneje).

**Tests:**
- PDF 1MB → no comprime (`compressed: false`)
- PDF 5MB → comprime, retorna array de pages JPG
- Imagen 5MB → no comprime
- PDF corrupto → fallback graceful

---

# CAPA 3 — Splitting PDFs grandes (3-4h)

## Path: `src/services/lab-pdf-splitter.ts`

**Cuándo aplica:**
- PDF (sin comprimir) >5 páginas → split en chunks de 3 páginas
- Compresión Capa 4 ya devolvió JPGs → cada JPG va como chunk separado
- PDF ≤5 páginas → no split, va como 1 chunk

**Cómo:**

```typescript
type Chunk = {
  index: number;
  pageRange: [number, number];      // ej [1, 3]
  base64: string;
  mimeType: string;
  type: 'document' | 'image';
};

export async function splitPdfIntoChunks(
  base64: string,
  pageCount: number,
  pagesPerChunk: number = 3,
): Promise<Chunk[]> {
  // Usa pdf-lib (Deno-compatible) o react-native-pdf-lib
  // Cada chunk es un nuevo PDF con solo N páginas
  // Codifica cada chunk como base64
  // Retorna array ordenado
}
```

## Procesamiento paralelo de chunks

Donde el código actual hace 1 llamada al LLM, ahora hace N llamadas en paralelo:

```typescript
// En lab-service.ts o nuevo lab-chunked-parser.ts
async function extractLabValuesFromChunks(uploadId: string, chunks: Chunk[]): Promise<MergedResult> {
  // Procesa cada chunk en paralelo. Si uno falla, los demás continúan.
  const results = await Promise.allSettled(
    chunks.map((chunk, i) => extractFromSingleChunk(uploadId, chunk, i)),
  );
  
  // Mergear resultados
  const mergedValues: Record<string, ValueWithSource> = {};
  const errors: Array<{ chunkIndex: number; reason: string }> = [];
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'rejected') {
      errors.push({ chunkIndex: i, reason: String(r.reason) });
      continue;
    }
    const data = r.value;
    
    // Para cada biomarker extraído de este chunk, decidir si lo guardamos
    for (const [key, value] of Object.entries(data.values ?? {})) {
      if (!mergedValues[key]) {
        mergedValues[key] = { ...value, chunkIndex: i };
      } else {
        // Duplicado entre chunks. Resolver:
        // 1. Si ambos passedValidation → usar el del chunk más temprano (1ra página suele ser totales)
        // 2. Si uno falló validación → usar el válido
        // 3. Si ambos fallaron → usar el del primer chunk (más probable correcto)
        const existing = mergedValues[key];
        const incoming = { ...value, chunkIndex: i };
        if (incoming.passedValidation && !existing.passedValidation) {
          mergedValues[key] = incoming;
        }
        // Si ambos válidos: dejar el primero (ya no se sobrescribe)
      }
    }
  }
  
  return {
    values: mergedValues,
    otherValues: results.flatMap((r) => r.status === 'fulfilled' ? r.value.other_values ?? [] : []),
    labName: results.find((r) => r.status === 'fulfilled' && (r.value as any).lab_name)?.value?.lab_name ?? null,
    labDate: results.find((r) => r.status === 'fulfilled' && (r.value as any).lab_date)?.value?.lab_date ?? null,
    errors,
    successCount: results.filter((r) => r.status === 'fulfilled').length,
    totalChunks: chunks.length,
  };
}
```

**Doctrina merge:**
- Misma biomarker en 2 chunks → primera ocurrencia (página 1 suele tener totales)
- Validado vs no validado → siempre validado
- Errores parciales OK: si 4 de 5 chunks responden, sigue válido
- Si TODOS los chunks fallan → marca como `failed`

**Tests:**
- Split PDF de 6 páginas → 2 chunks de 3
- Split PDF de 10 páginas → 4 chunks (3+3+3+1)
- Merge con duplicados → primera ocurrencia
- 1 chunk falla, 3 OK → resultado parcial válido

---

# CAPA 9 — Worker server-side sin cap 60s (3-4h)

## Por qué este es el verdadero unlock

Hoy: cliente espera respuesta del LLM dentro del Edge Function (60s cap).
Mañana: cliente sube archivo → upload se marca `pending` → DATABASE WEBHOOK dispara Edge Function `lab-parser-worker` → ESA Edge Function corre con `EdgeRuntime.waitUntil()` (extiende lifetime hasta 150s+) → cliente NO espera, queda libre.

**El cliente queda libre apenas sube el archivo.** El worker corre asíncrono server-side.

## Migración SQL — Database Webhook trigger

`supabase/migrations/076_lab_uploads_async_worker.sql`:

```sql
-- Función que dispara cuando un nuevo lab_uploads queda 'pending'
-- Llama el Edge Function vía pg_net (HTTP request desde la DB)
CREATE OR REPLACE FUNCTION trigger_lab_parser_worker()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo dispara si pasa de cualquier estado a 'pending' Y file_url no es null
  IF NEW.status = 'pending' AND NEW.file_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/lab-parser-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('uploadId', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger AFTER INSERT y AFTER UPDATE cuando pasa a 'pending'
DROP TRIGGER IF EXISTS lab_uploads_async_worker_trigger ON lab_uploads;
CREATE TRIGGER lab_uploads_async_worker_trigger
  AFTER INSERT OR UPDATE OF status ON lab_uploads
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_lab_parser_worker();
```

**Pre-requisito:** habilitar `pg_net` extension. Si ya está habilitada, skip. Si no, agregar:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Configuración:** la URL del Edge Function se hardcodea en la función. CC: verificar que el `project_ref` es `itqkfozqvpwikogggqng`. Y necesitamos exponer el `service_role_key` para que la función pueda llamar — usar `current_setting('app.settings.service_role_key', true)` o un secret de pg_net.

**Mejor approach:** usar Database Webhook UI de Supabase (Settings → Database → Webhooks). CC: crear archivo .sql con instrucciones para que Enrique lo configure en la UI si MCP no permite crear webhooks programáticamente.

## Edge Function `lab-parser-worker`

`supabase/functions/lab-parser-worker/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

serve(async (req) => {
  const { uploadId } = await req.json();
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  
  // Edge Runtime: extiende lifetime para correr tarea en background
  EdgeRuntime.waitUntil(processLabUpload(supabase, uploadId));
  
  // Responde inmediato al webhook (no espera al procesamiento)
  return new Response(JSON.stringify({ accepted: true, uploadId }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
});

async function processLabUpload(supabase: any, uploadId: string) {
  try {
    // 1. Marca como processing
    await supabase.from('lab_uploads').update({ status: 'processing' }).eq('id', uploadId);
    
    // 2. Lee el upload
    const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
    
    // 3. Descarga archivo
    const fileRes = await fetch(upload.file_url);
    const blob = await fileRes.blob();
    const buffer = await blob.arrayBuffer();
    
    // 4. Capa 3: split en chunks si aplica
    const chunks = upload.file_type === 'pdf'
      ? await splitPdfIntoChunks(buffer, 3) // chunks de 3 páginas
      : [{ data: buffer, type: 'image' }];
    
    // 5. Procesar chunks en paralelo
    const results = await Promise.allSettled(
      chunks.map((chunk, i) => callAnthropicForChunk(chunk, i)),
    );
    
    // 6. Merge results
    const merged = mergeChunkResults(results);
    
    // 7. Update DB
    if (merged.values.length === 0 && merged.errors.length > 0) {
      await supabase.from('lab_uploads').update({
        status: 'failed',
        error_message: `Todos los chunks fallaron: ${merged.errors.map(e => e.reason).join('; ')}`,
      }).eq('id', uploadId);
    } else {
      await supabase.from('lab_uploads').update({
        status: 'extracted',
        extracted_data: merged,
        ai_raw_response: JSON.stringify(merged),
      }).eq('id', uploadId);
    }
  } catch (e: any) {
    await supabase.from('lab_uploads').update({
      status: 'failed',
      error_message: `Worker error: ${e.message}`,
    }).eq('id', uploadId);
  }
}
```

## Refactor `src/services/lab-service.ts`

`extractLabValuesForReview` cambia:

**ANTES (síncrono):**
```typescript
async function extractLabValuesForReview(uploadId: string) {
  // ... llama callAnthropic, espera respuesta, parsea, retorna review
}
```

**DESPUÉS (async via worker):**
```typescript
async function extractLabValuesForReview(uploadId: string) {
  // Solo marca como pending. El Database Webhook dispara el worker.
  // El cliente NO espera la respuesta. Se entera via Realtime cuando el worker termina.
  await supabase.from('lab_uploads').update({ status: 'pending' }).eq('id', uploadId);
  
  // Retorna inmediato. El sheet ya está montado escuchando Realtime.
  // Cuando lab_uploads.status pase a 'extracted', el banner se actualiza.
  return { uploadId, queued: true };
}

// Nueva función para cargar review desde DB cuando el banner queda en estado 'extracted'
async function loadReviewFromDb(uploadId: string): Promise<LabReviewPayload> {
  const { data: upload } = await supabase.from('lab_uploads').select('*').eq('id', uploadId).single();
  if (!upload || !upload.extracted_data) throw new Error('Review no disponible');
  
  // Reconstruir el review desde extracted_data
  return reconstructReviewFromExtractedData(upload);
}
```

## Cambios en `useLabProcessing.ts`

Cuando el banner está en estado `extracted` y el usuario tap:
- Llama `loadReviewFromDb(uploadId)` para reconstruir el review
- Guarda en `lab-review-store`
- Navega a `/edad-atp/lab-confirmation?uploadId=...`

## Cambios en `app/my-health.tsx` `processUpload`

```typescript
async function processUpload(base64: string, fileType: 'image' | 'pdf', uploadType?: string) {
  // Capa 1: validación cliente (ya existe)
  const validation = await validateLabFile(...);
  if (!validation.ok) return;
  
  // Capa 4: compresión cliente si aplica
  const compressed = await compressLabFile(base64, fileType, fileSize);
  
  // Upload archivo (puede ser PDF original o JPGs comprimidos)
  const uploadId = compressed.compressed
    ? await uploadCompressedPages(compressed.pages, uploadType)  // genera 1 lab_uploads con JPGs
    : await uploadLabFile(compressed.data.base64, compressed.data.type, uploadType);
  
  // Mark as pending → trigger automático del worker via Database Webhook
  await supabase.from('lab_uploads').update({ status: 'pending' }).eq('id', uploadId);
  
  // Abrir sheet inmediatamente (Realtime se encargará de actualizar)
  labProcessing.openSheet(uploadId);
  
  // No await — return inmediato
}
```

---

# MIGRACIÓN SQL — 076

`supabase/migrations/076_lab_uploads_async_worker.sql`:

```sql
-- Habilitar pg_net si no está
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función que dispara el worker async
CREATE OR REPLACE FUNCTION trigger_lab_parser_worker()
RETURNS TRIGGER AS $$
DECLARE
  worker_url text;
  service_key text;
BEGIN
  -- TODO Enrique: configurar estos en vault o variables de Supabase
  worker_url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/lab-parser-worker';
  service_key := current_setting('app.settings.service_role_key', true);
  
  IF NEW.status = 'pending' AND NEW.file_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := worker_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, '')
      ),
      body := jsonb_build_object('uploadId', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lab_uploads_async_worker_trigger ON lab_uploads;
CREATE TRIGGER lab_uploads_async_worker_trigger
  AFTER INSERT OR UPDATE OF status ON lab_uploads
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_lab_parser_worker();
```

**Flag para Enrique:** el `current_setting('app.settings.service_role_key', true)` requiere que esté seteado en la DB. Si no funciona, usar un Database Webhook desde la UI de Supabase (Settings → Database → Webhooks) como alternativa.

---

# ENTREGABLE

## Tests obligatorios

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → 445/445 (existentes) + nuevos
- [ ] Tests nuevos:
  - `lab-pdf-splitter.test.ts`: split PDF 6 páginas en 2 chunks de 3, merge correcto
  - `lab-compressor.test.ts`: PDF >2MB se comprime, PDF chico no, fallback funciona
  - `lab-chunked-parser.test.ts`: merge de chunks, duplicados, errores parciales
  - Snapshot del flow Worker con mock de Anthropic

## Archivos a crear

```
src/services/lab-pdf-splitter.ts            ← split PDFs en chunks
src/services/lab-compressor.ts              ← compresión cliente PDF→JPG
src/services/lab-chunked-parser.ts          ← procesar chunks paralelos + merge
supabase/functions/lab-parser-worker/index.ts  ← worker server-side async
supabase/migrations/076_lab_uploads_async_worker.sql  ← migración trigger
```

## Archivos a modificar

```
app/my-health.tsx                ← processUpload integra compressor + worker async
src/services/lab-service.ts      ← extractLabValuesForReview marca pending, loadReviewFromDb nuevo
src/hooks/useLabProcessing.ts    ← cuando banner extracted, tap re-construye review
```

## COWORK_REPORT.md debe incluir

1. Antes/después de cada capa
2. Decisiones autónomas (con justificación)
3. Smoke test checklist para Enrique:
   - [ ] Subir PDF 1.3MB → se comprime a JPGs → worker procesa → banner verde
   - [ ] Subir PDF 10 páginas → split en chunks de 3 → procesados en paralelo → merge
   - [ ] Subir PDF de 1 página → no split, va directo
   - [ ] Subir PDF 20MB → compresión + split → worker tarda más pero termina
   - [ ] Matar app después de subir → al reabrir, banner refleja estado real (worker server-side termina)
   - [ ] Subir 3 PDFs simultáneos → 3 workers en paralelo, cada uno con su banner en la cola
4. Flags pendientes para Enrique post-merge
5. Migración 076 lista para correr (manual o vía Supabase CLI)
6. Cómo el cliente reconstruye el review desde `extracted_data` (importante para validar)

## Push pero NO merge, NO OTA

- Branch pusheado a `origin/feat/labs-pdfs-grandes`
- Enrique audita + valida + decide merge en la mañana
- Migración 076 ejecutada manualmente o via CLI

---

# RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. `npx tsc --noEmit` antes de cada commit
3. PowerShell 5.1 sin `&&`
4. NO tocar motor v2, parser v2, ARGOS chat, economía Protones
5. **NO push del worker server-side** sin que la migración 076 esté lista (orden importa)
6. **Reanimated puro** — NO native deps nuevas
7. Cumplir doctrina UX ELITE de Overnight 1

# STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- argos-proxy YA existe (NO tocar — usar como referencia)
- Supabase Edge Functions con Deno
- pg_net extension para HTTP desde DB
- EdgeRuntime.waitUntil() para background tasks
- pdf-lib en Deno (server-side) y pdf-lib o react-native-pdf-lib en cliente
- Anthropic API: Sonnet 4.6 con beta header para PDFs YA NO necesario (GA)

---

# DOCTRINA WORKER (no negociable)

- **Worker es idempotente**: si se ejecuta 2 veces para el mismo uploadId, no rompe data
- **Worker no rompe estado anterior**: si fallar mid-process, status revierte a `failed` con error_message claro
- **Worker emite Realtime SIEMPRE al final**: cliente recibe notificación
- **Anthropic con chunks**: cada chunk timeout no rompe los otros
- **PDF →JPG fallback**: si compresión falla, manda PDF original al worker (que aún puede splitting)

---

# ORDEN SUGERIDO DE TRABAJO

1. **PRIMERO leer:**
   - `src/services/lab-service.ts` (extractLabValuesForReview actual)
   - `supabase/functions/argos-proxy/index.ts` (cómo llama Anthropic)
   - `src/hooks/useLabProcessing.ts` (estado actual)
   - `app/my-health.tsx` (processUpload actual)

2. **Capa 4 compresión** (más simple, base limpia)
3. **Capa 3 splitting** + merge tests
4. **Migración 076** + Database webhook
5. **Edge Function `lab-parser-worker`** con EdgeRuntime.waitUntil
6. **Refactor `lab-service.ts`** para usar async pattern
7. **`useLabProcessing`** para reconstruir review desde DB
8. **Tests E2E completos**
9. **Commits incrementales** + push al final

Buena overnight 🌙
