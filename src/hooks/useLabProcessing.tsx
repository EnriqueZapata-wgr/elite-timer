/**
 * useLabProcessing — estado central del procesamiento de labs (Capa 8 — UX async).
 * Context global (montado en _layout) compartido por my-health (dispara) y el mini-banner
 * global (muestra). Suscribe a Supabase Realtime de lab_uploads del usuario y reanuda al
 * arranque los uploads atascados.
 */
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { extractLabValuesForReview, deleteLabUpload, enqueueLabWorker, LAB_ASYNC_WORKER_ENABLED } from '@/src/services/lab-service';
import { setReview } from '@/src/services/edad-atp/lab-review-store';
import { routeUploadByType } from '@/src/constants/upload-types';
import {
  labProcReducer, initialLabProcState, type LabProcState, type ProcessingUpload,
} from '@/src/hooks/lab-processing-reducer';

interface LabProcessingApi {
  state: LabProcState;
  /** Registra + extrae en background (no bloquea). Lo llama my-health tras subir el archivo. */
  startProcessing: (uploadId: string, fileName: string, fileSize: number, pageCount?: number) => void;
  openSheet: (uploadId: string) => void;
  minimizeSheet: () => void;
  closeSheet: () => void;
  dismiss: (uploadId: string) => void;
  retryUpload: (uploadId: string) => Promise<void>;
  cancelUpload: (uploadId: string) => Promise<void>;
}

const Ctx = createContext<LabProcessingApi | null>(null);

const STUCK_MS = 5 * 60 * 1000;

function rowToUpload(row: any): ProcessingUpload {
  return {
    uploadId: row.id,
    fileName: row.file_name ?? 'lab',
    fileSize: 0,
    status: row.status,
    uploadedAt: row.uploaded_at ?? new Date().toISOString(),
    errorMessage: row.error_message ?? undefined,
  };
}

