/**
 * Mic privacy (MB-30A · Pieza 1) — EL mecanismo de privacidad del Sleep Cycle.
 *
 * 🚨 EL AUDIO JAMÁS SE GRABA NI SE SUBE. El grabador nativo (expo-audio)
 * escribe por diseño un archivo temporal mientras mide niveles; este módulo
 * garantiza que ese archivo se DESCARTA sin leerse jamás:
 *
 *   · La sesión rota el grabador cada CHUNK_MS: stop → borrar archivo →
 *     preparar → grabar de nuevo. Ningún fragmento vive más de 10 minutos.
 *   · Al terminar la sesión: stop → borrar. Nada queda en disco.
 *   · Nadie lee el contenido: aquí NO existe readAsString, ni fetch del
 *     archivo, ni subida a storage. Solo delete. El test estructural de
 *     privacidad afirma exactamente eso y truena si alguien lo cambia.
 *
 * Lo único que sale de aquí hacia el resto de la app son NÚMEROS (el
 * metering del status del grabador, que lee la pantalla).
 */
import { warn as logWarn } from '@/src/lib/logger';

/** Rotación de fragmentos: ninguno vive más de 10 minutos. */
export const CHUNK_MS = 10 * 60 * 1000;

/** Superficie mínima del AudioRecorder que este módulo necesita. */
export interface RecorderLike {
  uri: string | null;
  stop(): Promise<void>;
  prepareToRecordAsync(): Promise<void>;
  record(): void;
}

/**
 * Borra el archivo temporal del grabador. Fail-soft: si el borrado falla,
 * se registra — el archivo vive en el cache del sandbox de la app y el SO
 * lo purga, pero el camino feliz es no dejarle nada.
 */
export async function descartarFragmento(uri: string | null): Promise<void> {
  if (!uri) return;
  try {
    // Lazy require (doctrina nativos): legacy API de expo-file-system.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system/legacy') as {
      deleteAsync: (u: string, o?: { idempotent?: boolean }) => Promise<void>;
    };
    await fs.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    logWarn('[sleep] descartar fragmento:', e);
  }
}

/** Rotación periódica: corta el fragmento actual, lo borra y sigue midiendo. */
export async function rotarFragmento(rec: RecorderLike): Promise<void> {
  try {
    await rec.stop();
  } catch (e) {
    logWarn('[sleep] rotar (stop):', e);
  }
  await descartarFragmento(rec.uri);
  try {
    await rec.prepareToRecordAsync();
    rec.record();
  } catch (e) {
    logWarn('[sleep] rotar (rearranque):', e);
  }
}

/** Cierre de sesión: detiene el grabador y no deja ningún fragmento atrás. */
export async function terminarYDescartar(rec: RecorderLike): Promise<void> {
  try {
    await rec.stop();
  } catch (e) {
    logWarn('[sleep] terminar (stop):', e);
  }
  await descartarFragmento(rec.uri);
}
