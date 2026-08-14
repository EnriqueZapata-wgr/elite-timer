/**
 * emergency-card-core — la ficha de emergencia, núcleo PURO.
 *
 * OLA6 PIEZA D. Es la única pantalla de ATP escrita para que la lea OTRA
 * persona: un paramédico, quien te encuentre, el de urgencias. Todo el diseño
 * sale de ahí:
 *
 *   · Se abre SIN RED y SIN SESIÓN. Un hospital es exactamente el lugar donde
 *     no hay señal y donde nadie sabe tu contraseña.
 *   · Las alergias duras NO se mezclan con las alimentarias del pilar de
 *     nutrición. Aquellas son preferencias; estas cambian una decisión clínica.
 *   · La medicación se puede sembrar desde el protocolo activo, pero solo con
 *     confirmación explícita: el protocolo ATP no es una prescripción y no se
 *     le puede decir a un médico que lo es.
 *   · Cero semáforos y cero interpretación, igual que el reporte de consulta.
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

export interface Alergia {
  substance: string;
  severity: Severity;
  reaction?: string;
}

export interface Medicamento {
  name: string;
  dose?: string;
  frequency?: string;
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
  medications: Medicamento[];
  medicationsFromProtocolAt: string | null;
  conditions: string[];
  contacts: Contacto[];
  hasPacemaker: boolean;
  implants: string;
  organDonor: boolean | null;
  insurerName: string;
  insurerPolicy: string;
  language: string;
  note: string;
  reviewedAt: string | null;
  updatedAt: string | null;
}

export const NOTE_MAX = 280;

export function emptyCard(): EmergencyCard {
  return {
    fullName: '',
    birthDate: null,
    bloodType: null,
    allergies: [],
    medications: [],
    medicationsFromProtocolAt: null,
    conditions: [],
    contacts: [],
    hasPacemaker: false,
    implants: '',
    organDonor: null,
    insurerName: '',
    insurerPolicy: '',
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
  out.medications = Array.isArray(r.medications)
    ? r.medications
      .map((m): Medicamento => {
        const o = (m ?? {}) as Record<string, unknown>;
        return {
          name: str(o.name).trim(),
          dose: str(o.dose).trim() || undefined,
          frequency: str(o.frequency).trim() || undefined,
        };
      })
      .filter((m) => m.name.length > 0)
    : [];
  out.medicationsFromProtocolAt = strOrNull(r.medicationsFromProtocolAt ?? r.medications_from_protocol_at);
  out.conditions = Array.isArray(r.conditions)
    ? r.conditions.map((c) => str(c).trim()).filter((c) => c.length > 0)
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
  out.hasPacemaker = r.hasPacemaker === true || r.has_pacemaker === true;
  out.implants = str(r.implants);
  const donor = r.organDonor ?? r.organ_donor;
  out.organDonor = typeof donor === 'boolean' ? donor : null;
  out.insurerName = str(r.insurerName ?? r.insurer_name);
  out.insurerPolicy = str(r.insurerPolicy ?? r.insurer_policy);
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
    medications: card.medications,
    medications_from_protocol_at: card.medicationsFromProtocolAt,
    conditions: card.conditions,
    contacts: card.contacts,
    has_pacemaker: card.hasPacemaker,
    implants: card.implants.trim() || null,
    organ_donor: card.organDonor,
    insurer_name: card.insurerName.trim() || null,
    insurer_policy: card.insurerPolicy.trim() || null,
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
    card.medications.length ||
    card.conditions.length ||
    card.contacts.length ||
    card.hasPacemaker ||
    card.implants.trim() ||
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
 * Payload del QR. Va la FICHA, no un link: sin red un link no sirve, y en
 * urgencias no hay red. Las llaves son de una letra porque cada byte que se
 * ahorra es un módulo menos que tiene que leer una cámara temblorosa.
 *
 * Se recorta a lo que un paramédico usa en los primeros dos minutos.
 */
export function qrPayload(card: EmergencyCard): string {
  const p: Record<string, unknown> = { v: 1 };
  if (card.fullName.trim()) p.n = card.fullName.trim();
  if (card.birthDate) p.b = card.birthDate;
  if (card.bloodType) p.s = card.bloodType;
  if (card.allergies.length) p.a = card.allergies.map((a) => [a.substance, a.severity[0]]);
  if (card.medications.length) p.m = card.medications.map((m) => [m.name, m.dose ?? ''].filter(Boolean).join(' '));
  if (card.conditions.length) p.c = card.conditions;
  if (card.contacts.length) p.t = card.contacts.map((c) => [c.name, c.phone]);
  if (card.hasPacemaker) p.p = 1;
  if (card.implants.trim()) p.i = card.implants.trim();
  if (card.organDonor != null) p.d = card.organDonor ? 1 : 0;
  if (card.language.trim()) p.l = card.language.trim();
  if (card.note.trim()) p.x = card.note.trim();
  return JSON.stringify(p);
}
