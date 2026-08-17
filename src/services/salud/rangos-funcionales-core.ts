/**
 * Rangos funcionales — una sola fuente (CIERRE-3).
 *
 * EL PROBLEMA
 * Convivían DOS definiciones de rango funcional. La matriz V7/V6
 * (`edad-atp-matriz-v7-v6.ts`) cita archivo fuente, autoría y fecha de
 * extracción, tiene fixtures de regresión contra el Excel y once archivos de
 * test. `src/data/functional-health-engine.ts` no cita fuente, declara 144
 * parámetros y define 98, y no tiene un solo test automatizado.
 *
 * El síntoma no era teórico: el MISMO biomarcador del MISMO cliente se pintaba
 * distinto en el panel del coach (legacy) y en ATP Labs (matriz). Un VO2 de 55
 * salía "Aceptable" de un lado y "En tu ventana" del otro. Una testosterona de
 * 8 ng/ml salía "Aceptable" en uno y "Óptimo" en el otro. Y en el legacy, una
 * IgG de 900 salía "Óptimo" por un cero perdido: el umbral decía 80 donde la
 * matriz dice 800, así que el legacy declaraba óptimo TODO el intervalo
 * [80, 1200].
 *
 * LA DIRECCIÓN DE LA CONSOLIDACIÓN
 * Legacy → matriz, y la matriz no se toca. NO SE INVENTA NINGÚN RANGO: este
 * módulo no define un solo número propio. Lo único que hace es traducir claves
 * y leer `bandLimits` de la matriz.
 *
 * POR QUÉ NO HAY UN MAPA NUEVO DE CLAVES
 * El puente clave-de-matriz ↔ columna-de-lab YA existe y se mantiene:
 * `LAB_COLUMN_MAP` en edad-atp-source-map.ts, con sus conversiones de unidad.
 * Aquí se INVIERTE ese mapa en vez de escribir uno paralelo, porque un segundo
 * mapa es exactamente cómo nacen las dos definiciones que este archivo viene a
 * matar.
 *
 * PURO: sin red, sin I/O. Solo constantes y matemática de bandas.
 */
import {
  LAB_COLUMN_MAP,
  COMPOSITION_HEALTH_MEASUREMENTS_MAP,
} from '@/src/constants/edad-atp-source-map';
import { findMatrizParam } from '@/src/constants/edad-atp-matriz-lookup';
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';
import { aUnidadDeMatriz } from '@/src/constants/lab-unidades-core';
import type { Sex } from '@/src/types/edad-atp-v2';

// ── Vocabulario ──

export type NivelFuncional =
  | 'optimo'
  | 'aceptable'
  | 'riesgo'
  | 'critico'
  | 'fuera_de_rango'
  /** La matriz no define banda óptima para este parámetro. No se inventa. */
  | 'sin_banda';

export type Direccion = 'arriba' | 'abajo' | 'en_rango' | null;

export interface LecturaFuncional {
  nivel: NivelFuncional;
  direccion: Direccion;
}

export const SIN_BANDA: LecturaFuncional = { nivel: 'sin_banda', direccion: null };

// ── Traducción de claves ──

/**
 * columna de lab_results (inglés) → clave de matriz (español), invirtiendo el
 * mapa que ya se mantiene. `convert` normaliza DB → unidad de matriz, que es
 * imprescindible: la matriz guarda hba1c, hematocrito y rdw en FRACCIÓN
 * (0.052) y la base en porcentaje (5.2). Comparar 5.2 contra bandas de 0.049 a
 * 0.06 daría "fuera de rango" a todo el mundo, siempre.
 *
 * COLISIONES: varias claves de matriz apuntan a la misma columna
 * (`gama_glutamil_transferasa` y `ggt` → 'ggt'; dos claves de AST → 'ast').
 * Gana la primera en orden de declaración, que es la MISMA regla de
 * `edad-atp-matriz-lookup` ("primera definición gana"). Se reusa la regla en
 * vez de inventar otra para que el coach y ATP Labs no puedan discrepar.
 */
export const COLUMNA_A_MATRIZ: Record<string, { key: string; convert?: (v: number) => number }> =
  (() => {
    const out: Record<string, { key: string; convert?: (v: number) => number }> = {};
    for (const [matrizKey, def] of Object.entries(LAB_COLUMN_MAP)) {
      for (const col of def.columns) {
        if (out[col] === undefined) out[col] = { key: matrizKey, convert: def.convert };
      }
    }
    return out;
  })();

