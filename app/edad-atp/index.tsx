/**
 * Edad ATP — Hub de captura de datos (Sprint 2, MVP manual).
 * Muestra la CE actual + 5 cards navegables a las pantallas de captura.
 */
import { useState, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { computeCEFromData, unifiedToCEData, type CEResult } from '@/src/services/edad-atp/ce-service';
import { loadUserData, countFields, computeEdadAtpV2, type UnifiedUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const CALC_THRESHOLD = 30; // % CE mínimo para habilitar "Calcular mi Edad"

type Card = {
  key: keyof CEResult['breakdown'] | 'vitals';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  route: string;
};

const CARDS: Card[] = [
  { key: 'biomarkers', icon: 'water-outline', title: 'Biomarcadores', desc: 'Labs: PhenoAge, metabólico, hormonal', route: '/edad-atp/biomarkers' },
  { key: 'composition', icon: 'barbell-outline', title: 'Composición corporal', desc: 'Peso, % grasa, músculo, FFMI', route: '/edad-atp/composition' },
  { key: 'vitals', icon: 'heart-outline', title: 'Mediciones puntuales', desc: 'Presión arterial, FC reposo, VO2max', route: '/edad-atp/vitals' },
  { key: 'questionnaires', icon: 'list-outline', title: 'Cuestionarios', desc: '10 dominios de salud funcional', route: '/edad-atp/questionnaires' },
  { key: 'cognitive', icon: 'flash-outline', title: 'Test cognitivo', desc: 'Tiempo de reacción (preview)', route: '/edad-atp/cognitive' },
];

export default function EdadAtpHub() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [ce, setCe] = useState<CEResult | null>(null);
  const [data, setData] = useState<UnifiedUserData | null>(null);
  const [edadResult, setEdadResult] = useState<EdadAtpV2Result | null>(null);
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
        const hasLabs = used.has('lab_results') || used.has('lab_uploads');
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
        <EliteText variant="caption" style={styles.subtitle}>Captura de datos — MVP manual</EliteText>

        {/* CE actual */}
        <View style={styles.ceCard}>
          <EliteText variant="caption" style={styles.ceLabel}>Calidad de tu evaluación</EliteText>
          <EliteText style={styles.ceValue}>{Math.round(ceValue)}%</EliteText>
          <View style={styles.ceBarTrack}>
            <View style={[styles.ceBarFill, { width: `${Math.min(100, ceValue)}%` }]} />
          </View>
        </View>

        {/* Estado "result": Integral ya calculada → hero con CTA a ver/recalcular. */}
        {edadResult && (
          <Pressable onPress={() => { haptic.success(); router.push('/edad-atp/result-preview' as any); }} style={styles.heroCard}>
            <EliteText variant="caption" style={styles.heroLabel}>TU EDAD ATP</EliteText>
            <EliteText style={styles.heroValue}>{edadResult.edad_integral.toFixed(1)}</EliteText>
            <EliteText variant="caption" style={styles.heroSub}>cronológica {edadResult.chronological_age} · toca para ver el detalle</EliteText>
          </Pressable>
        )}

        {CARDS.map((c) => {
          const status = cardStatus(c);
          return (
            <Pressable
              key={c.key}
              onPress={() => { haptic.medium(); router.push(c.route as any); }}
              style={styles.card}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={c.icon} size={22} color={Colors.neonGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.cardTitle}>{c.title}</EliteText>
                <EliteText variant="caption" style={styles.cardDesc}>{c.desc}</EliteText>
              </View>
              {status != null && (
                <EliteText variant="caption" style={[styles.cardPct, status.done && { color: Colors.neonGreen }]}>{status.text}</EliteText>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </Pressable>
          );
        })}

        {ceValue >= CALC_THRESHOLD ? (
          <Pressable
            onPress={() => { haptic.success(); router.push('/edad-atp/result-preview' as any); }}
            style={styles.calcBtn}
          >
            <EliteText variant="body" style={styles.calcBtnText}>{edadResult ? 'Recalcular mi Edad' : 'Calcular mi Edad'}</EliteText>
          </Pressable>
        ) : (
          <EliteText variant="caption" style={styles.needMore}>
            Necesitas más datos para calcular tu Edad ATP (mínimo {CALC_THRESHOLD}% de evaluación).
          </EliteText>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.xs },
  ceCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.lg, alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  ceLabel: { color: Colors.textSecondary, letterSpacing: 1 },
  ceValue: { color: Colors.neonGreen, fontSize: 40, fontFamily: Fonts.extraBold },
  ceBarTrack: { width: '100%', height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
  ceBarFill: { height: 6, backgroundColor: Colors.neonGreen, borderRadius: 3 },
  heroCard: { backgroundColor: '#0d1a0a', borderRadius: Radius.card, padding: Spacing.lg, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)' },
  heroLabel: { color: Colors.textSecondary, letterSpacing: 2, fontFamily: Fonts.bold },
  heroValue: { color: Colors.neonGreen, fontSize: 48, fontFamily: Fonts.extraBold },
  heroSub: { color: Colors.textSecondary },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(168,224,42,0.12)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  cardDesc: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  cardPct: { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, maxWidth: 96, textAlign: 'right' },
  calcBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  calcBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  needMore: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.md },
});
