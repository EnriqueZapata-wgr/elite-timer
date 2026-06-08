/**
 * Edad ATP — mediciones puntuales (vitals). Sprint 2.5 (integración).
 * Pre-puebla desde health_measurements y guarda ahí mismo (tabla canónica).
 * `key` = columna real de health_measurements.
 * Nota: recovery_hr quedó de-scopeado (no tiene columna canónica — ver REPORT).
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveHealthMeasurement, getLatestHealthMeasurement, type HealthMeasurementInput } from '@/src/services/edad-atp/capture-service';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
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
  const [v, setV] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const [badge, setBadge] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      const row = await getLatestHealthMeasurement(user.id);
      if (!row) return;
      const init: Record<string, string> = {};
      const pre: Record<string, boolean> = {};
      for (const f of FIELDS) {
        if (row[f.key] != null) { init[f.key] = String(row[f.key]); pre[f.key] = true; }
      }
      setV(init);
      setSnapshot(init);
      setPrefilled(pre);
      if (row.date) setBadge(`hace ${daysAgo(row.date)}d`);
    })();
  }, [user?.id]));

  async function handleSave() {
    if (!user?.id) return;
    const fields: HealthMeasurementInput = {};
    let changed = 0;
    for (const f of FIELDS) {
      const raw = v[f.key];
      if (raw == null || raw.trim() === '') continue;
      const n = parseFloat(raw);
      if (!Number.isFinite(n)) continue;
      (fields as any)[f.key] = f.integer ? Math.round(n) : n;
      if (raw !== snapshot[f.key]) changed++;
    }
    if (Object.keys(fields).length === 0) { Alert.alert('Sin datos', 'Ingresa al menos una medición.'); return; }
    setSaving(true);
    const result = await saveHealthMeasurement(user.id, fields);
    setSaving(false);
    if (!result.ok) { Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_VITALS_SAVED, { count: changed });
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="health" title="Mediciones" />
      <ScrollView contentContainerStyle={styles.content}>
        {badge ? (
          <EliteText variant="caption" style={styles.intro}>Última medición {badge}. Actualiza si tomaste nuevas lecturas.</EliteText>
        ) : null}
        <View style={styles.card}>
          {FIELDS.map((f) => (
            <NumberInputRow key={f.key} label={f.label} unit={f.unit} helper={f.helper} badge={prefilled[f.key] ? badge ?? 'Salud' : undefined} value={v[f.key] ?? ''} onChangeText={(x) => set(f.key, x)} />
          ))}
        </View>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
