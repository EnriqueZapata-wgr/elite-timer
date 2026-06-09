/**
 * Edad ATP — pantalla de resultado. MEGA COMPLETION (Sprint 3 UIUX).
 * Lee TODAS las fuentes vía el orquestador, reproduce la cinemática la primera vez
 * (flag persistido) y muestra la Constellation + panel de fuentes (tappable).
 *
 * NOTA: el buzón pedía renombrar a result.tsx; se conserva result-preview.tsx para no
 * romper los links existentes (hub, tab YO, constellation). Ver COWORK_REPORT.
 * domain_scores siguen placeholder neutral hasta Sprint 5.
 */
import { useState, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { computeEdadAtpV2, loadUserData, countFields, type UnifiedUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { SubEdadConstellation } from '@/src/components/edad-atp/SubEdadConstellation';
import { CalculationCinematic } from '@/src/components/edad-atp/CalculationCinematic';
import { RecalculateDiff } from '@/src/components/edad-atp/RecalculateDiff';
import { EdadAtpShareCard } from '@/src/components/edad-atp/EdadAtpShareCard';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const CINEMATIC_FLAG = 'edad_atp_cinematic_seen';
const LAST_INTEGRAL = 'edad_atp_last_integral';

type SourceRow = { label: string; detail: string; done: boolean; route: string };

function buildSources(d: UnifiedUserData): SourceRow[] {
  const used = new Set(d.data_sources_used);
  const phenoNew = ['albumin_g_dl', 'alp_u_l', 'lymphocyte_pct', 'mcv_fl', 'rdw_cv_pct'] as const;
  const phenoCount = phenoNew.filter((k) => d[k] != null).length;
  const domainCount = Object.keys(d.sf_scores_by_domain ?? {}).length;
  const hasLabs = used.has('lab_results') || used.has('lab_uploads');
  const hasCognitive = d.reaction_time_simple_ms != null && d.reaction_time_choice_ms != null;
  return [
    { label: '🩸 Laboratorio', detail: hasLabs ? 'Disponibles' : 'Sin labs', done: hasLabs, route: '/edad-atp/biomarkers' },
    { label: '💪 Composición / vitals', detail: used.has('health_measurements') ? 'Disponibles' : 'Pendiente', done: used.has('health_measurements'), route: '/edad-atp/composition' },
    { label: '🧬 PhenoAge (manual)', detail: `${phenoCount}/5`, done: phenoCount === 5, route: '/edad-atp/biomarkers' },
    { label: '📋 Cuestionarios', detail: `${domainCount}/10`, done: domainCount >= 6, route: '/edad-atp/questionnaires' },
    { label: '🧠 Test cognitivo', detail: hasCognitive ? 'Disponible' : 'Pendiente', done: hasCognitive, route: '/edad-atp/cognitive' },
  ];
}

export default function ResultScreen() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const [ce, setCe] = useState(0);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [cinematic, setCinematic] = useState(false);
  const [prevIntegral, setPrevIntegral] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [error, setError] = useState(false);
  const shareRef = useRef<View>(null);

  async function handleShare() {
    if (!result) return;
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      analytics.track(ATP_EVENTS.EDAD_ATP_SHARED, { edad_integral: Math.round(result.edad_integral) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { /* compartir cancelado / no disponible */ }
  }

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      try {
      setError(false);
      const r = await computeEdadAtpV2(user.id);
      const data = await loadUserData(user.id);
      const seen = await AsyncStorage.getItem(CINEMATIC_FLAG);
      const prevStr = await AsyncStorage.getItem(LAST_INTEGRAL);
      const prev = prevStr != null ? parseFloat(prevStr) : null;
      if (prev != null && Math.abs(prev - r.edad_integral) >= 0.05) setPrevIntegral(prev);
      AsyncStorage.setItem(LAST_INTEGRAL, String(r.edad_integral));
      // Confetti: edad < cronológica, o mejora al recalcular ≥ 1 año (X3 si ≥ 5).
      const improvement = prev != null ? prev - r.edad_integral : 0;
      const younger = r.edad_integral < r.chronological_age;
      if (improvement >= 5) setConfetti(250);
      else if (younger || improvement >= 1) setConfetti(120);
      else setConfetti(0);
      setResult(r);
      setSources(buildSources(data));
      setCe((await computeCE(user.id)).ce_integral);
      if (!seen) { setCinematic(true); AsyncStorage.setItem(CINEMATIC_FLAG, '1'); }
      analytics.track(ATP_EVENTS.EDAD_ATP_RESULT_PREVIEWED, {
        edad_integral: Math.round(r.edad_integral),
        sources_used: data.data_sources_used.length,
      });
      if (data.data_sources_used.length > 0) {
        analytics.track(ATP_EVENTS.EDAD_ATP_DATA_PREPOPULATED, { sources_used: data.data_sources_used, fields_count: countFields(data) });
      }
      } catch {
        setError(true);
      }
    })();
  }, [user?.id]));

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Tu Edad ATP" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <EliteText variant="caption" style={styles.calc}>No se pudo calcular tu Edad ATP. Revisa tu conexión y vuelve a intentar.</EliteText>
        ) : !result ? (
          <EliteText variant="caption" style={styles.calc}>Calculando…</EliteText>
        ) : (
          <>
            <SubEdadConstellation result={result} onPressCenter={() => setCinematic(true)} />
            <EliteText variant="caption" style={styles.gold}>Gold standard ATP · CE {Math.round(ce)}%</EliteText>

            {prevIntegral != null ? <RecalculateDiff from={prevIntegral} to={result.edad_integral} /> : null}

            <EliteText variant="caption" style={styles.sourcesTitle}>📊 Fuentes que alimentaron el cálculo</EliteText>
            {sources.map((s) => (
              <Pressable key={s.label} onPress={() => router.push(s.route as any)} style={styles.sourceRow}>
                <EliteText variant="body" style={styles.sourceLabel}>{s.label}</EliteText>
                <EliteText variant="caption" style={[styles.sourceDetail, s.done && { color: Colors.neonGreen }]}>
                  {s.detail} {s.done ? '✓' : '⚠'}
                </EliteText>
              </Pressable>
            ))}

            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <EliteText variant="body" style={styles.shareBtnText}>Compartir mi Edad ATP</EliteText>
            </Pressable>

            <EliteText variant="caption" style={styles.note}>
              Toca una sub-edad para el desglose, o una fuente pendiente para completarla.
              domain_scores usan placeholder neutral (Sprint 5).
            </EliteText>
          </>
        )}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </ScrollView>

      {/* Tarjeta off-screen para captura de imagen al compartir. */}
      {result ? (
        <View style={styles.offscreen} pointerEvents="none">
          <View ref={shareRef} collapsable={false}>
            <EdadAtpShareCard result={result} format="story" />
          </View>
        </View>
      ) : null}

      <CalculationCinematic visible={cinematic} result={result} onDone={() => setCinematic(false)} />

      {confetti > 0 && !cinematic ? (
        <ConfettiCannon count={confetti} origin={{ x: 180, y: 0 }} autoStart fadeOut explosionSpeed={350} fallSpeed={2800} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  calc: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  gold: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  sourcesTitle: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: Spacing.md, marginBottom: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  sourceLabel: { color: Colors.textPrimary },
  sourceDetail: { color: Colors.textSecondary },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.sm },
  shareBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  shareBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
