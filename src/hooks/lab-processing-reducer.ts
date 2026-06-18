/**
 * Núcleo PURO del estado de procesamiento de labs (Capa 8 — UX async). Sin imports nativos
 * → testeable. El hook useLabProcessing envuelve esto con Realtime + timers.
 */
export type LabStatus = 'uploaded' | 'pending' | 'processing' | 'extracted' | 'failed' | 'confirmed' | 'cancelled';

export interface ProcessingUpload {
  uploadId: string;
  fileName: string;
  fileSize: number; // bytes
  pageCount?: number;
  status: LabStatus;
  uploadedAt: string; // ISO
  errorMessage?: string;
}

export interface LabProcState {
  uploads: Record<string, ProcessingUpload>;
  dismissed: Record<string, true>;   // ids que el usuario cerró del banner
  sheetUploadId: string | null;      // upload que muestra el sheet
  sheetExpanded: boolean;            // true = sheet abierto; false = minimizado (banner)
}

export type LabProcAction =
  | { type: 'upsert'; upload: ProcessingUpload }
  | { type: 'patch'; uploadId: string; changes: Partial<ProcessingUpload> }
  | { type: 'remove'; uploadId: string }
  | { type: 'dismiss'; uploadId: string }
  | { type: 'openSheet'; uploadId: string }
  | { type: 'minimizeSheet' }
  | { type: 'closeSheet' };

export const initialLabProcState: LabProcState = {
  uploads: {},
  dismissed: {},
  sheetUploadId: null,
  sheetExpanded: false,
};

const ACTIVE: LabStatus[] = ['uploaded', 'pending', 'processing'];
const FINISHED: LabStatus[] = ['extracted', 'failed'];

export function labProcReducer(state: LabProcState, action: LabProcAction): LabProcState {
  switch (action.type) {
    case 'upsert': {
      return { ...state, uploads: { ...state.uploads, [action.upload.uploadId]: action.upload } };
    }
    case 'patch': {
      const cur = state.uploads[action.uploadId];
      if (!cur) return state;
      return { ...state, uploads: { ...state.uploads, [action.uploadId]: { ...cur, ...action.changes } } };
    }
    case 'remove': {
      const { [action.uploadId]: _gone, ...rest } = state.uploads;
      const closeSheet = state.sheetUploadId === action.uploadId;
      return {
        ...state,
        uploads: rest,
        sheetUploadId: closeSheet ? null : state.sheetUploadId,
        sheetExpanded: closeSheet ? false : state.sheetExpanded,
      };
    }
    case 'dismiss': {
      return { ...state, dismissed: { ...state.dismissed, [action.uploadId]: true } };
    }
    case 'openSheet': {
      return { ...state, sheetUploadId: action.uploadId, sheetExpanded: true };
    }
    case 'minimizeSheet': {
      return { ...state, sheetExpanded: false };
    }
    case 'closeSheet': {
      return { ...state, sheetExpanded: false, sheetUploadId: null };
    }
    default:
      return state;
  }
}

/** Uploads en curso (pending/processing). */
export function activeUploads(state: LabProcState): ProcessingUpload[] {
  return Object.values(state.uploads).filter((u) => ACTIVE.includes(u.status));
}

/** Uploads terminados (extracted/failed) NO descartados — candidatos del banner. */
export function finishedUploads(state: LabProcState): ProcessingUpload[] {
  return Object.values(state.uploads).filter((u) => FINISHED.includes(u.status) && !state.dismissed[u.uploadId]);
}

/**
 * Upload que el banner debe mostrar: prioriza terminados (resultado accionable), luego
 * activos. Toma el más reciente por uploadedAt. null si no hay nada que mostrar.
 */
export function bannerUpload(state: LabProcState): ProcessingUpload | null {
  const byRecent = (a: ProcessingUpload, b: ProcessingUpload) => b.uploadedAt.localeCompare(a.uploadedAt);
  const finished = finishedUploads(state).sort(byRecent);
  if (finished.length > 0) return finished[0];
  const active = activeUploads(state).sort(byRecent);
  return active.length > 0 ? active[0] : null;
}

/** Cuántos uploads activos hay (para "Procesando 2 labs…"). */
export function activeCount(state: LabProcState): number {
  return activeUploads(state).length;
}
