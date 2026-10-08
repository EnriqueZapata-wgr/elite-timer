/**
 * perfil-core (8-oct-2026 (v4)). Logica PURA del PERFIL de la v4: la pestana
 * que ocupa la ruta `salud` cuando la cuenta ve la navegacion nueva (ver
 * "R and D/ATP_V4_PLAN.md", Fase A). Cero React, cero supabase, cero
 * `require()` de imagenes; se verifica con
 * `node scripts/run-tests-sin-vitest.js src/services/perfil/__tests__/perfil-core.test.ts`.
 *
 * Que decide aqui:
 *  1. El modelo de la pantalla desde el documento vigente (perfilDesdeDocumento):
 *     cabecera (ceja, titulo segun la entrega, pildora, inicial), heroe de
 *     Edad ATP, pestanas internas, sistemas ordenados de peor a mejor,
 *     marcadores agrupados por estado, cruces con sus origenes y la cara de
 *     Genetica (hallazgos, por llegar o no incluida).
 *  2. El detalle de un marcador (detalleMarcador): la geometria de la barra
 *     de rango (posiciones de 0 a 1), sus etiquetas, el aviso "para el
 *     laboratorio esta bien, para nosotros todavia no", la lectura personal
 *     (la nota de quien firma) y la general (la ficha escrita de la app).
 *  3. Que cosas del plan mueven un marcador (vincularMarcadorPlan), con la
 *     fuerza de cada vinculo: 'llave' (marcador a raiz a practica, por el
 *     vocabulario controlado), 'nombre' (el catalogo de la practica nombra el
 *     biomarcador) o 'texto' (el porque de un suplemento o la palanca lo
 *     nombran). Sin vinculo no se dice nada: nunca se inventa.
 *
 * Lo que NO hace: calcular estados, rangos ni objetivos. Todo lo que se
 * muestra lo escribio y firmo una persona (`interpretado_por`); aqui solo se
 * ordena, se agrupa y se dibuja.
 *
 * Reglas de la casa que se cuidan aqui (las vigila el test): sin raya larga
 * ni palabras rojas en lo que lee el cliente; un programa nunca lee "Elite";
 * la imagen del heroe sale de un banco SIN persona (nunca se supone el sexo).
 */
import {
  MARCADOR_A_RAIZ,
  marcadoresDe,
  tieneDiagnostico,
  tipoDeDocumento,
  type EliteEstado,
  type EliteFuente,
  type EliteMarcador,
  type ElitePalanca,
  type EliteRango,
  type EliteV3,
} from '@/src/services/elite/elite-v3-core';
import {
  ETIQUETA_EVIDENCIA,
  etiquetaEstado,
  formatearFecha,
  formatearRango,
  formatearValor,
  ordenarSistemas,
  type TokenEstado,
} from '@/src/services/elite/evaluacion-elite-core';
import { columnasMarcador, mostrarEstado, caraGeneticaSinHallazgos } from '@/src/services/elite/mi-programa-core';
import { conMayuscula, vozDeDocumento, type VozPrograma } from '@/src/services/elite/voz-programa-core';
import { claveCanonicaDeLaboratorio } from '@/src/services/elite/elite-lab-values-core';
import { edadesDeEvaluacion } from '@/src/services/hoy/elite-hoy-core';
import { deltaConReferente } from '@/src/services/hoy/hoy-resumen-core';
import { edadIntegralTexto, tonoDeltaEdad, type TonoDelta } from '@/src/services/hoy/hero-laboratorios-core';
import { coincideMarcador } from '@/src/services/hoy/que-hacer-hoy-core';
import { LAB_MARKER_MAP } from '@/src/services/interventions/prescription-core';
import { contenidoDe } from '@/src/constants/biomarcador-contenido';
import { MATRIZ_HOMBRES, MATRIZ_MUJERES } from '@/src/constants/edad-atp-matriz-v7-v6';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { seededIndex } from '@/src/utils/image-pick-core';

// ---------------------------------------------------------------------------
// Rutas e imagen
// ---------------------------------------------------------------------------

/** A donde lleva cada cosa del Perfil. Literales: expo-router tiene typedRoutes. */
export const RUTAS_PERFIL = {
  tu: '/tu',
  historia: '/progreso',
  plan: '/mi-plan',
  /** 8-oct-2026 (v4, revision en frio): las palancas viven en la pestana Plan. */
  programa: '/programa',
  suplementos: '/supplements',
  /** El hub clasico de Salud dentro de la v4 (salud.tsx lo pinta cuando llega `seccion`). */
  salud: '/salud?seccion=hub',
  documento: '/salud/evaluacion-elite',
} as const;

/**
 * 8-oct-2026 (v4, revision en frio): el parametro de busqueda con el que se
 * entra al Perfil con un marcador abierto (`/salud?marcador=<key>`). Una
 * llave que el documento no trae se ignora.
 */
export const PARAM_MARCADOR = 'marcador' as const;
export type RutaPerfil = (typeof RUTAS_PERFIL)[keyof typeof RUTAS_PERFIL];

/**
 * 8-oct-2026 (v4): las fotos del heroe. Solo archivos de hoy-extra/tu-dia que
 * ya estan en el banco SIN persona de HOY (IMAGENES_PROGRAMA_SIN_PERSONA) y
 * que ademas son blanco y negro (saturacion media menor a 0.05, medida sobre
 * el archivo): el heroe es editorial en B/N y nunca le pone sexo a nadie.
 * El `require()` de cada uno vive en el componente (PerfilHero).
 */
export const IMAGENES_PERFIL_SIN_PERSONA = [
  'noche-01', 'noche-02', 'noche-03', 'atardecer-01', 'atardecer-03', 'medio-dia-02',
] as const;
export type ImagenPerfilKey = (typeof IMAGENES_PERFIL_SIN_PERSONA)[number];

