/**
 * Hábitos — sub-portal del frente HÁBITOS (Session 2 addendum).
 *
 * 4 sub-secciones: Nutrición, Suplementación, Fitness y Hábitos diarios.
 * "Hábitos diarios" lleva a /mind-hub (meditación, journal, respiración,
 * check-in, ciclo, ayuno, hidratación, ATP SOL). Rutas sin cambios.
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, withOpacity } from '@/src/constants/brand';

const SUBSECTIONS = [
  {
    name: 'Nutrición',
    subtitle: 'Comida · Recetas · Food scan',
    icon: 'nutrition-outline' as const,
    color: '#5B9BD5',
    route: '/nutrition',
  },
  {
    name: 'Suplementación',
    subtitle: 'Tu plan diario · Tracking · Sugerencias',
    icon: 'flask-outline' as const,
    color: '#EF9F27',
    route: '/supplements',
  },
  {
    name: 'Fitness',
    subtitle: 'Fuerza · Cardio · Movilidad · HIIT',
    icon: 'barbell-outline' as const,
    color: '#a8e02a',
    route: '/fitness-hub',
  },
  {
    name: 'Hábitos diarios',
    subtitle: 'Meditación · Journal · Ayuno · Ciclo · ATP SOL',
    icon: 'repeat-outline' as const,
    color: '#7F77DD',
    route: '/mind-hub',
  },
];

export default function HabitsPortalScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="mind" title="Hábitos" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Tu práctica diaria, en cuatro frentes
          </EliteText>
        </Animated.View>

        {SUBSECTIONS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(100 + idx * 50).springify()}>
            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push(item.route as any); }}
            >
              <GradientCard color={item.color} style={s.card}>
                <View style={s.cardContent}>
                  <View style={[s.iconWrap, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={s.cardInfo}>
                    <EliteText style={s.cardName}>{item.name}</EliteText>
                    <EliteText variant="caption" style={s.cardSub}>{item.subtitle}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.secondary} />
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
  scroll: {
    paddingHorizontal: Spacing.md,
  },
  subtitle: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: TEXT_COLORS.primary,
    marginBottom: 2,
  },
  cardSub: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.xs,
  },
});
