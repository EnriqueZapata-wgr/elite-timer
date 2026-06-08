/**
 * Algoritmo Excel — orquestador de la Edad Biológica base (sin cognitivo).
 * EDAD ATP Sprint 1/N. Pasos G30/SF/Ritmo/G35/G36/G37 del Excel verificado.
 *
 * La MATEMÁTICA del blend (computeAlgoritmoExcelFromComponents) está VERIFICADA
 * contra el paciente HOMBRES V7: phenoage 40.897 + sf 0.6083 + ajuste −2 →
 * ritmo 14.66, G35 61.10, G36 59.10, G37 54.55.
 *
 * NOTA: el orquestador público toma `domain_scores` (no los ~140 inputs crudos),
 * porque los rangos de 9 bandas por parámetro + los pesos de dominio reales viven
 * en el Excel maestro y aún no están en los docs (sprint 5). Con el placeholder de
 * pesos iguales, el SF del paciente da 0.6315 (no 0.6083) → ver COWORK_REPORT.
 */
import type { BodyComposition, DomainKey, PhenoAgeBiomarkers, Sex } from '@/src/types/edad-atp-v2';
import {
  BLEND_WEIGHT_ALGORITMO_EXCEL,
  BLEND_WEIGHT_PHENOAGE,
  RITMO_BASE_MONTHS,
  RITMO_THRESHOLD_SF,
  RITMO_AGE_EXPONENT,
} from '@/src/constants/edad-atp-v2-model';
import { computePhenoAge } from './phenoage-service';
import { computeSFGlobal } from './sf-service';
import { computeBodyCompositionAdjustments } from './body-composition-service';

/**
 * Núcleo matemático del algoritmo Excel a partir de componentes ya calculados.
 * VERIFICADO celda por celda contra el Excel.
 */
export function computeAlgoritmoExcelFromComponents(params: {
  chronological_age: number;
  phenoage: number;
  sf_score: number; // 0-1
  total_adjustment_years: number;
}): {
  ritmo_envejecimiento: number;
  edad_biologica_calculada: number;
  edad_biologica_con_ajuste: number;
  algoritmo_excel: number;
} {
  const { chronological_age, phenoage, sf_score, total_adjustment_years } = params;
  // C16: Ritmo = 12 + ((75 − SF×100) × EdadCron^0.75) / 100
  const ritmo_envejecimiento =
    RITMO_BASE_MONTHS +
    ((RITMO_THRESHOLD_SF - sf_score * 100) * Math.pow(chronological_age, RITMO_AGE_EXPONENT)) / 100;
  // G35: EdadCron × (Ritmo / 12)
  const edad_biologica_calculada = chronological_age * (ritmo_envejecimiento / RITMO_BASE_MONTHS);
  // G36: G35 + Σ ajustes composición
  const edad_biologica_con_ajuste = edad_biologica_calculada + total_adjustment_years;
  // G37: (G36 × 0.75) + (PhenoAge × 0.25)
  const algoritmo_excel =
    edad_biologica_con_ajuste * BLEND_WEIGHT_ALGORITMO_EXCEL + phenoage * BLEND_WEIGHT_PHENOAGE;

  return {
    ritmo_envejecimiento,
    edad_biologica_calculada,
    edad_biologica_con_ajuste,
    algoritmo_excel,
  };
}

/**
 * Orquestador público: calcula PhenoAge + SF + ajustes y compone el algoritmo Excel.
 * Toma domain_scores (0-100) en vez de inputs crudos (ver nota de cabecera).
 */
export function computeAlgoritmoExcel(params: {
  chronological_age: number;
  sex: Sex;
  phenoage_biomarkers: PhenoAgeBiomarkers;
  domain_scores: Partial<Record<DomainKey, number>>;
  body_composition: BodyComposition;
}): {
  algoritmo_excel: number;
  edad_biologica_calculada: number;
  edad_biologica_con_ajuste: number;
  phenoage: number;
  sf_score: number;
  ritmo_envejecimiento: number;
  ce_excel: number; // 0-1
} {
  const { phenoage } = computePhenoAge(params.phenoage_biomarkers);
  const { sf, ce_percent } = computeSFGlobal(params.domain_scores);
  const { total_adjustment_years } = computeBodyCompositionAdjustments(params.body_composition, params.sex);

  const core = computeAlgoritmoExcelFromComponents({
    chronological_age: params.chronological_age,
    phenoage,
    sf_score: sf,
    total_adjustment_years,
  });

  return {
    algoritmo_excel: core.algoritmo_excel,
    edad_biologica_calculada: core.edad_biologica_calculada,
    edad_biologica_con_ajuste: core.edad_biologica_con_ajuste,
    phenoage,
    sf_score: sf,
    ritmo_envejecimiento: core.ritmo_envejecimiento,
    ce_excel: ce_percent / 100,
  };
}
