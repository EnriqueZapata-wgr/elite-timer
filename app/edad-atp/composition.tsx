/**
 * Edad ATP — composición corporal. Sprint 2.5 (integración).
 * Pre-puebla desde health_measurements (tabla canónica) y guarda ahí mismo —
 * no duplica en edad_atp_body_composition. FFMI se calcula en vivo (no se persiste).
 */
import { useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveHealthMeasurement, getLatestHealthMeasurement } from '@/src/services/edad-atp/capture-service';
import { useFormDraft } from '@/src/hooks/useFormDraft';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { SEMANTIC, TEXT } from '@/src/constants/brand';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// Acepta coma O punto decimal (Mariana flag #10).
const num = (s: string): number | undefined => parseDecimalInput(s) ?? undefined;

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

// MB-27 P1: brazo, pierna y pecho entran aquí — esta pantalla ES la puerta
// de captura de peso y medidas (la app Medidas la abre con ?focus).
const FIELD_KEYS = ['weight_kg', 'height_cm', 'body_fat_pct', 'muscle_mass_kg', 'visceral_fat', 'grip_strength_kg', 'waist_cm', 'hip_cm', 'arm_cm', 'leg_cm', 'chest_cm'] as const;

/**
 * MB-27 menores 2-3: rangos fisiológicos por campo. Antes -5 se guardaba
 * (y /medidas lo filtraba: "sin medidas" tras un guardado exitoso) y 12345
 * reventaba el DECIMAL(5,1) con un 22003 que el usuario veía como "no se
 * pudo guardar". Fuera de rango se rechaza CON nombre; nunca en silencio.
 */
const RANGOS: Record<(typeof FIELD_KEYS)[number], { min: number; max: number; label: string }> = {
  weight_kg: { min: 30, max: 300, label: 'Peso' },
  height_cm: { min: 100, max: 230, label: 'Altura' },
  body_fat_pct: { min: 3, max: 60, label: '% Grasa corporal' },
  muscle_mass_kg: { min: 10, max: 100, label: 'Masa muscular' },
  visceral_fat: { min: 1, max: 59, label: 'Grasa visceral' },
  grip_strength_kg: { min: 5, max: 100, label: 'Fuerza de agarre' },
  waist_cm: { min: 40, max: 180, label: 'Cintura' },
  hip_cm: { min: 50, max: 180, label: 'Cadera' },
  arm_cm: { min: 15, max: 80, label: 'Brazo' },
  leg_cm: { min: 30, max: 120, label: 'Pierna' },
  chest_cm: { min: 50, max: 200, label: 'Pecho' },
};

