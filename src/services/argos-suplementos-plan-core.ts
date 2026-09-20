/**
 * ARGOS: el plan de suplementos COMPLETO en el contexto (20-sep-2026). Puro.
 *
 * POR QUE EXISTE: hasta hoy los suplementos entraban al contexto con `id` y
 * `name` nada mas ("tomados [Magnesio], pendientes [Omega 3]"). La fila de
 * `user_supplements` trae `reason`, `dosage`, `timing` y `notes`, y en el
 * plan Elite los escribio Enrique a mano (RPC 318, source='coach'). "Por que
 * me pusiste magnesio" es la pregunta mas probable del dia uno de un cliente
 * Elite, y sin este bloque ARGOS la contestaba inventando.
 *
 * Tres listas, separadas a proposito:
 *  - Plan del equipo (source='coach', activos): con dosis, momento, porque y
 *    nota tal como los escribio quien firma la evaluacion. ARGOS lo explica
 *    como plan de su equipo, no lo rebaja a "puedes considerar".
 *  - Propios (source distinto de 'coach', activos): lo que la persona
 *    registro por su cuenta. No son plan del equipo y asi se dice.
 *  - Pausados (is_active=false): la persona los pauso o salieron del plan
 *    anterior (318 los pasa a inactivos, no los borra). Van marcados para que
 *    ARGOS no los sugiera de nuevo ni pregunte por ellos como si faltaran.
 *
 * Regla de la casa: dato del usuario sagrado. Una dosis que nadie escribio se
 * dice "sin fijar", nunca se inventa. Cero em dashes, cero palabras rojas.
 */

/** Lo que se lee de `user_supplements` para este bloque. */
export interface FilaSuplementoArgos {
  id: string;
  name: string;
  /** Texto libre de la ficha (055). null cuando el plan no fija cantidad. */
  dosage: string | null;
  /** morning | with_food | afternoon | evening | bedtime | null. */
  timing: string | null;
  reason: string | null;
  notes: string | null;
  /** 'coach' = lo asigno el equipo (plan Elite); 'manual' = la persona. */
  source: string | null;
  is_plan: boolean | null;
  is_active: boolean | null;
  amount_per_unit: number | null;
  amount_unit: string | null;
  units_per_dose: number | null;
  /** Horas de toma cuando hay mas de una al dia (188). */
  dose_times: string[] | null;
}

export interface PlanSuplementosArgos {
  /** Quien firma el plan (interpretado_por.evaluacion de la Elite). null si no se sabe. */
  asignadoPor: string | null;
  filas: FilaSuplementoArgos[];
}

/** Tope del bloque completo; lo que sobre se resume con "(+N mas)". */
export const PLAN_SUPLEMENTOS_MAX = 3000;

export const ENCABEZADO_PLAN_EQUIPO = 'Plan de suplementos de tu equipo';
export const ENCABEZADO_PROPIOS = 'Suplementos que la persona agregó por su cuenta (no son del plan de su equipo)';
export const ENCABEZADO_PAUSADOS =
  'Suplementos pausados (no activos hoy; no los sugieras de nuevo ni preguntes por ellos como si faltaran)';
export const DOSIS_SIN_FIJAR = 'dosis sin fijar en el plan';
export const HORA_SIN_FIJAR = 'hora sin fijar';

/** Misma tabla que TIMING_OPTIONS en app/supplements.tsx, en minusculas para prosa. */
const MOMENTOS: Readonly<Record<string, string>> = {
  morning: 'mañana',
  with_food: 'con comida',
  afternoon: 'tarde',
  evening: 'noche',
  bedtime: 'antes de dormir',
};

/**
 * Regla para el modelo. Va junto a las demas reglas del contexto (una sola
 * vez, al final) y coincide con la excepcion del bloque SUPLEMENTOS Y AYUNO.
 */
export const REGLA_PLAN_SUPLEMENTOS =
  `REGLA PLAN DE SUPLEMENTOS: el renglón "${ENCABEZADO_PLAN_EQUIPO}" ya lo definió su equipo ATP. ` +
  'Explícalo como plan de su equipo con la dosis, el momento y el porqué tal como están escritos; ' +
  `no lo rebajes a "puedes considerar" ni lo cuestiones. Donde diga "${DOSIS_SIN_FIJAR}" no inventes una cantidad: ` +
  'di que el plan no la fija y que lo vea con su equipo. Los pausados no se sugieren de nuevo ni se preguntan como faltantes. ' +
  // 20-sep-2026: el resumen de la evaluación Elite también habla de suplementos
  // ("fuente principal"), pero es una foto del día de la evaluación; el renglón
  // vivo sale de user_supplements, que el equipo ajusta después.
  `Si el resumen de la evaluación y el renglón "${ENCABEZADO_PLAN_EQUIPO}" difieren en dosis, momento, o en si un suplemento ` +
  'sigue o está pausado, manda el renglón del plan: es el que su equipo ajustó después de la evaluación.';

export function esDelEquipo(f: FilaSuplementoArgos): boolean {
  return f.source === 'coach';
}

export function estaActivo(f: FilaSuplementoArgos): boolean {
  // La columna tiene DEFAULT true (055): null cuenta como activo, igual que el RPC 318.
  return f.is_active !== false;
}

