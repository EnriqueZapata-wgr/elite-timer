# COWORK_TASK — Sprint OVERNIGHT: Labs Bulletproof v1 (UX async ELITE + blindaje frontend)

**Origen:** decisiones Enrique 2026-06-18. Después de bug raíz de PDFs (header beta) resuelto hoy, hay que blindar TODO el flujo de upload de labs porque es función crítica del producto. UX actual de spinner bloqueante es indigna. Apuntamos a experiencia ELITE estilo Spotify/Apple Music con uploads.

**Branch:** `feat/labs-bulletproof-v1` desde `main`.
**Estimado:** 8-10h CC overnight.
**SQL:** ❌ ninguna nueva (usamos `lab_uploads.status` existente).
**Deploy:** ❌ NO merge, NO OTA — Enrique valida en la mañana.

**Filosofía:** simple beats smart en UX, pero **cero compromiso** en robustez. Cada PDF que el usuario sube DEBE poder procesarse o tener una salida clara. Ningún archivo se pierde. Ningún proceso bloquea. Ningún error es opaco.

**OVERNIGHT MODE:** Enrique NO disponible para preguntas. Si encuentras decisión normalmente bloqueante:
1. Toma opción más conservadora (premium + bulletproof)
2. Documenta en COWORK_REPORT.md como flag con justificación
3. Continúa, NO te bloquees

---

# ARQUITECTURA GENERAL

```
Usuario tap "PDF/Cámara/Galería"
   ↓
Capa 1: VALIDACIÓN CLIENTE (tamaño, páginas, password) — si falla, no sube
   ↓
Upload a Supabase Storage + insert lab_uploads {status: 'pending'}
   ↓
<LabProcessingSheet> aparece desde abajo (animación ELITE)
   ↓
Background: extracción real corre
   ↓ (en paralelo)
Usuario puede: dejar sheet abierto, drag-down para minimizar, o seguir usando la app
   ↓
Si minimiza → <ProcessingMiniBanner> sticky abajo en TODAS las pantallas
   ↓
Edge Function argos-proxy responde (Anthropic Files API + reintento auto)
   ↓
DB update: lab_uploads.status = 'extracted' (o 'failed')
   ↓
Supabase Realtime emite evento → cliente recibe en cualquier pantalla
   ↓
Banner se transforma: verde "Lab listo ✅" / rojo "Error — reintentar"
   ↓
Tap → navega a /edad-atp/lab-confirmation con uploadId
```

---

# PARTE 1 — UX Async ELITE (4-5h)

## Componente A: `LabProcessingSheet` — Bottom Sheet expandido

**Path:** `src/components/labs/LabProcessingSheet.tsx`

**Implementación:** reanimated + gesture-handler (NO usar `@gorhom/bottom-sheet` — no está en deps, evitamos native dep nueva). Mismo patrón que el ARGOS sheet del sprint Paty (sí existe y funciona, búscalo como referencia).

**Snap points:**
- `0%` (cerrado)
- `35%` (mini-banner equivalent — pero esto se renderiza como `<ProcessingMiniBanner>` real, ver Componente B)
- `70%` (default abierto)
- `92%` (expandido lectura completa)

**Layout (cuando abierto al 70%):**

```
┌─────────────────────────────────────┐
│           ─────                     │  ← drag handle (tappable + drag)
│                                     │
│      🧪 [ProcessingOrbAnimation]    │  ← Componente C
│                                     │
│      ARGOS está analizando          │  ← title bold Fonts.bold FontSizes.lg
│      tu laboratorio                 │     Colors.textPrimary
│                                     │
│   📄 lab_1781749543676.pdf          │  ← filename Fonts.semiBold FontSizes.sm
│   10 páginas · 1.3 MB · ~15s elapsed│     Colors.textSecondary
│                                     │
│   ⠋ Procesando…                     │  ← spinner sutil + estado actual
│                                     │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━      │  ← progress bar indeterminada animada
│                                     │
│   Esto suele tardar 30-60 segundos. │  ← caption Colors.textMuted
│   Puedes deslizar para minimizar    │
│   y seguir usando la app.           │
│                                     │
└─────────────────────────────────────┘
```