/** Misma semilla, misma foto (no parpadea entre renders); cambia de un dia a otro. */
export function imagenPerfilKey(semilla?: string): ImagenPerfilKey {
  return IMAGENES_PERFIL_SIN_PERSONA[seededIndex(semilla, IMAGENES_PERFIL_SIN_PERSONA.length)];
}

// ---------------------------------------------------------------------------
// Tipos del modelo
// ---------------------------------------------------------------------------

export type PestanaPerfil = 'sistemas' | 'marcadores' | 'cruces' | 'genetica';

export const ETIQUETA_PESTANA: Record<PestanaPerfil, string> = {
  sistemas: 'Sistemas',
  marcadores: 'Marcadores',
  cruces: 'Cruces',
  genetica: 'Genética',
};

export interface HeroPerfil {
  /** "44.5". */
  edad: string;
  /** "6.5 años por encima de tu edad real". */
  delta: string;
  tono: TonoDelta;
  /** "Sangre 32.7 · Vida 48.4 · Ritmo 15.6 meses por año", solo con lo que existe; null si nada. */
  linea: string | null;
  /** Para el lector de pantalla. */
  accesible: string;
}

export interface SistemaVista {
  key: string;
  nombre: string;
  /** 0..100 o null. */
  score: number | null;
  /** score / 100, ya acotado; null sin score. */
  fraccion: number | null;
  estado: EliteEstado | null;
  token: TokenEstado | null;
  /** Texto del estado ("Pide acción"); null si no se pinta (programa sin estado). */
  etiqueta: string | null;
  porQue: string;
  /** true si hay marcadores del documento que caen en este sistema (se puede filtrar). */
  filtraMarcadores: boolean;
  /** Cuantos marcadores del documento caen en este sistema. */
  nMarcadores: number;
}

export interface LeyendaEstado {
  estado: EliteEstado;
  texto: string;
  token: TokenEstado;
}

export interface MarcadorVista {
  key: string;
  nombre: string;
  valorTexto: string;
  estado: EliteEstado | null;
  token: TokenEstado | null;
  /** "Pide acción"; null si no se pinta. */
  etiqueta: string | null;
  /** Llaves de sistema (dominio de la matriz) donde cae; [] si no se sabe. */
  sistemas: string[];
}

export interface GrupoMarcadoresVista {
  estado: EliteEstado | null;
  titulo: string;
  token: TokenEstado | null;
  marcadores: MarcadorVista[];
}

export type OrigenCruce = 'genetica' | 'laboratorio' | 'vida';

export const ETIQUETA_ORIGEN: Record<OrigenCruce, string> = {
  genetica: 'Genética',
  laboratorio: 'Laboratorio',
  vida: 'Tu vida',
};

const ORIGEN_DE_FUENTE: Record<EliteFuente, OrigenCruce> = { gen: 'genetica', lab: 'laboratorio', ctx: 'vida' };
const ORDEN_ORIGEN: readonly OrigenCruce[] = ['genetica', 'laboratorio', 'vida'];

export interface CruceVista {
  titulo: string;
  /** Los origenes que el documento declara (fuentes), en orden fijo. [] si no se pueden derivar. */
  origenes: OrigenCruce[];
  hallazgo: string;
  consecuencia: string;
  accion: string;
  evidencia: string | null;
}

export interface HallazgoGeneticoVista {
  tema: string;
  titulo: string;
  hallazgo: string;
  implicacion: string;
  queHacer: string | null;
  evidencia: string | null;
}

export type GeneticaVista =
  | { estado: 'hallazgos'; intro: string | null; hallazgos: HallazgoGeneticoVista[] }
  | { estado: 'por_llegar' | 'no_incluida'; titulo: string; texto: string };

export interface SinEvaluacionVista {
  titulo: string;
  texto: string;
}

export interface PerfilVista {
  voz: VozPrograma;
  esPrograma: boolean;
  /** 1 sin genetica ni cruces, 2 con ellos. null en un programa (no tiene entregas). */
  entrega: 1 | 2 | null;
  ceja: string;
  titulo: string;
  /** "Entrega 2 · 6 de septiembre de 2026" o "Versión 1 · 8 de octubre de 2026"; null si no hay nada que decir. */
  pildora: string | null;
  /** Inicial para el boton redondo de "Tú"; null = icono de persona. */
  inicial: string | null;
  hero: HeroPerfil | null;
  /** La frase de arriba del documento cuando no hay heroe. */
  lead: string | null;
  /** El documento trae evaluacion que leer (tieneDiagnostico). Sin ella, la pantalla dice por que. */
  conEvaluacion: boolean;
  sinEvaluacion: SinEvaluacionVista | null;
  pestanas: PestanaPerfil[];
  /** null cuando no hay ninguna pestana que pintar (programa sin evaluacion ni genetica). */
  pestanaInicial: PestanaPerfil | null;
  sistemas: SistemaVista[];
  leyenda: LeyendaEstado[];
  grupos: GrupoMarcadoresVista[];
  cruces: CruceVista[];
  genetica: GeneticaVista;
}

export interface ExtrasPerfil {
  /** Nombre del perfil de la cuenta (respaldo de la inicial). */
  nombrePerfil?: string | null;
}

// ---------------------------------------------------------------------------
// Textos fijos
// ---------------------------------------------------------------------------

export const CEJA_PERFIL = 'TU PERFIL';
export const TITULO_ENTREGA_1 = 'Así estás funcionando';
/** 8-oct-2026 (v4, revision en frio): sin lectura no se dice "así estás funcionando". */
export const TITULO_SIN_DOCUMENTO = 'Todavía sin lectura';
export const TITULO_SIN_EVALUACION = 'Sin lectura de laboratorio';
export const TITULO_NO_SE_PUDO_LEER = 'Tu perfil';
export const TITULO_ENTREGA_2 = 'Por qué estás así';
export const TITULO_TUS_SISTEMAS = 'Tus diez sistemas';
export const TEXTO_LAB_OK_NO_NUESTRO = 'Para el laboratorio está bien, para nosotros todavía no';
export const TITULO_LO_MUEVE = 'Lo mueve en tu plan';
export const TEXTO_HISTORIA = 'Tu historia';
export const DETALLE_HISTORIA = 'Tu constancia, tu cuerpo y tus reportes';

