/**
 * ¿POR QUÉ ESTAS INTERVENCIONES? — narrativa ARGOS (Megabuzón 2da pasada B.4).
 * Doctrina H+: se COBRA con Protones (280 H+, precio server-side; Pro efectivo
 * gratis — lo decide argos-proxy). Cache por set: mismo DX + mismo protocolo =
 * releer gratis. Precio y balance visibles antes del tap (consentimiento).
 * Patrón visual de app/braverman-premium.tsx.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, DeviceEventEmitter, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { formatFull } from '@/src/services/economy/format';
import {
  generateInterventionRationale,
  getRationaleQuote,
  type RationaleQuote,
  type RationaleResult,
} from '@/src/services/interventions/intervention-rationale-service';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const LOADING_PHRASES = [
  'ARGOS está leyendo tu mapa funcional…',
  'Cruzando tus raíces con tu protocolo…',
  'Conectando cada intervención con su porqué…',
  'Redactando tu explicación personalizada…',
];

export default function InterventionRationaleScreen() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [state, setState] = useState<'idle' | 'offer' | 'loading' | 'done' | 'error' | 'no_dx' | 'no_protocol'>('idle');
  const [quote, setQuote] = useState<RationaleQuote | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [wasCached, setWasCached] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const startedRef = useRef(false);

  const generate = useCallback(async () => {
    if (!user?.id) return;
    setState('loading');
    const result: RationaleResult = await generateInterventionRationale(user.id);
    if (result.status === 'ok') {
      haptic.success();
      if (!result.cached) {
        analytics.track(ATP_EVENTS.INTERVENTION_RATIONALE_PURCHASED, {});
        // Cobro exitoso (server-side) → refrescar pill de economía (regla #5).
        DeviceEventEmitter.emit('balance_changed');
      }
      setMarkdown(result.markdown);
      setWasCached(result.cached);
      setState('done');
      return;
    }
    if (result.status === 'insufficient_h_plus') {
      haptic.warning();
      setState('offer');
      Alert.alert(
        'Te faltan H+',
        `Esta explicación usa ${formatFull(quote?.cost ?? 280)} H+. Recarga o gana más completando tu día.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/shop') },
        ],
      );
      return;
    }
    if (result.status === 'no_dx') { setState('no_dx'); return; }
    if (result.status === 'no_protocol') { setState('no_protocol'); return; }
    setState('error');
  }, [user?.id, quote?.cost, analytics]);

  // Al entrar: precio + balance. Si ya está cacheado lo muestra directo GRATIS;
  // si no, card previa con consentimiento explícito.
  useEffect(() => {
    if (startedRef.current || !user?.id) return;
    startedRef.current = true;
    getRationaleQuote(user.id).then((q) => {
      setQuote(q);
      if (!q.hasDx) { setState('no_dx'); return; }
      if (!q.hasProtocol) { setState('no_protocol'); return; }
      if (q.hasCachedRationale) { generate(); return; } // gratis, directo
      setState('offer');
    }).catch(() => setState('error'));
  }, [user?.id, generate]);

  useEffect(() => {
    if (state !== 'loading') return;
    const interval = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [state]);

  const canAfford = quote?.isPro || quote?.balance == null || quote.balance >= (quote?.cost ?? 0);

  return (
    <Screen edges={[]}>
      <ScreenHeader title="¿Por qué esto?" onBack={() => router.back()} />

      {state === 'offer' && quote && (
        <View style={styles.lockContainer}>
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.lockCard}>
            <EliteText style={{ fontSize: 44 }}>🧭</EliteText>
            <EliteText style={styles.lockTitle}>¿Por qué estas intervenciones?</EliteText>
            <EliteText style={styles.lockBody}>
              ARGOS conecta las raíces de tu Mapa Funcional con cada
              intervención de tu protocolo: qué ataca cada una y qué esperar.
            </EliteText>
            <View style={styles.priceRow}>
              {quote.isPro ? (
                <EliteText style={styles.priceText}>✦ Incluido en tu plan Pro</EliteText>
              ) : (
                <>
                  <EliteText style={styles.priceText}>💎 Usa {formatFull(quote.cost)} H+</EliteText>
                  <EliteText style={styles.balanceText}>
                    Tu balance: {quote.balance == null ? '…' : `${formatFull(quote.balance)} H+`}
                  </EliteText>
                </>
              )}
            </View>
            <AnimatedPressable
              onPress={() => { haptic.medium(); generate(); }}
              style={styles.lockCtaPrimary}
            >
              <EliteText style={styles.lockCtaPrimaryText}>
                {quote.isPro ? 'Generar mi explicación' : `Generar (${formatFull(quote.cost)} H+)`}
              </EliteText>
            </AnimatedPressable>
            {!canAfford && (
              <AnimatedPressable
                onPress={() => { haptic.light(); router.push('/economy/shop'); }}
                style={styles.shopLink}
              >
                <EliteText style={styles.shopLinkText}>Te faltan H+ — conseguir más →</EliteText>
              </AnimatedPressable>
            )}
            <EliteText style={styles.lockHint}>
              Queda tuya mientras no cambie tu protocolo ni tu mapa funcional — releer es gratis.
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
          <EliteText style={styles.loadingHint}>Esto toma menos de un minuto.</EliteText>
        </View>
      )}

      {state === 'no_dx' && (
        <View style={styles.loadingContainer}>
          <EliteText style={{ fontSize: 40 }}>🧬</EliteText>
          <EliteText style={styles.lockTitle}>Primero tu mapa funcional</EliteText>
          <EliteText style={styles.lockBody}>
            La explicación se construye sobre tu Mapa Funcional vigente.
          </EliteText>
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.push('/salud/diagnostico'); }}
            style={styles.lockCtaPrimary}
          >
            <EliteText style={styles.lockCtaPrimaryText}>Generar mi mapa funcional</EliteText>
          </AnimatedPressable>
        </View>
      )}

      {state === 'no_protocol' && (
        <View style={styles.loadingContainer}>
          <EliteText style={{ fontSize: 40 }}>🎯</EliteText>
          <EliteText style={styles.lockTitle}>Aún no tienes protocolo</EliteText>
          <EliteText style={styles.lockBody}>
            Activa intervenciones sugeridas por el motor y vuelve aquí para
            entender el porqué de cada una.
          </EliteText>
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.back(); }}
            style={styles.lockCtaPrimary}
          >
            <EliteText style={styles.lockCtaPrimaryText}>Ver sugeridas</EliteText>
          </AnimatedPressable>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.loadingContainer}>
          <EliteText style={styles.lockTitle}>Algo no salió</EliteText>
          <EliteText style={styles.lockBody}>
            ARGOS no pudo generar tu explicación. Suele ser cosa de red — intenta de nuevo.
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
                <EliteText style={styles.reportBadgeText}>ANÁLISIS ARGOS · TU PROTOCOLO</EliteText>
              </View>
              <View style={styles.ownedBadge}>
                <EliteText style={styles.ownedBadgeText}>
                  {wasCached ? '✓ Ya la tienes' : '✓ Tuya'} — releer es gratis
                </EliteText>
              </View>
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
              }}
            >
              {markdown}
            </Markdown>
            <EliteText style={styles.disclaimer}>
              Esta explicación es educativa y no sustituye la orientación de un
              profesional de la salud.
            </EliteText>
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
  lockTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl, color: TEXT.primary, textAlign: 'center' },
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
  priceRow: { alignItems: 'center', gap: 2, marginTop: Spacing.xs },
  priceText: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: ATP_BRAND.lime },
  balanceText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary },
  shopLink: { paddingVertical: 6 },
  shopLinkText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: ATP_BRAND.lime },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  ownedBadge: {
    backgroundColor: ELEVATION[2].bg,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  ownedBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, color: TEXT.secondary, letterSpacing: 0.5 },
  reportContent: { padding: Spacing.md, paddingBottom: 60 },
  reportBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  reportBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: ATP_BRAND.lime, letterSpacing: 1.5 },
  disclaimer: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: TEXT.muted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
  },
});