export function LabProcessingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, dispatch] = useReducer(labProcReducer, initialLabProcState);

  // Corre la extracción en background; al resolver, cachea el review para la confirmación.
  // El status final (extracted/failed) llega por Realtime (lab-service hace el UPDATE en DB).
  const runExtraction = useCallback(async (uploadId: string) => {
    dispatch({ type: 'patch', uploadId, changes: { status: 'processing', errorMessage: undefined } });
    // Capa 9 (flag ON): NO extraemos en el cliente. Encolamos el worker server-side (status →
    // 'pending' dispara el trigger 076) y dejamos que Realtime traiga 'extracted'/'failed'. Al
    // tocar el banner, lab-confirmation carga la revisión desde DB (loadReviewFromDb).
    if (LAB_ASYNC_WORKER_ENABLED) {
      try { await enqueueLabWorker(uploadId); }
      catch { dispatch({ type: 'patch', uploadId, changes: { status: 'failed', errorMessage: 'No se pudo encolar el análisis.' } }); }
      return;
    }
    // Flujo síncrono (flag OFF): el cliente corre el LLM y cachea el review en memoria.
    try {
      const review = await extractLabValuesForReview(uploadId);
      if (!('error' in review)) setReview(review);
    } catch { /* lab-service marca failed → Realtime lo refleja */ }
  }, []);

  // Ref para que el effect de arranque pueda llamar retry sin dependencia circular.
  const runExtractionRef = useRef(runExtraction);
  runExtractionRef.current = runExtraction;

  const startProcessing = useCallback((uploadId: string, fileName: string, fileSize: number, pageCount?: number) => {
    dispatch({ type: 'upsert', upload: { uploadId, fileName, fileSize, pageCount, status: 'pending', uploadedAt: new Date().toISOString() } });
    dispatch({ type: 'openSheet', uploadId });
    runExtraction(uploadId); // sin await — no bloquea la UI
  }, [runExtraction]);

  const openSheet = useCallback((uploadId: string) => dispatch({ type: 'openSheet', uploadId }), []);
  const minimizeSheet = useCallback(() => dispatch({ type: 'minimizeSheet' }), []);
  const closeSheet = useCallback(() => dispatch({ type: 'closeSheet' }), []);
  const dismiss = useCallback((uploadId: string) => dispatch({ type: 'dismiss', uploadId }), []);

  const retryUpload = useCallback(async (uploadId: string) => {
    await runExtraction(uploadId);
  }, [runExtraction]);

  const cancelUpload = useCallback(async (uploadId: string) => {
    dispatch({ type: 'remove', uploadId });
    try { await deleteLabUpload(uploadId); } catch { /* best-effort */ }
  }, []);

  // Realtime: cualquier cambio en lab_uploads del usuario actualiza el estado.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`lab_uploads:user_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_uploads', filter: `user_id=eq.${userId}` }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id;
          if (id) dispatch({ type: 'remove', uploadId: id });
          return;
        }
        const row = payload.new;
        if (!row?.id) return;
        // Un archivo que no es de laboratorio no tiene por qué encender el
        // aviso global ni ofrecer "revisar valores".
        //
        // 4EP GRAVE-5: la primera versión preguntaba por `writesValues`, y
        // 'composicion' lo tiene en true aunque su destino NO sea lab_values.
        // El filtro correcto es el mismo que usa my-health para decidir la
        // rama: el DESTINO del dato.
        const tipo = (row as any).upload_type ?? 'labs';
        if (routeUploadByType(tipo).target !== 'lab_values') return;
        // Y un estudio ya confirmado tampoco: el aviso volvía a ofrecerlo justo
        // después de guardar, porque el estado se quedaba en 'extracted'.
        if (row.status === 'confirmed' || row.status === 'cancelled') {
          dispatch({ type: 'remove', uploadId: row.id });
          return;
        }
        dispatch({ type: 'upsert', upload: rowToUpload(row) });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Arranque: cargar uploads pending/processing y reanudar los atascados (>5min).
  //
  // 22-ago-2026 — SOLO SE REANUDA LO QUE DE VERDAD ES LABORATORIO.
  // Antes se reanudaba cualquier fila en 'uploaded', y un archivo de contexto
  // (un electrocardiograma, un RAW genético, la interpretación de un
  // especialista) que se hubiera quedado a medias entraba aquí, se marcaba
  // 'pending', el trigger lo mandaba al worker y se parseaba contra el prompt
  // de química sanguínea. Con la migración 308 el tipo elegido está en la
  // base, así que la pregunta ya se puede contestar.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('lab_uploads').select('*').eq('user_id', userId)
        .in('status', ['uploaded', 'pending', 'processing']).order('uploaded_at', { ascending: false });
      if (!alive) return;
      for (const row of data ?? []) {
        // Nulo = fila anterior a la 308, y todas esas eran de la puerta de
        // laboratorios, que era la única que llamaba al motor.
        //
        // 4EP GRAVE-5: con `writesValues` aquí, una composición corporal
        // (InBody, DEXA, báscula) pasaba el filtro, porque declara que escribe
        // valores aunque su destino sea otro. Y como my-health la sube y la
        // deja en 'uploaded' para siempre, el siguiente arranque la reanudaba
        // y el worker la parseaba contra el prompt de química sanguínea.
        const tipo = (row as any).upload_type ?? 'labs';
        if (routeUploadByType(tipo).target !== 'lab_values') continue;
        dispatch({ type: 'upsert', upload: rowToUpload(row) });
        const ageMs = Date.now() - new Date(row.uploaded_at ?? 0).getTime();
        if (ageMs > STUCK_MS) runExtractionRef.current(row.id); // reanudar el atascado
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const api: LabProcessingApi = {
    state, startProcessing, openSheet, minimizeSheet, closeSheet, dismiss, retryUpload, cancelUpload,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Devuelve la API; si no hay provider (no debería pasar), un no-op seguro. */
export function useLabProcessing(): LabProcessingApi {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return {
    state: initialLabProcState,
    startProcessing: () => {}, openSheet: () => {}, minimizeSheet: () => {}, closeSheet: () => {},
    dismiss: () => {}, retryUpload: async () => {}, cancelUpload: async () => {},
  };
}
