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
import { TEXT_COLORS, CATEGORY_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';

// MB-3.6: Fuerza y Récords FUSIONADAS (un dato = un lugar); Movilidad
// reactivada — la evaluación real vive en /mobility-assessment (Bloque 2).
const ITEMS = [
  { name: 'Fuerza y récords', subtitle: 'Benchmarks · variantes · todos tus PRs', icon: 'barbell-outline' as const, color: CATEGORY_COLORS.fitness, route: '/fitness-strength' as const },
  { name: 'Cardio', subtitle: 'Sesiones · distancias · tiempos', icon: 'pulse-outline' as const, color: SEMANTIC.error, route: '/fitness-cardio' as const },
  { name: 'Movilidad', subtitle: 'Evalúate · rutinas de movilidad', icon: 'body-outline' as const, color: CATEGORY_COLORS.mind, route: '/mobility-assessment' as const },
];

export default function FitnessMyScreen() {
  const router = useRouter();

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Mi Fitness" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {ITEMS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(50 + idx * 50).springify()}>
            <AnimatedPressable onPress={() => { haptic.medium(); router.push(item.route); }}>
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
