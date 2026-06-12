/**
 * Tipos de archivo que el usuario puede subir (#10). Al subir, se pregunta PRIMERO qué es.
 * Solo los tipos que alimentan el motor (labs, composición) parsean a valores; el resto se
 * guarda como contexto/respaldo y NUNCA toca `lab_values` (#11: un archivo del tipo
 * equivocado no corrompe labs). PURO/declarativo — la UI y el ruteo leen de aquí.
 */

/** Destino de los datos de un upload. */
export type UploadTarget = 'lab_values' | 'composition' | 'context';

export type UploadType = {
  id: string;
  label: string;
  /** Sub-ejemplos para que el usuario reconozca su estudio. */
  hint: string;
  target: UploadTarget;
  /** true solo para los tipos que extraen valores que tocan el motor (1 y 2). */
  writesValues: boolean;
  icon: string;
};

export const UPLOAD_TYPES: UploadType[] = [
  { id: 'labs', label: 'Laboratorios', hint: 'Química sanguínea, biometría, perfil tiroideo, hormonas…', target: 'lab_values', writesValues: true, icon: '🩸' },
  { id: 'composicion', label: 'Composición corporal', hint: 'InBody, báscula, Lepulse, ISAK2, SECA, TANITA, DEXA', target: 'composition', writesValues: true, icon: '💪' },
  { id: 'diagnostico', label: 'Diagnóstico especializado', hint: 'ECG, EEG y similares — respaldo, no alimenta el motor', target: 'context', writesValues: false, icon: '📈' },
  { id: 'genetico', label: 'RAW genético / genotipado', hint: 'Datos crudos de ADN — adjunto de contexto', target: 'context', writesValues: false, icon: '🧬' },
  { id: 'densitometria', label: 'Densitometría ósea', hint: 'DXA óseo — adjunto de contexto', target: 'context', writesValues: false, icon: '🦴' },
  { id: 'imagen', label: 'Estudio de imagen', hint: 'Rayos X, US, endoscopía, resonancia, gammagrama, PET', target: 'context', writesValues: false, icon: '🩻' },
  { id: 'interpretacion', label: 'Interpretación médica', hint: 'Reporte/opinión de especialista — adjunto de contexto', target: 'context', writesValues: false, icon: '📝' },
];

export function getUploadType(id: string): UploadType | undefined {
  return UPLOAD_TYPES.find((t) => t.id === id);
}

export type UploadRoute = {
  /** Si parsea valores que tocan el motor. */
  writesValues: boolean;
  target: UploadTarget;
  /** Acción de ingesta: extraer (parsear) o solo adjuntar como contexto. */
  action: 'extract' | 'attach';
};

/**
 * Decide el ruteo de un upload por su tipo. Tipos 3-7 → 'attach' (contexto, no parsea).
 * Tipos 1-2 → 'extract'. Tipo desconocido → contexto seguro (no escribe valores).
 */
export function routeUploadByType(typeId: string): UploadRoute {
  const t = getUploadType(typeId);
  if (!t) return { writesValues: false, target: 'context', action: 'attach' };
  return { writesValues: t.writesValues, target: t.target, action: t.writesValues ? 'extract' : 'attach' };
}