// ---------------------------------------------------------------------------
// Ayudas
// ---------------------------------------------------------------------------

function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function textoONull(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > 0 ? t : null;
}

function unDecimal(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Primera letra (con acento si lo lleva) en mayuscula; null si el texto no empieza con letra. */
export function inicialDe(nombre: string | null | undefined): string | null {
  const t = textoONull(nombre);
  if (!t) return null;
  const c = t.charAt(0);
  return /\p{L}/u.test(c) ? c.toLocaleUpperCase('es-MX') : null;
}

// ---------------------------------------------------------------------------
// Sistemas de un marcador (dominios de la matriz)
// ---------------------------------------------------------------------------

/**
 * Parametro de la matriz a sus dominios. Las llaves de dominio de la matriz
 * son las mismas que `sistemas[].key` del documento (metabolismo,
 * cardiovascular...). Se juntan las dos matrices: aqui no se elige sexo, solo
 * a que sistema pertenece una medida, y eso no depende del sexo.
 */
const DOMINIOS_DE_PARAMETRO: ReadonlyMap<string, readonly string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const matriz of [MATRIZ_HOMBRES, MATRIZ_MUJERES]) {
    for (const [dominio, d] of Object.entries(matriz)) {
      for (const p of d.params) {
        const lista = m.get(p.key) ?? [];
        if (!lista.includes(dominio)) lista.push(dominio);
        m.set(p.key, lista);
      }
    }
  }
  return m;
})();

/** Sistemas (dominios) donde cae la llave de un marcador: tal cual o por su clave canonica de laboratorio. */
export function sistemasDeMarcador(key: string): string[] {
  const candidatos = [key];
  const canonica = claveCanonicaDeLaboratorio(key);
  if (canonica.ok && canonica.key !== key) candidatos.push(canonica.key);
  const out: string[] = [];
  for (const k of candidatos) {
    for (const d of DOMINIOS_DE_PARAMETRO.get(k) ?? []) if (!out.includes(d)) out.push(d);
  }
  return out;
}

// ---------------------------------------------------------------------------
// El modelo de la pantalla
// ---------------------------------------------------------------------------

/** Entrega 2 cuando el documento ya trae genetica o cruces; 1 si no. Un programa no tiene entregas. */
export function entregaDe(doc: EliteV3): 1 | 2 | null {
  if (tipoDeDocumento(doc) === 'programa') return null;
  return doc.genetica.hallazgos.length > 0 || doc.cruces.lista.length > 0 ? 2 : 1;
}

function heroDe(doc: EliteV3): HeroPerfil | null {
  const edad = edadesDeEvaluacion(doc);
  if (!edad) return null;
  const partes: string[] = [];
  if (esNumero(doc.edades.sangre)) partes.push(`Sangre ${unDecimal(doc.edades.sangre)}`);
  if (esNumero(doc.edades.vida)) partes.push(`Vida ${unDecimal(doc.edades.vida)}`);
  const ritmo = doc.conteo.ritmo_envejecimiento_meses;
  if (esNumero(ritmo)) partes.push(`Ritmo ${unDecimal(ritmo)} ${ritmo === 1 ? 'mes' : 'meses'} por año`);
  const texto = edadIntegralTexto(edad);
  const delta = deltaConReferente(edad);
  const linea = partes.length > 0 ? partes.join(' · ') : null;
  return {
    edad: texto,
    delta,
    tono: tonoDeltaEdad(edad),
    linea,
    accesible: [`Tu Edad ATP: ${texto}`, delta, linea].filter(Boolean).join('. ') + '.',
  };
}

function sistemasVista(doc: EliteV3, programa: boolean, conMarcadores: ReadonlyMap<string, number>): SistemaVista[] {
  return ordenarSistemas(doc.sistemas).map((s) => {
    const score = esNumero(s.score) ? Math.max(0, Math.min(100, s.score)) : null;
    const e = etiquetaEstado(s.estado);
    const pinta = mostrarEstado(s.estado, programa);
    return {
      key: s.key,
      nombre: s.nombre,
      score,
      fraccion: score === null ? null : score / 100,
      estado: s.estado,
      token: e.token,
      etiqueta: pinta ? e.texto : null,
      porQue: s.por_que,
      filtraMarcadores: (conMarcadores.get(s.key) ?? 0) > 0,
      nMarcadores: conMarcadores.get(s.key) ?? 0,
    };
  });
}

const ORDEN_ESTADO: readonly (EliteEstado | null)[] = ['att', 'sub', 'opt', null];

function valorConEstimado(m: EliteMarcador): string {
  const v = formatearValor(m.valor, m.unidad);
  return m.estimado && m.valor !== null ? `${v} (estimado)` : v;
}

function marcadorVista(m: EliteMarcador, programa: boolean): MarcadorVista {
  const e = etiquetaEstado(m.estado);
  const pinta = columnasMarcador(m, programa).estado && m.estado !== null;
  return {
    key: m.key,
    nombre: m.nombre,
    valorTexto: valorConEstimado(m),
    estado: m.estado,
    token: e.token,
    etiqueta: pinta ? e.texto : null,
    sistemas: sistemasDeMarcador(m.key),
  };
}

