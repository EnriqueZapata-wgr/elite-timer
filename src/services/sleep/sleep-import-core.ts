/**
 * Sleep import core (MB-30A · Pieza 2) — normalización PURA del sueño que el
 * teléfono ya mide (Health Connect / HealthKit) a noches de sleep_nights.
 *
 * Modelo único para las dos plataformas: los registros crudos se reducen a
 * TRAMOS [inicio, fin] dormidos, los tramos cercanos se agrupan en racimos
 * (la misma noche puede venir partida en segmentos), y por cada fecha local
 * de despertar queda UN racimo: el más largo. Las siestas ni los racimos
 * cortos se vuelven "la noche".
 *
 * Honestidad de medida: aunque HealthKit reporta valores por tipo de sueño,
 * aquí TODO lo dormido cuenta parejo. No guardamos ni mostramos fases:
 * el producto no las promete.
 *
 * 🚨 Los tramos SE TRASLAPAN y por eso se mide su UNIÓN, nunca su suma.
 * Las dos plataformas entregan el mismo rato dormido más de una vez:
 * Health Connect devuelve una SleepSession por cada app que escribe (reloj,
 * app del fabricante, app de sueño de terceros), y HealthKit entrega a la
 * vez el tramo "dormido sin especificar" que cubre la noche completa y los
 * tramos por tipo que la subdividen. Sumarlos contaba la misma noche dos y
 * tres veces: en producción salieron noches de 1,440 min (24 h, el techo
 * del CHECK) sobre una cama de 9 h. Medir la unión es lo único correcto.
 */

export const SLEEP_IMPORT_SOURCES = ['health_connect', 'healthkit'] as const;
export type SleepImportSource = (typeof SLEEP_IMPORT_SOURCES)[number];

/** Tramo dormido crudo, ya en epoch ms. */
export interface TramoSueno {
  startMs: number;
  endMs: number;
  externalId: string | null;
}

/** Noche importada — misma forma que persiste sleep_nights. */
export interface NocheImportada {
  nightDate: string;
  bedTimeISO: string;
  wakeTimeISO: string;
  durationMinutes: number;
  source: SleepImportSource;
  externalId: string | null;
}

/** Hueco máximo entre tramos para seguir siendo la misma noche (2 h). */
export const HUECO_MISMA_NOCHE_MS = 2 * 60 * 60 * 1000;
/** Un racimo menor a esto es siesta, no noche. */
export const MIN_NOCHE_IMPORT_MINUTOS = 60;

/**
 * Valores de HKCategoryValueSleepAnalysis que cuentan como DORMIDO:
 * 1 (asleep sin especificar) y los específicos 3/4/5. Se excluyen
 * 0 (en cama) y 2 (despierto).
 */
export function esValorDormidoHK(value: number): boolean {
  return value === 1 || value === 3 || value === 4 || value === 5;
}

interface Racimo {
  tramos: TramoSueno[];
  inicioMs: number;
  finMs: number;
  dormidoMs: number;
}

/**
 * Agrupa tramos en racimos (misma noche) y devuelve UNA noche por fecha
 * local de despertar: el racimo con más minutos dormidos de esa fecha.
 */
export function nochesDesdeTramos(
  tramos: readonly TramoSueno[],
  source: SleepImportSource,
  aFechaLocal: (d: Date) => string,
): NocheImportada[] {
  const validos = tramos
    .filter((t) => Number.isFinite(t.startMs) && Number.isFinite(t.endMs) && t.endMs > t.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  if (validos.length === 0) return [];

  // 1) Racimos: tramos separados por menos de HUECO_MISMA_NOCHE_MS.
  const racimos: Racimo[] = [];
  let actual: Racimo | null = null;
  for (const t of validos) {
    if (actual && t.startMs - actual.finMs <= HUECO_MISMA_NOCHE_MS) {
      actual.tramos.push(t);
      // UNIÓN, no suma: un tramo solo aporta el tiempo que NO estaba ya
      // cubierto. Los tramos vienen ordenados por inicio y finMs es el
      // máximo fin visto, así que finMs es la frontera de lo ya contado.
      const desde = Math.max(t.startMs, actual.finMs);
      if (t.endMs > desde) actual.dormidoMs += t.endMs - desde;
      actual.finMs = Math.max(actual.finMs, t.endMs);
    } else {
      actual = {
        tramos: [t],
        inicioMs: t.startMs,
        finMs: t.endMs,
        dormidoMs: t.endMs - t.startMs,
      };
      racimos.push(actual);
    }
  }

  // 2) Una noche por fecha local de despertar: gana el racimo más dormido.
  const porFecha = new Map<string, Racimo>();
  for (const r of racimos) {
    if (r.dormidoMs < MIN_NOCHE_IMPORT_MINUTOS * 60_000) continue; // siesta
    const fecha = aFechaLocal(new Date(r.finMs));
    const previo = porFecha.get(fecha);
    if (!previo || r.dormidoMs > previo.dormidoMs) porFecha.set(fecha, r);
  }

  return [...porFecha.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([fecha, r]) => {
      const masLargo = [...r.tramos].sort(
        (a, b) => (b.endMs - b.startMs) - (a.endMs - a.startMs),
      )[0];
      return {
        nightDate: fecha,
        bedTimeISO: new Date(r.inicioMs).toISOString(),
        wakeTimeISO: new Date(r.finMs).toISOString(),
        durationMinutes: Math.max(0, Math.min(1440, Math.round(r.dormidoMs / 60000))),
        source,
        externalId: masLargo?.externalId ?? null,
      };
    });
}
