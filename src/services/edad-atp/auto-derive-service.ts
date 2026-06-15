/**
 * Capa 2.5 del parser v2 — auto-derive de params calculados.
 *
 * Tras normalizar los inputs base, calcula los params DERIVADOS (ratios, índices, FFMI…)
 * que de otro modo el usuario tendría que capturar a mano o que salían absurdos cuando se
 * derivaban de basura (Sprint 1: TG/HDL 35.35 venía de un HDL imposible).
 *
 * Si faltan los inputs requeridos → el derivado NO se calcula (queda fuera del resultado).
 * Los derivados son cálculo exacto: se usan para DISPLAY en la pantalla de confirmación
 * (sección "Auto-calculados"). El motor V2 sigue derivando los suyos — no lo tocamos.
 *
 * Nota: NO existe un tipo `ParamValues` en el repo; se usa un mapa plano clave→número.
 */
export type LabValueMap = Record<string, number | null | undefined>;

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Claves que produce autoDeriveParams (para distinguir derivados en la UI). */
export const DERIVED_KEYS = [
  'ratio_tg_hdl',
  'indice_aterogenico',
  'indice_lipoproteinas',
  'homa_ir',
  'nlr',
  'ffmi',
  'bmi',
  'ratio_cintura_cadera',
  'bun_creatinina_ratio',
  'iron_saturation',
] as const;

/**
 * Devuelve SOLO los params derivables a partir de `values` (no incluye los inputs).
 * Cada derivado se redondea a 2 decimales (son para mostrar). Si falta un input → se omite.
 */
export function autoDeriveParams(values: LabValueMap): Record<string, number> {
  const derived: Record<string, number> = {};
  const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

  // Lípidos
  if (ok(values.triglycerides) && ok(values.hdl) && values.hdl > 0) {
    derived.ratio_tg_hdl = round2(values.triglycerides / values.hdl);
  }
  if (ok(values.cholesterol_total) && ok(values.hdl) && values.hdl > 0) {
    derived.indice_aterogenico = round2(values.cholesterol_total / values.hdl);
  }
  if (ok(values.ldl) && ok(values.hdl) && values.hdl > 0) {
    derived.indice_lipoproteinas = round2(values.ldl / values.hdl);
  }

  // Metabólico
  if (ok(values.glucose) && ok(values.insulin)) {
    derived.homa_ir = round2((values.glucose * values.insulin) / 405);
  }

  // Inflamación / inmunidad
  if (ok(values.neutrophils_total) && ok(values.lymphocytes_total) && values.lymphocytes_total > 0) {
    derived.nlr = round2(values.neutrophils_total / values.lymphocytes_total);
  }

  // Composición
  if (ok(values.weight_kg) && ok(values.body_fat_pct) && ok(values.height_cm) && values.height_cm > 0) {
    const hM = values.height_cm / 100;
    derived.ffmi = round2((values.weight_kg * (1 - values.body_fat_pct / 100)) / (hM * hM));
  }
  if (ok(values.weight_kg) && ok(values.height_cm) && values.height_cm > 0) {
    const hM = values.height_cm / 100;
    derived.bmi = round2(values.weight_kg / (hM * hM));
  }
  if (ok(values.waist_cm) && ok(values.hip_cm) && values.hip_cm > 0) {
    derived.ratio_cintura_cadera = round2(values.waist_cm / values.hip_cm);
  }

  // Renal
  if (ok(values.bun) && ok(values.creatinine) && values.creatinine > 0) {
    derived.bun_creatinina_ratio = round2(values.bun / values.creatinine);
  }

  // Hierro
  if (ok(values.iron) && ok(values.tibc) && values.tibc > 0) {
    derived.iron_saturation = round2((values.iron / values.tibc) * 100);
  }

  return derived;
}
