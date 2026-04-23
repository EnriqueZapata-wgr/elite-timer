/**
 * Mi Fitness — Fuerza, Cardio, Movilidad, Récords personales.
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, withOpacity } from '@/src/constants/brand';

const ITEMS = [
  { name: 'Fuerza', subtitle: 'Benchmarks · Variantes · PRs', icon: 'barbell-outline' as const, color: '#a8e02a', route: '/fitness-strength' },
  { name: 'Cardio', subtitle: 'Sesiones · Distancias · Tiempos', icon: 'pulse-outline' as const, color: '#ef4444', route: '/fitness-cardio' },
  { name: 'Movilidad', subtitle: 'Evaluaciones · Rango de movimiento', icon: 'body-outline' as const, color: '#c084fc', route: '/mobility-assessment' },
  { name: 'Récords personales', subtitle: 'Todos tus PRs en un lugar', icon: 'trophy-outline' as const, color: '#fbbf24', route: '/personal-records' },
];

export default function FitnessMyScreen() {
  const router = useRouter();

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Mi Fitness" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {ITEMS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(50 + idx * 50).springify()}>
            <AnimatedPressable onPress={() => { haptic.medium(); router.push(item.route as any); }}>
              <GradientCard color={item.color} style={s.card}>
                <View style={s.row}>
                  <View style={[s.icon, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.name}>{item.name}</EliteText>
                    <EliteText style={s.sub}>{item.subtitle}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.muted} />
                </View>
              </GradientCard>
            </AnimatedPressable>
          </Animated.View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginBottom: 2 },
  sub: { fontSize: FontSizes.xs, color: TEXT_COLORS.secondary },
});
