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
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

type Card = { key: string; title: string; subtitle: string; icon: string; gradient: [string, string]; route: string; femaleOnly?: boolean };

const PILARES: Card[] = [
  { key: 'nutricion', title: 'NUTRICIÓN', subtitle: 'Comida · recetas · food scan', icon: '🥗', gradient: ['#5B9BD5', '#3B82F6'], route: '/nutrition' },
  { key: 'suplementacion', title: 'SUPLEMENTACIÓN', subtitle: 'Tu plan diario · tracking', icon: '💊', gradient: ['#EF9F27', '#C0392B'], route: '/supplements' },
  { key: 'fitness', title: 'FITNESS', subtitle: 'Fuerza · cardio · movilidad', icon: '🏋️', gradient: ['#A8E02A', '#27AE60'], route: '/fitness-hub' },
  { key: 'ayuno', title: 'AYUNO', subtitle: 'Ventanas e historial', icon: '⏳', gradient: ['#6B46C1', '#1E3A8A'], route: '/fasting' },
  { key: 'sueno', title: 'SUEÑO', subtitle: 'Descanso y recuperación', icon: '😴', gradient: ['#3B82F6', '#1E3A8A'], route: '/reports' }, // TODO: /sleep cuando exista
];

const DIARIOS: Card[] = [
  { key: 'meditacion', title: 'MEDITACIÓN', subtitle: 'Baja cortisol', icon: '🧘', gradient: ['#1ABC9C', '#16A085'], route: '/meditation' },
  { key: 'respiracion', title: 'RESPIRACIÓN', subtitle: 'Activa el parasimpático', icon: '🌬', gradient: ['#85C1E9', '#2E86C1'], route: '/breathing' },
  { key: 'checkin', title: 'CHECK-IN', subtitle: '¿Cómo te sientes hoy?', icon: '❤️', gradient: ['#1ABC9C', '#9B59B6'], route: '/checkin' },
  { key: 'journal', title: 'JOURNAL', subtitle: 'Escribe tu día', icon: '📓', gradient: ['#9B59B6', '#6C3483'], route: '/journal' },
  { key: 'ciclo', title: 'CICLO', subtitle: 'Tu ciclo y síntomas', icon: '🌙', gradient: ['#D4537E', '#9B59B6'], route: '/cycle', femaleOnly: true },
  { key: 'hidratacion', title: 'HIDRATACIÓN', subtitle: 'Tu meta de agua', icon: '💧', gradient: ['#3498DB', '#1ABC9C'], route: '/hydration' },
  { key: 'atp_sol', title: 'ATP SOL', subtitle: 'Luz solar y vitamina D', icon: '☀️', gradient: ['#FFD700', '#FFA500'], route: '/solar' },
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

  const renderCard = (c: Card, idx: number) => (
    <Animated.View key={c.key} entering={FadeInUp.delay(60 + idx * 40).springify()}>
      <EditorialCard
        cardKey={`habit_${c.key}`} icon={c.icon} title={c.title} subtitle={c.subtitle}
        gradient={c.gradient} imageBn={pickHabitImage(c.key, user?.id)}
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
