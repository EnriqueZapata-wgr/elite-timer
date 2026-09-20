/**
 * HOY para un cliente Elite (20-sep-2026): la logica PURA que decide que ve
 * en el hero, que puertas tiene a su producto y como se arma "Que hacer hoy"
 * desde su evaluacion. Cero React, cero supabase; se verifica con
 * `node scripts/run-tests-sin-vitest.js src/services/hoy/__tests__/elite-hoy-core.test.ts`.
 *
 * Por que existe: hasta hoy HOY no sabia que existia la evaluacion Elite. El
 * hero leia `lab_values` y `edad_atp_calculations` (lo que la persona sube y
 * calcula sola) y la carga Elite (migraciones 318 y 321) escribe
 * `functional_dx.sources_snapshot.elite_v3` y `user_supplements`; no toca
 * labs. Un cliente con su evaluacion cargada veia "Sube tu primer estudio", y
 * uno con labs viejos veia SU calculo viejo y no la Edad ATP que Enrique le
 * puso. Dos Edades ATP y dos semaforos (la matriz V7 de la app contra el
 * `estado` que Enrique escribio marcador por marcador) en la misma app.
 *
 * Reglas de la casa que se hacen cumplir aqui:
 *  - La evaluacion manda por EXISTENCIA, no por nivel: si hay `elite_v3`, el
 *    hero la muestra aunque el nivel no se haya podido leer.
 *  - Nunca se le quita a nadie lo que ya tenia: sin evaluacion y sin nivel
 *    Elite, el hero viejo sigue existiendo tal cual ('labs').
 *  - "No se pudo leer" y "no hay" son estados distintos, siempre.
 *  - Nada aqui calcula estados ni rangos: el semaforo es el `estado` que
 *    firmo una persona (att / sub / opt).
 */
import type { EliteEstado, EliteMarcador, ElitePalanca, EliteV3 } from '@/src/services/elite/elite-v3-core';
import { esElite, type Tier } from '@/src/services/subscription/tier-logic';
import { PACK_BY_KEY } from '@/src/constants/packs';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import type { EdadHero } from './hero-laboratorios-core';
import { ACCIONES_HOY, type AccionHoy, type MarcadorFuera } from './que-hacer-hoy-core';

// ---------------------------------------------------------------------------
// Nivel y lectura: lo que el hero necesita saber para decidir
// ---------------------------------------------------------------------------

/** Lo que useSubscription sabe del nivel, en la forma minima que HOY necesita. */
export interface NivelHoy {
  tier: Tier;
  /** El nivel todavia se esta leyendo. */
  cargando: boolean;
  /** La lectura del nivel fallo: `tier` es el ultimo conocido (fail-open). */
  noSePudoLeer: boolean;
  /** El hook confirmo que existe una fila `functional_dx` con `elite_v3`. */
  tieneEvaluacionElite: boolean;
  /** La lectura de existencia fallo: `tieneEvaluacionElite` esta en false por no saber. */
  evaluacionEliteNoSePudoLeer: boolean;
}

export type LecturaEliteHero =
  | { estado: 'cargando' }
  /** `formato`: hay fila y esta version de la app no la entiende (reintentar no la arregla; actualizar si). */
  | { estado: 'fallo'; motivo?: 'lectura' | 'formato' }
  | { estado: 'ok'; evaluacion: EliteV3 | null };

/**
 * `evaluacion`: hay evaluacion vigente y se pinta.
 * `en_camino`: es cliente Elite y Enrique todavia no carga su evaluacion.
 * `no_se_pudo_leer`: sabemos que hay algo Elite y no se pudo leer (reintentar).
 * `cargando`: no hay con que decidir todavia.
 * `labs`: no es Elite ni tiene evaluacion; el hero viejo decide por su cuenta.
 */
export type EstadoHeroElite = 'cargando' | 'evaluacion' | 'en_camino' | 'no_se_pudo_leer' | 'labs';

/** Cuanto espera el hero a la lectura Elite y al nivel antes de soltar la pantalla con Reintentar. */
export const TOPE_HERO_ELITE_MS = 10_000;