export default function CompositionCapture() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  // ?focus=<columna> desde "Datos por capturar": abre el form y resalta el campo (#16).
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [v, setV] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const [badge, setBadge] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const { load: loadDraft, save: saveDraft, clear: clearDraft } = useFormDraft('composition', user?.id);
  // Persistir el borrador al teclear → sobrevive navegación (Mariana #11/#15).
  const set = (k: string, val: string) => setV((p) => { const next = { ...p, [k]: val }; saveDraft(next); return next; });

  // Si llega con ?focus, mostrar el formulario editable directo (no el resumen read-only).
  useEffect(() => { if (focus) setEditMode(true); }, [focus]);

  const SUMMARY: { key: string; label: string; unit: string }[] = [
    { key: 'weight_kg', label: 'Peso', unit: 'kg' },
    { key: 'height_cm', label: 'Altura', unit: 'cm' },
    { key: 'body_fat_pct', label: '% Grasa', unit: '%' },
    { key: 'muscle_mass_kg', label: 'Masa muscular', unit: 'kg' },
    { key: 'visceral_fat', label: 'Grasa visceral', unit: '' },
    { key: 'grip_strength_kg', label: 'Fuerza de agarre', unit: 'kg' },
    { key: 'waist_cm', label: 'Cintura', unit: 'cm' },
    { key: 'hip_cm', label: 'Cadera', unit: 'cm' },
    { key: 'arm_cm', label: 'Brazo', unit: 'cm' },
    { key: 'leg_cm', label: 'Pierna', unit: 'cm' },
    { key: 'chest_cm', label: 'Pecho', unit: 'cm' },
  ];
  const hasData = Object.keys(prefilled).length > 0;

  // Pre-poblar desde la última medición de salud.
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      const row = await getLatestHealthMeasurement(user.id);
      const init: Record<string, string> = {};
      const pre: Record<string, boolean> = {};
      if (row) {
        for (const k of FIELD_KEYS) {
          if (row[k] != null) { init[k] = String(row[k]); pre[k] = true; }
        }
        if (row.date) setBadge(`hace ${daysAgo(row.date)}d`);
      }
      setSnapshot(init);
      setPrefilled(pre);
      // Restaurar borrador no guardado encima de lo de DB (Mariana #11/#15).
      const saved = await loadDraft();
      if (saved && Object.keys(saved).length > 0) {
        setV({ ...init, ...saved });
        setEditMode(true); // mostrar el form para que vea su captura pendiente
      } else {
        setV(init);
      }
    })();
  }, [user?.id, loadDraft]));

  // FFMI = masa libre de grasa / talla² (en vivo, no se persiste).
  const weight = num(v.weight_kg ?? '');
  const height = num(v.height_cm ?? '');
  const bodyFat = num(v.body_fat_pct ?? '');
  const ffmi =
    weight != null && height != null && bodyFat != null && height > 0
      ? (weight * (1 - bodyFat / 100)) / Math.pow(height / 100, 2)
      : undefined;

  // Ratio cintura/cadera (WHR) — marcador cardiovascular validado (Yusuf 2005, INTERHEART).
  // En vivo, no se persiste (se deriva de waist_cm/hip_cm).
  const waist = num(v.waist_cm ?? '');
  const hip = num(v.hip_cm ?? '');
  const whr = waist != null && hip != null && hip > 0 ? Math.round((waist / hip) * 100) / 100 : undefined;

  // Diff de peso vs lo pre-poblado.
  const prevWeight = num(snapshot.weight_kg ?? '');
  const weightDiff = weight != null && prevWeight != null && weight !== prevWeight
    ? Math.round((weight - prevWeight) * 10) / 10 : null;

  async function handleSave() {
    if (!user?.id) return;
    // Guardar SOLO campos modificados vs lo precargado — actualizar 1 valor no debe
    // reescribir el resto a ciegas (bug B6 del smoke 2026-06-11).
    const fields: Record<string, number> = {};
    for (const k of FIELD_KEYS) {
      const raw = v[k] ?? '';
      if (raw === (snapshot[k] ?? '') || raw.trim() === '') continue;
      // MB-27 menor 3: redondeo a 1 decimal ANTES de escribir — el
      // DECIMAL(5,1) truncaba en silencio y el delta salía de otro número.
      const crudo = k === 'visceral_fat' ? Math.round(Number(raw)) : num(raw);
      const n = crudo != null && Number.isFinite(crudo) ? Math.round(crudo * 10) / 10 : null;
      if (n == null) continue;
      // MB-27 menor 2-3: fuera de rango se rechaza con nombre, no se guarda
      // basura que luego "desaparece" ni un 22003 ilegible.
      const rango = RANGOS[k];
      if (n < rango.min || n > rango.max) {
        Alert.alert(
          'Revisa un valor',
          `${rango.label}: ${raw} está fuera del rango esperado (${rango.min} a ${rango.max}). Corrígelo y vuelve a guardar.`,
        );
        return;
      }
      fields[k] = n;
    }
    if (Object.keys(fields).length === 0) {
      Alert.alert('Sin cambios', 'Modifica al menos un valor para guardar.');
      return;
    }
    setSaving(true);
    const result = await saveHealthMeasurement(user.id, fields);
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
      return;
    }
    await clearDraft(); // ya está en DB: la recarga lo traerá, el borrador deja de hacer falta.
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
            {whr != null ? (
              <View style={styles.sumRow}>
                <EliteText variant="body" style={styles.sumLabel}>Ratio cintura/cadera</EliteText>
                <EliteText variant="body" style={styles.sumValue}>{whr}</EliteText>
              </View>
            ) : null}
            <Pressable onPress={() => { haptic.light(); setEditMode(true); }} style={styles.updateBtn}>
              <EliteText variant="body" style={styles.updateBtnText}>Actualizar mediciones</EliteText>
            </Pressable>
          </View>
        ) : (
        <View style={styles.card}>
          <NumberInputRow label="Peso" unit="kg" badge={prefilled.weight_kg ? badge ?? 'Salud' : undefined} value={v.weight_kg ?? ''} onChangeText={(x) => set('weight_kg', x)} highlight={focus === 'weight_kg'} autoFocus={focus === 'weight_kg'} />
          {weightDiff != null ? (
            <EliteText variant="caption" style={styles.diff}>
              {weightDiff > 0 ? '+' : ''}{weightDiff} kg desde la última
            </EliteText>
          ) : null}
          <NumberInputRow label="Altura" unit="cm" badge={prefilled.height_cm ? badge ?? 'Salud' : undefined} value={v.height_cm ?? ''} onChangeText={(x) => set('height_cm', x)} />
          <NumberInputRow label="% Grasa corporal" unit="%" badge={prefilled.body_fat_pct ? badge ?? 'Salud' : undefined} value={v.body_fat_pct ?? ''} onChangeText={(x) => set('body_fat_pct', x)} highlight={focus === 'body_fat_pct'} autoFocus={focus === 'body_fat_pct'} />
          <NumberInputRow label="Masa muscular" unit="kg" badge={prefilled.muscle_mass_kg ? badge ?? 'Salud' : undefined} value={v.muscle_mass_kg ?? ''} onChangeText={(x) => set('muscle_mass_kg', x)} helper="Reportada por báscula inteligente" />
          <NumberInputRow label="Grasa visceral" badge={prefilled.visceral_fat ? badge ?? 'Salud' : undefined} value={v.visceral_fat ?? ''} onChangeText={(x) => set('visceral_fat', x)} helper="Índice típico 1–30" />
          <NumberInputRow label="Fuerza de agarre" unit="kg" badge={prefilled.grip_strength_kg ? badge ?? 'Salud' : undefined} value={v.grip_strength_kg ?? ''} onChangeText={(x) => set('grip_strength_kg', x)} helper="Dinamómetro Camry EH101 (~$25)" highlight={focus === 'grip_strength_kg'} autoFocus={focus === 'grip_strength_kg'} />
          <NumberInputRow label="Cintura" unit="cm" badge={prefilled.waist_cm ? badge ?? 'Salud' : undefined} value={v.waist_cm ?? ''} onChangeText={(x) => set('waist_cm', x)} helper="A la altura del ombligo, sin apretar" highlight={focus === 'waist_cm'} autoFocus={focus === 'waist_cm'} />
          <NumberInputRow label="Cadera" unit="cm" badge={prefilled.hip_cm ? badge ?? 'Salud' : undefined} value={v.hip_cm ?? ''} onChangeText={(x) => set('hip_cm', x)} helper="En la parte más ancha de los glúteos" />
          <NumberInputRow label="Brazo" unit="cm" badge={prefilled.arm_cm ? badge ?? 'Salud' : undefined} value={v.arm_cm ?? ''} onChangeText={(x) => set('arm_cm', x)} helper="Relajado, en la parte más ancha" />
          <NumberInputRow label="Pierna" unit="cm" badge={prefilled.leg_cm ? badge ?? 'Salud' : undefined} value={v.leg_cm ?? ''} onChangeText={(x) => set('leg_cm', x)} helper="Muslo, en la parte más ancha" />
          <NumberInputRow label="Pecho" unit="cm" badge={prefilled.chest_cm ? badge ?? 'Salud' : undefined} value={v.chest_cm ?? ''} onChangeText={(x) => set('chest_cm', x)} helper="A la altura de los pezones, sin inflar" />
          <NumberInputRow label="Ratio cintura/cadera" value={whr != null ? String(whr) : ''} readOnly placeholder="auto" helper="Marcador cardiovascular" />
          <NumberInputRow label="Tu FFMI" value={ffmi != null ? (Math.round(ffmi * 10) / 10).toString() : ''} readOnly placeholder="auto" />
        </View>
        )}

        <EliteText variant="caption" style={styles.note}>
          Pesa por la mañana en ayunas, sin ropa. Se guarda en tu expediente de Salud (no se duplica).
        </EliteText>

        {(!hasData || editMode) && (
          <GradientCTA label={saving ? 'GUARDANDO…' : 'GUARDAR'} onPress={handleSave} disabled={saving} style={styles.saveBtn} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  diff: { color: SEMANTIC.success, fontSize: FontSizes.xs, textAlign: 'right', marginTop: -4, marginBottom: 2 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  sumLabel: { color: Colors.textSecondary },
  sumValue: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  updateBtn: { marginTop: Spacing.sm, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)', borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  updateBtnText: { color: TEXT.secondary, fontFamily: Fonts.semiBold },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
  saveBtn: { marginTop: Spacing.sm },
});
