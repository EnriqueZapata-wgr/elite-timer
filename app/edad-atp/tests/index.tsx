/**
 * Edad ATP — hub de tests funcionales. Lista los tests con su última ejecución + CTA.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getLatestFunctionalTests, getLatestHealthMeasurement } from '@/src/services/edad-atp/capture-service';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

export default function TestsHub() {
  const { user } = useAuth();
  const [ft, setFt] = useState<Record<string, { value: number; measured_at: string }>>({});
  const [vo2, setVo2] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestFunctionalTests(user.id).then(setFt);
    getLatestHealthMeasurement(user.id).then((row) => setVo2(row?.vo2max_estimate ?? null));
  }, [user?.id]));

  const ftLast = (key: string, unit: string) => {
    const r = ft[key];
    return r ? `${Math.round(r.value)}${unit} · hace ${daysAgo(r.measured_at)}d` : 'Pendiente — toca para hacer';
  };

  const ROWS = [
    { icon: '🧠', title: 'Reaction Time', sub: ftLast('reaction_time_choice', 'ms'), route: '/edad-atp/tests/reaction-time' },
    { icon: '🏃', title: 'Cooper 12 min', sub: vo2 != null ? `VO2max ${vo2} ml/kg/min` : 'Pendiente — toca para hacer', route: '/edad-atp/tests/cooper' },
    { icon: '🦾', title: 'Push-ups máximas', sub: ftLast('push_ups_max', ' reps'), route: '/edad-atp/tests/push-ups' },
    { icon: '⚖️', title: 'Balance / Plank / Old Man', sub: ftLast('one_leg_balance', 's'), route: '/edad-atp/tests/balance' },
    { icon: '💪', title: 'Grip (dinamómetro)', sub: 'Se captura en Composición', route: '/edad-atp/composition' },
  ];

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Tests funcionales" />
      <ScrollView contentContainerStyle={styles.content}>
        {ROWS.map((r) => (
          <Pressable key={r.title} onPress={() => { haptic.medium(); router.push(r.route as any); }} style={styles.row}>
            <EliteText style={styles.emoji}>{r.icon}</EliteText>
            <View style={{ flex: 1 }}>
              <EliteText variant="body" style={styles.title}>{r.title}</EliteText>
              <EliteText variant="caption" style={styles.sub}>{r.sub}</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  emoji: { fontSize: 22 },
  title: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  sub: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
});
