/**
 * lab-unidades-core — el traductor entre la unidad en que `lab_values` GUARDA un
 * biomarcador y la unidad en que la matriz V7/V6 escribe su ventana. Núcleo PURO:
 * sin I/O, sin React, sin Supabase.
 *
 * EL PROBLEMA QUE RESUELVE
 * `lab_values` guarda la testosterona total en ng/dL, que es como la reporta el
 * laboratorio (993). La ventana de la matriz para ese mismo parámetro está en
 * ng/mL (7 a 12). Son la misma ventana escrita en dos unidades que difieren por
 * un factor de 100. Comparar 993 contra 7 a 12 da "pide atención" sobre una
 * testosterona sana, y lo dice sin dudar. Una app de salud que se equivoca con
 * confianza manda a alguien a un consultorio sin motivo.
 *
 * DÓNDE SE ARREGLA Y DÓNDE NO
 * Se arregla en la LECTURA, en el momento exacto de comparar contra la ventana.
 * NO se toca un solo valor guardado: lo que está en `lab_values` es lo que el
 * laboratorio reportó, y eso es del usuario. Tampoco se toca la matriz, que es
 * la fuente de verdad y la firma otra persona.
 *
 * POR QUÉ LA CONVERSIÓN MIRA LA MAGNITUD Y NO SOLO LA CLAVE
 * El histórico está mezclado. La captura manual dejaba escribir el número tal
 * cual, el respaldo de la migración 072 trajo lo que hubiera en la tabla ancha,
 * y el parser sí normaliza a ng/dL. O sea que en la misma columna conviven un
 * 993 (ng/dL) y un 9.93 (ng/mL) de años distintos. Multiplicar a ciegas arregla
 * uno y rompe el otro.
 *
 * Por eso cada valor se ubica primero en su espacio por magnitud. Para la
 * testosterona total el corte es 20: nadie tiene 20 ng/mL (serían 2,000 ng/dL) y
 * nadie tiene 20 ng/dL salvo en un rango que la ventana ya marca como bajo. Es
 * el mismo umbral que ya usa la heurística del parser (lab-unit-converters), no
 * un número nuevo. La conversión así queda IDEMPOTENTE: aplicarla dos veces da
 * lo mismo que aplicarla una.
 *
 * LAS DOS DIRECCIONES
 * Un valor se puede llevar a la unidad de la matriz (para puntuarlo) o la
 * ventana se puede traer a la unidad del valor (para mostrarla junto al número
 * que el usuario reconoce de su estudio). Las dos salen del mismo factor y son
 * consistentes: puntuar en cualquiera de los dos espacios da el mismo resultado.
 * Eso está amarrado con un test de invariante.
 */
import { LABS_UNIDADES_ALINEADAS } from './flags';
import { LAB_COLUMN_TO_CANONICAL } from './lab-canonical-map';
import { MATRIZ_HOMBRES, MATRIZ_MUJERES, type MatrizSexo } from './edad-atp-matriz-v7-v6';

/** Los dos espacios de unidad que conviven en la app. */
export type EspacioUnidad = 'matriz' | 'almacen';

// ─────────────────────────────────────────────────────────────────────────────
// 1 · La unidad en que `lab_values` guarda cada parámetro
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unidad de ALMACÉN por clave canónica: la unidad en que `lab_values` tiene ese
 * parámetro. No es una preferencia, es una declaración de hecho, y es la que el
 * candado (lab-unidades-core.test.ts) cruza contra la unidad de la matriz.
 *
 * Cubre exactamente los parámetros que (a) pueden aterrizar en `lab_values` vía
 * LAB_COLUMN_TO_CANONICAL y (b) existen en la matriz V7/V6. Si mañana alguien
 * agrega un parámetro a cualquiera de los dos lados y no lo declara aquí, el
 * test truena. Ese es el punto.
 *
 * `fracción` = el valor va de 0 a 1 (hba1c 0.049, hematocrito 0.38). Lo convierte
 * `toCanonicalUnit` en el borde de escritura y la matriz escribe sus bandas igual.
 */
