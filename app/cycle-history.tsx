/**
 * Cycle History — Lista de ciclos pasados con promedios.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';

const ROSE = '#fb7185';
const GRADIENT = { start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.03)' };

interface CyclePeriod {
  id: string;
  start_date: string;
  end_date: string | null;
  cycle_length: number | null;
  period_length: number | null;
}

export default function CycleHistoryScreen() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<CyclePeriod[]>([]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from('cycle_periods')
      .select('id, start_date, end_date, cycle_length, period_length')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })
      .limit(24)
      .then(({ data }) => setCycles((data ?? []) as CyclePeriod[]));
  }, [user?.id]));

  const cycleLengths = cycles.filter(c => c.cycle_length).map(c => c.cycle_length!);
  const periodLengths = cycles.filter(c => c.period_length).map(c => c.period_length!);
  const avgCycle = cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : null;
  const avgPeriod = periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length * 10) / 10 : null;
  const variance = cycleLengths.length > 1
    ? Math.round(Math.sqrt(cycleLengths.reduce((s, v) => s + Math.pow(v - (avgCycle ?? 0), 2), 0) / cycleLengths.length))
    : null;

  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <Screen>
      <PillarHeader pillar="cycle" title="Historial" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Promedios */}
        {(avgCycle || avgPeriod) && (
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <GradientCard gradient={GRADIENT} padding={20}>
              <EliteText style={s.avgTitle}>PROMEDIOS</EliteText>
              <View style={s.avgRow}>
                <View style={s.avgItem}>
                  <EliteText style={s.avgValue}>{avgCycle ?? '—'}</EliteText>
                  <EliteText style={s.avgLabel}>DÍAS CICLO</EliteText>
                </View>
                <View style={s.avgDivider} />
                <View style={s.avgItem}>
                  <EliteText style={s.avgValue}>{avgPeriod ?? '—'}</EliteText>
                  <EliteText style={s.avgLabel}>DÍAS PERIODO</EliteText>
                </View>
                {variance != null && (
                  <>
                    <View style={s.avgDivider} />
                    <View style={s.avgItem}>
                      <EliteText style={s.avgValue}>±{variance}</EliteText>
                      <EliteText style={s.avgLabel}>VARIABILIDAD</EliteText>
                    </View>
                  </>
                )}
              </View>
            </GradientCard>
          </Animated.View>
        )}

        {/* Lista de ciclos */}
        <View style={{ marginTop: Spacing.lg }}>
          <SectionTitle>CICLOS REGISTRADOS</SectionTitle>

          {cycles.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={36} color="#666" />
              <EliteText style={s.emptyText}>Sin ciclos registrados aún</EliteText>
            </View>
          )}

          {cycles.map((cycle, idx) => (
            <Animated.View key={cycle.id} entering={FadeInUp.delay(80 + idx * 30).springify()}>
              <GradientCard gradient={GRADIENT} padding={16} style={s.cycleCard}>
                <View style={s.cycleRow}>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.cycleTitle}>Ciclo {cycles.length - idx}</EliteText>
                    <EliteText style={s.cycleDates}>
                      {fmtDate(cycle.start_date)} — {cycle.end_date ? fmtDate(cycle.end_date) : 'en curso'}
                    </EliteText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <EliteText style={s.cycleLengthNum}>{cycle.cycle_length ?? '—'}</EliteText>
                    <EliteText style={s.cycleLengthLabel}>días</EliteText>
                  </View>
                </View>
                {cycle.period_length && (
                  <EliteText style={s.cyclePeriodSub}>Periodo: {cycle.period_length} días</EliteText>
                )}
              </GradientCard>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  avgTitle: { fontSize: 11, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: Spacing.md },
  avgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  avgItem: { alignItems: 'center' },
  avgValue: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: ROSE },
  avgLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 4 },
  avgDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },

  cycleCard: { marginBottom: Spacing.sm },
  cycleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cycleTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: '#fff' },
  cycleDates: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  cycleLengthNum: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: ROSE },
  cycleLengthLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  cyclePeriodSub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.4)', marginTop: 6 },

  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#666' },
});
