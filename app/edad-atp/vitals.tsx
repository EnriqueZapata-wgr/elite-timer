/**
 * Edad ATP — mediciones puntuales (vitals). Sprint 2.5 (integración).
 * Pre-puebla desde health_measurements y guarda ahí mismo (tabla canónica).
 * `key` = columna real de health_measurements.
 * Nota: recovery_hr quedó de-scopeado (no tiene columna canónica — ver REPORT).
 */
import { useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveHealthMeasurement, getLatestHealthMeasurement, type HealthMeasurementInput } from '@/src/services/edad-atp/capture-service';
import { useFormDraft } from '@/src/hooks/useFormDraft';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const FIELDS: { key: string; label: string; unit: string; helper?: string; integer?: boolean }[] = [
  { key: 'systolic_bp', label: 'Presión sistólica', unit: 'mmHg', helper: 'En reposo, sentado, tras 5 min de calma', integer: true },
  { key: 'diastolic_bp', label: 'Presión diastólica', unit: 'mmHg', integer: true },
  { key: 'resting_hr', label: 'FC reposo matutina', unit: 'bpm', helper: 'Antes de levantarte', integer: true },
  { key: 'vo2max_estimate', label: 'VO2max estimado', unit: 'ml/kg/min', helper: 'Opcional — de tu wearable o test Cooper' },
];

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

export default function VitalsCapture() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  // ?focus=<columna> desde "Datos por capturar": abre el form y resalta el campo (#16).
  // ?prefill=<valor>: regreso del test Cooper con el VO2max calculado (FIX 3).
  const { focus, prefill } = useLocalSearchParams<{ focus?: string; prefill?: string }>();
  const [v, setV] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const [badge, setBadge] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const { load: loadDraft, save: saveDraft, clear: clearDraft } = useFormDraft('vitals', user?.id);
  // Persistir el borrador al teclear → sobrevive navegación (Mariana #11/#15).
  const set = (k: string, val: string) => setV((p) => { const next = { ...p, [k]: val }; saveDraft(next); return next; });
  const hasData = Object.keys(prefilled).length > 0;

  // Si llega con ?focus, mostrar el formulario editable directo (no el resumen read-only).
  useEffect(() => { if (focus) setEditMode(true); }, [focus]);
  // Pre-llenar el VO2max al volver del test Cooper (FIX 3).
  useEffect(() => { if (prefill) { setEditMode(true); set('vo2max_estimate', String(prefill)); } }, [prefill]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      const row = await getLatestHealthMeasurement(user.id);
      const init: Record<string, string> = {};
      const pre: Record<string, boolean> = {};
      if (row) {
        for (const f of FIELDS) {
          if (row[f.key] != null) { init[f.key] = String(row[f.key]); pre[f.key] = true; }
        }
        if (row.date) setBadge(`hace ${daysAgo(row.date)}d`);
      }
      setSnapshot(init);
      setPrefilled(pre);
      // Restaurar borrador no guardado encima de lo de DB (Mariana #11/#15).
      const saved = await loadDraft();
      if (saved && Object.keys(saved).length > 0) {
        setV({ ...init, ...saved });
        setEditMode(true);
      } else {
        setV(init);
      }
    })();
  }, [user?.id, loadDraft]));

  async function handleSave() {
    if (!user?.id) return;
    const fields: HealthMeasurementInput = {};
    let changed = 0;
    for (const f of FIELDS) {
      const raw = v[f.key];
      if (raw == null || raw.trim() === '') continue;
      const n = parseDecimalInput(raw); // acepta coma O punto (#10)
      if (n == null) continue;
      (fields as any)[f.key] = f.integer ? Math.round(n) : n;
      if (raw !== snapshot[f.key]) changed++;
    }
    if (Object.keys(fields).length === 0) { Alert.alert('Sin datos', 'Ingresa al menos una medición.'); return; }
    setSaving(true);
    const result = await saveHealthMeasurement(user.id, fields);
    setSaving(false);
    if (!result.ok) { Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.'); return; }
    await clearDraft(); // ya está en DB: la recarga lo traerá.
    analytics.track(ATP_EVENTS.EDAD_ATP_VITALS_SAVED, { count: changed });
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="health" title="Mediciones" />
      <ScrollView contentContainerStyle={styles.content}>
        {badge ? (
          <EliteText variant="caption" style={styles.intro}>Última medición {badge}. {hasData && !editMode ? 'Toca "Actualizar" si tomaste nuevas lecturas.' : 'Actualiza si tomaste nuevas lecturas.'}</EliteText>
        ) : null}

        {hasData && !editMode ? (
          <View style={styles.card}>
            {FIELDS.filter((f) => prefilled[f.key]).map((f) => (
              <View key={f.key} style={styles.sumRow}>
                <EliteText variant="body" style={styles.sumLabel}>{f.label}</EliteText>
                <EliteText variant="body" style={styles.sumValue}>{v[f.key]} {f.unit}</EliteText>
              </View>
            ))}
            <Pressable onPress={() => { haptic.light(); setEditMode(true); }} style={styles.updateBtn}>
              <EliteText variant="body" style={styles.updateBtnText}>Actualizar mediciones</EliteText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            {FIELDS.map((f) => {
              const isVo2 = f.key === 'vo2max_estimate';
              return (
                <NumberInputRow
                  key={f.key}
                  label={f.label}
                  unit={f.unit}
                  helper={isVo2 ? 'Si no lo sabes, haz el test Cooper de 12 min →' : f.helper}
                  onHelperPress={isVo2 ? () => { haptic.light(); router.push('/edad-atp/tests/cooper?return=vitals'); } : undefined}
                  badge={prefilled[f.key] ? badge ?? 'Salud' : undefined}
                  value={v[f.key] ?? ''}
                  onChangeText={(x) => set(f.key, x)}
                  highlight={focus === f.key}
                />
              );
            })}
          </View>
        )}

        {(!hasData || editMode) && (
          <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
            <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  sumLabel: { color: Colors.textSecondary },
  sumValue: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  updateBtn: { marginTop: Spacing.sm, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)', borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  updateBtnText: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