**Estados visuales:**
1. **`processing`** — orb pulsante verde + progress bar indeterminada
2. **`extracted`** — orb se transforma en checkmark con animación + haptic.success + texto "Lab listo ✅" + botón "Revisar valores"
3. **`failed`** — orb se transforma en X roja + haptic.warning + texto "No pudimos leer el archivo" + botones "Reintentar" / "Capturar manualmente"

**Gestos:**
- Drag handle (top 44px area) → drag para cambiar snap point
- Drag down threshold > 30% → snap a `minimized` (sheet desaparece, mini-banner aparece)
- Tap fuera → snap a `minimized`
- Tap "X" en esquina superior derecha → confirma cancelación

**Doctrina técnica:**
- Usa `useSharedValue` + `useAnimatedStyle` para snap points
- `Gesture.Pan()` con `runOnJS` para callbacks
- Wrap en `GestureHandlerRootView` dentro del Modal (igual que ARGOS sheet)
- `statusBarTranslucent` true
- Backdrop con `Pressable` que cierra al tap

**Tiempo elapsed:** muestra los segundos transcurridos desde upload (`useEffect` con `setInterval` de 1s, cleanup en unmount).

---

## Componente B: `ProcessingMiniBanner` — Sticky bottom global

**Path:** `src/components/labs/ProcessingMiniBanner.tsx`

**Donde se renderiza:** `app/_layout.tsx` (root layout) — VISIBLE EN TODAS LAS PANTALLAS.

**Layout:**

```
┌─────────────────────────────────────────────┐
│ 🧪 Procesando lab… 15s          ⠋    ✕     │  ← estado 'processing'
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✅ Lab listo — Toca para revisar       ✕    │  ← estado 'extracted'
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ⚠️  Error — Reintentar / Captura manual     │  ← estado 'failed'
└─────────────────────────────────────────────┘
```

**Diseño:**
- Posición: `absolute bottom: tabBarHeight + safeAreaBottom + 8` (sobre el tab bar)
- Background: `Colors.surface` con sombra sutil
- Border-top: `1px Colors.neonGreen` con opacity 0.3 (cuando processing) / sólido cuando extracted / `SEMANTIC.error` cuando failed
- Border-radius: `Radius.md`
- Padding: `Spacing.sm horizontal`, `Spacing.xs vertical`
- Animación entrada: `FadeInUp.springify()` (reanimated)
- Animación salida: `FadeOutDown.springify()`
- Auto-dismiss en estado `extracted` después de 8s si no tap (Enrique pidió ELITE — no anti-feature)
- Tap → re-expande el sheet completo

**Subscribe a:** `useLabProcessing()` hook (ver más abajo)

**Si hay múltiples uploads procesándose simultáneamente:** muestra contador "Procesando 2 labs…" + tap re-expande el más reciente.

---

## Componente C: `ProcessingOrbAnimation` — animación reanimated

**Path:** `src/components/labs/ProcessingOrbAnimation.tsx`

**Reusable** — esta animación NO es solo para labs. También vivirá futuro para análisis genético, generación de plan ARGOS, etc.

**Implementación:** reanimated + svg (no Skia, mantenerlo simple).

**Estados:**

1. **`processing`:**
   - Orb central (círculo de 80x80) con gradient `Colors.neonGreen → transparent`
   - Pulsa scale 1.0 → 1.15 → 1.0 con duración 1.5s, loop infinito (`withRepeat(-1, true)`)
   - 3 partículas pequeñas (8x8) orbitando alrededor, rotación 360° cada 3s
   - Glow sutil con `shadowColor: Colors.neonGreen, shadowOpacity: 0.6, shadowRadius: 20`

2. **`extracted`:**
   - Orb deja de pulsar
   - Partículas se contraen al centro (200ms)
   - Checkmark verde aparece con `withSpring` damping 12
   - Color glow estable

3. **`failed`:**
   - Orb se torna rojo (`SEMANTIC.error`)
   - Partículas se dispersan
   - X roja aparece con `withSpring`

**Tamaños responsivos:**
- Default 120x120 (en sheet)
- Compact 32x32 (versión opcional para mini-banner si Enrique quiere — pero por simpleza Mini-Banner solo usa emoji + spinner texto)

