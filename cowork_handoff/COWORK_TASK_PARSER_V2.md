# COWORK_TASK — Sprint Parser v2: parser AI a prueba de balas

**Origen:** beta test de Mariana mostró que el parser AI extraía valores absurdos. Sprint 1 puso 1 capa (validación clínica post-extract). Para "a prueba de balas" faltan 3 capas más: normalización de unidades, auto-derive de params calculados, y pantalla de confirmación pre-guardado.

**Branch:** `feat/parser-ai-v2` desde `main` (después de mergear Sprint 2+3).
**Estimado:** 10-12h CC.
**SQL:** ❌ ninguna nueva.
**Deploy:** ❌ NO merge, NO OTA — Enrique valida con Mariana antes.

---

## ARQUITECTURA NUEVA — 4 capas

```
PDF/foto sube
   ↓
LLM extrae {key, value, unit_in_document, confidence}
   ↓
CAPA 2 — convertir a unidad canónica (LAB_UNIT_CONVERTERS)
   ↓
CAPA 2.5 — auto-derivar params calculados (ratios, índices, FFMI)
   ↓
CAPA 3 — validar TODOS (originales + derivados) contra rangos clínicos
   ↓
CAPA 4 — pantalla de confirmación al usuario con todos los valores
   ↓
Usuario confirma → guarda
```

**Doctrina:** el usuario VE lo que se va a guardar antes de que se guarde. Cero sorpresas.

---

## CAPA 2 — Conversión de unidades (3h)

### Crear `src/constants/lab-unit-converters.ts`