/** Composición corporal: campo de la app → clave de matriz (+ conversión). */
export const CUERPO_A_MATRIZ: Record<string, { key: string; convert?: (v: number) => number }> = {
  body_fat_pct: {
    key: 'grasa_corporal',
    convert: COMPOSITION_HEALTH_MEASUREMENTS_MAP.grasa_corporal.convert
      ? (v: number) => COMPOSITION_HEALTH_MEASUREMENTS_MAP.grasa_corporal.convert!(v, {}) ?? v
      : undefined,
  },
  // La matriz guarda músculo como fracción (bandLimits 0.2–0.8) y la app lo
  // captura en porcentaje. Misma trampa que hba1c.
  muscle_mass_pct: { key: 'musculo_esqueletico', convert: (v: number) => (v > 1 ? v / 100 : v) },
  visceral_fat: { key: 'grasa_visceral' },
};

/** Biomarcadores físicos: campo de la app → clave de matriz. */
export const BIO_A_MATRIZ: Record<string, { key: string; convert?: (v: number) => number }> = {
  grip_strength_kg: { key: 'fuerza_de_agarre' },
  vo2_max: { key: 'vo2_max' },
  blood_pressure_sys: { key: 'presion_sistolica' },
  blood_pressure_dia: { key: 'presion_diastolica' },
};

// ── Evaluación ──

/**
 * El score de 9 bandas a un nivel nombrable. Los valores posibles de
 * `score9Bands` son exactamente SCORES_9 = [0,25,50,80,100,80,50,25,0], así
 * que este switch los cubre todos.
 */
export function nivelDeScore(score: number | null): NivelFuncional {
  switch (score) {
    case 100: return 'optimo';
    case 80: return 'aceptable';
    case 50: return 'riesgo';
    case 25: return 'critico';
    case 0: return 'fuera_de_rango';
    default: return 'sin_banda';
  }
}

/**
 * Hacia qué lado se salió, leyendo la banda óptima [S, T] = bandLimits[3..4].
 * `score9Bands` devuelve 0 tanto por debajo del piso como por encima del techo,
 * así que sin esto la flecha de la UI apuntaría al azar.
 */
export function direccionDe(value: number, bandLimits: readonly (number | null)[]): Direccion {
  const S = bandLimits[3];
  const T = bandLimits[4];
  if (S == null || T == null) return null;
  if (value < S) return 'abajo';
  if (value > T) return 'arriba';
  return 'en_rango';
}

/**
 * Evalúa un valor contra las bandas de la matriz.
 *
 * Sin banda óptima definida devuelve 'sin_banda', que es la doctrina que ya
 * usan ATP Labs y los reportes ("Sin banda funcional en la matriz: se muestra
 * solo el historial"). Un parámetro sin rango se muestra sin veredicto; nunca
 * se rellena con un rango de otra parte.
 */
export function evaluarContraMatriz(
  value: number | null | undefined,
  bandLimits: readonly (number | null)[] | undefined,
): LecturaFuncional {
  if (value == null || !Number.isFinite(value) || !bandLimits) return SIN_BANDA;
  if (bandLimits[3] == null || bandLimits[4] == null) return SIN_BANDA;
  const score = score9Bands(value, bandLimits as (number | null)[]);
  const nivel = nivelDeScore(score);
  if (nivel === 'sin_banda') return SIN_BANDA;
  return { nivel, direccion: direccionDe(value, bandLimits) };
}

/** Evalúa por clave de matriz, resolviendo el parámetro para ese sexo. */
export function evaluarPorClaveDeMatriz(
  matrizKey: string,
  value: number | null | undefined,
  sex: Sex,
): LecturaFuncional {
  const param = findMatrizParam(sex, matrizKey);
  if (!param) return SIN_BANDA;
  // Aquí sí se conoce la clave, así que el valor guardado se puede llevar a la
  // unidad de la ventana antes de compararlo. `evaluarContraMatriz` recibe solo
  // bandLimits y no puede hacerlo por su cuenta.
  const v = value == null || !Number.isFinite(value) ? value : aUnidadDeMatriz(matrizKey, value);
  return evaluarContraMatriz(v, param.bandLimits);
}

