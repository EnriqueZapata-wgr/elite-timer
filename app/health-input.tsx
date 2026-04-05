/**
 * Health Input — Formulario de evaluación de salud con secciones colapsables.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { useAuth } from '@/src/contexts/auth-context';
import {
  getLatestMeasurement, saveMeasurement, countCompleteSections,
  type HealthMeasurement,
} from '@/src/services/health-measurement-service';
import { calculateAndSaveScore } from '@/src/services/health-score-service';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';

const TEAL = CATEGORY_COLORS.metrics;

// === TIPOS ===

interface SectionDef {
  key: string;
  label: string;
  icon: string;
  fields: FieldDef[];
  helper?: string;
}

interface FieldDef {
  key: keyof HealthMeasurement;
  label: string;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  isSlider?: boolean;
}

// === DEFINICIÓN DE SECCIONES ===

const SECTIONS: SectionDef[] = [
  {
    key: 'body', label: 'COMPOSICIÓN CORPORAL', icon: 'body-outline',
    helper: 'Si tienes báscula de bioimpedancia, usa esos valores.',
    fields: [
      { key: 'weight_kg', label: 'Peso', unit: 'kg', step: 0.1, min: 30, max: 250 },
      { key: 'height_cm', label: 'Altura', unit: 'cm', step: 1, min: 100, max: 230 },
      { key: 'body_fat_pct', label: '% Grasa corporal', unit: '%', step: 0.1, min: 3, max: 60 },
      { key: 'muscle_mass_kg', label: 'Masa muscular', unit: 'kg', step: 0.1, min: 10, max: 100 },
      { key: 'visceral_fat', label: 'Grasa visceral', unit: '', step: 1, min: 1, max: 59 },
    ],
  },
  {
    key: 'measures', label: 'MEDIDAS CORPORALES', icon: 'resize-outline',
    fields: [
      { key: 'waist_cm', label: 'Cintura', unit: 'cm', step: 0.5, min: 40, max: 180 },
      { key: 'hip_cm', label: 'Cadera', unit: 'cm', step: 0.5, min: 50, max: 180 },
      { key: 'neck_cm', label: 'Cuello', unit: 'cm', step: 0.5, min: 25, max: 60 },
    ],
  },
  {
    key: 'cardio', label: 'CARDIOVASCULAR', icon: 'heart-outline',
    helper: 'Mide después de 5 min sentado, en reposo, sin café reciente.',
    fields: [
      { key: 'systolic_bp', label: 'Presión sistólica', unit: 'mmHg', step: 1, min: 70, max: 250 },
      { key: 'diastolic_bp', label: 'Presión diastólica', unit: 'mmHg', step: 1, min: 40, max: 150 },
      { key: 'resting_hr', label: 'FC en reposo', unit: 'bpm', step: 1, min: 30, max: 200 },
    ],
  },
  {
    key: 'grip', label: 'FUERZA DE AGARRE', icon: 'hand-left-outline',
    helper: 'Usa un dinamómetro. La fuerza de agarre es uno de los mejores predictores de longevidad.',
    fields: [
      { key: 'grip_strength_kg', label: 'Fuerza de agarre', unit: 'kg', step: 0.5, min: 5, max: 100 },
    ],
  },
  {
    key: 'wellbeing', label: 'ENERGÍA Y BIENESTAR', icon: 'sparkles-outline',
    fields: [
      { key: 'energy_level', label: 'Energía general', unit: '/10', isSlider: true, min: 1, max: 10 },
      { key: 'sleep_quality', label: 'Calidad de sueño', unit: '/10', isSlider: true, min: 1, max: 10 },
      { key: 'stress_level', label: 'Nivel de estrés', unit: '/10', isSlider: true, min: 1, max: 10 },
      { key: 'mood_level', label: 'Estado de ánimo', unit: '/10', isSlider: true, min: 1, max: 10 },
    ],
  },
  {
    key: 'sleep', label: 'SUEÑO', icon: 'moon-outline',
    fields: [
      { key: 'sleep_hours', label: 'Horas de sueño promedio', unit: 'hrs', step: 0.5, min: 2, max: 14 },
    ],
  },
  {
    key: 'activity', label: 'ACTIVIDAD FÍSICA', icon: 'fitness-outline',
    fields: [
      { key: 'steps_daily', label: 'Pasos diarios promedio', unit: 'pasos', step: 500, min: 0, max: 40000 },
      { key: 'exercise_min_weekly', label: 'Min ejercicio / semana', unit: 'min', step: 10, min: 0, max: 1000 },
      { key: 'vo2max_estimate', label: 'VO2max estimado', unit: 'ml/kg/min', step: 0.5, min: 15, max: 80 },
    ],
  },
];

// === COMPONENTE ===

export default function HealthInputScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [data, setData] = useState<Partial<HealthMeasurement>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('body');
  const [lastDate, setLastDate] = useState<string | null>(null);

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const m = await getLatestMeasurement(userId);
      if (m) {
        setData(m);
        setLastDate(m.date);
      }
    } catch { /* */ }
    setLoading(false);
  };

  const updateField = (key: keyof HealthMeasurement, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    setData(prev => ({ ...prev, [key]: num }));
  };

  const handleSave = async () => {
    haptic.medium();
    setSaving(true);
    try {
      await saveMeasurement(userId, data);
      // Recalcular scores
      try { await calculateAndSaveScore(userId); } catch { /* */ }
      haptic.success();
      Alert.alert('Guardado', 'Tus datos se han guardado y tus scores actualizados.', [
        { text: 'Ver scores', onPress: () => router.push('/my-health' as any) },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      haptic.error();
      Alert.alert('Error', err.message || 'No se pudo guardar');
    }
    setSaving(false);
  };

  const toggleSection = (key: string) => {
    haptic.light();
    setExpanded(prev => prev === key ? null : key);
  };

  const { complete, total } = countCompleteSections(data as HealthMeasurement);
  const progressPct = Math.round((complete / total) * 100);

  const sliderColor = (val: number | null, key: string) => {
    if (!val) return TEXT_COLORS.muted;
    if (key === 'stress_level') {
      // Invertido — menos estrés es mejor
      return val <= 3 ? SEMANTIC.success : val <= 6 ? SEMANTIC.warning : SEMANTIC.error;
    }
    return val >= 7 ? SEMANTIC.success : val >= 4 ? SEMANTIC.warning : SEMANTIC.error;
  };

  const bpColor = () => {
    const s = data.systolic_bp;
    const d = data.diastolic_bp;
    if (!s || !d) return null;
    if (s < 120 && d < 80) return SEMANTIC.success;
    if (s < 140 && d < 90) return SEMANTIC.warning;
    return SEMANTIC.error;
  };

  return (
    <SafeAreaView style={st.screen}>
      <PillarHeader pillar="metrics" title="Evaluación" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        {/* Progreso */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={st.progressCard}>
            <View style={st.progressHeader}>
              <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.bold, fontSize: FontSizes.xs }}>
                {complete}/{total} secciones completas
              </EliteText>
              <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.bold, fontSize: FontSizes.sm }}>
                {progressPct}%
              </EliteText>
            </View>
            <View style={st.progressBar}>
              <View style={[st.progressFill, { width: `${progressPct}%` }]} />
            </View>
            {lastDate && (
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: 4 }}>
                Última actualización: {new Date(lastDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
              </EliteText>
            )}
          </View>
        </Animated.View>

        {/* Secciones */}
        {SECTIONS.map((section, sIdx) => {
          const isOpen = expanded === section.key;
          const hasSomeData = section.fields.some(f => (data as any)[f.key] != null);
          return (
            <Animated.View key={section.key} entering={FadeInUp.delay(100 + sIdx * 50).springify()}>
              <Pressable onPress={() => toggleSection(section.key)} style={st.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                  <Ionicons name={section.icon as any} size={18} color={TEAL} />
                  <EliteText variant="caption" style={st.sectionLabel}>{section.label}</EliteText>
                </View>
                {hasSomeData && <Ionicons name="checkmark-circle" size={16} color={SEMANTIC.success} />}
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT_COLORS.muted} />
              </Pressable>

              {isOpen && (
                <View style={st.sectionBody}>
                  {section.helper && (
                    <EliteText variant="caption" style={st.helperText}>{section.helper}</EliteText>
                  )}
                  {section.fields.map(field => (
                    <View key={field.key as string} style={st.fieldRow}>
                      <EliteText variant="body" style={st.fieldLabel}>{field.label}</EliteText>
                      {field.isSlider ? (
                        <View style={st.sliderRow}>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => {
                            const isActive = (data as any)[field.key] === v;
                            const dotColor = sliderColor(v, field.key as string);
                            return (
                              <Pressable
                                key={v}
                                onPress={() => { haptic.light(); updateField(field.key, v.toString()); }}
                                style={[st.sliderDot, isActive && { backgroundColor: dotColor, borderColor: dotColor }]}
                              >
                                {isActive && <EliteText style={{ color: Colors.black, fontSize: 9, fontFamily: Fonts.bold }}>{v}</EliteText>}
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={st.inputRow}>
                          <TextInput
                            style={st.input}
                            value={(data as any)[field.key]?.toString() ?? ''}
                            onChangeText={(v) => updateField(field.key, v)}
                            keyboardType="decimal-pad"
                            placeholder="—"
                            placeholderTextColor={TEXT_COLORS.muted}
                          />
                          <EliteText variant="caption" style={st.unitText}>{field.unit}</EliteText>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Indicador PA */}
                  {section.key === 'cardio' && bpColor() && (
                    <View style={[st.indicator, { backgroundColor: withOpacity(bpColor()!, 0.12) }]}>
                      <Ionicons name={bpColor() === SEMANTIC.success ? 'checkmark-circle' : 'alert-circle'} size={16} color={bpColor()!} />
                      <EliteText variant="caption" style={{ color: bpColor()!, fontSize: FontSizes.xs }}>
                        {bpColor() === SEMANTIC.success ? 'PA óptima' : bpColor() === SEMANTIC.warning ? 'PA elevada' : 'PA alta — consulta médico'}
                      </EliteText>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          );
        })}

        {/* Botón guardar */}
        <AnimatedPressable onPress={handleSave} disabled={saving} style={st.saveBtn}>
          <Ionicons name="save-outline" size={20} color={Colors.black} />
          <EliteText style={st.saveBtnText}>{saving ? 'Guardando...' : 'Guardar evaluación'}</EliteText>
        </AnimatedPressable>

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// === ESTILOS ===

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
  title: { fontSize: FontSizes.hero, fontFamily: Fonts.extraBold, color: TEAL, letterSpacing: 3 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },

  // Progreso
  progressCard: { backgroundColor: withOpacity(TEAL, 0.08), borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: withOpacity(TEAL, 0.2) },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressBar: { height: 4, backgroundColor: SURFACES.cardLight, borderRadius: Radius.xs, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: TEAL, borderRadius: Radius.xs },

  // Secciones
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: SURFACES.border,
  },
  sectionLabel: { color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1, flex: 1 },
  sectionBody: { paddingVertical: Spacing.sm, gap: Spacing.sm },
  helperText: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, fontStyle: 'italic', marginBottom: Spacing.xs },

  // Fields
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  fieldLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.md, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  input: {
    backgroundColor: SURFACES.card, borderRadius: Radius.sm, borderWidth: 0.5, borderColor: SURFACES.border,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, color: TEXT_COLORS.primary,
    fontFamily: Fonts.semiBold, fontSize: FontSizes.md, width: 80, textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  unitText: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, width: 45 },

  // Slider dots
  sliderRow: { flexDirection: 'row', gap: 4 },
  sliderDot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    borderColor: SURFACES.border, alignItems: 'center', justifyContent: 'center',
  },

  // Indicador
  indicator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm },

  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: TEAL, borderRadius: Radius.card, paddingVertical: Spacing.md, marginTop: Spacing.lg,
  },
  saveBtnText: { color: Colors.black, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
});
