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
import { ScrollView, StyleSheet, View } from 'react-native';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { router, useFocusEffect , type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
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
import { playImprove, loadSoundPref } from '@/src/components/edad-atp/edad-sound';
import { RecalculateDiff } from '@/src/components/edad-atp/RecalculateDiff';
import { EdadAtpShareCard } from '@/src/components/edad-atp/EdadAtpShareCard';
import { CeStars } from '@/src/components/edad-atp/CeStars';
import { loadDatasetEntries } from '@/src/services/edad-atp/dataset-snapshot';
import { computeDatasetHash } from '@/src/services/edad-atp/dataset-hash';
import { getLastCalc, saveLastCalc, recalcStatus } from '@/src/services/edad-atp/recalc-gate';
import { getLocalToday } from '@/src/utils/date-helpers';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';

/** DD/MM desde YYYY-MM-DD para el copy de "sin cambios". */
function ddmm(iso: string): string { const [, m, d] = iso.split('-'); return d && m ? `${d}/${m}` : iso; }

const CINEMATIC_FLAG = 'edad_atp_cinematic_seen';
const LAST_INTEGRAL = 'edad_atp_last_integral';

type SourceRow = { label: string; detail: string; done: boolean; route: Href };

function buildSources(d: UnifiedUserData): SourceRow[] {
  const used = new Set(d.data_sources_used);
  const phenoNew = ['albumin_g_dl', 'alp_u_l', 'lymphocyte_pct', 'mcv_fl', 'rdw_cv_pct'] as const;
  const phenoCount = phenoNew.filter((k) => d[k] != null).length;
  const domainCount = Object.keys(d.sf_scores_by_domain ?? {}).length;
  const hasLabs = used.has('lab_values');
  const hasCognitive = d.reaction_time_simple_ms != null && d.reaction_time_choice_ms != null;
  return [
    { label: '🩸 Laboratorio', detail: hasLabs ? 'Disponibles' : 'Sin labs', done: hasLabs, route: '/edad-atp/biomarkers' },
    { label: '💪 Composición / vitals', detail: used.has('health_measurements') ? 'Disponibles' : 'Pendiente', done: used.has('health_measurements'), route: '/edad-atp/composition' },
    { label: '🧬 PhenoAge (manual)', detail: `${phenoCount}/5`, done: phenoCount === 5, route: '/edad-atp/biomarkers' },
    { label: '📋 Cuestionarios', detail: `${domainCount}/10`, done: domainCount >= 6, route: '/edad-atp/questionnaires' },
    { label: '🧠 Test cognitivo', detail: hasCognitive ? 'Disponible' : 'Pendiente', done: hasCognitive, route: '/edad-atp/cognitive' },
  ];
}

function ResultScreen() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const [ce, setCe] = useState(0);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [cinematic, setCinematic] = useState(false);
  const [prevIntegral, setPrevIntegral] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [error, setError] = useState(false);
  const [calcState, setCalcState] = useState<'idle' | 'calculating'>('idle');
  const [unchanged, setUnchanged] = useState<{ at: string } | null>(null);
  const shareRef = useRef<View>(null);

  const run = useCallback(async () => {
    if (!user?.id) return;
    setCalcState('calculating');
    try {
      setError(false);
      // #69: hidratar el toggle de sonidos ANTES de que la cinemática/mejora suene.
      loadSoundPref().catch(() => {});
      // Gating (#15): hash del set actual vs el del último cálculo (antes de recalcular).
      const [entries, last] = await Promise.all([loadDatasetEntries(user.id), getLastCalc(user.id)]);
      const currentHash = computeDatasetHash(entries);
      const status = recalcStatus(currentHash, last);
      setUnchanged(status.unchanged && status.lastAt ? { at: status.lastAt } : null);

      const r = await computeEdadAtpV2(user.id);
      const data = await loadUserData(user.id);
      const seen = await AsyncStorage.getItem(CINEMATIC_FLAG);
      const prevStr = await AsyncStorage.getItem(LAST_INTEGRAL);
      const prev = prevStr != null ? parseFloat(prevStr) : null;
      if (prev != null && Math.abs(prev - r.edad_integral) >= 0.05) {
        setPrevIntegral(prev);
        analytics.track(ATP_EVENTS.EDAD_ATP_RECALCULATED, { from: Math.round(prev * 10) / 10, to: Math.round(r.edad_integral * 10) / 10 });
      }
      AsyncStorage.setItem(LAST_INTEGRAL, String(r.edad_integral));
      const improvement = prev != null ? prev - r.edad_integral : 0;
      const younger = r.edad_integral < r.chronological_age;
      if (improvement >= 5) setConfetti(250);
      else if (younger || improvement >= 1) setConfetti(120);
      else setConfetti(0);
      // #69: ding de mejora si tu Edad ATP bajó vs el cálculo anterior
      // (la cinemática no corre en recálculos — el sonido da el feedback).
      if (improvement >= 0.5) playImprove();
      setResult(r);
      setSources(buildSources(data));
      setCe((await computeCE(user.id)).ce_integral);
      // Persistir el hash del cálculo → limpia el badge "datos nuevos" del hub (#16).
      await saveLastCalc(user.id, { hash: currentHash, at: getLocalToday(), integral: r.edad_integral });
      if (!seen) { setCinematic(true); AsyncStorage.setItem(CINEMATIC_FLAG, '1'); analytics.track(ATP_EVENTS.EDAD_ATP_CINEMATIC_PLAYED, {}); }
      analytics.track(ATP_EVENTS.EDAD_ATP_RESULT_PREVIEWED, {
        edad_integral: Math.round(r.edad_integral),
        sources_used: data.data_sources_used.length,
      });
      if (data.data_sources_used.length > 0) {
        analytics.track(ATP_EVENTS.EDAD_ATP_DATA_PREPOPULATED, { sources_used: data.data_sources_used, fields_count: countFields(data) });
      }
    } catch {
      setError(true);
    } finally {
      setCalcState('idle');
    }
  }, [user?.id]);

  async function handleShare() {
    if (!result) return;
    try {
      // Lazy require: módulo nativo nunca top-level (mismo patrón que labs-guide/dx-pdf-service).
      const Sharing = require('expo-sharing') as typeof import('expo-sharing');
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      analytics.track(ATP_EVENTS.EDAD_ATP_SHARED, { edad_integral: Math.round(result.edad_integral) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { /* compartir cancelado / no disponible / módulo nativo ausente */ }
  }

  useFocusEffect(useCallback(() => { run(); }, [run]));

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
            <View style={styles.ceWrap}><CeStars ce={ce} label="Calidad de tu evaluación" size={20} showLegend /></View>

            {prevIntegral != null ? <RecalculateDiff from={prevIntegral} to={result.edad_integral} /> : null}

            {/* CTA explícito de recálculo (#14) con estado y gating sin-cambios (#15). */}
            <AnimatedPressable
              onPress={() => { if (calcState === 'idle') run(); }}
              style={[styles.recalcBtn, calcState === 'calculating' && styles.recalcBtnBusy]}
              disabled={calcState === 'calculating'}
            >
              <EliteText variant="body" style={styles.recalcText}>
                {calcState === 'calculating' ? 'Calculando…' : 'Recalcular Edad ATP'}
              </EliteText>
            </AnimatedPressable>
            {unchanged ? (
              <EliteText variant="caption" style={styles.unchanged}>
                Sin cambios desde tu último cálculo ({ddmm(unchanged.at)}).
              </EliteText>
            ) : null}

            <EliteText variant="caption" style={styles.sourcesTitle}>📊 Fuentes que alimentaron el cálculo</EliteText>
            {sources.map((s) => (
              <AnimatedPressable key={s.label} onPress={() => router.push(s.route)} style={styles.sourceRow}>
                <EliteText variant="body" style={styles.sourceLabel}>{s.label}</EliteText>
                <EliteText variant="caption" style={[styles.sourceDetail, s.done && { color: Colors.neonGreen }]}>
                  {s.detail} {s.done ? '✓' : '⚠'}
                </EliteText>
              </AnimatedPressable>
            ))}

            <AnimatedPressable onPress={handleShare} style={styles.shareBtn}>
              <EliteText variant="body" style={styles.shareBtnText}>Compartir mi Edad ATP</EliteText>
            </AnimatedPressable>

            {/* MB-5: fuera la frase dev "domain_scores usan placeholder neutral" — era copy interno visible al usuario. */}
            <EliteText variant="caption" style={styles.note}>
              Toca una sub-edad para el desglose, o una fuente pendiente para completarla.
            </EliteText>
          </>
        )}
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </AnimatedPressable>
        {/* Compliance S4: footer de resultados (posicionamiento §2) */}
        <ResultDisclaimerFooter />
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
  ceWrap: { alignItems: 'center', marginTop: Spacing.sm },
  recalcBtn: { backgroundColor: 'rgba(168,224,42,0.12)', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)' },
  recalcBtnBusy: { opacity: 0.6 },
  recalcText: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  unchanged: { color: Colors.textMuted, fontSize: FontSizes.xs, textAlign: 'center', marginTop: 4 },
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

// #42: gate de disclaimers médicos — modal en primera visita (o bump de versión).
export default function ResultScreenGated() {
  return (
    <MedicalDisclaimerGate>
      <ResultScreen />
    </MedicalDisclaimerGate>
  );
}
