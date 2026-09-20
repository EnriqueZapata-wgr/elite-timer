/**
 * Marcadores de la evaluacion Elite -> filas de `lab_values` (20-sep-2026).
 * Logica PURA: cero React, cero supabase. Se verifica con
 * `node scripts/run-tests-sin-vitest.js`.
 *
 * POR QUE EXISTE. El RPC `elite_cargar_evaluacion` (318 + 321) guardaba la
 * evaluacion en `functional_dx` y el plan en `user_supplements`, pero los
 * marcadores medidos se quedaban dentro del JSON: el expediente de labs
 * (`/edad-atp/labs`), el comparador y ARGOS leen `lab_values`, asi que para
 * ellos el cliente Elite llegaba SIN laboratorios aunque acabara de pagar por
 * la lectura de treinta. La migracion 324 (`elite_cargar_completa`) escribe
 * esas filas; este modulo decide CUALES y con que clave.
 *
 * POR QUE VIVE EN TYPESCRIPT Y NO EN EL SQL. La clave canonica de un
 * laboratorio (`parameter_key`) la define `lab-canonical-map.ts`, y ya hay un
 * espejo suyo en SQL (072) con la nota "si se edita uno, editar el otro". Un
 * tercer mapa en la 324 seria garantizar que en un anio digan cosas
 * distintas. Aqui se reutiliza el mapa del cliente tal cual y el payload
 * viaja con las filas ya resueltas (`lab_values_filas`), igual que
 * `suplementos_filas` y `roots_detected`. Lo que no mapea NO se inventa: va
 * en `lab_values_omitidos` con su motivo y el RPC lo devuelve como aviso.
 *
 * REGLAS
 *  - Solo entra lo que es un LABORATORIO: clave en el mapa canonico de
 *    `lab_results` (LAB_COLUMN_TO_CANONICAL) o parametro de la matriz V7/V6
 *    con `source = 'Laboratorio'`. Composicion corporal, wearables, tests y
 *    calculos (relacion TG/HDL) tienen su propia tabla o son derivados: no
 *    van a `lab_values`.
 *  - `estimado: true` no se escribe nunca: un estimado en el expediente se
 *    leeria como medido.
 *  - `valor: null` no se escribe (raya, no cero).
 *  - Las claves que en `lab_results` comparten columna (ggt, AST) se
 *    desdoblan en TODAS sus claves canonicas, exactamente como hace
 *    `toCanonicalEntries` al escribir un PDF: si no, la matriz V7 (que puntua
 *    `gama_glutamil_transferasa`) no veria el `ggt` del documento.
 *  - hba1c, hematocrito y rdw_cv se guardan en fraccion decimal, como el
 *    resto de `lab_values` (CANONICAL_PCT_KEYS). El documento los trae en %.
 *  - La unidad es la que trae el documento o null. La unidad de la matriz no
 *    se supone: afirmar "mg/dl" sobre un numero que llego sin unidad es
 *    inventar.
 */

import { MATRIZ_HOMBRES, MATRIZ_MUJERES, type MatrizSexo } from '@/src/constants/edad-atp-matriz-v7-v6';
import { LAB_COLUMN_TO_CANONICAL, canonicalParameterKey, toCanonicalUnit } from '@/src/constants/lab-canonical-map';
import { marcadoresDe, type EliteMarcador, type EliteV3 } from './elite-v3-core';

/** Una fila lista para `lab_values` (sin user_id ni fecha: los pone el RPC). */
export interface FilaLabValueElite {
  parameter_key: string;
  value: number;
  unit: string | null;
  /** Nombre en lenguaje llano del documento, para el aviso y el metadata. */
  nombre: string;
  /** Clave original del documento (puede diferir de parameter_key al desdoblar ggt o AST). */
  key_documento: string;
}

export type MotivoOmision =
  | 'sin_valor'
  | 'estimado'
  | 'no_es_laboratorio'
  | 'sin_clave_canonica';

export interface MarcadorOmitido {
  key: string;
  nombre: string;
  motivo: MotivoOmision;
}

export interface LabValuesDeEvaluacion {
  filas: FilaLabValueElite[];
  omitidos: MarcadorOmitido[];
}

/** Texto para el aviso del RPC y para la terminal, por motivo. */
export const MOTIVO_OMISION_TEXTO: Record<MotivoOmision, string> = {
  sin_valor: 'sin valor en el documento',
  estimado: 'estimado, no medido',
  no_es_laboratorio: 'no es un laboratorio (composicion, wearable, test o calculo)',
  sin_clave_canonica: 'clave sin equivalente canonico en lab_values',
};

/**
 * Alias del formato Omar que no son la clave canonica pero la nombran sin
 * ambiguedad. Cortos a proposito: si un marcador no esta aqui ni en los mapas
 * del cliente, se omite con aviso y quien firma decide la clave, no este
 * modulo. Espejo de los alias de `biomarcador-contenido.ts` (`ALIAS`, no
 * exportado) mas los del vocabulario de raices de `elite-v3-core.ts`.
 */
