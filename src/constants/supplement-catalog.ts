/**
 * Catálogo ATP de suplementos — recomendaciones curadas por objetivo
 * (#54, Sprint NUTRICIÓN T4).
 *
 * CONTENIDO CLÍNICO-COLINDANTE: dosis y evidencia son BORRADOR de Fable
 * siguiendo la jerarquía de evidencia ARGOS ([Nivel N]) — Mariana revisa
 * antes de beta pública. Filosofía funcional: base sólida antes que
 * bloqueadores; señalar precauciones siempre.
 *
 * PURO (sin imports RN) — testeable en node.
 */

export type SupplementObjective = 'base' | 'energia' | 'sueno' | 'recuperacion' | 'cognicion';

export const OBJECTIVE_LABELS: Record<SupplementObjective, { label: string; icon: string }> = {
  base: { label: 'Base funcional', icon: 'shield-checkmark-outline' },
  energia: { label: 'Más energía', icon: 'flash-outline' },
  sueno: { label: 'Dormir mejor', icon: 'moon-outline' },
  recuperacion: { label: 'Recuperación', icon: 'fitness-outline' },
  cognicion: { label: 'Cognición', icon: 'bulb-outline' },
};

export interface CatalogSupplement {
  id: string;
  name: string;
  dose: string;
  dosePattern: '1× diario' | '2× diario' | 'lun/mié/vie' | 'semanal';
  timing: 'morning' | 'with_food' | 'afternoon' | 'evening' | 'bedtime';
  objective: SupplementObjective;
  benefit: string;
  /** Evidencia breve con nivel ARGOS. */
  evidence: string;
  cautions?: string;
}

export const SUPPLEMENT_CATALOG: readonly CatalogSupplement[] = [
  // ── BASE FUNCIONAL ──
  {
    id: 'vitd3-k2', name: 'Vitamina D3 + K2', dose: '5000 UI + 100 µg', dosePattern: '1× diario',
    timing: 'with_food', objective: 'base',
    benefit: 'Inmunidad, hueso y señalización hormonal',
    evidence: '[Nivel 1] Mecanismo sólido + RCTs; K2 dirige el calcio al hueso.',
    cautions: 'Con comida grasa. Si tomas anticoagulantes, consulta antes (K2).',
  },
  {
    id: 'mg-glicinato', name: 'Magnesio glicinato', dose: '400 mg', dosePattern: '1× diario',
    timing: 'evening', objective: 'base',
    benefit: 'Relajación muscular y del sistema nervioso',
    evidence: '[Nivel 1] Cofactor de 300+ enzimas; deficiencia poblacional común.',
  },
  {
    id: 'omega3', name: 'Omega-3 (EPA/DHA)', dose: '2 g', dosePattern: '1× diario',
    timing: 'with_food', objective: 'base',
    benefit: 'Antiinflamatorio de base, membranas celulares',
    evidence: '[Nivel 1] Mecanismo + RCTs cardiovasculares y de recuperación.',
    cautions: 'Si tomas anticoagulantes, consulta antes.',
  },
  {
    id: 'electrolitos', name: 'Electrolitos (Na/K/Mg)', dose: '1 porción', dosePattern: '1× diario',
    timing: 'morning', objective: 'base',
    benefit: 'Hidratación celular real (clave en low-carb)',
    evidence: '[Nivel 2] Mecanismo claro; esencial con macros ATP bajos en carbos.',
  },

  // ── ENERGÍA ──
  {
    id: 'creatina', name: 'Creatina monohidratada', dose: '5 g', dosePattern: '1× diario',
    timing: 'morning', objective: 'energia',
    benefit: 'ATP celular, fuerza y cognición',
    evidence: '[Nivel 1] El suplemento más estudiado en deporte; beneficio cognitivo emergente.',
    cautions: 'Hidrátate bien. En enfermedad renal, consulta antes.',
  },
  {
    id: 'b-complex', name: 'B-Complex metilado', dose: '1 cápsula', dosePattern: '1× diario',
    timing: 'morning', objective: 'energia',
    benefit: 'Metilación y producción de energía mitocondrial',
    evidence: '[Nivel 2] Metilfolato/metilcobalamina — biodisponibilidad superior al ácido fólico.',
  },
  {
    id: 'coq10', name: 'CoQ10 (ubiquinol)', dose: '100-200 mg', dosePattern: '1× diario',
    timing: 'with_food', objective: 'energia',
    benefit: 'Cadena de transporte de electrones',
    evidence: '[Nivel 2] Mecanismo mitocondrial directo; clave si tomas estatinas.',
  },

  // ── SUEÑO ──
  {
    id: 'glicina', name: 'Glicina', dose: '3 g', dosePattern: '1× diario',
    timing: 'bedtime', objective: 'sueno',
    benefit: 'Baja temperatura central, sueño profundo',
    evidence: '[Nivel 2] RCTs pequeños consistentes en calidad de sueño subjetiva.',
  },
  {
    id: 'mg-treonato', name: 'Magnesio treonato', dose: '2 g', dosePattern: '1× diario',
    timing: 'bedtime', objective: 'sueno',
    benefit: 'Magnesio que cruza barrera hematoencefálica',
    evidence: '[Nivel 3] El efecto se replica; mecanismo cerebral en estudio.',
  },
  {
    id: 'l-teanina', name: 'L-teanina', dose: '200 mg', dosePattern: '1× diario',
    timing: 'bedtime', objective: 'sueno',
    benefit: 'Calma sin sedación (ondas alfa)',
    evidence: '[Nivel 2] Mecanismo GABAérgico suave + estudios humanos.',
  },

  // ── RECUPERACIÓN ──
  {
    id: 'zinc', name: 'Zinc (picolinato)', dose: '15-30 mg', dosePattern: '1× diario',
    timing: 'evening', objective: 'recuperacion',
    benefit: 'Testosterona, inmunidad, reparación',
    evidence: '[Nivel 1] Deficiencia común en atletas; RCTs en inmunidad.',
    cautions: 'No con café/lácteos. Dosis altas crónicas deplecionan cobre.',
  },
  {
    id: 'vit-c', name: 'Vitamina C', dose: '500 mg', dosePattern: '1× diario',
    timing: 'with_food', objective: 'recuperacion',
    benefit: 'Colágeno y estrés oxidativo',
    evidence: '[Nivel 2] Mecanismo sólido; megadosis no superan dosis moderadas.',
  },

  // ── COGNICIÓN ──
  {
    id: 'alpha-gpc', name: 'Alpha-GPC (colina)', dose: '300 mg', dosePattern: '1× diario',
    timing: 'morning', objective: 'cognicion',
    benefit: 'Precursor de acetilcolina — foco y memoria',
    evidence: '[Nivel 2] Mecanismo colinérgico claro; estudios en rendimiento cognitivo.',
  },
  {
    id: 'ashwagandha', name: 'Ashwagandha (KSM-66)', dose: '600 mg', dosePattern: '1× diario',
    timing: 'evening', objective: 'cognicion',
    benefit: 'Cortisol bajo control — estrés crónico',
    evidence: '[Nivel 2] Tradición ayurvédica CON RCTs modernos de cortisol/ansiedad.',
    cautions: 'Embarazo/lactancia: no. Hipotiroidismo medicado: consulta antes.',
  },
] as const;

/** Catálogo filtrado por objetivo. */
export function catalogByObjective(objective: SupplementObjective): CatalogSupplement[] {
  return SUPPLEMENT_CATALOG.filter((s) => s.objective === objective);
}
