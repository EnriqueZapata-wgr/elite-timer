/**
 * Health Hub — ATP SALUD
 *
 * Protocolos, Glucosa, Cetonas, Labs, Biomarcadores, Dominios de salud.
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

const HEALTH_ITEMS = [
  {
    name: 'Protocolos',
    subtitle: 'Configura electrones, metas y horarios',
    icon: 'settings-outline' as const,
    color: '#a8e02a',
    route: '/protocol-config',
  },
  {
    name: 'Glucosa',
    subtitle: 'Registro y rangos funcionales',
    icon: 'analytics-outline' as const,
    color: '#fb923c',
    route: '/glucose-log',
  },
  {
    name: 'Cetonas en sangre',
    subtitle: 'Monitoreo de cetosis',
    icon: 'water-outline' as const,
    color: '#c084fc',
    route: '/ketones-log',
    comingSoon: true,
  },
  {
    name: 'Laboratorios',
    subtitle: 'Sube y consulta tus estudios',
    icon: 'document-text-outline' as const,
    color: '#60a5fa',
    route: '/labs',
    comingSoon: true,
  },
  {
    name: 'Biomarcadores',
    subtitle: 'Métricas de salud integral',
    icon: 'pulse-outline' as const,
    color: '#22c55e',
    route: '/health-metrics',
    comingSoon: true,
  },
  {
    name: 'Dominios de salud',
    subtitle: '10 áreas que definen tu ATP Score',
    icon: 'grid-outline' as const,
    color: '#1D9E75',
    route: '/health-domains',
    comingSoon: true,
  },
];

export default function HealthHubScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="SALUD" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Tu ecosistema de salud funcional
          </EliteText>
        </Animated.View>

        {HEALTH_ITEMS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(100 + idx * 50).springify()}>
            <AnimatedPressable
              disabled={item.comingSoon}
              onPress={() => {
                if (item.comingSoon) return;
                haptic.medium();
                router.push(item.route as any);
              }}
            >
              <GradientCard
                color={item.color}
                style={[s.card, item.comingSoon && s.cardDisabled]}
              >
                <View style={s.cardContent}>
                  <View style={[s.iconWrap, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={s.cardInfo}>
                    <EliteText style={[s.cardName, item.comingSoon && { color: TEXT_COLORS.muted }]}>
                      {item.name}
                    </EliteText>
                    <EliteText variant="caption" style={s.cardSub}>{item.subtitle}</EliteText>
                  </View>
                  {item.comingSoon ? (
                    <View style={[s.badge, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                      <EliteText style={[s.badgeText, { color: item.color }]}>PRONTO</EliteText>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.secondary} />
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
  cardDisabled: {
    opacity: 0.45,
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
});
