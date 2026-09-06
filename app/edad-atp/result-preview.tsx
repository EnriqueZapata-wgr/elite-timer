/**
 * Edad ATP — pantalla de resultado. MEGA COMPLETION (Sprint 3 UIUX).
 * Lee TODAS las fuentes vía el orquestador, reproduce la cinemática la primera vez
 * (flag persistido) y muestra la Constellation + panel de fuentes (tappable).
 *
 * NOTA: el buzón pedía renombrar a result.tsx; se conserva result-preview.tsx para no
 * romper los links existentes (hub, tab YO, constellation). Ver COWORK_REPORT.
 * domain_scores siguen placeholder neutral hasta Sprint 5.
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { router, useFocusEffect , type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { useAuth } from '@/src/contexts/auth-context';
import { computeEdadAtpV2, loadUserData, countFields, type UnifiedUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { SubEdadConstellation } from '@/src/components/edad-atp/SubEdadConstellation';
import { CalculationCinematic } from '@/src/components/edad-atp/CalculationCinematic';
import { playImprove, loadSoundPref } from '@/src/components/edad-atp/edad-sound';
import { RecalculateDiff } from '@/src/components/edad-atp/RecalculateDiff';
import { EdadAtpShareCard, type MarcadorTarjeta, type EstadoSemaforo } from '@/src/components/edad-atp/EdadAtpShareCard';
// ATP 3.0 (6-sep-2026, ruta 2.4): los tres marcadores de mayor impacto van en
// la tarjeta compartible. Se leen de la misma fuente que ATP Labs y se eligen
// con el MISMO criterio que la ficha de Free (ruta 1.11): asi la tarjeta y
// los tres marcadores abiertos son los mismos tres.
import { loadCanonicalLabValues, collapseLanguageDuplicates, type CanonicalMap } from '@/src/services/edad-atp/lab-values-service';
import { marcadoresAbiertosFree, type MarcadorParaImpacto } from '@/src/services/subscription/limites-free-core';
import { estadoDeParametro } from '@/src/services/edad-atp/labs-premium-core';
import { findMatrizParam } from '@/src/constants/edad-atp-matriz-lookup';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import { CANONICAL_PCT_KEYS, decimalToPct } from '@/src/constants/lab-canonical-map';
import { CeStars } from '@/src/components/edad-atp/CeStars';
import { loadDatasetEntries } from '@/src/services/edad-atp/dataset-snapshot';
import { computeDatasetHash } from '@/src/services/edad-atp/dataset-hash';
import { getLastCalc, saveLastCalc, recalcStatus } from '@/src/services/edad-atp/recalc-gate';
import { getLocalToday } from '@/src/utils/date-helpers';
import type { EdadAtpV2Result, Sex } from '@/src/types/edad-atp-v2';
import { ATP_BRAND, SEMANTIC, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';

/** DD/MM desde YYYY-MM-DD para el copy de "sin cambios". */
function ddmm(iso: string): string { const [, m, d] = iso.split('-'); return d && m ? `${d}/${m}` : iso; }

/**
 * ATP 3.0 (ruta 2.4): de los labs canonicos a las tres filas de la tarjeta.
 * El valor se ensena como en ATP Labs (las claves pct en %, dos decimales) y
 * con la unidad de component-meta. Pura, para poder razonarla sin pantalla.
 */
function marcadoresParaTarjeta(sex: Sex, labs: CanonicalMap): MarcadorTarjeta[] {
  // Solo entran los que tienen semaforo: un marcador sin banda en la matriz
  // no se puede pintar en tres estados (regla 4: sin fuente, nada).
  const candidatos: (MarcadorParaImpacto & { valor: number; estado: EstadoSemaforo })[] = [];
  for (const [key, cv] of Object.entries(labs)) {
    if (!cv || cv.value == null || !Number.isFinite(cv.value)) continue;
    const estado = estadoDeParametro(sex, key, cv.value);
    if (estado === 'sin_banda') continue;
    candidatos.push({ key, peso: findMatrizParam(sex, key)?.weight ?? 0, estado, valor: cv.value });
  }
  const porKey = new Map(candidatos.map((c) => [c.key, c]));
  return marcadoresAbiertosFree(candidatos).flatMap((key) => {
    const m = porKey.get(key);
    if (!m) return [];
    const meta = getLabParamMeta(key);
    const mostrado = CANONICAL_PCT_KEYS.has(key) ? decimalToPct(m.valor) : m.valor;
    const redondeado = Math.round(mostrado * 100) / 100;
    return [{
      key,
      etiqueta: meta.abbr || meta.display_name,
      valor: meta.unit ? `${redondeado} ${meta.unit}` : String(redondeado),
      estado: m.estado,
    }];
  });
}

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
  // MB-31B remate: tokens del tema (oscuro idéntico; claro = acero).
  const { kind, tokens: t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
  const [marcadoresTarjeta, setMarcadoresTarjeta] = useState<MarcadorTarjeta[]>([]);
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
      // Ruta 2.4: la franja de marcadores de la tarjeta. Fail-soft a proposito:
      // loadCanonicalLabValues devuelve {} si no pudo leer, y entonces la
      // tarjeta sale sin franja. Un fallo aqui nunca tumba el resultado.
      const labs = collapseLanguageDuplicates(await loadCanonicalLabValues(user.id));
      setMarcadoresTarjeta(marcadoresParaTarjeta(data.sex, labs));
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
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
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
                {/* MB-31B remate: en claro el lima no es letra (manual regla 1) → teal de texto. */}
                <EliteText variant="caption" style={[styles.sourceDetail, s.done && { color: kind === 'dark' ? SEMANTIC.success : t.tealTexto }]}>
                  {s.detail} {s.done ? '✓' : '⚠'}
                </EliteText>
              </AnimatedPressable>
            ))}

            <GradientCTA label="COMPARTIR MI EDAD ATP" onPress={handleShare} style={styles.shareBtn} />

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
            <EdadAtpShareCard result={result} format="story" marcadores={marcadoresTarjeta} />
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

// MB-31B remate: los estilos leen los tokens del tema. El lima como LETRA del
// botón de recálculo solo vive en oscuro; en claro cae al teal (manual regla 1).
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  calc: { color: t.textoSecundario, textAlign: 'center', marginTop: Spacing.xl },
  ceWrap: { alignItems: 'center', marginTop: Spacing.sm },
  recalcBtn: { backgroundColor: 'rgba(168,224,42,0.12)', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)' },
  recalcBtnBusy: { opacity: 0.6 },
  recalcText: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.bold },
  unchanged: { color: t.textoTenue, fontSize: FontSizes.xs, textAlign: 'center', marginTop: 4 },
  sourcesTitle: { color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: Spacing.md, marginBottom: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.card, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: t.borde },
  sourceLabel: { color: t.texto },
  sourceDetail: { color: t.textoSecundario },
  note: { color: t.textoSecundario, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.sm },
  shareBtn: { marginTop: Spacing.md },
  backBtn: { backgroundColor: t.card, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: t.borde },
  backText: { color: t.texto },
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