/** Marcadores del documento agrupados por estado: primero los que piden accion. Sin duplicar llave. */
function gruposVista(doc: EliteV3, programa: boolean): GrupoMarcadoresVista[] {
  const vistos = new Set<string>();
  const todos: EliteMarcador[] = [];
  for (const m of marcadoresDe(doc)) {
    if (vistos.has(m.key)) continue;
    vistos.add(m.key);
    todos.push(m);
  }
  const out: GrupoMarcadoresVista[] = [];
  for (const estado of ORDEN_ESTADO) {
    const del = todos.filter((m) => m.estado === estado);
    if (del.length === 0) continue;
    let titulo: string;
    if (estado !== null) titulo = etiquetaEstado(estado).texto;
    else if (programa) titulo = 'Otras medidas';
    else titulo = del.every((m) => m.valor === null) ? 'Sin valor' : 'Sin estado anotado';
    out.push({
      estado,
      titulo,
      token: estado === null ? null : etiquetaEstado(estado).token,
      marcadores: del.map((m) => marcadorVista(m, programa)),
    });
  }
  return out;
}

function crucesVista(doc: EliteV3): CruceVista[] {
  return doc.cruces.lista.map((c) => {
    const presentes = new Set(c.fuentes.map((f) => ORIGEN_DE_FUENTE[f]).filter(Boolean));
    return {
      titulo: c.titulo,
      origenes: ORDEN_ORIGEN.filter((o) => presentes.has(o)),
      hallazgo: c.hallazgo,
      consecuencia: c.consecuencia,
      accion: c.accion,
      evidencia: c.evidencia === null ? null : ETIQUETA_EVIDENCIA[c.evidencia],
    };
  });
}

function geneticaVista(doc: EliteV3, voz: VozPrograma, entrega: 1 | 2 | null): GeneticaVista {
  const h = doc.genetica.hallazgos;
  if (h.length > 0) {
    return {
      estado: 'hallazgos',
      intro: textoONull(doc.genetica.intro),
      hallazgos: h.map((x) => ({
        tema: x.tema,
        titulo: x.titulo,
        hallazgo: x.hallazgo,
        implicacion: x.implicacion,
        queHacer: textoONull(x.que_hacer),
        evidencia: x.evidencia === null ? null : ETIQUETA_EVIDENCIA[x.evidencia],
      })),
    };
  }
  if (voz.tipo === 'programa') {
    // Honesto y sin promesa: un programa no compro una entrega genetica.
    const cara = caraGeneticaSinHallazgos(voz, doc.version);
    return { estado: 'no_incluida', titulo: cara.titulo, texto: cara.texto };
  }
  if (entrega === 2) {
    // Rara (cruces sin genetica): no se promete una entrega que ya paso.
    return {
      estado: 'no_incluida',
      titulo: 'Esta entrega no trae hallazgos genéticos',
      texto: `Si tienes dudas sobre tu estudio genético, escríbele a ${NOMBRE_COACH_ELITE}.`,
    };
  }
  return {
    estado: 'por_llegar',
    titulo: 'Tu genética llega en tu segunda entrega',
    texto: 'Cuando llegue, aquí ves qué explica tu genética de cómo estás funcionando y qué hacer con cada hallazgo.',
  };
}

function pildoraDe(doc: EliteV3, entrega: 1 | 2 | null): string | null {
  const fecha = /^\d{4}-\d{2}/.test(doc.generado_en) ? formatearFecha(doc.generado_en) : null;
  const base = entrega !== null ? `Entrega ${entrega}` : (doc.version > 0 ? `Versión ${doc.version}` : null);
  if (base && fecha) return `${base} · ${fecha}`;
  return base ?? fecha;
}

/**
 * El modelo completo del Perfil para un documento valido. Lo que el
 * documento no trae no aparece (sin heroe sin Edad ATP, sin pestana de
 * Cruces sin cruces); Genetica siempre esta, porque su cara honesta tambien
 * es informacion.
 */
export function perfilDesdeDocumento(doc: EliteV3, extras: ExtrasPerfil = {}): PerfilVista {
  const voz = vozDeDocumento(doc);
  const programa = voz.tipo === 'programa';
  const entrega = entregaDe(doc);
  const conEvaluacion = tieneDiagnostico(doc);
  const grupos = gruposVista(doc, programa);
  const conMarcadores = new Map<string, number>();
  for (const m of grupos.flatMap((g) => g.marcadores)) {
    for (const k of m.sistemas) conMarcadores.set(k, (conMarcadores.get(k) ?? 0) + 1);
  }
  const sistemas = sistemasVista(doc, programa, conMarcadores);
  const cruces = crucesVista(doc);
  const genetica = geneticaVista(doc, voz, entrega);

  const pestanas: PestanaPerfil[] = [];
  if (sistemas.length > 0) pestanas.push('sistemas');
  if (grupos.length > 0) pestanas.push('marcadores');
  if (cruces.length > 0) pestanas.push('cruces');
  // Genetica siempre en Elite (su cara honesta tambien informa); en un programa
  // solo si trae hallazgos: a un programa no se le abre una pestana vacia.
  if (!programa || genetica.estado === 'hallazgos') pestanas.push('genetica');
  const pestanaInicial: PestanaPerfil | null = entrega === 2 && cruces.length > 0 ? 'cruces' : pestanas[0] ?? null;

  const presentes = new Set(sistemas.map((s) => s.estado));
  const leyenda: LeyendaEstado[] = (['opt', 'sub', 'att'] as const)
    .filter((e) => presentes.has(e))
    .map((e) => {
      const x = etiquetaEstado(e);
      return { estado: e, texto: x.texto, token: x.token as TokenEstado };
    });

  const hero = heroDe(doc);
  return {
    voz,
    esPrograma: programa,
    entrega,
    ceja: CEJA_PERFIL,
    titulo: !conEvaluacion ? TITULO_SIN_EVALUACION : entrega === 2 ? TITULO_ENTREGA_2 : TITULO_ENTREGA_1,
    pildora: pildoraDe(doc, entrega),
    inicial: inicialDe(doc.cliente.nombre_preferido) ?? inicialDe(extras.nombrePerfil),
    hero,
    lead: hero ? null : textoONull(doc.inicio.lead),
    conEvaluacion,
    sinEvaluacion: conEvaluacion ? null : {
      titulo: `${conMayuscula(voz.documento)} no trae evaluación de laboratorio`,
      texto: `Lo que ${NOMBRE_COACH_ELITE} preparó para ti vive en tu plan. Tus estudios y tu Edad ATP siguen en Salud.`,
    },
    pestanas,
    pestanaInicial,
    sistemas,
    leyenda,
    grupos,
    cruces,
    genetica,
  };
}

