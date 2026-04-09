/**
 * Fitness HIIT — Pantalla dedicada a HIIT y timer.
 *
 * Sale del fitness-hub: presets de Tabata, EMOM, AMRAP, 30/30
 * y boton para crear timer personalizado.
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CARD } from '@/src/constants/brand';

const ORANGE = '#fb923c';
const ORANGE_GRADIENT = { start: 'rgba(251,146,60,0.10)', end: 'rgba(251,146,60,0.02)' };

interface HIITPreset {
  name: string;
  description: string;
  metaText: string;
  params: Record<string, string>;
}

const HIIT_PRESETS: HIITPreset[] = [
  {
    name: 'Tabata clásico',
    description: '20s máximo esfuerzo / 10s descanso x 8 rondas',
    metaText: '20/10 x 8 · 4 min',
    params: { mode: 'tabata', work: '20', rest: '10', rounds: '8' },
  },
  {
    name: 'EMOM 10 min',
    description: 'Every Minute On the Minute — 1 ejercicio cada minuto',
    metaText: '10 min',
    params: { mode: 'emom', duration: '600' },
  },
  {
    name: 'AMRAP 15 min',
    description: 'As Many Rounds As Possible en 15 minutos',
    metaText: '15 min',
    params: { mode: 'amrap', duration: '900' },
  },
  {
    name: '30/30 x 10',
    description: '30s trabajo / 30s descanso x 10 rondas',
    metaText: '30/30 x 10 · 10 min',
    params: { mode: 'intervals', work: '30', rest: '30', rounds: '10' },
  },
];

export default function FitnessHIITScreen() {
  const router = useRouter();

  const startPreset = (preset: HIITPreset) => {
    haptic.medium();
    router.push({ pathname: '/timer', params: preset.params } as any);
  };

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="HIIT / Timer" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <SectionTitle>WORKOUTS</SectionTitle>

        {HIIT_PRESETS.map((preset, i) => (
          <Animated.View key={preset.name} entering={FadeInUp.delay(50 + i * 40).springify()}>
            <AnimatedPressable onPress={() => startPreset(preset)} style={s.cardWrap}>
              <GradientCard gradient={ORANGE_GRADIENT} accentColor={ORANGE} accentPosition="left">
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.name}>{preset.name}</EliteText>
                    <EliteText style={s.desc}>{preset.description}</EliteText>
                    <EliteText style={s.meta}>{preset.metaText}</EliteText>
                  </View>
                  <View style={s.playBtn}>
                    <Ionicons name="play" size={14} color="#000" />
                  </View>
                </View>
              </GradientCard>
            </AnimatedPressable>
          </Animated.View>
        ))}

        <AnimatedPressable
          style={s.ctaButtonGhost}
          onPress={() => { haptic.light(); router.push('/builder'); }}
        >
          <Ionicons name="create-outline" size={18} color={ORANGE} />
          <EliteText style={s.ctaTextGhost}>CREAR HIIT PERSONALIZADO</EliteText>
        </AnimatedPressable>

        <AnimatedPressable
          style={s.ctaButton}
          onPress={() => { haptic.medium(); router.push('/timer'); }}
        >
          <Ionicons name="timer-outline" size={20} color="#000" />
          <EliteText style={s.ctaText}>ABRIR TIMER LIBRE</EliteText>
        </AnimatedPressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  cardWrap: { marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  desc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#bbb',
    marginTop: 2,
  },
  meta: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: ORANGE,
    letterSpacing: 1,
    marginTop: 4,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  ctaText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1.5,
  },
  ctaButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: CARD.bg,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.3)',
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  ctaTextGhost: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: ORANGE,
    letterSpacing: 1.5,
  },
});
