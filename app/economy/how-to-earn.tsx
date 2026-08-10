/**
 * CÓMO GANAR H+ (#99, marathon F2) — explica visualmente la economía:
 * Electrones (esfuerzo verificado, rank permanente) → conversión →
 * Protones H+ (puntos de energía para features premium in-app) → gasto con criterio.
 * Compliance C10-001: H+ NUNCA se describe como moneda/cripto/activo/convertible.
 *
 * Editorial B/N + lima. Sin números de tasa hardcodeados: la tasa viva
 * se ve en /economy/convert (hay mismatch config/server pendiente de audit).
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { router , type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Step {
  key: string;
  emoji: string;
  kicker: string;
  title: string;
  body: string;
  cta?: { label: string; route: Href };
}

const STEPS: Step[] = [
  {
    key: 'electrones',
    emoji: '⚡',
    kicker: 'PASO 1 · GANA',
    title: 'Electrones',
    body: 'Cada hábito verificado que cumples (agua, sol, entreno, journal, meditación) te da electrones. Son permanentes: construyen tu rango de por vida. Nadie te los puede quitar.',
  },
  {
    key: 'convierte',
    emoji: '🔁',
    kicker: 'PASO 2 · CONVIERTE',
    title: 'Tu esfuerzo se vuelve energía',
    body: 'Convierte electrones en Protones H+ cuando quieras. La conversión no toca tu rango: el rango se calcula sobre lo ganado históricamente, no sobre lo que tienes.',
    cta: { label: 'Ver conversión', route: '/economy/convert' },
  },
  {
    key: 'protones',
    emoji: '💎',
    kicker: 'PASO 3 · USA',
    title: 'Protones H+',
    // MB-12.1: fuera "recargar con packs" — las recargas salieron de la
    // tienda en este mismo run.
    body: 'Los puntos de energía de ATP. Úsalos dentro de la app en consultas a ARGOS, análisis de comida por foto, lectura de labs y desbloqueos premium.',
  },
  {
    key: 'gasta',
    emoji: '🚀',
    kicker: 'PASO 4 · POTENCIA',
    title: 'Gasta con criterio',
    // MB-12.1: fuera los retos (apagados por bandera) y su CTA — dos
    // promesas muertas en un párrafo.
    body: 'El movimiento estrella: 500 H+ te dan 24 horas de ATP Pro completo (Boost). Tu constancia literalmente paga tu IA.',
  },
];

export default function HowToEarnScreen() {
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const secTxt = { color: t.textoSecundario };
  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Cómo ganar H+" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[styles.heroTitle, { color: t.texto }]}>Tu esfuerzo tiene economía</EliteText>
          <EliteText style={[styles.heroSubtitle, secTxt]}>
            En ATP no compras progreso: lo generas. Así fluye la energía.
          </EliteText>
        </Animated.View>

        {STEPS.map((step, i) => (
          <View key={step.key}>
            <Animated.View
              entering={FadeInUp.delay(120 + i * 90).springify()}
              style={[styles.stepCard, { backgroundColor: t.card, borderColor: t.borde }]}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.emojiCircle, { backgroundColor: t.flotante, borderColor: t.bordeMarcado }]}>
                  <EliteText style={styles.emoji}>{step.emoji}</EliteText>
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={[styles.kicker, { color: acento }]}>{step.kicker}</EliteText>
                  <EliteText style={[styles.stepTitle, { color: t.texto }]}>{step.title}</EliteText>
                </View>
              </View>
              <EliteText style={[styles.stepBody, secTxt]}>{step.body}</EliteText>
              {step.cta && (
                <AnimatedPressable
                  onPress={() => { haptic.light(); router.push(step.cta!.route); }}
                  style={styles.stepCta}
                >
                  <EliteText style={[styles.stepCtaText, { color: acento }]}>{step.cta.label}</EliteText>
                  <Ionicons name="chevron-forward" size={13} color={acento} />
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
          <EliteText style={[styles.footNote, { color: t.textoTenue }]}>
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
  },
  heroSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  stepCard: {
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
    borderWidth: 0.5,
  },
  emoji: { fontSize: 20 },
  kicker: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 2,
  },
  stepTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    marginTop: 1,
  },
  stepBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
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
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