/**
 * `vencido` (20-sep-2026, ronda de arreglos): paso el tope y lo que siga en
 * vuelo se trata como fallo de lectura. Antes "Leyendo tus datos..." no
 * tenia tope ni boton: sin labs, el hero de TODOS esperaba al nivel de
 * RevenueCat. Con el tope, si es Elite o no se sabe, "No pudimos leer tu
 * evaluacion" con Reintentar; si el nivel se leyo y no es Elite, el hero
 * viejo. Cuando algo resuelve tarde, la decision se rehace sola con lo nuevo.
 */
export function decidirHeroElite(lectura: LecturaEliteHero, nivel: NivelHoy, opts?: { vencido?: boolean }): EstadoHeroElite {
  const vencido = opts?.vencido === true;
  // Existencia primero: la evaluacion se pinta aunque el nivel no se sepa.
  if (lectura.estado === 'ok' && lectura.evaluacion) return 'evaluacion';
  const algoElite = esElite(nivel.tier) || nivel.tieneEvaluacionElite;
  const fallo = lectura.estado === 'fallo' || (lectura.estado === 'cargando' && vencido);
  if (fallo) {
    // Si sabemos que hay algo Elite, se dice y se reintenta. Si la existencia
    // tampoco se pudo leer, NO sabemos que no hay: nunca 'labs' ("Sube tu
    // primer estudio") a quien puede tener su evaluacion guardada.
    if (algoElite || nivel.evaluacionEliteNoSePudoLeer) return 'no_se_pudo_leer';
    // Nivel todavia en vuelo: se espera (o, vencido el tope, se reintenta).
    if (nivel.cargando) return vencido ? 'no_se_pudo_leer' : 'cargando';
    // Nivel leido y sin nada Elite: el hero viejo sigue su camino (y su
    // propio fallo, si lo hay).
    return 'labs';
  }
  if (lectura.estado === 'cargando') return 'cargando';
  // Lectura ok y sin evaluacion.
  if (esElite(nivel.tier)) return 'en_camino';
  // El hook dice que existe y la lectura completa dice que no: contradiccion
  // (RLS, formato). Nunca se le dice "sube tu estudio" a quien tiene evaluacion.
  if (nivel.tieneEvaluacionElite) return 'no_se_pudo_leer';
  // Nivel en vuelo y sin fallo: se espera, para no pintarle "Sube tu primer
  // estudio" a un cliente Elite durante medio segundo. Vencido el tope, no
  // se sabe si es Elite: se dice y se reintenta (nunca "sube tu estudio").
  if (nivel.cargando && !nivel.noSePudoLeer) return vencido ? 'no_se_pudo_leer' : 'cargando';
  return 'labs';
}

/**
 * 20-sep-2026 (ronda de arreglos): si `functional_dx` no se pudo leer, la
 * terna de "Que hacer hoy" solo se cae cuando NO sabemos que no hay plan:
 * es Elite, el hook vio la evaluacion, o el nivel o la existencia no se
 * pudieron leer (o siguen en vuelo). Si el nivel se leyo, no es Elite y el
 * hook confirmo que no hay evaluacion, sigue lo de siempre (fail-open para
 * quien no tiene plan, sin inventar nada). Sin `nivel` no se sabe: fatal.
 */
export function falloEvaluacionEsFatal(nivel: NivelHoy | null | undefined): boolean {
  if (!nivel) return true;
  return nivel.cargando || nivel.noSePudoLeer || nivel.evaluacionEliteNoSePudoLeer
    || esElite(nivel.tier) || nivel.tieneEvaluacionElite;
}

/** Lo que identifica la fila vigente sin leer el JSON (misma idea que argos-elite-contexto). */
export interface VersionVistaElite {
  version: number | null;
  created_at: string | null;
}

/**
 * 20-sep-2026 (ronda de arreglos): la cache de la evaluacion en HOY ya no
 * relee el JSON completo cada pocos segundos; verifica `version, created_at`
 * y solo relee si cambio. Nada contra nada es "igual"; algo contra nada es
 * cambio (aparecio o desaparecio); con las dos, manda `version` y, a igual
 * version, `created_at` cuando las dos lo traen.
 */
export function cambioVersionElite(previa: VersionVistaElite | null, actual: VersionVistaElite | null): boolean {
  if (!previa && !actual) return false;
  if (!previa || !actual) return true;
  if (previa.version !== null && actual.version !== null && previa.version !== actual.version) return true;
  if (previa.created_at !== null && actual.created_at !== null) return previa.created_at !== actual.created_at;
  return previa.version === null || actual.version === null;
}

