/**
 * ¿POR QUÉ ESTAS INTERVENCIONES? — narrativa ARGOS (Megabuzón 2da pasada B.4).
 *
 * PREMIUM (16-ago-2026): costaba 280 H+ y era gratis solo para Pro. Esa
 * asimetría se acabó: viene incluido para todo miembro. Se fueron el precio,
 * el saldo y la leyenda "incluido en tu plan Pro", que ya no distingue nada.
 *
 * Se conserva el cache por set (mismo mapa + mismo protocolo = misma
 * explicación, sin volver a llamar al modelo): eso es control de costo, no
 * cobro, y el usuario nunca lo vio.
 */
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import {
  generateInterventionRationale,
  getRationaleQuote,
  type RationaleQuote,
  type RationaleResult,
} from '@/src/services/interventions/intervention-rationale-service';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ORB_SAFE_BOTTOM } from '@/src/components/argos/ArgosFloatingButton';

const LOADING_PHRASES = [
  'ARGOS está leyendo tu mapa funcional…',
  'Cruzando tus raíces con tu protocolo…',
  'Conectando cada intervención con su porqué…',
  'Redactando tu explicación personalizada…',
];

export default function InterventionRationaleScreen() {
  // MB-31B2: tokens del tema (oscuro idéntico; claro = acero).
  const t = useAppTheme().tokens;
  const styles = useMemo(() => makeStyles(t), [t]);
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
      // Se sigue midiendo la primera generación: es uso real, ya no una compra.
      if (!result.cached) analytics.track(ATP_EVENTS.INTERVENTION_RATIONALE_PURCHASED, {});
      setMarkdown(result.markdown);
      setWasCached(result.cached);
      setState('done');
      return;
    }
    if (result.status === 'no_dx') { setState('no_dx'); return; }
    if (result.status === 'no_protocol') { setState('no_protocol'); return; }
    setState('error');
  }, [user?.id, analytics]);

  // Si ya está cacheado se muestra directo; si no, card previa que explica
  // qué vas a recibir.
  useEffect(() => {
    if (startedRef.current || !user?.id) return;
    startedRef.current = true;
    getRationaleQuote(user.id).then((q) => {
      setQuote(q);
      if (!q.hasDx) { setState('no_dx'); return; }
      if (!q.hasProtocol) { setState('no_protocol'); return; }
      if (q.hasCachedRationale) { generate(); return; } // ya existe, directo
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

  // B-5 (MB-12): markdown de LLM sin disclaimer → gate obligatorio.
  return (
    <MedicalDisclaimerGate>
    <Screen edges={[]} themed>
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
            <AnimatedPressable
              onPress={() => { haptic.medium(); generate(); }}
              style={styles.lockCtaPrimary}
            >
              <EliteText style={styles.lockCtaPrimaryText}>Generar mi explicación</EliteText>
            </AnimatedPressable>
            <EliteText style={styles.lockHint}>
              Queda tuya mientras no cambie tu protocolo ni tu mapa funcional.
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
            ARGOS no pudo generar tu explicación. Suele ser cosa de red: intenta de nuevo.
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
                  {wasCached ? '✓ Ya la tienes' : '✓ Tuya'} · releer es gratis
                </EliteText>
              </View>
            </View>
            <Markdown
              style={{
                body: { color: t.texto, fontSize: 14, lineHeight: 22 },
                heading2: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 8 },
                heading3: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 4 },
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
  lockTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl, color: t.texto, textAlign: 'center' },
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
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  ownedBadge: {
    backgroundColor: t.flotante,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  ownedBadgeText: { fontFamily: Fonts.semiBold, fontSize: 10, color: t.textoSecundario, letterSpacing: 0.5 },
  // BLOQ-4: el disclaimer médico es el ÚLTIMO nodo del scroll, así que con 60
  // quedaba tapado siempre, no de paso. Texto de cumplimiento cortado.
  reportContent: { padding: Spacing.md, paddingBottom: ORB_SAFE_BOTTOM },
  reportBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  reportBadgeText: { fontFamily: Fonts.bold, fontSize: 10, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, letterSpacing: 1.5 },
  disclaimer: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: t.sinDatos,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
  },
});