```typescript
/**
 * Conversores de unidades por biomarker. Convierte el valor de la unidad
 * detectada en el PDF a la unidad canónica del motor.
 */
export type UnitConverter = (v: number) => number;

export const LAB_UNIT_CANONICAL: Record<string, string> = {
  testosterone: 'ng/dL',          // matriz V8 usa ng/dL
  testosterone_free: 'pg/mL',
  estradiol: 'pg/mL',
  vitamin_d: 'ng/mL',
  vitamin_b12: 'pg/mL',
  cortisol: 'µg/dL',
  glucose: 'mg/dL',
  hba1c: '%',
  ldl: 'mg/dL',
  hdl: 'mg/dL',
  cholesterol_total: 'mg/dL',
  triglycerides: 'mg/dL',
  apob: 'mg/dL',
  creatinine: 'mg/dL',
  bun: 'mg/dL',
  urea: 'mg/dL',
  pcr: 'mg/dL',
  albumin: 'g/dL',
  wbc: '/µL',
  hematocrit: '%',
  homocysteine: 'µmol/L',
  ferritin: 'ng/mL',
  iron: 'µg/dL',
  tsh: 'µUI/mL',
};

export const LAB_UNIT_CONVERTERS: Record<string, Record<string, UnitConverter>> = {
  testosterone: {
    'ng/mL': (v) => v * 100,        // 9.93 ng/mL → 993 ng/dL
    'nmol/L': (v) => v * 28.84,     // 28.6 nmol/L → 825 ng/dL
    'ng/dL': (v) => v,              // identity
  },
  testosterone_free: {
    'pg/mL': (v) => v,
    'pmol/L': (v) => v * 0.2884,
  },
  estradiol: {
    'pg/mL': (v) => v,
    'pmol/L': (v) => v / 3.671,
  },
  vitamin_d: {
    'ng/mL': (v) => v,
    'nmol/L': (v) => v / 2.5,       // 75 nmol/L → 30 ng/mL
  },
  vitamin_b12: {
    'pg/mL': (v) => v,
    'pmol/L': (v) => v / 0.738,
  },
  cortisol: {
    'µg/dL': (v) => v,
    'ug/dL': (v) => v,
    'nmol/L': (v) => v / 27.59,
  },
  glucose: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 18,        // 5 mmol/L → 90 mg/dL
  },
  hba1c: {
    '%': (v) => v,
    'mmol/mol': (v) => (v / 10.93) + 2.15,  // NGSP-IFCC
    // Heurística: si llega < 0.5 → fracción decimal, × 100
    'decimal': (v) => v * 100,
  },
  ldl: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 38.67,
  },
  hdl: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 38.67,
  },
  cholesterol_total: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 38.67,
  },
  triglycerides: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 88.5,
  },
  creatinine: {
    'mg/dL': (v) => v,
    'µmol/L': (v) => v / 88.4,
    'umol/L': (v) => v / 88.4,
  },
  bun: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v * 2.8,
  },
  urea: {
    'mg/dL': (v) => v,
    'mmol/L': (v) => v / 0.1665,
    'g/L': (v) => v * 100,
  },
  pcr: {
    'mg/dL': (v) => v,
    'mg/L': (v) => v / 10,          // 5 mg/L → 0.5 mg/dL
  },
  albumin: {
    'g/dL': (v) => v,
    'g/L': (v) => v / 10,
  },
  wbc: {
    '/µL': (v) => v,
    '/uL': (v) => v,
    '×10³/µL': (v) => v * 1000,
    '10^3/µL': (v) => v * 1000,
    'K/µL': (v) => v * 1000,
    '×10⁹/L': (v) => v * 1000,
  },
  hematocrit: {
    '%': (v) => v,
    'fracción': (v) => v * 100,
    'decimal': (v) => v * 100,       // 0.45 → 45%
  },
  ferritin: {
    'ng/mL': (v) => v,
    'µg/L': (v) => v,                // equivalentes
    'pmol/L': (v) => v / 2.247,
  },
};

/**
 * Convierte un valor extraído a la unidad canónica del biomarker.
 * - Si la unidad detectada está en el catálogo → aplica conversor.
 * - Si NO está → usa heurística de magnitud (fallback).
 * - Si nada cuadra → devuelve { value: original, confidence: 'low' } para revisión.
 */
export function normalizeLabValue(
  key: string,
  rawValue: number,
  detectedUnit?: string | null,
): { value: number; unitFrom: string; unitTo: string; method: 'explicit' | 'heuristic' | 'identity' } {
  const canonical = LAB_UNIT_CANONICAL[key];
  if (!canonical) {
    return { value: rawValue, unitFrom: detectedUnit ?? '?', unitTo: '?', method: 'identity' };
  }
  const converters = LAB_UNIT_CONVERTERS[key];
  if (!converters) {
    return { value: rawValue, unitFrom: detectedUnit ?? canonical, unitTo: canonical, method: 'identity' };
  }
  
  // 1. Conversión explícita si la unidad detectada está en el catálogo
  if (detectedUnit) {
    const cleaned = detectedUnit.trim().toLowerCase().replace(/\s+/g, '');
    for (const [unit, fn] of Object.entries(converters)) {
      if (cleaned === unit.toLowerCase().replace(/\s+/g, '')) {
        return { value: fn(rawValue), unitFrom: unit, unitTo: canonical, method: 'explicit' };
      }
    }
  }
  
  // 2. Heurística de magnitud (fallback)
  const heuristicResult = applyMagnitudeHeuristic(key, rawValue);
  if (heuristicResult) return heuristicResult;
  
  // 3. Identity (asume canónica)
  return { value: rawValue, unitFrom: canonical, unitTo: canonical, method: 'identity' };
}

/** Heurística por magnitud para casos sin unidad detectada. */
function applyMagnitudeHeuristic(
  key: string,
  v: number,
): { value: number; unitFrom: string; unitTo: string; method: 'heuristic' } | null {
  const canonical = LAB_UNIT_CANONICAL[key];
  if (!canonical) return null;
  
  switch (key) {
    case 'hba1c':
      // < 0.5 → fracción decimal, × 100
      if (v < 0.5) return { value: v * 100, unitFrom: 'decimal', unitTo: '%', method: 'heuristic' };
      break;
    case 'hematocrit':
      if (v < 1) return { value: v * 100, unitFrom: 'fracción', unitTo: '%', method: 'heuristic' };
      break;
    case 'wbc':
      // < 100 → asume ×10³/µL (miles)
      if (v < 100) return { value: v * 1000, unitFrom: '×10³/µL', unitTo: '/µL', method: 'heuristic' };
      break;
    case 'glucose':
      // < 30 → mmol/L
      if (v < 30) return { value: v * 18, unitFrom: 'mmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'ldl':
    case 'hdl':
    case 'cholesterol_total':
      if (v < 10) return { value: v * 38.67, unitFrom: 'mmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'triglycerides':
      if (v < 30) return { value: v * 88.5, unitFrom: 'mmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'testosterone':
      // < 20 → ng/mL (rango típico hombres 2-12), > 100 → ng/dL
      if (v < 20) return { value: v * 100, unitFrom: 'ng/mL', unitTo: 'ng/dL', method: 'heuristic' };
      break;
    case 'creatinine':
      if (v > 20) return { value: v / 88.4, unitFrom: 'µmol/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
    case 'pcr':
      if (v > 5) return { value: v / 10, unitFrom: 'mg/L', unitTo: 'mg/dL', method: 'heuristic' };
      break;
  }
  return null;
}
```

