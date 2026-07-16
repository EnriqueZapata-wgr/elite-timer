/**
 * prescription-core — derivaciones PURAS del fenotipo (sin supabase/react-native).
 * Testeable node-only (patrón *-core del repo). El servicio (prescription-service)
 * hace el I/O y compone estas funciones.
 *
 * Traducen las fuentes REALES del repo al shape que el motor espera:
 *  · functional_dx.roots_detected (raíces+severidad) → DXLevels (sistema+nivel).
 *  · braverman_results (conteos+primary_deficiency) → BravermanResult (low/med/high).
 *  · CanonicalMap de labs → UserLab[] (con marker del catálogo + tier).
 *  · user_chronotype (lion/bear/wolf/dolphin) → tipo doctrinal (3 + delfín transit).
 *  · fase del cycle-service ('ovulation') → fase del motor ('ovulatory').
 * + computePhenotypeHash para idempotencia del versionado.
 */
import type {
  DXLevel, BravermanResult, UserLab, UserChronotype,
  NeurotransmitterLevel, CyclePhaseName, UserPhenotype,
} from './personalize-types';

// ── DX: raíces → niveles por sistema ────────────────────────────────────────

/** Raíz del DX → sistema del vocabulario del catálogo (dx_level rules). */
export const ROOT_TO_SYSTEM: Record<string, string> = {
  estres_cronico: 'estres', cortisol_elevado_sostenido: 'estres', hrv_baja_cronica: 'estres',
  adrenalina_nocturna: 'estres',
  cortisol_matutino_bajo: 'circadiano', ritmo_circadiano_desregulado: 'circadiano',
  sobreexposicion_luz_azul: 'circadiano', deficit_exposicion_solar: 'circadiano',
  deficit_sueno_profundo: 'sueno',
  hiperinsulinemia: 'metabolismo', resistencia_insulina: 'metabolismo',
  sobrecarga_hepatica: 'metabolismo', sobrecarga_procesados: 'metabolismo',
  disbiosis: 'digestion', permeabilidad_intestinal: 'digestion',
  reflujo_funcional: 'digestion', digestion_estres_autonomico: 'digestion',
  inflamacion_silenciosa: 'inflamacion', toxicidad_ambiental: 'inflamacion',
  hipertension: 'cardiovascular',
  sedentarismo: 'movimiento', sarcopenia: 'composicion_corporal',
  dominancia_estrogenica: 'hormonal', baja_testosterona: 'hormonal',
  hipotiroidismo_funcional: 'hormonal',
  deficit_neurotransmisores: 'cognitivo',
  disfuncion_mitocondrial: 'mitocondrial', estres_oxidativo_mitocondrial: 'mitocondrial',
};

/**
 * DXLevels (sistema→nivel 1-5, 1=roto) desde raíces (severity 1-5, 5=peor).
 * Un sistema toma el nivel del PEOR de sus raíces: level = 6 − maxSeverity.
 */
export function deriveDxLevelsFromRoots(
  roots: { root_key: string; severity: number; confidence?: number }[],
  computedAt: Date,
): DXLevel[] {
  const bySystem = new Map<string, { sev: number; conf: number }>();
  for (const r of roots) {
    const system = ROOT_TO_SYSTEM[r.root_key];
    if (!system) continue;
    const sev = Math.min(5, Math.max(1, Math.round(r.severity || 3)));
    const conf = typeof r.confidence === 'number' ? r.confidence : 0.5;
    const prev = bySystem.get(system);
    if (!prev || sev > prev.sev) bySystem.set(system, { sev, conf: Math.max(conf, prev?.conf ?? 0) });
  }
  return Array.from(bySystem.entries()).map(([system, { sev, conf }]) => ({
    system: system as any,
    level: (6 - sev) as DXLevel['level'],
    computedAt,
    confidence: conf >= 0.75 ? 'high' : conf >= 0.4 ? 'medium' : 'low',
  }));
}

// ── Braverman ────────────────────────────────────────────────────────────────

export function deriveBraverman(row: {
  primary_deficiency: string | null;
  deficiency_level: string | null;
  completed_at?: string | null;
} | null): BravermanResult | null {
  if (!row) return null;
  const primary = (row.primary_deficiency ?? '').toLowerCase();
  // El NT en déficit primario → 'low'; el resto → 'medium' (solo tenemos el
  // principal déficit, no señal per-NT fina). `names` cubre grafía EN y ES.
  const nt = (names: string[]): NeurotransmitterLevel =>
    (names.some((n) => primary.includes(n)) ? 'low' : 'medium');
  return {
    dopamine: nt(['dopamin']),
    acetylcholine: nt(['acetylcholin', 'acetilcolin']),
    gaba: nt(['gaba']),
    serotonin: nt(['serotonin']),
    computedAt: row.completed_at ? new Date(row.completed_at) : new Date(),
  };
}

// ── Labs ─────────────────────────────────────────────────────────────────────

