/**
 * Ketones Log — Registro de cetonas de 3 fuentes (#113, MB-8):
 * sangre (β-hidroxibutirato mmol/L) · aliento (acetona ppm) · orina (cualitativa).
 *
 * Espejo de glucose-log: valor + contexto + historial de hoy. El modelo de
 * fuentes/rangos/validación vive en ketones-source-core (puro, testeado).
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
import {
  KETONE_SOURCES, URINE_LEVELS, type KetoneSource,
  isValidKetoneReading, ketoStatusFor, formatKetoneReading,
} from '@/src/services/salud/ketones-source-core';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const KETO_ACCENT = '#c084fc';

const CONTEXTS = [
  { id: 'fasting',       name: 'Ayuno',          icon: 'moon-outline' as const },
  { id: 'post_meal',     name: 'Post-comida',    icon: 'restaurant-outline' as const },
  { id: 'post_exercise', name: 'Post-ejercicio', icon: 'fitness-outline' as const },
  { id: 'random',        name: 'Random',         icon: 'shuffle-outline' as const },
  { id: 'bedtime',       name: 'Antes dormir',   icon: 'bed-outline' as const },
];

export default function KetonesLogScreen() {
  const { user } = useAuth();

  const [source, setSource] = useState<KetoneSource>('blood');
  const [value, setValue] = useState('');
  const [urineLevel, setUrineLevel] = useState('moderate');
  const [context, setContext] = useState('fasting');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);

  const sourceMeta = KETONE_SOURCES.find((s) => s.id === source)!;

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const today = getLocalToday();
    supabase.from('ketones_logs').select('*')
      .eq('user_id', user.id).eq('date', today)
      .order('time', { ascending: false })
      .then(({ data }) => setTodayLogs(data ?? []));
  }, [user?.id]));

  const handleSave = async () => {
    const numeric = source === 'urine' ? null : parseFloat(value);
    const reading = { source, numeric, urineLevel: source === 'urine' ? urineLevel : null };
    if (!isValidKetoneReading(reading)) {
      Alert.alert(
        'Lectura inválida',
        source === 'urine'
          ? 'Elige un nivel de la tira.'
          : `Ingresa un valor válido en ${sourceMeta.unit}.`,
      );
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
        source,
        value_mmol: source === 'blood' ? numeric : null,
        value_ppm: source === 'breath' ? numeric : null,
        urine_level: source === 'urine' ? urineLevel : null,
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
  const previewStatus = source === 'urine'
    ? ketoStatusFor({ source, urineLevel })
    : numVal > 0 ? ketoStatusFor({ source, numeric: numVal }) : null;

  return (
    <Screen keyboard>
      <PillarHeader pillar="metrics" title="Cetonas" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* #113: Fuente de medición */}
        <Animated.View entering={FadeInUp.delay(30).springify()} style={s.card}>
          <EliteText style={s.label}>FUENTE</EliteText>
          <View style={s.contextRow}>
            {KETONE_SOURCES.map(src => (
              <AnimatedPressable
                key={src.id}
                onPress={() => { haptic.light(); setSource(src.id); }}
                style={[s.contextPill, source === src.id && s.contextPillActive]}
              >
                <Ionicons name={src.icon as any} size={14} color={source === src.id ? '#000' : 'rgba(255,255,255,0.5)'} />
                <EliteText style={[s.contextText, source === src.id && s.contextTextActive]}>{src.name}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* Valor — numérico (sangre/aliento) o cualitativo (orina) */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.card}>
          <EliteText style={s.label}>{source === 'urine' ? 'NIVEL DE LA TIRA' : `VALOR (${sourceMeta.unit})`}</EliteText>
          {source === 'urine' ? (
            <View style={s.contextRow}>
              {URINE_LEVELS.map(lvl => (
                <AnimatedPressable
                  key={lvl.id}
                  onPress={() => { haptic.light(); setUrineLevel(lvl.id); }}
                  style={[s.contextPill, urineLevel === lvl.id && s.contextPillActive]}
                >
                  <EliteText style={[s.contextText, urineLevel === lvl.id && s.contextTextActive]}>{lvl.name}</EliteText>
                </AnimatedPressable>
              ))}
            </View>
          ) : (
            <View style={s.valueRow}>
              <TextInput
                style={s.valueInput}
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
                placeholder={source === 'breath' ? '12' : '1.5'}
                placeholderTextColor="rgba(255,255,255,0.2)"
                maxLength={5}
              />
              {previewStatus && (
                <View style={[s.statusBadge, { backgroundColor: `${previewStatus.color}20`, borderColor: `${previewStatus.color}40` }]}>
                  <EliteText style={[s.statusText, { color: previewStatus.color }]}>{previewStatus.label}</EliteText>
                </View>
              )}
            </View>
          )}
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
              // #113: reconstruir la lectura desde la fuente (fallback 'blood' para
              // filas viejas sin columna source).
              const reading = {
                source: (log.source ?? 'blood') as KetoneSource,
                numeric: log.source === 'breath' ? Number(log.value_ppm) : Number(log.value_mmol),
                urineLevel: log.urine_level ?? null,
              };
              const st = ketoStatusFor(reading);
              const srcName = KETONE_SOURCES.find(sr => sr.id === reading.source)?.name ?? '';
              const ctxName = CONTEXTS.find(c => c.id === log.context)?.name ?? log.context;
              return (
                <View key={log.id} style={s.logRow}>
                  <EliteText style={s.logTime}>{log.time?.substring(0, 5)}</EliteText>
                  <EliteText style={s.logCtx}>{srcName} · {ctxName}</EliteText>
                  <EliteText style={[s.logValue, { color: st.color }]}>{formatKetoneReading(reading)}</EliteText>
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