**Haptic obligatorio:**
- Al entrar estado processing: `haptic.light()`
- Al entrar extracted: `haptic.success()`
- Al entrar failed: `haptic.warning()`

---

## Hook: `useLabProcessing` — estado central

**Path:** `src/hooks/useLabProcessing.ts`

**Responsabilidades:**
1. Suscribirse a Supabase Realtime para `lab_uploads` del usuario
2. Mantener estado de uploads actualmente en `pending` o `processing`
3. Exponer API para abrir el sheet, minimizar, cancelar
4. Detectar al startup uploads viejos en `processing` y reanudarlos visualmente

```typescript
type ProcessingUpload = {
  uploadId: string;
  fileName: string;
  fileSize: number; // bytes
  pageCount?: number;
  status: 'pending' | 'processing' | 'extracted' | 'failed';
  uploadedAt: string; // ISO
  elapsedSeconds: number;
  errorMessage?: string;
};

type ProcessingState = {
  activeUploads: ProcessingUpload[];        // los que están pending/processing
  recentlyFinished: ProcessingUpload[];     // los que pasaron a extracted/failed en los últimos 60s (para banner)
  sheetVisible: boolean;
  sheetSnapPoint: 'minimized' | 'half' | 'full';
};

function useLabProcessing() {
  const [state, setState] = useState<ProcessingState>(...);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`lab_uploads:user_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lab_uploads',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Update state based on payload
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [userId]);

  // Tick 1s para elapsedSeconds
  useEffect(() => {
    const id = setInterval(() => updateElapsed(), 1000);
    return () => clearInterval(id);
  }, []);

  // Detección startup
  useEffect(() => {
    // Query lab_uploads where status in ('pending', 'processing') and user_id = me
    // Si hay alguno > 5min sin update, reintentarlo (capa 8)
  }, []);

  return {
    ...state,
    openSheet: (uploadId) => setState(...),
    minimizeSheet: () => setState(...),
    expandSheet: (uploadId) => setState(...),
    cancelUpload: (uploadId) => { /* mark cancelled + delete */ },
    retryUpload: (uploadId) => { /* re-trigger extraction */ },
  };
}
```

---

## Integración con my-health.tsx

El flow actual:
```typescript
const processUpload = async (base64, fileType, type) => {
  setProcessing(true);
  const uploadId = await uploadLabFile(...);
  await runReviewFlow(uploadId); // <-- bloquea hasta terminar
  setProcessing(false);
};
```

Nuevo flow:
```typescript
const processUpload = async (base64, fileType, type) => {
  // Capa 1: validación cliente (ver PARTE 2)
  const validation = await validateLabFile(base64, fileType);
  if (!validation.ok) {
    setResult({ error: validation.error });
    return;
  }

  // Upload archivo a Storage + crea row en lab_uploads
  const uploadId = await uploadLabFile(base64, fileType, type);

  // Abre sheet INMEDIATAMENTE
  labProcessing.openSheet(uploadId);

  // Trigger extracción en background (no bloquea UI)
  extractLabValuesInBackground(uploadId);

  // No await — return inmediatamente
};

async function extractLabValuesInBackground(uploadId: string) {
  try {
    const review = await extractLabValuesForReview(uploadId);
    // Estado se actualizará via Realtime cuando el DB update se haga
    // En lab-service.ts extractLabValuesForReview ya updates status='extracted'
  } catch (err) {
    // Capa 2: reintento automático ya en lab-service.ts
    // Si falla 2x, lab_uploads.status='failed' + Realtime notifica
  }
}
```

**El sheet escucha el cambio de status vía useLabProcessing y se actualiza solo.**

---

# PARTE 2 — Validación cliente pre-upload (Capa 1, 30 min)

## Path: `src/utils/lab-file-validator.ts`

```typescript
type ValidationResult =
  | { ok: true; pageCount?: number }
  | { ok: false; error: string; severity: 'warn' | 'error' };

