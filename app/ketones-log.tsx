/**
 * Ketones Log — Registro de cetonas en sangre (β-hidroxibutirato, mmol/L).
 *
 * Espejo de glucose-log: valor mmol/L, contexto, historial de hoy con rangos de cetosis.
 * Cetonas son decimales (0.0–8.0) → parseFloat + NUMERIC en DB. No otorga electrón (no hay
 * key en el catálogo de electrones; ver COWORK_REPORT si se quiere sumar uno).
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const KETO_ACCENT = '#c084fc';

const CONTEXTS = [
  { id: 'fasting',       name: 'Ayuno',          icon: 'moon-outline' as const },
  { id: 'post_meal',     name: 'Post-comida',    icon: 'restaurant-outline' as const },
  { id: 'post_exercise', name: 'Post-ejercicio', icon: 'fitness-outline' as const },
  { id: 'random',        name: 'Random',         icon: 'shuffle-outline' as const },
  { id: 'bedtime',       name: 'Antes dormir',   icon: 'bed-outline' as const },
];

/** Rangos de cetosis nutricional (β-hidroxibutirato en sangre, mmol/L). */
function getKetoStatus(value: number) {
  if (value < 0.5)  return { label: 'Sin cetosis', color: 'rgba(255,255,255,0.5)' };
  if (value <= 1.5) return { label: 'Cetosis ligera', color: '#a8e02a' };
  if (value <= 3.0) return { label: 'Cetosis óptima', color: '#22d3ee' };
  if (value <= 5.0) return { label: 'Cetosis alta', color: '#fbbf24' };
  return { label: 'Muy alta', color: '#ef4444' };
}

export default function KetonesLogScreen() {
  const { user } = useAuth();

  const [value, setValue] = useState('');
  const [context, setContext] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const today = getLocalToday();
    supabase.from('ketones_logs').select('*')
      .eq('user_id', user.id).eq('date', today)
      .order('time', { ascending: false })
      .then(({ data }) => setTodayLogs(data ?? []));
  }, [user?.id]));

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (!Number.isFinite(numValue) || numValue < 0 || numValue > 10) {
      Alert.alert('Valor inválido', 'Ingresa un valor entre 0 y 10 mmol/L');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      const now = new Date();
      // Regla #3: fecha local (no UTC). Hora derivada de la hora local del dispositivo.
      const today = getLocalToday();
      const { error } = await supabase.from('ketones_logs').insert({
        user_id: user.id,
        date: today,
        time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        value_mmol: numValue,
        context,
        notes: notes || null,
      });
      if (error) throw error;

      haptic.success();
      setValue('');
      setNotes('');

      const { data } = await supabase.from('ketones_logs').select('*')
        .eq('user_id', user.id).eq('date', today)
        .order('time', { ascending: false });
      setTodayLogs(data ?? []);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const numVal = parseFloat(value) || 0;
  const previewStatus = numVal > 0 ? getKetoStatus(numVal) : null;

  return (
    <Screen keyboard>
      <PillarHeader pillar="metrics" title="Cetonas" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Valor */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.card}>
          <EliteText style={s.label}>VALOR (mmol/L)</EliteText>
          <View style={s.valueRow}>
            <TextInput
              style={s.valueInput}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="1.5"
              placeholderTextColor="rgba(255,255,255,0.2)"
              maxLength={4}
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
            placeholder="Día 3 de ayuno..."
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
              const st = getKetoStatus(Number(log.value_mmol));
              const ctxName = CONTEXTS.find(c => c.id === log.context)?.name ?? log.context;
              return (
                <View key={log.id} style={s.logRow}>
                  <EliteText style={s.logTime}>{log.time?.substring(0, 5)}</EliteText>
                  <EliteText style={s.logCtx}>{ctxName}</EliteText>
                  <EliteText style={[s.logValue, { color: st.color }]}>{Number(log.value_mmol).toFixed(1)} mmol/L</EliteText>
                  <View style={[s.logDot, { backgroundColor: st.color }]} />
                </View>
              );
            })}
          </Animated.View>
        )}

        <View style={{ height: 80 }} />
        <MedicalDisclaimer feature="glucose" />
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
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valueInput: {
    flex: 1,
    fontSize: 48,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  statusText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1 },

  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  contextPillActive: { backgroundColor: KETO_ACCENT, borderColor: KETO_ACCENT },
  contextText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.5)' },
  contextTextActive: { color: '#000' },

  notesInput: {
    color: '#fff',
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    minHeight: 48,
    textAlignVertical: 'top',
  },

  saveBtn: {
    backgroundColor: KETO_ACCENT,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 2 },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logTime: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.4)', width: 40 },
  logCtx: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.5)', flex: 1 },
  logValue: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  logDot: { width: 8, height: 8, borderRadius: 4 },
});