/**
 * La pildora "N electrones · Rank" es ruido de app publica para quien recibe
 * su producto. Se oculta por nivel (Elite) o por existencia de la evaluacion,
 * y tambien mientras el nivel se lee (para no pintarla medio segundo a un
 * cliente Elite); la economia sigue viva, solo no se pinta en HOY.
 */
export function ocultarPildoraEconomia(nivel: Pick<NivelHoy, 'tier' | 'tieneEvaluacionElite' | 'cargando'>): boolean {
  return nivel.cargando || esElite(nivel.tier) || nivel.tieneEvaluacionElite;
}

// ---------------------------------------------------------------------------
// El hero con evaluacion
// ---------------------------------------------------------------------------

/** Todos los marcadores comentados, en el orden del documento (grupos y composicion). */
export function marcadoresDeEvaluacion(e: EliteV3): EliteMarcador[] {
  return e.marcadores.grupos.flatMap((g) => g.marcadores).concat(e.composicion.filas);
}

/**
 * Los tres del hero segun el `estado` que Enrique puso: primero los `att` en
 * el orden del documento (su orden es su prioridad), y si son menos de tres,
 * los `sub`. Sin duplicar llave. Nada de la matriz V7 aqui.
 */
export function marcadoresEliteParaHero(e: EliteV3, n = 3): EliteMarcador[] {
  const todos = marcadoresDeEvaluacion(e);
  const out: EliteMarcador[] = [];
  const vistos = new Set<string>();
  for (const estado of ['att', 'sub'] as const) {
    for (const m of todos) {
      if (out.length >= n) return out;
      if (m.estado !== estado || vistos.has(m.key)) continue;
      vistos.add(m.key);
      out.push(m);
    }
  }
  return out;
}

/** Cuantos piden accion: el numero que Enrique escribio en el conteo, o los `att` listados si no lo puso. */
export function cuentaPidenAccion(e: EliteV3): number {
  if (e.conteo.piden_accion !== null) return e.conteo.piden_accion;
  return marcadoresDeEvaluacion(e).filter((m) => m.estado === 'att').length;
}

/**
 * La linea bajo los tres marcadores del hero (A11). Con 0 no se dice "0
 * marcadores piden accion"; con 1, singular. El nombre del coach viene de
 * lanzamiento.ts.
 */
export function lineaPidenAccion(piden: number): string {
  if (piden <= 0) return `Ningún marcador pide acción hoy. ${NOMBRE_COACH_ELITE} te explica cada uno.`;
  const n = piden === 1 ? '1 marcador pide acción' : `${piden} marcadores piden acción`;
  return `${n} en tu evaluación. ${NOMBRE_COACH_ELITE} te dice cuáles y por qué.`;
}

/**
 * Edad ATP y cronologica de la evaluacion, en la forma que ya usa el hero
 * (textoDeltaEdad, tonoDeltaEdad). `inicio` manda; `edades` es respaldo.
 * null si el documento no trae las dos.
 */
export function edadesDeEvaluacion(e: EliteV3): EdadHero | null {
  const integral = e.inicio.edad_atp ?? e.edades.atp;
  const cronologica = e.inicio.edad_cronologica ?? e.edades.real ?? e.cliente.edad;
  if (integral === null || integral === undefined || cronologica === null || cronologica === undefined) return null;
  if (!Number.isFinite(integral) || !Number.isFinite(cronologica)) return null;
  return { integral, cronologica };
}

// ---------------------------------------------------------------------------
// Las puertas: el indice del producto que pago
// ---------------------------------------------------------------------------

export type PuertaEliteKey = 'evaluacion' | 'suplementos' | 'alimentacion' | 'entrenamiento';