**Tests obligatorios** (`__tests__/lab-unit-converters.test.ts`):
```typescript
// Casos explícitos
expect(normalizeLabValue('testosterone', 9.93, 'ng/mL').value).toBe(993);
expect(normalizeLabValue('glucose', 5, 'mmol/L').value).toBe(90);
expect(normalizeLabValue('vitamin_d', 75, 'nmol/L').value).toBe(30);

// Heurística por magnitud (Mariana #3 del Sprint 1)
expect(normalizeLabValue('hba1c', 0.057, null).value).toBeCloseTo(5.7);
expect(normalizeLabValue('hematocrit', 0.45, null).value).toBe(45);
expect(normalizeLabValue('wbc', 7.5, null).value).toBe(7500);

// Identity
expect(normalizeLabValue('hba1c', 5.7, '%').value).toBe(5.7);
expect(normalizeLabValue('glucose', 90, 'mg/dL').value).toBe(90);
```

---

## CAPA 2.5 — Auto-derive de params calculados (2h)

### Crear `src/services/edad-atp/auto-derive-service.ts`

```typescript
/**
 * Después de normalizar inputs, calcula automáticamente los params derivados
 * que el motor V2 conoce. El usuario NO captura ratios/índices manualmente.
 *
 * Si los inputs requeridos no existen → no se deriva (queda undefined).
 */
import type { ParamValues } from '@/src/types/edad-atp-v2';

export function autoDeriveParams(values: ParamValues): ParamValues {
  const derived: ParamValues = { ...values };
  
  // Ratio TG/HDL
  if (values.triglycerides != null && values.hdl != null && values.hdl > 0) {
    derived.ratio_tg_hdl = values.triglycerides / values.hdl;
  }
  
  // Índice Aterogénico (Col total / HDL)
  if (values.cholesterol_total != null && values.hdl != null && values.hdl > 0) {
    derived.indice_aterogenico = values.cholesterol_total / values.hdl;
  }
  
  // Índice Lipoproteínas (LDL / HDL)
  if (values.ldl != null && values.hdl != null && values.hdl > 0) {
    derived.indice_lipoproteinas = values.ldl / values.hdl;
  }
  
  // HOMA-IR
  if (values.glucose != null && values.insulin != null) {
    derived.homa_ir = (values.glucose * values.insulin) / 405;
  }
  
  // NLR (Neutrófilos/Linfocitos)
  if (values.neutrophils_total != null && values.lymphocytes_total != null && values.lymphocytes_total > 0) {
    derived.nlr = values.neutrophils_total / values.lymphocytes_total;
  }
  
  // FFMI = peso × (1 - %grasa/100) / altura²(m)
  if (values.weight_kg != null && values.body_fat_pct != null && values.height_cm != null && values.height_cm > 0) {
    const h_m = values.height_cm / 100;
    derived.ffmi = values.weight_kg * (1 - values.body_fat_pct / 100) / (h_m * h_m);
  }
  
  // BMI
  if (values.weight_kg != null && values.height_cm != null && values.height_cm > 0) {
    const h_m = values.height_cm / 100;
    derived.bmi = values.weight_kg / (h_m * h_m);
  }
  
  // Ratio cintura/cadera
  if (values.waist_cm != null && values.hip_cm != null && values.hip_cm > 0) {
    derived.ratio_cintura_cadera = values.waist_cm / values.hip_cm;
  }
  
  // Relación BUN/Creatinina
  if (values.bun != null && values.creatinine != null && values.creatinine > 0) {
    derived.bun_creatinina_ratio = values.bun / values.creatinine;
  }
  
  // Saturación hierro = Hierro sérico / TIBC × 100
  if (values.iron != null && values.tibc != null && values.tibc > 0) {
    derived.iron_saturation = (values.iron / values.tibc) * 100;
  }
  
  return derived;
}
```

