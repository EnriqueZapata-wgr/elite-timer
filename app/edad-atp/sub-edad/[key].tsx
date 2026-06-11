/**
 * Edad ATP — drill-down de una sub-edad (ARQUITECTURA_v2 §6.2). Ruta dinámica:
 * /edad-atp/sub-edad/[key] con key ∈ metabolica|corporal|cardiovascular|fitness|cognitiva.
 * Mini-ring + número, delta vs cronológica, componentes con status, y Acción ATP.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { computeEdadAtpV2 } from '@/src/services/edad-atp/edad-atp-v2-service';
import type { EdadAtpV2Result, SubEdadResult } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SUB_EDAD_CE_PENDING_THRESHOLD, EDAD_PENDING_COLOR } from '@/src/components/edad-atp/tokens';
import { MATRIZ_HOMBRES, MATRIZ_MUJERES } from '@/src/constants/edad-atp-matriz-v7-v6';

// Motor v2: 5 áreas (labs/composicion/fitness/cognicion/riesgos). El drill-down de cada
// área muestra los params que la alimentan (sub.components).
const META: Record<string, { icon: string; label: string; color: string; action: string; route: string }> = {
  labs: { icon: '🩸', label: 'Edad Labs', color: '#E24B4A', action: 'Optimiza biomarcadores: inflamación, glucosa y micronutrientes (Vit D, B12).', route: '/edad-atp/biomarkers' },
  composicion: { icon: '💪', label: 'Edad Composición', color: '#a8e02a', action: 'Trabaja composición: fuerza progresiva + proteína suficiente.', route: '/edad-atp/composition' },
  fitness: { icon: '🏃', label: 'Edad Fitness', color: '#EF9F27', action: 'Protocolo cardio ATP: 3x por semana de intervalos + fuerza.', route: '/edad-atp/tests' },
  cognicion: { icon: '🧠', label: 'Edad Cognición', color: '#7F77DD', action: 'Ejercicio aeróbico + sueño óptimo mantienen tu velocidad y atención.', route: '/edad-atp/tests/reaction-time' },
  riesgos: { icon: '❤️', label: 'Edad Riesgos', color: '#E24B4A', action: 'Cuida presión, lípidos (ApoB) y metabólico; suma cardio zona 2.', route: '/edad-atp/vitals' },
};

// Unidad por clave de matriz (HOMBRES y MUJERES comparten claves; primera gana).
const PARAM_UNITS: Record<string, string> = {};
for (const matriz of [MATRIZ_HOMBRES, MATRIZ_MUJERES]) {
  for (const dom of Object.values(matriz)) {
    for (const p of dom.params) {
      if (p.unit && PARAM_UNITS[p.key] === undefined) PARAM_UNITS[p.key] = p.unit;
    }
  }
}

/**
 * Formato por magnitud — Math.round truncaba decimales a "0" (HbA1c 0.055,
 * Bilirrubina 0.44, RDW 0.129). Params % de la matriz guardan fracción decimal
 * → se muestran ×100 con su signo % (0.476 → "47.6%").
 */
function formatComponentValue(v: number, unit?: string): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (unit === '%') {
    const pct = Math.abs(v) <= 1 ? v * 100 : v;
    return `${pct.toFixed(1)}%`;
  }
  const abs = Math.abs(v);
  const num = abs >= 100 ? v.toFixed(0) : abs >= 10 ? v.toFixed(1) : abs >= 1 ? v.toFixed(2) : v.toFixed(3);
  return unit ? `${num} ${unit}` : num;
}

