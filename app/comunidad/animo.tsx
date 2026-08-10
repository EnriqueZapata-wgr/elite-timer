/**
 * Comunidad › Ánimo de tu gente (MB-4 · Bloque 4).
 *
 * Acompañamiento, no competencia: cada card es alguien que ELIGIÓ compartir
 * cómo está (opt-in por check-in, mig 226). Sin métricas comparativas, sin
 * ranking de ánimo. La respuesta es una reacción cálida, no un like.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { QUADRANTS, type QuadrantKey } from '@/src/data/emotions-library';
import {
  getFriendsMoods, reactToMood, getMyShares, unshareMood,
  type FriendMoodRow, type MyShareRow,
} from '@/src/services/community/mood-share-service';
import { MOOD_REACTIONS, timeAgoEs, type MoodReactionKind } from '@/src/services/community/mood-share-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { TEXT, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

const quadrantColor = (q: string) => QUADRANTS[q as QuadrantKey]?.color ?? TEXT.secondary;
const quadrantLabel = (q: string) => QUADRANTS[q as QuadrantKey]?.label ?? '';

export default function AnimoScreen() {
  const router = useRouter();
  const { kind, tokens: t } = useAppTheme();
  const [moods, setMoods] = useState<FriendMoodRow[]>([]);
  const [mine, setMine] = useState<MyShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [friends, myShares] = await Promise.all([getFriendsMoods(), getMyShares()]);
    setMoods(friends);
    setMine(myShares);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleReact = async (row: FriendMoodRow, kind: MoodReactionKind) => {
    haptic.light();
    // Optimista: la reacción se pinta ya; el server valida amistad/blocks.
    setMoods(prev => prev.map(m => (m.share_id === row.share_id ? { ...m, my_reaction: kind } : m)));
    const code = await reactToMood(row.share_id, kind);
    if (code !== 'reacted') {
      setMoods(prev => prev.map(m => (m.share_id === row.share_id ? { ...m, my_reaction: row.my_reaction } : m)));
    }
  };

  const handleUnshare = async (share: MyShareRow) => {
    haptic.light();
    const ok = await unshareMood(share.id);
    if (ok) setMine(prev => prev.filter(s => s.id !== share.id));
  };

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Ánimo de tu gente" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.textoSecundario} />}
      >
        {!loading && moods.length === 0 && (
          <EmptyState
            icon="people-outline"
            title="Nadie ha compartido todavía"
            subtitle="Cuando alguien de tu gente comparta un check-in, aparece aquí. Compartir siempre es una elección."
          />
        )}

        {moods.map((row, i) => {
          const color = quadrantColor(row.shared_quadrant);
          const name = row.friend_display_name || row.friend_username || 'Alguien de tu gente';
          return (
            <Animated.View key={row.share_id} entering={FadeInUp.delay(Math.min(i, 8) * 50).springify()}>
              <View style={[styles.card, { backgroundColor: t.card, borderColor: t.borde }]}>
                <LinearGradient
                  colors={[withOpacity(color, 0.14), 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.cardHeader}>
                  <UserAvatar uri={row.friend_avatar_url} name={name} size={38} />
                  <View style={{ flex: 1 }}>
                    <EliteText style={[styles.name, { color: t.texto }]} numberOfLines={1}>{name}</EliteText>
                    <EliteText variant="caption" style={[styles.time, { color: t.textoTenue }]}>{timeAgoEs(row.shared_at)}</EliteText>
                  </View>
                  <View style={[styles.moodDot, { backgroundColor: color }]} />
                </View>
                <EliteText style={[styles.moodLabel, { color }]}>
                  {row.shared_emotion_label ?? quadrantLabel(row.shared_quadrant)}
                </EliteText>
                <View style={styles.reactRow}>
                  {MOOD_REACTIONS.map(r => {
                    const active = row.my_reaction === r.kind;
                    return (
                      <Pressable
                        key={r.kind}
                        onPress={() => handleReact(row, r.kind)}
                        style={[styles.reactBtn, { borderColor: t.flotante }, active && { backgroundColor: withOpacity(color, 0.18), borderColor: withOpacity(color, 0.5) }]}
                        hitSlop={4}
                      >
                        <Ionicons name={r.icon as any} size={13} color={active ? color : t.textoSecundario} />
                        <EliteText variant="caption" style={[styles.reactText, { color: t.textoSecundario }, active && { color }]}>
                          {r.label}
                        </EliteText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          );
        })}

        {/* Lo que tú compartiste — con derecho a retirarlo */}
        {mine.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <EliteText variant="caption" style={[styles.sectionTitle, { color: t.textoSecundario }]}>LO QUE TÚ COMPARTISTE</EliteText>
            {mine.map(share => {
              const color = quadrantColor(share.quadrant);
              const received = share.reactions.length > 0
                ? MOOD_REACTIONS.filter(r => share.reactions.includes(r.kind))
                : [];
              return (
                <View key={share.id} style={[styles.mineRow, { backgroundColor: t.card, borderColor: t.borde }]}>
                  <View style={[styles.moodDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <EliteText variant="body" style={[styles.mineLabel, { color }]}>
                      {share.emotion_label ?? quadrantLabel(share.quadrant)}
                    </EliteText>
                    <EliteText variant="caption" style={[styles.time, { color: t.textoTenue }]}>
                      {timeAgoEs(share.created_at)}
                      {received.length > 0 && ` · te respondieron: ${received.map(r => r.label.toLowerCase()).join(', ')}`}
                    </EliteText>
                  </View>
                  <Pressable onPress={() => handleUnshare(share)} hitSlop={8}>
                    <Ionicons name="close-circle-outline" size={18} color={t.textoSecundario} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card, overflow: 'hidden',
    borderWidth: 0.5,
    padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  time: { fontSize: FontSizes.xs, marginTop: 1 },
  moodDot: { width: 12, height: 12, borderRadius: 6 },
  moodLabel: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl, marginTop: Spacing.sm },
  reactRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  reactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  reactText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  sectionTitle: {
    fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md,
  },
  mineRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    padding: Spacing.sm + 2, marginHorizontal: Spacing.md, marginBottom: 6,
  },
  mineLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
});
