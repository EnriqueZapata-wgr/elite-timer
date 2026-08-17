/**
 * Labs Report Core (NOCHE-REP) — lógica PURA del reporte de biomarcadores EN
 * EL TIEMPO. Es la pregunta que /edad-atp/labs no contesta: aquella pantalla
 * es el PANEL (dónde estoy hoy, parámetro por parámetro); esta es la HISTORIA
 * (cómo se movió cada parámetro entre un estudio y el siguiente).
 *
 * CERO RANGOS INVENTADOS. Es la regla más dura de este archivo. La ventana
 * funcional sale de la matriz V7/V6 (edad-atp-matriz-v7-v6.ts), que es el
 * volcado del Excel de la casa, y el estado sale de estadoDeParametro, que ya
 * lo evalúa con score9Bands. Aquí no se escribe un solo número de referencia:
 * si la matriz no define un parámetro, se dice "pendiente de rango" y punto.
 *
 * Y la doctrina de la casa sobre labs de mujeres: los marcadores hormonales se
 * leen CON la fase del ciclo o se declaran sin fase. Nunca se interpretan a
 * ciegas. Eso lo resuelve lab-cycle-context-core, que ya existe y se importa.
 */
import { findMatrizParam, functionalBand } from '@/src/constants/edad-atp-matriz-lookup';
import { aUnidadDeMatriz, ventanaEnEspacioDe, unidadParaMostrar } from '@/src/constants/lab-unidades-core';
import { estadoDeParametro, ESTADO_LABEL, type EstadoLab } from '@/src/services/edad-atp/labs-premium-core';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import {
  deriveLabCycleContext, isCycleSensitiveMarker, type LabCycleContext,
} from '@/src/services/salud/lab-cycle-context-core';
import { numeroDePg } from '@/src/utils/pg-number';
import type { Sex } from '@/src/types/edad-atp-v2';

// ── Entradas ─────────────────────────────────────────────────────────────

export interface MedicionLab {
  parameter_key: string;
  value: number;
  measured_at: string;
  source: string;
  unit?: string | null;
}

// ── Historia de un parámetro ─────────────────────────────────────────────

export type Rumbo = 'acerca' | 'aleja' | 'sostiene' | 'sin_comparacion';

export const RUMBO_LABEL: Record<Rumbo, string> = {
  acerca: 'Se acercó a tu ventana',
  aleja: 'Se alejó de tu ventana',
  sostiene: 'Se mantuvo donde estaba',
  sin_comparacion: 'Primera medición del rango',
};

export interface PuntoLab {
  value: number;
  measured_at: string;
  source: string;
  estado: EstadoLab;
}

export interface HistoriaLab {
  key: string;
  /** Nombre humano del parámetro. Sale del catálogo, nunca se inventa. */
  nombre: string;
  unidad: string | null;
  /** Ventana funcional [bajo, alto]. null cuando la matriz no la define. */
  ventana: { lo: number; hi: number } | null;
  puntos: PuntoLab[];
  ultimo: PuntoLab;
  anterior: PuntoLab | null;
  /** ultimo - anterior. null si no hay con qué comparar. */
  delta: number | null;
  /**
   * El delta LEÍDO CONTRA LA VENTANA, que es lo que de verdad importa: no es
   * "subió 12", es "se acercó" o "se alejó". Sin ventana no hay rumbo posible.
   */
  rumbo: Rumbo;
  estadoLabel: string;
  /** Nota de fase del ciclo, solo en los marcadores que la necesitan. */
  ciclo: LabCycleContext;
}

/**
 * Distancia al borde más cercano de la ventana. Dentro de la ventana es 0.
 * Sin ventana es null: no se puede medir distancia a algo que no está definido.
 */
export function distanciaAVentana(value: number, ventana: { lo: number; hi: number } | null): number | null {
  if (!ventana) return null;
  if (value < ventana.lo) return ventana.lo - value;
  if (value > ventana.hi) return value - ventana.hi;
  return 0;
}

/** Movimientos por debajo de esto son ruido de laboratorio, no tendencia. */
export const EPSILON_RUMBO = 1e-9;

export function rumboDe(
  actual: number, anterior: number | null, ventana: { lo: number; hi: number } | null,
): Rumbo {
  if (anterior == null) return 'sin_comparacion';
  const dA = distanciaAVentana(actual, ventana);
  const dB = distanciaAVentana(anterior, ventana);
  if (dA == null || dB == null) return 'sin_comparacion';
  const diff = dB - dA;
  if (Math.abs(diff) < EPSILON_RUMBO) return 'sostiene';
  return diff > 0 ? 'acerca' : 'aleja';
}

/**
 * Arma la historia de cada parámetro a partir de sus mediciones sueltas.
 *
 * `faseCiclo` es la fase del ciclo del día de HOY, no la del día del estudio:
 * el histórico no guarda en qué fase se sacó cada muestra. Por eso la nota se
 * escribe como contexto de lectura y no como reinterpretación del valor, que
 * es exactamente lo que hace lab-cycle-context-core.
 */
