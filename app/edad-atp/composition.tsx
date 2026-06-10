/**
 * Edad ATP — composición corporal. Sprint 2.5 (integración).
 * Pre-puebla desde health_measurements (tabla canónica) y guarda ahí mismo —
 * no duplica en edad_atp_body_composition. FFMI se calcula en vivo (no se persiste).
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
import { saveHealthMeasurement, getLatestHealthMeasurement } from '@/src/services/edad-atp/capture-service';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const num = (s: string): number | undefined => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

const FIELD_KEYS = ['weight_kg', 'height_cm', 'body_fat_pct', 'muscle_mass_kg', 'visceral_fat', 'grip_strength_kg'] as const;

export default function CompositionCapture() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [v, setV] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const [badge, setBadge] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  const SUMMARY: { key: string; label: string; unit: string }[] = [
    { key: 'weight_kg', label: 'Peso', unit: 'kg' },
    { key: 'height_cm', label: 'Altura', unit: 'cm' },
    { key: 'body_fat_pct', label: '% Grasa', unit: '%' },
    { key: 'muscle_mass_kg', label: 'Masa muscular', unit: 'kg' },
    { key: 'visceral_fat', label: 'Grasa visceral', unit: '' },
    { key: 'grip_strength_kg', label: 'Fuerza de agarre', unit: 'kg' },
  ];
  const hasData = Object.keys(prefilled).length > 0;

  // Pre-poblar desde la última medición de salud.
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      const row = await getLatestHealthMeasurement(user.id);
      if (!row) return;
      const init: Record<string, string> = {};
      const pre: Record<string, boolean> = {};
      for (const k of FIELD_KEYS) {
        if (row[k] != null) { init[k] = String(row[k]); pre[k] = true; }
      }
      setV(init);
      setSnapshot(init);
      setPrefilled(pre);
      if (row.date) setBadge(`hace ${daysAgo(row.date)}d`);
    })();
  }, [user?.id]));

  // FFMI = masa libre de grasa / talla² (en vivo, no se persiste).
  const weight = num(v.weight_kg ?? '');
  const height = num(v.height_cm ?? '');
  const bodyFat = num(v.body_fat_pct ?? '');
  const ffmi =
    weight != null && height != null && bodyFat != null && height > 0
      ? (weight * (1 - bodyFat / 100)) / Math.pow(height / 100, 2)
      : undefined;

  // Diff de peso vs lo pre-poblado.
  const prevWeight = num(snapshot.weight_kg ?? '');
  const weightDiff = weight != null && prevWeight != null && weight !== prevWeight
    ? Math.round((weight - prevWeight) * 10) / 10 : null;

  async function handleSave() {
    if (!user?.id) return;
    const fields = {
      weight_kg: weight,
      height_cm: height,
      body_fat_pct: bodyFat,
      muscle_mass_kg: num(v.muscle_mass_kg ?? ''),
      visceral_fat: v.visceral_fat ? Math.round(Number(v.visceral_fat)) : undefined,
      grip_strength_kg: num(v.grip_strength_kg ?? ''),
    };
    if (Object.values(fields).every((x) => x == null || Number.isNaN(x))) {
      Alert.alert('Sin datos', 'Ingresa al menos un valor.');
      return;
    }
    setSaving(true);
    const result = await saveHealthMeasurement(user.id, fields);
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
      return;
    }
    analytics.track(ATP_EVENTS.EDAD_ATP_COMPOSITION_SAVED, {});
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Composición" />
      <ScrollView contentContainerStyle={styles.content}>
        {badge ? (
          <EliteText variant="caption" style={styles.intro}>
            Tu última medición fue {badge}. {hasData && !editMode ? 'Toca "Actualizar" si pesaste recientemente.' : 'Actualiza si pesaste recientemente.'}
          </EliteText>
        ) : null}

        {/* Resumen read-only cuando ya hay datos (no forma vacía). */}
        {hasData && !editMode ? (
          <View style={styles.card}>
            {SUMMARY.filter((f) => prefilled[f.key]).map((f) => (
              <View key={f.key} style={styles.sumRow}>
                <EliteText variant="body" style={styles.sumLabel}>{f.label}</EliteText>
                <EliteText variant="body" style={styles.sumValue}>{v[f.key]} {f.unit}</EliteText>
              </View>
            ))}
            {ffmi != null ? (
              <View style={styles.sumRow}>
                <EliteText variant="body" style={styles.sumLabel}>FFMI</EliteText>
                <EliteText variant="body" style={styles.sumValue}>{Math.round(ffmi * 10) / 10}</EliteText>
              </View>
            ) : null}
            <Pressable onPress={() => { haptic.light(); setEditMode(true); }} style={styles.updateBtn}>
              <EliteText variant="body" style={styles.updateBtnText}>Actualizar mediciones</EliteText>
            </Pressable>
          </View>
        ) : (
        <View style={styles.card}>
          <NumberInputRow label="Peso" unit="kg" badge={prefilled.weight_kg ? badge ?? 'Salud' : undefined} value={v.weight_kg ?? ''} onChangeText={(x) => set('weight_kg', x)} />
          {weightDiff != null ? (
            <EliteText variant="caption" style={styles.diff}>
              {weightDiff > 0 ? '+' : ''}{weightDiff} kg desde la última
            </EliteText>
          ) : null}
          <NumberInputRow label="Altura" unit="cm" badge={prefilled.height_cm ? badge ?? 'Salud' : undefined} value={v.height_cm ?? ''} onChangeText={(x) => set('height_cm', x)} />
          <NumberInputRow label="% Grasa corporal" unit="%" badge={prefilled.body_fat_pct ? badge ?? 'Salud' : undefined} value={v.body_fat_pct ?? ''} onChangeText={(x) => set('body_fat_pct', x)} />
          <NumberInputRow label="Masa muscular" unit="kg" badge={prefilled.muscle_mass_kg ? badge ?? 'Salud' : undefined} value={v.muscle_mass_kg ?? ''} onChangeText={(x) => set('muscle_mass_kg', x)} helper="Reportada por báscula inteligente" />
          <NumberInputRow label="Grasa visceral" badge={prefilled.visceral_fat ? badge ?? 'Salud' : undefined} value={v.visceral_fat ?? ''} onChangeText={(x) => set('visceral_fat', x)} helper="Índice típico 1–30" />
          <NumberInputRow label="Fuerza de agarre" unit="kg" badge={prefilled.grip_strength_kg ? badge ?? 'Salud' : undefined} value={v.grip_strength_kg ?? ''} onChangeText={(x) => set('grip_strength_kg', x)} helper="Dinamómetro Camry EH101 (~$25)" />
          <NumberInputRow label="Tu FFMI" value={ffmi != null ? (Math.round(ffmi * 10) / 10).toString() : ''} readOnly placeholder="auto" />
        </View>
        )}

        <EliteText variant="caption" style={styles.note}>
          Pesa por la mañana en ayunas, sin ropa. Se guarda en tu expediente de Salud (no se duplica).
        </EliteText>

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
  diff: { color: Colors.neonGreen, fontSize: FontSizes.xs, textAlign: 'right', marginTop: -4, marginBottom: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  sumLabel: { color: Colors.textSecondary },
  sumValue: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  updateBtn: { marginTop: Spacing.sm, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)', borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  updateBtnText: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
