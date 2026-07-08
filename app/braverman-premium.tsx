/**
 * REPORTE PREMIUM ARGOS — Braverman (#90, marathon F5).
 * Gate: effectiveTier pro/clinician (el Boost H+ de 24h también abre la puerta).
 * Free/base ven lock editorial con CTA a boost/paywall. Cache por resultado.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import {
  generateBravermanPremiumReport,
  type PremiumReportResult,
} from '@/src/services/braverman-premium-service';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const LOADING_PHRASES = [
  'ARGOS está leyendo tu química cerebral…',
  'Cruzando 313 respuestas con tu perfil…',
  'Calculando proporciones de tus 4 naturalezas…',
  'Redactando recomendaciones específicas…',
  'Puliendo el reporte editorial…',
];

export default function BravermanPremiumScreen() {
  const { user } = useAuth();
  const { isPro, isLoading: subLoading } = useSubscription();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'no_test'>('idle');
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const startedRef = useRef(false);

  const generate = useCallback(async () => {
    if (!user?.id) return;
    setState('loading');
    const result: PremiumReportResult = await generateBravermanPremiumReport(user.id);
    if (result.status === 'ok') {
      haptic.success();
      setMarkdown(result.markdown);
      setState('done');
    } else {
      setState(result.status === 'no_test' ? 'no_test' : 'error');
    }
  }, [user?.id]);

  // Auto-genera al entrar si tiene acceso (cache hace esto barato en re-visitas)
  useEffect(() => {
    if (subLoading || startedRef.current || !user?.id) return;
    if (isPro) {
      startedRef.current = true;
      generate();
    }
  }, [subLoading, isPro, user?.id, generate]);

  // Rotación de frases del loading (el LLM tarda 30-60s)
  useEffect(() => {
    if (state !== 'loading') return;
    const interval = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [state]);

  // ── Gate para free/base ──
  if (!subLoading && !isPro) {
    return (
      <Screen edges={[]}>
        <ScreenHeader title="Reporte Premium" onBack={() => router.back()} />
        <View style={styles.lockContainer}>
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.lockCard}>
            <EliteText style={{ fontSize: 44 }}>🧠</EliteText>
            <EliteText style={styles.lockTitle}>Tu cerebro, a fondo</EliteText>
            <EliteText style={styles.lockBody}>
              ARGOS cruza tus 313 respuestas con tu perfil y genera un análisis
              profundo: proporciones exactas, fortalezas, vulnerabilidades y un
              plan específico de nutrientes, suplementos, ejercicio y mente.
            </EliteText>
            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push('/paywall' as any); }}
              style={styles.lockCtaPrimary}
            >
              <EliteText style={styles.lockCtaPrimaryText}>Ver ATP Pro</EliteText>
            </AnimatedPressable>
            <EliteText style={styles.lockHint}>
              ¿Tienes Protones? El Boost H+ de 24 horas (en HOY) también lo desbloquea.
            </EliteText>
          </Animated.View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Reporte Premium" onBack={() => router.back()} />

      {(state === 'loading' || state === 'idle' || subLoading) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          <Animated.View key={phraseIdx} entering={FadeIn.duration(500)}>
            <EliteText style={styles.loadingText}>{LOADING_PHRASES[phraseIdx]}</EliteText>
          </Animated.View>
          <EliteText style={styles.loadingHint}>Esto toma entre 30 y 60 segundos. Vale la pena.</EliteText>
        </View>
      )}

      {state === 'no_test' && (
        <View style={styles.loadingContainer}>
          <EliteText style={{ fontSize: 40 }}>🧬</EliteText>
          <EliteText style={styles.lockTitle}>Primero el test</EliteText>
          <EliteText style={styles.lockBody}>
            El reporte premium se construye sobre tu test de Braverman completo.
          </EliteText>
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.push('/braverman' as any); }}
            style={styles.lockCtaPrimary}
          >
            <EliteText style={styles.lockCtaPrimaryText}>Hacer el test</EliteText>
          </AnimatedPressable>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.loadingContainer}>
          <EliteText style={styles.lockTitle}>Algo no salió</EliteText>
          <EliteText style={styles.lockBody}>
            ARGOS no pudo generar tu reporte. Suele ser cosa de red — intenta de nuevo.
          </EliteText>
          <AnimatedPressable onPress={generate} style={styles.lockCtaPrimary}>
            <EliteText style={styles.lockCtaPrimaryText}>Reintentar</EliteText>
          </AnimatedPressable>
        </View>
      )}

      {state === 'done' && markdown && (
        <ScrollView contentContainerStyle={styles.reportContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.springify()}>
            <View style={styles.reportBadge}>
              <EliteText style={styles.reportBadgeText}>ANÁLISIS ARGOS · PREMIUM</EliteText>
            </View>
            <Markdown
              style={{
                body: { color: '#e2e2e2', fontSize: 14, lineHeight: 22 },
                heading2: { color: ATP_BRAND.lime, fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 8 },
                heading3: { color: ATP_BRAND.lime, fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 4 },
                strong: { color: '#fff', fontWeight: '700' },
                bullet_list: { marginLeft: 8 },
                list_item: { color: '#e2e2e2', marginBottom: 5 },
                hr: { backgroundColor: '#333', height: 0.5, marginVertical: 14 },
                em: { color: '#ccc', fontStyle: 'italic' },
                paragraph: { color: '#e2e2e2', fontSize: 14, lineHeight: 22, marginBottom: 10 },
                blockquote: {
                  backgroundColor: '#111',
                  borderLeftColor: ATP_BRAND.lime,
                  borderLeftWidth: 3,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginVertical: 8,
                },
                code_inline: { backgroundColor: '#1a1a1a', color: '#e2e2e2', borderWidth: 0, fontSize: 13 },
                code_block: { backgroundColor: '#111', color: '#e2e2e2', borderColor: '#1f1f1f', borderWidth: 0.5, borderRadius: 8, padding: 12 },
                fence: { backgroundColor: '#111', color: '#e2e2e2', borderColor: '#1f1f1f', borderWidth: 0.5, borderRadius: 8, padding: 12 },
              }}
            >
              {markdown}
            </Markdown>
          </Animated.View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lockContainer: { flex: 1, justifyContent: 'center', padding: Spacing.md },
  lockCard: {
    alignItems: 'center',
    backgroundColor: ELEVATION[1].bg,
    borderColor: withOpacity(ATP_BRAND.lime, 0.3),
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  lockTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, color: TEXT.primary },
  lockBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  lockCtaPrimary: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  lockCtaPrimaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000' },
  lockHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: TEXT.primary,
    textAlign: 'center',
  },
  loadingHint: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary },
  reportContent: { padding: Spacing.md, paddingBottom: 60 },
  reportBadge: {
    alignSelf: 'flex-start',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  reportBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: ATP_BRAND.lime,
    letterSpacing: 1.5,
  },
});
