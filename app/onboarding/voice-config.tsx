/**
 * Onboarding — Voice Config (paso 9).
 *
 * Wizard auto-advance de 16 preguntas que pueblan `coach_voice_config`.
 * Es la primera pieza del coach unificado que llega al usuario final:
 * calibra tono, formalidad, distancia emocional, vocabulario, idioma y los
 * tres niveles (experiencia / autoevaluación / compromiso) que modulan a ARGOS.
 *
 * Persistencia mid-cuestionario (resume — patrón bug F01.17): el progreso vive
 * en client_profiles.onboarding_answers._progress y se restaura al reabrir.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OptionCard } from '@/src/components/onboarding/OptionCard';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { VOICE_CONFIG_QUESTIONS } from '@/src/constants/voice-config-questions';
import {
  computeVoiceConfigFromAnswers,
  saveVoiceConfig,
} from '@/src/services/coach-voice-config-service';
import {
  saveBlockProgress, loadBlockProgress, clearBlockProgress,
} from '@/src/services/onboarding-v2-service';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

const TOTAL = VOICE_CONFIG_QUESTIONS.length;

export default function VoiceConfigOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // Step COACH 7.2/N: backfill para founders pre-COACH-4/N (sin fila en
  // coach_voice_config). En este modo NO se regresa el onboarding_step
  // (ya está 'completed') y al terminar se vuelve a HOY, no al summary.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isBackfill = mode === 'backfill';

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [animKey, setAnimKey] = useState(0);
  const [saving, setSaving] = useState(false);

  // Restaurar progreso al reabrir mid-cuestionario (resume — bug F01.17)
  useEffect(() => {
    if (!user?.id) return;
    loadBlockProgress(user.id, 'voice_config').then(prog => {
      if (prog && prog.answers) {
        setAnswers(prog.answers as Record<string, string>);
        setCurrentQ(Math.min(prog.currentQ ?? 0, TOTAL - 1));
      }
    });
  }, [user?.id]);

  const persistProgress = useCallback((
    nextAnswers: Record<string, string>,
    nextQ: number,
  ) => {
    if (!user?.id) return;
    saveBlockProgress(user.id, 'voice_config', { answers: nextAnswers, currentQ: nextQ });
  }, [user?.id]);

  const finish = useCallback(async (finalAnswers: Record<string, string>) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const config = computeVoiceConfigFromAnswers(finalAnswers);
      await saveVoiceConfig(user.id, config);
      await clearBlockProgress(user.id);
      haptic.success();
    } catch (e) {
      console.warn('Error saving voice config:', e);
    } finally {
      // v2 (F2): la pantalla es standalone (backfill / configuración de voz).
      // Ya no forma parte del flujo de onboarding — siempre sale a HOY.
      router.replace('/(tabs)');
    }
  }, [user?.id, router]);

  const handleOptionSelect = useCallback((optionId: string) => {
    const q = VOICE_CONFIG_QUESTIONS[currentQ];
    const updated = { ...answers, [q.id]: optionId };
    setAnswers(updated);
    const isLast = currentQ >= TOTAL - 1;
    const nextQ = isLast ? currentQ : currentQ + 1;
    persistProgress(updated, nextQ);
    // Auto-advance tras 250ms de feedback visual
    setTimeout(() => {
      if (isLast) {
        finish(updated);
      } else {
        setCurrentQ(prev => prev + 1);
        setAnimKey(prev => prev + 1);
      }
    }, 250);
  }, [currentQ, answers, persistProgress, finish]);

  const handleBack = useCallback(() => {
    haptic.light();
    if (currentQ > 0) {
      setCurrentQ(prev => prev - 1);
      setAnimKey(prev => prev + 1);
    }
  }, [currentQ]);

  const q = VOICE_CONFIG_QUESTIONS[currentQ];
  const showBack = currentQ > 0; // back disponible salvo en Q1

  return (
    <SafeAreaView style={s.container}>
      {/* Progress header */}
      <View style={s.progressHeader}>
        {showBack ? (
          <AnimatedPressable onPress={handleBack} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#888" />
          </AnimatedPressable>
        ) : (
          <View style={s.backBtn} />
        )}
        <View style={s.progressBarWrap}>
          {VOICE_CONFIG_QUESTIONS.map((_, i) => (
            <View
              key={i}
              style={[s.progressSegment, i <= currentQ && s.progressSegmentFilled]}
            />
          ))}
        </View>
        <EliteText style={s.progressLabel}>{currentQ + 1}/{TOTAL}</EliteText>
      </View>

      <ScrollView
        contentContainerStyle={s.questionScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={animKey} entering={SlideInRight.duration(250).springify()}>
          {isBackfill && currentQ === 0 && (
            <EliteText style={s.backfillBanner}>
              Tu coach necesita conocerte mejor — 16 preguntas rápidas (3-5 min).
            </EliteText>
          )}
          <EliteText style={s.questionText}>{q.text}</EliteText>

          {q.helperText && (
            <EliteText style={s.helperText}>{q.helperText}</EliteText>
          )}

          <View style={s.optionsWrap}>
            {q.options.map((opt, idx) => (
              <Animated.View
                key={opt.id}
                entering={FadeInUp.delay(80 + idx * 50).springify()}
              >
                <OptionCard
                  text={opt.label}
                  selected={answers[q.id] === opt.id}
                  onPress={() => handleOptionSelect(opt.id)}
                />
              </Animated.View>
            ))}
          </View>

          {saving && (
            <EliteText style={s.savingText}>Calibrando tu coach…</EliteText>
          )}
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
  },
  progressSegmentFilled: {
    backgroundColor: ATP_BRAND.lime,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#555',
    width: 34,
    textAlign: 'right',
  },

  questionScroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: 24,
  },
  backfillBanner: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: ATP_BRAND.lime,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  questionText: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#fff',
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  helperText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  optionsWrap: {
    marginTop: Spacing.sm,
  },
  savingText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: ATP_BRAND.lime,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
