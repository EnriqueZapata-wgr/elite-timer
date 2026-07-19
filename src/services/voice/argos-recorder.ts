/**
 * argos-recorder — captura de audio del usuario para STT Gemini (MB-4 J5).
 *
 * Graba con expo-audio (NUNCA expo-av) y devuelve el audio en base64 para
 * mandarlo a la edge function argos-voice (action 'stt' → Gemini). Import
 * perezoso + fail-soft: sin módulo nativo / sin permiso → null, nunca crashea.
 *
 * Verificación real = device con build nativo + permiso de micrófono (gate Enrique).
 */

type ExpoAudio = typeof import('expo-audio');

let audioMod: ExpoAudio | null = null;
async function getAudioMod(): Promise<ExpoAudio | null> {
  if (audioMod) return audioMod;
  try { audioMod = await import('expo-audio'); return audioMod; } catch { return null; }
}

let recorder: import('expo-audio').AudioRecorder | null = null;

/** Pide permiso de micrófono. false si no se concede o no hay módulo. */
export async function ensureMicPermission(): Promise<boolean> {
  const audio = await getAudioMod();
  if (!audio) return false;
  try {
    const res = await audio.requestRecordingPermissionsAsync();
    return !!res?.granted;
  } catch { return false; }
}

/** Empieza a grabar. false si no se pudo (sin permiso/módulo). */
export async function startRecording(): Promise<boolean> {
  const audio = await getAudioMod();
  if (!audio) return false;
  try {
    if (!(await ensureMicPermission())) return false;
    await audio.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true } as any);
    recorder = new (audio as any).AudioRecorder(audio.RecordingPresets.HIGH_QUALITY);
    await recorder!.prepareToRecordAsync();
    recorder!.record();
    return true;
  } catch {
    recorder = null;
    return false;
  }
}

/**
 * Detiene la grabación y devuelve { base64, mime } listos para STT, o null.
 * Fail-soft: cualquier error → null (el caller degrada, nunca crashea).
 */
export async function stopRecording(): Promise<{ base64: string; mime: string } | null> {
  if (!recorder) return null;
  const rec = recorder;
  recorder = null;
  try {
    await rec.stop();
    const uri = rec.uri;
    if (!uri) return null;
    const FileSystem = await import('expo-file-system');
    const base64 = await (FileSystem as any).readAsStringAsync(uri, {
      encoding: (FileSystem as any).EncodingType?.Base64 ?? 'base64',
    });
    if (!base64) return null;
    // expo-audio HIGH_QUALITY graba .m4a (AAC) → mime audio/mp4 para Gemini.
    return { base64, mime: 'audio/mp4' };
  } catch {
    return null;
  }
}

/** Cancela la grabación en curso sin devolver audio (barge-in / abort). */
export async function cancelRecording(): Promise<void> {
  if (!recorder) return;
  const rec = recorder;
  recorder = null;
  try { await rec.stop(); } catch { /* */ }
}