export async function validateLabFile(
  base64: string,
  fileType: 'image' | 'pdf',
  fileSize: number, // bytes
): Promise<ValidationResult> {
  const MB = 1024 * 1024;

  // HARD ERROR: > 20MB
  if (fileSize > 20 * MB) {
    return {
      ok: false,
      severity: 'error',
      error: 'Archivo muy grande (máx 20MB). Comprime tu PDF antes de subir.',
    };
  }

  // PDF-específico: verificar páginas y password
  if (fileType === 'pdf') {
    try {
      const pageCount = await countPdfPages(base64);

      // HARD ERROR: > 50 páginas
      if (pageCount > 50) {
        return {
          ok: false,
          severity: 'error',
          error: 'PDF muy largo (máx 50 páginas). Divide tu archivo.',
        };
      }

      // SOFT WARN: muestra alert pero permite continuar
      if (pageCount > 20) {
        const confirmed = await showWarnDialog(
          `PDF de ${pageCount} páginas`,
          `Puede tardar 1-2 minutos. ¿Continuar?`,
        );
        if (!confirmed) return { ok: false, severity: 'warn', error: 'cancelled' };
      }

      return { ok: true, pageCount };
    } catch (e: any) {
      // Probable PDF protegido con password
      if (/password|encrypted/i.test(e.message)) {
        return {
          ok: false,
          severity: 'error',
          error: 'PDF protegido con contraseña. Quita la protección y vuelve a intentar.',
        };
      }
      // Otros errores → permitir continuar (mejor procesar que bloquear)
      return { ok: true };
    }
  }

  // SOFT WARN imagen: > 8MB
  if (fileSize > 8 * MB) {
    return {
      ok: true, // permitir, solo info
      // ... mostrar info al usuario "imagen pesada, puede tardar"
    };
  }

  return { ok: true };
}

async function countPdfPages(base64: string): Promise<number> {
  // Usa pdf-lib si está en deps, si no implementa decoder simple
  // PDF object stream tiene "/Type /Pages" con "/Count <N>"
  // Estrategia simple: parsear el base64 → ascii, regex /\/Count\s+(\d+)/
  // No es bulletproof contra todos los PDFs pero cubre el 95%
}
```

**Verifica si `pdf-lib` está en deps:** `grep "pdf-lib" package.json`. Si no está, usa parser regex simple (suficiente para count pages).

**`showWarnDialog`:** wrapper de `Alert.alert` que devuelve `Promise<boolean>`. Lo usamos en otros lugares ya, reusa o crea.

---

# PARTE 3 — Reintento automático LLM (Capa 2, 20 min)

## Modificación en `src/services/lab-service.ts`

Hoy existe `withNetworkRetry` que reintenta solo errores de red. Hay que extenderlo para reintentar errores `529 overloaded` y `anthropic_timeout` también.

```typescript
function isRetriableError(err: any): boolean {
  if (err?.name === 'AbortError') return true;
  const msg = String(err?.message ?? err ?? '');
  return /network request failed|networkerror|failed to fetch|timeout|ARGOS_TIMEOUT|aborted|socket hang up|529|overloaded|anthropic_timeout|503/i.test(msg);
}

const PARSER_RETRY_DELAYS_MS = [3000, 8000]; // 1 reintento a 3s + 1 a 8s (total: 2 reintentos)

