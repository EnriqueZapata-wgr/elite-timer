/**
 * Historial de Sesiones — Lista cronológica de execution_logs
 * agrupada por fecha, con cards premium por modo (timer/rutina).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { EliteText } from '@/components/elite-text';
import { formatTime } from '@/src/engine/helpers';
import { Colors, Fonts, Spacing, FontSizes, Radius } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC } from '@/src/constants/brand';
import {
  getSessionHistory,
  type SessionHistoryEntry,
} from '@/src/services/exercise-service';

// === HELPERS ===

function groupByDate(sessions: SessionHistoryEntry[]): Map<string, SessionHistoryEntry[]> {
  const groups = new Map<string, SessionHistoryEntry[]>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    let label: string;
    if (dayStart === today) label = 'Hoy';
    else if (dayStart === yesterday) label = 'Ayer';
    else label = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

    const existing = groups.get(label) ?? [];
    existing.push(s);
    groups.set(label, existing);
  }

  return groups;
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatSessionTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// === SCREEN ===

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getSessionHistory(50);
      setSessions(data);
    } catch { /* silencioso */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const grouped = groupByDate(sessions);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title" style={styles.headerTitle}>HISTORIAL</EliteText>
      </Animated.View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.neonGreen} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={48} color={Colors.textSecondary} />
          <EliteText variant="body" style={styles.emptyText}>
            Sin sesiones registradas
          </EliteText>
          <EliteText variant="caption" style={styles.emptySubtext}>
            Completa una rutina para ver tu historial aquí
          </EliteText>
        </View>
      ) : (
        <Animated.View entering={FadeInUp.delay(150).springify()} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.neonGreen} />
          }
        >
          {Array.from(grouped.entries()).map(([dateLabel, daySessions]) => (
            <View key={dateLabel} style={styles.dateGroup}>
              <EliteText variant="caption" style={styles.dateLabel}>{dateLabel}</EliteText>

              {daySessions.map((session) => {
                const isTimer = session.mode === 'timer';
                const gradColors: readonly [string, string] = isTimer
                  ? ['#1a2a1a', '#0a1a0a']
                  : ['#1a1a2a', '#0a0a1a'];
                const accentColor = isTimer ? Colors.neonGreen : CATEGORY_COLORS.mind;
                const modeLabel = isTimer ? 'TIMER' : 'RUTINA';

                return (
                  <LinearGradient key={session.id} colors={gradColors} style={styles.sessionCard}>
                    <View style={[styles.sessionAccent, { backgroundColor: accentColor }]} />

                    <View style={styles.sessionContent}>
                      <View style={styles.sessionTop}>
                        <EliteText variant="body" style={styles.sessionName} numberOfLines={1}>
                          {session.routineName}
                        </EliteText>
                        <View style={[styles.modeBadge, { backgroundColor: accentColor + '20' }]}>
                          <EliteText variant="caption" style={[styles.modeBadgeText, { color: accentColor }]}>
                            {modeLabel}
                          </EliteText>
                        </View>
                      </View>

                      <View style={styles.sessionMeta}>
                        <EliteText variant="caption" style={styles.sessionMetaText}>
                          {formatSessionTime(session.startedAt)}
                        </EliteText>
                        <EliteText variant="caption" style={styles.sessionMetaDot}>·</EliteText>
                        <EliteText variant="caption" style={styles.sessionMetaText}>
                          {formatTime(session.totalDurationSeconds)}
                        </EliteText>
                        {session.status !== 'completed' && (
                          <>
                            <EliteText variant="caption" style={styles.sessionMetaDot}>·</EliteText>
                            <EliteText variant="caption" style={[styles.sessionMetaText, { color: SEMANTIC.warning }]}>
                              Abandonada
                            </EliteText>
                          </>
                        )}
                      </View>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>
          ))}

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.lg, letterSpacing: 3 },

  // Empty
  emptyText: { color: Colors.textSecondary },
  emptySubtext: { color: Colors.textSecondary, fontSize: 12 },

  // Date group
  dateGroup: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: 11,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.sm,
  },

  // Session card
  sessionCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: Spacing.md + 6,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sessionAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  sessionContent: {
    gap: Spacing.xs,
  },
  sessionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionName: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    flex: 1,
    marginRight: Spacing.sm,
  },
  modeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  modeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sessionMetaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  sessionMetaDot: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
