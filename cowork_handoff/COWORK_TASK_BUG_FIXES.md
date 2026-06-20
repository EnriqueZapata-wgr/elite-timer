# COWORK_TASK — 3 bug fixes post Fase 4 (Edad ATP display + mapping)

**Branch:** `fix/edad-atp-display-fixes` desde `main` actual.
**SQL:** ❌ ninguna.
**Deploy:** OTA (`eas update --branch preview`).
**Merge:** Enrique después de validar.
**Estimado:** 1.5-2h CC.

---

## Contexto

Después de mergear Fase 4 (cardio matriz + sub-edades desde SF dominio), aparecieron 3 bugs visibles en pantalla:

- **Edad Corporal = 70 ▼ con CE 0%** (todos los componentes "pendiente" aunque los datos están en `health_measurements` desde hace 1 día).
- **Edad Fitness = 37.3 / 70 ▼** porque usa dominio Vitalidad cuya mayoría de params son Forms/Entrevista NO contestados aún.
- **Display de drill-down trunca decimales:** HbA1c muestra "0" cuando es 5.5, Bilirrubina "0" cuando es 0.44, RDW "0" cuando es 0.129, Hematocrito "0" cuando es 0.476, HOMAir "0" cuando es 0.41.

Lo demás funciona bien (Edad Integral 26.9, Cardio 30.4 ▲, Metabólica 24.9 ▲, Cognitiva 21 ▲).

---

## Bug 1 (CRÍTICO) — Composición no se mapea desde health_measurements

**Síntoma:** sub-edad Corporal = 70 con CE 0%. Los 6 params Forms/Entrevista del dominio `composicion_corporal` (% grasa, % músculo, edad corporal, fuerza agarre, grasa visceral, pull-ups) NO están en `edad_atp_questionnaire_responses` porque el usuario captura esto en la pantalla `/edad-atp/composition` que escribe a `health_measurements`.

**Causa raíz:** en `src/constants/edad-atp-source-map.ts`, `resolveParamSource` envía estos params al branch `questionnaire` por su `matrizSource = "Forms/Entrevista"`. Pero los datos viven en `health_measurements`, no en `edad_atp_questionnaire_responses`.

**Fix:** agregar un mapeo explícito `COMPOSITION_HEALTH_MEASUREMENTS_MAP` que `resolveParamSource` chequee ANTES del switch sobre `matrizSource`. Algo así:

```typescript
// En src/constants/edad-atp-source-map.ts

/** Params de Composición que viven en health_measurements (capturados vía /edad-atp/composition). */
export const COMPOSITION_HEALTH_MEASUREMENTS_MAP: Record<string, {
  columns: string[];
  convert?: (v: number, ctx: Record<string, number>) => number | undefined;
  deps?: string[]; // si convert necesita otros campos del row
}> = {
  grasa_corporal: {
    columns: ['body_fat_pct'],
    convert: (v) => (v > 1 ? v / 100 : v), // DB 11 → matriz 0.11
  },
  musculo_esqueletico: {
    // health_measurements tiene muscle_mass_kg, NO %. Calcular % = kg / weight_kg.
    columns: ['skeletal_muscle_pct'], // si existe directo
    deps: ['muscle_mass_kg', 'weight_kg'],
    convert: (v, ctx) => {
      if (v != null && Number.isFinite(v)) return v > 1 ? v / 100 : v;
      if (ctx.muscle_mass_kg && ctx.weight_kg) return ctx.muscle_mass_kg / ctx.weight_kg;
      return undefined;
    },
  },
  fuerza_de_agarre: { columns: ['grip_strength_kg'] },
  grasa_visceral: { columns: ['visceral_fat'] },
  // edad_corporal y pull_ups: ¿son inputs del usuario en /edad-atp/composition o algo derivado?
  // Si están en health_measurements, agregar columna. Si no, dejarlos como `questionnaire`
  // hasta que se capture flujo dedicado.
};

// Modificar resolveParamSource:
export function resolveParamSource(key: string, matrizSource: string | null): ParamSource {
  if (COMPUTED_PARAMS[key]) return { source: 'computed', ...COMPUTED_PARAMS[key] };
  if (LAB_COLUMN_MAP[key]) return { source: 'lab', ...LAB_COLUMN_MAP[key] };
  if (COMPOSITION_HEALTH_MEASUREMENTS_MAP[key]) {
    return { source: 'wearable_or_manual', ...COMPOSITION_HEALTH_MEASUREMENTS_MAP[key] };
  }
  if (WEARABLE_COLUMN_MAP[key]) return { source: 'wearable_or_manual', columns: WEARABLE_COLUMN_MAP[key] };
  // ... resto del switch
}
```

**Verificación con paciente Enrique:** después del fix, `loadAllParamValues` debe retornar:
- `grasa_corporal: 0.11` (de health_measurements.body_fat_pct = 11)
- `musculo_esqueletico: 0.696` (= 55/79, derivado de muscle_mass_kg / weight_kg)
- `fuerza_de_agarre: 77.8`
- `grasa_visceral: 3`

Y la sub-edad Corporal debe pasar de 70 → ~25 ▲ verde.

