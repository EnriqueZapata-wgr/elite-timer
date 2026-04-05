/**
 * Ciclo Menstrual — Tracking de fases, síntomas, suplementos y labs.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { useAuth } from '@/src/contexts/auth-context';
import { getCycleInfo, startPeriod, endPeriod, logSymptoms, getTodaySymptoms, PHASES, type PhaseInfo } from '@/src/services/cycle-service';
import { CycleCalendar, CycleLineChart } from '@/src/components/cycle/CycleCalendar';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';

const PINK = '#D4537E';

// ═══ SUB-COMPONENTES ═══

function InfoRow({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Ionicons name={icon as any} size={14} color={color} style={{ marginTop: 2 }} />
      <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, flex: 1, lineHeight: 18 }}>{text}</EliteText>
    </View>
  );
}

function SymptomSlider({ label, value, onChange, inverted }: { label: string; value: number | null; onChange: (v: number) => void; inverted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
      <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, width: 90 }}>{label}</EliteText>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => {
          const active = value === v;
          const color = inverted
            ? (v <= 3 ? SEMANTIC.success : v <= 6 ? SEMANTIC.warning : SEMANTIC.error)
            : (v <= 3 ? SEMANTIC.error : v <= 6 ? SEMANTIC.warning : SEMANTIC.success);
          return (
            <Pressable key={v} onPress={() => { haptic.light(); onChange(v); }}
              style={[s.dot, active && { backgroundColor: color, borderColor: color }]}>
              {active && <EliteText style={{ color: '#000', fontSize: 8, fontFamily: Fonts.bold }}>{v}</EliteText>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ═══ PANTALLA PRINCIPAL ═══

export default function CycleScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [manualDay, setManualDay] = useState('');
  const [manualMonth, setManualMonth] = useState('');
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getCycleInfo>>>(null);
  const [symptoms, setSymptoms] = useState<Record<string, number | null>>({
    energy: null, mood: null, cramps: null, bloating: null, anxiety: null, sleep: null,
  });
  const [saving, setSaving] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cycleData, todaySyms] = await Promise.all([
        getCycleInfo(userId),
        getTodaySymptoms(userId),
      ]);
      setInfo(cycleData);
      if (todaySyms) {
        setSymptoms({
          energy: todaySyms.energy ?? null,
          mood: todaySyms.mood ?? null,
          cramps: todaySyms.cramps ?? null,
          bloating: todaySyms.bloating ?? null,
          anxiety: todaySyms.anxiety ?? null,
          sleep: todaySyms.sleep ?? null,
        });
      }
    } catch { /* silencioso */ }
    setLoading(false);
  };

  const handleStartPeriod = () => {
    if (!userId) return;
    haptic.medium();
    setManualDay('');
    setManualMonth('');
    setShowDatePicker(true);
  };

  const confirmStartPeriod = async (date: Date) => {
    setShowDatePicker(false);
    const dateStr = date.toISOString().split('T')[0];
    await startPeriod(userId, dateStr);
    haptic.success();
    loadData();
  };

  const confirmManualDate = () => {
    const d = parseInt(manualDay, 10);
    const m = parseInt(manualMonth, 10);
    if (!d || !m || d < 1 || d > 31 || m < 1 || m > 12) {
      Alert.alert('Fecha inválida', 'Ingresa día y mes válidos.');
      return;
    }
    const now = new Date();
    const date = new Date(now.getFullYear(), m - 1, d);
    // Si la fecha es en el futuro, usar el año anterior
    if (date > now) date.setFullYear(date.getFullYear() - 1);
    confirmStartPeriod(date);
  };

  const handleEndPeriod = async () => {
    if (!userId) return;
    haptic.medium();
    await endPeriod(userId);
    loadData();
  };

  const handleSaveSymptoms = async () => {
    if (!userId) return;
    haptic.medium();
    setSaving(true);
    try {
      await logSymptoms(userId, symptoms);
      haptic.success();
      Alert.alert('Guardado', 'Síntomas registrados.');
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los síntomas.');
    }
    setSaving(false);
  };

  const updateSymptom = (key: string) => (v: number) => {
    setSymptoms(prev => ({ ...prev, [key]: v }));
  };

  // ═══ LOADING ═══

  if (loading) {
    return (
      <SafeAreaView style={s.screen}>
        <PillarHeader pillar="cycle" title="Ciclo" />
        <View style={{ padding: Spacing.md }}>
          <SkeletonLoader width="100%" height={140} style={{ borderRadius: Radius.card }} />
        </View>
      </SafeAreaView>
    );
  }

  // ═══ EMPTY STATE ═══

  if (!info) {
    return (
      <SafeAreaView style={s.screen}>
        <PillarHeader pillar="cycle" title="Ciclo" />
        <EmptyState
          icon="water-outline"
          title="Tracking de ciclo menstrual"
          subtitle="Registra tu ciclo para recibir recomendaciones de ejercicio, nutrición y labs ajustadas a tu fase."
          actionLabel="Empezó mi período"
          onAction={handleStartPeriod}
          color={PINK}
        />
      </SafeAreaView>
    );
  }

  // ═══ DATOS ACTIVOS ═══

  const phase: PhaseInfo = info.phaseInfo;

  return (
    <SafeAreaView style={s.screen}>
      <PillarHeader pillar="cycle" title="Ciclo" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl * 2 }}>

        {/* 1. Phase hero card */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={[s.phaseCard, { borderLeftColor: phase.color }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>DÍA {info.currentDay} DE {info.cycleLen}</EliteText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Ionicons name={phase.icon as any} size={20} color={phase.color} />
                  <EliteText style={{ color: phase.color, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>Fase {phase.label.toLowerCase()}</EliteText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>Próximo período</EliteText>
                <EliteText style={{ color: PINK, fontFamily: Fonts.bold, fontSize: FontSizes.lg }}>~{info.prediction.daysUntil} días</EliteText>
              </View>
            </View>
            <View style={s.cycleBar}>
              <View style={[s.cycleBarFill, { width: `${Math.min(100, (info.currentDay / info.cycleLen) * 100)}%`, backgroundColor: phase.color }]} />
            </View>
            <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginTop: 8, lineHeight: 18 }}>{phase.description}</EliteText>
          </View>
        </Animated.View>

        {/* 2. Tu cuerpo hoy */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={s.card}>
            <EliteText style={s.cardLabel}>TU CUERPO HOY</EliteText>
            <View style={{ gap: 6 }}>
              <InfoRow icon="flash-outline" color={phase.color} text={phase.energy} />
              <InfoRow icon="barbell-outline" color={phase.color} text={phase.exercise} />
            </View>
          </View>
        </Animated.View>

        {/* 3. Síntomas */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <View style={s.card}>
            <EliteText style={s.cardLabel}>SÍNTOMAS HOY</EliteText>
            <SymptomSlider label="Energía" value={symptoms.energy} onChange={updateSymptom('energy')} />
            <SymptomSlider label="Ánimo" value={symptoms.mood} onChange={updateSymptom('mood')} />
            <SymptomSlider label="Cólicos" value={symptoms.cramps} onChange={updateSymptom('cramps')} inverted />
            <SymptomSlider label="Hinchazón" value={symptoms.bloating} onChange={updateSymptom('bloating')} inverted />
            <SymptomSlider label="Ansiedad" value={symptoms.anxiety} onChange={updateSymptom('anxiety')} inverted />
            <SymptomSlider label="Sueño" value={symptoms.sleep} onChange={updateSymptom('sleep')} />
            <AnimatedPressable onPress={handleSaveSymptoms} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
              <Ionicons name="save-outline" size={16} color="#000" />
              <EliteText style={{ color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.sm }}>{saving ? 'Guardando...' : 'Guardar síntomas'}</EliteText>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* 4. Suplementos */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={s.card}>
            <EliteText style={s.cardLabel}>SUPLEMENTOS FASE {phase.label.toUpperCase()}</EliteText>
            {phase.supplements.map((sup, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: phase.color }} />
                <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm }}>{sup}</EliteText>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* 5. Nutrición */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <View style={s.card}>
            <EliteText style={s.cardLabel}>NUTRICIÓN FASE {phase.label.toUpperCase()}</EliteText>
            {phase.nutrition.map((tip, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: phase.color }} />
                <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm }}>{tip}</EliteText>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* 6. Labs */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <View style={s.card}>
            <EliteText style={s.cardLabel}>LABS EN ESTA FASE</EliteText>
            {phase.labsBest.length > 0 && (
              <>
                <EliteText style={{ color: SEMANTIC.success, fontSize: FontSizes.xs, marginTop: 4 }}>Mejor momento para:</EliteText>
                {phase.labsBest.map((l, i) => <EliteText key={i} style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>  {'\u2022'} {l}</EliteText>)}
              </>
            )}
            {phase.labsAvoid.length > 0 && (
              <>
                <EliteText style={{ color: SEMANTIC.warning, fontSize: FontSizes.xs, marginTop: 8 }}>Evitar medir:</EliteText>
                {phase.labsAvoid.map((l, i) => <EliteText key={i} style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>  {'\u2022'} {l}</EliteText>)}
              </>
            )}
          </View>
        </Animated.View>

        {/* 7. Calendario visual */}
        <Animated.View entering={FadeInUp.delay(340).springify()}>
          <EliteText style={s.cardLabel}>CALENDARIO</EliteText>
          <CycleCalendar
            periods={info.periods}
            cycleLength={info.cycleLen}
            periodLength={info.periodLen}
          />
        </Animated.View>

        {/* 8. Botones de período */}
        <Animated.View entering={FadeInUp.delay(350).springify()}>
          <View style={s.periodSection}>
            {info.isOnPeriod ? (
              <AnimatedPressable onPress={handleEndPeriod} style={[s.periodBtn, { borderColor: TEXT_COLORS.muted }]}>
                <EliteText style={{ color: TEXT_COLORS.secondary, fontFamily: Fonts.semiBold }}>Terminó mi período</EliteText>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable onPress={handleStartPeriod} style={[s.periodBtn, { borderColor: PINK }]}>
                <Ionicons name="water" size={16} color={PINK} />
                <EliteText style={{ color: PINK, fontFamily: Fonts.semiBold }}>Empezó mi período</EliteText>
              </AnimatedPressable>
            )}
          </View>
        </Animated.View>

      </ScrollView>

      {/* ── Modal para seleccionar fecha de inicio ── */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <Pressable style={s.dateOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={s.dateModal} onPress={() => {}}>
            <EliteText style={s.dateModalTitle}>¿Cuándo empezó tu período?</EliteText>

            {/* Opciones rápidas */}
            <View style={s.dateQuickRow}>
              <AnimatedPressable style={s.dateQuickBtn} onPress={() => confirmStartPeriod(new Date())}>
                <EliteText style={s.dateQuickText}>Hoy</EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.dateQuickBtn} onPress={() => {
                const y = new Date(); y.setDate(y.getDate() - 1); confirmStartPeriod(y);
              }}>
                <EliteText style={s.dateQuickText}>Ayer</EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.dateQuickBtn} onPress={() => {
                const d = new Date(); d.setDate(d.getDate() - 2); confirmStartPeriod(d);
              }}>
                <EliteText style={s.dateQuickText}>Antier</EliteText>
              </AnimatedPressable>
            </View>

            {/* Fecha manual */}
            <EliteText style={s.dateManualLabel}>O ingresa la fecha:</EliteText>
            <View style={s.dateManualRow}>
              <TextInput
                style={s.dateManualInput}
                placeholder="DD"
                placeholderTextColor="#444"
                keyboardType="number-pad"
                maxLength={2}
                value={manualDay}
                onChangeText={setManualDay}
              />
              <EliteText style={{ color: '#444', fontSize: 18 }}>/</EliteText>
              <TextInput
                style={s.dateManualInput}
                placeholder="MM"
                placeholderTextColor="#444"
                keyboardType="number-pad"
                maxLength={2}
                value={manualMonth}
                onChangeText={setManualMonth}
              />
            </View>

            <AnimatedPressable
              style={[s.dateConfirmBtn, (!manualDay || !manualMonth) && { opacity: 0.4 }]}
              onPress={confirmManualDate}
              disabled={!manualDay || !manualMonth}
            >
              <EliteText style={s.dateConfirmText}>Confirmar fecha</EliteText>
            </AnimatedPressable>

            <AnimatedPressable onPress={() => setShowDatePicker(false)} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <EliteText style={{ color: '#888', fontSize: FontSizes.sm }}>Cancelar</EliteText>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ═══ ESTILOS ═══

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  phaseCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.lg,
    borderLeftWidth: 3,
  },
  card: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  cardLabel: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 1, marginBottom: Spacing.sm,
  },
  cycleBar: {
    height: 6, backgroundColor: SURFACES.cardLight, borderRadius: Radius.xs,
    overflow: 'hidden', marginTop: Spacing.sm,
  },
  cycleBarFill: { height: '100%', borderRadius: Radius.xs },
  dot: {
    width: 24, height: 24, borderRadius: Radius.card, borderWidth: 1.5,
    borderColor: SURFACES.border, alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PINK, borderRadius: Radius.card, paddingVertical: Spacing.sm, marginTop: Spacing.md,
  },
  periodSection: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: Spacing.md, borderRadius: Radius.card, borderWidth: 1,
  },
  setupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PINK, borderRadius: Radius.card, paddingVertical: Spacing.md,
  },

  // ── Date picker modal ──
  dateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  dateModal: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
  },
  dateModalTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  dateQuickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  dateQuickBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PINK + '40',
  },
  dateQuickText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: PINK,
  },
  dateManualLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#888',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  dateManualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  dateManualInput: {
    width: 60,
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 0.5,
    borderColor: '#333',
  },
  dateConfirmBtn: {
    backgroundColor: PINK,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  dateConfirmText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
});