export interface DetallePuertas {
  evaluacion: string;
  suplementos: string;
  alimentacion: string;
  entrenamiento: string;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * La segunda linea de cada puerta, con numeros del documento y nunca
 * inventados. Cuando una seccion viene vacia se dice "en tu evaluacion":
 * la puerta sigue abriendo, no se esconde.
 */
export function detallePuertas(e: EliteV3): DetallePuertas {
  const sesiones = e.entrenamiento.sesiones.length;
  const prioriza = e.alimentacion.prioriza.length;
  const evita = e.alimentacion.evita.length;
  return {
    evaluacion: `Versión ${e.version}${e.inicio.programa_semanas ? ` · ${e.inicio.programa_semanas} semanas` : ''}`,
    suplementos: e.suplementos.length > 0 ? `${plural(e.suplementos.length, 'en tu plan', 'en tu plan')}` : 'En tu evaluación',
    alimentacion: prioriza + evita > 0
      ? `${plural(prioriza, 'que priorizar', 'que priorizar')} · ${plural(evita, 'que evitar', 'que evitar')}`
      : 'En tu evaluación',
    entrenamiento: sesiones > 0 ? plural(sesiones, 'tipo de sesión', 'tipos de sesión') : 'En tu evaluación',
  };
}

// ---------------------------------------------------------------------------
// "Que hacer hoy" desde lo suyo
// ---------------------------------------------------------------------------

export interface ObjetivoHoy {
  nombre: string;
  /** `mide.que` del pack: la senal que la persona va a ver moverse. */
  senal: string;
}

export interface FilaPackHoy {
  pack_key: string;
  activated_at: string;
  active?: boolean | null;
}

/**
 * El objetivo activo mas reciente que el catalogo conoce. `active` es
 * vestigial (siempre true al aplicar) pero se respeta por si algun dia
 * alguien lo apaga: un objetivo apagado no se revive aqui.
 */
export function objetivoActivo(filas: ReadonlyArray<FilaPackHoy>): ObjetivoHoy | null {
  const vivas = filas
    .filter((f) => f.active !== false && PACK_BY_KEY[f.pack_key])
    .sort((a, b) => (b.activated_at || '').localeCompare(a.activated_at || ''));
  const f = vivas[0];
  if (!f) return null;
  const pack = PACK_BY_KEY[f.pack_key];
  return { nombre: pack.nombre, senal: pack.mide.que };
}

function minusculaInicial(s: string): string {
  if (!s) return s;
  // Solo si la primera palabra es una palabra normal con mayuscula inicial:
  // "Tu hora" -> "tu hora"; "HbA1c", "ApoB" y "T3 libre" se quedan.
  return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s|$)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

/**
 * La primera linea de la tarjeta. Con objetivo activo nombra el objetivo y la
 * senal; con evaluacion y sin objetivo habla del programa; sin nada de eso,
 * el copy de siempre (`ligadas` = hay acciones ligadas a un marcador).
 */
export function lineaPlanHoy(objetivo: ObjetivoHoy | null, e: EliteV3 | null, ligadas: boolean): string {
  if (objetivo) {
    const senal = minusculaInicial(objetivo.senal.trim().replace(/\.$/, ''));
    return `Tu objetivo: ${objetivo.nombre}. La señal que vas a ver moverse: ${senal}.`;
  }
  if (e) {
    return e.inicio.programa_semanas
      ? `Tu programa de ${e.inicio.programa_semanas} semanas con ${NOMBRE_COACH_ELITE}, en lo que toca hoy.`
      : `Tu plan con ${NOMBRE_COACH_ELITE}, en lo que toca hoy.`;
  }
  return ligadas
    ? 'Tres hábitos elegidos por tus marcadores fuera de ventana.'
    : 'Tres hábitos para hoy. Palomea lo que ya hiciste.';
}

/** El titulo de la tarjeta: con plan Elite deja de ser una lista generica. */
export function tituloTarjetaHoy(e: EliteV3 | null): string {
  return e ? 'TU PLAN, HOY' : 'QUÉ HACER HOY';
}

export interface SuplementoHoy {
  id: string;
  nombre: string;
  /** Ya tiene al menos una toma registrada hoy. */
  tomadoHoy: boolean;
}

export interface FilaSuplementoHoy {
  id: string;
  name: string;
  source?: string | null;
  is_active?: boolean | null;
}

export interface LogSuplementoHoy {
  supplement_id: string;
  taken: boolean;
  units_taken?: number | string | null;
}

/**
 * Los del plan de Enrique (`source='coach'`, activos) con su estado de hoy.
 * Un log con `units_taken` en 0 o negativo no es una toma (mismo candado que
 * adherencia-core). Los `manual` de la persona no entran: no son del plan.
 */
export function suplementosDeHoy(
  filas: ReadonlyArray<FilaSuplementoHoy>,
  logsHoy: ReadonlyArray<LogSuplementoHoy>,
): SuplementoHoy[] {
  const tomados = new Set<string>();
  for (const l of logsHoy) {
    if (!l.taken) continue;
    const u = l.units_taken === null || l.units_taken === undefined || l.units_taken === '' ? null : Number(l.units_taken);
    if (u !== null && !(u > 0)) continue;
    tomados.add(l.supplement_id);
  }
  return filas
    .filter((f) => f.source === 'coach' && f.is_active !== false && f.name && f.name.trim())
    .map((f) => ({ id: f.id, nombre: f.name.trim(), tomadoHoy: tomados.has(f.id) }));
}

export const KEY_ACCION_SUPLEMENTOS = 'elite_suplementos_hoy';

function listaCorta(nombres: ReadonlyArray<string>, max = 2): string {
  if (nombres.length <= max) return nombres.join(' y ');
  const resto = nombres.length - max;
  return `${nombres.slice(0, max).join(', ')} y ${resto} más`;
}

/**
 * Una sola accion para las tomas del plan: cuantas faltan y cuales. Se
 * registran en Mis suplementos (dosis y hora viven ahi); aqui solo se ve y
 * se abre. null si no hay suplementos del plan.
 */
export function accionSuplementosDeHoy(supls: ReadonlyArray<SuplementoHoy>): AccionHoy | null {
  if (supls.length === 0) return null;
  const pendientes = supls.filter((s) => !s.tomadoHoy);
  const detalle = pendientes.length === 0
    ? (supls.length === 1 ? 'La toma de hoy ya está registrada.' : `Las ${supls.length} tomas de hoy ya están registradas.`)
    : `${plural(pendientes.length, 'pendiente', 'pendientes')}: ${listaCorta(pendientes.map((s) => s.nombre))}.`;
  return {
    key: KEY_ACCION_SUPLEMENTOS,
    tipo: 'suplementos',
    titulo: 'Tus suplementos de hoy',
    detalle,
    origen: 'plan',
    userInterventionId: null,
    porMarcador: null,
    firma: `Asignado por ${NOMBRE_COACH_ELITE}`,
    hecha: pendientes.length === 0,
  };
}

/** Palabras que aparecen en cualquier marcador o palanca y no dicen nada por si solas. */
const VACIAS = new Set([
  'para', 'como', 'esta', 'este', 'esto', 'esos', 'esas', 'estos', 'estas', 'sobre', 'entre', 'desde', 'hasta',
  'cuando', 'porque', 'pero', 'todo', 'toda', 'todos', 'todas', 'menos', 'alto', 'alta', 'altos', 'altas',
  'bajo', 'baja', 'bajos', 'bajas', 'bajar', 'subir', 'nivel', 'niveles', 'valor', 'valores', 'marcador',
  'marcadores', 'sangre', 'cuerpo', 'semana', 'semanas', 'meses', 'dias', 'anos', 'ayuno', 'ayunas', 'mismo',
  'misma', 'tiempo', 'mejor', 'peor', 'hormona', 'hormonas', 'segun', 'conviene', 'promedio', 'total',
  'propio', 'propia', 'cada', 'tiene', 'tienes', 'tener', 'hace', 'hacer', 'ahora', 'mucho', 'mucha', 'poco',
  'poca', 'solo', 'tambien', 'antes', 'despues', 'unica', 'unico', 'tuyo', 'tuya', 'riesgo', 'lado',
  'genetica', 'genetico', 'quimica', 'fabrica', 'brazo', 'estable', 'convencional', 'corporal',
]);

/** Tokens de cuatro letras o mas, sin acentos, sin vacias. Con repeticion (cuenta como peso). */
export function tokensDePalanca(texto: string): string[] {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !VACIAS.has(t));
}

