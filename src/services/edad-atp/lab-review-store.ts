/**
 * Store en memoria para pasar el payload de revisión del parser (Capa 4) desde la pantalla
 * de subida (my-health) a la pantalla de confirmación (lab-confirmation), sin serializarlo
 * en params de navegación (el payload trae arrays grandes). Vive solo en la sesión JS.
 */
import type { LabReviewPayload } from '@/src/services/lab-service';

const store = new Map<string, LabReviewPayload>();

export function setReview(payload: LabReviewPayload): void {
  store.set(payload.uploadId, payload);
}

export function getReview(uploadId: string): LabReviewPayload | undefined {
  return store.get(uploadId);
}

export function clearReview(uploadId: string): void {
  store.delete(uploadId);
}
