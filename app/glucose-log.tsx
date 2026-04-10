/**
 * Glucose Log — Registro de glucosa en sangre con contexto y rangos visuales.
 *
 * Permite registrar valor mg/dL, contexto (ayuno/pre/post/random/bedtime),
 * relacionar con tipo de comida, y ver historial de hoy con colores semánticos.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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

const CONTEXTS = [
  { id: 'fasting',       name: 'Ayuno',         icon: 'moon-outline' as const },
  { id: 'pre_meal',      name: 'Pre-comida',    icon: 'restaurant-outline' as const },
  { id: 'post_meal_1h',  name: '1h post',       icon: 'timer-outline' as const },
  { id: 'post_meal_2h',  name: '2h post',       icon: 'time-outline' as const },
  { id: 'random',        name: 'Random',        icon: 'shuffle-outline' as const },
  { id: 'bedtime',       name: 'Antes dormir',  icon: 'bed-outline' as const },
];

function getGlucoseStatus(value: number, context: string) {
  if (context === 'fasting') {
    if (value < 70)  return { label: 'Bajo',    color: '#ef4444' };
    if (value <= 99) return { label: 'Normal',  color: '#a8e02a' };
    if (value <= 125) return { label: 'Elevado', color: '#fbbf24' };
    return { label: 'Alto', color: '#ef4444' };
  }
  // Post-comida u otro
  if (value < 140) return { label: 'Normal',  color: '#a8e02a' };
  if (value <= 199) return { label: 'Elevado', color: '#fbbf24' };
  return { label: 'Alto', color: '#ef4444' };
}

export default function GlucoseLogScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [value, setValue] = useState('');
  const [context, setContext] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    supabase.from('glucose_logs').select('*')
      .eq('user_id', user.id).eq('date', today)
      .order('time', { ascending: false })
      .then(({ data }) => setTodayLogs(data ?? []));
  }, [user?.id]));

  const handleSave = async () => {
    const numValue = parseInt(value, 10);
    if (!numValue || numValue < 20 || numValue > 600) {
      Alert.alert('Valor inválido', 'Ingresa un valor entre 20 y 600 mg/dL');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      const now = new Date();
      const { error } = await supabase.from('glucose_logs').insert({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value_mg_dl: numValue,
        context,
        notes: notes || null,
      });
      if (error) throw error;

      haptic.success();
      setValue('');
      setNotes('');
      // Refresh
      const today = now.toISOString().split('T')[0];
      const { data } = await supabase.from('glucose_logs').select('*')
        .eq('user_id', user.id).eq('date', today)
        .order('time', { ascending: false });
      setTodayLogs(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const numVal = parseInt(value, 10) || 0;
  const previewStatus = numVal > 0 ? getGlucoseStatus(numVal, context) : null;

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Glucosa" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Valor */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.card}>
          <EliteText style={s.label}>VALOR (mg/dL)</EliteText>
          <View style={s.valueRow}>
            <TextInput
              style={s.valueInput}
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              placeholder="95"
              placeholderTextColor="rgba(255,255,255,0.2)"
              maxLength={3}
            />
            {previewStatus && (
              <View style={[s.statusBadge, { backgroundColor: `${previewStatus.color}20`, borderColor: `${previewStatus.color}40` }]}>
                <EliteText style={[s.statusText, { color: previewStatus.color }]}>{previewStatus.label}</EliteText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Contexto */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={s.card}>
          <EliteText style={s.label}>CONTEXTO</EliteText>
          <View style={s.contextRow}>
            {CONTEXTS.map(c => (
              <AnimatedPressable
                key={c.id}
                onPress={() => { haptic.light(); setContext(c.id); }}
                style={[s.contextPill, context === c.id && s.contextPillActive]}
              >
                <Ionicons name={c.icon} size={14} color={context === c.id ? '#000' : 'rgba(255,255,255,0.5)'} />
                <EliteText style={[s.contextText, context === c.id && s.contextTextActive]}>{c.name}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* Notas */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={s.card}>
          <EliteText style={s.label}>NOTAS (opcional)</EliteText>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Después de tacos..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            multiline
          />
        </Animated.View>

        {/* Guardar */}
        <AnimatedPressable onPress={handleSave} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
          <EliteText style={s.saveBtnText}>{saving ? 'GUARDANDO…' : 'GUARDAR'}</EliteText>
        </AnimatedPressable>

        {/* Historial de hoy */}
        {todayLogs.length > 0 && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={{ marginTop: Spacing.lg }}>
            <SectionTitle>HISTORIAL DE HOY</SectionTitle>
            {todayLogs.map((log: any) => {
              const st = getGlucoseStatus(log.value_mg_dl, log.context ?? 'random');
              const ctxName = CONTEXTS.find(c => c.id === log.context)?.name ?? log.context;
              return (
                <View key={log.id} style={s.logRow}>
                  <EliteText style={s.logTime}>{log.time?.substring(0, 5)}</EliteText>
                  <EliteText style={s.logCtx}>{ctxName}</EliteText>
                  <EliteText style={[s.logValue, { color: st.color }]}>{log.value_mg_dl} mg/dL</EliteText>
                  <View style={[s.logDot, { backgroundColor: st.color }]} />
                </View>
              );
            })}
          </Animated.View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  valueInput: {
    flex: 1,
    fontSize: 48,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },

  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  contextPillActive: {
    backgroundColor: '#fb923c',
    borderColor: '#fb923c',
  },
  contextText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.5)',
  },
  contextTextActive: { color: '#000' },

  notesInput: {
    color: '#fff',
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    minHeight: 48,
    textAlignVertical: 'top',
  },

  saveBtn: {
    backgroundColor: '#fb923c',
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 2,
  },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logTime: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.4)',
    width: 40,
  },
  logCtx: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
  },
  logValue: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
