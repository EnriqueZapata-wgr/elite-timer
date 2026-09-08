/**
 * consola-core — la logica pura de la consola de Enrique (8-sep-2026).
 *
 * POR QUE EXISTE: Enrique carga la evaluacion de un cliente y despues queda
 * ciego. Este archivo decide, sin tocar red ni React, las cuatro respuestas
 * que necesita de un vistazo: si el cliente esta vivo, si esta cumpliendo,
 * si subio algo nuevo y que le toca a el.
 *
 * LA REGLA QUE MANDA AQUI (8-sep-2026, pedido explicito del dueno):
 * "no hay dato" y "no cumplio" son cosas distintas y JAMAS se pintan igual.
 * Un cero falso hace que Enrique le hable mal a un cliente que si esta
 * cumpliendo. Por eso `adherenciaIntervenciones` devuelve una union: o un
 * porcentaje con su fraccion visible, o un motivo escrito de por que no hay
 * numero. Nunca un 0 de relleno.
 *
 * Cero imports: corre en node para sus tests.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Exclusiones nominales
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perfiles que NUNCA entran a la consola, con el motivo escrito.
 *
 * Mariana (8-sep-2026): tiene cuenta en esta base y ademas es coach con sus
 * propios clientes en `coach_clients`. Sus datos de salud no son de Enrique y
 * no se muestran. El filtro de servidor (coach_id = Enrique) ya la deja fuera
 * de la lista de clientes; esta lista es el segundo candado, el que cubre la
 * pantalla de "por vincular", que si lee `profiles`.
 */
export const PERFILES_EXCLUIDOS: Readonly<Record<string, string>> = {
  '7503a669-ab9c-41ab-a38a-365c0af672a6':
    'Mariana. Coach con clientes propios, no cliente de Enrique. Sus datos de salud no se muestran.',
};

/** El glifo de sin dato. Marcador, nunca prosa. */
export const SIN_DATO = '—';

export function estaExcluido(userId: string): boolean {
  return Object.prototype.hasOwnProperty.call(PERFILES_EXCLUIDOS, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Dias de calendario
// ─────────────────────────────────────────────────────────────────────────────

/** Dias de calendario entre dos fechas 'YYYY-MM-DD'. Positivo si `b` es posterior. */
export function diasEntre(a: string, b: string): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))
    - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86400000);
}