const RANGO_ESTADO: Record<EliteEstado, number> = { att: 0, sub: 1, opt: 2 };

/**
 * El marcador que justifica una palanca: el `att` (o `sub`) cuyo nombre
 * comparte mas palabras con el titulo, el por que y el como de la palanca
 * (cada palabra pesa las veces que la palanca la repite). Empate: primero
 * `att`, luego el orden del documento. null si no comparten nada: entonces
 * la firma es generica y no se inventa un marcador.
 */
export function marcadorDePalanca(p: ElitePalanca, marcadores: ReadonlyArray<EliteMarcador>): EliteMarcador | null {
  const pesos = new Map<string, number>();
  for (const t of tokensDePalanca(`${p.titulo} ${p.por_que} ${p.como}`)) pesos.set(t, (pesos.get(t) ?? 0) + 1);
  let mejor: { m: EliteMarcador; puntos: number } | null = null;
  for (const m of marcadores) {
    if (m.estado !== 'att' && m.estado !== 'sub') continue;
    let puntos = 0;
    for (const t of new Set(tokensDePalanca(m.nombre))) puntos += pesos.get(t) ?? 0;
    if (puntos <= 0) continue;
    if (!mejor || puntos > mejor.puntos
      || (puntos === mejor.puntos && RANGO_ESTADO[m.estado] < RANGO_ESTADO[mejor.m.estado as EliteEstado])) {
      mejor = { m, puntos };
    }
  }
  return mejor ? mejor.m : null;
}

