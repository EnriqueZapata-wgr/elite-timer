/**
 * Fitness HIIT — presets de Tabata, EMOM, AMRAP, 30/30 con voz
 * + builder para armar el propio. (El timer libre murio en MB-3.6 §1.1.)
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
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CARD, ATP_BRAND, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import type { Routine, Block } from '@/src/engine/types';

// MB-3.6 §4.2: acento de intensidad = amber de marca (el naranja #fb923c era
// un 4º color fuera de la doctrina lime+teal+amber).
const ORANGE = ATP_BRAND.amber;
const ORANGE_GRADIENT = { start: withOpacity(ATP_BRAND.amber, 0.1), end: withOpacity(ATP_BRAND.amber, 0.02) };

let _presetId = 0;
function presetId(): string { return `hiit-${Date.now()}-${++_presetId}`; }

/** Defaults para campos obligatorios de Block */
const BD: Omit<Block, 'id' | 'type' | 'label' | 'duration_seconds' | 'rounds' | 'children'> = {
  parent_block_id: null, sort_order: 0, rest_between_seconds: 0,
  color: null, sound_start: 'bell', sound_end: 'bell', notes: '',
};

/** Construye una rutina timer inline a partir de los parámetros del preset */
function buildPresetRoutine(name: string, p: Record<string, string>): Routine {
  const blocks: Block[] = [];
  const work = parseInt(p.work ?? '0', 10);
  const rest = parseInt(p.rest ?? '0', 10);
  const rounds = parseInt(p.rounds ?? '1', 10);
  const duration = parseInt(p.duration ?? '0', 10);

  if (work > 0 && rounds > 0) {
    // Interval-based: Tabata, 30/30, etc.
    const children: Block[] = [];
    children.push({ ...BD, id: presetId(), type: 'work', label: 'Trabajo', duration_seconds: work, rounds: 1 });
    if (rest > 0) children.push({ ...BD, id: presetId(), type: 'rest', label: 'Descanso', duration_seconds: rest, rounds: 1 });
    blocks.push({ ...BD, id: presetId(), type: 'group', label: name, duration_seconds: null, rounds, children });
  } else if (duration > 0) {
    // Duration-based: EMOM, AMRAP
    blocks.push({ ...BD, id: presetId(), type: 'work', label: name, duration_seconds: duration, rounds: 1 });
  }

  return {
    id: presetId(),
    name,
    description: '',
    category: 'hiit',
    mode: 'timer',
    blocks,
  };
}

// §4.4 caza de redundancia: metaText RETIRADO — repetía la descripción (y a
// veces el nombre) dentro de la MISMA card. Un dato = un lugar: la descripción
// lleva el formato completo incluida la duración total.
interface HIITPreset {
  name: string;
  description: string;
  params: Record<string, string>;
}

const HIIT_PRESETS: HIITPreset[] = [
  {
    name: 'Tabata clásico',
    description: '20s máximo esfuerzo / 10s descanso × 8 rondas · 4 min',
    params: { mode: 'tabata', work: '20', rest: '10', rounds: '8' },
  },
  {
    name: 'EMOM 10 min',
    description: 'Every Minute On the Minute — 1 ejercicio cada minuto',
    params: { mode: 'emom', work: '60', rest: '0', rounds: '10' },
  },
  {
    name: 'AMRAP 15 min',
    description: 'As Many Rounds As Possible — tantas rondas como puedas',
    params: { mode: 'amrap', duration: '900' },
  },
  {
    name: '30/30 × 10',
    description: '30s trabajo / 30s descanso × 10 rondas · 10 min',
    params: { mode: 'intervals', work: '30', rest: '30', rounds: '10' },
  },
];

export default function FitnessHIITScreen() {
  const router = useRouter();

  const startPreset = (preset: HIITPreset) => {
    haptic.medium();
    const routine = buildPresetRoutine(preset.name, preset.params);
    router.push({
      pathname: '/execution',
      params: { routine: JSON.stringify(routine) },
    } as any);
  };

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="HIIT" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <SectionTitle>ENTRENAMIENTOS</SectionTitle>

        {HIIT_PRESETS.map((preset, i) => (
          <Animated.View key={preset.name} entering={FadeInUp.delay(50 + i * 40).springify()}>
            <AnimatedPressable onPress={() => startPreset(preset)} style={s.cardWrap}>
              <GradientCard gradient={ORANGE_GRADIENT} accentColor={ORANGE} accentPosition="left">
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.name}>{preset.name}</EliteText>
                    <EliteText style={s.desc}>{preset.description}</EliteText>
                  </View>
                  <View style={s.playBtn}>
                    <Ionicons name="play" size={14} color={TEXT_COLORS.onAccent} />
                  </View>
                </View>
              </GradientCard>
            </AnimatedPressable>
          </Animated.View>
        ))}

        {/* MB-3.6 §1.1: "Abrir timer libre" RETIRADO — /timer murió (duplicaba
            estos presets); la ruta redirige aquí para deep-links viejos. */}
        <AnimatedPressable
          style={s.ctaButtonGhost}
          onPress={() => { haptic.light(); router.push('/builder'); }}
        >
          <Ionicons name="create-outline" size={18} color={ORANGE} />
          <EliteText style={s.ctaTextGhost}>CREAR HIIT PERSONALIZADO</EliteText>
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
    color: TEXT_COLORS.primary,
  },
  desc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: TEXT_COLORS.secondary,
    marginTop: 2,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ctaButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: CARD.bg,
    borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.amber, 0.3),
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