/** parameter_key canónico (español) → marker del catálogo + tier + unidad aprox. */
export const LAB_MARKER_MAP: Record<string, { marker: string; unit: string; tier: 1 | 2 | 3 }> = {
  hba1c: { marker: 'HbA1c', unit: '%', tier: 1 },
  glucosa_en_ayuno: { marker: 'glucosa_ayunas', unit: 'mg/dL', tier: 1 },
  proteina_c_reactiva_cuantitativa_pcr: { marker: 'PCR', unit: 'mg/L', tier: 1 },
  vitamina_d: { marker: 'vitamina_d', unit: 'ng/mL', tier: 1 },
  insulina: { marker: 'insulina', unit: 'µU/mL', tier: 2 },
  homair: { marker: 'HOMA-IR', unit: '', tier: 2 },
  trigliceridos: { marker: 'trigliceridos', unit: 'mg/dL', tier: 1 },
  colesterol_hdl: { marker: 'HDL', unit: 'mg/dL', tier: 1 },
  colesterol_ldl: { marker: 'LDL', unit: 'mg/dL', tier: 1 },
  apolipoproteinas_b: { marker: 'apoB', unit: 'mg/dL', tier: 2 },
  cortisol_matutino: { marker: 'cortisol_matutino', unit: 'µg/dL', tier: 2 },
  tsh: { marker: 'TSH', unit: 'µUI/mL', tier: 1 },
  ferritina: { marker: 'ferritina', unit: 'ng/mL', tier: 1 },
  homocisteina: { marker: 'homocisteina', unit: 'µmol/L', tier: 2 },
  testosterona_total: { marker: 'testosterona_total', unit: 'ng/dL', tier: 2 },
};

/** CanonicalMap (parameter_key→{value,...}) → UserLab[] (solo los mapeados). */
export function deriveLabs(canonical: Record<string, { value: number; measured_at: string }>): UserLab[] {
  const labs: UserLab[] = [];
  for (const [key, entry] of Object.entries(canonical ?? {})) {
    const map = LAB_MARKER_MAP[key];
    if (!map || typeof entry?.value !== 'number') continue;
    labs.push({
      marker: map.marker, value: entry.value, unit: map.unit, tier: map.tier,
      measuredAt: entry.measured_at ? new Date(entry.measured_at) : new Date(),
      source: 'user_upload',
    });
  }
  return labs;
}

// ── Cronotipo ────────────────────────────────────────────────────────────────

export function deriveChronotype(row: {
  chronotype?: string | null; wake_time?: string | null; sleep_time?: string | null;
  peak_focus_start?: string | null; peak_focus_end?: string | null; updated_at?: string | null;
} | null): UserChronotype | null {
  if (!row?.chronotype) return null;
  const raw = row.chronotype.toLowerCase();
  const type: UserChronotype['type'] =
    raw === 'lion' || raw === 'leon' ? 'leon'
      : raw === 'wolf' || raw === 'lobo' ? 'lobo' : 'oso';
  return {
    type,
    transitionalState: raw === 'dolphin' || raw === 'delfin' ? 'delfin' : null,
    wakeTime: (row.wake_time ?? '07:00').slice(0, 5),
    sleepTime: (row.sleep_time ?? '23:00').slice(0, 5),
    peakFocusWindow: [(row.peak_focus_start ?? '10:00').slice(0, 5), (row.peak_focus_end ?? '14:00').slice(0, 5)],
    computedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

/** Fase del cycle-service ('ovulation') → fase del motor ('ovulatory'). */
export function normalizeCyclePhase(phase: string): CyclePhaseName {
  return phase === 'ovulation' ? 'ovulatory' : (phase as CyclePhaseName);
}

/** Edad desde fecha de nacimiento (fail-soft a 35 si falta/inválida). */
export function ageFromDOB(dob: string | null | undefined, now: Date): number {
  if (!dob) return 35;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 35;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age > 0 && age < 120 ? age : 35;
}

// ── Hash de idempotencia ─────────────────────────────────────────────────────

/**
 * Hash de contenido del fenotipo (FNV-1a 64-bit sobre JSON canónico ordenado).
 * NO criptográfico — único uso: idempotencia (¿cambió el fenotipo antes de
 * recalcular?). Puro y determinístico (sin crypto nativo → testeable node-only).
 */
export function computePhenotypeHash(phenotype: UserPhenotype): string {
  const canonical = canonicalize({
    dxLevels: phenotype.dxLevels.map((d) => [d.system, d.level]).sort(),
    braverman: phenotype.braverman
      ? [phenotype.braverman.dopamine, phenotype.braverman.acetylcholine, phenotype.braverman.gaba, phenotype.braverman.serotonin]
      : null,
    labs: phenotype.labs.map((l) => [l.marker, l.value]).sort(),
    chronotype: phenotype.chronotype ? [phenotype.chronotype.type, phenotype.chronotype.transitionalState] : null,
    cyclePhase: phenotype.cyclePhase?.currentPhase ?? null,
    profile: [
      phenotype.profile.age, phenotype.profile.gender, phenotype.profile.pregnancy,
      phenotype.profile.lactancia, [...phenotype.profile.conditions].sort(),
      [...phenotype.profile.medications].sort(), [...(phenotype.profile.goals ?? [])].sort(),
      !!phenotype.profile.feverViralActive,
    ],
  });
  return fnv1a64(canonical);
}

function canonicalize(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${k}:${canonicalize((v as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

function fnv1a64(str: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}
