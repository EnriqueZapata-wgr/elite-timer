/**
 * Edad ATP — Hub de captura de datos (Sprint 2, MVP manual).
 * MB-11 D.4: entrada del módulo al molde editorial — hero con imagen
 * (edad-atp el/ella) + overlay + número protagonista, como Mente/Sueño.
 * Muestra la CE actual + cards navegables a las pantallas de captura.
 */
import { useState, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { router, useFocusEffect , type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { computeCEFromData, unifiedToCEData, type CEResult } from '@/src/services/edad-atp/ce-service';
import { loadUserData, countFields, computeEdadAtpV2, type UnifiedUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { CeStars } from '@/src/components/edad-atp/CeStars';
import { DatosNuevosBadge } from '@/src/components/edad-atp/DatosNuevosBadge';
import { loadDatasetEntries } from '@/src/services/edad-atp/dataset-snapshot';
import { computeDatasetHash } from '@/src/services/edad-atp/dataset-hash';
import { getLastCalc, recalcStatus } from '@/src/services/edad-atp/recalc-gate';
import { pickEdadAtpImage } from '@/src/utils/yo-image-picker';
import { ATP_BRAND, BG, BORDER, TEXT, CATEGORY_COLORS, SEMANTIC } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const CALC_THRESHOLD = 30; // % CE mínimo para habilitar "Calcular mi Edad"

type Card = {
  key: keyof CEResult['breakdown'] | 'vitals' | 'tests';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  route: Href;
};

const CARDS: Card[] = [
  { key: 'biomarkers', icon: 'water-outline', title: 'Biomarcadores', desc: 'Labs: PhenoAge, metabólico, hormonal', route: '/edad-atp/biomarkers' },
  { key: 'composition', icon: 'barbell-outline', title: 'Composición corporal', desc: 'Peso, % grasa, músculo, FFMI', route: '/edad-atp/composition' },
  { key: 'vitals', icon: 'heart-outline', title: 'Mediciones puntuales', desc: 'Presión arterial, FC reposo, VO2max', route: '/edad-atp/vitals' },
  { key: 'questionnaires', icon: 'list-outline', title: 'Cuestionarios', desc: '10 dominios de salud funcional', route: '/edad-atp/questionnaires' },
  { key: 'cognitive', icon: 'flash-outline', title: 'Test cognitivo', desc: 'Tiempo de reacción (preview)', route: '/edad-atp/cognitive' },
  { key: 'tests', icon: 'fitness-outline', title: 'Tests funcionales', desc: 'Reaction time, Cooper, push-ups, balance', route: '/edad-atp/tests' },
];

export default function EdadAtpHub() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [ce, setCe] = useState<CEResult | null>(null);
  const [data, setData] = useState<UnifiedUserData | null>(null);
  const [edadResult, setEdadResult] = useState<EdadAtpV2Result | null>(null);
  const [hasNewData, setHasNewData] = useState(false);
  const prevCeRef = useRef<number | null>(null);

  useFocusEffect(useCallback(() => {
    analytics.track(ATP_EVENTS.EDAD_ATP_CAPTURE_SCREEN_VIEWED, { screen: 'hub' });
    if (!user?.id) return;
    (async () => {
      // Una sola lectura unificada alimenta CE + indicadores por card.
      const d = await loadUserData(user.id);
      setData(d);
      if (d.data_sources_used.length > 0) {
        analytics.track(ATP_EVENTS.EDAD_ATP_DATA_PREPOPULATED, {
          sources_used: d.data_sources_used,
          fields_count: countFields(d),
        });
      }
      const r = computeCEFromData(unifiedToCEData(d));
      setCe(r);
      const prev = prevCeRef.current;
      if (prev != null && prev < CALC_THRESHOLD && r.ce_integral >= CALC_THRESHOLD) {
        analytics.track(ATP_EVENTS.EDAD_ATP_CE_THRESHOLD_CROSSED, { ce: Math.round(r.ce_integral) });
      }
      prevCeRef.current = r.ce_integral;
      // Estado "result": si hay evaluación suficiente, precalcula la Integral para el hero.
      if (r.ce_integral >= CALC_THRESHOLD) setEdadResult(await computeEdadAtpV2(user.id));
      else setEdadResult(null);
      // Badge de datos nuevos (#16): el snapshot actual vs el hash del último cálculo.
      try {
        const [entries, last] = await Promise.all([loadDatasetEntries(user.id), getLastCalc(user.id)]);
        setHasNewData(recalcStatus(computeDatasetHash(entries), last).hasNewData && last != null);
      } catch { /* badge es best-effort */ }
    })();
  }, [user?.id]));

  const ceValue = ce?.ce_integral ?? 0;

  // Indicador "ya tienes datos" por card (derivado de la lectura unificada).
  const cardStatus = (c: Card): { text: string; done: boolean } | null => {
    if (!data) return null;
    const used = new Set(data.data_sources_used);
    switch (c.key) {
      case 'biomarkers': {
        const phenoNew = ['albumin_g_dl', 'alp_u_l', 'lymphocyte_pct', 'mcv_fl', 'rdw_cv_pct'] as const;
        const n = phenoNew.filter((k) => data[k] != null).length;
        const hasLabs = used.has('lab_values');
        return { text: `PhenoAge ${n}/5${hasLabs ? ' · Labs ✓' : ''}`, done: n === 5 };
      }
      case 'composition': {
        const ok = data.weight_kg != null && data.height_cm != null && data.body_fat_pct != null;
        return { text: ok ? 'Registrada ✓' : 'Pendiente', done: ok };
      }
      case 'vitals': {
        const ok = data.systolic_bp_mmHg != null;
        return { text: ok ? 'PAS ✓' : 'Pendiente PAS', done: ok };
      }
      case 'questionnaires': {
        const n = Object.keys(data.sf_scores_by_domain ?? {}).length;
        return { text: `${n}/10 dominios`, done: n >= 6 };
      }
      case 'cognitive': {
        const ok = data.reaction_time_simple_ms != null && data.reaction_time_choice_ms != null;
        return { text: ok ? 'Registrado ✓' : 'Pendiente', done: ok };
      }
      default:
        return null;
    }
  };

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Edad ATP" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* MB-11 D.4: HERO editorial — imagen + overlay + número protagonista.
            Sin cálculo aún, el vacío informa qué falta (no un anillo triste). */}
        <AnimatedPressable
          onPress={() => {
            if (!edadResult) return;
            haptic.success();
            router.push('/edad-atp/result-preview');
          }}
          disabled={!edadResult}
          style={styles.heroWrap}
        >
          <ImageBackground
            source={pickEdadAtpImage(data?.sex)}
            style={styles.heroBg}
            imageStyle={styles.heroBgImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.95)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroInner}>
              <EliteText variant="caption" style={styles.heroLabel}>TU EDAD ATP</EliteText>
              {edadResult ? (
                <>
                  <EliteText style={styles.heroValue}>{edadResult.edad_integral.toFixed(1)}</EliteText>
                  <EliteText variant="caption" style={styles.heroSub}>
                    cronológica {edadResult.chronological_age} · toca para ver el detalle
                  </EliteText>
                </>
              ) : (
                <EliteText variant="caption" style={styles.heroSub}>
                  Aún sin calcular: completa tu evaluación abajo y el número aparece aquí.
                </EliteText>
              )}
              <View style={styles.heroStars}>
                <CeStars ce={ceValue} label="Calidad de tu evaluación" size={18} showLegend />
              </View>
            </View>
          </ImageBackground>
        </AnimatedPressable>

        <DatosNuevosBadge visible={hasNewData} onPress={() => { haptic.medium(); router.push('/edad-atp/result-preview'); }} />

        {/* ATP Labs — vista canónica con historial y gráficas */}
        <AnimatedPressable onPress={() => { haptic.medium(); router.push('/edad-atp/labs'); }} style={styles.card}>
          <View style={styles.cardIcon}><Ionicons name="flask-outline" size={22} color={CATEGORY_COLORS.metrics} /></View>
          <View style={{ flex: 1 }}>
            <EliteText variant="body" style={styles.cardTitle}>ATP Labs</EliteText>
            <EliteText variant="caption" style={styles.cardDesc}>Tus laboratorios con historial y gráficas de continuum</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={TEXT.secondary} />
        </AnimatedPressable>

        {CARDS.map((c) => {
          const status = cardStatus(c);
          return (
            <AnimatedPressable
              key={c.key}
              onPress={() => { haptic.medium(); router.push(c.route); }}
              style={styles.card}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={c.icon} size={22} color={CATEGORY_COLORS.metrics} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.cardTitle}>{c.title}</EliteText>
                <EliteText variant="caption" style={styles.cardDesc}>{c.desc}</EliteText>
              </View>
              {status != null && (
                // Lima solo como estado "hecho" (feedback semántico, ACCENT_ROLES c).
                <EliteText variant="caption" style={[styles.cardPct, status.done && { color: SEMANTIC.success }]}>{status.text}</EliteText>
              )}
              <Ionicons name="chevron-forward" size={18} color={TEXT.secondary} />
            </AnimatedPressable>
          );
        })}

        {ceValue >= CALC_THRESHOLD ? (
          <GradientCTA
            label={edadResult ? 'RECALCULAR MI EDAD' : 'CALCULAR MI EDAD'}
            onPress={() => { haptic.success(); router.push('/edad-atp/result-preview'); }}
            style={styles.calcBtn}
          />
        ) : (
          <>
            <EliteText variant="caption" style={styles.needMore}>
              Necesitas más datos para calcular tu Edad ATP (mínimo {CALC_THRESHOLD}% de evaluación).
            </EliteText>
            {/* Sprint LABS GUÍA: el bloqueo más común es "no sé qué labs hacerme" */}
            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push('/labs-guide'); }}
              style={styles.guideBtn}
            >
              <Ionicons name="document-text-outline" size={16} color={TEXT.secondary} />
              <EliteText variant="caption" style={styles.guideBtnText}>
                ¿No sabes qué labs hacerte? Descarga la guía
              </EliteText>
              <Ionicons name="chevron-forward" size={14} color={TEXT.secondary} />
            </AnimatedPressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  // MB-11 D.4: hero editorial (imagen + overlay + número protagonista)
  heroWrap: { borderRadius: Radius.card, overflow: 'hidden', marginBottom: Spacing.xs },
  heroBg: { minHeight: 190 },
  heroBgImage: { opacity: 0.9 },
  heroInner: { flex: 1, justifyContent: 'flex-end', padding: Spacing.lg, gap: 2 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', letterSpacing: 2, fontFamily: Fonts.bold },
  // Lima solo en el dato heroico — el número ES el protagonista del módulo.
  heroValue: { color: ATP_BRAND.lime, fontSize: 48, fontFamily: Fonts.extraBold },
  heroSub: { color: 'rgba(255,255,255,0.7)' },
  heroStars: { marginTop: Spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: BG.card, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 1, borderColor: BORDER.card,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(29,158,117,0.12)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: TEXT.primary, fontFamily: Fonts.semiBold },
  cardDesc: { color: TEXT.secondary, fontSize: FontSizes.xs, marginTop: 2 },
  cardPct: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, maxWidth: 96, textAlign: 'right' },
  calcBtn: { marginTop: Spacing.md },
  needMore: { color: TEXT.secondary, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  // Sprint LABS GUÍA: acceso secundario a la guía cuando falta data (neutro,
  // no compite con el CTA primario — ACCENT_ROLES).
  guideBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BG.card, borderRadius: Radius.md, borderWidth: 1, borderColor: BORDER.input,
    paddingVertical: Spacing.md, marginTop: Spacing.sm,
  },
  guideBtnText: { color: TEXT.secondary, fontFamily: Fonts.semiBold },
});
