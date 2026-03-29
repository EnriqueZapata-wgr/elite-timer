/**
 * Respiración — Timer con animación de círculo expandible/contractible.
 *
 * Ciclos de inhala/retén/exhala con visualización.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import AnimatedRN, { FadeIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/GradientCard';
import { toggleCompletion } from '@/src/services/protocol-service';
import { vibrateMedium, haptic } from '@/src/utils/haptics';
import { playBeep, initAudio } from '@/src/utils/sounds';
import { BREATHING_LIBRARY, type BreathingTemplate, type BreathingPhase } from '@/src/data/breathing-library';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS } from '@/src/constants/brand';

const PURPLE = CATEGORY_COLORS.mind;

// === COMPONENTE PRINCIPAL ===

export default function BreathingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    breathingId?: string;
    protocolItemId?: string;
  }>();

  const [selected, setSelected] = useState<BreathingTemplate | null>(() => {
    if (params.breathingId) {
      return BREATHING_LIBRARY.find(b => b.id === params.breathingId) ?? null;
    }
    return null;
  });
  // Para box breathing: muestra config antes del timer
  const [configuring, setConfiguring] = useState(false);

  const handleSelect = (t: BreathingTemplate) => {
    setSelected(t);
    if (t.id === 'box-4') setConfiguring(true);
  };

  if (!selected) {
    return <SelectorScreen onSelect={handleSelect} onBack={() => router.back()} />;
  }

  if (configuring && selected.id === 'box-4') {
    return (
      <BoxConfigScreen
        template={selected}
        onStart={(customTemplate) => { setSelected(customTemplate); setConfiguring(false); }}
        onBack={() => { setConfiguring(false); setSelected(null); }}
      />
    );
  }

  return (
    <BreathingTimerScreen
      template={selected}
      protocolItemId={params.protocolItemId}
      onBack={() => {
        if (params.breathingId) router.back();
        else setSelected(null);
      }}
      onComplete={() => router.back()}
    />
  );
}

// ══════════════════════════════
// SELECTOR
// ══════════════════════════════

function SelectorScreen({ onSelect, onBack }: {
  onSelect: (t: BreathingTemplate) => void;
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={28} color={PURPLE} />
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.selectorContent}>
        <EliteText style={styles.selectorTitle}>RESPIRACIÓN</EliteText>
        <EliteText variant="caption" style={styles.selectorSub}>
          {BREATHING_LIBRARY.length} ejercicios de respiración
        </EliteText>

        {BREATHING_LIBRARY.map(t => (
          <GradientCard key={t.id} color={PURPLE} onPress={() => onSelect(t)} style={styles.selectorCard}>
            <View style={styles.selectorCardBody}>
              <View style={styles.selectorCardInfo}>
                <EliteText variant="body" style={styles.selectorCardTitle}>{t.title}</EliteText>
                <EliteText variant="caption" style={styles.selectorCardDesc}>{t.description}</EliteText>
                <EliteText variant="caption" style={styles.selectorCardMeta}>
                  {t.durationMinutes} min · {t.cycles} ciclos · {t.phases.map(p => p.seconds + 's').join('-')}
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </GradientCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════
// BOX BREATHING CONFIG
// ══════════════════════════════

function BoxConfigScreen({ template, onStart, onBack }: {
  template: BreathingTemplate;
  onStart: (t: BreathingTemplate) => void;
  onBack: () => void;
}) {
  const [inhale, setInhale] = useState(4);
  const [holdFull, setHoldFull] = useState(4);
  const [exhale, setExhale] = useState(4);
  const [holdEmpty, setHoldEmpty] = useState(4);
  const [cycles, setCycles] = useState(18);

  const cycleSeconds = inhale + holdFull + exhale + holdEmpty;
  const totalSeconds = cycles * cycleSeconds;
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  const handleStart = () => {
    const customTemplate: BreathingTemplate = {
      ...template,
      cycles,
      durationMinutes: Math.ceil(totalSeconds / 60),
      phases: [
        { action: 'inhale', seconds: inhale, label: 'Inhala' },
        { action: 'hold', seconds: holdFull, label: 'Retén' },
        { action: 'exhale', seconds: exhale, label: 'Exhala' },
        { action: 'hold_empty', seconds: holdEmpty, label: 'Vacío' },
      ],
    };
    onStart(customTemplate);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={28} color={PURPLE} />
      </Pressable>

      <View style={styles.configContainer}>
        <EliteText style={styles.configTitle}>BOX BREATHING</EliteText>
        <EliteText variant="caption" style={styles.configSub}>Configura cada lado de la caja</EliteText>

        <View style={styles.configRows}>
          <ConfigRow label="Inhala" value={inhale} onChange={setInhale} />
          <ConfigRow label="Retén" value={holdFull} onChange={setHoldFull} />
          <ConfigRow label="Exhala" value={exhale} onChange={setExhale} />
          <ConfigRow label="Vacío" value={holdEmpty} onChange={setHoldEmpty} />
        </View>

        <View style={styles.configDivider} />

        <ConfigRow label="Ciclos" value={cycles} onChange={setCycles} min={1} max={50} />

        <EliteText variant="caption" style={styles.configTotal}>
          Tiempo total: {totalMin > 0 ? `${totalMin}m ` : ''}{totalSec > 0 ? `${totalSec}s` : ''}
          {' '}({inhale}-{holdFull}-{exhale}-{holdEmpty} × {cycles})
        </EliteText>

        <Pressable onPress={handleStart} style={styles.configStartBtn}>
          <EliteText style={styles.configStartBtnText}>COMENZAR</EliteText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ConfigRow({ label, value, onChange, min = 1, max = 30 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <View style={styles.configRow}>
      <EliteText variant="body" style={styles.configRowLabel}>{label}</EliteText>
      <View style={styles.configStepper}>
        <Pressable
          onPress={() => { haptic.light(); onChange(Math.max(min, value - 1)); }}
          disabled={value <= min}
          style={[styles.configStepBtn, value <= min && { opacity: 0.3 }]}
        >
          <Ionicons name="remove" size={18} color={PURPLE} />
        </Pressable>
        <EliteText style={styles.configStepValue}>{value}<EliteText style={styles.configStepUnit}>s</EliteText></EliteText>
        <Pressable
          onPress={() => { haptic.light(); onChange(Math.min(max, value + 1)); }}
          disabled={value >= max}
          style={[styles.configStepBtn, value >= max && { opacity: 0.3 }]}
        >
          <Ionicons name="add" size={18} color={PURPLE} />
        </Pressable>
      </View>
    </View>
  );
}

// ══════════════════════════════
// TIMER DE RESPIRACIÓN
// ══════════════════════════════

function BreathingTimerScreen({ template, protocolItemId, onBack, onComplete }: {
  template: BreathingTemplate;
  protocolItemId?: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  useKeepAwake();

  const cycleSeconds = template.phases.reduce((sum, p) => sum + p.seconds, 0);
  const totalSeconds = template.cycles * cycleSeconds;

  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [secondsInPhase, setSecondsInPhase] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animación del círculo
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const currentPhase = template.phases[currentPhaseIdx];
  const phaseProgress = currentPhase ? secondsInPhase / currentPhase.seconds : 0;
  const totalProgress = totalSeconds > 0 ? totalElapsed / totalSeconds : 0;
  const totalRemaining = totalSeconds - totalElapsed;

  // Animar círculo según fase
  useEffect(() => {
    if (status !== 'running' || !currentPhase) return;

    const remaining = currentPhase.seconds - secondsInPhase;
    if (remaining <= 0) return;

    if (currentPhase.action === 'inhale') {
      RNAnimated.timing(scaleAnim, {
        toValue: 1.5,
        duration: remaining * 1000,
        useNativeDriver: true,
      }).start();
    } else if (currentPhase.action === 'exhale') {
      RNAnimated.timing(scaleAnim, {
        toValue: 1.0,
        duration: remaining * 1000,
        useNativeDriver: true,
      }).start();
    }
    // hold/hold_empty: no animation change
  }, [currentPhaseIdx, status]);

  // Timer principal
  useEffect(() => {
    if (status !== 'running') {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsInPhase(prev => {
        const next = prev + 1;
        if (next >= template.phases[currentPhaseIdx].seconds) {
          // Avanzar fase
          const nextPhaseIdx = currentPhaseIdx + 1;
          if (nextPhaseIdx >= template.phases.length) {
            // Avanzar ciclo
            const nextCycle = currentCycle + 1;
            if (nextCycle >= template.cycles) {
              // Completar
              clearInterval(intervalRef.current!);
              intervalRef.current = null;
              setTimeout(() => handleComplete(), 0);
              return 0;
            }
            setCurrentCycle(nextCycle);
            setCurrentPhaseIdx(0);
            vibrateMedium();
          } else {
            setCurrentPhaseIdx(nextPhaseIdx);
          }
          return 0;
        }
        return next;
      });
      setTotalElapsed(prev => prev + 1);
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status, currentPhaseIdx, currentCycle]);

  const handleStart = () => {
    if (status === 'idle') {
      try { initAudio(); playBeep(0.5); } catch { vibrateMedium(); }
    }
    setStatus('running');
  };

  const handlePause = () => {
    scaleAnim.stopAnimation();
    setStatus('paused');
  };

  const handleComplete = async () => {
    setStatus('completed');
    try { initAudio(); playBeep(0.5); } catch { /* */ }
    vibrateMedium();
    setTimeout(() => { try { playBeep(0.5); } catch { /* */ } vibrateMedium(); }, 1500);
    setTimeout(() => { try { playBeep(0.5); } catch { /* */ } vibrateMedium(); }, 3000);
    if (protocolItemId) {
      try { await toggleCompletion(protocolItemId); } catch { /* silenciar */ }
    }
  };

  const handleEnd = () => {
    const m = Math.floor(totalElapsed / 60);
    const s = totalElapsed % 60;
    Alert.alert('¿Terminar sesión?', `Llevas ${m > 0 ? `${m}m ${s}s` : `${s}s`}.`, [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Terminar', onPress: handleComplete },
    ]);
  };

  const formatMmSs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // === Completado ===
  if (status === 'completed') {
    const m = Math.floor(totalElapsed / 60);
    const s = totalElapsed % 60;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={64} color={PURPLE} />
          <EliteText style={styles.completedTitle}>Sesión completada</EliteText>
          <EliteText variant="caption" style={styles.completedSub}>
            {template.title} · {m > 0 ? `${m}m ${s}s` : `${s}s`}
          </EliteText>
          <EliteText variant="body" style={styles.completedMessage}>
            {template.closingMessage}
          </EliteText>
          <Pressable onPress={onComplete} style={styles.doneBtn}>
            <EliteText variant="body" style={styles.doneBtnText}>Volver</EliteText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // === Timer activo ===
  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={28} color={PURPLE} />
      </Pressable>

      <View style={styles.timerContainer}>
        {/* Header */}
        <EliteText style={styles.timerTitle}>{template.title}</EliteText>

        {/* Círculo animado */}
        <View style={styles.circleContainer}>
          <RNAnimated.View style={[
            styles.breathCircle,
            { transform: [{ scale: scaleAnim }] },
          ]}>
            <View style={styles.breathCircleInner}>
              <EliteText style={styles.actionText}>
                {status === 'idle' ? 'Listo' : currentPhase?.label ?? ''}
              </EliteText>
              {status !== 'idle' && (
                <EliteText style={styles.phaseCountdown}>
                  {currentPhase ? currentPhase.seconds - secondsInPhase : 0}
                </EliteText>
              )}
            </View>
          </RNAnimated.View>
        </View>

        {/* Info */}
        {status !== 'idle' && (
          <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.infoSection}>
            <EliteText variant="caption" style={styles.cycleText}>
              Ciclo {currentCycle + 1} de {template.cycles}
            </EliteText>
            <EliteText variant="body" style={styles.remainingText}>
              {formatMmSs(totalRemaining)}
            </EliteText>
            <View style={styles.totalProgressBar}>
              <View style={[styles.totalProgressFill, { width: `${totalProgress * 100}%` }]} />
            </View>
          </AnimatedRN.View>
        )}

        {status === 'idle' && (
          <EliteText variant="caption" style={styles.idleInfo}>
            {template.durationMinutes} min · {template.cycles} ciclos · {template.phases.map(p => p.seconds + 's').join('-')}
          </EliteText>
        )}

        {/* Controles */}
        <View style={styles.controls}>
          {status === 'idle' ? (
            <Pressable onPress={handleStart} style={styles.mainBtn}>
              <EliteText style={styles.mainBtnText}>COMENZAR</EliteText>
            </Pressable>
          ) : status === 'running' ? (
            <>
              <Pressable onPress={handlePause} style={styles.mainBtn}>
                <EliteText style={styles.mainBtnText}>PAUSAR</EliteText>
              </Pressable>
              <Pressable onPress={handleEnd} style={styles.endBtn}>
                <EliteText variant="caption" style={styles.endBtnText}>TERMINAR</EliteText>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={handleStart} style={styles.mainBtn}>
                <EliteText style={styles.mainBtnText}>REANUDAR</EliteText>
              </Pressable>
              <Pressable onPress={handleEnd} style={styles.endBtn}>
                <EliteText variant="caption" style={styles.endBtnText}>TERMINAR</EliteText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// === ESTILOS ===

const CIRCLE_SIZE = 200;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  backBtn: {
    position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm,
  },

  // Selector
  selectorContent: {
    paddingTop: Spacing.xxl + Spacing.lg, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl,
  },
  selectorTitle: {
    fontSize: 32, fontFamily: Fonts.extraBold, color: PURPLE, letterSpacing: 4, marginBottom: Spacing.xs,
  },
  selectorSub: { color: Colors.textSecondary, marginBottom: Spacing.lg, fontSize: 14 },
  selectorCard: { marginBottom: Spacing.sm },
  selectorCardBody: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
  },
  selectorCardInfo: { flex: 1 },
  selectorCardTitle: { fontFamily: Fonts.bold, fontSize: 16, color: PURPLE },
  selectorCardDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  selectorCardMeta: { color: Colors.textSecondary, fontSize: 11, marginTop: 4, fontFamily: Fonts.semiBold },

  // Timer
  timerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  timerTitle: {
    fontSize: 22, fontFamily: Fonts.extraBold, color: PURPLE, letterSpacing: 2, marginBottom: Spacing.lg,
  },

  // Círculo animado
  circleContainer: {
    width: CIRCLE_SIZE * 1.6, height: CIRCLE_SIZE * 1.6,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  breathCircle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: 999,
    backgroundColor: PURPLE + '15', borderWidth: 3, borderColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 25, elevation: 8,
  },
  breathCircleInner: { alignItems: 'center' },
  actionText: {
    fontSize: 24, fontFamily: Fonts.extraBold, color: TEXT_COLORS.primary, letterSpacing: 2,
  },
  phaseCountdown: {
    fontSize: 40, fontFamily: Fonts.extraBold, color: PURPLE, fontVariant: ['tabular-nums'],
    marginTop: Spacing.xs,
  },

  // Info
  infoSection: { alignItems: 'center', marginBottom: Spacing.lg, width: '60%' },
  cycleText: { color: Colors.textSecondary, fontSize: 13, fontFamily: Fonts.semiBold, marginBottom: Spacing.xs },
  remainingText: {
    color: PURPLE, fontSize: 20, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'],
    marginBottom: Spacing.sm,
  },
  totalProgressBar: {
    width: '100%', height: 3, backgroundColor: Colors.surfaceLight, borderRadius: 2, overflow: 'hidden',
  },
  totalProgressFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 2 },
  idleInfo: { color: Colors.textSecondary, marginBottom: Spacing.lg, fontSize: 14 },

  // Controles
  controls: { alignItems: 'center', gap: Spacing.md },
  mainBtn: {
    backgroundColor: PURPLE, paddingHorizontal: Spacing.xl + Spacing.lg,
    paddingVertical: Spacing.md, borderRadius: Radius.pill,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  mainBtnText: { color: TEXT_COLORS.primary, fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 3 },
  endBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  endBtnText: { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 13, letterSpacing: 2 },

  // Completado
  completedContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  completedTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: PURPLE },
  completedSub: { color: Colors.textSecondary, fontSize: 14 },
  completedMessage: {
    color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center',
    fontSize: 16, paddingHorizontal: Spacing.xl, marginVertical: Spacing.md,
  },
  doneBtn: {
    borderWidth: 1, borderColor: PURPLE + '40', borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
  },
  doneBtnText: { color: PURPLE, fontFamily: Fonts.bold, letterSpacing: 2 },

  // Config
  configContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg,
  },
  configTitle: {
    fontSize: 24, fontFamily: Fonts.extraBold, color: PURPLE, letterSpacing: 3, marginBottom: Spacing.xs,
  },
  configSub: { color: Colors.textSecondary, marginBottom: Spacing.xl, fontSize: 14 },
  configRows: { width: '100%', gap: Spacing.sm },
  configDivider: {
    width: '100%', height: 1, backgroundColor: Colors.surfaceLight, marginVertical: Spacing.md,
  },
  configRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingVertical: Spacing.xs,
  },
  configRowLabel: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary },
  configStepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  configStepBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: PURPLE + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  configStepValue: {
    fontFamily: Fonts.extraBold, fontSize: 28, color: PURPLE, minWidth: 50, textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  configStepUnit: { fontSize: 16, fontFamily: Fonts.semiBold, color: Colors.textSecondary },
  configTotal: {
    color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.xl, fontSize: 13,
    fontFamily: Fonts.semiBold,
  },
  configStartBtn: {
    backgroundColor: PURPLE, paddingHorizontal: Spacing.xl + Spacing.lg,
    paddingVertical: Spacing.md, borderRadius: Radius.pill,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  configStartBtnText: { color: TEXT_COLORS.primary, fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 3 },
});
