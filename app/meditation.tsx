/**
 * Meditación — Timer guiado por fases con biblioteca de meditaciones.
 *
 * Si recibe meditationId como param → carga esa meditación.
 * Si no → muestra la biblioteca para elegir.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CircularTimer } from '@/components/circular-timer';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/GradientCard';
import { useTimer } from '@/hooks/use-timer';
import { toggleCompletion } from '@/src/services/protocol-service';
import { vibrateMedium, haptic } from '@/src/utils/haptics';
import { playBeep, initAudio } from '@/src/utils/sounds';
import {
  MEDITATION_LIBRARY,
  MEDITATION_TYPES,
  type MeditationTemplate,
  type MeditationPhase,
} from '@/src/data/meditation-library';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS } from '@/src/constants/brand';
import { BackButton } from '@/src/components/ui/BackButton';
import { PillarHeader } from '@/src/components/ui/PillarHeader';

const PURPLE = CATEGORY_COLORS.mind;

// === COMPONENTE PRINCIPAL ===

export default function MeditationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    meditationId?: string;
    protocolItemId?: string;
  }>();

  const [selected, setSelected] = useState<MeditationTemplate | null>(() => {
    if (params.meditationId) {
      return MEDITATION_LIBRARY.find(m => m.id === params.meditationId) ?? null;
    }
    return null;
  });

  if (!selected) {
    return <LibraryScreen onSelect={setSelected} onBack={() => router.back()} />;
  }

  return (
    <PhasedTimerScreen
      meditation={selected}
      protocolItemId={params.protocolItemId}
      onBack={() => {
        if (params.meditationId) router.back();
        else setSelected(null);
      }}
      onComplete={() => router.back()}
    />
  );
}

// ══════════════════════════════
// BIBLIOTECA
// ══════════════════════════════

function LibraryScreen({ onSelect, onBack }: {
  onSelect: (m: MeditationTemplate) => void;
  onBack: () => void;
}) {
  // Agrupar por tipo
  const grouped = useMemo(() => {
    const map = new Map<string, MeditationTemplate[]>();
    for (const m of MEDITATION_LIBRARY) {
      if (!map.has(m.type)) map.set(m.type, []);
      map.get(m.type)!.push(m);
    }
    return MEDITATION_TYPES
      .filter(t => map.has(t.type))
      .map(t => ({ ...t, meditations: map.get(t.type)! }));
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <PillarHeader pillar="mind" title="Meditación" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.libContent}>
        <EliteText variant="caption" style={styles.libSubtitle}>
          {MEDITATION_LIBRARY.length} sesiones guiadas
        </EliteText>

        {grouped.map(group => (
          <View key={group.type} style={styles.libGroup}>
            <View style={styles.libGroupHeader}>
              <Ionicons name={group.icon as any} size={18} color={PURPLE} />
              <EliteText variant="body" style={styles.libGroupLabel}>{group.label}</EliteText>
            </View>

            {group.meditations.map(m => (
              <GradientCard key={m.id} color={PURPLE} onPress={() => { haptic.light(); onSelect(m); }} style={styles.libCard}>
                <View style={styles.libCardBody}>
                  <View style={styles.libCardInfo}>
                    <EliteText variant="body" style={styles.libCardTitle}>{m.title}</EliteText>
                    <EliteText variant="caption" style={styles.libCardDesc}>{m.description}</EliteText>
                  </View>
                  <View style={styles.libCardRight}>
                    <EliteText style={styles.libCardDuration}>{m.durationMinutes}</EliteText>
                    <EliteText variant="caption" style={styles.libCardMin}>min</EliteText>
                  </View>
                </View>
              </GradientCard>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════
// TIMER CON FASES
// ══════════════════════════════

function PhasedTimerScreen({ meditation, protocolItemId, onBack, onComplete }: {
  meditation: MeditationTemplate;
  protocolItemId?: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  useKeepAwake();

  const totalSeconds = meditation.durationMinutes * 60;
  const { timeLeft, progress, status, start, pause } = useTimer(totalSeconds);
  const [completed, setCompleted] = useState(false);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const prevPhaseIdx = useRef(0);
  const soundInit = useRef(false);

  const phases = meditation.phases;
  const elapsed = totalSeconds - timeLeft;

  // Determinar fase actual según el tiempo transcurrido
  useEffect(() => {
    if (status !== 'running') return;
    let idx = 0;
    for (let i = phases.length - 1; i >= 0; i--) {
      if (elapsed >= phases[i].startSeconds) { idx = i; break; }
    }
    setCurrentPhaseIdx(idx);
  }, [elapsed, status]);

  // Sonido al cambiar de fase
  useEffect(() => {
    if (currentPhaseIdx !== prevPhaseIdx.current && status === 'running') {
      prevPhaseIdx.current = currentPhaseIdx;
      playBowl(0.3);
    }
  }, [currentPhaseIdx]);

  // Sonido al iniciar
  useEffect(() => {
    if (status === 'running' && !soundInit.current) {
      soundInit.current = true;
      playBowl(0.5);
    }
  }, [status]);

  // Al terminar countdown
  useEffect(() => {
    if (status === 'finished' && !completed) handleComplete();
  }, [status]);

  const playBowl = (volume: number) => {
    try {
      initAudio();
      playBeep(volume);
      vibrateMedium();
    } catch { vibrateMedium(); }
  };

  const handleComplete = async () => {
    setCompleted(true);
    // 3 "campanas"
    playBowl(0.5);
    setTimeout(() => playBowl(0.5), 1500);
    setTimeout(() => playBowl(0.5), 3000);
    if (protocolItemId) {
      try { await toggleCompletion(protocolItemId); } catch { /* silenciar */ }
    }
  };

  const handleEnd = () => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
    Alert.alert('¿Terminar meditación?', `Llevas ${timeStr}.`, [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Terminar', onPress: handleComplete },
    ]);
  };

  const currentPhase = phases[currentPhaseIdx];

  // === Pantalla de completado ===
  if (completed) {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={64} color={PURPLE} />
          <EliteText style={styles.completedTitle}>Meditación completada</EliteText>
          <EliteText variant="caption" style={styles.completedSub}>
            {meditation.title} · {m > 0 ? `${m}m ${s}s` : `${s}s`}
          </EliteText>
          <EliteText variant="body" style={styles.completedMessage}>
            {meditation.closingMessage}
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
      <View style={styles.backBtn}>
        <BackButton onPress={onBack} color={PURPLE} />
      </View>

      <View style={styles.timerContainer}>
        {/* Header */}
        <EliteText style={styles.timerTitle}>{meditation.title}</EliteText>
        <EliteText variant="caption" style={styles.timerType}>
          Fase {currentPhaseIdx + 1} de {phases.length}
        </EliteText>

        {/* Timer circular */}
        <View style={styles.timerWrapper}>
          <CircularTimer timeLeft={timeLeft} progress={progress} color={PURPLE} />
        </View>

        {/* Texto de fase */}
        <Animated.View key={currentPhaseIdx} entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.phaseTextContainer}>
          <EliteText variant="body" style={styles.phaseText}>
            {status === 'idle' ? meditation.title : currentPhase.text}
          </EliteText>
          {status !== 'idle' && currentPhase.instruction && (
            <EliteText variant="caption" style={styles.phaseInstruction}>
              {currentPhase.instruction}
            </EliteText>
          )}
          {status === 'idle' && (
            <EliteText variant="caption" style={styles.phaseInstruction}>
              {meditation.description} · {meditation.durationMinutes} min
            </EliteText>
          )}
        </Animated.View>

        {/* Dots de progreso de fases */}
        {status !== 'idle' && (
          <View style={styles.phaseDots}>
            {phases.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.phaseDot,
                  i < currentPhaseIdx && styles.phaseDotDone,
                  i === currentPhaseIdx && styles.phaseDotCurrent,
                ]}
              />
            ))}
          </View>
        )}

        {/* Controles */}
        <View style={styles.controls}>
          {status === 'idle' ? (
            <Pressable onPress={() => { haptic.medium(); start(); }} style={styles.mainBtn}>
              <EliteText style={styles.mainBtnText}>COMENZAR</EliteText>
            </Pressable>
          ) : status === 'running' ? (
            <>
              <Pressable onPress={() => { haptic.medium(); pause(); }} style={styles.mainBtn}>
                <EliteText style={styles.mainBtnText}>PAUSAR</EliteText>
              </Pressable>
              <Pressable onPress={handleEnd} style={styles.endBtn}>
                <EliteText variant="caption" style={styles.endBtnText}>TERMINAR</EliteText>
              </Pressable>
            </>
          ) : status === 'paused' ? (
            <>
              <Pressable onPress={() => { haptic.medium(); start(); }} style={styles.mainBtn}>
                <EliteText style={styles.mainBtnText}>REANUDAR</EliteText>
              </Pressable>
              <Pressable onPress={handleEnd} style={styles.endBtn}>
                <EliteText variant="caption" style={styles.endBtnText}>TERMINAR</EliteText>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  backBtn: {
    position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm,
  },

  // Biblioteca
  libContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  libSubtitle: { color: Colors.textSecondary, marginBottom: Spacing.lg, fontSize: FontSizes.md },
  libGroup: { marginBottom: Spacing.lg },
  libGroupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  libGroupLabel: { fontFamily: Fonts.bold, color: PURPLE, fontSize: FontSizes.lg },
  libCard: { marginBottom: Spacing.xs },
  libCardBody: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
  },
  libCardInfo: { flex: 1 },
  libCardTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg },
  libCardDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  libCardRight: { alignItems: 'center', marginLeft: Spacing.md },
  libCardDuration: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, color: PURPLE },
  libCardMin: { color: Colors.textSecondary, fontSize: FontSizes.xs },

  // Timer
  timerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  timerTitle: {
    fontSize: 22, fontFamily: Fonts.extraBold, color: PURPLE, letterSpacing: 2,
  },
  timerType: { color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.md, fontSize: FontSizes.md },
  timerWrapper: { marginBottom: Spacing.md },

  // Texto de fase
  phaseTextContainer: {
    alignItems: 'center', paddingHorizontal: Spacing.lg, minHeight: 80, marginBottom: Spacing.md,
  },
  phaseText: {
    color: Colors.textPrimary, fontSize: FontSizes.xl, fontFamily: Fonts.bold,
    textAlign: 'center', lineHeight: 26,
  },
  phaseInstruction: {
    color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center',
    marginTop: Spacing.xs, lineHeight: 20,
  },

  // Phase dots
  phaseDots: {
    flexDirection: 'row', gap: 4, marginBottom: Spacing.lg,
  },
  phaseDot: {
    width: 6, height: 6, borderRadius: Radius.xs, backgroundColor: Colors.disabled,
  },
  phaseDotDone: { backgroundColor: PURPLE },
  phaseDotCurrent: { backgroundColor: PURPLE, width: 16, borderRadius: 3 },

  // Controles
  controls: { alignItems: 'center', gap: Spacing.md },
  mainBtn: {
    backgroundColor: PURPLE, paddingHorizontal: Spacing.xl + Spacing.lg,
    paddingVertical: Spacing.md, borderRadius: Radius.pill,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  mainBtnText: { color: TEXT_COLORS.primary, fontFamily: Fonts.extraBold, fontSize: FontSizes.lg, letterSpacing: 3 },
  endBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  endBtnText: { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, letterSpacing: 2 },

  // Completado
  completedContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  completedTitle: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, color: PURPLE },
  completedSub: { color: Colors.textSecondary, fontSize: FontSizes.md },
  completedMessage: {
    color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center',
    fontSize: FontSizes.lg, paddingHorizontal: Spacing.xl, marginVertical: Spacing.md,
  },
  doneBtn: {
    borderWidth: 1, borderColor: PURPLE + '40', borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
  },
  doneBtnText: { color: PURPLE, fontFamily: Fonts.bold, letterSpacing: 2 },
});