/** Firma de una accion ligada a un marcador de la evaluacion. */
export function firmaEnrique(marcador: EliteMarcador | null): string {
  return marcador
    ? `${NOMBRE_COACH_ELITE} lo eligió por tu ${marcador.nombre}`
    : `De tu evaluación con ${NOMBRE_COACH_ELITE}`;
}

/**
 * Las palancas del cierre como acciones, en el orden de Enrique (1, 2, 3 es
 * su prioridad). No se palomean: son palancas de semanas, no de un dia; la
 * fila abre la evaluacion. `max` es lo que queda de lugar en la terna.
 */
export function accionesDePalancas(e: EliteV3, max: number): AccionHoy[] {
  const marcadores = marcadoresDeEvaluacion(e);
  return e.cierre.palancas.slice(0, Math.max(0, max)).map((p, i) => {
    const m = marcadorDePalanca(p, marcadores);
    return {
      key: `elite_palanca_${i + 1}`,
      tipo: 'palanca' as const,
      titulo: p.titulo,
      detalle: p.como,
      origen: 'plan' as const,
      userInterventionId: null,
      porMarcador: m ? m.nombre : null,
      firma: firmaEnrique(m),
      hecha: false,
    };
  });
}

/**
 * Los marcadores de la evaluacion como "fuera de ventana" para el puntaje
 * de las practicas de siempre: `att` pesa como atencion, `sub` como
 * aceptable. Asi, cuando la terna rellena con practicas de la persona, las
 * elige por el juez de Enrique y no por la matriz V7. `nombres` extra (el
 * puente al catalogo) los agrega el servicio.
 */
export function marcadoresFueraDeEvaluacion(e: EliteV3): MarcadorFuera[] {
  const out: MarcadorFuera[] = [];
  const vistos = new Set<string>();
  for (const m of marcadoresDeEvaluacion(e)) {
    if (m.estado !== 'att' && m.estado !== 'sub') continue;
    if (vistos.has(m.key)) continue;
    vistos.add(m.key);
    out.push({ key: m.key, nombres: [m.nombre], etiqueta: m.nombre, estado: m.estado === 'att' ? 'atencion' : 'aceptable' });
  }
  return out;
}

/**
 * La terna de un cliente con evaluacion: primero sus suplementos de hoy (si
 * tiene plan), luego las palancas de Enrique, y si aun falta lugar, lo de
 * siempre (`relleno`, ya elegido por el core viejo). Nunca mas de tres y
 * nunca una llave repetida.
 */
export function componerTernaElite(
  e: EliteV3,
  suplementos: ReadonlyArray<SuplementoHoy>,
  relleno: ReadonlyArray<AccionHoy>,
): AccionHoy[] {
  const out: AccionHoy[] = [];
  const s = accionSuplementosDeHoy(suplementos);
  if (s) out.push(s);
  for (const p of accionesDePalancas(e, ACCIONES_HOY - out.length)) out.push(p);
  const vistos = new Set(out.map((a) => a.key));
  for (const r of relleno) {
    if (out.length >= ACCIONES_HOY) break;
    if (vistos.has(r.key)) continue;
    vistos.add(r.key);
    out.push(r);
  }
  return out;
}