/**
 * La llave del marcador que pide el parametro `marcador` de la ruta, solo si
 * el documento la trae (en algun grupo). Acepta lo que entrega
 * useLocalSearchParams (texto o lista); cualquier otra cosa, null.
 */
export function marcadorDelParametro(valor: unknown, vista: Pick<PerfilVista, 'grupos'> | null): string | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  if (typeof v !== 'string' || !v.trim() || !vista) return null;
  const key = v.trim();
  return vista.grupos.some((g) => g.marcadores.some((m) => m.key === key)) ? key : null;
}

/** Los grupos con solo los marcadores de un sistema (los grupos vacios se van). Sin sistema, tal cual. */
export function filtrarGruposPorSistema(grupos: readonly GrupoMarcadoresVista[], sistema: string | null): GrupoMarcadoresVista[] {
  if (!sistema) return [...grupos];
  return grupos
    .map((g) => ({ ...g, marcadores: g.marcadores.filter((m) => m.sistemas.includes(sistema)) }))
    .filter((g) => g.marcadores.length > 0);
}

// ---------------------------------------------------------------------------
// Estados de la pantalla
// ---------------------------------------------------------------------------

/** La lectura del documento vigente en la forma de leerEvaluacionEliteVigente; null = leyendo. */
export type LecturaParaPerfil =
  | { ok: true; evaluacion: EliteV3 | null }
  | { ok: false; motivo?: 'lectura' | 'formato' };

export type EstadoPerfil =
  | { tipo: 'cargando' }
  | { tipo: 'no_se_pudo_leer'; motivo: 'lectura' | 'formato' }
  | { tipo: 'sin_documento' }
  | { tipo: 'documento'; evaluacion: EliteV3 };

/** "No se pudo leer" y "no hay" son estados distintos, siempre. */
export function estadoPerfil(lectura: LecturaParaPerfil | null | undefined): EstadoPerfil {
  if (!lectura) return { tipo: 'cargando' };
  if (!lectura.ok) return { tipo: 'no_se_pudo_leer', motivo: lectura.motivo === 'formato' ? 'formato' : 'lectura' };
  if (!lectura.evaluacion) return { tipo: 'sin_documento' };
  return { tipo: 'documento', evaluacion: lectura.evaluacion };
}

/** La tarjeta honesta de quien todavia no tiene documento. La voz decide "tu evaluación" o "tu programa". */
export function textosSinDocumento(voz: Pick<VozPrograma, 'documento'>): { titulo: string; texto: string; cta: string } {
  return {
    titulo: `Tu perfil se arma con ${voz.documento}`,
    texto: `Cuando ${NOMBRE_COACH_ELITE} cargue ${voz.documento}, aquí ves cómo está funcionando tu cuerpo, sistema por sistema. Mientras, tus estudios y tu Edad ATP siguen en Salud.`,
    cta: 'Ir a Salud',
  };
}

// ---------------------------------------------------------------------------
// Detalle de un marcador
// ---------------------------------------------------------------------------

/** Un tramo de la barra, en posiciones de 0 a 1 sobre el dominio dibujado. */
export interface TramoBarra {
  desde: number;
  hasta: number;
}

export interface BarraRango {
  /** El dominio dibujado (unidades del marcador). */
  min: number;
  max: number;
  lab: TramoBarra | null;
  objetivo: TramoBarra | null;
  /** Donde cae el valor, 0..1. */
  punto: number;
  etiquetaLab: string | null;
  etiquetaObjetivo: string | null;
}

export interface DetalleMarcador {
  key: string;
  nombre: string;
  valorTexto: string;
  estado: EliteEstado | null;
  token: TokenEstado | null;
  etiqueta: string | null;
  /** null si no hay valor o no hay ningun rango que dibujar. */
  barra: BarraRango | null;
  /** Dentro del rango del laboratorio y fuera de donde te queremos (los dos conocidos). */
  labOkNoNuestro: boolean;
  avisoLabOk: string | null;
  /** La nota de quien firma, para esta persona. */
  lecturaPersonal: string | null;
  /** La ficha escrita de la app (queEs), igual para todos. */
  lecturaGeneral: string | null;
  evidencia: string | null;
  estimado: boolean;
}

function tieneLado(r: EliteRango | null): r is EliteRango {
  return r !== null && (esNumero(r.min) || esNumero(r.max));
}

function dentro(v: number, r: EliteRango): boolean {
  if (esNumero(r.min) && v < r.min) return false;
  if (esNumero(r.max) && v > r.max) return false;
  return true;
}

/** Margen a cada lado del dominio, para que el punto y los bordes no peguen con la orilla. */
const MARGEN_BARRA = 0.15;

