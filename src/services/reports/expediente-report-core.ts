/**
 * Expediente Report Core (NOCHE-REP) — lógica PURA del inventario del
 * expediente: qué hay guardado de ti, de dónde viene, cuándo fue lo último y
 * qué falta por llenar.
 *
 * DÓNDE TERMINA ESTE ARCHIVO Y DÓNDE EMPIEZA LA LECTURA. /salud/mi-lectura
 * INTERPRETA: cruza fuentes, enciende patrones y saca reglas. Este reporte
 * MUESTRA: cuántos registros hay de cada cosa y cuándo fue el último. Uno dice
 * qué significa, el otro dice cuánto hay. Por eso este archivo no importa nada
 * de lectura-core ni repite una sola de sus reglas: el enlace a la lectura se
 * pinta y ahí se acaba.
 *
 * El timeline tampoco se reescribe: se reusa buildTimeline de
 * mi-expediente-core, que ya lo arma y ya tiene pruebas.
 */
import type { TimelineSources } from '@/src/services/salud/mi-expediente-core';

// ── Inventario por fuente ────────────────────────────────────────────────

export type FuenteKey =
  | 'labs' | 'mediciones' | 'sintomas' | 'intervenciones' | 'glucosa' | 'cetonas';

export interface FuenteInventario {
  key: FuenteKey;
  titulo: string;
  /** Cuántos registros hay en el rango. */
  registros: number;
  /** Fecha del más reciente. null si no hay ninguno. */
  ultimo: string | null;
  /** Qué hacer para llenarla. Se dice SIEMPRE, tenga o no datos. */
  comoSeLlena: string;
  /** A dónde va el botón. */
  route: string;
  icon: string;
}

/** El orden de lectura del expediente, de lo más pesado a lo más granular. */
const DEFINICIONES: Omit<FuenteInventario, 'registros' | 'ultimo'>[] = [
  {
    key: 'labs',
    titulo: 'Biomarcadores',
    comoSeLlena: 'Sube la foto o el PDF de tu estudio y cada valor entra con su fecha.',
    route: '/my-health',
    icon: 'flask-outline',
  },
  {
    key: 'mediciones',
    titulo: 'Mediciones del cuerpo',
    comoSeLlena: 'Peso, cintura, presión y fuerza de agarre. Se anotan a mano y toman dos minutos.',
    route: '/medidas',
    icon: 'body-outline',
  },
  {
    key: 'sintomas',
    titulo: 'Lo que sientes',
    comoSeLlena: 'Anota lo que te pasa y desde cuándo. Sirve igual cuando se resuelve.',
    route: '/salud/mis-sintomas',
    icon: 'medkit-outline',
  },
  {
    key: 'intervenciones',
    titulo: 'Lo que estás haciendo',
    comoSeLlena: 'Cada cosa que activas queda con su fecha, y así se puede ver qué cambió después.',
    route: '/salud/intervenciones',
    icon: 'leaf-outline',
  },
  {
    key: 'glucosa',
    titulo: 'Glucosa',
    comoSeLlena: 'Un piquete en ayuno ya empieza tu serie.',
    route: '/glucose-log',
    icon: 'pulse-outline',
  },
  {
    key: 'cetonas',
    titulo: 'Cetonas',
    comoSeLlena: 'Sangre, aliento o tira. Las de sangre son las que además calculan tu índice.',
    route: '/ketones-log',
    icon: 'flame-outline',
  },
];

/** La fecha más reciente de una lista de ISO. null si no hay ninguna válida. */
export function masReciente(fechas: readonly (string | null | undefined)[]): string | null {
  let mejor: string | null = null;
  let mejorMs = -Infinity;
  for (const f of fechas) {
    if (!f) continue;
    const ms = new Date(f).getTime();
    if (Number.isNaN(ms)) continue;
    if (ms > mejorMs) { mejorMs = ms; mejor = f; }
  }
  return mejor;
}

/**
 * El inventario completo. Se listan TODAS las fuentes, tengan o no datos: una
 * fuente vacía que desaparece de la lista es una fuente que la persona nunca
 * va a saber que existía.
 */
export function construirInventario(src: TimelineSources): FuenteInventario[] {
  const conteo: Record<FuenteKey, { n: number; ultimo: string | null }> = {
    labs: {
      n: src.labs.length,
      ultimo: masReciente(src.labs.map((x) => x.measured_at)),
    },
    mediciones: {
      n: src.measurements.length,
      ultimo: masReciente(src.measurements.map((x) => x.date)),
    },
    sintomas: {
      n: src.symptoms.length,
      ultimo: masReciente(src.symptoms.map((x) => x.resolved_at ?? x.started_at)),
    },
    intervenciones: {
      n: src.interventionsActivated.length,
      ultimo: masReciente(src.interventionsActivated.map((x) => x.activated_at)),
    },
    glucosa: {
      n: src.glucose.length,
      ultimo: masReciente(src.glucose.map((x) => x.at)),
    },
    cetonas: {
      n: src.ketones.length,
      ultimo: masReciente(src.ketones.map((x) => x.at)),
    },
  };

  return DEFINICIONES.map((d) => ({
    ...d,
    registros: conteo[d.key].n,
    ultimo: conteo[d.key].ultimo,
  }));
}

// ── Estado del expediente ────────────────────────────────────────────────

export interface EstadoExpediente {
  registros: number;
  fuentesConDatos: number;
  fuentesTotales: number;
  /** Porcentaje de fuentes que ya tienen algo. */
  pct: number;
  etiqueta: string;
  vacio: boolean;
}

export function estadoDe(inventario: readonly FuenteInventario[]): EstadoExpediente {
  const registros = inventario.reduce((a, f) => a + f.registros, 0);
  const conDatos = inventario.filter((f) => f.registros > 0).length;
  const total = inventario.length || 1;
  const pct = Math.round((conDatos / total) * 100);
  return {
    registros,
    fuentesConDatos: conDatos,
    fuentesTotales: inventario.length,
    pct,
    etiqueta: etiquetaDe(pct),
    vacio: registros === 0,
  };
}

/** Etiqueta honesta: describe qué tan lleno está, sin felicitar el vacío. */
export function etiquetaDe(pct: number): string {
  if (pct === 0) return 'Expediente vacío';
  if (pct < 40) return 'Expediente empezado';
  if (pct < 80) return 'Expediente en construcción';
  if (pct < 100) return 'Expediente casi completo';
  return 'Expediente completo';
}

/** La frase de arriba, escrita con lo que hay. */
export function fraseEstado(e: EstadoExpediente): string {
  if (e.vacio) {
    return 'Todavía no hay nada guardado. Cada cosa que registres se queda aquí y nadie la borra.';
  }
  return `${e.registros} ${e.registros === 1 ? 'registro' : 'registros'} en ${e.fuentesConDatos} de ${e.fuentesTotales} fuentes.`;
}

/** Las fuentes que siguen vacías, para decir qué falta sin adivinar por qué. */
export function fuentesVacias(inventario: readonly FuenteInventario[]): FuenteInventario[] {
  return inventario.filter((f) => f.registros === 0);
}
