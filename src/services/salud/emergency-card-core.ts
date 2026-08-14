/**
 * emergency-card-core — la ficha de emergencia, núcleo PURO.
 *
 * OLA6 PIEZA D. Es la única pantalla de ATP escrita para que la lea OTRA
 * persona: un paramédico, quien te encuentre, el de urgencias. Se trae de
 * dije, de pulsera, pegada adentro del casco. Todo el diseño sale de ahí:
 *
 *   · Se abre SIN RED y SIN SESIÓN. Un hospital es exactamente el lugar donde
 *     no hay señal y donde nadie sabe tu contraseña.
 *   · Cero semáforos y cero interpretación, igual que el reporte de consulta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA REGLA DE ADMISIÓN. Esta ficha es pública. No va cifrada (ver el store) y
 * su código QR se imprime. Por eso el filtro no es técnico, es editorial:
 *
 *   ENTRA lo que cambia lo que un paramédico te hace en los primeros dos
 *   minutos, y que no le sirve a un tercero para hacerte daño.
 *
 *   NO ENTRA lo que un extraño puede aprovechar: la lista completa de
 *   medicación y suplementos (dice dónde estás mal y qué hay en tu casa), la
 *   aseguradora y el número de póliza (es una identidad que se suplanta), y
 *   el historial extenso de condiciones. Todo eso vive en el expediente,
 *   detrás de sesión, y se abre desde dentro de la app.
 *
 * Si un campo nuevo no pasa esa prueba, no va aquí: va al expediente.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Puro: sin supabase, sin react-native, sin AsyncStorage. Testeable node-only.
 */

export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'no_se'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const BLOOD_TYPE_LABEL: Record<BloodType, string> = {
  'O+': 'O positivo', 'O-': 'O negativo',
  'A+': 'A positivo', 'A-': 'A negativo',
  'B+': 'B positivo', 'B-': 'B negativo',
  'AB+': 'AB positivo', 'AB-': 'AB negativo',
  no_se: 'No lo sé',
};

export const SEVERITIES = ['leve', 'moderada', 'grave', 'anafilaxia'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABEL: Record<Severity, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  grave: 'Grave',
  anafilaxia: 'Anafilaxia',
};

/**
 * Alergias que matan. Anafilaxia a un medicamento, al látex o a un alimento.
 * NO son las alimentarias del pilar de nutrición: aquellas son preferencias,
 * estas cambian lo que te inyectan y con qué guantes te tocan.
 */
export interface Alergia {
  substance: string;
  severity: Severity;
  reaction?: string;
}

export interface Contacto {
  name: string;
  relationship?: string;
  phone: string;
}

export interface EmergencyCard {
  fullName: string;
  birthDate: string | null; // YYYY-MM-DD
  bloodType: BloodType | null;
  allergies: Alergia[];
  /** Solo la que un paramédico no puede ignorar. Lista corta, sin dosis. */
  criticalMeds: string[];
  /** Solo las que cambian el tratamiento de urgencia. Lista corta. */
  conditions: string[];
  contacts: Contacto[];
  organDonor: boolean | null;
  language: string;
  note: string;
  reviewedAt: string | null;
  updatedAt: string | null;
}

export const NOTE_MAX = 280;

/**
 * Techos duros. No son un capricho de UI: una ficha de emergencia larga es una
 * ficha que nadie lee de pie y con prisa, y una lista larga de condiciones es
 * exactamente el historial que dijimos que no iba a estar aquí.
 */
export const CONDICIONES_MAX = 6;
export const MEDS_CRITICOS_MAX = 6;

/**
 * Las condiciones que de verdad cambian una decisión en urgencias. Se ofrecen
 * como sugerencia, no como catálogo cerrado: se puede escribir otra, pero el
 * techo es el mismo.
 */
export const CONDICIONES_URGENCIA = [
  'Epilepsia',
  'Diabetes tipo 1',
  'Hemofilia',
  'Marcapasos o stent',
  'Anticoagulación',
  'Embarazo',
] as const;

/**
 * Las cuatro familias de medicación que cambian el manejo inmediato. Va la
 * FAMILIA, no la marca ni la dosis: al paramédico le sirve saber que estás
 * anticoagulado, no cuántos miligramos tomas. Y una lista de marcas le dice a
 * un extraño qué hay en tu buró.
 */
export const MEDS_CRITICOS = [
  'Anticoagulante',
  'Insulina',
  'Anticonvulsivo',
  'Inmunosupresor',
] as const;

