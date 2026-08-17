/**
 * Umbrales femeninos para el score funcional que se PERSISTE (motor legacy).
 *
 * EL PROBLEMA, MEDIDO
 * `src/data/functional-health-engine.ts` define 98 parámetros y en 95 de ellos el
 * arreglo `ranges.female` es carácter por carácter idéntico a `ranges.male`. O sea
 * que a las mujeres se les califica con la vara de los hombres, y el resultado se
 * guarda en `health_scores`. El caso más caro es testosterona total: el legacy
 * declara la ventana óptima de una mujer en 7 a 12 ng/ml, que es rango de hombre.
 * La matriz V6 dice 0.2 a 0.55 ng/ml. Una mujer con 0.4 ng/ml, que está en su
 * ventana, caía en la banda de abajo del todo y puntuaba 0 de 100.
 *
 * QUÉ HACE ESTE MÓDULO
 * NO INVENTA NINGÚN NÚMERO. Ni uno. Los arreglos de aquí no están escritos a mano:
 * se construyen en tiempo de carga leyendo `MATRIZ_MUJERES` de
 * `src/constants/edad-atp-matriz-v7-v6.ts`, que cita archivo Excel fuente, autoría
 * y fecha de extracción, y que es lo que firma la Chief Science Officer. Si mañana
 * se corrige la matriz, esto se corrige solo.
 *
 * POR QUÉ SE INVIERTE EL ARREGLO
 * Las dos representaciones dicen lo mismo al revés. La matriz guarda ocho límites
 * superiores y puntúa con `value <= bandLimits[i]`, así que el óptimo vive entre
 * `bandLimits[3]` y `bandLimits[4]`. El legacy espera el óptimo en `t[3]` y `t[4]`
 * con `t[3] > t[4]` para su rama bidireccional. Invertir el arreglo deja
 * `t[4] = bandLimits[3]` y `t[3] = bandLimits[4]`, que es exactamente la misma
 * ventana. Comprobado: en 41 parámetros el arreglo masculino del legacy YA es la
 * V7 invertida tal cual, sin tocar un dígito.
 *
 * DIFERENCIA CONOCIDA Y ACEPTADA: en el borde exacto `bandLimits[3]` la matriz
 * puntúa 80 y el legacy puntúa 100. Es un solo punto de un intervalo continuo y no
 * mueve ningún promedio ponderado de forma observable.
 *
 * LA LISTA ES EXPLÍCITA A PROPÓSITO
 * Solo se sustituyen los parámetros de `PARAMETROS_CON_V6_PROPIA`. Fuera de esa
 * lista no se toca nada, ni siquiera donde existe contraparte en la matriz. La
 * razón es que el legacy y la matriz no siempre hablan la misma unidad ni la misma
 * escala, y una sustitución automática habría metido errores de escala de 100x.
 *
 * LOS TRES QUE SE EXCLUYEN, Y POR QUÉ
 *  · `ldh` (inflamación): la matriz V6 trae ahí la banda del NLR, de 0.1 a 2.5, no
 *    una banda de LDH. Es uno de los trece errores de matriz ya documentados y
 *    espera firma clínica. Importarlo habría cambiado un error por otro.
 *  · `hematocrit`: la matriz guarda fracción (0.43) y el legacy guarda porcentaje
 *    (43). La conversión existe y es exacta, pero convertir escalas no es leer un
 *    arreglo, es transformarlo, y eso no entra en un arreglo que se declara
 *    conservador.
 *  · `body_fat_pct`: misma diferencia de escala, y además la V6 declara la misma
 *    ventana que la V7 (10 a 14 por ciento de grasa como óptimo). Sustituirlo no
 *    habría cambiado nada y habría dado la falsa impresión de que ya está
 *    resuelto. Va a firma.
 *
 * PURO: sin red, sin I/O, sin estado. Solo constantes y lectura de la matriz.
 */
import { MATRIZ_MUJERES, MATRIZ_HOMBRES } from '@/src/constants/edad-atp-matriz-v7-v6';

