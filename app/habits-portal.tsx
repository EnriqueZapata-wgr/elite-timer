/**
 * Hábitos — portal del frente HÁBITOS (#v13c 2.2). Rediseño editorial: dos secciones de
 * EditorialCards — HÁBITOS PILARES (5) + HÁBITOS DIARIOS (7). Se eliminó la subnavegación
 * "Hábitos diarios" (su contenido se aplanó abajo). Imágenes vía pickHabitImage (gradient
 * placeholder donde el asset aún no existe). CICLO solo para biological_sex === 'female'.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { pickHabitImage } from '@/src/utils/image-rotation';
import { pickFitnessImage } from '@/src/utils/yo-image-picker';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
// Sprint 2 E: color por concepto desde la fuente única (audit §3 — un concepto = un color).
import { CONCEPT_COLORS } from '@/src/constants/concept-colors';

type Card = { key: string; title: string; subtitle: string; icon: string; gradient: [string, string]; route: string; femaleOnly?: boolean };

// #cableado-final 3.4: imágenes estáticas por card. fitness es sex-aware (pickFitnessImage) y ciclo
// rota (pickHabitImage) → se resuelven aparte en renderCard.
const HABIT_CARD_IMAGES: Record<string, any> = {
  nutricion: require('@/assets/images/habits-portal/nutricion.png'),
  suplementacion: require('@/assets/images/habits-portal/suplementacion.png'),
  ayuno: require('@/assets/images/habits-portal/ayuno.png'),
  sueno: require('@/assets/images/habits-portal/sueno.png'),
  // Sprint 2 A: asset editorial dedicado del pilar (estaba en disco sin cablear).
  mente: require('@/assets/images/health-hub/mente-avanzado.png'),
  hidratacion: require('@/assets/images/hoy-extra/agua.png'),
  atp_sol: require('@/assets/images/electrons/luz-solar.png'),
};

const PILARES: Card[] = [
  { key: 'nutricion', title: 'NUTRICIÓN', subtitle: 'Comida · recetas · food scan', icon: '🥗', gradient: CONCEPT_COLORS.nutricion.gradient, route: '/nutrition' },
  { key: 'suplementacion', title: 'SUPLEMENTACIÓN', subtitle: 'Tu plan diario · tracking', icon: '💊', gradient: CONCEPT_COLORS.suplementos.gradient, route: '/supplements' },
  { key: 'fitness', title: 'FITNESS', subtitle: 'Fuerza · cardio · movilidad', icon: '🏋️', gradient: CONCEPT_COLORS.fitness.gradient, route: '/fitness-hub' },
  { key: 'ayuno', title: 'AYUNO', subtitle: 'Ventanas e historial', icon: '⏳', gradient: CONCEPT_COLORS.ayuno.gradient, route: '/fasting' },
  { key: 'sueno', title: 'SUEÑO', subtitle: 'Descanso y recuperación', icon: '😴', gradient: CONCEPT_COLORS.sueno.gradient, route: '/reports' }, // TODO: /sleep cuando exista
];

const DIARIOS: Card[] = [
  // Sprint MENTE Ecosystem: las 4 cards sueltas (meditación/respiración/
  // check-in/journal) se colapsan en el hub /mente — un pilar, una puerta.
  { key: 'mente', title: 'MENTE', subtitle: 'Journal · respiración · meditación · check-in', icon: '🧠', gradient: CONCEPT_COLORS.mente.gradient, route: '/mente' },
  { key: 'ciclo', title: 'CICLO', subtitle: 'Tu ciclo y síntomas', icon: '🌙', gradient: ['#D4537E', '#9B59B6'], route: '/cycle', femaleOnly: true },
  { key: 'hidratacion', title: 'HIDRATACIÓN', subtitle: 'Tu meta de agua', icon: '💧', gradient: CONCEPT_COLORS.agua.gradient, route: '/hydration' },
  { key: 'atp_sol', title: 'ATP SOL', subtitle: 'Luz solar y vitamina D', icon: '☀️', gradient: CONCEPT_COLORS.sol.gradient, route: '/solar' },
];

export default function HabitsPortalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bioSex, setBioSex] = useState<string | null>(null);

  const loadSex = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle();
      setBioSex((data as any)?.biological_sex ?? null);
    } catch { /* sin perfil */ }
  }, [user?.id]);
  useEffect(() => { loadSex(); }, [loadSex]);

  const imageFor = (key: string) => {
    if (key === 'fitness') return pickFitnessImage(bioSex);      // sex-aware
    if (key === 'ciclo') return pickHabitImage('ciclo', user?.id); // rotación determinística
    return HABIT_CARD_IMAGES[key];                                // estática
  };

  const renderCard = (c: Card, idx: number) => (
    <Animated.View key={c.key} entering={FadeInUp.delay(60 + idx * 40).springify()}>
      <EditorialCard
        cardKey={`habit_${c.key}`} icon={c.icon} title={c.title} subtitle={c.subtitle}
        gradient={c.gradient} imageBn={imageFor(c.key)}
        onTap={() => router.push(c.route as any)}
      />
    </Animated.View>
  );

  const diarios = DIARIOS.filter((c) => !c.femaleOnly || bioSex === 'female');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="mind" title="Hábitos" />

        <Text style={s.sectionTitle}>HÁBITOS PILARES</Text>
        {PILARES.map(renderCard)}

        <Text style={s.sectionTitle}>HÁBITOS DIARIOS</Text>
        {diarios.map(renderCard)}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  sectionTitle: {
    color: '#a8e02a', fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3,
    marginTop: Spacing.lg, marginBottom: Spacing.md,
  },
});
