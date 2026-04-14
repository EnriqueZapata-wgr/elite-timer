/**
 * Cycle Settings — Configuración del tracking de ciclo.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert, Switch, Text, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
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
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { InfoButton } from '@/src/components/InfoButton';
import { CYCLE_INFO } from '@/src/constants/cycle-info';

const ROSE = '#fb7185';
const GRADIENT = { start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.03)' };

export default function CycleSettingsScreen() {
  const { user } = useAuth();
  const [avgCycle, setAvgCycle] = useState('28');
  const [avgPeriod, setAvgPeriod] = useState('5');
  const [mode, setMode] = useState<'full' | 'companion'>('full');
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [activeCompanion, setActiveCompanion] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from('cycle_settings').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAvgCycle(String(data.avg_cycle_length ?? 28));
          setAvgPeriod(String(data.avg_period_length ?? 5));
          setMode(data.mode ?? 'full');
        }
      });
    // Cargar estado de compañero
    supabase.from('cycle_companions').select('status')
      .eq('owner_id', user.id).eq('status', 'active').limit(1)
      .then(({ data }) => setActiveCompanion((data ?? []).length > 0));
  }, [user?.id]));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    haptic.success();
    try {
      await supabase.from('cycle_settings').upsert({
        user_id: user.id,
        avg_cycle_length: parseInt(avgCycle, 10) || 28,
        avg_period_length: parseInt(avgPeriod, 10) || 5,
        mode,
      }, { onConflict: 'user_id' });
      Alert.alert('Guardado', 'Configuración actualizada.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo guardar.');
    }
    setSaving(false);
  };

  return (
    <Screen>
      <PillarHeader pillar="cycle" title="Configuración" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={GRADIENT} padding={20}>
            <SectionTitle>DURACIÓN PROMEDIO</SectionTitle>

            <View style={s.fieldRow}>
              <EliteText style={s.fieldLabel}>Ciclo (días)</EliteText>
              <TextInput
                style={s.fieldInput}
                value={avgCycle}
                onChangeText={setAvgCycle}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={s.fieldRow}>
              <EliteText style={s.fieldLabel}>Periodo (días)</EliteText>
              <TextInput
                style={s.fieldInput}
                value={avgPeriod}
                onChangeText={setAvgPeriod}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </GradientCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify()} style={{ marginTop: Spacing.md }}>
          <GradientCard gradient={GRADIENT} padding={20}>
            <SectionTitle>MODO DE TRACKING</SectionTitle>

            <AnimatedPressable onPress={() => { haptic.light(); setMode('full'); }} style={[s.modePill, mode === 'full' && s.modePillActive]}>
              <Ionicons name="person-outline" size={18} color={mode === 'full' ? '#fff' : ROSE} />
              <View style={{ flex: 1 }}>
                <EliteText style={[s.modeLabel, mode === 'full' && { color: '#fff' }]}>Para mí</EliteText>
                <EliteText style={s.modeSub}>Tracking completo de mi ciclo</EliteText>
              </View>
            </AnimatedPressable>

            <AnimatedPressable onPress={() => { haptic.light(); setMode('companion'); }} style={[s.modePill, mode === 'companion' && s.modePillActive]}>
              <Ionicons name="people-outline" size={18} color={mode === 'companion' ? '#fff' : ROSE} />
              <View style={{ flex: 1 }}>
                <EliteText style={[s.modeLabel, mode === 'companion' && { color: '#fff' }]}>Modo compañero</EliteText>
                <EliteText style={s.modeSub}>Trackeo el ciclo de mi pareja</EliteText>
              </View>
            </AnimatedPressable>
          </GradientCard>
        </Animated.View>

        {/* Sección compañero */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={{ marginTop: Spacing.md }}>
          <GradientCard gradient={GRADIENT} padding={20}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <SectionTitle>MODO COMPAÑERO</SectionTitle>
              <InfoButton title={CYCLE_INFO.companion.title} explanation={CYCLE_INFO.companion.text} color={ROSE} size={14} />
            </View>

            {mode === 'full' && (
              <>
                <AnimatedPressable onPress={async () => {
                  if (!user?.id) return;
                  haptic.medium();
                  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                  const { error } = await supabase.from('cycle_companions').insert({
                    owner_id: user.id,
                    invite_code: code,
                    status: 'pending',
                  });
                  if (error) { Alert.alert('Error', 'No se pudo generar el código.'); return; }
                  Alert.alert('Código de compañero', `Comparte este código con tu pareja:\n\n${code}\n\nLo introduce en ATP Ciclo → Ajustes → "Soy compañero".`);
                }}>
                  <View style={{
                    backgroundColor: 'rgba(192,132,252,0.1)', borderRadius: 14, padding: 16,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)',
                  }}>
                    <Ionicons name="people-outline" size={20} color="#c084fc" />
                    <EliteText style={{ color: '#c084fc', fontSize: 14, fontFamily: Fonts.bold }}>Invitar compañero/a</EliteText>
                  </View>
                </AnimatedPressable>

                {activeCompanion && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={18} color="#a8e02a" />
                      <EliteText style={{ color: '#fff', fontSize: 13 }}>Compañero/a vinculado/a</EliteText>
                    </View>
                    <Pressable onPress={async () => {
                      if (!user?.id) return;
                      await supabase.from('cycle_companions').update({ status: 'revoked' }).eq('owner_id', user.id).eq('status', 'active');
                      setActiveCompanion(false);
                      haptic.medium();
                      Alert.alert('Desvinculado', 'Compañero/a desvinculado/a.');
                    }}>
                      <Text style={{ color: '#ef4444', fontSize: 12, fontFamily: Fonts.semiBold }}>Desvincular</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {mode === 'companion' && (
              <View>
                <EliteText style={{ color: '#999', fontSize: 13, marginBottom: 12 }}>¿Tu pareja te compartió un código?</EliteText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    placeholder="Código"
                    placeholderTextColor="#444"
                    autoCapitalize="characters"
                    maxLength={6}
                    style={{
                      flex: 1, backgroundColor: '#000', color: '#fff', padding: 14,
                      borderRadius: 12, fontSize: 18, fontFamily: Fonts.bold,
                      letterSpacing: 4, textAlign: 'center', borderWidth: 0.5, borderColor: '#333',
                    }}
                  />
                  <Pressable onPress={async () => {
                    if (!user?.id || inviteCode.length < 4) return;
                    haptic.medium();
                    const { data, error } = await supabase.from('cycle_companions')
                      .update({ companion_id: user.id, status: 'active', updated_at: new Date().toISOString() })
                      .eq('invite_code', inviteCode.toUpperCase())
                      .eq('status', 'pending')
                      .select()
                      .maybeSingle();
                    if (error || !data) { Alert.alert('Error', 'Código inválido o ya usado.'); return; }
                    haptic.success();
                    Alert.alert('Vinculado', 'Ahora puedes ver el resumen del ciclo de tu pareja.');
                    setInviteCode('');
                  }} style={{
                    backgroundColor: '#c084fc', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center',
                  }}>
                    <Text style={{ color: '#000', fontFamily: Fonts.bold }}>Vincular</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </GradientCard>
        </Animated.View>

        <AnimatedPressable onPress={handleSave} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
          <EliteText style={s.saveBtnText}>{saving ? 'GUARDANDO…' : 'GUARDAR'}</EliteText>
        </AnimatedPressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  fieldInput: {
    width: 60,
    backgroundColor: '#000',
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    color: ROSE,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    textAlign: 'center',
    paddingVertical: 8,
  },

  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.2)',
    marginBottom: Spacing.sm,
  },
  modePillActive: {
    backgroundColor: ROSE,
    borderColor: ROSE,
  },
  modeLabel: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: ROSE,
  },
  modeSub: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },

  saveBtn: {
    backgroundColor: ROSE,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: 2,
  },
});