function geometria(valor: number, lab: EliteRango | null, obj: EliteRango | null): BarraRango | null {
  const nums: number[] = [valor];
  for (const r of [lab, obj]) {
    if (!r) continue;
    if (esNumero(r.min)) nums.push(r.min);
    if (esNumero(r.max)) nums.push(r.max);
  }
  if (nums.length < 2) return null;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  let span = hi - lo;
  if (span <= 0) span = Math.abs(hi) > 0 ? Math.abs(hi) * 0.5 : 1;
  let min = lo - span * MARGEN_BARRA;
  const max = hi + span * MARGEN_BARRA;
  // Una medida que no puede ser negativa no dibuja un dominio negativo.
  if (lo >= 0 && min < 0) min = 0;
  const pos = (x: number) => Math.max(0, Math.min(1, (x - min) / (max - min)));
  const tramo = (r: EliteRango | null): TramoBarra | null => {
    if (!tieneLado(r)) return null;
    return { desde: esNumero(r.min) ? pos(r.min) : 0, hasta: esNumero(r.max) ? pos(r.max) : 1 };
  };
  return {
    min,
    max,
    lab: tramo(lab),
    objetivo: tramo(obj),
    punto: pos(valor),
    etiquetaLab: tieneLado(lab) ? `Laboratorio: ${formatearRango(lab)}` : null,
    etiquetaObjetivo: tieneLado(obj) ? `Donde te queremos: ${formatearRango(obj)}` : null,
  };
}

/** La lectura general escrita para la clave del marcador (o su clave canonica de laboratorio). */
export function lecturaGeneralDe(key: string): string | null {
  const directa = contenidoDe(key);
  if (directa) return directa.queEs;
  const c = claveCanonicaDeLaboratorio(key);
  return c.ok ? contenidoDe(c.key)?.queEs ?? null : null;
}

export function detalleMarcador(m: EliteMarcador, opts: { programa?: boolean } = {}): DetalleMarcador {
  const programa = opts.programa === true;
  const e = etiquetaEstado(m.estado);
  const pinta = columnasMarcador(m, programa).estado && m.estado !== null;
  const barra = esNumero(m.valor) && (tieneLado(m.rango_lab) || tieneLado(m.objetivo))
    ? geometria(m.valor, m.rango_lab, m.objetivo)
    : null;
  const labOkNoNuestro = esNumero(m.valor) && tieneLado(m.rango_lab) && tieneLado(m.objetivo)
    && dentro(m.valor, m.rango_lab) && !dentro(m.valor, m.objetivo);
  return {
    key: m.key,
    nombre: m.nombre,
    valorTexto: valorConEstimado(m),
    estado: m.estado,
    token: e.token,
    etiqueta: pinta ? e.texto : null,
    barra,
    labOkNoNuestro,
    avisoLabOk: labOkNoNuestro ? TEXTO_LAB_OK_NO_NUESTRO : null,
    lecturaPersonal: textoONull(m.nota),
    lecturaGeneral: lecturaGeneralDe(m.key),
    evidencia: m.evidencia === null ? null : ETIQUETA_EVIDENCIA[m.evidencia],
    estimado: m.estimado,
  };
}

// ---------------------------------------------------------------------------
// "Lo mueve en tu plan"
// ---------------------------------------------------------------------------

export type FuerzaVinculo = 'llave' | 'nombre' | 'texto';

/** Como se lee la fuerza junto al vinculo. */
export const ETIQUETA_FUERZA: Record<FuerzaVinculo, string> = {
  llave: 'Ligado directo',
  nombre: 'Lo nombra la práctica',
  texto: 'Mencionado en tu plan',
};

const RANGO_FUERZA: Record<FuerzaVinculo, number> = { llave: 0, nombre: 1, texto: 2 };

/** Lo que se lee de `user_supplements` (activos) para vincular. */
export interface SuplementoParaVinculo {
  id: string;
  nombre: string;
  /** `reason`: el porque que escribio quien firma (= `suplementos[].por_que`). */
  razon: string | null;
}

/** Una practica activa (user_interventions) resuelta contra el catalogo. */
export interface PracticaParaVinculo {
  key: string;
  nombre: string;
  /** Raices del vocabulario controlado que la practica trabaja (catalogo `roots`). */
  raices: readonly string[];
  /** Biomarcadores que el catalogo liga a la practica (impacto + reglas de laboratorio). */
  marcadores: readonly string[];
}

export interface InsumosVinculo {
  /** null = no se pudo leer (distinto de "no tiene"). */
  suplementos: readonly SuplementoParaVinculo[] | null;
  practicas: readonly PracticaParaVinculo[] | null;
  /** Las palancas del cierre del documento. */
  palancas: readonly ElitePalanca[];
}

export type TipoVinculo = 'practica' | 'suplemento' | 'palanca';

export interface VinculoPlan {
  tipo: TipoVinculo;
  /** Estable dentro del marcador: `practica:<key>`, `suplemento:<id>`, `palanca:<n>`. */
  id: string;
  titulo: string;
  detalle: string | null;
  fuerza: FuerzaVinculo;
  etiquetaFuerza: string;
  ruta: RutaPerfil;
}

export interface ResultadoVinculos {
  vinculos: VinculoPlan[];
  /** Partes del plan que no se pudieron leer: la pantalla lo dice, no lo calla. */
  noSePudoLeer: ('suplementos' | 'practicas')[];
}

/** Palabras que no distinguen un marcador de otro. */
const VACIAS_VINCULO = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'e', 'o', 'u', 'a', 'al', 'por', 'para', 'con', 'sin',
  'tu', 'tus', 'su', 'sus', 'un', 'una', 'lo', 'le', 'que', 'se', 'nivel', 'niveles', 'valor',
  'serico', 'serica', 'sangre', 'plasma', 'suero', 'ayuno', 'ayunas', 'ni', 'no', 'mas', 'muy',
]);

/**
 * Lo que, justo antes de la mencion, la vuelve "no lo mueve": negaciones y
 * frases de compania o distancia ("acompaña a la vitamina D", "lejos del
 * hierro", "sin sueño profundo"). Se mira hasta tres palabras atras.
 */
const NEGADORES = new Set([
  'no', 'sin', 'ni', 'nunca', 'evita', 'evitar', 'evitas', 'lejos', 'separado', 'separada', 'aparte',
  'acompana', 'acompanan', 'acompanar', 'junto', 'junta', 'excepto', 'salvo',
]);
const VENTANA_NEGACION = 3;

