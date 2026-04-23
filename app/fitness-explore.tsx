/**
 * Explorar — Biblioteca, Métodos ATP, Planes (PRONTO), Follow Me (PRONTO).
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
  { name: 'Biblioteca de ejercicios', subtitle: 'GYM · Calistenia · Kettlebell · Biomecánica', icon: 'book-outline' as const, color: '#38bdf8', route: '/exercise-library' },
  { name: 'Métodos ATP', subtitle: '3-5 · EMOM Auto · Myo Reps', icon: 'flash-outline' as const, color: '#a8e02a', route: '/training-methods' },
  { name: 'Planes de entrenamiento', subtitle: '5K · 10K · 21K · Maratón · Ultra', icon: 'map-outline' as const, color: '#f59e0b', route: '', comingSoon: true },
  { name: 'Rutinas Follow Me', subtitle: 'Cardio · Core · Animal Motion · KB Flows', icon: 'play-circle-outline' as const, color: '#fb7185', route: '', comingSoon: true },
];

export default function FitnessExploreScreen() {
  const router = useRouter();

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Explorar" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {ITEMS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(50 + idx * 50).springify()}>
            <AnimatedPressable
              disabled={item.comingSoon}
              onPress={() => {
                if (item.comingSoon) return;
                haptic.medium();
                router.push(item.route as any);
              }}
            >
              <GradientCard color={item.color} style={[s.card, item.comingSoon && s.cardDisabled]}>
                <View style={s.row}>
                  <View style={[s.icon, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.name, item.comingSoon && { color: TEXT_COLORS.muted }]}>{item.name}</EliteText>
                    <EliteText style={s.sub}>{item.subtitle}</EliteText>
                  </View>
                  {item.comingSoon ? (
                    <View style={[s.badge, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                      <EliteText style={[s.badgeText, { color: item.color }]}>PRONTO</EliteText>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.muted} />
                  )}
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
  cardDisabled: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginBottom: 2 },
  sub: { fontSize: FontSizes.xs, color: TEXT_COLORS.secondary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1 },
});
