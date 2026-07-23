/**
 * Meditación — Timer guiado por fases con biblioteca de meditaciones.
 *
 * Si recibe meditationId como param → carga esa meditación.
 * Si no → muestra la biblioteca para elegir.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { CircularTimer } from '@/components/circular-timer';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { useTimer } from '@/hooks/use-timer';
import { toggleCompletion } from '@/src/services/protocol-service';
import { awardPracticeElectron, type PracticeAwardStatus } from '@/src/services/electron-service';
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';
import { qualifiesForPracticeElectron } from '@/src/services/practice-electron-core';
import { supabase } from '@/src/lib/supabase';
import { error as logError } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { vibrateMedium, haptic } from '@/src/utils/haptics';
import { playBeep, initAudio } from '@/src/utils/sounds';
import {
  MEDITATION_LIBRARY,
  MEDITATION_TYPES,
  type MeditationTemplate,
  type MeditationPhase,
} from '@/src/data/meditation-library';
import { phaseIndexAt } from '@/src/services/meditation-core';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, ATP_BRAND } from '@/src/constants/brand';
import { BackButton } from '@/src/components/ui/BackButton';
import { MenteHero } from '@/src/components/mente/MenteHero';

// #138: hero editorial del pilar (require estático · Metro). Reusa mente.jpg.
const HERO_MENTE = require('@/assets/images/intervenciones/mente.jpg');

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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <MenteHero
        image={HERO_MENTE}
        kicker="PILAR MENTE"
        title="Meditación"
        subtitle={`${MEDITATION_LIBRARY.length} sesiones guiadas`}
        onBack={onBack}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.libContent}>

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
  // Delta economía: qué pasó con el e- (≥80% real + cap 3/día + 3h server-side).
  const [electronStatus, setElectronStatus] = useState<PracticeAwardStatus | 'not_eligible' | null>(null);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const prevPhaseIdx = useRef(0);
  const soundInit = useRef(false);
  // MB-5: guard síncrono — el fin natural del timer y "TERMINAR" pueden
  // dispararse casi juntos; solo el primero registra la sesión.
  const completedRef = useRef(false);

  const phases = meditation.phases;
  const elapsed = totalSeconds - timeLeft;

  // Determinar fase actual según el tiempo transcurrido (T3: core puro testeado)
  useEffect(() => {
    if (status !== 'running') return;
    setCurrentPhaseIdx(phaseIndexAt(elapsed, phases));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (completedRef.current) return;
    completedRef.current = true;
    // MB-5: congelar el reloj — sin esto, al terminar antes de tiempo el
    // useTimer seguía corriendo y `elapsed` crecía en la pantalla de completado.
    pause();
    setCompleted(true);
    // 3 "campanas"
    playBowl(0.5);
    setTimeout(() => playBowl(0.5), 1500);
    setTimeout(() => playBowl(0.5), 3000);
    if (protocolItemId) {
      try { await toggleCompletion(protocolItemId); } catch { /* silenciar */ }
    }
    // Guardar sesión + electrón
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: insertError } = await supabase.from('mind_sessions').insert({
          user_id: user.id,
          type: 'meditation',
          template_id: meditation.id,
          template_name: meditation.title,
          duration_seconds: elapsed,
          date: getLocalToday(),
        });
        if (insertError) {
          logError('Meditation insert error:', insertError.message);
          Alert.alert(
            'Sesión no guardada',
            'Completaste la meditación, pero no pudimos registrarla. Revisa tu conexión.'
          );
        } else {
          // Delta economía 2026-07-23: solo e- (cero Economía/H+), y solo si el
          // tiempo real cubre ≥80% de la sesión. Cap 3/día + espaciado 3h los
          // decide el trigger server-side (213) — aquí se falla-suave.
          if (qualifiesForPracticeElectron(elapsed, totalSeconds)) {
            setElectronStatus(await awardPracticeElectron(user.id, 'meditation'));
          } else {
            setElectronStatus('not_eligible');
          }
          DeviceEventEmitter.emit('electrons_changed');
          DeviceEventEmitter.emit('day_changed');
        }
      }
    } catch (e: any) {
      logError('Meditation handleComplete catch:', e?.message ?? String(e));
      Alert.alert(
        'Sesión no guardada',
        'Completaste la meditación, pero no pudimos registrarla. Revisa tu conexión.'
      );
    }
  };

  const handleEnd = () => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
    Alert.alert('¿Terminar meditación?', `Llevas ${timeStr} — se registra tu tiempo real.`, [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Terminar', onPress: handleComplete },
    ]);
  };

  // MB-5: salida sin castigo — el back durante sesión activa NO descarta en
  // silencio: confirma y registra el tiempo real (mismo camino que TERMINAR).
  const handleBack = () => {
    if ((status === 'running' || status === 'paused') && elapsed > 0) {
      handleEnd();
      return;
    }
    onBack();
  };

  const currentPhase = phases[currentPhaseIdx];

  // === Pantalla de completado ===
  if (completed) {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={64} color={ATP_BRAND.lime} />
          <EliteText style={styles.completedTitle}>Meditación completada</EliteText>
          <EliteText variant="caption" style={styles.completedSub}>
            {meditation.title} · {m > 0 ? `${m}m ${s}s` : `${s}s`}
          </EliteText>
          <EliteText variant="body" style={styles.completedMessage}>
            {meditation.closingMessage}
          </EliteText>

          {/* MB-5: el electrón ganado se muestra (antes se otorgaba en silencio).
              Delta economía: solo si de verdad se otorgó (≥80% + cap/espaciado). */}
          {(electronStatus === 'awarded_first' || electronStatus === 'awarded_extra') && (
            <View style={styles.electronCard}>
              <EliteText style={styles.electronValue}>
                +{ELECTRON_WEIGHTS.meditation.weight.toFixed(1)} electrones
              </EliteText>
              <EliteText variant="caption" style={styles.electronLabel}>Meditación completada</EliteText>
            </View>
          )}
          {(electronStatus === 'cap_reached' || electronStatus === 'spacing') && (
            <View style={styles.electronCard}>
              <EliteText variant="caption" style={styles.electronLabel}>
                Ya registraste tu práctica — vuelve en un rato para sumar otro electrón.
              </EliteText>
            </View>
          )}
          {electronStatus === 'not_eligible' && (
            <View style={styles.electronCard}>
              <EliteText variant="caption" style={styles.electronLabel}>
                Registramos tu tiempo real. Completa al menos el 80% para sumar tu electrón.
              </EliteText>
            </View>
          )}

          <GradientCTA label="CONTINUAR" onPress={onComplete} />
        </View>
      </SafeAreaView>
    );
  }

  // === Timer activo ===
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.backBtn}>
        <BackButton onPress={handleBack} color={PURPLE} />
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

        {/* Controles — GradientCTA del design system (MB-5) */}
        <View style={styles.controls}>
          {status === 'idle' ? (
            <GradientCTA label="COMENZAR" onPress={start} />
          ) : status === 'running' ? (
            <>
              <GradientCTA label="PAUSAR" onPress={pause} />
              <GradientCTA label="TERMINAR" variant="quiet" onPress={handleEnd} />
            </>
          ) : status === 'paused' ? (
            <>
              <GradientCTA label="REANUDAR" onPress={start} />
              <GradientCTA label="TERMINAR" variant="quiet" onPress={handleEnd} />
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

  // Controles (botones = GradientCTA del design system)
  controls: { alignItems: 'center', gap: Spacing.md },

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
  electronCard: {
    backgroundColor: 'rgba(168,224,42,0.1)', borderRadius: Radius.lg,
    padding: Spacing.md, marginVertical: Spacing.md, width: '80%', alignItems: 'center',
  },
  electronValue: { color: ATP_BRAND.lime, fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  electronLabel: { color: Colors.textSecondary, marginTop: 4 },
});