/**
 * Puente clave del motor legacy → (dominio de matriz, clave de matriz).
 *
 * Se mapea CON DOMINIO porque varias claves de matriz se repiten entre dominios con
 * bandas distintas: `ggt` vive en metabolismo y en inflamación con límites
 * diferentes, y `acido_urico` vive en inflamación y en renal. Un mapa plano
 * clave→clave habría elegido en silencio la primera declaración y le habría puesto
 * a un parámetro las bandas del otro, que es la misma clase de error que este
 * archivo viene a cerrar.
 */
export const PARAMETROS_CON_V6_PROPIA: Record<string, readonly [string, string]> = {
  // Metabolismo
  ggt: ['metabolismo', 'ggt'],
  alt: ['metabolismo', 'transaminasa_glutamico_piruvica_alt'],
  // Cardiovascular
  hdl: ['cardiovascular', 'colesterol_hdl'],
  hemoglobin: ['cardiovascular', 'hemoglobina'],
  bilirubin: ['cardiovascular', 'bilirrubina'],
  // Sistema hormonal
  tsh: ['sistema_hormonal', 'tsh'],
  testosterone_total: ['sistema_hormonal', 'testosterona_total'],
  fsh: ['sistema_hormonal', 'fsh'],
  prolactin: ['sistema_hormonal', 'prolactina'],
  // Inflamación
  ferritin: ['inflamacion', 'ferritina'],
  uric_acid: ['inflamacion', 'acido_urico'],
  ggt_infl: ['inflamacion', 'ggt'],
  // Renal y micronutrientes
  uric_acid_r: ['renal_micronutrientes', 'acido_urico'],
  vitamin_b12_r: ['renal_micronutrientes', 'vitamina_b12'],
  // Inmunidad
  wbc: ['inmunidad', 'leucocitos_totales'],
} as const;

function bandas(matriz: typeof MATRIZ_MUJERES, dominio: string, clave: string): (number | null)[] | null {
  const p = matriz[dominio]?.params.find((x) => x.key === clave);
  return p ? p.bandLimits : null;
}

/**
 * Arreglos femeninos derivados de la matriz V6, ya invertidos al orden que espera
 * el motor legacy. Se construye una sola vez al cargar el módulo.
 *
 * Solo entra el parámetro cuya banda V6 DIFIERE de la V7. Donde la matriz declara
 * el mismo umbral para los dos sexos no hay nada que corregir, y meterlo aquí solo
 * habría abierto la puerta a mover un número sin razón clínica.
 */
export const RANGOS_FEMENINOS_V6: Record<string, (number | null)[]> = (() => {
  const out: Record<string, (number | null)[]> = {};
  for (const [legacyKey, [dominio, clave]] of Object.entries(PARAMETROS_CON_V6_PROPIA)) {
    const mujer = bandas(MATRIZ_MUJERES, dominio, clave);
    const hombre = bandas(MATRIZ_HOMBRES, dominio, clave);
    if (!mujer || !hombre) continue;
    if (JSON.stringify(mujer) === JSON.stringify(hombre)) continue;
    out[legacyKey] = [...mujer].reverse();
  }
  return out;
})();

/**
 * Devuelve el arreglo de bandas que le toca a una mujer para un parámetro del motor
 * legacy. Si la matriz V6 no declara umbral propio para ese parámetro, devuelve el
 * arreglo que ya traía el motor, sin tocarlo.
 */
export function rangoFemeninoV6(
  legacyKey: string,
  fallback: (number | null)[],
): (number | null)[] {
  return RANGOS_FEMENINOS_V6[legacyKey] ?? fallback;
}

/**
 * Parámetros del legacy que copian el umbral masculino a las mujeres y que este
 * módulo NO corrige, con el motivo. Se exporta para que la lista viva en el código
 * y no en un documento que nadie vuelve a abrir.
 */
export const PENDIENTES_DE_FIRMA_CLINICA: Record<string, string> = {
  ldh: 'La matriz V6 trae en LDH la banda del NLR (0.1 a 2.5). Error de matriz documentado, espera firma.',
  hematocrit: 'La matriz guarda fracción y el motor legacy guarda porcentaje. Falta decidir dónde vive la conversión.',
  body_fat_pct: 'La matriz V6 declara la misma ventana de grasa corporal que la V7. Falta confirmar si el óptimo de una mujer es de verdad el mismo que el de un hombre.',
};
