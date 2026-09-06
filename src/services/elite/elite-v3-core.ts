/**
 * Esquema `elite_v3`: la evaluacion ATP Elite dentro de la app (pivote 3.0,
 * Parte 2.3 punto 2; ruta 3.1). Logica PURA: cero React, cero supabase.
 * Se verifica con `node scripts/run-tests-sin-vitest.js`.
 *
 * Que es (5 de septiembre de 2026): el entregable de 12 secciones que hoy
 * Enrique produce como HTML (formato Omar, `R and D/diagnostico/Omar_DX_v3.html`)
 * convertido a un objeto de datos, mas tres manuales del brochure Elite 2026
 * (alimentacion, suplementos con dosis y hora, entrenamiento). Vive en
 * `functional_dx.sources_snapshot.elite_v3` con `model='enrique'`,
 * `generated_by='manual'` y `quality_level` 5 si trae genetica, 4 si no.
 * Cada revision es una fila nueva con `version` + 1 (append-only, nunca UPDATE).
 *
 * Vocabulario visual del formato Omar, respetado tal cual:
 *  - estado: 'att' (pide accion), 'sub' (en rango, no en su mejor punto),
 *    'opt' (donde queremos). null cuando no hay valor.
 *  - fuente: 'gen' (genetica), 'lab' (laboratorio, composicion, sensor),
 *    'ctx' (contexto: entrevista, cuestionarios, Braverman, habitos).
 *  - evidencia: escalera de 4 peldanos. 1 fuera del rango del laboratorio;
 *    2 dentro del laboratorio, fuera del criterio funcional; 3 criterio
 *    funcional interpretativo; 4 hay senal, no hay prueba. null si el
 *    clinico no lo anoto.
 *  - estimado: "(ESTIMADO, no medido)" del HTML como booleano.
 *
 * Reglas de la casa que el validador hace cumplir: nada de palabras rojas
 * en texto de usuario (informe legal, seccion 4) salvo en
 * `medico.pendientes[].con_quien`; cero em dashes; `estado` null si `valor`
 * es null; `evidencia` en 1..4; dosis nunca negativas. Lo que el HTML no
 * trae va en null, nunca inventado.
 */

import { AMOUNT_UNITS, SIN_DATO, type AmountUnit } from '@/src/services/supplements/adherencia-core';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export const ELITE_V3_SCHEMA = 'elite_v3' as const;

export type EliteEstado = 'att' | 'sub' | 'opt';
export type EliteFuente = 'gen' | 'lab' | 'ctx';
export type EliteEvidencia = 1 | 2 | 3 | 4;
export type EliteSexo = 'male' | 'female';

export const ELITE_ESTADOS: readonly EliteEstado[] = ['att', 'sub', 'opt'];
export const ELITE_FUENTES: readonly EliteFuente[] = ['gen', 'lab', 'ctx'];

/** Momentos de toma que ya usa el modulo Suplementos (app/supplements.tsx). */
export const ELITE_MOMENTOS = ['morning', 'with_food', 'afternoon', 'evening', 'bedtime'] as const;
export type EliteMomento = typeof ELITE_MOMENTOS[number];

export interface EliteRango {
  min: number | null;
  max: number | null;
}

export interface EliteMarcador {
  /** Clave canonica de la matriz V7/V6 cuando existe (glucosa_en_ayuno, homair); slug propio si no. */
  key: string;
  /** Nombre en lenguaje llano, como lo escribe el clinico: "Enzima del higado (GGT)". */
  nombre: string;
  valor: number | null;
  unidad: string | null;
  /** Rango de referencia del laboratorio, solo si el documento lo trae. */
  rango_lab: EliteRango | null;
  /** "Te queremos en": objetivo puesto por el equipo. Un solo lado = el otro en null. */
  objetivo: EliteRango | null;
  estado: EliteEstado | null;
  fuente: EliteFuente[];
  evidencia: EliteEvidencia | null;
  estimado: boolean;
  /** Comentario del clinico para esa persona. */
  nota?: string;
}

export interface EliteBloqueTexto {
  titulo: string;
  parrafos: string[];
}

export interface EliteInicio {
  edad_cronologica: number | null;
  edad_atp: number | null;
  /** edad_atp menos cronologica, un decimal; positivo = anos de mas. */
  diferencia_anios: number | null;
  lead: string | null;
  programa_semanas: number | null;
}

export interface EliteConteo {
  total_medido: number | null;
  piden_accion: number | null;
  valores_medidos: number | null;
  hallazgos_adn: number | null;
  ejes_quimica: number | null;
  /** Los que el clinico comenta uno por uno (= filas de `marcadores`). */
  mueven_tu_caso: { att: number; sub: number; opt: number } | null;
  ritmo_envejecimiento_meses: number | null;
  calidad_estudio: number | null;
}

export interface EliteEdades {
  real: number | null;
  sangre: number | null;
  vida: number | null;
  atp: number | null;
  /** SF global en porcentaje ("el 51.5% resume todo tu estudio"). */
  sf_pct: number | null;
  detalle: EliteBloqueTexto[];
}

export interface EliteSistema {
  /** Clave de dominio de la matriz (metabolismo, cardiovascular, ...). */
  key: string;
  nombre: string;
  score: number | null;
  estado: EliteEstado | null;
  por_que: string;
}