export const UNIDAD_ALMACEN: Record<string, string> = {
  // Lípidos
  colesterol_total: 'mg/dL',
  colesterol_hdl: 'mg/dL',
  colesterol_ldl: 'mg/dL',
  trigliceridos: 'mg/dL',
  vldl: 'mg/dL',
  apolipoproteinas_b: 'mg/dL',
  // Metabólico
  glucosa_en_ayuno: 'mg/dL',
  hba1c: 'fracción',
  insulina: 'µUI/mL',
  homair: 'ratio',
  // Hormonal
  tsh: 'µUI/mL',
  t3_libre: 'pg/mL',
  testosterona_total: 'ng/dL',
  testosterona_libre_pgml: 'pg/mL',
  estradiol: 'pg/mL',
  cortisol_matutino: 'µg/dL',
  fsh: 'mUI/mL',
  lh: 'mUI/mL',
  prolactina: 'ng/mL',
  // Micronutrientes y hierro
  vitamina_d: 'ng/mL',
  vitamina_b12: 'pg/mL',
  hierro_serico: 'µg/dL',
  ferritina: 'ng/mL',
  magnesio: 'mg/dL',
  folato_acido_folico: 'ng/mL',
  capacidad_de_fijacion_de_hierro: 'µg/dL',
  saturacion_de_hierro: '%',
  transferrina: 'mg/dL',
  // Inflamación e inmunidad
  proteina_c_reactiva_cuantitativa_pcr: 'mg/dL',
  homocisteina: 'µmol/L',
  factor_reumatoide: 'UI/mL',
  antiestreptolisinas: 'UI/mL',
  ldh: 'U/L',
  cpk: 'U/L',
  iga: 'mg/dL',
  ige: 'UI/mL',
  igg: 'mg/dL',
  igm: 'mg/dL',
  // Hepático
  transaminasa_glutamico_piruvica_alt: 'U/L',
  transaminasa_glutamico_oxalacetica_ast: 'U/L',
  transaminasa_g_oxalacetica_ast_tgo: 'U/L',
  gama_glutamil_transferasa: 'U/L',
  ggt: 'U/L',
  bilirrubina: 'mg/dL',
  // Renal y electrolitos
  creatinina_serica: 'mg/dL',
  acido_urico: 'mg/dL',
  nitrogeno_ureico_bun: 'mg/dL',
  urea: 'mg/dL',
  sodio: 'mEq/L',
  potasio: 'mEq/L',
  cloro: 'mEq/L',
  // Biometría hemática
  hemoglobina: 'g/dL',
  hematocrito: 'fracción',
  rdw_cv: 'fracción',
  leucocitos_totales: '/µL',
};

/**
 * Ortografías distintas de la MISMA unidad. La matriz salió de un Excel escrito a
 * mano y trae `mcg/dl`, `mE1/L`, `/mcl`, `mcU/ml`. Ninguna de esas es un error de
 * fondo: es la misma unidad con otra grafía, y normalizarlas evita marcar como
 * desajuste algo que no lo es. Las etiquetas que SÍ mienten sobre sus propios
 * números van en PENDIENTES_MATRIZ, no aquí.
 */
const ORTOGRAFIA: Record<string, string> = {
  'mg/dl': 'mg/dL',
  'mg/dl.': 'mg/dL',
  'g/dl': 'g/dL',
  'u/l': 'U/L',
  'ui/ml': 'UI/mL',
  'mui/ml': 'mUI/mL',
  'mcu/ml': 'µUI/mL',
  'uui/ml': 'µUI/mL',
  'ng/ml': 'ng/mL',
  'ng/dl': 'ng/dL',
  'pg/ml': 'pg/mL',
  'mcg/dl': 'µg/dL',
  'ug/dl': 'µg/dL',
  'µg/dl': 'µg/dL',
  'mcmol/l': 'µmol/L',
  'umol/l': 'µmol/L',
  'µmol/l': 'µmol/L',
  'µui/ml': 'µUI/mL',
  'me1/l': 'mEq/L',
  'meq/l': 'mEq/L',
  '/mcl': '/µL',
  '/ul': '/µL',
  '/µl': '/µL',
  ratio: 'ratio',
  '%': '%',
  fracción: 'fracción',
  fraccion: 'fracción',
};

