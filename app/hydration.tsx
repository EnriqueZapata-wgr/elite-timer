/**
 * Hidratación — Registro de agua con meta diaria, botones rápidos y barra de progreso.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, PILLAR_GRADIENTS } from '@/src/constants/brand';

const WATER_COLOR = '#38bdf8';

export default function HydrationScreen() {
  const { user } = useAuth();
  const [waterMl, setWaterMl] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [user?.id]));

  async function loadData() {
    if (!user?.id) return;
    const today = getLocalToday();
    const { data } = await supabase
      .from('hydration_logs')
      .select('total_ml, target_ml')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    if (data) {
      setWaterMl((data as any).total_ml ?? 0);
      setWaterGoal((data as any).target_ml ?? 2500);
    }
  }

  async function addWater(ml: number) {
    if (!user?.id) return;
    haptic.light();
    const newMl = Math.max(0, waterMl + ml);
    const delta = newMl - waterMl;
    if (delta === 0 && ml < 0) return;
    setWaterMl(newMl);

    const dateStr = getLocalToday();
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    try {
      const { data: existing } = await supabase.from('hydration_logs').select('id, total_ml, entries')
        .eq('user_id', user.id).eq('date', dateStr).maybeSingle();
      const entries = [...((existing?.entries as any[]) ?? []), { time: nowTime, amount_ml: delta }];
      const total = Math.max(0, (existing?.total_ml ?? 0) + delta);
      if (existing?.id) {
        await supabase.from('hydration_logs').update({ total_ml: total, entries }).eq('id', existing.id);
      } else {
        await supabase.from('hydration_logs').insert({ user_id: user.id, date: dateStr, total_ml: total, target_ml: waterGoal, entries });
      }
      DeviceEventEmitter.emit('day_changed');
    } catch { setWaterMl(waterMl); }
  }

  const pct = waterGoal > 0 ? Math.min(100, Math.round((waterMl / waterGoal) * 100)) : 0;

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Hidratación" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={{ start: 'rgba(56,189,248,0.10)', end: 'rgba(56,189,248,0.03)' }} padding={24}>
            {/* Progreso circular visual */}
            <View style={s.center}>
              <EliteText style={s.bigValue}>{(waterMl / 1000).toFixed(1)}L</EliteText>
              <EliteText style={s.goalText}>de {(waterGoal / 1000).toFixed(1)}L</EliteText>
            </View>

            {/* Barra */}
            <View style={s.bar}>
              <View style={[s.barFill, { width: `${pct}%` }]} />
            </View>
            <EliteText style={s.pctText}>{pct}%</EliteText>

            {/* Botones rápidos */}
            <View style={s.btns}>
              {waterMl > 0 && (
                <AnimatedPressable onPress={() => addWater(-250)} style={s.btnMinus}>
                  <EliteText style={s.btnMinusText}>-250ml</EliteText>
                </AnimatedPressable>
              )}
              <AnimatedPressable onPress={() => addWater(250)} style={s.btn}>
                <EliteText style={s.btnText}>+250ml</EliteText>
              </AnimatedPressable>
              <AnimatedPressable onPress={() => addWater(500)} style={s.btn}>
                <EliteText style={s.btnText}>+500ml</EliteText>
              </AnimatedPressable>
            </View>
          </GradientCard>
        </Animated.View>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  center: { alignItems: 'center', marginBottom: Spacing.lg },
  bigValue: { fontSize: 48, fontFamily: Fonts.extraBold, color: WATER_COLOR },
  goalText: { fontSize: FontSizes.sm, color: TEXT_COLORS.secondary, marginTop: 4 },
  bar: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: WATER_COLOR },
  pctText: { fontSize: FontSizes.xs, color: TEXT_COLORS.secondary, textAlign: 'center', marginTop: Spacing.xs },
  btns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  btnMinus: {
    flex: 1, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center',
  },
  btnMinusText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#ef4444' },
  btn: {
    flex: 1, backgroundColor: 'rgba(56,189,248,0.10)',
    paddingVertical: 12, borderRadius: Radius.sm, alignItems: 'center',
  },
  btnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: WATER_COLOR },
});