export interface EliteContexto {
  parrafos: string[];
  cita: string | null;
  antecedentes: string[];
}

export interface EliteGrupoMarcadores {
  nombre: string;
  marcadores: EliteMarcador[];
}

export interface EliteMarcadores {
  intro: string | null;
  grupos: EliteGrupoMarcadores[];
  /** "Algo honesto sobre este estudio": que fue estimado y como se mide despues. */
  notas: string[];
}

export interface EliteReparto {
  peso_kg: number | null;
  grasa_pct: number | null;
  grasa_kg: number | null;
  musculo_pct: number | null;
  musculo_kg: number | null;
  resto_pct: number | null;
  resto_kg: number | null;
}

export interface EliteComposicion {
  reparto: EliteReparto | null;
  /** Peso, % grasa, % musculo, grasa visceral, estatura, edad corporal: cada fila con su meta. */
  filas: EliteMarcador[];
}

export type EliteEje = 'dopamina' | 'acetilcolina' | 'serotonina' | 'gaba';
export const ELITE_EJES: readonly EliteEje[] = ['dopamina', 'acetilcolina', 'serotonina', 'gaba'];
export type EliteNivelEje = 'dom' | 'medio' | 'bajo';

export interface EliteEjeLectura {
  eje: EliteEje;
  titulo: string;
  nivel: EliteNivelEje | null;
  texto: string;
}

export interface EliteBraverman {
  intro: string | null;
  naturaleza: Record<EliteEje, number> | null;
  desgaste: Record<EliteEje, number> | null;
  /** Lecturas del desgaste (principal, secundarios, el menor). */
  lecturas: EliteBloqueTexto[];
  ejes: EliteEjeLectura[];
  cierre: string[];
}

export interface EliteHallazgoGenetico {
  /** Tema del reporte: "Tu higado y como limpias". */
  tema: string;
  /** Titular en lenguaje llano. */
  titulo: string;
  /** Gen o variante solo si el documento lo nombra; el formato Omar no lo hace. */
  gen: string | null;
  variante: string | null;
  genotipo?: string;
  hallazgo: string;
  implicacion: string;
  que_hacer: string | null;
  evidencia: EliteEvidencia | null;
  fuente: 'gen';
}

export interface EliteGenetica {
  intro: string | null;
  hallazgos: EliteHallazgoGenetico[];
  /** "Lo que tu genetica NO explica" y afines. */
  resumen: EliteBloqueTexto[];
}

export interface EliteCruce {
  titulo: string;
  fuentes: EliteFuente[];
  /** Los numeros que dispararon el cruce. */
  hallazgo: string;
  /** "Como lo sabemos": la logica que une los datos. */
  consecuencia: string;
  /** "La regla": que hacer, con metas y cuando se mide. */
  accion: string;
  evidencia: EliteEvidencia | null;
  /** "Con que mas cruza": convergencia con otros cruces. */
  con_que_cruza?: string;
  /** "Lo que falta medir" de ese cruce. */
  falta_medir?: string;
}

export interface EliteCruces {
  /** La variable que aparece en N de N cruces (el "hilo"). */
  hilo: { variable: string; en: number; de: number } | null;
  lista: EliteCruce[];
}

export interface ElitePendiente {
  /** Que estudio o valoracion falta. Nunca una conclusion medica. */
  que: string;
  por_que: string;
  /** Con quien se hace o quien prepara la orden. Unico campo donde el vocabulario clinico es libre. */
  con_quien: string;
}

export interface EliteFueraDelTuyo {
  marcador_key: string;
  nombre: string;
  valor_texto: string;
  lab_dice: string;
  nosotros_decimos: string;
}

export interface EliteMedico {
  intro: string | null;
  fuera_del_tuyo: EliteFueraDelTuyo[];
  pendientes: ElitePendiente[];
  /** "Lo que tu genetica dice de lo que tomas" y advertencias de uso. */
  advertencias: EliteBloqueTexto[];
}

export interface ElitePalanca {
  titulo: string;
  por_que: string;
  como: string;
}

export interface EliteCierre {
  palancas: [ElitePalanca, ElitePalanca, ElitePalanca];
  vigencia: string | null;
  firma: string | null;
  disclaimer: string | null;
}

export interface EliteHorario {
  momento: string;
  que: string;
}

export interface EliteAlimentacion {
  prioriza: string[];
  evita: string[];
  /** Ventana de alimentacion en HH:MM; null si el manual no la fija. */
  ventana: { inicio: string; fin: string } | null;
  horarios: EliteHorario[];
  notas: string[];
}

export interface EliteSuplemento {
  nombre: string;
  /** Cantidad de reactivo por unidad (por capsula, gota, porcion). null = no se sabe. */
  dosis_cantidad: number | null;
  dosis_unidad: AmountUnit | null;
  unidades_por_toma: number | null;
  /** Momento de toma del modulo Suplementos. null = el manual no fija la hora (la fila usa el default 'morning' de 055). */
  momento: EliteMomento | null;
  por_que: string;
  duracion?: string;
  advertencia?: string;
}

export interface EliteSesion {
  tipo: string;
  frecuencia_semana: string | null;
  duracion: string | null;
  intensidad: string | null;
  nota: string | null;
}