/** Normaliza una etiqueta de unidad para poder compararla sin pelearse con la grafía. */
export function normalizaUnidad(u: string | null | undefined): string {
  if (!u) return '';
  const limpia = u.trim().toLowerCase().replace(/\s+/g, '');
  return ORTOGRAFIA[limpia] ?? limpia;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Los desajustes reales: unidad de almacén ≠ unidad de la ventana
// ─────────────────────────────────────────────────────────────────────────────

export type DesajusteUnidad = {
  key: string;
  unidadAlmacen: string;
  unidadMatriz: string;
  /** Multiplicador almacén → matriz. 993 ng/dL × 0.01 = 9.93 ng/mL. */
  factorAMatriz: number;
  /**
   * Corte de magnitud. Un valor ESTRICTAMENTE mayor está en unidad de almacén;
   * uno menor o igual ya venía en unidad de matriz (dato viejo, captura manual).
   * Esto es lo que hace la conversión idempotente y segura con histórico mezclado.
   */
  umbralAlmacen: number;
  porQue: string;
};

/**
 * Los parámetros donde el almacén y la ventana NO hablan la misma unidad y el
 * número sí cambia. Es una lista corta a propósito: aquí solo entra lo que está
 * medido, no lo que se sospecha. Lo sospechado va a PENDIENTES_MATRIZ.
 */
export const DESAJUSTES_UNIDAD: Record<string, DesajusteUnidad> = {
  testosterona_total: {
    key: 'testosterona_total',
    unidadAlmacen: 'ng/dL',
    unidadMatriz: 'ng/mL',
    factorAMatriz: 0.01,
    umbralAlmacen: 20,
    porQue:
      'El laboratorio reporta ng/dL y el parser normaliza a ng/dL (993). La matriz ' +
      'escribe su ventana en ng/mL (7 a 12 en hombres, 0.2 a 0.55 en mujeres). Factor 100. ' +
      'Sin esta conversión una testosterona sana se reportaba como "pide atención" en ' +
      'ATP Labs, en el motor de Edad ATP y en el contexto de ARGOS.',
  },
};

/**
 * Etiquetas de la matriz que no corresponden con la unidad real de sus propias
 * bandas, o ventanas contradictorias entre dominios. NO se convierte nada aquí:
 * los números ya coinciden con lo guardado, o el arreglo exige decidir cuál de
 * dos ventanas es la buena, y esa decisión no es de quien programa.
 *
 * Esta lista es el pendiente formal para quien firma la matriz V7/V6.
 */
export const PENDIENTES_MATRIZ: Record<string, string> = {
  hba1c:
    'La matriz etiqueta "%" pero sus bandas son fracción decimal (0.049 a 0.052). ' +
    'Los números coinciden con lo guardado; la etiqueta es la que confunde al leerla.',
  hematocrito:
    'Igual que hba1c: etiqueta "%", bandas en fracción (0.38 a 0.44).',
  rdw_cv:
    'Igual que hba1c: etiqueta "%", bandas en fracción (0.06 a 0.125).',
  homocisteina:
    'Etiqueta "mcmol/ml", que no es una unidad que exista. Las bandas (5 a 9) son ' +
    'µmol/L, que es lo que reporta el laboratorio. Solo hay que corregir el texto.',
  insulina:
    'Etiqueta "mgUI/ml", que tampoco existe. Las bandas (2 a 6) son µUI/mL.',
  t3_libre:
    'Etiqueta "ng/dl" con bandas 3.2 a 4.2. En ng/dL la T3 libre normal ronda 0.2 a 0.5, ' +
    'así que esas bandas están en pg/mL. Riesgo real: un estudio reportado en pmol/L ' +
    '(3.5 a 6.5) cae dentro de la ventana por coincidencia, no porque esté bien.',
  ldh:
    'Cuatro ventanas distintas para el mismo parámetro, todas etiquetadas "Ratio" cuando ' +
    'LDH se mide en U/L. Hombres: inflamación 167 a 187, inmunidad 20 a 200. Mujeres: ' +
    'inmunidad 20 a 200, pero inflamación trae 0.1 a 1.5, que es la banda de NLR copiada. ' +
    'Con esa banda un LDH normal de 180 U/L puntúa 0 en mujeres. Es el más grave de la lista.',
  acido_urico:
    'Contradicción entre dominios en hombres: inflamación 4 a 6, renal 3.5 a 5.5. El motor ' +
    'puntúa las dos y la pantalla se queda con la primera. En mujeres ambas dicen 3.6 a 5.',
  apolipoproteinas_b:
    'bandLimits [30, 0, 40, 50, 99, 110, 125, 150]: el segundo corte (0) rompe el orden ' +
    'ascendente que score9Bands da por hecho. La banda de 25 puntos queda inalcanzable.',
  testosterona_total:
    'Además del desajuste de unidad ya convertido: el dominio sueño la etiqueta "ng/dl" con ' +
    'bandas 7 a 13, que son magnitudes de ng/mL igual que sistema hormonal. Y en mujeres ese ' +
    'mismo dominio repite la ventana masculina (7 a 13) mientras sistema hormonal dice 0.2 a ' +
    '0.55: un factor 20 de diferencia dentro del mismo sexo. Hay que decidir cuál manda.',
};

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Las primitivas
// ─────────────────────────────────────────────────────────────────────────────

/** ¿En qué espacio está este número? Sin desajuste declarado, todo es un solo espacio. */
export function espacioDelValor(key: string, value: number): EspacioUnidad {
  const d = DESAJUSTES_UNIDAD[key];
  if (!d || !LABS_UNIDADES_ALINEADAS) return 'matriz';
  return Math.abs(value) > d.umbralAlmacen ? 'almacen' : 'matriz';
}

/**
 * Lleva un valor guardado a la unidad en que la matriz escribe su ventana.
 * Idempotente: un valor que ya venía en unidad de matriz sale igual.
 */
export function aUnidadDeMatriz(key: string, value: number): number {
  const d = DESAJUSTES_UNIDAD[key];
  if (!d || !LABS_UNIDADES_ALINEADAS) return value;
  return espacioDelValor(key, value) === 'almacen' ? value * d.factorAMatriz : value;
}

/**
 * La otra dirección: trae los cortes de la matriz al espacio del valor de
 * referencia, para poder mostrar la ventana junto al número que el usuario
 * reconoce de su estudio impreso.
 */
export function bandLimitsEnEspacioDe(
  key: string,
  bandLimits: (number | null)[],
  valorReferencia: number,
): (number | null)[] {
  const d = DESAJUSTES_UNIDAD[key];
  if (!d || !LABS_UNIDADES_ALINEADAS) return bandLimits;
  if (espacioDelValor(key, valorReferencia) !== 'almacen') return bandLimits;
  return bandLimits.map((b) => (b == null ? null : b / d.factorAMatriz));
}

/** Igual que la anterior pero para la ventana funcional ya resuelta. */
export function ventanaEnEspacioDe(
  key: string,
  ventana: { lo: number; hi: number } | null,
  valorReferencia: number,
): { lo: number; hi: number } | null {
  if (!ventana) return null;
  const d = DESAJUSTES_UNIDAD[key];
  if (!d || !LABS_UNIDADES_ALINEADAS) return ventana;
  if (espacioDelValor(key, valorReferencia) !== 'almacen') return ventana;
  return { lo: ventana.lo / d.factorAMatriz, hi: ventana.hi / d.factorAMatriz };
}

/**
 * La etiqueta de unidad que hay que pintar junto al valor. Sin desajuste manda la
 * de la matriz. Con desajuste manda la del espacio en que está el número, porque
 * escribir "993 ng/mL" es peor que no escribir unidad.
 */
export function unidadParaMostrar(
  key: string,
  unidadMatriz: string | null,
  valorReferencia: number,
): string | null {
  const d = DESAJUSTES_UNIDAD[key];
  if (!d || !LABS_UNIDADES_ALINEADAS) return unidadMatriz;
  return espacioDelValor(key, valorReferencia) === 'almacen' ? d.unidadAlmacen : d.unidadMatriz;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · El candado: qué parámetros TIENEN que estar declarados
// ─────────────────────────────────────────────────────────────────────────────

function clavesDeMatriz(matriz: MatrizSexo): Set<string> {
  const out = new Set<string>();
  for (const dom of Object.values(matriz)) for (const p of dom.params) out.add(p.key);
  return out;
}

/**
 * Los parámetros que de verdad cruzan la frontera: pueden aterrizar en
 * `lab_values` (son destino de LAB_COLUMN_TO_CANONICAL) Y existen en la matriz.
 * Se calcula, no se escribe a mano, para que agregar un mapeo o un parámetro de
 * matriz lo meta solo en la lista y el test lo reclame.
 */
export function parametrosQueCruzanLaFrontera(): string[] {
  const enMatriz = new Set([...clavesDeMatriz(MATRIZ_HOMBRES), ...clavesDeMatriz(MATRIZ_MUJERES)]);
  const out = new Set<string>();
  for (const { keys } of Object.values(LAB_COLUMN_TO_CANONICAL)) {
    for (const k of keys) if (enMatriz.has(k)) out.add(k);
  }
  return [...out].sort();
}

/**
 * Parámetros de la matriz alimentados desde labs que NO tienen unidad de almacén
 * declarada. Debe estar vacío siempre: es lo que revisa el candado.
 */
export function parametrosSinUnidadDeclarada(): string[] {
  return parametrosQueCruzanLaFrontera().filter((k) => !UNIDAD_ALMACEN[k]);
}
