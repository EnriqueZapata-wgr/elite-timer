/**
 * useSectionSave — Hook para guardado explícito con feedback visual.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSectionSaveOptions<T> {
  initialData: T;
  saveFn: (data: T) => Promise<void>;
  sectionName: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseSectionSaveReturn<T> {
  data: T;
  setField: (key: keyof T, value: any) => void;
  setMultipleFields: (updates: Partial<T>) => void;
  hasChanges: boolean;
  isSaving: boolean;
  saveStatus: SaveStatus;
  errorMessage: string | null;
  save: () => Promise<void>;
  reset: (newData?: T) => void;
}

export function useSectionSave<T extends Record<string, any>>({
  initialData,
  saveFn,
  sectionName,
}: UseSectionSaveOptions<T>): UseSectionSaveReturn<T> {
  const [data, setData] = useState<T>(initialData);
  const [originalData, setOriginalData] = useState<T>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const initialRef = useRef(JSON.stringify(initialData));

  useEffect(() => {
    const newStr = JSON.stringify(initialData);
    if (newStr !== initialRef.current) {
      initialRef.current = newStr;
      setData(initialData);
      setOriginalData(initialData);
      setSaveStatus('idle');
    }
  }, [initialData]);

  const hasChanges = JSON.stringify(data) !== JSON.stringify(originalData);

  const setField = useCallback((key: keyof T, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
    setErrorMessage(null);
  }, []);

  const setMultipleFields = useCallback((updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }));
    setSaveStatus('idle');
    setErrorMessage(null);
  }, []);

  const save = useCallback(async () => {
    if (!hasChanges && saveStatus !== 'error') return;
    setIsSaving(true);
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await saveFn(data);
      setOriginalData(data);
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Error al guardar');
      if (__DEV__) console.error(`[save ${sectionName}]`, err);
    } finally {
      setIsSaving(false);
    }
  }, [data, hasChanges, saveStatus, saveFn, sectionName]);

  const reset = useCallback((newData?: T) => {
    const resetTo = newData || originalData;
    setData(resetTo);
    setOriginalData(resetTo);
    setSaveStatus('idle');
    setErrorMessage(null);
  }, [originalData]);

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  return { data, setField, setMultipleFields, hasChanges, isSaving, saveStatus, errorMessage, save, reset };
}
