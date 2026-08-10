/**
 * Comunidad › Ranking (C4) — leaderboard top 20 + tu posición destacada.
 *
 * Copy "Comunidad, no competencia": el ranking celebra la constancia, no compite
 * egos. Respeta los flags de visibilidad (electrones/racha/foto pueden venir en
 * NULL desde el RPC). Fuente: get_leaderboard / get_my_leaderboard_position (180).
 *
 * Anti-fuga: solo consume electron_balance + user_profile_public vía RPC. Ningún
 * dato clínico existe en esta pantalla.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import {
  getLeaderboard,
  getMyPosition,
  type LeaderboardScope,
} from '@/src/services/community/leaderboard-service';
import {
  formatMyPosition,
  isInTop,
  type RankedLeaderboardRow,
  type MyPosition,
} from '@/src/services/community/leaderboard-core';
import { rankTierLabel } from '@/src/services/economy/rank';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

const TOP_SIZE = 20;

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// V1.1 §2.3: scope temporal del board (get_leaderboard windowed, mig 192).
const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'all_time', label: 'Histórico' },
];

const SCOPE_FOOTNOTES: Record<LeaderboardScope, string> = {
  week: 'El ranking semanal usa tus electrones de los últimos 7 días. Los perfiles privados aparecen con datos ocultos.',
  month: 'El ranking mensual usa tus electrones de los últimos 30 días. Los perfiles privados aparecen con datos ocultos.',
  all_time: 'El ranking usa tus electrones de por vida. Los perfiles privados aparecen con datos ocultos.',
};

function LeaderRow({ row, highlight }: { row: RankedLeaderboardRow; highlight?: boolean }) {
  const { tokens: t } = useAppTheme();
  const name = row.display_name ?? row.username ?? 'Atleta ATP';
  const medal = MEDALS[row.position];
  return (
    <Pressable
      style={[s.row, { backgroundColor: t.card, borderColor: t.borde }, highlight && s.rowHighlight]}
      onPress={() => router.push(`/comunidad/perfil/${row.user_id}`)}
    >
      <View style={s.posWrap}>
        {medal
          ? <EliteText style={s.medal}>{medal}</EliteText>
          : <EliteText style={[s.pos, { color: t.textoSecundario }]}>{row.position}</EliteText>}
      </View>
      <UserAvatar uri={row.avatar_url} name={name} size={38} />
      <View style={{ flex: 1 }}>
        <EliteText style={[s.name, { color: t.texto }]} numberOfLines={1}>{name}</EliteText>
        <EliteText style={[s.tier, { color: t.textoTenue }]}>
          {row.current_rank != null
            ? `Nivel ${row.current_rank} · ${rankTierLabel(row.current_rank)}`
            : 'Nivel privado'}
        </EliteText>
      </View>
      <View style={s.metrics}>
        {row.lifetime_electrons != null && (
          <EliteText style={s.electrons}>{row.lifetime_electrons.toLocaleString()} E-</EliteText>
        )}
        {row.streak_days != null && row.streak_days > 0 && (
          <EliteText style={[s.streak, { color: t.textoSecundario }]}>🔥 {row.streak_days}</EliteText>
        )}
      </View>
    </Pressable>
  );
}

export default function CommunityRankingScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const secTxt = { color: t.textoSecundario };
  const [rows, setRows] = useState<RankedLeaderboardRow[]>([]);
  const [me, setMe] = useState<MyPosition | null>(null);
  const [scope, setScope] = useState<LeaderboardScope>('all_time');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // getMyPosition es all-time (la card "Tu posición" siempre habla de por vida).
    const [board, pos] = await Promise.all([getLeaderboard(scope), getMyPosition()]);
    setRows(board);
    setMe(pos);
    setLoading(false);
  }, [scope]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const meInTop = isInTop(me, TOP_SIZE);

  return (
    <ThemeReady>
    <ScrollView
      style={[s.screen, { backgroundColor: t.fondo }]}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
    >
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <View style={{ paddingTop: insets.top + 8 }}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={t.texto} />
          </Pressable>
          {/* C2: acceso a Amigos desde el header de comunidad */}
          <Pressable onPress={() => router.push('/comunidad/amigos')} hitSlop={12}>
            <Ionicons name="people-outline" size={22} color={t.texto} />
          </Pressable>
        </View>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.title, { color: t.texto }]}>Ranking</EliteText>
          <EliteText style={[s.subtitle, secTxt]}>Comunidad, no competencia. Celebramos la constancia.</EliteText>
        </Animated.View>
      </View>

      {/* Tu posición destacada */}
      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <View style={s.meCard}>
          <View style={{ flex: 1 }}>
            <EliteText style={[s.meLabel, { color: acento }]}>TU POSICIÓN</EliteText>
            <EliteText style={[s.mePos, { color: t.texto }]}>{formatMyPosition(me)}</EliteText>
          </View>
          {me && (
            <View style={{ alignItems: 'flex-end' }}>
              <EliteText style={s.meElectrons}>{me.lifetime_electrons.toLocaleString()} E-</EliteText>
              <EliteText style={[s.meTier, secTxt]}>Nivel {me.current_rank} · {rankTierLabel(me.current_rank)}</EliteText>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Selector de scope (V1.1 §2.3) */}
      <Animated.View entering={FadeInUp.delay(115).springify()}>
        <View style={s.scopeRow}>
          {SCOPES.map((sc) => {
            const active = scope === sc.key;
            return (
              <Pressable
                key={sc.key}
                onPress={() => setScope(sc.key)}
                style={[s.scopeChip, { backgroundColor: t.card, borderColor: t.borde }, active && s.scopeChipActive]}
              >
                <EliteText style={[s.scopeChipText, secTxt, active && { color: acento }]}>
                  {sc.label}
                </EliteText>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Top 20 */}
      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <EliteText style={[s.sectionTitle, secTxt]}>TOP {TOP_SIZE}</EliteText>
        {loading ? (
          <EliteText style={[s.empty, secTxt]}>Cargando…</EliteText>
        ) : rows.length === 0 ? (
          <EliteText style={[s.empty, secTxt]}>Aún no hay suficientes atletas en el ranking. Sé de los primeros.</EliteText>
        ) : (
          rows.map((row) => (
            <LeaderRow
              key={row.user_id}
              row={row}
              // La posición propia es all-time — solo se resalta en ese scope.
              highlight={scope === 'all_time' && meInTop && me?.position === row.position}
            />
          ))
        )}
      </Animated.View>

      <EliteText style={[s.footNote, { color: t.textoTenue }]}>{SCOPE_FOOTNOTES[scope]}</EliteText>
    </ScrollView>
    </ThemeReady>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  scopeRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  scopeChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1,
  },
  scopeChipActive: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
  },
  scopeChipText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  sectionTitle: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold,
    textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: 12,
  },
  meCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.08),
    borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg,
  },
  meLabel: { fontSize: 10, letterSpacing: 2, fontFamily: Fonts.semiBold },
  mePos: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, marginTop: 2 },
  meElectrons: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: ATP_BRAND.lime },
  meTier: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  rowHighlight: { borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  posWrap: { width: 28, alignItems: 'center' },
  pos: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  medal: { fontSize: 20 },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  tier: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  metrics: { alignItems: 'flex-end' },
  electrons: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: ATP_BRAND.lime },
  streak: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  empty: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: Spacing.lg },
  footNote: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: Spacing.lg, lineHeight: 16,
  },
});