/**
 * Mata el error de coma flotante que introducen las conversiones de unidad.
 *
 * NO es cosmético. Las bandas de la matriz están escritas con la precisión del
 * Excel (hba1c óptimo cierra EXACTAMENTE en 0.052) y el score de la banda
 * óptima es un intervalo CERRADO (`value <= T`). Dividir 5.2 entre 100 en coma
 * flotante da 0.052000000000000005, que es mayor que 0.052: una hemoglobina
 * glicosilada perfecta se pintaba "Aceptable ↑" por un error de 5e-18.
 *
 * Seis decimales están muy por debajo de la precisión de cualquier banda de la
 * matriz (la más fina tiene tres), así que redondear aquí no puede mover un
 * veredicto legítimo, solo quitar la basura del binario.
 *
 * ⚠️ El mismo error existe fuera de aquí: `pctToDecimal` en
 * edad-atp-source-map lo alimenta al motor de Edad ATP por el otro camino. No
 * se tocó en este cambio porque ese archivo tiene fixtures de regresión contra
 * el Excel y hay que correrlas al arreglarlo.
 */
function limpiarFlotante(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** Traduce y evalúa en un paso. `tabla` elige el diccionario de claves. */
export function evaluarCampo(
  tabla: Record<string, { key: string; convert?: (v: number) => number }>,
  campo: string,
  value: number | null | undefined,
  sex: Sex,
): LecturaFuncional {
  if (value == null || !Number.isFinite(value)) return SIN_BANDA;
  const destino = tabla[campo];
  if (!destino) return SIN_BANDA;
  const v = destino.convert ? limpiarFlotante(destino.convert(value)) : value;
  return evaluarPorClaveDeMatriz(destino.key, v, sex);
}

// ── Lo que el legacy tenía y la matriz no ──

/**
 * INVENTARIO HONESTO. Estos parámetros existían en functional-health-engine y
 * NO tienen equivalente en la matriz V7/V6. No se borran a ciegas ni se
 * migran inventando bandas: quedan aquí anotados, con el rango que el legacy
 * usaba, para que quien decida tenga el número a la vista.
 *
 * Añadirlos a la matriz es decisión de quien la firma, no de quien consolida.
 * Mientras tanto, cualquier consulta por estas claves responde 'sin_banda',
 * que es la respuesta honesta.
 */
export const RANGOS_SOLO_EN_LEGACY: readonly {
  claveLegacy: string;
  nombre: string;
  unidad: string;
  /** Los 8 umbrales del legacy, tal cual estaban. */
  umbralesLegacy: (number | null)[];
  nota: string;
}[] = [
  {
    claveLegacy: 'sleep_quality',
    nombre: 'Calidad de sueño autopercibida',
    unidad: '/10',
    umbralesLegacy: [null, null, null, 10, 9, 7, 6, 5],
    nota:
      'La matriz tiene `eficiencia_del_sueno`, que es OTRA cosa (porcentaje medido, no ' +
      'percepción 1-10). No son intercambiables y no se fusionaron.',
  },
  {
    claveLegacy: 'water_liters',
    nombre: 'Agua al día',
    unidad: 'L/día',
    umbralesLegacy: [null, null, null, 4, 2.5, 2, 1.5, 1],
    nota:
      'La matriz tiene `de_agua_corporal`, que es el PORCENTAJE de agua corporal, no lo ' +
      'que se bebe. Sin equivalente. La app sí trackea hidratación por su lado (electrón ' +
      '`water`, meta en ml), así que el dato no se pierde: lo que no existe es su banda ' +
      'funcional en la matriz.',
  },
];

/**
 * Columnas de lab que el panel del coach ofrecía y que NO tienen banda en la
 * matriz. Antes decían "Sin dato" por una razón distinta y peor: el mapa
 * `LAB_TO_ENGINE` apuntaba a claves que tampoco existían en el legacy. El
 * resultado en pantalla es el mismo, pero ahora es una ausencia declarada.
 *
 * Ojo: varias de estas SÍ existen en la matriz y la consolidación las arregla
 * gratis (lh, cpk, urea, transferrina, saturación de hierro, capacidad de
 * fijación de hierro), así que no aparecen en esta lista.
 */
export const COLUMNAS_LAB_SIN_BANDA: readonly string[] = [
  'alp',
  'albumin',
  'platelets',
  'mcv',
  'lymphocyte_pct',
  'esr',
  't4_free',
  'free_iron',
  'anti_tpo',
  'anti_tg',
];