export interface EliteEntrenamiento {
  base: string | null;
  sesiones: EliteSesion[];
  descanso: string[];
  notas: string[];
}

export interface EliteV3 {
  schema: typeof ELITE_V3_SCHEMA;
  version: number;
  /** ISO 8601. */
  generado_en: string;
  /** Quien firma cada parte. La app es agnostica del proveedor de genetica. */
  interpretado_por: { evaluacion: string; genetica?: string };
  cliente: {
    nombre_preferido: string;
    sexo: EliteSexo;
    edad: number;
    /** Fecha de la toma de sangre (YYYY-MM-DD, o YYYY-MM si el documento solo trae el mes). */
    fecha_toma: string;
  };
  inicio: EliteInicio;
  conteo: EliteConteo;
  edades: EliteEdades;
  sistemas: EliteSistema[];
  contexto: EliteContexto;
  marcadores: EliteMarcadores;
  composicion: EliteComposicion;
  braverman: EliteBraverman;
  genetica: EliteGenetica;
  cruces: EliteCruces;
  medico: EliteMedico;
  cierre: EliteCierre;
  alimentacion: EliteAlimentacion;
  suplementos: EliteSuplemento[];
  entrenamiento: EliteEntrenamiento;
  /** HTML completo del entregable (cabe en JSONB). Exento del validador de texto: lo produce el generador de Enrique. */
  html?: string;
}

export const ELITE_SECCIONES = [
  'inicio', 'conteo', 'edades', 'sistemas', 'contexto', 'marcadores', 'composicion',
  'braverman', 'genetica', 'cruces', 'medico', 'cierre', 'alimentacion', 'suplementos', 'entrenamiento',
] as const;

// ---------------------------------------------------------------------------
// Palabras rojas y em dashes (informe legal, seccion 4; briefing regla 3)
// ---------------------------------------------------------------------------

/**
 * Se comparan sin acentos y en minusculas. "tienes [enfermedad]" no se puede
 * detectar por regex y queda a cargo de la revision humana.
 */
const PALABRAS_ROJAS: { nombre: string; re: RegExp }[] = [
  { nombre: 'diagnostico', re: /diagnostic/ },
  { nombre: 'tratamiento', re: /\btratamientos?\b/ },
  { nombre: 'terapeutico', re: /terapeutic/ },
  { nombre: 'previene', re: /\bprevien/ },
  { nombre: 'cura', re: /\bcura(r|s|n|tiv[oa]s?)?\b/ },
  { nombre: 'receta medica', re: /receta medica/ },
  { nombre: 'medico de IA', re: /medico de ia\b/ },
  { nombre: 'chequeo', re: /\bchequeos?\b/ },
  { nombre: 'clinicamente validado', re: /clinicamente validad/ },
];

/** U+2014. Se escribe escapado para que el propio candado no dispare el de verifica.js. */
const EM_DASH = '\u2014';

function sinAcentos(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Devuelve las palabras rojas que aparecen en un texto (vacio si esta limpio). */
export function palabrasRojasEn(texto: string): string[] {
  const t = sinAcentos(texto);
  return PALABRAS_ROJAS.filter((p) => p.re.test(t)).map((p) => p.nombre);
}

// ---------------------------------------------------------------------------
// Validador estructural (sin librerias)
// ---------------------------------------------------------------------------

type Errores = string[];

function esObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function esNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Recorre el objeto y entrega cada string con su ruta (para el candado de texto). */
function recorrerTextos(v: unknown, ruta: string, out: { ruta: string; texto: string }[]): void {
  if (typeof v === 'string') { out.push({ ruta, texto: v }); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => recorrerTextos(x, `${ruta}[${i}]`, out)); return; }
  if (esObj(v)) {
    for (const k of Object.keys(v)) recorrerTextos(v[k], ruta ? `${ruta}.${k}` : k, out);
  }
}

function validarRango(v: unknown, ruta: string, e: Errores): void {
  if (v === null) return;
  if (!esObj(v)) { e.push(`${ruta}: debe ser null o {min,max}`); return; }
  const { min, max } = v;
  if (min !== null && !esNum(min)) e.push(`${ruta}.min: numero o null`);
  if (max !== null && !esNum(max)) e.push(`${ruta}.max: numero o null`);
  if (min === null && max === null) e.push(`${ruta}: min y max no pueden ser ambos null (usa null en el rango)`);
  if (esNum(min) && esNum(max) && min > max) e.push(`${ruta}: min mayor que max`);
}

function validarEvidencia(v: unknown, ruta: string, e: Errores): void {
  if (v === null) return;
  if (!(esNum(v) && Number.isInteger(v) && v >= 1 && v <= 4)) e.push(`${ruta}: evidencia debe ser 1..4 o null`);
}

function validarEstado(v: unknown, ruta: string, e: Errores): void {
  if (v === null) return;
  if (!ELITE_ESTADOS.includes(v as EliteEstado)) e.push(`${ruta}: estado debe ser att|sub|opt|null`);
}

function validarFuentes(v: unknown, ruta: string, e: Errores): void {
  if (!Array.isArray(v) || v.length === 0) { e.push(`${ruta}: fuente debe ser un arreglo con al menos una de gen|lab|ctx`); return; }
  v.forEach((f, i) => { if (!ELITE_FUENTES.includes(f as EliteFuente)) e.push(`${ruta}[${i}]: fuente invalida`); });
}

