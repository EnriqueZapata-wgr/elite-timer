/**
 * ¿POR QUÉ ESTAS PRÁCTICAS? — narrativa ARGOS (Megabuzón 2da pasada B.4).
 *
 * 7-sep-2026 (pivote limpio): su puerta era la lista "Mi Protocolo", que se
 * retiró. Ahora se entra desde el detalle de cada práctica
 * (/salud/intervenciones/[key]), y el copy dejó de decir "intervenciones".
 *
 * PREMIUM (16-ago-2026): costaba 280 H+ y era gratis solo para Pro. Esa
 * asimetría se acabó: viene incluido para todo miembro. Se fueron el precio,
 * el saldo y la leyenda "incluido en tu plan Pro", que ya no distingue nada.
 *
 * Se conserva el cache por set (mismo mapa + mismas prácticas = misma
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
import { CandadoNivel, destinoCandado } from '@/src/components/ui/CandadoNivel';
import { useSubscription } from '@/src/hooks/useSubscription';
import { candadoDeVentaCierra } from '@/src/services/subscription/limites-free-core';
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
  'Cruzando tus raíces con lo que traes encendido…',
  'Conectando cada práctica con su porqué…',
  'Redactando tu explicación personalizada…',
];

export default function InterventionRationaleScreen() {
  // MB-31B2: tokens del tema (oscuro idéntico; claro = acero).
  const t = useAppTheme().tokens;
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const analytics = useAnalytics();
  /**
   * 7-sep-2026 (pivote limpio): ESTA pantalla es la que exige nivel, no el
   * detalle de la práctica. El detalle son datos de la persona y se abre para
   * todos; aquí se dispara una generación con modelo (costo real por corrida),
   * y hasta hoy su acceso estaba gateado por fuera: las dos puertas que tenía
   * eran la app Protocolos (minTier premium) y la tarjeta de HOY con su
   * CandadoNivel. Al retirarse la app, la puerta nueva desde el detalle la
   * habría dejado abierta para Free. El candado se muda adentro, que es donde
   * debió estar siempre. Fail open igual que el resto (doctrina del proxy):
   * mientras el nivel carga o no se pudo leer, no se cierra nada.
   */
  const { tier, isLoading: nivelCargando, nivelNoSePudoLeer } = useSubscription();
  // 7-sep-2026 (VENTA_AL_PUBLICO): el candado de venta lo decide una sola
  // función. Con la venta al público apagada nunca cierra.
  const conCandado = !nivelCargando && candadoDeVentaCierra(tier, nivelNoSePudoLeer);
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
    if (startedRef.current || !user?.id || conCandado) return;
    startedRef.current = true;
    getRationaleQuote(user.id).then((q) => {
      setQuote(q);
      if (!q.hasDx) { setState('no_dx'); return; }
      if (!q.hasProtocol) { setState('no_protocol'); return; }
      if (q.hasCachedRationale) { generate(); return; } // ya existe, directo
      setState('offer');
    }).catch(() => setState('error'));
  }, [user?.id, generate, conCandado]);

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

      {conCandado && (
        <View style={styles.lockContainer}>
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.lockCard}>
            <EliteText style={{ fontSize: 44 }}>🧭</EliteText>
            <EliteText style={styles.lockTitle}>¿Por qué estas prácticas?</EliteText>
            <EliteText style={styles.lockBody}>
              ARGOS lee tu mapa funcional y te escribe de dónde sale cada
              práctica que traes encendida. Esta explicación es de Pro.
            </EliteText>
            <CandadoNivel appKey="por-que-practicas" nivel="premium" tocable={false} />
            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push(destinoCandado('por-que-practicas', 'premium')); }}
              style={styles.lockCtaPrimary}
            >
              <EliteText style={styles.lockCtaPrimaryText}>Ver qué trae Pro</EliteText>
            </AnimatedPressable>
          </Animated.View>
        </View>
      )}

      {!conCandado && state === 'offer' && quote && (
        <View style={styles.lockContainer}>
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.lockCard}>
            <EliteText style={{ fontSize: 44 }}>🧭</EliteText>
            {/* 7-sep-2026 (pivote limpio): el copy decía "intervenciones" y
                "tu protocolo". La persona ve prácticas y su objetivo; los
                nombres internos (user_interventions) no se tocan. */}
            <EliteText style={styles.lockTitle}>¿Por qué estas prácticas?</EliteText>
            <EliteText style={styles.lockBody}>
              ARGOS conecta las raíces de tu Mapa Funcional con cada práctica
              que traes encendida: de dónde sale cada una y qué esperar.
            </EliteText>
            <AnimatedPressable
              onPress={() => { haptic.medium(); generate(); }}
              style={styles.lockCtaPrimary}
            >
              <EliteText style={styles.lockCtaPrimaryText}>Generar mi explicación</EliteText>
            </AnimatedPressable>
            <EliteText style={styles.lockHint}>
              Queda tuya mientras no cambien tus prácticas ni tu mapa funcional.
            </EliteText>
          </Animated.View>
        </View>
      )}

      {!conCandado && (state === 'loading' || state === 'idle') && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          <Animated.View key={phraseIdx} entering={FadeIn.duration(500)}>
            <EliteText style={styles.loadingText}>{LOADING_PHRASES[phraseIdx]}</EliteText>
          </Animated.View>
          <EliteText style={styles.loadingHint}>Esto toma menos de un minuto.</EliteText>
        </View>
      )}

      {!conCandado && state === 'no_dx' && (
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

      {!conCandado && state === 'no_protocol' && (
        <View style={styles.loadingContainer}>
          <EliteText style={{ fontSize: 40 }}>🎯</EliteText>
          <EliteText style={styles.lockTitle}>Aún no traes prácticas</EliteText>
          <EliteText style={styles.lockBody}>
            Elige tu objetivo y él las enciende por ti. Vuelve aquí para
            entender el porqué de cada una.
          </EliteText>
          <AnimatedPressable
            onPress={() => { haptic.medium(); router.back(); }}
            style={styles.lockCtaPrimary}
          >
            <EliteText style={styles.lockCtaPrimaryText}>Volver</EliteText>
          </AnimatedPressable>
        </View>
      )}

      {!conCandado && state === 'error' && (
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

      {!conCandado && state === 'done' && markdown && (
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
    // 7-sep-2026: sinDatos es el color de "no hay dato", no tinta de texto
    // (candado de la casa en verifica.js). El aviso legal se lee con textoTenue.
    color: t.textoTenue,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
  },
});