**Si `musculo_esqueletico` da 0.696 (~70%), eso cae en banda crítico_5** del Excel HOMBRES (W=80, V=75). Probable que la matriz espera kg/peso × 100 vs 100 directamente. **Validar contra el Excel:** abrir hoja `Composición corporal` HOMBRES, ver bandas del param `musculo_esqueletico` y confirmar si esperan decimal o porcentaje. Documentar en flag.

---

## Bug 2 — Sub-edad con CE bajo muestra número rojo, debería decir "Pendiente"

**Síntoma:** Fitness muestra **70 ▼** rojo en YO cuando CE = 33% (la mayoría de params son Forms/Entrevista no contestados). Asusta al usuario sin causa real.

**Fix:** en el componente `SubEdadConstellation.tsx` (y en el drill-down `[key].tsx`), cuando `sub_edad.ce_percent < 50`, mostrar:

- Mini-ring del Constellation: icono + "Pendiente" + indicador `⚠️` (gris/amarillo), NO un número rojo.
- Drill-down: header con "Esta sub-edad necesita más datos. CE actual: {ce_percent}%. Completa los cuestionarios pendientes."

**Threshold sugerido:** `CE < 50%`. Por encima, mostrar número normal con su color por banda.

**Aplicar a las 5 sub-edades** (no solo Fitness — Corporal también si Bug 1 no resuelve todos sus params).

---

## Bug 3 — Display de drill-down trunca decimales a 0

**Síntoma:** en el drill-down de cada sub-edad, valores decimales se muestran como "0":
- HbA1c: 5.5% (DB 0.055) → muestra "0"
- Bilirrubina: 0.44 → "0"
- HOMAir: 0.41 → "0"
- Hematocrito: 0.476 → "0"
- RDW: 0.128 → "0"

**Causa probable:** en algún componente del drill-down se está haciendo `Math.round(value)` o `value.toFixed(0)` cuando los valores < 1 deberían mostrar 2 decimales.

**Buscar en `app/edad-atp/sub-edad/[key].tsx`** (y en `SubEdadResult.components` rendering):
- Cambiar `Math.round(c.value)` o `value.toFixed(0)` por:
  ```typescript
  const formatValue = (v: number) => {
    if (v == null) return '—';
    if (Math.abs(v) >= 100) return v.toFixed(0);    // 214, 165, 132 → "214"
    if (Math.abs(v) >= 10) return v.toFixed(1);     // 21, 62.8 → "62.8"
    if (Math.abs(v) >= 1) return v.toFixed(2);      // 5.5, 1.04 → "5.50"
    return v.toFixed(3);                             // 0.44, 0.128 → "0.440"
  };
  ```
- Verificar también si la unidad se muestra. Si la matriz tiene `unit: 'g/dL'` el display debe ser `"0.44 g/dL"`.

**Bonus si hay tiempo:** mostrar la unidad de la matriz junto al valor en el drill-down.

---

## Plan de commits (5 commits)

1. `fix(source-map): mapear composición corporal a health_measurements + conversión` — Bug 1 core.
2. `test(source-map): paciente Enrique resuelve los 6 params de composición desde DB` — verifica Bug 1 fix.
3. `fix(sub-edad-display): mostrar Pendiente cuando CE < 50%` — Bug 2.
4. `fix(drill-down): formato decimal apropiado por magnitud + unidad de matriz` — Bug 3.
5. `docs(edad-atp): runbook bug fixes display + flags` — runbook.

---

## Exit criteria

- [ ] `npx tsc --noEmit` → 0 errores.
- [ ] `npx vitest run` → tests pasan, incluyendo el nuevo de source-map composition.
- [ ] Push a `origin/fix/edad-atp-display-fixes`.
- [ ] **NO merge, NO OTA** — Enrique después.
- [ ] `COWORK_REPORT_BUG_FIXES.md` con resumen + flags.

---

## Flags permitidos

1. **Si `musculo_esqueletico` en la matriz espera kg en lugar de %**: documentar en el código + flag. NO inventar conversión sin validar contra Excel.
2. **Si `edad_corporal` y `pull_ups` NO viven en `health_measurements`** (no hay columna): mantener como `questionnaire` source y agregar TODO para captura dedicada.
3. **Si el threshold 50% de CE no se siente bien** (Fitness con CE 33% debería ser "pendiente" pero quizás Corporal con CE 60% sí debería mostrar número): pelotear con Enrique. Default 50%.
4. **NO tocar la curva sfToAge** (sigue siendo interim hasta sprint con Mariana).
5. **NO tocar el cálculo de Edad Integral** — funciona bien (26.9). Solo display de sub-edades.

---

## Smoke test post-OTA

1. Recalcular Edad ATP → sub-edad **Corporal** debe pasar de 70 ▼ a ~25 ▲ (con datos de composición ya capturados).
2. Sub-edad **Fitness**: debe mostrar "Pendiente · contesta cuestionarios" (no un número rojo).
3. Drill-down de Cardiovascular: Bilirrubina debe mostrar **0.44 mg/dL** (no "0"). Hematocrito **47.6%**. RDW **12.9%**.
4. Drill-down de Metabólica: HbA1c **5.5%** (no "0"). HOMAir **0.41**.
5. Edad Integral debe seguir en ~25-27 (recalibrado, no debería cambiar mucho).