function validarTextos(v: unknown, ruta: string, campos: string[], e: Errores): void {
  if (!esObj(v)) { e.push(`${ruta}: debe ser objeto`); return; }
  for (const c of campos) if (!esTexto(v[c])) e.push(`${ruta}.${c}: texto obligatorio`);
}

function validarMarcador(v: unknown, ruta: string, e: Errores): void {
  if (!esObj(v)) { e.push(`${ruta}: debe ser objeto`); return; }
  if (!esTexto(v.key) || !/^[a-z0-9_]+$/.test(v.key)) e.push(`${ruta}.key: slug en minusculas obligatorio`);
  if (!esTexto(v.nombre)) e.push(`${ruta}.nombre: texto obligatorio`);
  if (v.valor !== null && !esNum(v.valor)) e.push(`${ruta}.valor: numero o null`);
  if (v.unidad !== null && !esTexto(v.unidad)) e.push(`${ruta}.unidad: texto o null`);
  validarRango(v.rango_lab, `${ruta}.rango_lab`, e);
  validarRango(v.objetivo, `${ruta}.objetivo`, e);
  validarEstado(v.estado, `${ruta}.estado`, e);
  if (v.valor === null && v.estado !== null) e.push(`${ruta}.estado: debe ser null cuando valor es null`);
  validarFuentes(v.fuente, `${ruta}.fuente`, e);
  validarEvidencia(v.evidencia, `${ruta}.evidencia`, e);
  if (typeof v.estimado !== 'boolean') e.push(`${ruta}.estimado: booleano obligatorio`);
  if (v.nota !== undefined && !esTexto(v.nota)) e.push(`${ruta}.nota: texto si viene`);
}

function validarBloques(v: unknown, ruta: string, e: Errores): void {
  if (!Array.isArray(v)) { e.push(`${ruta}: arreglo obligatorio`); return; }
  v.forEach((b, i) => {
    if (!esObj(b) || !esTexto(b.titulo) || !Array.isArray(b.parrafos) || !b.parrafos.every(esTexto)) {
      e.push(`${ruta}[${i}]: {titulo, parrafos[]} con texto`);
    }
  });
}

function validarListaTexto(v: unknown, ruta: string, e: Errores): void {
  if (!Array.isArray(v) || !v.every(esTexto)) e.push(`${ruta}: arreglo de textos`);
}

function numOrNull(v: unknown, ruta: string, e: Errores): void {
  if (v !== null && !esNum(v)) e.push(`${ruta}: numero o null`);
}

function textoOrNull(v: unknown, ruta: string, e: Errores): void {
  if (v !== null && !esTexto(v)) e.push(`${ruta}: texto o null`);
}

const ISO_FECHA = /^\d{4}-\d{2}-\d{2}/;
/** La toma puede venir solo con mes (el formato Omar dice "mayo 2026"); nunca se inventa el dia. */
const FECHA_TOMA = /^\d{4}-\d{2}(-\d{2})?$/;