export const ALIAS_MARCADOR_ELITE: Readonly<Record<string, string>> = {
  homa_ir: 'homair',
  insulina_ayuno: 'insulina',
  insulina_en_ayuno: 'insulina',
  glucosa: 'glucosa_en_ayuno',
  glucosa_ayuno: 'glucosa_en_ayuno',
  hierro_libre: 'hierro_serico',
  pcr: 'proteina_c_reactiva_cuantitativa_pcr',
  pcr_ultrasensible: 'proteina_c_reactiva_cuantitativa_pcr',
  crp_mg_dl: 'proteina_c_reactiva_cuantitativa_pcr',
  glucose_mg_dl: 'glucosa_en_ayuno',
  anti_tpo: 'anticuerpos_antitpo',
  progesterone: 'progesterona',
  transaminasa_g_oxalacetica_ast_tgo: 'transaminasa_glutamico_oxalacetica_ast',
  cortisol: 'cortisol_matutino',
  testosterona: 'testosterona_total',
  b12: 'vitamina_b12',
  vit_d: 'vitamina_d',
  vitamina_d3: 'vitamina_d',
};

function clavesDeLaboratorioDeMatriz(matriz: MatrizSexo, out: Set<string>): void {
  for (const dom of Object.values(matriz)) {
    for (const p of dom.params) if (p.source === 'Laboratorio') out.add(p.key);
  }
}

/** Claves canonicas que cuentan como laboratorio. Se arma una vez. */
function armarClavesLab(): Set<string> {
  const out = new Set<string>();
  for (const m of Object.values(LAB_COLUMN_TO_CANONICAL)) for (const k of m.keys) out.add(k);
  clavesDeLaboratorioDeMatriz(MATRIZ_HOMBRES, out);
  clavesDeLaboratorioDeMatriz(MATRIZ_MUJERES, out);
  return out;
}

/** Clave canonica -> todas las claves hermanas de su columna en lab_results (ggt, AST). */
function armarHermanas(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of Object.values(LAB_COLUMN_TO_CANONICAL)) {
    if (m.keys.length < 2) continue;
    for (const k of m.keys) out.set(k, m.keys);
  }
  return out;
}

const CLAVES_LAB = armarClavesLab();
const HERMANAS = armarHermanas();

/**
 * Resuelve la clave de un marcador del documento a su clave canonica de
 * laboratorio, o dice por que no. Orden: tal cual, alias Elite, colapso
 * ingles -> espanol del mapa canonico (`canonicalParameterKey`).
 */
export function claveCanonicaDeLaboratorio(key: string): { ok: true; key: string } | { ok: false; motivo: MotivoOmision } {
  const candidatos = [key, ALIAS_MARCADOR_ELITE[key], canonicalParameterKey(key)]
    .filter((k): k is string => typeof k === 'string' && k.length > 0);
  for (const k of candidatos) if (CLAVES_LAB.has(k)) return { ok: true, key: k };
  // Existe como clave de la matriz pero no es laboratorio (composicion,
  // wearable, test, calculo): se dice con ese nombre para que no se busque
  // un alias que no hace falta.
  const esDeMatriz = [MATRIZ_HOMBRES, MATRIZ_MUJERES].some((m) =>
    Object.values(m).some((dom) => dom.params.some((p) => candidatos.includes(p.key))));
  return { ok: false, motivo: esDeMatriz ? 'no_es_laboratorio' : 'sin_clave_canonica' };
}

function filasDeMarcador(m: EliteMarcador, clave: string): FilaLabValueElite[] {
  const valor = m.valor as number;
  const claves = HERMANAS.get(clave) ?? [clave];
  return claves.map((parameter_key) => ({
    parameter_key,
    // Seis decimales: 5.2 / 100 da 0.052000000000000005 en coma flotante y
    // la 307 compara valores con round(value, 6). No es redondeo clinico.
    value: Math.round(toCanonicalUnit(parameter_key, valor) * 1e6) / 1e6,
    unit: m.unidad ?? null,
    nombre: m.nombre,
    key_documento: m.key,
  }));
}

/**
 * Filas de `lab_values` que salen de la evaluacion, y lo que se quedo fuera
 * con su motivo. Recorre `marcadores.grupos` y `composicion.filas` en el
 * orden del documento; si dos marcadores resuelven a la misma clave se queda
 * el primero (un valor vivo por dato y fecha, regla de la 308).
 */
export function labValuesDeEvaluacion(e: EliteV3): LabValuesDeEvaluacion {
  const filas: FilaLabValueElite[] = [];
  const omitidos: MarcadorOmitido[] = [];
  const vistas = new Set<string>();
  for (const m of marcadoresDe(e)) {
    if (m.valor === null) { omitidos.push({ key: m.key, nombre: m.nombre, motivo: 'sin_valor' }); continue; }
    if (m.estimado) { omitidos.push({ key: m.key, nombre: m.nombre, motivo: 'estimado' }); continue; }
    const r = claveCanonicaDeLaboratorio(m.key);
    if (!r.ok) { omitidos.push({ key: m.key, nombre: m.nombre, motivo: r.motivo }); continue; }
    for (const f of filasDeMarcador(m, r.key)) {
      if (vistas.has(f.parameter_key)) continue;
      vistas.add(f.parameter_key);
      filas.push(f);
    }
  }
  return { filas, omitidos };
}

/**
 * `measured_at` para `lab_values` a partir de `cliente.fecha_toma`. Si el
 * documento solo trae el mes (YYYY-MM), se usa el dia 1 y se dice: la columna
 * es NOT NULL y un mes sin dia no cabe. `diaAsumido` viaja al metadata de
 * cada fila y al aviso del RPC para que nadie lo lea como fecha exacta.
 */
export function fechaMedicionDeToma(fechaToma: string): { measured_at: string; diaAsumido: boolean } | null {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(fechaToma.trim());
  if (!m) return null;
  if (m[3]) return { measured_at: `${m[1]}-${m[2]}-${m[3]}`, diaAsumido: false };
  return { measured_at: `${m[1]}-${m[2]}-01`, diaAsumido: true };
}
