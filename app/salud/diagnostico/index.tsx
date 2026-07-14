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
import { ActivityIndicator, Alert, DeviceEventEmitter, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Card } from '@/src/components/ui/Card';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
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
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const LEVEL_LABELS: Record<number, string> = DX_LEVEL_LABELS;

/** hotfix 2da pasada: cada fuente faltante es un CTA navegable, no un chip muerto. */
const MISSING_ROUTES: Partial<Record<DxMissingKey, string>> = {
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
        'Tu diagnóstico sigue disponible aquí en pantalla. Actualiza a la última versión de la app para descargar el PDF.',
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
      Alert.alert('Sin cambios', 'Tu diagnóstico ya está al día: no hay datos nuevos que sintetizar.');
      return;
    }
    if (result.status === 'insufficient_h_plus') {
      haptic.warning();
      Alert.alert(
        'Te faltan H+',
        `Actualizar tu diagnóstico usa ${formatFull(quote?.cost ?? 0)} H+. Recarga o gánalos completando tu día.`,
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Conseguir H+', onPress: () => router.push('/economy/shop' as any) },
        ],
      );
      return;
    }
    haptic.warning();
    Alert.alert('Algo no salió', 'ARGOS no pudo actualizar tu diagnóstico. Suele ser cosa de red — intenta de nuevo.');
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
      ? 'Generar mi Diagnóstico · Regalo'
      : isPro
        ? (dx ? 'Actualizar mi Diagnóstico' : 'Generar mi Diagnóstico')
        : `Actualizar · ${formatFull(quote?.cost ?? 1000)} H+`;

  return (
    <MedicalDisclaimerGate>
      <Screen edges={[]}>
        <ScreenHeader title="Mi Diagnóstico" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* ── Nivel + estado ── */}
            <Animated.View entering={FadeInUp.delay(40).springify()}>
              <Card variant="accent" accentColor={ATP_BRAND.lime}>
                <LevelBadge level={dx?.quality_level ?? 1} />
                {dx?.summary_text ? (
                  <EliteText style={styles.summary}>{dx.summary_text}</EliteText>
                ) : (
                  <EliteText style={styles.summaryEmpty}>
                    Aún no tienes un diagnóstico. Genera el primero para que ARGOS
                    sintetice tus raíces funcionales desde tus datos.
                  </EliteText>
                )}
              </Card>
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
                            onPress={() => { haptic.light(); router.push(route as any); }}
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
            {history.length > 0 && (
              <Animated.View entering={FadeInUp.delay(240).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>HISTORIAL DE VERSIONES</SectionTitle>
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
                    ? 'Regalo — tu primer diagnóstico es sin costo de H+.'
                    : `${quote?.balance == null ? '' : `Tu balance: ${formatFull(quote.balance)} H+ · `}Se cobra sólo si hay datos nuevos.`}
                </EliteText>
              )}
            </Animated.View>
          </ScrollView>
        )}
      </Screen>
    </MedicalDisclaimerGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 60, gap: Spacing.xs },
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
  versionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 8, paddingHorizontal: 4,
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
