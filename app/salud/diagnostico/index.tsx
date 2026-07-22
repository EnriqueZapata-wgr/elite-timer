/**
 * Card A — "Mi Diagnóstico Funcional" (DX+Intervenciones F2).
 *
 * Documento VIVO y versionado: nivel de calidad 1-5, "qué te falta" para subir,
 * raíces detectadas por ARGOS, timeline de versiones y botón para actualizar.
 *
 * Doctrina H+: actualizar cuesta H+ (precio server-side) para usuarios Base; Pro
 * lo tiene incluido. El cobro real es server-side (argos-proxy); aquí sólo se
 * comunica el precio y se maneja el 402 (insufficient).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, DeviceEventEmitter, ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { router , type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Card } from '@/src/components/ui/Card';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { formatFull } from '@/src/services/economy/format';
import { haptic } from '@/src/utils/haptics';
import { getCurrentDX, getDXHistory, getDXQuote, type FunctionalDxRow, type DxQuote } from '@/src/services/dx/dx-service';
import { generateDX, type GenerateDxResult } from '@/src/services/dx/dx-engine';
import { presenceFromSnapshot } from '@/src/services/dx/dx-engine-core';
import { computeDxQuality, DX_LEVEL_LABELS, type DxMissingKey } from '@/src/services/dx/dx-quality-core';
import { activeSourcesFromSnapshot, generateAndShareDxPdf } from '@/src/services/dx/dx-pdf-service';
import { ROOT_LABELS, type InterventionRoot } from '@/src/constants/intervention-vocab';
// Mega-Sprint B B2.3: Edad ATP como MÉTRICA aquí (no árbol paralelo). El motor
// V7/V6 (edad-atp-v2-service) queda INTOCADO — solo se LEE el resultado.
import { computeEdadAtpV2 } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import { formatEdadDeltaValue } from '@/src/services/edad-atp/edad-delta-core';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const LEVEL_LABELS: Record<number, string> = DX_LEVEL_LABELS;
// #71 (MB-8): imagen editorial de la Card A (antes sin imagen, card pelona).
const HERO_DIAGNOSTICO = require('@/assets/images/health-hub/diagnostico.png');

/** hotfix 2da pasada: cada fuente faltante es un CTA navegable, no un chip muerto. */
const MISSING_ROUTES: Partial<Record<DxMissingKey, Href>> = {
  historia_basica: '/historia-clinica',
  integral: '/historia-clinica/integral',
  areas: '/historia-clinica',
  habitos: '/historia-clinica/habitos_nutricionales',
  braverman: '/quizzes',
  quizzes: '/quizzes',
  labs: '/labs-guide',
  // geneticos: sin fuente aún (nivel 5 post-beta) → chip informativo sin ruta
};

