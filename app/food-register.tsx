/**
 * Food Register — Selección de tipo de comida antes de registrar.
 *
 * Flujo: elegir tipo (Desayuno/Snack AM/Comida/Snack PM/Cena)
 * → navegar a food-scan o food-text con mealType como param.
 * Si llega con mealType param, salta directo a las opciones de registro.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS } from '@/src/constants/brand';

const MEAL_TYPES = [
  { id: 'breakfast', name: 'Desayuno',  icon: 'sunny-outline' as const,      color: '#fbbf24', time: '7:00 – 9:00' },
  { id: 'snack_am',  name: 'Snack AM',  icon: 'cafe-outline' as const,       color: '#a8e02a', time: '10:00 – 11:00' },
  { id: 'lunch',     name: 'Comida',    icon: 'restaurant-outline' as const, color: '#38bdf8', time: '13:00 – 15:00' },
  { id: 'snack_pm',  name: 'Snack PM',  icon: 'nutrition-outline' as const,  color: '#a8e02a', time: '16:00 – 17:00' },
  { id: 'dinner',    name: 'Cena',      icon: 'moon-outline' as const,       color: '#c084fc', time: '19:00 – 21:00' },
];

export default function FoodRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { user } = useAuth();
  const [todayLogs, setTodayLogs] = useState<any[]>([]);

  // Si llega con mealType, ir directo a opciones de ese tipo
  const directMealType = params.mealType ? MEAL_TYPES.find(m => m.id === params.mealType) : null;

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    supabase.from('food_logs').select('id, meal_type, description, calories, protein_g')
      .eq('user_id', user.id).eq('date', today)
      .order('meal_time', { ascending: true })
      .then(({ data }) => setTodayLogs(data ?? []));
  }, [user?.id]));

  const goToScan = (mealType: string) => {
    haptic.medium();
    router.push({ pathname: '/food-scan', params: { mode: 'food', mealType } } as any);
  };

  const goToManual = (mealType: string) => {
    haptic.light();
    router.push({ pathname: '/food-text', params: { mealType } } as any);
  };

  // Si tiene mealType directo, mostrar las opciones de registro
  if (directMealType) {
    const logsForType = todayLogs.filter(l => l.meal_type === directMealType.id);

    return (
      <Screen>
        <PillarHeader pillar="nutrition" title={directMealType.name} />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Opciones de registro */}
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <AnimatedPressable onPress={() => goToScan(directMealType.id)} style={s.actionBtn}>
              <Ionicons name="camera-outline" size={22} color="#000" />
              <EliteText style={s.actionBtnText}>Escanear con cámara</EliteText>
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <AnimatedPressable onPress={() => goToManual(directMealType.id)} style={s.actionBtnGhost}>
              <Ionicons name="create-outline" size={20} color="#38bdf8" />
              <EliteText style={s.actionBtnGhostText}>Registrar manual</EliteText>
            </AnimatedPressable>
          </Animated.View>

          {/* Registros de hoy para este tipo */}
          {logsForType.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <SectionTitle>REGISTROS DE HOY</SectionTitle>
              {logsForType.map((log: any) => (
                <View key={log.id} style={s.logRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#a8e02a" />
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.logDesc} numberOfLines={1}>{log.description}</EliteText>
                  </View>
                  <EliteText style={s.logKcal}>
                    {log.calories ? `${log.calories} kcal` : ''}
                    {log.protein_g ? ` · ${log.protein_g}g prot` : ''}
                  </EliteText>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </Screen>
    );
  }

  // Vista principal: selección de tipo de comida
  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Registrar" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText style={s.question}>¿Qué comida registras?</EliteText>
        </Animated.View>

        {MEAL_TYPES.map((meal, idx) => {
          const logsForMeal = todayLogs.filter(l => l.meal_type === meal.id);
          const totalKcal = logsForMeal.reduce((s: number, l: any) => s + (l.calories || 0), 0);
          const hasLogs = logsForMeal.length > 0;

          return (
            <Animated.View key={meal.id} entering={FadeInUp.delay(80 + idx * 40).springify()}>
              <AnimatedPressable
                onPress={() => {
                  haptic.light();
                  router.push({ pathname: '/food-register', params: { mealType: meal.id } } as any);
                }}
                style={s.mealCardWrap}
              >
                <GradientCard
                  gradient={{ start: `${meal.color}12`, end: `${meal.color}04` }}
                  accentColor={meal.color}
                  accentPosition="left"
                  padding={18}
                >
                  <View style={s.mealRow}>
                    <View style={[s.mealIcon, { backgroundColor: `${meal.color}15` }]}>
                      <Ionicons name={meal.icon} size={24} color={meal.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <EliteText style={s.mealName}>{meal.name}</EliteText>
                      <EliteText style={s.mealTime}>{meal.time}</EliteText>
                    </View>
                    {hasLogs ? (
                      <View style={s.mealBadge}>
                        <EliteText style={s.mealBadgeText}>{totalKcal} kcal</EliteText>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                    )}
                  </View>
                </GradientCard>
              </AnimatedPressable>
            </Animated.View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  question: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginBottom: Spacing.lg,
  },

  // Meal type cards
  mealCardWrap: { marginBottom: Spacing.sm },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  mealTime: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  mealBadge: {
    backgroundColor: 'rgba(168,224,42,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#a8e02a',
  },

  // Action buttons (direct meal type view)
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#a8e02a',
    paddingVertical: 16,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  actionBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  actionBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#0a0a0a',
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  actionBtnGhostText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#38bdf8',
  },

  // Log rows
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#fff',
  },
  logKcal: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.5)',
  },
});
