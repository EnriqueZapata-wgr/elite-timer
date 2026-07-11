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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import {
  getLeaderboard,
  getMyPosition,
} from '@/src/services/community/leaderboard-service';
import {
  formatMyPosition,
  isInTop,
  type RankedLeaderboardRow,
  type MyPosition,
} from '@/src/services/community/leaderboard-core';
import { rankTierLabel } from '@/src/services/economy/rank';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

const TOP_SIZE = 20;

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function LeaderRow({ row, highlight }: { row: RankedLeaderboardRow; highlight?: boolean }) {
  const name = row.display_name ?? row.username ?? 'Atleta ATP';
  const medal = MEDALS[row.position];
  return (
    <Pressable
      style={[s.row, highlight && s.rowHighlight]}
      onPress={() => router.push(`/comunidad/perfil/${row.user_id}`)}
    >
      <View style={s.posWrap}>
        {medal
          ? <EliteText style={s.medal}>{medal}</EliteText>
          : <EliteText style={s.pos}>{row.position}</EliteText>}
      </View>
      <UserAvatar uri={row.avatar_url} name={name} size={38} />
      <View style={{ flex: 1 }}>
        <EliteText style={s.name} numberOfLines={1}>{name}</EliteText>
        <EliteText style={s.tier}>
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
          <EliteText style={s.streak}>🔥 {row.streak_days}</EliteText>
        )}
      </View>
    </Pressable>
  );
}

export default function CommunityRankingScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<RankedLeaderboardRow[]>([]);
  const [me, setMe] = useState<MyPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [board, pos] = await Promise.all([getLeaderboard('all_time'), getMyPosition()]);
    setRows(board);
    setMe(pos);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const meInTop = isInTop(me, TOP_SIZE);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
    >
      <View style={{ paddingTop: insets.top + 8 }}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </Pressable>
          {/* C2: acceso a Amigos desde el header de comunidad */}
          <Pressable onPress={() => router.push('/comunidad/amigos')} hitSlop={12}>
            <Ionicons name="people-outline" size={22} color={TEXT.primary} />
          </Pressable>
        </View>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.title}>Ranking</EliteText>
          <EliteText style={s.subtitle}>Comunidad, no competencia. Celebramos la constancia.</EliteText>
        </Animated.View>
      </View>

      {/* Tu posición destacada */}
      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <View style={s.meCard}>
          <View style={{ flex: 1 }}>
            <EliteText style={s.meLabel}>TU POSICIÓN</EliteText>
            <EliteText style={s.mePos}>{formatMyPosition(me)}</EliteText>
          </View>
          {me && (
            <View style={{ alignItems: 'flex-end' }}>
              <EliteText style={s.meElectrons}>{me.lifetime_electrons.toLocaleString()} E-</EliteText>
              <EliteText style={s.meTier}>Nivel {me.current_rank} · {rankTierLabel(me.current_rank)}</EliteText>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Top 20 */}
      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <EliteText style={s.sectionTitle}>TOP {TOP_SIZE}</EliteText>
        {loading ? (
          <EliteText style={s.empty}>Cargando…</EliteText>
        ) : rows.length === 0 ? (
          <EliteText style={s.empty}>Aún no hay suficientes atletas en el ranking. Sé de los primeros.</EliteText>
        ) : (
          rows.map((row) => (
            <LeaderRow
              key={row.user_id}
              row={row}
              highlight={meInTop && me?.position === row.position}
            />
          ))
        )}
      </Animated.View>

      <EliteText style={s.footNote}>
        El ranking usa tus electrones de por vida. Los perfiles privados aparecen con datos ocultos.
      </EliteText>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  sectionTitle: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold, color: TEXT.secondary,
    textTransform: 'uppercase', marginTop: Spacing.lg, marginBottom: 12,
  },
  meCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.08),
    borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg,
  },
  meLabel: { fontSize: 10, letterSpacing: 2, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  mePos: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: 2 },
  meElectrons: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: ATP_BRAND.lime },
  meTier: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  rowHighlight: { borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  posWrap: { width: 28, alignItems: 'center' },
  pos: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT.secondary },
  medal: { fontSize: 20 },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  tier: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2 },
  metrics: { alignItems: 'flex-end' },
  electrons: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: ATP_BRAND.lime },
  streak: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 2 },
  empty: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, textAlign: 'center', paddingVertical: Spacing.lg },
  footNote: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary,
    textAlign: 'center', marginTop: Spacing.lg, lineHeight: 16,
  },
});