**Tests:**
```typescript
expect(autoDeriveParams({ triglycerides: 75, hdl: 60 }).ratio_tg_hdl).toBe(1.25);
expect(autoDeriveParams({ glucose: 90, insulin: 5 }).homa_ir).toBe(1.11);
expect(autoDeriveParams({ weight_kg: 79, body_fat_pct: 11, height_cm: 176 }).ffmi).toBeCloseTo(22.7);
// Si falta input → undefined
expect(autoDeriveParams({ triglycerides: 75 }).ratio_tg_hdl).toBeUndefined();
```

---

## CAPA 3 — Prompt LLM con confidence (2h)

### Modificar prompt actual del parser AI

```text
Tu tarea es extraer biomarcadores de un PDF/foto de un laboratorio médico.

Para CADA valor que encuentres, devuelve JSON con este shape EXACTO:
{
  "key": "ldl",
  "value": 149,
  "unit_in_document": "mg/dL",  // unidad TEXTUAL del documento, NULL si no está clara
  "confidence": "high" | "medium" | "low",
  "raw_text_snippet": "LDL: 149 mg/dL"  // texto original para auditoría
}

REGLAS:
1. Si la unidad NO está explícita junto al valor → confidence = "low"
2. Si el valor parece ambiguo o el OCR es pobre → confidence = "low" o "medium"
3. NO inventes valores. Es mejor omitir un biomarker que adivinarlo.
4. NO mezcles valores de dos pacientes ni de fechas distintas (toma el más reciente).
5. Los keys válidos son: [lista exhaustiva de keys de la matriz V8]

Devuelve un array JSON puro, sin texto adicional.
```

### Procesamiento del response

```typescript
type ParserResponse = Array<{
  key: string;
  value: number;
  unit_in_document: string | null;
  confidence: 'high' | 'medium' | 'low';
  raw_text_snippet: string;
}>;

const response: ParserResponse = await callLLMParser(pdfFile);

const processed = response.map(item => {
  // Capa 2: normalizar
  const normalized = normalizeLabValue(item.key, item.value, item.unit_in_document);
  
  // Bumpear confidence si la heurística se usó
  let finalConfidence = item.confidence;
  if (normalized.method === 'heuristic' && finalConfidence === 'high') {
    finalConfidence = 'medium'; // explícito > heurístico
  }
  
  return {
    ...item,
    value_canonical: normalized.value,
    unit_canonical: normalized.unitTo,
    conversion_method: normalized.method,
    confidence: finalConfidence,
  };
});

// Capa 2.5: auto-derive
const valuesMap = Object.fromEntries(processed.map(p => [p.key, p.value_canonical]));
const derived = autoDeriveParams(valuesMap);
// Los derivados se agregan al array de processed con confidence='high' (cálculo exacto)

// Capa 3: validar contra rangos clínicos (LA QUE YA EXISTE de Sprint 1)
const validated = processed.map(p => ({
  ...p,
  passed_validation: isLabValueValid(p.key, p.value_canonical),
}));

// Pasar al frontend para Capa 4 (pantalla de confirmación)
return { items: validated, derived };
```

---

## CAPA 4 — Pantalla de confirmación pre-guardado (4h)

### Nueva pantalla `app/edad-atp/lab-confirmation.tsx`

Después del extract, NO guardar directo. Mostrar al usuario:

```
"Hemos detectado los siguientes valores en tu laboratorio. Revisa y confirma:"

  ┌─────────────────────────────────────────────┐
  │ ✓ LDL: 149 mg/dL                  [Editar]  │  ← high confidence
  │   Detectado de "LDL: 149 mg/dL"             │
  ├─────────────────────────────────────────────┤
  │ ✓ HDL: 60 mg/dL                   [Editar]  │  ← high
  ├─────────────────────────────────────────────┤
  │ ⚠ Colesterol total: 214 mg/dL     [Editar]  │  ← medium (revisar)
  ├─────────────────────────────────────────────┤
  │ ⚠ Glucosa: 90 mg/dL               [Editar]  │  ← convertido de mmol/L
  │   (detectado en mmol/L, convertido)         │
  ├─────────────────────────────────────────────┤
  │ ⚠ HbA1c: ❓ valor poco claro      [Capturar] │  ← low / rejected
  ├─────────────────────────────────────────────┤
  │ Auto-calculados:                            │
  │   Ratio TG/HDL: 1.04                        │
  │   Índice Aterogénico: 3.4                   │
  └─────────────────────────────────────────────┘

  [Confirmar y guardar]    [Cancelar y volver a subir]
```

