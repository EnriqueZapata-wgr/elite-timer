/**
 * N-Back — estadísticas (3 tabs de la referencia).
 *
 * OVERVIEW: totales + percentiles vs todos los usuarios (RPC agregada de la
 * mig 218 — cero filas cross-user, doctrina de privacidad de la 197).
 * RETO: línea de nivel a lo largo del reto de 20 días + promedios.
 * RANKING: PRONTO — el leaderboard requiere opt-in público (Comunidad); la
 * mig 197 prohíbe leer estas tablas cross-user, no se contradice aquí.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Polyline, Line as SvgLine } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { NBACK_CONFIG, badgeForBestN } from '@/src/services/nback-core';
import {
  fetchNBackState, fetchChallengeStats, fetchNBackPercentiles,
  type NBackUserState, type NBackChallengeStats, type NBackPercentiles,
} from '@/src/services/nback-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

type Tab = 'overview' | 'reto' | 'ranking';

const CHART_W = 320;
const CHART_H = 140;

export default function NBackStatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [state, setState] = useState<NBackUserState | null>(null);
  const [challenge, setChallenge] = useState<NBackChallengeStats | null>(null);
  const [pct, setPct] = useState<NBackPercentiles | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!user?.id) return () => { alive = false; };
    fetchNBackState(user.id).then(st => {
      if (!alive) return;
      setState(st);
      if (st.challenge_started_on) {
        fetchChallengeStats(user.id, st.challenge_started_on).then(c => { if (alive) setChallenge(c); });
      }
    });
    fetchNBackPercentiles().then(p => { if (alive) setPct(p); });
    return () => { alive = false; };
  }, [user?.id]));

  const chart = useMemo(() => {
    const points = challenge?.points ?? [];
    if (points.length === 0) return null;
    const maxN = Math.max(2, ...points.map(p => p.avgN));
    const stepX = points.length > 1 ? CHART_W / (points.length - 1) : 0;
    const coords = points.map((p, i) => {
      const x = points.length > 1 ? i * stepX : CHART_W / 2;
      const y = CHART_H - (p.avgN / maxN) * (CHART_H - 16) - 8;
      return `${x},${y}`;
    });
    return { coords: coords.join(' '), maxN };
  }, [challenge]);

  const badge = badgeForBestN(state?.best_n ?? NBACK_CONFIG.N_START);

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <StickyPillarBanner scrolled={scrolled} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={s.scroll}
      >
        <View style={s.header}>
          <EliteText style={s.kicker}>N-BACK</EliteText>
          <EliteText style={s.title}>Estadísticas</EliteText>
        </View>

        <View style={s.body}>
          {/* Tabs */}
          <View style={s.tabs}>
            {([
              { key: 'overview', label: 'Resumen' },
              { key: 'reto', label: 'Reto' },
              { key: 'ranking', label: 'Ranking' },
            ] as { key: Tab; label: string }[]).map(t => (
              <AnimatedPressable
                key={t.key}
                style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
                onPress={() => { haptic.light(); setTab(t.key); }}
              >
                <EliteText style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</EliteText>
              </AnimatedPressable>
            ))}
          </View>

          {tab === 'overview' && (
            <>
              <StatCard
                label="ROUNDS TOTALES"
                value={`${state?.sessions_total ?? 0}`}
                percentile={pct ? `Igualas o superas al ${pct.sessionsPct}% de usuarios` : undefined}
              />
              <StatCard
                label="RACHA ACTUAL"
                value={`${state?.streak_days ?? 0} ${state?.streak_days === 1 ? 'día' : 'días'}`}
                percentile={pct ? `Igualas o superas al ${pct.streakPct}%` : undefined}
              />
              <StatCard
                label="NIVEL MÁXIMO"
                value={`N = ${state?.best_n ?? NBACK_CONFIG.N_START}`}
                percentile={pct ? `Igualas o superas al ${pct.bestNPct}%` : undefined}
                extra={`${badge.emoji} ${badge.label}`}
              />
              <StatCard
                label="TIEMPO ENTRENADO"
                value={`${state?.time_practiced_total_min ?? 0} min`}
              />
            </>
          )}

          {tab === 'reto' && (
            <>
              <View style={s.card}>
                <EliteText style={s.cardKicker}>NIVEL A LO LARGO DEL RETO</EliteText>
                {chart ? (
                  <>
                    <Svg width={CHART_W} height={CHART_H} style={{ alignSelf: 'center', marginTop: Spacing.sm }}>
                      <SvgLine x1={0} y1={CHART_H - 8} x2={CHART_W} y2={CHART_H - 8} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                      <Polyline
                        points={chart.coords}
                        fill="none"
                        stroke={ATP_BRAND.lime}
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </Svg>
                    <EliteText style={s.chartHint}>Máx del periodo: N = {chart.maxN.toFixed(1)}</EliteText>
                  </>
                ) : (
                  <EliteText style={s.empty}>Completa tu primer round para ver tu curva.</EliteText>
                )}
              </View>
              <View style={s.miniGrid}>
                <MiniStat label="Días activos" value={`${challenge?.activeDays ?? 0}/${NBACK_CONFIG.CHALLENGE_DAYS}`} />
                <MiniStat label="Nivel promedio" value={(challenge?.avgLevel ?? 0).toFixed(1)} />
                <MiniStat label="Visual" value={`${challenge?.avgVisualPct ?? 0}%`} />
                <MiniStat label="Auditivo" value={`${challenge?.avgAudioPct ?? 0}%`} />
              </View>
            </>
          )}

          {tab === 'ranking' && (
            <View style={s.card}>
              <View style={s.soonBadge}><EliteText style={s.soonText}>PRONTO</EliteText></View>
              <EliteText style={s.cardTitle}>Leaderboard de la comunidad</EliteText>
              <EliteText style={s.empty}>
                Compite por N máximo y racha, estilo Strava. Llega con el módulo
                Comunidad — tus datos cognitivos son privados y solo entran al
                ranking si tú decides compartirlos (opt-in).
              </EliteText>
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, percentile, extra }: {
  label: string; value: string; percentile?: string; extra?: string;
}) {
  return (
    <View style={s.card}>
      <EliteText style={s.cardKicker}>{label}</EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <EliteText style={s.statValue}>{value}</EliteText>
        {extra && <EliteText style={s.statExtra}>{extra}</EliteText>}
      </View>
      {percentile && <EliteText style={s.statPct}>{percentile}</EliteText>}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.miniStat}>
      <EliteText style={s.miniValue}>{value}</EliteText>
      <EliteText style={s.miniLabel}>{label}</EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: Spacing.xxl },
  header: { paddingTop: 108, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  kicker: { color: '#7F77DD', fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { color: '#fff', fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 2 },
  body: { paddingHorizontal: Spacing.md },

  tabs: {
    flexDirection: 'row', gap: 8, marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'transparent',
  },
  tabBtnActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.15), borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  tabText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  tabTextActive: { color: ATP_BRAND.lime },

  card: {
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardKicker: { color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  cardTitle: { color: '#fff', fontSize: FontSizes.xl, fontFamily: Fonts.bold, marginTop: 6 },
  statValue: { color: '#fff', fontSize: 32, fontFamily: Fonts.extraBold, marginTop: 4 },
  statExtra: { color: '#b9b3f0', fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  statPct: { color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: 4 },
  chartHint: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 6 },
  empty: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 20 },

  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  miniStat: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
  },
  miniValue: { color: '#fff', fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  miniLabel: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },

  soonBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6,
  },
  soonText: { color: TEXT.secondary, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2 },
});