/**
 * 8-oct-2026 (v4, revision en frio): la negacion tambien puede ir JUSTO
 * DESPUES de la mencion ("El LDL no es el objetivo"). Se miran dos palabras.
 */
const NEGADORES_DESPUES = new Set(['no', 'ni', 'nunca']);
const VENTANA_NEGACION_DESPUES = 2;

interface Token {
  t: string;
  /** Distingue (no es palabra vacia), o es la letra que sigue a "vitamina". */
  util: boolean;
}

function normalizar(texto: string): string[] {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Igual que normalizar, pero conservando mayusculas (para saber si una letra es la de una vitamina). */
function tokensConCaja(texto: string): string[] {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
}

/**
 * Tokens en orden, marcando cuales distinguen. Lo que sigue a "vitamina"
 * distingue si es una letra MAYUSCULA ("Vitamina A") o lleva digito ("D3",
 * "b12"): "toma tu vitamina a la misma hora" no nombra a la vitamina A.
 */
export function tokensVinculo(texto: string): Token[] {
  const conCaja = tokensConCaja(texto);
  const crudos = conCaja.map((t) => t.toLowerCase());
  return crudos.map((t, i) => {
    const trasVitamina = i > 0 && crudos[i - 1] === 'vitamina';
    const esLetraDeVitamina = trasVitamina && (/\d/.test(t) || /^[A-Z]$/.test(conCaja[i]));
    return { t, util: esLetraDeVitamina || (!VACIAS_VINCULO.has(t) && !(trasVitamina && t.length === 1)) };
  });
}

/** Iguales, o la vitamina D con su forma D2 o D3 (las dos son vitamina D). */
function mismoToken(delNombre: string, delTexto: string, trasVitamina: boolean): boolean {
  if (delNombre === delTexto) return true;
  return trasVitamina && delNombre === 'd' && /^d[23]$/.test(delTexto);
}

/**
 * true si la frase (sus tokens utiles, seguidos y en orden, saltando
 * palabras vacias) aparece en el texto sin una negacion justo antes.
 */
function buscarFrase(frase: readonly string[], texto: readonly Token[]): boolean {
  if (frase.length === 0) return false;
  const utiles = texto.map((x, i) => ({ ...x, i })).filter((x) => x.util);
  for (let k = 0; k + frase.length <= utiles.length; k++) {
    let ok = true;
    for (let j = 0; j < frase.length; j++) {
      const trasVitamina = j > 0 && frase[j - 1] === 'vitamina';
      if (!mismoToken(frase[j], utiles[k + j].t, trasVitamina)) { ok = false; break; }
    }
    if (!ok) continue;
    const inicio = utiles[k].i;
    const fin = utiles[k + frase.length - 1].i;
    const antes = texto.slice(Math.max(0, inicio - VENTANA_NEGACION), inicio).map((x) => x.t);
    if (antes.some((t) => NEGADORES.has(t))) continue;
    const despues = texto.slice(fin + 1, fin + 1 + VENTANA_NEGACION_DESPUES).map((x) => x.t);
    if (despues.some((t) => NEGADORES_DESPUES.has(t))) continue;
    return true;
  }
  return false;
}

/**
 * Las siglas del marcador: lo que va entre parentesis SOLO si es un codigo
 * corto sin espacios ("GGT", "LDL", "HOMA-IR"). "(PCR convencional)" o
 * "(homocisteína)" no son siglas: son explicacion.
 */
export function siglasDe(nombre: string): string[] {
  const m = /\(([^)]+)\)/.exec(nombre);
  if (!m) return [];
  const dentro = m[1].trim();
  return /^[A-Za-z0-9-]{2,8}$/.test(dentro) ? normalizar(dentro) : [];
}

/** El nombre sin parentesis, en sus tokens utiles. */
function fraseDelNombre(nombre: string): string[] {
  return tokensVinculo(nombre.replace(/\([^)]*\)/g, ' ')).filter((x) => x.util).map((x) => x.t);
}

/**
 * La llave cuenta como codigo solo si no es una palabra del nombre
 * ("homair" para "Resistencia a la insulina" si; "peso" para "Peso" no).
 */
function codigoDeLlave(m: Pick<EliteMarcador, 'nombre' | 'key'>): string[] {
  const k = normalizar(m.key);
  if (k.length !== 1 || !/^[a-z0-9]{2,8}$/.test(k[0])) return [];
  return fraseDelNombre(m.nombre).includes(k[0]) ? [] : k;
}

/**
 * El texto nombra al marcador con algo que lo identifica de verdad: sus
 * siglas, su llave cuando es un codigo, o al menos DOS palabras utiles de su
 * nombre seguidas. Una sola palabra ("peso", "grasa", "inflamación") no
 * basta. Si la mencion va negada ("no", "sin", "lejos de", "acompaña a"),
 * no cuenta. En la duda, sin vinculo.
 */
export function textoNombraMarcador(m: Pick<EliteMarcador, 'nombre' | 'key'>, texto: string): boolean {
  const tokens = tokensVinculo(texto);
  if (tokens.length === 0) return false;
  const siglas = siglasDe(m.nombre);
  if (siglas.length > 0 && buscarFrase(siglas, tokens)) return true;
  const codigo = codigoDeLlave(m);
  if (codigo.length > 0 && buscarFrase(codigo, tokens)) return true;
  const frase = fraseDelNombre(m.nombre);
  return frase.length >= 2 && buscarFrase(frase, tokens);
}