### Reglas de display

- **Confidence high + validation passed** → ✓ verde, edit opcional
- **Confidence medium / heurística usada / "raro"** → ⚠ amarillo, sugerir revisar
- **Confidence low / validation rejected** → ❓ marcar como "no detectado", botón "Capturar manual"
- **Auto-derivados** → mostrar en sección aparte con etiqueta "Auto-calculados"

### Edición inline

Tap en `[Editar]`:
- Input numérico aparece reemplazando el valor
- Unidad canónica visible al lado
- Guardar local (no a DB todavía)

Tap en `[Capturar]` (low/rejected):
- Mismo input pero arrancando vacío
- Mismo flujo

### Botón "Confirmar y guardar"

- Recorre la lista final (con ediciones del usuario aplicadas)
- Re-valida cada valor (rangos clínicos)
- Guarda a `lab_results` / `lab_values` SOLO los validados
- Reporta a usuario: "N valores guardados, M omitidos por no estar claros"

### Botón "Cancelar y volver a subir"

- Descarta el upload actual
- Vuelve a la pantalla de subir PDF/foto

---

## PLAN DE COMMITS (~12)

1. `feat(parser-v2): constantes LAB_UNIT_CANONICAL + LAB_UNIT_CONVERTERS`
2. `feat(parser-v2): normalizeLabValue con heurística de magnitud`
3. `test(parser-v2): unit converters + casos de Mariana (HbA1c decimal, WBC miles, etc.)`
4. `feat(parser-v2): auto-derive de params calculados (ratios, índices, FFMI)`
5. `test(parser-v2): auto-derive con casos reales`
6. `feat(parser-v2): prompt LLM v2 con confidence + unit_in_document`
7. `feat(parser-v2): procesamiento post-LLM (normalize → derive → validate)`
8. `feat(parser-v2): pantalla de confirmación pre-guardado (UI)`
9. `feat(parser-v2): edición inline + botón "capturar manual" para low/rejected`
10. `feat(parser-v2): integrar pantalla confirmación al flujo de upload`
11. `test(parser-v2): E2E con PDF mock de Mariana (LDL 2.27 → rechazado, mostrado al user)`
12. `docs(parser-v2): runbook + smoke test + flags`

---

## EXIT CRITERIA

- [ ] `npx tsc --noEmit` → 0 errores.
- [ ] `npx vitest run` → tests pasan, incluyendo nuevos.
- [ ] Push a `origin/feat/parser-ai-v2`.
- [ ] **NO merge, NO OTA**.
- [ ] `COWORK_REPORT.md` con tabla de capas + smoke test.

---

## SMOKE TEST POST-OTA (con Mariana)

1. [ ] Mariana sube el mismo PDF que dio absurdos antes → ahora se abre pantalla de **confirmación**
2. [ ] En la pantalla ve: valores con ✓/⚠/❓, ratios auto-calculados, edit inline funciona
3. [ ] Tap Editar en LDL absurdo → puede corregir antes de guardar
4. [ ] Confirmar guarda solo los válidos
5. [ ] Lab con glucosa en mmol/L → se convierte automáticamente a mg/dL y se marca ⚠ "convertido"
6. [ ] HbA1c viene como 0.057 → se normaliza a 5.7% sin pedirle al usuario nada
7. [ ] WBC en miles (7.5) → se convierte a 7,500/µL automáticamente

---

## FLAGS PERMITIDOS

1. **Si una unidad del PDF no está en `LAB_UNIT_CONVERTERS`**: marcar confidence="low" + heurística como fallback. NO inventar conversores.
2. **Si la pantalla de confirmación rompe el flujo actual** (Mariana ya está acostumbrada al directo): mostrarla solo si hay ≥1 valor con confidence < "high" o ≥1 rejected por validación.
3. **NO TOCAR** el motor v2, las matrices V8, ni source-map. Solo parser + UI.
4. **PostHog metrics:** trackear % de valores edited/rejected/confirmed por upload para iteración futura.

---

**Adelante. Después de este sprint, Mariana puede confiar en CADA valor que ve.**
