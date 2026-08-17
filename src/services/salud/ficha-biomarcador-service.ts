/**
 * ficha-biomarcador-service — el I/O de la ficha por biomarcador.
 *
 * Todo el criterio vive en `ficha-biomarcador-core.ts`. Aquí solo se junta la
 * materia prima: el sexo (que decide qué mitad de la matriz se usa), el último
 * valor de cada parámetro, la serie histórica y la fase del ciclo.
 *
 * Se leen las MISMAS fuentes que el panel de ATP Labs, a propósito. Si la ficha
 * cargara de otro lado, el mismo marcador podría contar dos historias en dos
 * pantallas de la misma app, que es exactamente lo que la doctrina de "un dato
 * vive en un solo lugar" existe para evitar.
 */
import {
  loadCanonicalLabValues, collapseLanguageDuplicates, loadAllSeries,
  type CanonicalValue, type LabValueSource,
} from '@/src/services/edad-atp/lab-values-service';
import { loadUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import { getCycleInfo } from '@/src/services/cycle-service';
import { CANONICAL_PCT_KEYS, decimalToPct } from '@/src/constants/lab-canonical-map';
import { findMatrizParam } from '@/src/constants/edad-atp-matriz-lookup';
import { bandLimitsEnEspacioDe } from '@/src/constants/lab-unidades-core';
import { construirFicha, type FichaBiomarcador } from '@/src/services/salud/ficha-biomarcador-core';
import type { SeriePoint } from '@/src/components/edad-atp/parameter-chart-model';
import type { Sex } from '@/src/types/edad-atp-v2';

const SOURCE_LABEL: Record<LabValueSource, string> = {
  lab_pdf: 'PDF de lab',
  manual: 'Manual',
  upload_extract: 'PDF parseado',
  wearable: 'Wearable',
  form: 'Captura',
};

export interface FichaCargada {
  /** null = la persona no tiene ese parámetro medido. La pantalla lo dice. */
  ficha: FichaBiomarcador | null;
  /** La serie ya en el espacio en que se pinta, para la gráfica. */
  serie: SeriePoint[];
  /** Los límites de la matriz para la gráfica, o null si no hay banda. */
  bandLimits: (number | null)[] | null;
}

/**
 * Carga todo lo que necesita la ficha de un parámetro.
 *
 * Fail-soft en el ciclo: el gate de `getCycleInfo` ya devuelve null cuando no
 * aplica, y un fallo ahí no puede tumbar la ficha completa.
 */
export async function cargarFicha(userId: string, key: string): Promise<FichaCargada> {
  const data = await loadUserData(userId);
  const sexo = data.sex;

  const [canonRaw, allSeries, ciclo] = await Promise.all([
    loadCanonicalLabValues(userId),
    loadAllSeries(userId),
    getCycleInfo(userId).catch(() => null),
  ]);
  const canon = collapseLanguageDuplicates(canonRaw);

  // El panel completo en la unidad GUARDADA: el núcleo convierte al comparar.
  const panel: Record<string, number> = {};
  for (const [k, cv] of Object.entries(canon) as [string, CanonicalValue][]) {
    if (cv?.value != null && Number.isFinite(cv.value)) panel[k] = cv.value;
  }

  const cv = canon[key];
  const isPct = CANONICAL_PCT_KEYS.has(key);
  const serie: SeriePoint[] = (allSeries[key] ?? []).map((p) => ({
    ...p,
    value: p.value == null ? null : isPct ? decimalToPct(p.value) : p.value,
  }));

  if (!cv || cv.value == null || !Number.isFinite(cv.value)) {
    return { ficha: null, serie, bandLimits: null };
  }

  const ficha = construirFicha({
    sexo,
    key,
    valor: cv.value,
    medidoEn: cv.measured_at,
    fuenteLabel: SOURCE_LABEL[cv.source] ?? 'Captura',
    vencido: Boolean(cv.is_stale),
    serie,
    panel,
    faseCiclo: (ciclo as { currentPhase?: string } | null)?.currentPhase ?? null,
  });

  return { ficha, serie, bandLimits: bandLimitsParaGrafica(sexo, key, ficha.valor) };
}

/**
 * Los límites de la matriz llevados al espacio en que se PINTA el valor. Es el
 * mismo cálculo que usa el panel; se reexporta desde aquí para que la pantalla
 * no tenga que conocer el registro de unidades.
 */
function bandLimitsParaGrafica(
  sexo: Sex,
  key: string,
  valorMostrado: number,
): (number | null)[] | null {
  const p = findMatrizParam(sexo, key);
  if (!p) return null;
  const enUnidad = bandLimitsEnEspacioDe(key, p.bandLimits, valorMostrado);
  if (!CANONICAL_PCT_KEYS.has(key)) return enUnidad;
  return enUnidad.map((b) => (b == null ? null : decimalToPct(b)));
}