/**
 * El NOMBRE de un suplemento nombra al marcador (nunca su porque, que es
 * texto libre: "acompaña a la vitamina D" no hace de la K2 algo que mueva la
 * vitamina D). Siglas, llave-codigo o frase de dos palabras como en
 * textoNombraMarcador; y un marcador de una sola palabra ("Magnesio",
 * "Hierro") solo si es la PRIMERA palabra util del nombre del suplemento
 * ("Magnesio (glicinato)"): el nutriente que da nombre al frasco.
 */
export function nombreDeSuplementoNombraMarcador(m: Pick<EliteMarcador, 'nombre' | 'key'>, nombreSuplemento: string): boolean {
  if (textoNombraMarcador(m, nombreSuplemento)) return true;
  const frase = fraseDelNombre(m.nombre);
  if (frase.length !== 1) return false;
  const primera = tokensVinculo(nombreSuplemento.replace(/\([^)]*\)/g, ' ')).find((x) => x.util);
  return primera?.t === frase[0];
}

/** Nombres con los que el catalogo puede conocer al marcador: su llave, su puente (LAB_MARKER_MAP) y su nombre. */
function nombresDelMarcador(m: EliteMarcador): string[] {
  const out = [m.key];
  const puente = LAB_MARKER_MAP[m.key]?.marker;
  if (puente) out.push(puente);
  const c = claveCanonicaDeLaboratorio(m.key);
  if (c.ok && c.key !== m.key) {
    out.push(c.key);
    const p2 = LAB_MARKER_MAP[c.key]?.marker;
    if (p2) out.push(p2);
  }
  out.push(m.nombre);
  return out;
}

/**
 * Lo que mueve un marcador dentro del plan de la persona, del vinculo mas
 * fuerte al mas debil. Practicas: 'llave' si la raiz del marcador
 * (MARCADOR_A_RAIZ) esta entre las raices de la practica; 'nombre' si el
 * catalogo de la practica nombra el biomarcador (coincideMarcador).
 * Suplementos: 'texto' si su NOMBRE nombra al marcador
 * (nombreDeSuplementoNombraMarcador). Palancas: 'texto' si su texto lo nombra
 * con siglas, llave-codigo o dos palabras (textoNombraMarcador).
 *
 * 8-oct-2026 (v4, revision en frio): antes el porque del suplemento y el juez
 * de HOY (marcadorDePalanca) tambien ligaban; en la muestra real daban
 * vinculos falsos ("grasa" ligaba los trigliceridos a la palanca de la grasa
 * de los organos; "acompaña a la vitamina D" ligaba la K2). Se quitaron: en
 * la duda, sin vinculo.
 *
 * Una cosa aparece una sola vez, con su vinculo mas fuerte. Sin vinculo,
 * lista vacia: la pantalla no dice nada.
 */
export function vincularMarcadorPlan(m: EliteMarcador, insumos: InsumosVinculo): ResultadoVinculos {
  const porId = new Map<string, VinculoPlan>();
  const poner = (v: Omit<VinculoPlan, 'etiquetaFuerza'>) => {
    const previo = porId.get(v.id);
    if (previo && RANGO_FUERZA[previo.fuerza] <= RANGO_FUERZA[v.fuerza]) return;
    porId.set(v.id, { ...v, etiquetaFuerza: ETIQUETA_FUERZA[v.fuerza] });
  };

  const noSePudoLeer: ResultadoVinculos['noSePudoLeer'] = [];

  if (insumos.practicas === null) noSePudoLeer.push('practicas');
  else {
    const raiz = MARCADOR_A_RAIZ[m.key]?.raiz
      ?? (() => {
        const c = claveCanonicaDeLaboratorio(m.key);
        return c.ok ? MARCADOR_A_RAIZ[c.key]?.raiz : undefined;
      })();
    const nombres = nombresDelMarcador(m);
    for (const p of insumos.practicas) {
      const base = { tipo: 'practica' as const, id: `practica:${p.key}`, titulo: p.nombre, detalle: null, ruta: RUTAS_PERFIL.plan };
      if (raiz && p.raices.includes(raiz)) poner({ ...base, fuerza: 'llave' });
      else if (p.marcadores.some((pm) => nombres.some((n) => coincideMarcador(pm, n)))) poner({ ...base, fuerza: 'nombre' });
    }
  }

  if (insumos.suplementos === null) noSePudoLeer.push('suplementos');
  else {
    for (const s of insumos.suplementos) {
      if (!nombreDeSuplementoNombraMarcador(m, s.nombre)) continue;
      poner({
        tipo: 'suplemento', id: `suplemento:${s.id}`, titulo: s.nombre,
        detalle: textoONull(s.razon), fuerza: 'texto', ruta: RUTAS_PERFIL.suplementos,
      });
    }
  }

  insumos.palancas.forEach((p, i) => {
    if (!textoNombraMarcador(m, `${p.titulo}. ${p.por_que}. ${p.como}`)) return;
    poner({
      tipo: 'palanca', id: `palanca:${i + 1}`, titulo: p.titulo,
      detalle: textoONull(p.como), fuerza: 'texto', ruta: RUTAS_PERFIL.programa,
    });
  });

  const ordenTipo: Record<TipoVinculo, number> = { practica: 0, suplemento: 1, palanca: 2 };
  const vinculos = [...porId.values()].sort((a, b) =>
    RANGO_FUERZA[a.fuerza] - RANGO_FUERZA[b.fuerza] || ordenTipo[a.tipo] - ordenTipo[b.tipo]);
  return { vinculos, noSePudoLeer };
}

/** La frase cuando una parte del plan no se pudo leer. null si todo se leyo. */
export function avisoVinculosNoLeidos(partes: ResultadoVinculos['noSePudoLeer']): string | null {
  if (partes.length === 0) return null;
  const que = partes.length === 2 ? 'tus suplementos ni tus prácticas'
    : partes[0] === 'suplementos' ? 'tus suplementos' : 'tus prácticas';
  return `No pudimos leer ${que} para ver qué mueve este marcador.`;
}