function LevelBadge({ level }: { level: number }) {
  return (
    <View style={styles.levelBadge}>
      <EliteText style={styles.levelNum}>{level}</EliteText>
      <View>
        <EliteText style={styles.levelCaption}>NIVEL DE DIAGNÓSTICO</EliteText>
        <EliteText style={styles.levelName}>{LEVEL_LABELS[level] ?? '—'}</EliteText>
      </View>
      <View style={styles.levelDots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} style={[styles.dot, n <= level && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

export default function DiagnosticoScreen() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [dx, setDx] = useState<FunctionalDxRow | null>(null);
  const [history, setHistory] = useState<FunctionalDxRow[]>([]);
  // Edad ATP como métrica (B2.3): edad biológica + delta + CE. null = sin datos suficientes.
  const [edadAtp, setEdadAtp] = useState<{ edad: number; delta: number; ce: number } | null>(null);
  const [quote, setQuote] = useState<DxQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const startedRef = useRef(false);

  const firstName = ((user?.user_metadata?.full_name as string) || '').trim().split(' ')[0] || '';

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [current, hist, q] = await Promise.all([
      getCurrentDX(user.id),
      getDXHistory(user.id),
      getDXQuote(user.id),
    ]);
    setDx(current);
    setHistory(hist);
    setQuote(q);
    setLoading(false);
    // Edad ATP como métrica (fail-soft · gate CE≥30 = evaluación suficiente).
    try {
      const [edad, ce] = await Promise.all([computeEdadAtpV2(user.id), computeCE(user.id)]);
      if (ce.ce_integral >= 30 && Number.isFinite(edad.edad_integral)) {
        setEdadAtp({ edad: edad.edad_integral, delta: edad.delta_anos, ce: ce.ce_integral });
      } else {
        setEdadAtp(null);
      }
    } catch { setEdadAtp(null); }
  }, [user?.id]);

  useEffect(() => {
    if (startedRef.current || !user?.id) return;
    startedRef.current = true;
    load().catch(() => setLoading(false));
    const sub = DeviceEventEmitter.addListener('dx_changed', () => { load().catch(() => {}); });
    return () => sub.remove();
  }, [user?.id, load]);

  /** Genera el PDF entregable de la versión vigente y abre el share sheet. */
  const sharePdf = useCallback(async (row: FunctionalDxRow | null) => {
    if (!row || sharing) return;
    setSharing(true);
    const share = await generateAndShareDxPdf(row, firstName);
    setSharing(false);
    if (share === 'shared') {
      haptic.success();
    } else if (share === 'unavailable') {
      Alert.alert('Compartir no disponible', 'Tu dispositivo no permite compartir archivos desde la app.');
    } else {
      Alert.alert(
        'No se pudo generar el PDF',
        'Tu mapa funcional sigue disponible aquí en pantalla. Actualiza a la última versión de la app para descargar el PDF.',
      );
    }
  }, [sharing, firstName]);

  const onUpdate = useCallback(async () => {
    if (!user?.id || generating) return;
    haptic.medium();
    setGenerating(true);
    const result: GenerateDxResult = await generateDX(user.id, { manual: true });
    setGenerating(false);

    if (result.status === 'ok') {
      haptic.success();
      DeviceEventEmitter.emit('balance_changed');
      load().catch(() => {});
      // Doctrina Enrique: "Actualizar" regenera el análisis Y produce el
      // entregable — el PDF se genera de la versión recién persistida.
      const fresh = await getCurrentDX(user.id);
      await sharePdf(fresh);
      return;
    }
    if (result.status === 'cache_hit') {
      Alert.alert('Sin cambios', 'Tu mapa funcional ya está al día: no hay datos nuevos que sintetizar.');
      return;
    }
    if (result.status === 'insufficient_h_plus') {
      haptic.warning();
      Alert.alert(
        'Te faltan H+',
        `Actualizar tu mapa funcional usa ${formatFull(quote?.cost ?? 0)} H+. Recarga o gánalos completando tu día.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/shop') },
        ],
      );
      return;
    }
    haptic.warning();
    Alert.alert('Algo no salió', 'ARGOS no pudo actualizar tu mapa funcional. Suele ser cosa de red — intenta de nuevo.');
  }, [user?.id, generating, quote?.cost, load, sharePdf]);

  const quality = dx ? computeDxQuality(presenceFromSnapshot(dx.sources_snapshot)) : null;
  const roots = (dx?.roots_detected ?? []) as { root_key: InterventionRoot; severity: number; confidence: number }[];
  const activeSources = dx ? activeSourcesFromSnapshot(dx.sources_snapshot) : [];

  // DX F4 / bug #6: el regalo del 1er DX (isFirstFree) va PRIMERO — antes el
  // branch isPro tenía precedencia y un usuario Pro/clinician sin DX nunca veía
  // el copy "Regalo" aunque el server sí aplicara costo 0.
  const ctaLabel = generating
    ? 'ARGOS sintetizando…'
    : quote?.isFirstFree
      ? 'Generar mi Mapa Funcional · Regalo'
      : isPro
        ? (dx ? 'Actualizar mi Mapa Funcional' : 'Generar mi Mapa Funcional')
        : `Actualizar · ${formatFull(quote?.cost ?? 1000)} H+`;

  return (
    <MedicalDisclaimerGate>
      <Screen edges={[]}>
        <ScreenHeader title="Mi Mapa Funcional" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* ── Card A: Nivel + estado, sobre imagen editorial (#71) ── */}
            <Animated.View entering={FadeInUp.delay(40).springify()}>
              <ImageBackground source={HERO_DIAGNOSTICO} style={styles.heroCard} imageStyle={styles.heroImg}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.7)', 'rgba(10,10,10,0.96)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.heroInner}>
                  <LevelBadge level={dx?.quality_level ?? 1} />
                  {dx?.summary_text ? (
                    <EliteText style={styles.summary}>{dx.summary_text}</EliteText>
                  ) : (
                    <EliteText style={styles.summaryEmpty}>
                      Aún no tienes un mapa funcional. Genera el primero para que ARGOS
                      sintetice tus raíces funcionales desde tus datos.
                    </EliteText>
                  )}
                </View>
              </ImageBackground>
            </Animated.View>

            {/* ── Qué te falta ── */}
            {quality?.nextHint && (
              <Animated.View entering={FadeInUp.delay(90).springify()}>
                <Card variant="elevated" style={styles.hintCard}>
                  <EliteText style={styles.hintLabel}>QUÉ TE FALTA PARA SUBIR</EliteText>
                  <EliteText style={styles.hintText}>{quality.nextHint}</EliteText>
                  {quality.missing.length > 0 && (
                    <View style={styles.missingRow}>
                      {quality.missing.map((m) => {
                        const route = MISSING_ROUTES[m.key];
                        if (!route) {
                          return (
                            <View key={m.key} style={styles.missingChip}>
                              <EliteText style={styles.missingChipText}>{m.label} · próximamente</EliteText>
                            </View>
                          );
                        }
                        return (
                          <AnimatedPressable
                            key={m.key}
                            onPress={() => { haptic.light(); router.push(route); }}
                            style={styles.missingChipCta}
                          >
                            <EliteText style={styles.missingChipCtaText}>{m.label}</EliteText>
                            <EliteText style={styles.missingChipArrow}>›</EliteText>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  )}
                </Card>
              </Animated.View>
            )}

            {/* ── Edad ATP como métrica (B2.3 · motor V7/V6 intocado, solo se lee) ── */}
            {edadAtp && (
              <Animated.View entering={FadeInUp.delay(130).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>EDAD ATP</SectionTitle>
                <AnimatedPressable
                  onPress={() => { haptic.light(); router.push('/edad-atp/result-preview'); }}
                  style={styles.edadCard}
                >
                  <View style={{ flex: 1 }}>
                    <EliteText style={styles.edadNum}>{edadAtp.edad.toFixed(1)} <EliteText style={styles.edadUnit}>años biológicos</EliteText></EliteText>
                    <EliteText style={styles.edadMeta}>
                      {/* P1.6: el signo del delta vive en edad-delta-core (aquí se
                          mostró invertido una vez — nunca más se calcula a mano). */}
                      {formatEdadDeltaValue(edadAtp.delta)}
                      {'  ·  '}CE {Math.round(edadAtp.ce)}%
                    </EliteText>
                  </View>
                  <EliteText style={styles.edadArrow}>→</EliteText>
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* ── Raíces detectadas ── */}
            {roots.length > 0 && (
              <Animated.View entering={FadeInUp.delay(140).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>RAÍCES DETECTADAS</SectionTitle>
                {roots.map((r) => (
                  <View key={r.root_key} style={styles.rootRow}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={styles.rootName}>{ROOT_LABELS[r.root_key] ?? r.root_key}</EliteText>
                      <EliteText style={styles.rootMeta}>
                        Confianza {Math.round((r.confidence ?? 0) * 100)}%
                      </EliteText>
                    </View>
                    <View style={styles.sevBar}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <View key={n} style={[styles.sevPip, n <= r.severity && styles.sevPipOn]} />
                      ))}
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Sprint 1.5 B (doctrina ninguna pantalla aislada): el DX no es un
                reporte muerto — su destino en el journey es Mi Protocolo. */}
            {dx && (
              <Animated.View entering={FadeInUp.delay(165).springify()}>
                <AnimatedPressable
                  onPress={() => { haptic.medium(); router.push('/salud/intervenciones'); }}
                  style={styles.protocolCta}
                >
                  <EliteText style={{ fontSize: 16 }}>🧭</EliteText>
                  <View style={{ flex: 1 }}>
                    <EliteText style={styles.protocolCtaTitle}>
                      Ver las intervenciones que ATP te sugiere
                    </EliteText>
                    <EliteText style={styles.protocolCtaSub}>
                      Tu DX alimenta Mi Protocolo — de la raíz a la acción diaria
                    </EliteText>
                  </View>
                  <EliteText style={styles.protocolCtaArrow}>→</EliteText>
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* ── Fuentes que lo alimentan ── */}
            {activeSources.length > 0 && (
              <Animated.View entering={FadeInUp.delay(190).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>FUENTES QUE LO ALIMENTAN</SectionTitle>
                <View style={styles.missingRow}>
                  {activeSources.map((s) => (
                    <View key={s} style={styles.sourceChip}>
                      <EliteText style={styles.sourceChipText}>{s}</EliteText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ── Timeline de versiones ── */}
            {/* Sprint 2 B (regla Enrique "todo dentro de cards, no widgets"): las filas
                flotaban sueltas sobre el fondo — ahora viven en card contenedora
                ELEVATION[1], mismo patrón #67 que los sistemas de Historia Clínica. */}
            {history.length > 0 && (
              <Animated.View entering={FadeInUp.delay(240).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>HISTORIAL DE VERSIONES</SectionTitle>
                <View style={styles.versionsCard}>
                  {history.map((h) => (
                    <View key={h.id} style={styles.versionRow}>
                      <View style={[styles.versionDot, h.is_current && styles.versionDotOn]} />
                      <View style={{ flex: 1 }}>
                        <EliteText style={styles.versionTitle}>
                          v{h.version} · Nivel {h.quality_level}
                          {h.is_current ? '  · vigente' : ''}
                        </EliteText>
                        <EliteText style={styles.versionMeta}>
                          {new Date(h.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {h.generated_by === 'manual' ? ' · manual' : h.generated_by === 'argos_auto' ? ' · auto' : ''}
                        </EliteText>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ── CTA actualizar (regenera análisis + produce PDF entregable) ── */}
            <Animated.View entering={FadeIn.delay(300)}>
              <AnimatedPressable onPress={onUpdate} disabled={generating || sharing} style={[styles.cta, (generating || sharing) && { opacity: 0.6 }]}>
                {generating && <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />}
                <EliteText style={styles.ctaText}>{ctaLabel}</EliteText>
              </AnimatedPressable>
              {dx && (
                <AnimatedPressable onPress={() => sharePdf(dx)} disabled={sharing || generating} style={[styles.ctaSecondary, (sharing || generating) && { opacity: 0.6 }]}>
                  {sharing && <ActivityIndicator size="small" color={ATP_BRAND.lime} style={{ marginRight: 8 }} />}
                  <EliteText style={styles.ctaSecondaryText}>
                    {sharing ? 'Generando PDF…' : 'DESCARGAR / COMPARTIR PDF'}
                  </EliteText>
                </AnimatedPressable>
              )}
              {(quote?.isFirstFree || !isPro) && (
                <EliteText style={styles.ctaHint}>
                  {quote?.isFirstFree
                    // Bug #6: hint visible también para Pro cuando es el 1er DX.
                    ? 'Regalo — tu primer mapa funcional es sin costo de H+.'
                    : `${quote?.balance == null ? '' : `Tu balance: ${formatFull(quote.balance)} H+ · `}Se cobra sólo si hay datos nuevos.`}
                </EliteText>
              )}
            </Animated.View>
            {/* Compliance S4: footer de resultados (posicionamiento §2) */}
            <ResultDisclaimerFooter />
          </ScrollView>
        )}
      </Screen>
    </MedicalDisclaimerGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 60, gap: Spacing.xs },
  protocolCta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.08),
    borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.3),
    borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md,
  },
  protocolCtaTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: ATP_BRAND.lime },
  protocolCtaSub: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, marginTop: 2 },
  protocolCtaArrow: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: ATP_BRAND.lime },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  levelNum: {
    fontFamily: Fonts.extraBold, fontSize: 40, color: ATP_BRAND.lime,
    width: 52, textAlign: 'center',
  },
  levelCaption: { fontFamily: Fonts.bold, fontSize: 9, color: TEXT.tertiary, letterSpacing: 1.5 },
  levelName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  levelDots: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotOn: { backgroundColor: ATP_BRAND.lime },
  // #71: Card A editorial (imagen + overlay)
  heroCard: { borderRadius: Radius.lg, overflow: 'hidden', minHeight: 150, justifyContent: 'flex-end' },
  heroImg: { resizeMode: 'cover' },
  heroInner: { padding: Spacing.md },
  summary: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, lineHeight: 20, marginTop: Spacing.sm },
  summaryEmpty: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.tertiary, lineHeight: 20, marginTop: Spacing.sm },
  hintCard: { marginTop: Spacing.sm },
  hintLabel: { fontFamily: Fonts.bold, fontSize: 9, color: ATP_BRAND.lime, letterSpacing: 1.5 },
  hintText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary, marginTop: 4, lineHeight: 19 },
  missingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  missingChip: {
    backgroundColor: ELEVATION[2].bg, borderRadius: Radius.xs,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  missingChipText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary },
  missingChipCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1), borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.lime, 0.25), borderRadius: Radius.xs,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  missingChipCtaText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  missingChipArrow: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: ATP_BRAND.lime, marginTop: -1 },
  rootRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6,
  },
  // Edad ATP métrica (B2.3)
  edadCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.3),
    borderRadius: Radius.md, padding: Spacing.md,
  },
  edadNum: { fontFamily: Fonts.extraBold, fontSize: 24, color: ATP_BRAND.lime },
  edadUnit: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.tertiary },
  edadMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary, marginTop: 2 },
  edadArrow: { fontFamily: Fonts.bold, fontSize: 20, color: ATP_BRAND.lime },
  rootName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  rootMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, marginTop: 2 },
  sevBar: { flexDirection: 'row', gap: 3 },
  sevPip: { width: 6, height: 16, borderRadius: 2, backgroundColor: '#2a2a2a' },
  sevPipOn: { backgroundColor: ATP_BRAND.lime },
  sourceChip: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1), borderRadius: Radius.xs,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  sourceChipText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  // Sprint 2 B: contenedora ELEVATION[1] (patrón #67 — nada flota sobre el fondo).
  versionsCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 4, paddingHorizontal: Spacing.md,
  },
  versionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 8,
  },
  versionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#333' },
  versionDotOn: { backgroundColor: ATP_BRAND.lime },
  versionTitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  versionMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, marginTop: 2 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md,
    paddingVertical: 14, marginTop: Spacing.lg,
  },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000' },
  ctaSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.4),
    borderRadius: Radius.md, paddingVertical: 12, marginTop: Spacing.sm,
  },
  ctaSecondaryText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: ATP_BRAND.lime, letterSpacing: 1 },
  ctaHint: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, textAlign: 'center', marginTop: 8 },
});