export function validarEliteV3(obj: unknown): { ok: true; valor: EliteV3 } | { ok: false; errores: string[] } {
  const e: Errores = [];
  if (!esObj(obj)) return { ok: false, errores: ['la evaluacion debe ser un objeto'] };

  if (obj.schema !== ELITE_V3_SCHEMA) e.push(`schema: debe ser '${ELITE_V3_SCHEMA}'`);
  if (!(esNum(obj.version) && Number.isInteger(obj.version) && obj.version >= 1)) e.push('version: entero >= 1');
  if (!esTexto(obj.generado_en) || !ISO_FECHA.test(obj.generado_en)) e.push('generado_en: fecha ISO obligatoria');

  if (!esObj(obj.interpretado_por) || !esTexto(obj.interpretado_por.evaluacion)) {
    e.push('interpretado_por.evaluacion: nombre de quien firma la evaluacion');
  } else if (obj.interpretado_por.genetica !== undefined && !esTexto(obj.interpretado_por.genetica)) {
    e.push('interpretado_por.genetica: texto si viene');
  }

  if (!esObj(obj.cliente)) e.push('cliente: objeto obligatorio');
  else {
    const c = obj.cliente;
    if (!esTexto(c.nombre_preferido)) e.push('cliente.nombre_preferido: texto obligatorio');
    if (c.sexo !== 'male' && c.sexo !== 'female') e.push('cliente.sexo: male|female');
    if (!(esNum(c.edad) && Number.isInteger(c.edad) && c.edad >= 0 && c.edad <= 120)) e.push('cliente.edad: entero 0..120');
    if (!esTexto(c.fecha_toma) || !FECHA_TOMA.test(c.fecha_toma)) e.push('cliente.fecha_toma: YYYY-MM o YYYY-MM-DD');
  }

  for (const s of ELITE_SECCIONES) {
    const v = obj[s];
    const esperaArreglo = s === 'sistemas' || s === 'suplementos';
    if (v === undefined || v === null || (esperaArreglo ? !Array.isArray(v) : !esObj(v))) {
      e.push(`${s}: seccion faltante`);
    }
  }
  // Si falta estructura de base no vale la pena seguir: los errores de abajo serian ruido.
  if (e.length) return { ok: false, errores: e };

  const inicio = obj.inicio as Record<string, unknown>;
  ['edad_cronologica', 'edad_atp', 'diferencia_anios', 'programa_semanas'].forEach((k) => numOrNull(inicio[k], `inicio.${k}`, e));
  textoOrNull(inicio.lead, 'inicio.lead', e);

  const conteo = obj.conteo as Record<string, unknown>;
  ['total_medido', 'piden_accion', 'valores_medidos', 'hallazgos_adn', 'ejes_quimica', 'ritmo_envejecimiento_meses', 'calidad_estudio']
    .forEach((k) => numOrNull(conteo[k], `conteo.${k}`, e));
  if (conteo.mueven_tu_caso !== null) {
    const m = conteo.mueven_tu_caso;
    if (!esObj(m) || !esNum(m.att) || !esNum(m.sub) || !esNum(m.opt)) e.push('conteo.mueven_tu_caso: {att,sub,opt} numericos o null');
  }
  if (esNum(conteo.calidad_estudio) && (conteo.calidad_estudio < 0 || conteo.calidad_estudio > 100)) e.push('conteo.calidad_estudio: 0..100');

  const edades = obj.edades as Record<string, unknown>;
  ['real', 'sangre', 'vida', 'atp', 'sf_pct'].forEach((k) => numOrNull(edades[k], `edades.${k}`, e));
  validarBloques(edades.detalle, 'edades.detalle', e);

  (obj.sistemas as unknown[]).forEach((s, i) => {
    const ruta = `sistemas[${i}]`;
    if (!esObj(s)) { e.push(`${ruta}: objeto`); return; }
    if (!esTexto(s.key) || !/^[a-z0-9_]+$/.test(s.key)) e.push(`${ruta}.key: slug obligatorio`);
    if (!esTexto(s.nombre)) e.push(`${ruta}.nombre: texto obligatorio`);
    numOrNull(s.score, `${ruta}.score`, e);
    if (esNum(s.score) && (s.score < 0 || s.score > 100)) e.push(`${ruta}.score: 0..100`);
    validarEstado(s.estado, `${ruta}.estado`, e);
    if (s.score === null && s.estado !== null) e.push(`${ruta}.estado: null cuando score es null`);
    if (!esTexto(s.por_que)) e.push(`${ruta}.por_que: texto obligatorio`);
  });

  const contexto = obj.contexto as Record<string, unknown>;
  validarListaTexto(contexto.parrafos, 'contexto.parrafos', e);
  textoOrNull(contexto.cita, 'contexto.cita', e);
  validarListaTexto(contexto.antecedentes, 'contexto.antecedentes', e);

  const marcadores = obj.marcadores as Record<string, unknown>;
  textoOrNull(marcadores.intro, 'marcadores.intro', e);
  if (!Array.isArray(marcadores.grupos)) e.push('marcadores.grupos: arreglo obligatorio');
  else marcadores.grupos.forEach((g, i) => {
    if (!esObj(g) || !esTexto(g.nombre) || !Array.isArray(g.marcadores)) { e.push(`marcadores.grupos[${i}]: {nombre, marcadores[]}`); return; }
    g.marcadores.forEach((m: unknown, j: number) => validarMarcador(m, `marcadores.grupos[${i}].marcadores[${j}]`, e));
  });
  validarListaTexto(marcadores.notas, 'marcadores.notas', e);

  const composicion = obj.composicion as Record<string, unknown>;
  if (composicion.reparto !== null) {
    if (!esObj(composicion.reparto)) e.push('composicion.reparto: objeto o null');
    else ['peso_kg', 'grasa_pct', 'grasa_kg', 'musculo_pct', 'musculo_kg', 'resto_pct', 'resto_kg']
      .forEach((k) => numOrNull((composicion.reparto as Record<string, unknown>)[k], `composicion.reparto.${k}`, e));
  }
  if (!Array.isArray(composicion.filas)) e.push('composicion.filas: arreglo obligatorio');
  else composicion.filas.forEach((m, i) => validarMarcador(m, `composicion.filas[${i}]`, e));

  const braverman = obj.braverman as Record<string, unknown>;
  textoOrNull(braverman.intro, 'braverman.intro', e);
  for (const k of ['naturaleza', 'desgaste']) {
    const r = braverman[k];
    if (r === null) continue;
    if (!esObj(r) || !ELITE_EJES.every((eje) => esNum(r[eje]))) e.push(`braverman.${k}: {dopamina, acetilcolina, serotonina, gaba} numericos o null`);
  }
  validarBloques(braverman.lecturas, 'braverman.lecturas', e);
  if (!Array.isArray(braverman.ejes)) e.push('braverman.ejes: arreglo obligatorio');
  else braverman.ejes.forEach((x, i) => {
    if (!esObj(x) || !ELITE_EJES.includes(x.eje as EliteEje) || !esTexto(x.titulo) || !esTexto(x.texto)
      || (x.nivel !== null && !['dom', 'medio', 'bajo'].includes(x.nivel as string))) {
      e.push(`braverman.ejes[${i}]: {eje, titulo, nivel dom|medio|bajo|null, texto}`);
    }
  });
  validarListaTexto(braverman.cierre, 'braverman.cierre', e);

  const genetica = obj.genetica as Record<string, unknown>;
  textoOrNull(genetica.intro, 'genetica.intro', e);
  if (!Array.isArray(genetica.hallazgos)) e.push('genetica.hallazgos: arreglo obligatorio');
  else genetica.hallazgos.forEach((h, i) => {
    const ruta = `genetica.hallazgos[${i}]`;
    if (!esObj(h)) { e.push(`${ruta}: objeto`); return; }
    validarTextos(h, ruta, ['tema', 'titulo', 'hallazgo', 'implicacion'], e);
    textoOrNull(h.gen, `${ruta}.gen`, e);
    textoOrNull(h.variante, `${ruta}.variante`, e);
    if (h.genotipo !== undefined && !esTexto(h.genotipo)) e.push(`${ruta}.genotipo: texto si viene`);
    textoOrNull(h.que_hacer, `${ruta}.que_hacer`, e);
    validarEvidencia(h.evidencia, `${ruta}.evidencia`, e);
    if (h.fuente !== 'gen') e.push(`${ruta}.fuente: debe ser 'gen'`);
  });
  validarBloques(genetica.resumen, 'genetica.resumen', e);
  if (Array.isArray(genetica.hallazgos) && genetica.hallazgos.length > 0
    && !(esObj(obj.interpretado_por) && esTexto(obj.interpretado_por.genetica))) {
    e.push('interpretado_por.genetica: obligatorio cuando hay hallazgos geneticos');
  }

  const cruces = obj.cruces as Record<string, unknown>;
  if (cruces.hilo !== null) {
    const h = cruces.hilo;
    if (!esObj(h) || !esTexto(h.variable) || !esNum(h.en) || !esNum(h.de) || h.en > h.de) e.push('cruces.hilo: {variable, en, de} con en <= de, o null');
  }
  if (!Array.isArray(cruces.lista)) e.push('cruces.lista: arreglo obligatorio');
  else cruces.lista.forEach((c, i) => {
    const ruta = `cruces.lista[${i}]`;
    if (!esObj(c)) { e.push(`${ruta}: objeto`); return; }
    validarTextos(c, ruta, ['titulo', 'hallazgo', 'consecuencia', 'accion'], e);
    validarFuentes(c.fuentes, `${ruta}.fuentes`, e);
    validarEvidencia(c.evidencia, `${ruta}.evidencia`, e);
    if (c.con_que_cruza !== undefined && !esTexto(c.con_que_cruza)) e.push(`${ruta}.con_que_cruza: texto si viene`);
    if (c.falta_medir !== undefined && !esTexto(c.falta_medir)) e.push(`${ruta}.falta_medir: texto si viene`);
  });

  const medico = obj.medico as Record<string, unknown>;
  textoOrNull(medico.intro, 'medico.intro', e);
  if (!Array.isArray(medico.fuera_del_tuyo)) e.push('medico.fuera_del_tuyo: arreglo obligatorio');
  else medico.fuera_del_tuyo.forEach((f, i) => validarTextos(f, `medico.fuera_del_tuyo[${i}]`, ['marcador_key', 'nombre', 'valor_texto', 'lab_dice', 'nosotros_decimos'], e));
  if (!Array.isArray(medico.pendientes)) e.push('medico.pendientes: arreglo obligatorio');
  else medico.pendientes.forEach((p, i) => validarTextos(p, `medico.pendientes[${i}]`, ['que', 'por_que', 'con_quien'], e));
  validarBloques(medico.advertencias, 'medico.advertencias', e);

  const cierre = obj.cierre as Record<string, unknown>;
  if (!Array.isArray(cierre.palancas) || cierre.palancas.length !== 3) e.push('cierre.palancas: exactamente tres');
  else cierre.palancas.forEach((p, i) => validarTextos(p, `cierre.palancas[${i}]`, ['titulo', 'por_que', 'como'], e));
  ['vigencia', 'firma', 'disclaimer'].forEach((k) => textoOrNull(cierre[k], `cierre.${k}`, e));

  const alimentacion = obj.alimentacion as Record<string, unknown>;
  validarListaTexto(alimentacion.prioriza, 'alimentacion.prioriza', e);
  validarListaTexto(alimentacion.evita, 'alimentacion.evita', e);
  if (alimentacion.ventana !== null) {
    const v = alimentacion.ventana;
    const HHMM = /^\d{2}:\d{2}$/;
    if (!esObj(v) || !esTexto(v.inicio) || !esTexto(v.fin) || !HHMM.test(v.inicio) || !HHMM.test(v.fin)) e.push('alimentacion.ventana: {inicio HH:MM, fin HH:MM} o null');
  }
  if (!Array.isArray(alimentacion.horarios)) e.push('alimentacion.horarios: arreglo obligatorio');
  else alimentacion.horarios.forEach((h, i) => validarTextos(h, `alimentacion.horarios[${i}]`, ['momento', 'que'], e));
  validarListaTexto(alimentacion.notas, 'alimentacion.notas', e);

  (obj.suplementos as unknown[]).forEach((s, i) => {
    const ruta = `suplementos[${i}]`;
    if (!esObj(s)) { e.push(`${ruta}: objeto`); return; }
    if (!esTexto(s.nombre)) e.push(`${ruta}.nombre: texto obligatorio`);
    if (s.dosis_cantidad !== null && !(esNum(s.dosis_cantidad) && s.dosis_cantidad > 0)) e.push(`${ruta}.dosis_cantidad: numero mayor que cero o null`);
    if (s.dosis_unidad !== null && !AMOUNT_UNITS.includes(s.dosis_unidad as AmountUnit)) e.push(`${ruta}.dosis_unidad: ${AMOUNT_UNITS.join('|')} o null`);
    if (esNum(s.dosis_cantidad) && s.dosis_unidad === null) e.push(`${ruta}.dosis_unidad: obligatoria cuando hay cantidad`);
    if (s.unidades_por_toma !== null && !(esNum(s.unidades_por_toma) && s.unidades_por_toma > 0)) e.push(`${ruta}.unidades_por_toma: numero mayor que cero o null`);
    if (s.momento !== null && !ELITE_MOMENTOS.includes(s.momento as EliteMomento)) e.push(`${ruta}.momento: ${ELITE_MOMENTOS.join('|')} o null`);
    if (!esTexto(s.por_que)) e.push(`${ruta}.por_que: texto obligatorio`);
    if (s.duracion !== undefined && !esTexto(s.duracion)) e.push(`${ruta}.duracion: texto si viene`);
    if (s.advertencia !== undefined && !esTexto(s.advertencia)) e.push(`${ruta}.advertencia: texto si viene`);
  });

  const entrenamiento = obj.entrenamiento as Record<string, unknown>;
  textoOrNull(entrenamiento.base, 'entrenamiento.base', e);
  if (!Array.isArray(entrenamiento.sesiones)) e.push('entrenamiento.sesiones: arreglo obligatorio');
  else entrenamiento.sesiones.forEach((s, i) => {
    const ruta = `entrenamiento.sesiones[${i}]`;
    if (!esObj(s) || !esTexto(s.tipo)) { e.push(`${ruta}: {tipo, ...}`); return; }
    ['frecuencia_semana', 'duracion', 'intensidad', 'nota'].forEach((k) => textoOrNull(s[k], `${ruta}.${k}`, e));
  });
  validarListaTexto(entrenamiento.descanso, 'entrenamiento.descanso', e);
  validarListaTexto(entrenamiento.notas, 'entrenamiento.notas', e);

  if (obj.html !== undefined && typeof obj.html !== 'string') e.push('html: texto si viene');

  // Candado de texto: palabras rojas y em dashes en todo lo que ve el usuario.
  // `html` queda fuera (lo produce el generador de Enrique, no este esquema).
  const textos: { ruta: string; texto: string }[] = [];
  const { html: _html, ...sinHtml } = obj;
  recorrerTextos(sinHtml, '', textos);
  for (const { ruta, texto } of textos) {
    if (texto.includes(EM_DASH)) e.push(`${ruta}: em dash en texto de usuario`);
    if (/^medico\.pendientes\[\d+\]\.con_quien$/.test(ruta)) continue;
    const rojas = palabrasRojasEn(texto);
    if (rojas.length) e.push(`${ruta}: palabra roja (${rojas.join(', ')})`);
  }

  if (e.length) return { ok: false, errores: e };
  return { ok: true, valor: obj as unknown as EliteV3 };
}

