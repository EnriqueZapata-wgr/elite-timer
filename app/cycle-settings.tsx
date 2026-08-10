/**
 * Cycle Settings — Configuración del tracking de ciclo.
 */
import { useState, useCallback, useMemo } from 'react';
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
import { TEXT_COLORS, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { InfoButton } from '@/src/components/InfoButton';
import { CYCLE_INFO } from '@/src/constants/cycle-info';
import { cycleModalityOptions, defaultCycleModality, type CycleModality } from '@/src/services/onboarding-v2-core';
import { saveCycleModality } from '@/src/services/onboarding-v2-service';
import { userErrorMessage } from '@/src/utils/user-error';
import { useCycleGate } from '@/src/hooks/use-cycle-gate';

const ROSE = '#fb7185';
const GRADIENT = { start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.03)' };

// E-5 (MB-12, decisión bakeada): el modo compañero se RETIRA de la UI para la
// beta — es código muerto que promete algo que no existe (para funcionar
// faltan tres piezas: leer cycle_modality en el gate, un modo lectura del
// ciclo de la pareja y una entrada de navegación). Se retoma completo después.
const COMPANION_MODE_ENABLED = false;

export default function CycleSettingsScreen() {
  const { user } = useAuth();
  // E-5 (MB-12): era la ÚNICA pantalla del pilar sin useCycleGate.
  // MB-22 P4: en acompañante se esconden modalidad y embarazo — esos hablan
  // del cuerpo del usuario, no del calendario que lleva de otra persona.
  const gate = useCycleGate();
  const acompanante = gate.mode === 'acompanante';
  // MB-31B2: tokens del tema (oscuro idéntico; claro = acero).
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const [avgCycle, setAvgCycle] = useState('28');
  const [avgPeriod, setAvgPeriod] = useState('5');
  const [mode, setMode] = useState<'full' | 'companion'>('full');
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [activeCompanion, setActiveCompanion] = useState(false);
  // F2.1 (task #111): modalidad de ciclo — misma opción que en onboarding v2 paso 4
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [modality, setModality] = useState<CycleModality | null>(null);
  // MB-7: fecha probable de parto para la máscara embarazo (cycle_settings.pregnancy_status).
  const [dueDate, setDueDate] = useState('');

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from('cycle_settings').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAvgCycle(String(data.avg_cycle_length ?? 28));
          setAvgPeriod(String(data.avg_period_length ?? 5));
          setMode(data.mode ?? 'full');
          setDueDate((data.pregnancy_status as any)?.due_date ?? '');
        }
      });
    // Cargar estado de compañero
    supabase.from('cycle_companions').select('status')
      .eq('owner_id', user.id).eq('status', 'active').limit(1)
      .then(({ data }) => setActiveCompanion((data ?? []).length > 0));
    // Modalidad de ciclo (client_profiles, migración 153)
    supabase.from('client_profiles').select('biological_sex, cycle_modality')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        const sx = data?.biological_sex === 'male' ? 'male' : 'female';
        setSex(sx);
        setModality((data?.cycle_modality as CycleModality) ?? defaultCycleModality(sx));
      });
  }, [user?.id]));

  const handleModality = async (value: CycleModality) => {
    if (!user?.id) return;
    haptic.light();
    setModality(value);
    await saveCycleModality(user.id, value);
  };

  // MB-7: guarda la FPP → activa la máscara embarazo. Escribe el JSONB completo
  // (is_pregnant + due_date). Al salir del modo embarazo se limpia a null.
  const saveDueDate = async (iso: string) => {
    if (!user?.id) return;
    const valid = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(iso);
    const status = valid ? { is_pregnant: true, due_date: iso } : null;
    try {
      await supabase.from('cycle_settings').upsert(
        { user_id: user.id, pregnancy_status: status },
        { onConflict: 'user_id' },
      );
    } catch (e: any) {
      Alert.alert('Error', userErrorMessage(e, 'No se pudo guardar la fecha.'));
    }
  };

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
      Alert.alert('Error', userErrorMessage(err, 'No se pudo guardar.'));
    }
    setSaving(false);
  };

  // E-5 (MB-12): mismo patrón que cycle-charts/cycle-history.
  if (gate.state !== 'allowed') {
    return (
      <Screen themed>
        <PillarHeader pillar="cycle" title="Configuración" />
      </Screen>
    );
  }

  return (
    <Screen keyboard themed>
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

        {/* F2.1 (task #111): modalidad de ciclo — espejo del paso 4 del onboarding v2.
            MB-22 P4: NO en acompañante — escribe client_profiles.cycle_modality,
            que es del cuerpo del usuario. */}
        {!acompanante && (
        <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginTop: Spacing.md }}>
          <GradientCard gradient={GRADIENT} padding={20}>
            <SectionTitle>MODALIDAD DE CICLO</SectionTitle>
            {cycleModalityOptions(sex).map(opt => {
              const selected = modality === opt.value;
              return (
                <AnimatedPressable
                  key={opt.value}
                  onPress={() => handleModality(opt.value)}
                  style={[s.modePill, selected && s.modePillActive]}
                >
                  {/* Relleno rosa activo: blanco en oscuro (como siempre), negro en claro. */}
                  <Ionicons name={opt.icon as any} size={18} color={selected ? (t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent) : ROSE} />
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.modeLabel, selected && { color: t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent }]}>{opt.label}</EliteText>
                    <EliteText style={s.modeSub}>{opt.description}</EliteText>
                  </View>
                </AnimatedPressable>
              );
            })}
          </GradientCard>
        </Animated.View>
        )}

        {/* MB-7: máscara embarazo — captura de la FPP (solo si modalidad = embarazo).
            MB-22 P4: jamás en acompañante — el embarazo de otra persona no se
            captura aquí (escribiría cycle_settings.pregnancy_status DEL usuario). */}
        {modality === 'pregnancy' && !acompanante && (
          <Animated.View entering={FadeInUp.delay(90).springify()} style={{ marginTop: Spacing.md }}>
            <GradientCard gradient={GRADIENT} padding={20}>
              <SectionTitle>EMBARAZO</SectionTitle>
              <EliteText style={s.modeSub}>
                Tu fecha probable de parto activa la vista de embarazo (semana y trimestre,
                sin predicción de menstruación).
              </EliteText>
              <View style={[s.fieldRow, { marginTop: Spacing.md }]}>
                <EliteText style={s.fieldLabel}>Fecha probable (AAAA-MM-DD)</EliteText>
                <TextInput
                  style={[s.fieldInput, { minWidth: 130 }]}
                  value={dueDate}
                  onChangeText={setDueDate}
                  onBlur={() => saveDueDate(dueDate)}
                  placeholder="2026-12-01"
                  placeholderTextColor={t.sinDatos}
                  maxLength={10}
                />
              </View>
            </GradientCard>
          </Animated.View>
        )}

        {/* E-5 (MB-12): modo compañero retirado de la beta (flag arriba) */}
        {COMPANION_MODE_ENABLED && (
        <Animated.View entering={FadeInUp.delay(100).springify()} style={{ marginTop: Spacing.md }}>
          <GradientCard gradient={GRADIENT} padding={20}>
            <SectionTitle>MODO DE TRACKING</SectionTitle>

            <AnimatedPressable onPress={() => { haptic.light(); setMode('full'); }} style={[s.modePill, mode === 'full' && s.modePillActive]}>
              <Ionicons name="person-outline" size={18} color={mode === 'full' ? (t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent) : ROSE} />
              <View style={{ flex: 1 }}>
                <EliteText style={[s.modeLabel, mode === 'full' && { color: t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent }]}>Para mí</EliteText>
                <EliteText style={s.modeSub}>Tracking completo de mi ciclo</EliteText>
              </View>
            </AnimatedPressable>

            <AnimatedPressable onPress={() => { haptic.light(); setMode('companion'); }} style={[s.modePill, mode === 'companion' && s.modePillActive]}>
              <Ionicons name="people-outline" size={18} color={mode === 'companion' ? (t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent) : ROSE} />
              <View style={{ flex: 1 }}>
                <EliteText style={[s.modeLabel, mode === 'companion' && { color: t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent }]}>Modo compañero</EliteText>
                <EliteText style={s.modeSub}>Trackeo el ciclo de mi pareja</EliteText>
              </View>
            </AnimatedPressable>
          </GradientCard>
        </Animated.View>
        )}

        {/* Sección compañero — E-5 (MB-12): retirada de la beta */}
        {COMPANION_MODE_ENABLED && (
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: t.hundido, borderRadius: 12, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={18} color="#a8e02a" />
                      <EliteText style={{ color: t.texto, fontSize: 13 }}>Compañero/a vinculado/a</EliteText>
                    </View>
                    <Pressable onPress={async () => {
                      if (!user?.id) return;
                      await supabase.from('cycle_companions').update({ status: 'revoked' }).eq('owner_id', user.id).eq('status', 'active');
                      setActiveCompanion(false);
                      haptic.medium();
                      Alert.alert('Desvinculado', 'Compañero/a desvinculado/a.');
                    }}>
                      <Text style={{ color: t.error, fontSize: 12, fontFamily: Fonts.semiBold }}>Desvincular</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {mode === 'companion' && (
              <View>
                <EliteText style={{ color: t.textoSecundario, fontSize: 13, marginBottom: 12 }}>¿Tu pareja te compartió un código?</EliteText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    placeholder="Código"
                    placeholderTextColor={t.sinDatos}
                    autoCapitalize="characters"
                    maxLength={6}
                    style={{
                      flex: 1, backgroundColor: t.hundido, color: t.texto, padding: 14,
                      borderRadius: 12, fontSize: 18, fontFamily: Fonts.bold,
                      letterSpacing: 4, textAlign: 'center', borderWidth: 0.5, borderColor: t.bordeMarcado,
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
                    <Text style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold }}>Vincular</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </GradientCard>
        </Animated.View>
        )}

        <AnimatedPressable onPress={handleSave} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
          <EliteText style={s.saveBtnText}>{saving ? 'GUARDANDO…' : 'GUARDAR'}</EliteText>
        </AnimatedPressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

// MB-31B2: los estilos leen los tokens del tema. El rosa como LETRA solo vale
// en oscuro; sobre acero la cifra y la etiqueta pasan a texto del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
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
    color: t.texto,
  },
  fieldInput: {
    width: 60,
    backgroundColor: t.hundido,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: t.borde,
    color: t.kind === 'dark' ? ROSE : t.texto,
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
    color: t.kind === 'dark' ? ROSE : t.texto,
  },
  modeSub: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: t.textoTenue,
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
    color: t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent,
    letterSpacing: 2,
  },
});
