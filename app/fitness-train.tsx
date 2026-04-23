/**
 * Entrenar — ARGOS hero + Mis rutinas, Construir, Timer rápido, Registrar ejercicio.
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, withOpacity } from '@/src/constants/brand';

const ITEMS = [
  { name: 'Mis rutinas', subtitle: 'Rutinas guardadas listas para ejecutar', icon: 'list-outline' as const, color: '#a8e02a', route: '/my-routines' },
  { name: 'Construir rutina', subtitle: 'Crea tu rutina desde cero', icon: 'construct-outline' as const, color: '#60a5fa', route: '/builder', params: { mode: 'routine' } },
  { name: 'Timer rápido', subtitle: 'Tabata · HIIT · EMOM — configura y GO', icon: 'timer-outline' as const, color: '#fb923c', route: '/builder', params: { mode: 'timer' } },
  { name: 'Registrar ejercicio', subtitle: 'Loguea sets, reps y peso', icon: 'add-circle-outline' as const, color: '#34d399', route: '/log-exercise' },
];

export default function FitnessTrainScreen() {
  const router = useRouter();

  function nav(item: typeof ITEMS[number]) {
    haptic.medium();
    if (item.params) {
      router.push({ pathname: item.route, params: item.params } as any);
    } else {
      router.push(item.route as any);
    }
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Entrenar" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* ARGOS hero */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/argos-routine'); }}>
            <LinearGradient
              colors={['rgba(168,224,42,0.12)', 'rgba(168,224,42,0.04)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.argosCard}
            >
              <View style={s.argosIcon}>
                <Ionicons name="eye-outline" size={26} color="#a8e02a" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.argosTitle}>ARGOS genera tu rutina</EliteText>
                <EliteText style={s.argosSub}>IA que conoce tu nivel, PRs y objetivos</EliteText>
              </View>
              <Ionicons name="sparkles-outline" size={20} color="#a8e02a" />
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        {/* Items */}
        {ITEMS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(100 + idx * 50).springify()}>
            <AnimatedPressable onPress={() => nav(item)}>
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

  // ARGOS
  argosCard: {
    borderRadius: 18, padding: 20, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  argosIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(168,224,42,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  argosTitle: { color: '#a8e02a', fontSize: 16, fontFamily: Fonts.extraBold },
  argosSub: { color: '#999', fontSize: 12, marginTop: 2 },

  // Items
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginBottom: 2 },
  sub: { fontSize: FontSizes.xs, color: TEXT_COLORS.secondary },
});