// ---------------------------------------------------------------------------
// Derivados
// ---------------------------------------------------------------------------

/** Nivel de calidad para functional_dx (170): 5 con genetica, 4 sin ella. */
export function nivelCalidadEliteV3(e: EliteV3): 4 | 5 {
  return e.genetica.hallazgos.length > 0 ? 5 : 4;
}

/** `sources_snapshot` de functional_dx trae `elite_v3` con el esquema correcto. */
export function esEliteV3(snapshot: unknown): boolean {
  if (!esObj(snapshot)) return false;
  const ev = snapshot.elite_v3;
  return esObj(ev) && ev.schema === ELITE_V3_SCHEMA;
}

/** Todos los marcadores comentados, en el orden del documento (grupos y composicion). */
export function marcadoresDe(e: EliteV3): EliteMarcador[] {
  return e.marcadores.grupos.flatMap((g) => g.marcadores).concat(e.composicion.filas);
}

function rangoTexto(r: EliteRango | null): string {
  if (!r) return '';
  if (r.min !== null && r.max !== null) return `${r.min} a ${r.max}`;
  if (r.max !== null) return `hasta ${r.max}`;
  if (r.min !== null) return `desde ${r.min}`;
  return '';
}

function valorTexto(m: EliteMarcador): string {
  const v = m.valor === null ? SIN_DATO : String(m.valor);
  return m.unidad ? `${v} ${m.unidad}` : v;
}

