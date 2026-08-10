/**
 * REPORTE PREMIUM ARGOS — Braverman (#90, #143).
 * Doctrina H+: se COBRA con Protones (1,000 H+, precio server-side), NO se
 * gatea por tier. Cache por resultado = compra permanente (releer gratis).
 * Precio y balance siempre visibles antes del tap (consentimiento explícito).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, DeviceEventEmitter, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { formatFull } from '@/src/services/economy/format';
import {
  generateBravermanPremiumReport,
  getBravermanPremiumQuote,
  type PremiumQuote,
  type PremiumReportResult,
} from '@/src/services/braverman-premium-service';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
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
  // MB-31B2: tokens del tema (oscuro idéntico; claro = acero). Regla 1: el
  // lima como letra (precio, links, headings del reporte) pasa a teal calibrado.
  const t = useSurfaceTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const analytics = useAnalytics();
  const [state, setState] = useState<'idle' | 'offer' | 'loading' | 'done' | 'error' | 'no_test'>('idle');
  const [quote, setQuote] = useState<PremiumQuote | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [wasCached, setWasCached] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const startedRef = useRef(false);

  const generate = useCallback(async () => {
    if (!user?.id) return;
    setState('loading');
    const result: PremiumReportResult = await generateBravermanPremiumReport(user.id);
    if (result.status === 'ok') {
      haptic.success();
      // T5 HARDENING: funnel core — solo cobros reales (cached = re-lectura gratis).
      if (!result.cached) analytics.track(ATP_EVENTS.BRAVERMAN_PREMIUM_PURCHASED, {});
      setMarkdown(result.markdown);
      setWasCached(result.cached);
      setState('done');
      // #143: cobro exitoso → refrescar pill de economía (regla CLAUDE.md #5)
      if (!result.cached) DeviceEventEmitter.emit('balance_changed');
      return;
    }
    if (result.status === 'insufficient_h_plus') {
      haptic.warning();
      setState('offer');
      Alert.alert(
        'Te faltan H+',
        `Este reporte usa ${formatFull(result.required)} H+ y tienes ${formatFull(result.balance)}. Recarga o gana más completando tu día.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/shop') },
        ],
      );
      return;
    }
    setState(result.status === 'no_test' ? 'no_test' : 'error');
  }, [user?.id]);

  // #143: al entrar carga precio + balance. Si ya lo tiene (cache) lo muestra
  // directo SIN cobrar ni preguntar; si no, card previa con consentimiento.
  useEffect(() => {
    if (startedRef.current || !user?.id) return;
    startedRef.current = true;
    getBravermanPremiumQuote(user.id).then((q) => {
      setQuote(q);
      if (!q.hasCompletedTest) { setState('no_test'); return; }
      if (q.hasCachedReport) { generate(); return; } // gratis, directo
      setState('offer');
    }).catch(() => setState('error'));
  }, [user?.id, generate]);

  // Rotación de frases del loading (el LLM tarda 30-60s)
  useEffect(() => {
    if (state !== 'loading') return;
    const interval = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [state]);

  const canAfford = quote?.balance == null || quote.balance >= (quote?.cost ?? 0);

  // B-5 (MB-12): markdown de LLM sin disclaimer → gate obligatorio.
  return (
    <MedicalDisclaimerGate>
    <Screen edges={[]} themed>
      <ScreenHeader title="Reporte Premium" onBack={() => router.back()} />

      {/* #143: card previa — precio + balance visibles ANTES de generar */}
      {state === 'offer' && quote && (
        <View style={styles.lockContainer}>
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.lockCard}>
            <EliteText style={{ fontSize: 44 }}>🧠</EliteText>
            <EliteText style={styles.lockTitle}>Reporte Premium · Braverman</EliteText>
            <EliteText style={styles.lockBody}>
              Análisis ARGOS de tu naturaleza neurotransmisora: proporciones
              exactas, fortalezas, vulnerabilidades y un plan específico de
              nutrientes, suplementos, ejercicio y mente.
            </EliteText>
            <View style={styles.priceRow}>
              <EliteText style={styles.priceText}>💎 Usa {formatFull(quote.cost)} H+</EliteText>
              <EliteText style={styles.balanceText}>
                Tu balance: {quote.balance == null ? '…' : `${formatFull(quote.balance)} H+`}
              </EliteText>
            </View>
            <AnimatedPressable
              onPress={() => { haptic.medium(); generate(); }}
              style={styles.lockCtaPrimary}
            >
              <EliteText style={styles.lockCtaPrimaryText}>
                Generar reporte ({formatFull(quote.cost)} H+)
              </EliteText>
            </AnimatedPressable>
            {!canAfford && (
              <AnimatedPressable
                onPress={() => { haptic.light(); router.push('/economy/shop'); }}
                style={styles.shopLink}
              >
                <EliteText style={styles.shopLinkText}>Te faltan H+: conseguir más →</EliteText>
              </AnimatedPressable>
            )}
            <EliteText style={styles.lockHint}>
              Se genera una sola vez: queda tuyo para releer cuando quieras.
            </EliteText>
          </Animated.View>
        </View>
      )}

      {(state === 'loading' || state === 'idle') && (
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
            onPress={() => { haptic.medium(); router.push('/braverman'); }}
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
            ARGOS no pudo generar tu reporte. Suele ser cosa de red: intenta de nuevo.
          </EliteText>
          <AnimatedPressable onPress={generate} style={styles.lockCtaPrimary}>
            <EliteText style={styles.lockCtaPrimaryText}>Reintentar</EliteText>
          </AnimatedPressable>
        </View>
      )}

      {state === 'done' && markdown && (
        <ScrollView contentContainerStyle={styles.reportContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.springify()}>
            <View style={styles.badgeRow}>
              <View style={styles.reportBadge}>
                <EliteText style={styles.reportBadgeText}>ANÁLISIS ARGOS · PREMIUM</EliteText>
              </View>
              {/* #143: comunica cache permanente — releer nunca vuelve a costar */}
              <View style={styles.ownedBadge}>
                <EliteText style={styles.ownedBadgeText}>
                  {wasCached ? '✓ Ya lo tienes' : '✓ Tuyo para siempre'} · releer es gratis
                </EliteText>
              </View>
            </View>
            <Markdown
              style={{
                body: { color: t.texto, fontSize: 14, lineHeight: 22 },
                heading2: { color: acento, fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 8 },
                heading3: { color: acento, fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 4 },
                strong: { color: t.texto, fontWeight: '700' },
                bullet_list: { marginLeft: 8 },
                list_item: { color: t.texto, marginBottom: 5 },
                hr: { backgroundColor: t.bordeMarcado, height: 0.5, marginVertical: 14 },
                em: { color: t.textoSecundario, fontStyle: 'italic' },
                paragraph: { color: t.texto, fontSize: 14, lineHeight: 22, marginBottom: 10 },
                blockquote: {
                  backgroundColor: t.hundido,
                  borderLeftColor: ATP_BRAND.lime,
                  borderLeftWidth: 3,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginVertical: 8,
                },
                code_inline: { backgroundColor: t.hundido, color: t.texto, borderWidth: 0, fontSize: 13 },
                code_block: { backgroundColor: t.hundido, color: t.texto, borderColor: t.borde, borderWidth: 0.5, borderRadius: 8, padding: 12 },
                fence: { backgroundColor: t.hundido, color: t.texto, borderColor: t.borde, borderWidth: 0.5, borderRadius: 8, padding: 12 },
              }}
            >
              {markdown}
            </Markdown>
          </Animated.View>
        </ScrollView>
      )}
    </Screen>
    </MedicalDisclaimerGate>
  );
}

// MB-31B2: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  lockContainer: { flex: 1, justifyContent: 'center', padding: Spacing.md },
  lockCard: {
    alignItems: 'center',
    backgroundColor: t.card,
    borderColor: withOpacity(ATP_BRAND.lime, 0.3),
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  lockTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, color: t.texto },
  lockBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: t.textoSecundario,
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
  lockCtaPrimaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: t.textoSobreLima },
  lockHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: t.textoTenue,
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
    color: t.texto,
    textAlign: 'center',
  },
  loadingHint: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: t.textoTenue },
  priceRow: {
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.xs,
  },
  priceText: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  balanceText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: t.textoSecundario },
  shopLink: { paddingVertical: 6 },
  shopLinkText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  ownedBadge: {
    backgroundColor: t.flotante,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  ownedBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: t.textoSecundario,
    letterSpacing: 0.5,
  },
  reportContent: { padding: Spacing.md, paddingBottom: 60 },
  reportBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  reportBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto,
    letterSpacing: 1.5,
  },
});
