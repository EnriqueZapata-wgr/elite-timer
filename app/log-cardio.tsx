/**
 * Log Cardio — Registrar una sesion de cardio:
 *   - Disciplina (running/cycling/swimming/rowing)
 *   - Distancia + duracion → pace automatico
 *   - FC promedio (opcional) + RPE + notas
 *   - Detecta y celebra PRs automaticos
 */
import { useState, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, CARD, BG } from '@/src/constants/brand';
import {
  logCardioSession,
  formatPace,
  type CardioDiscipline,
} from '@/src/services/fitness-service';

const LIME = CATEGORY_COLORS.fitness;

const DISCIPLINES: { key: CardioDiscipline; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'running',  name: 'Correr',   icon: 'walk-outline' },
  { key: 'cycling',  name: 'Ciclismo', icon: 'bicycle-outline' },
  { key: 'swimming', name: 'Natación', icon: 'water-outline' },
  { key: 'rowing',   name: 'Remo',     icon: 'boat-outline' },
];

export default function LogCardioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ discipline?: string }>();
  const initialDiscipline = (DISCIPLINES.find(d => d.key === params.discipline)?.key ?? 'running') as CardioDiscipline;

  const [discipline, setDiscipline] = useState<CardioDiscipline>(initialDiscipline);
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<'km' | 'm'>('km');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [hr, setHr] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Calcular metros y segundos totales
  const distanceMeters = useMemo(() => {
    const num = parseFloat(distance.replace(',', '.'));
    if (isNaN(num) || num <= 0) return 0;
    return unit === 'km' ? num * 1000 : num;
  }, [distance, unit]);

  const totalSeconds = useMemo(() => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const sec = parseInt(seconds, 10) || 0;
    return h * 3600 + m * 60 + sec;
  }, [hours, minutes, seconds]);

  const paceText = useMemo(() => {
    if (distanceMeters <= 0 || totalSeconds <= 0) return null;
    const paceSecPerKm = Math.round(totalSeconds / (distanceMeters / 1000));
    return formatPace(paceSecPerKm);
  }, [distanceMeters, totalSeconds]);

  const handleSave = async () => {
    if (distanceMeters <= 0) {
      Alert.alert('Distancia requerida', 'Ingresa la distancia de la sesión.');
      return;
    }
    if (totalSeconds <= 0) {
      Alert.alert('Duración requerida', 'Ingresa la duración de la sesión.');
      return;
    }

    try {
      setSaving(true);
      const result = await logCardioSession({
        discipline,
        distance_meters: distanceMeters,
        duration_seconds: totalSeconds,
        avg_heart_rate: hr ? parseInt(hr, 10) : null,
        perceived_effort: rpe,
        notes: notes || null,
      });

      haptic.success();

      if (result.newPRs.length > 0) {
        const prMsg = result.newPRs
          .map(pr => `${pr.distance_label}: ${formatTime(pr.time_seconds)}`)
          .join('\n');
        Alert.alert(
          '¡Nuevo PR!',
          `Rompiste tu marca personal:\n\n${prMsg}`,
          [{ text: 'Genial', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Guardado', 'Sesión registrada correctamente.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo guardar la sesión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.screen}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Registrar Cardio" />

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Disciplina */}
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <EliteText style={s.label}>DISCIPLINA</EliteText>
            <View style={s.disciplineRow}>
              {DISCIPLINES.map(d => {
                const active = d.key === discipline;
                return (
                  <AnimatedPressable
                    key={d.key}
                    onPress={() => { haptic.light(); setDiscipline(d.key); }}
                    style={[s.disciplineBtn, active && s.disciplineBtnActive]}
                  >
                    <Ionicons name={d.icon} size={20} color={active ? '#000' : LIME} />
                    <EliteText style={[s.disciplineBtnText, active && s.disciplineBtnTextActive]}>
                      {d.name}
                    </EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Distancia */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <EliteText style={s.label}>DISTANCIA</EliteText>
            <View style={s.row}>
              <TextInput
                style={[s.input, { flex: 2 }]}
                value={distance}
                onChangeText={setDistance}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.disabled}
              />
              <View style={s.unitRow}>
                {(['km', 'm'] as const).map(u => (
                  <AnimatedPressable
                    key={u}
                    style={[s.unitBtn, unit === u && s.unitBtnActive]}
                    onPress={() => { haptic.light(); setUnit(u); }}
                  >
                    <EliteText style={[s.unitText, unit === u && s.unitTextActive]}>{u.toUpperCase()}</EliteText>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Duración */}
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            <EliteText style={s.label}>DURACIÓN</EliteText>
            <View style={s.timeRow}>
              <View style={s.timeInputBox}>
                <TextInput
                  style={s.timeInput}
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="number-pad"
                  placeholder="00"
                  placeholderTextColor={Colors.disabled}
                  maxLength={2}
                />
                <EliteText style={s.timeLabel}>HRS</EliteText>
              </View>
              <EliteText style={s.timeColon}>:</EliteText>
              <View style={s.timeInputBox}>
                <TextInput
                  style={s.timeInput}
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                  placeholder="00"
                  placeholderTextColor={Colors.disabled}
                  maxLength={2}
                />
                <EliteText style={s.timeLabel}>MIN</EliteText>
              </View>
              <EliteText style={s.timeColon}>:</EliteText>
              <View style={s.timeInputBox}>
                <TextInput
                  style={s.timeInput}
                  value={seconds}
                  onChangeText={setSeconds}
                  keyboardType="number-pad"
                  placeholder="00"
                  placeholderTextColor={Colors.disabled}
                  maxLength={2}
                />
                <EliteText style={s.timeLabel}>SEG</EliteText>
              </View>
            </View>
          </Animated.View>

          {/* Pace calculado */}
          {paceText && (
            <Animated.View entering={FadeInUp.springify()} style={s.paceCard}>
              <Ionicons name="speedometer-outline" size={20} color={LIME} />
              <EliteText style={s.paceText}>PACE CALCULADO: {paceText}</EliteText>
            </Animated.View>
          )}

          {/* FC promedio */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <EliteText style={s.label}>FC PROMEDIO (opcional)</EliteText>
            <View style={s.row}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={hr}
                onChangeText={setHr}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={Colors.disabled}
                maxLength={3}
              />
              <EliteText style={s.unitSuffix}>BPM</EliteText>
            </View>
          </Animated.View>

          {/* RPE */}
          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <EliteText style={s.label}>ESFUERZO PERCIBIDO (RPE)</EliteText>
            <View style={s.rpeRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                <AnimatedPressable
                  key={v}
                  onPress={() => { haptic.light(); setRpe(rpe === v ? null : v); }}
                  style={[s.rpeBtn, rpe === v && s.rpeBtnActive]}
                >
                  <EliteText style={[s.rpeText, rpe === v && s.rpeTextActive]}>{v}</EliteText>
                </AnimatedPressable>
              ))}
            </View>
            {rpe != null && (
              <EliteText style={s.rpeHint}>{rpeLabel(rpe)}</EliteText>
            )}
          </Animated.View>

          {/* Notas */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <EliteText style={s.label}>NOTAS</EliteText>
            <TextInput
              style={[s.input, s.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="¿Como te sentiste?"
              placeholderTextColor={Colors.disabled}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Botón guardar */}
        <View style={s.footer}>
          <AnimatedPressable
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <EliteText style={s.saveBtnText}>
              {saving ? 'GUARDANDO…' : 'GUARDAR SESIÓN'}
            </EliteText>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// === HELPERS ===

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function rpeLabel(rpe: number): string {
  if (rpe <= 2) return 'Muy ligero — recuperación activa';
  if (rpe <= 4) return 'Ligero — calentamiento, easy run';
  if (rpe <= 6) return 'Moderado — zona aeróbica';
  if (rpe <= 7) return 'Algo duro — tempo';
  if (rpe <= 8) return 'Duro — umbral';
  if (rpe <= 9) return 'Muy duro — VO2 max';
  return 'Máximo — esfuerzo absoluto';
}

// === ESTILOS ===

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG.screen },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  label: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  // Disciplinas
  disciplineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  disciplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: CARD.bg,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  disciplineBtnActive: {
    backgroundColor: LIME,
    borderColor: LIME,
  },
  disciplineBtnText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  disciplineBtnTextActive: { color: '#000' },

  // Inputs comunes
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: CARD.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: CARD.bg,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  unitBtnActive: {
    backgroundColor: LIME,
    borderColor: LIME,
  },
  unitText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
  },
  unitTextActive: { color: '#000' },
  unitSuffix: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },

  // Tiempo
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timeInputBox: {
    alignItems: 'center',
    gap: 4,
  },
  timeInput: {
    width: 64,
    height: 56,
    backgroundColor: CARD.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xxl,
    textAlign: 'center',
  },
  timeLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  timeColon: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    paddingBottom: 16,
  },

  // Pace card
  paceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(168,224,42,0.08)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  paceText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: LIME,
    letterSpacing: 1,
  },

  // RPE
  rpeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rpeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CARD.bg,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeBtnActive: {
    backgroundColor: LIME,
    borderColor: LIME,
  },
  rpeText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
  },
  rpeTextActive: { color: '#000' },
  rpeHint: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },

  notesInput: {
    minHeight: 64,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    paddingTop: Spacing.sm,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: '#1a1a1a',
    backgroundColor: BG.screen,
  },
  saveBtn: {
    backgroundColor: LIME,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 2,
  },
});