export const RESUMEN_ARGOS_MAX = 1800;

/** Tope por bloque para que ningun bloque se coma el presupuesto de los demas. */
const RESUMEN_TOPES = { att: 720, cruces: 420, suplementos: 320 } as const;

/**
 * Arma "prefijo item; item; item." metiendo elementos mientras quepan en
 * `max`; si sobran, lo dice con un conteo en vez de cortar a media frase.
 */
function bloqueLista(prefijo: string, items: string[], max: number): string {
  const armar = (n: number) => {
    const restantes = items.length - n;
    return `${prefijo}${items.slice(0, n).join('; ')}${restantes ? ` (+${restantes} mas)` : ''}.`;
  };
  let n = 0;
  while (n < items.length && armar(n + 1).length <= max) n += 1;
  return n === 0 ? '' : armar(n);
}

/**
 * Resumen de la evaluacion para el system prompt de ARGOS (ruta 3.6). Maximo
 * 1,800 caracteres: quien es, marcadores en `att`, cruces, palancas y plan
 * de suplementos con dosis. Solo reordena texto ya validado: no agrega
 * palabras rojas ni em dashes. Las listas largas se acortan con "(+N mas)".
 */
export function resumenParaArgos(e: EliteV3): string {
  const c = e.cliente;
  const sexo = c.sexo === 'female' ? 'mujer' : 'hombre';
  const partes: string[] = [];
  const restante = () => RESUMEN_ARGOS_MAX - partes.reduce((acc, p) => acc + p.length + 1, 0);
  const agregar = (p: string) => { if (p && p.length <= restante()) partes.push(p); };

  const edadAtp = e.inicio.edad_atp !== null ? `, Edad ATP ${e.inicio.edad_atp}` : '';
  const firma = `${e.interpretado_por.evaluacion}${e.interpretado_por.genetica ? `; genetica: ${e.interpretado_por.genetica}` : ''}`;
  agregar(`Evaluacion Elite v${e.version} de ${c.nombre_preferido}, ${sexo} de ${c.edad} anios${edadAtp} (toma ${c.fecha_toma}). Firma: ${firma}.`);

  const att = marcadoresDe(e).filter((m) => m.estado === 'att');
  if (att.length) {
    const items = att.map((m) => {
      const obj = rangoTexto(m.objetivo);
      return `${m.nombre} ${valorTexto(m)}${obj ? ` (objetivo ${obj})` : ''}${m.estimado ? ' [estimado]' : ''}`;
    });
    agregar(bloqueLista(`Piden accion (${att.length}): `, items, Math.min(RESUMEN_TOPES.att, restante())));
  }

  if (e.cruces.hilo) agregar(`Hilo: ${e.cruces.hilo.variable} aparece en ${e.cruces.hilo.en} de ${e.cruces.hilo.de} cruces.`);
  // Palancas antes que cruces: son tres y ordenan todo lo demas.
  agregar(`Palancas: ${e.cierre.palancas.map((p, i) => `${i + 1}) ${p.titulo}`).join('; ')}.`);

  if (e.suplementos.length) {
    const items = e.suplementos.map((s) => {
      const dosis = s.dosis_cantidad !== null && s.dosis_unidad ? `${s.dosis_cantidad} ${s.dosis_unidad}` : 'dosis sin fijar';
      const tomas = s.unidades_por_toma !== null ? ` x${s.unidades_por_toma}` : '';
      return `${s.nombre} ${dosis}${tomas} (${s.momento ?? 'hora sin fijar'})`;
    });
    agregar(bloqueLista('Plan de suplementos: ', items, Math.min(RESUMEN_TOPES.suplementos, restante())));
  }

  if (e.cruces.lista.length) {
    const items = e.cruces.lista.map((x, i) => `${i + 1}) ${x.titulo}`);
    agregar(bloqueLista('Cruces: ', items, Math.min(RESUMEN_TOPES.cruces, restante())));
  }

  if (e.medico.pendientes.length) {
    agregar(bloqueLista('Pendiente de medir: ', e.medico.pendientes.map((p) => p.que), restante()));
  }

  return partes.join(' ');
}

