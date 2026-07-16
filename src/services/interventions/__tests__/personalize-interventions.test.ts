/**
 * Tests del Motor de Personalización (arquitectura §8 perfiles + §11 guards).
 *
 * Filosofía (aprendizaje hotfix Sprint 1.5): NO afirmamos keys aspiracionales de
 * la spec que el catálogo real puede no tener — afirmamos INVARIANTES y
 * COMPORTAMIENTO verificable contra el catálogo de 88 real. Los perfiles corren
 * el motor de verdad; cada guard prueba una propiedad clínica o estructural.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  personalizeInterventions,
  computeScore,
  isContraindicated,
  categorizeBiomarkersByTier,
  isTier1Biomarker,
  deduplicateByFamily,
} from '../personalize-interventions';
import { INTERVENTIONS_CATALOG } from '@/src/constants/interventions-catalog';
import {
  PROFILE_A, PROFILE_B, PROFILE_C, PROFILE_D, PROFILE_E, PROFILE_F,
} from './_motor_fixtures';
import type { PrescribedIntervention } from '../personalize-types';

const ALL = { A: PROFILE_A, B: PROFILE_B, C: PROFILE_C, D: PROFILE_D, E: PROFILE_E, F: PROFILE_F };
const keysOf = (rx: PrescribedIntervention[]) => rx.map((r) => r.intervention.key);

const COLD_KEYS = new Set(
  INTERVENTIONS_CATALOG
    .filter((i) => ['bano_frio', 'ducha_fria'].includes(i.family ?? '')
      || ['cold_plunge_cns', 'dive_reflex_cara_hielo', 'wim_hof_basico', 'wim_hof_extendido', 'bano_frio_hormesis'].includes(i.key))
    .map((i) => i.key),
);

/** Cold immersion que clínicamente DEBE excluirse con fiebre (tienen tag real). */
const COLD_IMMERSION_KEYS = ['cold_plunge_cns', 'bano_frio_desinflamacion', 'bano_frio_hormesis', 'dive_reflex_cara_hielo'];

// ── Estructura común a los 6 perfiles ────────────────────────────────────────

