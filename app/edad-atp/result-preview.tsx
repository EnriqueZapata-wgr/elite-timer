/**
 * Edad ATP — preview de resultado (placeholder Sprint 2/2.5).
 * Lee TODAS las fuentes vía loadUserData y llama al orquestador. Muestra qué
 * fuentes alimentaron el cálculo (tappables para completar lo que falta).
 * UIUX cinemática + constellation = Sprint 3.
 *
 * NOTA: domain_scores son placeholder neutral (scores reales requieren rangos de
 * 9 bandas, Sprint 5). edad/sexo ya vienen del perfil (client_profiles). Ver REPORT.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { computeEdadAtpV2, loadUserData, countFields, type UnifiedUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

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

export default function ResultPreview() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const [ce, setCe] = useState(0);
  const [sources, setSources] = useState<SourceRow[]>([]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      // computeEdadAtpV2 lee TODAS las fuentes (lab_results, health_measurements,
      // lab_uploads, edad_atp_*) vía loadUserData — sin re-pedir datos existentes.
      const r = await computeEdadAtpV2(user.id);
      setResult(r);
      const data = await loadUserData(user.id);
      setSources(buildSources(data));
      setCe((await computeCE(user.id)).ce_integral);
      analytics.track(ATP_EVENTS.EDAD_ATP_RESULT_PREVIEWED, {
        edad_integral: Math.round(r.edad_integral),
        sources_used: data.data_sources_used.length,
      });
      if (data.data_sources_used.length > 0) {
        analytics.track(ATP_EVENTS.EDAD_ATP_DATA_PREPOPULATED, {
          sources_used: data.data_sources_used,
          fields_count: countFields(data),
        });
      }
    })();
  }, [user?.id]));

  const subs = result
    ? [
        { label: '🩸 Metabólica', age: result.sub_edades.metabolica.age_years },
        { label: '💪 Corporal', age: result.sub_edades.corporal.age_years },
        { label: '❤️ Cardiovascular', age: result.sub_edades.cardiovascular.age_years },
        { label: '🏃 Fitness', age: result.sub_edades.fitness.age_years },
        { label: '🧠 Cognitiva', age: result.sub_edades.cognitiva.age_years },
      ]
    : [];

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Tu Edad ATP" />
      <ScrollView contentContainerStyle={styles.content}>
        {!result ? (
          <EliteText variant="caption" style={styles.calc}>Calculando…</EliteText>
        ) : (
          <>
            <View style={styles.hero}>
              <EliteText variant="caption" style={styles.heroLabel}>EDAD BIOLÓGICA INTEGRAL</EliteText>
              <EliteText style={styles.heroValue}>{result.edad_integral.toFixed(1)}</EliteText>
              <EliteText variant="caption" style={styles.heroSub}>cronológica {result.chronological_age} · CE {Math.round(ce)}%</EliteText>
            </View>

            {subs.map((s) => (
              <View key={s.label} style={styles.subRow}>
                <EliteText variant="body" style={styles.subLabel}>{s.label}</EliteText>
                <EliteText variant="body" style={styles.subAge}>{s.age.toFixed(1)}</EliteText>
              </View>
            ))}

            <EliteText variant="caption" style={styles.sourcesTitle}>📊 Fuentes que alimentaron el cálculo</EliteText>
            {sources.map((s) => (
              <Pressable key={s.label} onPress={() => router.push(s.route as any)} style={styles.sourceRow}>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.sourceLabel}>{s.label}</EliteText>
                </View>
                <EliteText variant="caption" style={[styles.sourceDetail, s.done && { color: Colors.neonGreen }]}>
                  {s.detail} {s.done ? '✓' : '⚠'}
                </EliteText>
              </Pressable>
            ))}

            <EliteText variant="caption" style={styles.note}>
              UIUX cinemática + constellation viene en Sprint 3. Vista preliminar: los datos
              que faltan usan defaults; toca una fuente pendiente para completarla.
            </EliteText>
          </>
        )}

        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver a captura</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  calc: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  hero: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.xl, alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  heroLabel: { color: Colors.textSecondary, letterSpacing: 1 },
  heroValue: { color: Colors.neonGreen, fontSize: 56, fontFamily: Fonts.extraBold },
  heroSub: { color: Colors.textSecondary },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  subLabel: { color: Colors.textPrimary },
  subAge: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  sourcesTitle: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: Spacing.md, marginBottom: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  sourceLabel: { color: Colors.textPrimary },
  sourceDetail: { color: Colors.textSecondary },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.sm },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
});
