/**
 * Índice de Pruebas Cinemáticas — las 4 pruebas de fitness (plank, BOLT, old man,
 * recovery HR) con su último valor capturado. Tap → pantalla individual.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getLatestKinematicTests, type KinematicTestKey } from '@/src/services/edad-atp/kinematic-tests-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type Row = { key: KinematicTestKey; label: string; subtitle: string; unit: string; icon: any; route: string };

const TESTS: Row[] = [
  { key: 'plank', label: 'Plank', subtitle: 'Plancha isométrica', unit: 's', icon: 'body-outline', route: '/edad-atp/test-plank' },
  { key: 'bolt', label: 'BOLT', subtitle: 'Tolerancia al CO2', unit: 's', icon: 'cloud-outline', route: '/edad-atp/test-bolt' },
  { key: 'old_man_test', label: 'Old Man Test', subtitle: 'Sit-rise (0–10 pts)', unit: 'pts', icon: 'accessibility-outline', route: '/edad-atp/test-old-man' },
  { key: 'recovery_hr', label: 'Recovery HR', subtitle: 'Recuperación a 1 min', unit: 'BPM', icon: 'heart-outline', route: '/edad-atp/test-recovery-hr' },
];

function daysAgoLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const d = Math.max(0, Math.round((Date.now() - then) / 86400000));
  return d === 0 ? 'hoy' : `hace ${d}d`;
}

export default function CinematicTestsIndex() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<Record<string, { value: number; measured_at: string }>>({});

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestKinematicTests(user.id).then(setLatest);
  }, [user?.id]));

  const done = TESTS.filter((t) => latest[t.key] != null).length;

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Pruebas Cinemáticas" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>
          4 pruebas que completan tu Edad Fitness. {done}/4 capturadas. Hazlas cuando quieras y captura tu resultado.
        </EliteText>

        {TESTS.map((t, i) => {
          const v = latest[t.key];
          return (
            <Animated.View key={t.key} entering={FadeInUp.delay(60 + i * 50).springify()}>
              <AnimatedPressable onPress={() => { haptic.light(); router.push(t.route as any); }} style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(168,224,42,0.12)' }]}>
                  <Ionicons name={t.icon} size={22} color={Colors.neonGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.label}>{t.label}</EliteText>
                  <EliteText variant="caption" style={styles.subtitle}>{t.subtitle}</EliteText>
                </View>
                <View style={styles.valueCol}>
                  {v != null ? (
                    <>
                      <EliteText variant="body" style={styles.value}>{v.value} {t.unit}</EliteText>
                      <EliteText variant="caption" style={styles.date}>{daysAgoLabel(v.measured_at)}</EliteText>
                    </>
                  ) : (
                    <EliteText variant="caption" style={styles.pending}>Sin capturar</EliteText>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </AnimatedPressable>
            </Animated.View>
          );
        })}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  valueCol: { alignItems: 'flex-end' },
  value: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  date: { color: Colors.textMuted, fontSize: FontSizes.xs },
  pending: { color: Colors.textMuted, fontSize: FontSizes.xs },
});