export function emptyCard(): EmergencyCard {
  return {
    fullName: '',
    birthDate: null,
    bloodType: null,
    allergies: [],
    criticalMeds: [],
    conditions: [],
    contacts: [],
    organDonor: null,
    language: '',
    note: '',
    reviewedAt: null,
    updatedAt: null,
  };
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** Normaliza cualquier cosa (fila de DB, JSON local viejo) a una ficha válida. */
export function parseCard(raw: unknown): EmergencyCard {
  const out = emptyCard();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  out.fullName = str(r.fullName ?? r.full_name);
  out.birthDate = strOrNull(r.birthDate ?? r.birth_date);
  const bt = str(r.bloodType ?? r.blood_type);
  out.bloodType = (BLOOD_TYPES as readonly string[]).includes(bt) ? (bt as BloodType) : null;
  out.allergies = Array.isArray(r.allergies)
    ? r.allergies
      .map((a): Alergia => {
        const o = (a ?? {}) as Record<string, unknown>;
        const sev = str(o.severity);
        return {
          substance: str(o.substance).trim(),
          severity: (SEVERITIES as readonly string[]).includes(sev) ? (sev as Severity) : 'grave',
          reaction: str(o.reaction).trim() || undefined,
        };
      })
      .filter((a) => a.substance.length > 0)
    : [];
  // Tolera la forma vieja [{ name, dose }]: se queda solo con el nombre y se
  // recorta al techo. La dosis no vuelve, es dato de expediente.
  const meds = r.criticalMeds ?? r.critical_meds ?? r.medications;
  out.criticalMeds = Array.isArray(meds)
    ? meds
      .map((m) => (typeof m === 'string' ? m : str((m as Record<string, unknown>)?.name)).trim())
      .filter((m) => m.length > 0)
      .slice(0, MEDS_CRITICOS_MAX)
    : [];
  out.conditions = Array.isArray(r.conditions)
    ? r.conditions.map((c) => str(c).trim()).filter((c) => c.length > 0).slice(0, CONDICIONES_MAX)
    : [];
  out.contacts = Array.isArray(r.contacts)
    ? r.contacts
      .map((c): Contacto => {
        const o = (c ?? {}) as Record<string, unknown>;
        return {
          name: str(o.name).trim(),
          relationship: str(o.relationship).trim() || undefined,
          phone: str(o.phone).trim(),
        };
      })
      .filter((c) => c.phone.length > 0)
    : [];
  const donor = r.organDonor ?? r.organ_donor;
  out.organDonor = typeof donor === 'boolean' ? donor : null;
  out.language = str(r.language);
  out.note = str(r.note).slice(0, NOTE_MAX);
  out.reviewedAt = strOrNull(r.reviewedAt ?? r.reviewed_at);
  out.updatedAt = strOrNull(r.updatedAt ?? r.updated_at);
  return out;
}

/** Fila para Supabase. El mapeo vive aquí para que no se duplique. */
export function cardToRow(card: EmergencyCard, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    full_name: card.fullName.trim() || null,
    birth_date: card.birthDate,
    blood_type: card.bloodType,
    allergies: card.allergies,
    critical_meds: card.criticalMeds,
    conditions: card.conditions,
    contacts: card.contacts,
    organ_donor: card.organDonor,
    language: card.language.trim() || null,
    note: card.note.trim() || null,
    reviewed_at: card.reviewedAt,
  };
}

/** ¿Tiene algo que valga la pena enseñarle a un paramédico? */
export function cardHasContent(card: EmergencyCard): boolean {
  return !!(
    card.fullName.trim() ||
    card.bloodType ||
    card.allergies.length ||
    card.criticalMeds.length ||
    card.conditions.length ||
    card.contacts.length ||
    card.note.trim()
  );
}

/** Edad a partir de la fecha de nacimiento. null si no hay o no parsea. */
export function edadDe(birthDate: string | null, hoyISO: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [hy, hm, hd] = hoyISO.split('-').map(Number);
  if (!hy) return null;
  let edad = hy - by;
  if (hm < bm || (hm === bm && hd < bd)) edad -= 1;
  return edad >= 0 && edad < 130 ? edad : null;
}

// ─── Recordatorio trimestral ────────────────────────────────────────────────

export const REVISION_DIAS = 90;

/**
 * ¿Toca preguntar "¿tu medicación sigue igual?"? Se cuenta desde la última
 * revisión y, si nunca revisó, desde la última edición. Sin ficha no hay
 * recordatorio: no se le recuerda a nadie algo que no ha hecho.
 */
export function tocaRevisar(card: EmergencyCard, ahoraMs: number): boolean {
  if (!cardHasContent(card)) return false;
  const ref = card.reviewedAt ?? card.updatedAt;
  if (!ref) return true;
  const t = Date.parse(ref);
  if (Number.isNaN(t)) return true;
  return ahoraMs - t >= REVISION_DIAS * 24 * 60 * 60 * 1000;
}

// ─── Carga para el QR ───────────────────────────────────────────────────────

/**
 * Payload del QR PÚBLICO. Va la FICHA, no un link: sin red un link no sirve, y
 * en urgencias no hay red. Las llaves son de una letra porque cada byte que se
 * ahorra es un módulo menos que tiene que leer una cámara temblorosa.
 *
 * Este código se imprime y se cuelga del cuello, así que lleva EXACTAMENTE los
 * campos curados de la ficha y ni uno más. No confundir con el QR clínico, que
 * es otra cosa: ese descarga la historia clínica en un hospital, vive dentro de
 * la app y exige sesión.
 */
export function qrPayload(card: EmergencyCard): string {
  const p: Record<string, unknown> = { v: 2 };
  if (card.fullName.trim()) p.n = card.fullName.trim();
  if (card.birthDate) p.b = card.birthDate;
  if (card.bloodType) p.s = card.bloodType;
  if (card.allergies.length) p.a = card.allergies.map((a) => [a.substance, a.severity[0]]);
  if (card.criticalMeds.length) p.m = card.criticalMeds;
  if (card.conditions.length) p.c = card.conditions;
  if (card.contacts.length) p.t = card.contacts.map((c) => [c.name, c.phone]);
  if (card.organDonor != null) p.d = card.organDonor ? 1 : 0;
  if (card.language.trim()) p.l = card.language.trim();
  if (card.note.trim()) p.x = card.note.trim();
  return JSON.stringify(p);
}