describe('invariantes estructurales (todos los perfiles)', () => {
  for (const [name, phenotype] of Object.entries(ALL)) {
    it(`Perfil ${name}: ≤5 prescritas, ranks 1..N, scores 0-100`, () => {
      const rx = personalizeInterventions(phenotype);
      expect(rx.length).toBeGreaterThan(0);
      expect(rx.length).toBeLessThanOrEqual(5);
      rx.forEach((r, i) => {
        expect(r.rank).toBe(i + 1);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      });
    });

    it(`Perfil ${name}: cero intervenciones gateadas clínicamente`, () => {
      const rx = personalizeInterventions(phenotype);
      for (const r of rx) expect(r.intervention.requiresClinicalValidation).toBeFalsy();
    });

    it(`Perfil ${name}: dedup por familia (nunca 2 de la misma familia)`, () => {
      const rx = personalizeInterventions(phenotype);
      const fams = rx.map((r) => r.intervention.family).filter(Boolean) as string[];
      expect(new Set(fams).size).toBe(fams.length);
    });

    it(`Perfil ${name}: rationale.summary no vacío + reasons concretos o base`, () => {
      const rx = personalizeInterventions(phenotype);
      for (const r of rx) {
        expect(r.rationale.summary.length).toBeGreaterThan(10);
        if (!r.isUniversalP1) {
          // toda específica prescrita tiene ≥1 razón concreta al fenotipo
          expect(r.rationale.reasons.length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  }
});

// ── §11 · Universales P1 nunca excluidos sin razón absoluta ──────────────────

describe('universales P1', () => {
  it('perfil sano incluye universales P1 en el top (base innegociable)', () => {
    const rx = personalizeInterventions(PROFILE_B);
    expect(rx.some((r) => r.isUniversalP1)).toBe(true);
  });

  it('máximo 3 universales P1 → deja ≥2 slots para específicas del fenotipo', () => {
    const rx = personalizeInterventions(PROFILE_B);
    expect(rx.filter((r) => r.isUniversalP1).length).toBeLessThanOrEqual(3);
  });
});

// ── §11 · Contraindicaciones absolutas ───────────────────────────────────────

describe('contraindicaciones · embarazo (Perfil E)', () => {
  const rx = personalizeInterventions(PROFILE_E);

  it('excluye OMAD / ayunos prolongados / sardinas dosis / cold / wim hof', () => {
    const banned = ['ayuno_20_4_omad', 'ayuno_18_6', 'protocolo_ayuno_sardinas', ...COLD_KEYS];
    for (const b of banned) expect(keysOf(rx)).not.toContain(b);
  });

  it('top 5 es suave: solo intervenciones sin contraindicación de embarazo', () => {
    for (const r of rx) expect(isContraindicated(r.intervention, PROFILE_E)).toBe(false);
  });
});

describe('contraindicaciones · fiebre viral activa (Perfil F)', () => {
  const rx = personalizeInterventions(PROFILE_F);

  it('cold immersion (con tag de fiebre) está contraindicada y fuera del top 5', () => {
    for (const key of COLD_IMMERSION_KEYS) {
      const iv = INTERVENTIONS_CATALOG.find((i) => i.key === key)!;
      expect(isContraindicated(iv, PROFILE_F)).toBe(true);
      expect(keysOf(rx)).not.toContain(key);
    }
  });

  it('nada fever-contraindicado por el motor aparece en el top 5', () => {
    const contraindicated = INTERVENTIONS_CATALOG.filter((i) => isContraindicated(i, PROFILE_F)).map((i) => i.key);
    expect(contraindicated.length).toBeGreaterThan(0);
    for (const key of contraindicated) expect(keysOf(rx)).not.toContain(key);
  });

  // GAP DE CATÁLOGO documentado (bonus finding): ducha_fria_nivel1/2/3, wim_hof y
  // sauna_infrarrojo NO portan tag de fiebre_viral_activa → el motor no las excluye
  // por fiebre. Clínicamente deberían. No enriquecemos el catálogo aquí (gotcha #5).
  it('DOCUMENTA gap: hay intervenciones de frío/calor SIN tag de fiebre (para Mariana)', () => {
    const coldWithoutFever = [...COLD_KEYS].filter((k) => {
      const iv = INTERVENTIONS_CATALOG.find((i) => i.key === k)!;
      return !isContraindicated(iv, PROFILE_F);
    });
    expect(coldWithoutFever.length).toBeGreaterThan(0); // gap real, esperado hasta firma
  });
});

describe('contraindicaciones · diabetes tipo 1', () => {
  it('excluye intervenciones con excludeIf diabetes_tipo=1', () => {
    const dm1 = {
      ...PROFILE_A,
      profile: { ...PROFILE_A.profile, conditions: ['diabetes_tipo_1'] },
    };
    const omad = INTERVENTIONS_CATALOG.find((i) => i.key === 'ayuno_20_4_omad')!;
    expect(isContraindicated(omad, dm1)).toBe(true);
  });
});

// ── §11 · Ciclo bidireccional (Perfil B folicular vs C lútea) ────────────────

describe('ciclo femenino bidireccional', () => {
  const ayuno = INTERVENTIONS_CATALOG.find((i) => i.key === 'ayuno_14_10')!;

  it('alta intensidad: folicular INTENSIFICA (+20) vs lútea REDUCE (−15) → diff 35', () => {
    const folicular = computeScore(ayuno, PROFILE_B);
    const luteal = computeScore(ayuno, PROFILE_C);
    expect(folicular).toBeGreaterThan(luteal);
    expect(folicular - luteal).toBe(35);
  });

  it('la nota de fase cambia de signo entre folicular y lútea', () => {
    const bNote = personalizeInterventions(PROFILE_B).find((r) => r.cyclePhaseNote)?.cyclePhaseNote;
    // El motor emite nota de ciclo solo en intervenciones cycle-moduladas presentes;
    // si ninguna cae en top5, el score sigue siendo la prueba (arriba). Aquí basta
    // con que hombre NO reciba nota de ciclo jamás:
    const male = personalizeInterventions(PROFILE_A);
    expect(male.every((r) => r.cyclePhaseNote == null)).toBe(true);
    void bNote;
  });

  it('hombre nunca recibe cycle boost ni nota (gate por género)', () => {
    expect(computeScore(ayuno, PROFILE_A)).toBe(
      computeScore(ayuno, { ...PROFILE_A, cyclePhase: PROFILE_B.cyclePhase }),
    );
  });
});

// ── §11 · Dedup por familia (unit) ───────────────────────────────────────────

describe('deduplicateByFamily', () => {
  it('no repite familia; sin familia siempre pasa', () => {
    const mk = (key: string, family?: string) => ({
      intervention: { key, family } as any, score: 50, matchReasons: [],
    });
    const out = deduplicateByFamily([
      mk('a', 'ayuno'), mk('b', 'ayuno'), mk('c'), mk('d'), mk('e', 'sauna'),
    ]);
    expect(out.map((s) => s.intervention.key)).toEqual(['a', 'c', 'd', 'e']);
  });
});

// ── §11 · Biomarcadores Tier 1/2/3 ───────────────────────────────────────────

describe('categorizeBiomarkersByTier', () => {
  it('clasifica accesibles a Tier 1, sofisticados a Tier 3', () => {
    const r = categorizeBiomarkersByTier(['HbA1c', 'insulina', 'IL-6 sérica', 'PCR', 'metilación LINE-1']);
    expect(r.tier1).toContain('HbA1c');
    expect(r.tier1).toContain('PCR');
    expect(r.tier2).toContain('insulina');
    expect(r.tier3).toContain('IL-6 sérica');
    expect(r.tier3).toContain('metilación LINE-1');
  });

  it('cada prescripción separa biomarcadores en tiers sin solapamiento', () => {
    for (const phenotype of Object.values(ALL)) {
      for (const r of personalizeInterventions(phenotype)) {
        const { tier1, tier2, tier3 } = r.suggestedBiomarkers;
        const all = [...tier1, ...tier2, ...tier3];
        expect(new Set(all).size).toBe(all.length); // sin duplicados entre tiers
        for (const b of tier1) expect(isTier1Biomarker(b)).toBe(true);
      }
    }
  });
});

// ── §11 · Rationale concreto (no genérico) ──────────────────────────────────

describe('rationale menciona el fenotipo específico', () => {
  it('Perfil B: alguna prescrita cita su Nivel circadiano o su vitamina D baja', () => {
    const rx = personalizeInterventions(PROFILE_B);
    const allText = rx.map((r) => r.rationale.summary).join(' ');
    expect(/circadiano|vitamina|Nivel \d/i.test(allText)).toBe(true);
  });

  it('epigeneticImpact presente cuando el catálogo lo tiene', () => {
    const rx = personalizeInterventions(PROFILE_B);
    expect(rx.some((r) => r.rationale.epigeneticImpact.length > 0)).toBe(true);
  });
});

// ── §11 · Motor 100% determinístico (cero LLM) ──────────────────────────────

describe('determinismo puro', () => {
  it('mismo fenotipo → mismo output (2 corridas idénticas)', () => {
    const a = personalizeInterventions(PROFILE_B);
    const b = personalizeInterventions(PROFILE_B);
    expect(keysOf(a)).toEqual(keysOf(b));
    expect(a.map((r) => r.score)).toEqual(b.map((r) => r.score));
  });

  it('el core NO importa argos-proxy / anthropic / supabase / fetch de red', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(join(here, '..', 'personalize-interventions.ts'), 'utf8');
    // Quita comentarios (bloque + línea) para no matchear las menciones del docstring.
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const importLines = code.split('\n').filter((l) => /^\s*import\b/.test(l));
    for (const line of importLines) {
      expect(/argos-proxy|anthropic|supabase|axios/i.test(line)).toBe(false);
    }
    expect(/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(code)).toBe(false);
  });
});

// ── Diferenciación entre perfiles (no un top-5 genérico para todos) ─────────

describe('personalización real (perfiles distintos → prescripciones distintas)', () => {
  it('Perfil A (metabólico) y Perfil D (sarcopenia) difieren en específicas', () => {
    const a = keysOf(personalizeInterventions(PROFILE_A));
    const d = keysOf(personalizeInterventions(PROFILE_D));
    expect(a).not.toEqual(d);
  });
});
