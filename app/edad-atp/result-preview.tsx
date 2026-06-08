/**
 * Edad ATP — preview de resultado (placeholder Sprint 2).
 * Ensambla los inputs de las tablas edad_atp_* (con defaults para lo faltante) y
 * llama al orquestador del Sprint 1. UIUX cinemática + constellation = Sprint 3.
 *
 * NOTA: chronological_age/sex aún no se capturan (vienen del perfil — wiring de
 * Sprint 3) → default 50/male. domain_scores son placeholder neutral (los scores
 * reales por dominio requieren los rangos de 9 bandas, Sprint 5). Ver COWORK_REPORT.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { computeEdadAtpV2, type EdadAtpV2Inputs } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import type { EdadAtpV2Result, DomainKey } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const PHENOAGE_DEFAULTS: Record<string, number> = {
  albumin: 4.5, creatinine: 0.9, glucose: 90, crp: 0.2,
  lymphocyte_pct: 30, mcv: 90, rdw_cv: 13, alp: 70, wbc: 6000,
};
const ALL_DOMAINS: DomainKey[] = [
  'cardiovascular', 'composicion_corporal', 'habitos', 'inflamacion', 'inmunidad',
  'metabolismo', 'renal_micronutrientes', 'sistema_hormonal', 'sueno', 'vitalidad',
];

async function assembleInputs(userId: string): Promise<EdadAtpV2Inputs> {
  const [bioRes, compRes, ftRes, qRes] = await Promise.all([
    supabase.from('edad_atp_biomarkers').select('biomarker_key, value').eq('user_id', userId),
    supabase.from('edad_atp_body_composition').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(1),
    supabase.from('edad_atp_functional_tests').select('test_key, value_primary').eq('user_id', userId),
    supabase.from('edad_atp_questionnaire_responses').select('domain').eq('user_id', userId),
  ]);
  const bio: Record<string, number> = {};
  for (const r of (bioRes.data ?? []) as any[]) if (bio[r.biomarker_key] === undefined) bio[r.biomarker_key] = r.value;
  const comp = ((compRes.data ?? [])[0] ?? {}) as any;
  const ft: Record<string, number> = {};
  for (const r of (ftRes.data ?? []) as any[]) if (ft[r.test_key] === undefined) ft[r.test_key] = r.value_primary;
  const presentDomains = new Set((qRes.data ?? []).map((r: any) => r.domain));

  const chronological_age = 50; // TODO Sprint 3: del perfil
  const v = (k: string, d: number) => (bio[k] != null ? bio[k] : d);

  return {
    chronological_age,
    sex: 'male', // TODO Sprint 3: del perfil
    phenoage_biomarkers: {
      albumin_g_dl: v('albumin', PHENOAGE_DEFAULTS.albumin),
      creatinine_mg_dl: v('creatinine', PHENOAGE_DEFAULTS.creatinine),
      glucose_mg_dl: v('glucose', PHENOAGE_DEFAULTS.glucose),
      crp_mg_dl: v('crp', PHENOAGE_DEFAULTS.crp),
      lymphocyte_pct: v('lymphocyte_pct', PHENOAGE_DEFAULTS.lymphocyte_pct),
      mcv_fl: v('mcv', PHENOAGE_DEFAULTS.mcv),
      rdw_cv_pct: v('rdw_cv', PHENOAGE_DEFAULTS.rdw_cv),
      alp_u_l: v('alp', PHENOAGE_DEFAULTS.alp),
      wbc_per_ul: v('wbc', PHENOAGE_DEFAULTS.wbc),
      chronological_age,
    },
    // Placeholder neutral (50) por dominio presente — scores reales = Sprint 5.
    domain_scores: Object.fromEntries(ALL_DOMAINS.filter((d) => presentDomains.has(d)).map((d) => [d, 50])),
    body_composition: {
      weight_kg: comp.weight_kg ?? 80,
      height_cm: comp.height_cm ?? 175,
      body_fat_pct: comp.body_fat_pct ?? 22,
      skeletal_muscle_pct: comp.skeletal_muscle_pct ?? 36,
      visceral_fat: comp.visceral_fat ?? 8,
      grip_strength_kg: comp.grip_strength_kg ?? undefined,
      ffmi: comp.ffmi ?? undefined,
    },
    metabolic: {
      glucose_mg_dl: bio.glucose, insulin_uU_ml: bio.insulin, hba1c_pct: bio.hba1c,
      hdl_mg_dl: bio.hdl, triglycerides_mg_dl: bio.triglycerides, waist_cm: undefined,
    },
    cardiovascular: {
      total_cholesterol_mg_dl: v('total_cholesterol', 180), hdl_mg_dl: v('hdl', 50),
      systolic_bp_mmHg: v('systolic_bp', 120), on_htn_treatment: false, has_diabetes: false, smoker: false, race: 'other',
    },
    fitness: {
      vo2max_ml_kg_min: bio.vo2max_estimated, grip_strength_kg: comp.grip_strength_kg ?? undefined,
      resting_hr_bpm: bio.resting_hr, recovery_hr_drop_bpm: bio.recovery_hr,
    },
    reaction_time: ft.reaction_time_simple != null && ft.reaction_time_choice != null
      ? { rt_simple_ms: ft.reaction_time_simple, rt_choice_ms: ft.reaction_time_choice }
      : undefined,
  };
}

export default function ResultPreview() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const [ce, setCe] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      const inputs = await assembleInputs(user.id);
      const r = await computeEdadAtpV2(user.id, inputs);
      setResult(r);
      setCe((await computeCE(user.id)).ce_integral);
      analytics.track(ATP_EVENTS.EDAD_ATP_RESULT_PREVIEWED, { edad_integral: Math.round(r.edad_integral) });
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

            <EliteText variant="caption" style={styles.note}>
              UIUX cinemática + constellation viene en Sprint 3. Esta es una vista preliminar
              (datos faltantes usan defaults; edad/sexo del perfil se wirean en Sprint 3).
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
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.sm },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
});
