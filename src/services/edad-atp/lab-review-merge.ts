/**
 * Merge de varias revisiones (multi-foto) en UN solo payload de confirmación.
 *
 * Doctrina: el usuario ve TODO antes de guardar — incluso cuando subió varias fotos. En vez
 * de N pantallas, consolidamos en una. Si un biomarker aparece en >1 foto:
 *   - se elige el "mejor" candidato por defecto (válido > confianza alta > primero),
 *   - se exponen TODOS los candidatos en `duplicates[key]` para que el usuario elija (lado a lado).
 *
 * Los derivados se recalculan desde los valores elegidos. otherValues se concatenan.
 */
import type { LabReviewPayload } from '@/src/services/lab-service';
import type { ProcessedItem, DupCandidate } from '@/src/services/edad-atp/lab-parser-process';
import { autoDeriveParams } from '@/src/services/edad-atp/auto-derive-service';

const CONF_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

/** Puntaje para elegir el mejor candidato: válido pesa más que la confianza. */
function score(it: ProcessedItem): number {
  return (it.passedValidation ? 100 : 0) + (CONF_RANK[it.confidence] ?? 0);
}

/**
 * Combina N revisiones en una sola. Requiere al menos una. Si solo hay una, la devuelve
 * tal cual (con uploadIds poblado) — sin duplicados.
 */
export function mergeReviews(reviews: LabReviewPayload[]): LabReviewPayload {
  if (reviews.length === 0) throw new Error('mergeReviews: sin revisiones');

  const uploadIds = reviews.map((r) => r.uploadId);

  if (reviews.length === 1) {
    return { ...reviews[0], uploadIds };
  }

  // Agrupar items por key, etiquetando la foto de origen (orden de subida) y
  // LA FECHA DE SU PROPIO ESTUDIO.
  //
  // 4EP GRAVE-1 (22-ago): aquí se colapsaban N revisiones, cada una con su
  // fecha, en una sola: "la primera que no sea nula". Todos los valores del
  // lote se guardaban bajo esa fecha. Dos estudios de fechas distintas
  // fotografiados en la misma tanda se fundían, que es el defecto 6 de la
  // auditoría, y measured_at es justo lo que decide qué valor está vigente:
  // un estudio de marzo entrando como de agosto pisa al reciente.
  const groups = new Map<string, Array<{ item: ProcessedItem; sourceLabel: string; fecha: string; uploadId: string }>>();
  reviews.forEach((rev, idx) => {
    const sourceLabel = `Foto ${idx + 1}`;
    for (const it of rev.items) {
      const arr = groups.get(it.key) ?? [];
      arr.push({ item: it, sourceLabel, fecha: rev.labDate, uploadId: rev.uploadId });
      groups.set(it.key, arr);
    }
  });

  const items: ProcessedItem[] = [];
  const duplicates: Record<string, DupCandidate[]> = {};
  const fechasPorItem: Record<string, string> = {};
  const origenPorItem: Record<string, string> = {};

  for (const [key, arr] of groups) {
    // Elegir el mejor por defecto (estable: el primero gana empates).
    let best = arr[0];
    for (const cand of arr) if (score(cand.item) > score(best.item)) best = cand;
    items.push(best.item);
    // El dato se queda con la fecha del estudio del que salió, no con la del
    // lote, y con la foto de la que salió.
    fechasPorItem[key] = best.fecha;
    origenPorItem[key] = best.uploadId;

    if (arr.length > 1) {
      duplicates[key] = arr.map((a) => ({
        value: a.item.valueCanonical,
        unit: a.item.unitCanonical,
        sourceLabel: a.sourceLabel,
        confidence: a.item.confidence,
        passedValidation: a.item.passedValidation,
      }));
    }
  }

  // Recalcular derivados desde los valores elegidos.
  const valuesMap: Record<string, number> = {};
  for (const it of items) valuesMap[it.key] = it.valueCanonical;
  const derived = Object.entries(autoDeriveParams(valuesMap)).map(([k, value]) => ({ key: k, value }));

  // Los derivados (índices que se calculan a partir de otros valores) no
  // salen de ningún estudio: se calculan de la mezcla. Se les pone la fecha
  // más reciente del lote, que es la del panel que manda.
  const fechas = [...new Set(Object.values(fechasPorItem))].sort();
  const fechaLote = fechas[fechas.length - 1] ?? reviews[0].labDate;
  for (const d of derived) if (!fechasPorItem[d.key]) fechasPorItem[d.key] = fechaLote;

  return {
    uploadId: reviews[0].uploadId,
    userId: reviews[0].userId,
    labName: reviews.find((r) => r.labName)?.labName ?? null,
    labDate: fechaLote,
    items,
    derived,
    otherValues: reviews.flatMap((r) => r.otherValues ?? []),
    duplicates,
    uploadIds,
    fechasPorItem,
    origenPorItem,
  };
}
