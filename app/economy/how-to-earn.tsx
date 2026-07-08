/**
 * CÓMO GANAR H+ (#99, marathon F2) — explica visualmente la economía:
 * Electrones (esfuerzo verificado, rank permanente) → conversión →
 * Protones H+ (moneda transable) → gasto con criterio.
 *
 * Editorial B/N + lima. Sin números de tasa hardcodeados: la tasa viva
 * se ve en /economy/convert (hay mismatch config/server pendiente de audit).
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Step {
  key: string;
  emoji: string;
  kicker: string;
  title: string;
  body: string;
  cta?: { label: string; route: string };
}

const STEPS: Step[] = [
  {
    key: 'electrones',
    emoji: '⚡',
    kicker: 'PASO 1 · GANA',
    title: 'Electrones',
    body: 'Cada hábito verificado que cumples — agua, sol, entreno, journal, meditación — te da electrones. Son permanentes: construyen tu rango de por vida. Nadie te los puede quitar.',
  },
  {
    key: 'convierte',
    emoji: '🔁',
    kicker: 'PASO 2 · CONVIERTE',
    title: 'Tu esfuerzo se vuelve moneda',
    body: 'Convierte electrones en Protones H+ cuando quieras. La conversión no toca tu rango — el rango se calcula sobre lo ganado históricamente, no sobre lo que tienes.',
    cta: { label: 'Ver conversión', route: '/economy/convert' },
  },
  {
    key: 'protones',
    emoji: '💎',
    kicker: 'PASO 3 · USA',
    title: 'Protones H+',
    body: 'La moneda transable de ATP. Paga consultas a ARGOS, análisis de comida por foto, interpretación de labs y desbloqueos premium. También puedes recargar con packs.',
  },
  {
    key: 'gasta',
    emoji: '🚀',
    kicker: 'PASO 4 · POTENCIA',
    title: 'Gasta con criterio',
    body: 'El movimiento estrella: 500 H+ te dan 24 horas de ATP Pro completo (Boost). Retos semanales multiplican tu tasa de conversión. Tu constancia literalmente paga tu IA.',
    cta: { label: 'Ver retos', route: '/economy/challenges' },
  },
];

export default function HowToEarnScreen() {
  return (
    <Screen edges={[]}>
      <ScreenHeader title="Cómo ganar H+" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={styles.heroTitle}>Tu esfuerzo tiene economía</EliteText>
          <EliteText style={styles.heroSubtitle}>
            En ATP no compras progreso: lo generas. Así fluye la energía.
          </EliteText>
        </Animated.View>

        {STEPS.map((step, i) => (
          <View key={step.key}>
            <Animated.View
              entering={FadeInUp.delay(120 + i * 90).springify()}
              style={styles.stepCard}
            >
              <View style={styles.stepHeader}>
                <View style={styles.emojiCircle}>
                  <EliteText style={styles.emoji}>{step.emoji}</EliteText>
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={styles.kicker}>{step.kicker}</EliteText>
                  <EliteText style={styles.stepTitle}>{step.title}</EliteText>
                </View>
              </View>
              <EliteText style={styles.stepBody}>{step.body}</EliteText>
              {step.cta && (
                <AnimatedPressable
                  onPress={() => { haptic.light(); router.push(step.cta!.route as any); }}
                  style={styles.stepCta}
                >
                  <EliteText style={styles.stepCtaText}>{step.cta.label}</EliteText>
                  <Ionicons name="chevron-forward" size={13} color={ATP_BRAND.lime} />
                </AnimatedPressable>
              )}
            </Animated.View>
            {i < STEPS.length - 1 && (
              <Animated.View
                entering={FadeInUp.delay(160 + i * 90).springify()}
                style={styles.flowArrow}
              >
                <Ionicons name="arrow-down" size={18} color={withOpacity(ATP_BRAND.lime, 0.5)} />
              </Animated.View>
            )}
          </View>
        ))}

        <Animated.View entering={FadeInUp.delay(120 + STEPS.length * 90).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.back(); }}
            style={styles.mainCta}
          >
            <EliteText style={styles.mainCtaText}>Empezar a ganar</EliteText>
          </AnimatedPressable>
          <EliteText style={styles.footNote}>
            Cada electrón que completas hoy es rendimiento mañana.
          </EliteText>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 80 },
  heroTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.hero,
    color: TEXT.primary,
  },
  heroSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: TEXT.secondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  stepCard: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ELEVATION[2].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[2].border,
  },
  emoji: { fontSize: 20 },
  kicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: ATP_BRAND.lime,
    letterSpacing: 2,
  },
  stepTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: TEXT.primary,
    marginTop: 1,
  },
  stepBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    lineHeight: 19,
    marginTop: Spacing.sm,
  },
  stepCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  stepCtaText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: ATP_BRAND.lime,
  },
  flowArrow: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  mainCta: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  mainCtaText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: '#000',
    letterSpacing: 0.5,
  },
  footNote: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