export function construirHistorias(
  mediciones: readonly MedicionLab[],
  sexo: Sex,
  faseCiclo: string | null,
): HistoriaLab[] {
  const porKey = new Map<string, MedicionLab[]>();
  for (const m of mediciones) {
    if (!m.parameter_key) continue;
    // Cuello de botella #1 de los labs: si aquí se descarta de más, el
    // expediente entero desaparece del reporte y de ARGOS sin un solo error.
    // La coerción vive en un solo lugar (pg-number), no en un filtro suelto.
    const value = numeroDePg(m.value);
    if (value === null) continue;
    const lista = porKey.get(m.parameter_key) ?? [];
    lista.push({ ...m, value });
    porKey.set(m.parameter_key, lista);
  }

  const esFemenino = sexo === 'female';
  const salida: HistoriaLab[] = [];

  for (const [key, lista] of porKey) {
    const orden = [...lista].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
    const param = findMatrizParam(sexo, key);
    const meta = getLabParamMeta(key);
    // La ventana de la matriz puede estar escrita en otra unidad que la guardada
    // (testosterona total: ventana en ng/mL, expediente en ng/dL). Se trae al
    // espacio del último valor para que lo que se lee sea coherente: 993 contra
    // 700 a 1200, no 993 contra 7 a 12. El valor NO se toca; se toca la ventana.
    const ultimoValor = orden[orden.length - 1].value;
    const ventanaMatriz = param ? functionalBand(param) : null;
    const ventana = ventanaEnEspacioDe(key, ventanaMatriz, ultimoValor);

    const puntos: PuntoLab[] = orden.map((m) => ({
      value: m.value,
      measured_at: m.measured_at,
      source: m.source,
      estado: estadoDeParametro(sexo, key, m.value),
    }));

    const ultimo = puntos[puntos.length - 1];
    const anterior = puntos.length > 1 ? puntos[puntos.length - 2] : null;

    salida.push({
      key,
      nombre: param?.name || meta.display_name || key,
      // La etiqueta sigue al número, no a la matriz: escribir "993 ng/mL" es peor
      // que no escribir unidad.
      unidad:
        unidadParaMostrar(key, param?.unit ?? null, ultimoValor)
        ?? orden[orden.length - 1].unit ?? meta.unit ?? null,
      ventana,
      puntos,
      ultimo,
      anterior,
      delta: anterior ? redondear(ultimo.value - anterior.value) : null,
      // El rumbo se decide en el espacio de la matriz, no en el del último valor.
      // Así aguanta un expediente con historia mezclada (una captura vieja en
      // ng/mL junto a un PDF nuevo en ng/dL): cada punto se ubica por su cuenta.
      rumbo: rumboDe(
        aUnidadDeMatriz(key, ultimo.value),
        anterior ? aUnidadDeMatriz(key, anterior.value) : null,
        ventanaMatriz,
      ),
      estadoLabel: ESTADO_LABEL[ultimo.estado],
      ciclo: deriveLabCycleContext(key, esFemenino, faseCiclo),
    });
  }

  return ordenarHistorias(salida);
}

function redondear(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Orden de lectura: primero lo que pide atención, luego lo que se movió, y al
 * final lo que está en su ventana y quieto. Lo que no tiene banda va hasta
 * abajo: no es malo, es que todavía no se puede leer.
 */
const PESO_ESTADO: Record<EstadoLab, number> = {
  atencion: 0, aceptable: 1, optimo: 2, sin_banda: 3,
};

export function ordenarHistorias(historias: readonly HistoriaLab[]): HistoriaLab[] {
  return [...historias].sort((a, b) => {
    const pe = PESO_ESTADO[a.ultimo.estado] - PESO_ESTADO[b.ultimo.estado];
    if (pe !== 0) return pe;
    const ma = a.puntos.length > 1 ? 0 : 1;
    const mb = b.puntos.length > 1 ? 0 : 1;
    if (ma !== mb) return ma - mb;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

// ── Resumen del rango ────────────────────────────────────────────────────

export interface ResumenLabs {
  parametros: number;
  mediciones: number;
  conHistoria: number;
  atencion: number;
  sinBanda: number;
  /** Cuántos marcadores hormonales quedaron sin fase del ciclo anotada. */
  sinFase: number;
}

export function resumirLabs(historias: readonly HistoriaLab[]): ResumenLabs {
  let mediciones = 0;
  let conHistoria = 0;
  let atencion = 0;
  let sinBanda = 0;
  let sinFase = 0;
  for (const h of historias) {
    mediciones += h.puntos.length;
    if (h.puntos.length > 1) conHistoria += 1;
    if (h.ultimo.estado === 'atencion') atencion += 1;
    if (h.ultimo.estado === 'sin_banda') sinBanda += 1;
    if (h.ciclo.show && !h.ciclo.phaseKnown) sinFase += 1;
  }
  return { parametros: historias.length, mediciones, conHistoria, atencion, sinBanda, sinFase };
}

/** La frase de arriba. Se escribe con lo que hay, sin adornar el vacío. */
export function fraseResumenLabs(r: ResumenLabs): string {
  if (r.parametros === 0) return 'Sin biomarcadores en este rango.';
  const partes: string[] = [
    `${r.parametros} ${r.parametros === 1 ? 'biomarcador' : 'biomarcadores'} con ${r.mediciones} ${r.mediciones === 1 ? 'medición' : 'mediciones'}`,
  ];
  partes.push(
    r.conHistoria === 0
      ? 'ninguno tiene todavía una segunda medición con la cual compararse'
      : `${r.conHistoria} ya ${r.conHistoria === 1 ? 'tiene' : 'tienen'} con qué compararse`,
  );
  if (r.atencion > 0) partes.push(`${r.atencion} ${r.atencion === 1 ? 'pide' : 'piden'} atención`);
  return `${partes.join(', ')}.`;
}

export { isCycleSensitiveMarker, type EstadoLab, type LabCycleContext };
