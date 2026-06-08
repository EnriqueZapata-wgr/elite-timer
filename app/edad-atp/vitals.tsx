/**
 * Edad ATP — captura manual de mediciones puntuales (vitals). Sprint 2.
 * Se guardan como biomarcadores (mismas tabla/servicio).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveBiomarkers, type BiomarkerEntry } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const FIELDS: { key: string; label: string; unit: string; helper?: string }[] = [
  { key: 'systolic_bp', label: 'Presión sistólica', unit: 'mmHg', helper: 'En reposo, sentado, tras 5 min de calma' },
  { key: 'diastolic_bp', label: 'Presión diastólica', unit: 'mmHg' },
  { key: 'resting_hr', label: 'FC reposo matutina', unit: 'bpm', helper: 'Antes de levantarte' },
  { key: 'recovery_hr', label: 'FC recovery (min 1)', unit: 'bpm', helper: 'Opcional — caída de FC tras ejercicio' },
  { key: 'vo2max_estimated', label: 'VO2max estimado', unit: 'ml/kg/min', helper: 'Opcional — de tu wearable o test Cooper' },
];

export default function VitalsCapture() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [v, setV] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  async function handleSave() {
    if (!user?.id) return;
    const entries: BiomarkerEntry[] = [];
    for (const f of FIELDS) {
      const n = parseFloat(v[f.key] ?? '');
      if (Number.isFinite(n)) entries.push({ key: f.key, value: n, unit: f.unit });
    }
    if (entries.length === 0) { Alert.alert('Sin datos', 'Ingresa al menos una medición.'); return; }
    setSaving(true);
    const result = await saveBiomarkers(user.id, entries);
    setSaving(false);
    if (!result.ok) { Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_VITALS_SAVED, { count: entries.length });
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="health" title="Mediciones" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {FIELDS.map((f) => (
            <NumberInputRow key={f.key} label={f.label} unit={f.unit} helper={f.helper} value={v[f.key] ?? ''} onChangeText={(x) => set(f.key, x)} />
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
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