function compStatus(score: number, missing: boolean): { glyph: string; color: string } {
  if (missing) return { glyph: 'ⓘ pendiente', color: Colors.textSecondary };
  if (score >= 70) return { glyph: '▲ óptimo', color: Colors.neonGreen };
  if (score >= 40) return { glyph: '◐ aceptable', color: '#EF9F27' };
  return { glyph: '▼ bajo', color: '#E24B4A' };
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SubEdadDrillDown() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const meta = META[key as string] ?? META.labs;

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    analytics.track(ATP_EVENTS.EDAD_ATP_SUBEDAD_VIEWED, { key: String(key) });
    computeEdadAtpV2(user.id).then(setResult).catch(() => {});
  }, [user?.id, key]));

  const sub: SubEdadResult | null = result ? (result.sub_edades as any)[key as string] ?? null : null;
  const chrono = result?.chronological_age ?? 0;
  const delta = sub ? Math.round((sub.age_years - chrono) * 10) / 10 : 0;
  const deltaColor = delta <= -1 ? Colors.neonGreen : delta >= 2 ? '#E24B4A' : '#EF9F27';
  // CE bajo = mayoría de params sin contestar → número no representativo, mostrar Pendiente.
  const pending = sub != null && sub.ce_percent < SUB_EDAD_CE_PENDING_THRESHOLD;

  return (
    <Screen>
      <PillarHeader pillar="metrics" title={meta.label} />
      <ScrollView contentContainerStyle={styles.content}>
        {!sub ? (
          <EliteText variant="caption" style={styles.calc}>Calculando…</EliteText>
        ) : (
          <>
            <View style={[styles.ring, { borderColor: pending ? EDAD_PENDING_COLOR : meta.color }]}>
              <EliteText style={styles.ringIcon}>{meta.icon}</EliteText>
              {pending ? (
                <EliteText style={[styles.ringPending, { color: EDAD_PENDING_COLOR }]}>⚠️ Pendiente</EliteText>
              ) : (
                <EliteText style={[styles.ringAge, { color: meta.color }]}>{sub.age_years.toFixed(1)}</EliteText>
              )}
            </View>
            {pending ? (
              <EliteText variant="caption" style={styles.pendingMsg}>
                Esta sub-edad necesita más datos. CE actual: {Math.round(sub.ce_percent)}%. Completa los cuestionarios pendientes.
              </EliteText>
            ) : (
              <EliteText variant="caption" style={[styles.delta, { color: deltaColor }]}>
                cronológica {chrono} · {delta > 0 ? '+' : ''}{delta} años · CE {Math.round(sub.ce_percent)}%
              </EliteText>
            )}

            <EliteText variant="body" style={styles.sectionTitle}>Componentes</EliteText>
            {Object.entries(sub.components).map(([k, c]) => {
              const st = compStatus(c.score_0_100, c.missing);
              return (
                <View key={k} style={styles.compRow}>
                  <EliteText variant="body" style={styles.compLabel}>{humanize(k)}</EliteText>
                  <View style={styles.compRight}>
                    {!c.missing ? <EliteText variant="caption" style={styles.compVal}>{formatComponentValue(c.value, PARAM_UNITS[k])}</EliteText> : null}
                    <EliteText variant="caption" style={[styles.compStatus, { color: st.color }]}>{st.glyph}</EliteText>
                  </View>
                </View>
              );
            })}

            <View style={styles.actionCard}>
              <EliteText variant="body" style={styles.actionTitle}>💡 Acción ATP</EliteText>
              <EliteText variant="caption" style={styles.actionText}>{meta.action}</EliteText>
              <Pressable onPress={() => { haptic.medium(); router.push(meta.route as any); }} style={styles.actionBtn}>
                <EliteText variant="body" style={styles.actionBtnText}>Ir a mejorar</EliteText>
              </Pressable>
            </View>
          </>
        )}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  calc: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  ring: { alignSelf: 'center', width: 150, height: 150, borderRadius: 75, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: Spacing.md },
  ringIcon: { fontSize: 26 },
  ringAge: { fontSize: 40, fontFamily: Fonts.extraBold, lineHeight: 44 },
  ringPending: { fontSize: FontSizes.md, fontFamily: Fonts.bold, lineHeight: 24 },
  delta: { textAlign: 'center', marginBottom: Spacing.sm },
  pendingMsg: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, lineHeight: 18 },
  sectionTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold, marginTop: Spacing.sm },
  compRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  compLabel: { color: Colors.textPrimary, flex: 1 },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compVal: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  compStatus: { fontSize: FontSizes.xs },
  actionCard: { backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: Radius.card, padding: Spacing.md, gap: 8, marginTop: Spacing.md },
  actionTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  actionText: { color: Colors.textSecondary, fontSize: FontSizes.xs, lineHeight: 18 },
  actionBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: 4 },
  actionBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
});