async function withSmartRetry<T>(fn: () => Promise<T>, label = 'lab-parser'): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= PARSER_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const canRetry = attempt < PARSER_RETRY_DELAYS_MS.length && isRetriableError(err);
      if (!canRetry) throw err;
      const delay = PARSER_RETRY_DELAYS_MS[attempt];
      logWarn(`[${label}] intento ${attempt + 1} falló (${err?.message}), reintentando en ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
```

Reemplaza `withNetworkRetry` por `withSmartRetry` en los 2 lugares donde se llama (extractLabValues y extractLabValuesForReview).

---

# PARTE 4 — Files API de Anthropic (Capa 5, 1-2h)

## Background: por qué Files API

Hoy mandamos el PDF como base64 inline en cada llamada. Eso:
- Re-uploads en cada reintento (desperdicia bandwidth)
- Latencia mayor (Anthropic re-procesa el archivo)
- Tope de tamaño bajo (32MB de body request)

Files API permite:
- Subir el PDF UNA vez al CDN de Anthropic
- Recibir `file_id`
- Referenciarlo por ID en mensajes
- Cache automático en lado de Anthropic
- 30% menos latencia típica

## Plan de implementación

### Refactor `supabase/functions/argos-proxy/index.ts`

Agregar dos nuevos endpoints:

**1. `POST /upload-file`** — sube un archivo a Anthropic Files API y devuelve `file_id`

```typescript
async function uploadFileToAnthropic(fileBuffer: ArrayBuffer, fileName: string, mimeType: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);

  const res = await fetch('https://api.anthropic.com/v1/files', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'files-api-2025-04-14', // verificar versión actual de beta
    },
    body: formData,
  });

  if (!res.ok) throw new Error(`anthropic_files_upload_failed: ${res.status}`);
  const data = await res.json();
  return data.id; // file_id
}
```

**2. Mensajes con file_id** — modifica el envío a Anthropic para soportar referencia por file_id

```typescript
// En lugar de:
{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: '...' } }

// Usar:
{ type: 'document', source: { type: 'file', file_id: 'file_abc123' } }
```

### Modificar `src/services/lab-service.ts`

Antes de llamar a `callAnthropic`, primero subir el PDF a Anthropic:

```typescript
async function extractLabValuesForReview(uploadId: string) {
  const upload = await getUpload(uploadId);
  
  // Marca processing
  await supabase.from('lab_uploads').update({ status: 'processing' }).eq('id', uploadId);

  // Obtiene file_id de Anthropic (cachea en lab_uploads.anthropic_file_id)
  let fileId = upload.anthropic_file_id;
  if (!fileId) {
    const fileRes = await fetch(upload.file_url);
    const fileBuffer = await fileRes.arrayBuffer();
    fileId = await uploadFileToAnthropic(fileBuffer, upload.file_name, mediaType);
    await supabase.from('lab_uploads').update({ anthropic_file_id: fileId }).eq('id', uploadId);
  }

  // Ahora llama Anthropic con file_id (sin base64)
  const result = await withSmartRetry(async () => {
    return callAnthropic(
      [{ role: 'user', content: [
        { type: 'document', source: { type: 'file', file_id: fileId } },
        { type: 'text', text: prompt },
      ]}],
      8000, undefined, undefined, meta,
    );
  });

  // Resto del flow igual
}
```

### Migración SQL chica (incluir en buzón)

```sql
-- supabase/migrations/<next>_lab_uploads_anthropic_file_id.sql
ALTER TABLE lab_uploads
ADD COLUMN IF NOT EXISTS anthropic_file_id TEXT;
```

**NO ejecutar la migración.** Deja el archivo `.sql` lista, Enrique la corre manual.

### Fallback al base64 inline

Si la subida a Files API falla, **fallback transparente al método base64 actual**. Capa de seguridad para no romper si Anthropic Files API tiene un downtime.

### Verificar nombre de beta header

El header `anthropic-beta: files-api-2025-04-14` puede haber cambiado en 2026. Verifica la doc actual de Anthropic. Si no encuentras → usa el más reciente que veas en https://docs.anthropic.com/en/api/files.

---

# PARTE 5 — Logging granular (Capa 6, 15 min)

## En `src/services/lab-service.ts`

Reemplaza el `console.warn` actual cuando JSON.parse falla por logging a Sentry con breadcrumbs ricos:

```typescript
import * as Sentry from '@sentry/react-native';

// En el catch del JSON.parse:
try {
  parsed = JSON.parse(jsonStr);
} catch (e) {
  Sentry.captureMessage('lab-parser JSON parse failed', {
    level: 'warning',
    contexts: {
      labParser: {
        uploadId,
        flow: 'v1', // o 'v2' según corresponda
        rawTextLength: rawText.length,
        rawTextPreview: rawText.substring(0, 800), // primeros 800 chars
        jsonStrLength: jsonStr.length,
        errorMessage: String(e),
      },
    },
  });
  throw new Error('No se pudo parsear la respuesta de IA');
}
```

**Cuando `parsed.values` está vacío:**

```typescript
if (Object.keys(parsed.values || {}).length === 0) {
  Sentry.captureMessage('lab-parser no biomarkers extracted', {
    level: 'warning',
    contexts: {
      labParser: {
        uploadId,
        parsed: JSON.stringify(parsed).substring(0, 1000),
      },
    },
  });
}
```

Esto permite diagnosticar exactamente qué responde el LLM cuando algo falla.

---

# PARTE 6 — Persistencia + captura manual desde fallido (Capa 7, 30 min)

## Cambios en my-health.tsx

En la sección "UPLOADS CON ERROR" (que ya existe), agregar para cada upload fallido:

**Hoy:** `↻ Reintentar` + `🗑 Eliminar`
**Después:** `↻ Reintentar` + `✏️ Capturar manual` + `🗑 Eliminar`

El botón "Capturar manual" navega a:
```typescript
router.push({
  pathname: '/edad-atp/biomarkers',
  params: {
    sourceUploadId: uploadId,
    sourceFileName: upload.file_name,
  },
});
```

## Cambios en `app/edad-atp/biomarkers.tsx` (pantalla de captura manual)

Si `sourceUploadId` viene en params:
- Mostrar arriba un banner: "Capturando desde: lab_xxx.pdf" + botón "Ver archivo"
- "Ver archivo" → abre el PDF en visor nativo (`Linking.openURL(file_url)`)
- Al guardar valores manualmente, marca el `lab_upload` como `confirmed` (no `failed`)
- Esto permite al usuario capturar a mano viendo su PDF

## DB sigue como está

No requiere cambios. `lab_uploads.status` ya tiene los valores necesarios.

---

# ENTREGABLE

## Tests obligatorios

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → 415/415 (existentes) + nuevos
- [ ] Tests nuevos mínimo:
  - `lab-file-validator.test.ts`: 5 casos (oversize, password, page count thresholds)
  - `use-lab-processing.test.ts`: 3 casos (subscription, state transitions, multi-upload)
  - `lab-service.test.ts`: caso de reintento (timeout → reintenta → success)
  - `lab-service.test.ts`: caso Files API (sube archivo → reusa fileId en 2do call)
  - Componentes `LabProcessingSheet` + `ProcessingMiniBanner`: render tests con/sin data

## Archivos a crear

```
src/components/labs/
  LabProcessingSheet.tsx
  ProcessingMiniBanner.tsx
  ProcessingOrbAnimation.tsx
  __tests__/
    LabProcessingSheet.test.tsx
    ProcessingMiniBanner.test.tsx

src/hooks/
  useLabProcessing.ts
  __tests__/
    useLabProcessing.test.ts

src/utils/
  lab-file-validator.ts
  __tests__/
    lab-file-validator.test.ts

supabase/migrations/
  <next>_lab_uploads_anthropic_file_id.sql  ← NO ejecutar, deja lista
```

## Archivos a modificar

```
app/_layout.tsx                              ← agregar <ProcessingMiniBanner />
app/my-health.tsx                            ← integrar con useLabProcessing + botón "Capturar manual"
app/edad-atp/biomarkers.tsx                  ← soportar sourceUploadId
src/services/lab-service.ts                  ← withSmartRetry + Files API + Sentry logging
supabase/functions/argos-proxy/index.ts      ← upload-file endpoint + soporte file_id en messages
```

## COWORK_REPORT.md debe incluir

1. **Antes/después por capa** (1, 2, 5, 6, 7, 8)
2. **Decisiones autónomas** que tomaste (con justificación)
3. **Smoke test checklist para Enrique:**
   - [ ] Subir PDF mediano (1-3 MB, 10 páginas) → sheet aparece, animación corre, termina exitoso, banner verde, tap → confirmación
   - [ ] Subir PDF grande (>20MB) → bloquea con mensaje claro pre-upload
   - [ ] Subir PDF protegido → bloquea con mensaje claro
   - [ ] Iniciar upload, navegar a HOY → mini-banner sigue visible abajo
   - [ ] Drag down sheet → minimiza a banner
   - [ ] Drag up banner → re-expande sheet
   - [ ] Subir lab y matar la app → al reabrir, banner muestra processing y se actualiza al terminar
   - [ ] Subir lab con conexión mala (apaga wifi después de 5s) → reintenta automático, si todo falla muestra error claro
   - [ ] Upload fallido → tap "Capturar manual" → abre pantalla de biomarcadores con file_name de referencia
   - [ ] Subir 2 labs al mismo tiempo → banner muestra "Procesando 2 labs"
4. **Flags pendientes** que requieren decisión de Enrique post-merge
5. **Migración SQL** lista para correr manual (file_id column)
6. **Files API beta header** que usaste (Anthropic la versionea)

## Push pero NO merge, NO OTA

- Branch pusheado a `origin/feat/labs-bulletproof-v1`
- Enrique audita + valida + decide merge en la mañana
- Migración SQL queda lista pero NO ejecutada

---

# RECORDATORIOS CRÍTICOS

1. **NUNCA reescribir archivos completos** → solo str_replace quirúrgico
2. **NUNCA usar `crypto.randomUUID`** → usar `generateUUID` helper
3. **Después de mutaciones a lab_uploads:** Supabase Realtime emite solo. NO emitir DeviceEventEmitter para esto (se duplica)
4. `npx tsc --noEmit` antes de cada commit
5. **PowerShell 5.1 sin `&&`** en comandos sugeridos para Enrique
6. **OTA por default** — pero NO en este sprint (Enrique decide cuándo)
7. NO tocar motor v2, parser AI v2, ARGOS chat sheet, edad-atp, electrones/protones
8. **Animaciones reanimated puro** — NO introducir `@gorhom/bottom-sheet` ni native dep nueva
9. **Sentry ya está integrado** — usa `@sentry/react-native` que ya está en deps
10. **Migración SQL NO la ejecutes** — déjala como archivo, Enrique la corre manual (regla #12 CLAUDE.md)
11. **Files API beta puede haber cambiado** — verifica versión vigente en docs.anthropic.com antes de hardcodear

---

# STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- `argos-proxy` Edge Function ya en uso (no romper)
- DeviceEventEmitter usado para `day_changed` y `electrons_changed` (NO lo usamos aquí)
- Supabase Realtime ya está activado en el cliente
- Sentry + PostHog activos
- `lab_uploads.status` enum: 'pending', 'processing', 'extracted', 'failed', 'confirmed', 'cancelled'

---

# ORDEN SUGERIDO DE TRABAJO

1. **PRIMERO leer el codebase relevante:**
   - `app/my-health.tsx` (flow actual de upload)
   - `src/services/lab-service.ts` (extractLabValuesForReview, withNetworkRetry)
   - `supabase/functions/argos-proxy/index.ts` (cómo se llama Anthropic hoy)
   - `app/argos-chat.tsx` (referencia del bottom sheet con reanimated del sprint Paty)
   - `app/_layout.tsx` (donde se monta el banner global)

2. **Capa 1 (validación)** + tests — base sólida antes de tocar UX

3. **Capa 2 (reintento)** + tests — protección antes de cambiar el flow

4. **Capa 5 (Files API)** + migración SQL — desbloquea robustez del backend

5. **Capa 6 (logging Sentry)** — para diagnosticar en tiempo real lo que pase

6. **PARTE 1 UX async** (sheet + mini-banner + orb + hook) — la pieza grande visible

7. **Capa 7 (captura manual desde fallido)** — cierra el flow de recovery

8. **Tests E2E + smoke checklist** — última pasada

9. **Commit incremental** por capa/componente. Push al final.

---

# DOCTRINA UX ELITE (no negociable)

- **Animaciones**: durations 200-400ms, springs damping 12-15, easing `Easing.bezier(0.4, 0, 0.2, 1)` por default
- **Haptic**: light en interacciones rápidas, medium en confirmaciones, success/warning en estados terminales
- **Colores**: brand palette (Constants/theme), NO hex sueltos. Único excepción: SVG gradients en el orb
- **Spacing**: Spacing.xs/sm/md/lg/xl, NO números mágicos sueltos
- **Typography**: Fonts.regular/semiBold/bold/extraBold, FontSizes.xs/sm/md/lg/xl
- **Naming**: PascalCase componentes, camelCase funciones/hooks, kebab-case archivos
- **NO scope creep**: si encuentras código feo cerca del fix, flag pero NO refactores
- **Tests visuales**: snapshots opcionales pero recomendados para componentes UI

---

# AL FINAL — Reporte tu sprint

Push del branch + COWORK_REPORT.md commiteado. Enrique audita en la mañana. Si todo OK, merge + migración SQL + OTA preview.

Buena overnight 🌙