/** 'YYYY-MM-DD' del dia `n` dias antes de `hoy`. */
export function restarDias(hoy: string, n: number): string {
  const d = new Date(Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 1, +hoy.slice(8, 10)));
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Como se lee una antiguedad en dias. Sin em dashes: es copy de usuario. */
export function etiquetaDias(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 14) return 'hace 1 semana';
  if (dias < 31) return `hace ${Math.floor(dias / 7)} semanas`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)} meses`;
  return 'hace más de un año';
}

// ─────────────────────────────────────────────────────────────────────────────
// Senal de vida
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una fuente de actividad: la fecha mas reciente en que ESA tabla vio al
 * cliente. `null` = esa tabla nunca lo vio.
 *
 * OJO CON EL NOMBRE: esto NO es "cuando abrio la app". La base no guarda
 * sesiones (no hay last_seen_at en `profiles` ni tabla de aperturas), asi que
 * lo unico honesto que se puede medir es "cuando dejo un rastro": marco una
 * intervencion, registro comida, sumo electrones, hablo con ARGOS. La consola
 * lo llama "ultima senal" y nombra la fuente, para que Enrique sepa que esta
 * viendo. Ver FLAG en el informe.
 */
export interface FuenteSenal {
  /** Como se nombra en pantalla: 'intervenciones', 'comida', 'electrones'... */
  fuente: string;
  /** 'YYYY-MM-DD' o null si esa fuente no tiene nada de este cliente. */
  fecha: string | null;
}

export type Senal =
  | { estado: 'ok'; fecha: string; dias: number; fuente: string }
  | { estado: 'sinDato' };

/** La senal mas reciente entre todas las fuentes. Sin ninguna fuente con fecha: sinDato. */
export function senalDeVida(fuentes: readonly FuenteSenal[], hoy: string): Senal {
  let mejor: FuenteSenal | null = null;
  for (const f of fuentes) {
    if (!f.fecha) continue;
    if (!mejor || f.fecha > (mejor.fecha as string)) mejor = f;
  }
  if (!mejor || !mejor.fecha) return { estado: 'sinDato' };
  return {
    estado: 'ok',
    fecha: mejor.fecha,
    dias: Math.max(0, diasEntre(mejor.fecha, hoy)),
    fuente: mejor.fuente,
  };
}

/**
 * Que tan frio esta. Los cortes son de negocio, no de estadistica: a quien
 * lleva una semana sin dejar rastro es a quien hay que hablarle.
 */
export type Temperatura = 'hoy' | 'reciente' | 'enfriando' | 'frio';

export function temperatura(dias: number): Temperatura {
  if (dias <= 0) return 'hoy';
  if (dias <= 2) return 'reciente';
  if (dias <= 6) return 'enfriando';
  return 'frio';
}

/** Dias sin senal a partir de los cuales la consola levanta un pendiente. */
export const DIAS_PARA_HABLARLE = 7;

// ─────────────────────────────────────────────────────────────────────────────
// Adherencia
// ─────────────────────────────────────────────────────────────────────────────

/** Ventana de lectura de adherencia. Catorce dias: dos semanas de habito. */
export const VENTANA_ADHERENCIA_DIAS = 14;

export interface IntervencionActiva {
  /** id de la fila en user_interventions. */
  id: string;
  /** 'YYYY-MM-DD' en que se activo; null en filas viejas sin activated_at. */
  activadaEl: string | null;
}

export interface CompletadoDia {
  /** user_intervention_id. */
  intervencionId: string;
  /** 'YYYY-MM-DD'. */
  fecha: string;
}

/**
 * Por que NO hay porcentaje. Cada motivo es una frase distinta en pantalla:
 *  - 'sin-intervenciones': Enrique todavia no le puso nada. No es incumplimiento.
 *  - 'recien-cargado'    : lo que le puso empieza hoy. Todavia no hay que medir.
 *  - 'sin-senal'         : hay intervenciones y hay dias que medir, pero el
 *                          cliente no ha dejado NINGUN rastro en la ventana.
 *                          Un 0% aqui diria "no cumplio" cuando lo que pasa es
 *                          que no sabemos: puede estar cumpliendo sin registrar.
 */
export type MotivoSinAdherencia = 'sin-intervenciones' | 'recien-cargado' | 'sin-senal';

export type Adherencia =
  | { estado: 'ok'; pct: number; hechos: number; esperados: number }
  | { estado: 'sinDato'; motivo: MotivoSinAdherencia };

/**
 * Adherencia = dias-intervencion marcados / dias-intervencion esperados en la
 * ventana. Se cuenta por PAR (intervencion, dia), no por fila: dos marcas del
 * mismo dia son un dia.
 *
 * Esperados de una intervencion = dias de la ventana que caen en o despues de
 * su `activadaEl`. Lo que Enrique cargo ayer no se juzga con catorce dias.
 *
 * `huboSenal` es la salvaguarda del cero falso: viene de `senalDeVida` sobre la
 * misma ventana. Sin senal no se emite numero, se emite motivo.
 */
export function adherenciaIntervenciones(
  intervenciones: readonly IntervencionActiva[],
  completados: readonly CompletadoDia[],
  hoy: string,
  huboSenal: boolean,
  ventanaDias: number = VENTANA_ADHERENCIA_DIAS,
): Adherencia {
  if (intervenciones.length === 0) return { estado: 'sinDato', motivo: 'sin-intervenciones' };

  const desde = restarDias(hoy, ventanaDias - 1);
  const vivas = new Set<string>();
  let esperados = 0;
  for (const iv of intervenciones) {
    vivas.add(iv.id);
    const arranque = iv.activadaEl && iv.activadaEl > desde ? iv.activadaEl : desde;
    const dias = diasEntre(arranque, hoy) + 1;
    if (dias > 0) esperados += Math.min(dias, ventanaDias);
  }
  if (esperados === 0) return { estado: 'sinDato', motivo: 'recien-cargado' };

  const pares = new Set<string>();
  for (const c of completados) {
    if (!vivas.has(c.intervencionId)) continue;
    if (c.fecha < desde || c.fecha > hoy) continue;
    pares.add(`${c.intervencionId}|${c.fecha}`);
  }
  const hechos = pares.size;

  if (hechos === 0 && !huboSenal) return { estado: 'sinDato', motivo: 'sin-senal' };

  return { estado: 'ok', pct: Math.min(100, Math.round((hechos / esperados) * 100)), hechos, esperados };
}

/** Como se lee un motivo de sin dato. Copy de usuario: sin em dashes. */
export const TEXTO_SIN_ADHERENCIA: Readonly<Record<MotivoSinAdherencia, string>> = {
  'sin-intervenciones': 'Sin intervenciones activas. No hay nada que medir todavía.',
  'recien-cargado': 'Lo que le cargaste empieza hoy. Todavía no hay días que medir.',
  'sin-senal': 'No hay dato. No ha dejado ningún registro en estos días, así que no se puede saber si cumple.',
};

// ─────────────────────────────────────────────────────────────────────────────
// El cliente como lo ve la consola
// ─────────────────────────────────────────────────────────────────────────────

export interface ClienteConsola {
  id: string;
  nombre: string;
  email: string;
  /** profiles.tier tal cual. */
  tier: string | null;
  /** profiles.tier_expires_at en 'YYYY-MM-DD', o null si no vence. */
  accesoVence: string | null;
  /** Evaluacion Elite vigente (functional_dx con elite_v3), si la hay. */
  evaluacion: { version: number; fecha: string } | null;
  /** Mapa funcional de ARGOS mas reciente, si lo hay. Es el insumo del seguimiento. */
  dxFecha: string | null;
  /** Suplementos activos asignados. */
  suplementosActivos: number;
  /** Objetivos declarados en el cuestionario maestro (B.1). Vacio = sin dato. */
  objetivos: readonly string[];
  senal: Senal;
  adherencia: Adherencia;
  /** Lo nuevo del cliente desde la ultima vez, ya resuelto. */
  novedades: readonly Novedad[];
}

export interface Novedad {
  tipo: 'laboratorios' | 'evaluacion' | 'sintomas' | 'cuestionario';
  fecha: string;
  texto: string;
}

/**
 * Elite = tiene evaluacion Elite cargada, o tier elite vigente. La evaluacion
 * manda sobre el tier: el dato del cliente no se apaga porque venza un cobro
 * (misma regla que evaluacion-elite.tsx).
 */
export function esElite(c: Pick<ClienteConsola, 'tier' | 'evaluacion'>): boolean {
  if (c.evaluacion) return true;
  return (c.tier ?? '').toLowerCase() === 'elite';
}

/**
 * Seguimiento = el otro producto. Gente que NO es Elite hoy pero que ya tiene
 * material de antes: un mapa funcional o suplementos asignados. A esos se les
 * vende seguimiento.
 */
export function esSeguimiento(c: Pick<ClienteConsola, 'tier' | 'evaluacion' | 'dxFecha' | 'suplementosActivos'>): boolean {
  if (esElite(c)) return false;
  return Boolean(c.dxFecha) || c.suplementosActivos > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pendientes: que le toca a Enrique
// ─────────────────────────────────────────────────────────────────────────────

export type TipoPendiente =
  | 'sin-evaluacion'
  | 'acceso-vencido'
  | 'acceso-por-vencer'
  | 'nunca-entro'
  | 'sin-senal';

export interface Pendiente {
  tipo: TipoPendiente;
  texto: string;
  /** 2 urge, 1 conviene, 0 informativo. Ordena la lista. */
  urgencia: 0 | 1 | 2;
}

/** Dias antes del vencimiento en que la consola empieza a avisar. */
export const DIAS_AVISO_VENCIMIENTO = 14;

export function pendientesDeCliente(c: ClienteConsola, hoy: string): Pendiente[] {
  const out: Pendiente[] = [];

  if (!c.evaluacion) {
    out.push({
      tipo: 'sin-evaluacion',
      texto: 'Sin evaluación cargada',
      urgencia: 2,
    });
  }

  if (c.accesoVence) {
    const faltan = diasEntre(hoy, c.accesoVence);
    if (faltan < 0) {
      out.push({ tipo: 'acceso-vencido', texto: `Acceso vencido ${etiquetaDias(-faltan)}`, urgencia: 2 });
    } else if (faltan <= DIAS_AVISO_VENCIMIENTO) {
      out.push({
        tipo: 'acceso-por-vencer',
        texto: faltan === 0 ? 'El acceso vence hoy' : `El acceso vence en ${faltan} días`,
        urgencia: 1,
      });
    }
  }

  if (c.senal.estado === 'sinDato') {
    out.push({ tipo: 'nunca-entro', texto: 'Nunca ha dejado un registro', urgencia: 2 });
  } else if (c.senal.dias >= DIAS_PARA_HABLARLE) {
    out.push({ tipo: 'sin-senal', texto: `Sin señal ${etiquetaDias(c.senal.dias)}`, urgencia: 1 });
  }

  return out.sort((a, b) => b.urgencia - a.urgencia);
}

/** La urgencia mas alta del cliente. Sin pendientes: -1, para que caiga al final. */
export function urgenciaMaxima(c: ClienteConsola, hoy: string): number {
  const p = pendientesDeCliente(c, hoy);
  return p.length === 0 ? -1 : p[0].urgencia;
}

/**
 * El orden de la lista: primero a quien hay que hablarle hoy.
 * Urgencia desc, luego mas dias sin senal, luego nombre. Determinista.
 */
export function ordenarPorAtencion(clientes: readonly ClienteConsola[], hoy: string): ClienteConsola[] {
  const conPeso = clientes.map((c) => ({
    c,
    u: urgenciaMaxima(c, hoy),
    d: c.senal.estado === 'sinDato' ? Number.MAX_SAFE_INTEGER : c.senal.dias,
  }));
  conPeso.sort((a, b) => (b.u - a.u) || (b.d - a.d) || a.c.nombre.localeCompare(b.c.nombre, 'es'));
  return conPeso.map((x) => x.c);
}

/** El renglon de resumen que se lee bajo el nombre en la lista. */
export function resumenDeLista(c: ClienteConsola): string {
  const partes: string[] = [];
  partes.push(c.senal.estado === 'sinDato' ? 'Sin señal' : `Señal ${etiquetaDias(c.senal.dias)}`);
  partes.push(c.adherencia.estado === 'ok' ? `${c.adherencia.pct}% de lo asignado` : 'Adherencia sin dato');
  return partes.join(' · ');
}