export function momentoTexto(timing: string | null | undefined): string {
  if (!timing) return HORA_SIN_FIJAR;
  return MOMENTOS[timing] ?? timing;
}

/**
 * Texto que el RPC 318 guarda en `dosage` cuando el plan no fija cantidad
 * (COALESCE a 'Sin dosis fijada'). Aqui se traduce a DOSIS_SIN_FIJAR para que
 * la regla del modelo tenga una sola frase que buscar.
 *
 * 20-sep-2026: la consola escribe `dosage: '—'` cuando el coach deja la dosis
 * vacia. Un guion (em dash, en dash o guion simple), solo o repetido, cuenta
 * como dosis sin fijar; sin esto ARGOS decia "Magnesio: —, noche".
 */
const FICHA_SIN_DOSIS = /^(?:sin dosis fijada\.?|[-\u2013\u2014]+)$/i;

/** Dosis en prosa: la ficha primero; si no, se arma de las columnas numericas; si no, "sin fijar". */
export function dosisTexto(f: FilaSuplementoArgos): string {
  // '' y solo espacios quedan en '' por el trim; guiones y la frase del RPC los atrapa la regex.
  const ficha = typeof f.dosage === 'string' ? f.dosage.trim() : '';
  if (ficha && !FICHA_SIN_DOSIS.test(ficha)) return ficha;
  const cantidad = typeof f.amount_per_unit === 'number' && f.amount_unit ? `${f.amount_per_unit} ${f.amount_unit}` : '';
  const unidades = typeof f.units_per_dose === 'number' ? `${f.units_per_dose} por toma` : '';
  if (cantidad && unidades) return `${unidades} de ${cantidad}`;
  return cantidad || unidades || DOSIS_SIN_FIJAR;
}

function limpiar(s: string | null | undefined): string {
  return typeof s === 'string' ? s.trim() : '';
}

/** Renglon completo de un suplemento del plan: nombre, dosis, momento, porque y nota. */
export function renglonSuplemento(f: FilaSuplementoArgos, conPorQue: boolean): string {
  const tomas = Array.isArray(f.dose_times) && f.dose_times.length >= 2
    ? `, tomas a las ${f.dose_times.join(' y ')}`
    : '';
  let r = `${f.name.trim()}: ${dosisTexto(f)}, ${momentoTexto(f.timing)}${tomas}`;
  if (conPorQue) {
    const porQue = limpiar(f.reason);
    const nota = limpiar(f.notes);
    if (porQue) r += `. Por qué: ${porQue}`;
    if (nota) r += ` Nota: ${nota}`;
  }
  return r.endsWith('.') ? r : `${r}.`;
}

/** Mete renglones mientras quepan en `max`; si sobran, lo dice con un conteo. */
function listaConTope(encabezado: string, items: string[], separador: string, max: number): string {
  const armar = (n: number) => {
    const restantes = items.length - n;
    return `${encabezado}${items.slice(0, n).join(separador)}${restantes ? `${separador}(+${restantes} más)` : ''}`;
  };
  let n = 0;
  while (n < items.length && armar(n + 1).length <= max) n += 1;
  return n === 0 ? '' : armar(n);
}

/**
 * El bloque para el contexto, en renglones. Vacio si no hay filas. El plan del
 * equipo va primero y completo (porque y nota); propios y pausados van en una
 * linea cada uno, sin porque: ahi lo importante es que existen.
 */
export function construirBloquePlanSuplementos(plan: PlanSuplementosArgos | null | undefined): string {
  if (!plan || !Array.isArray(plan.filas) || plan.filas.length === 0) return '';
  const filas = plan.filas.filter((f) => f && typeof f.name === 'string' && f.name.trim());
  const equipo = filas.filter((f) => estaActivo(f) && esDelEquipo(f));
  const propios = filas.filter((f) => estaActivo(f) && !esDelEquipo(f));
  const pausados = filas.filter((f) => !estaActivo(f));
  const partes: string[] = [];
  let restante = PLAN_SUPLEMENTOS_MAX;

  if (equipo.length) {
    const firma = limpiar(plan.asignadoPor);
    const enc = `${ENCABEZADO_PLAN_EQUIPO} (asignado por ${firma || 'tu equipo ATP'}):\n`;
    const t = listaConTope(enc, equipo.map((f) => `- ${renglonSuplemento(f, true)}`), '\n', restante);
    if (t) { partes.push(t); restante -= t.length + 1; }
  }
  if (propios.length && restante > 80) {
    const t = listaConTope(`${ENCABEZADO_PROPIOS}: `, propios.map((f) => renglonSuplemento(f, false)), ' ', restante);
    if (t) { partes.push(t); restante -= t.length + 1; }
  }
  if (pausados.length && restante > 80) {
    const items = pausados.map((f) => `${f.name.trim()}${esDelEquipo(f) ? ' (del plan)' : ' (propio)'}`);
    const t = listaConTope(`${ENCABEZADO_PAUSADOS}: `, items, '; ', restante);
    if (t) partes.push(`${t}.`);
  }
  return partes.join('\n');
}