/** Fila lista para insertar en user_supplements (055 + 167 + 312). */
export interface FilaUserSupplement {
  user_id: string;
  name: string;
  /** Texto que muestra la ficha (055, NOT NULL). Raya cuando el plan no fija cantidad. */
  dosage: string;
  timing: EliteMomento;
  source: 'coach';
  reason: string;
  is_plan: true;
  is_active: true;
  amount_per_unit: number | null;
  amount_unit: AmountUnit | null;
  units_per_dose: number | null;
  notes: string | null;
}

function dosageTexto(s: EliteSuplemento): string {
  const cantidad = s.dosis_cantidad !== null && s.dosis_unidad ? `${s.dosis_cantidad} ${s.dosis_unidad}` : null;
  const unidades = s.unidades_por_toma !== null ? `${s.unidades_por_toma} por toma` : null;
  if (cantidad && unidades) return `${unidades} de ${cantidad}`;
  return cantidad ?? unidades ?? SIN_DATO;
}

/**
 * Convierte el plan de la evaluacion en filas de `user_supplements` con
 * `source='coach'` e `is_plan=true` (pivote 2.3 punto 4). Las inserta el RPC
 * `elite_cargar_evaluacion` (ruta 3.2), nunca este modulo.
 */
export function suplementosAFilas(e: EliteV3, userId: string): FilaUserSupplement[] {
  return e.suplementos.map((s) => {
    const notas = [s.duracion ? `Duracion: ${s.duracion}` : null, s.advertencia ?? null].filter((x): x is string => x !== null);
    return {
      user_id: userId,
      name: s.nombre,
      dosage: dosageTexto(s),
      timing: s.momento ?? 'morning',
      source: 'coach',
      reason: s.por_que,
      is_plan: true,
      is_active: true,
      amount_per_unit: s.dosis_cantidad,
      amount_unit: s.dosis_cantidad !== null ? s.dosis_unidad : null,
      units_per_dose: s.unidades_por_toma,
      notes: notas.length ? notas.join('. ') : null,
    };
  });
}
