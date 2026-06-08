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
import { computeEdadAtpV2 } from '@/src/services/edad-atp/edad-atp-v2-service';
import { computeCE } from '@/src/services/edad-atp/ce-service';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function ResultPreview() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const [ce, setCe] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      // computeEdadAtpV2 lee TODAS las fuentes (lab_results, health_measurements,
      // lab_uploads, edad_atp_*) vía loadUserData — sin re-pedir datos existentes.
      const r = await computeEdadAtpV2(user.id);
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
