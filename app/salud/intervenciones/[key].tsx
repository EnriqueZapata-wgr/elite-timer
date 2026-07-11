/**
 * Detalle de intervención (dx-f3) — nombre, semáforo, cómo, beneficio, info
 * científica (con nota de "consultar con tu nutriólogo" si aplica — filosofía
 * de medicina funcional), acciones Activar/Pausar/Descartar y ajustes del user
 * (hora custom, notas). assignRule NO se muestra: es criterio clínico interno.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, DeviceEventEmitter, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Card } from '@/src/components/ui/Card';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { PrioritySemaphore, PRIORITY_COLORS, type SemaphorePriority } from '@/src/components/interventions/PrioritySemaphore';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  activateIntervention,
  adjustIntervention,
  deactivateIntervention,
  dismissIntervention,
  getUserIntervention,
  INTERVENTIONS_CHANGED_EVENT,
} from '@/src/services/interventions/intervention-service';
import {
  effectiveTime,
  isValidHHMM,
  type ResolvedUserIntervention,
} from '@/src/services/interventions/intervention-service-core';
import { INTERVENTION_BY_KEY } from '@/src/constants/interventions-catalog';
import { CATEGORY_LABELS } from '@/src/constants/intervention-vocab';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const STATUS_LABELS: Record<string, string> = {
  suggested: 'Sugerida',
  active: 'Activa',
  paused: 'En pausa',
  dismissed: 'Descartada',
};

export default function IntervencionDetailScreen() {
  const { user } = useAuth();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [item, setItem] = useState<ResolvedUserIntervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeInput, setTimeInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id || !key) return;
    const found = await getUserIntervention(user.id, key);
    setItem(found);
    if (found) {
      setTimeInput(found.row.custom_time ?? '');
      setNotesInput(found.row.custom_notes ?? '');
    }
    setLoading(false);
  }, [user?.id, key]);

  useEffect(() => {
    if (startedRef.current || !user?.id || !key) return;
    startedRef.current = true;
    load().catch(() => setLoading(false));
    const sub = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => {
      load().catch(() => {});
    });
    return () => sub.remove();
  }, [user?.id, key, load]);

  const status = item?.row.status;

  const onActivate = useCallback(async () => {
    if (!user?.id || !key) return;
    haptic.medium();
    await activateIntervention(user.id, key);
  }, [user?.id, key]);

  const onPause = useCallback(async () => {
    if (!user?.id || !key) return;
    haptic.light();
    await deactivateIntervention(user.id, key);
  }, [user?.id, key]);

  const onDismiss = useCallback(() => {
    if (!user?.id || !key) return;
    Alert.alert(
      'Descartar intervención',
      'No volverá a aparecer en tus sugeridas. ¿Seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            haptic.warning();
            await dismissIntervention(user.id!, key);
            router.back();
          },
        },
      ],
    );
  }, [user?.id, key]);

  const onSaveAdjustments = useCallback(async () => {
    if (!user?.id || !key || saving) return;
    const trimmedTime = timeInput.trim();
    if (trimmedTime && !isValidHHMM(trimmedTime)) {
      Alert.alert('Hora inválida', 'Usa formato de 24h, por ejemplo 21:30.');
      return;
    }
    setSaving(true);
    haptic.light();
    const ok = await adjustIntervention(user.id, key, {
      custom_time: trimmedTime || null,
      custom_notes: notesInput.trim() || null,
    });
    setSaving(false);
    if (ok) haptic.success();
    else Alert.alert('Algo no salió', 'No se pudieron guardar los ajustes. Intenta de nuevo.');
  }, [user?.id, key, timeInput, notesInput, saving]);

  // Info científica del catálogo (solo curadas; assignRule NUNCA se muestra).
  const catalogDef = key ? INTERVENTION_BY_KEY[key] : undefined;
  const scientificInfo = catalogDef?.scientificInfo;
  const evidenceLevel = catalogDef?.evidenceLevel;
  const hasConsultNote = !!scientificInfo && /consultar con tu nutriólogo/i.test(scientificInfo);
  const time = item ? effectiveTime(item.row) : null;

  return (
    <MedicalDisclaimerGate>
      <Screen edges={[]}>
        <ScreenHeader title="Intervención" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          </View>
        ) : !item ? (
          <View style={styles.center}>
            <EliteText style={styles.notFound}>
              No encontramos esta intervención en tu perfil. Vuelve a la lista y
              desliza para sincronizar.
            </EliteText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* ── Hero: nombre + semáforo + estado ── */}
            <Animated.View entering={FadeInUp.delay(40).springify()}>
              <Card variant="accent" accentColor={PRIORITY_COLORS[item.row.priority as SemaphorePriority]}>
                <View style={styles.heroTop}>
                  <PrioritySemaphore priority={item.row.priority as SemaphorePriority} showLabel />
                  <View style={styles.statusBadge}>
                    <EliteText style={styles.statusText}>
                      {STATUS_LABELS[status ?? ''] ?? status}
                    </EliteText>
                  </View>
                </View>
                <EliteText style={styles.name}>{item.def.name}</EliteText>
                {(item.row.is_universal || time) && (
                  <View style={styles.metaRow}>
                    {item.row.is_universal && (
                      <View style={styles.baseBadge}>
                        <EliteText style={styles.baseBadgeText}>BASE UNIVERSAL</EliteText>
                      </View>
                    )}
                    {time && <EliteText style={styles.timeText}>⏰ {time}</EliteText>}
                  </View>
                )}
              </Card>
            </Animated.View>

            {/* ── Cómo + beneficio ── */}
            <Animated.View entering={FadeInUp.delay(90).springify()}>
              <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>CÓMO SE HACE</SectionTitle>
              <Card variant="elevated">
                <EliteText style={styles.body}>{item.def.how}</EliteText>
              </Card>
              <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>BENEFICIO</SectionTitle>
              <Card variant="elevated">
                <EliteText style={styles.body}>{item.def.benefit}</EliteText>
              </Card>
            </Animated.View>

            {/* ── Categorías ── */}
            {item.def.categories.length > 0 && (
              <Animated.View entering={FadeInUp.delay(130).springify()}>
                <View style={styles.chipsRow}>
                  {item.def.categories.map((c) => (
                    <View key={c} style={styles.chip}>
                      <EliteText style={styles.chipText}>{CATEGORY_LABELS[c] ?? c}</EliteText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ── Info científica (si hay) ── */}
            {(scientificInfo || evidenceLevel) && (
              <Animated.View entering={FadeInUp.delay(170).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>EVIDENCIA</SectionTitle>
                <Card variant="elevated">
                  {evidenceLevel && (
                    <View style={styles.evidenceBadge}>
                      <EliteText style={styles.evidenceText}>Nivel de evidencia {evidenceLevel}</EliteText>
                    </View>
                  )}
                  {scientificInfo && <EliteText style={styles.body}>{scientificInfo}</EliteText>}
                  {hasConsultNote && (
                    <EliteText style={styles.consultNote}>
                      Nota: esta intervención sugiere consultar con tu nutriólogo antes de iniciar.
                    </EliteText>
                  )}
                </Card>
              </Animated.View>
            )}

            {/* ── Ajustes ── */}
            <Animated.View entering={FadeInUp.delay(210).springify()}>
              <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>AJUSTES</SectionTitle>
              <Card variant="elevated">
                <EliteText style={styles.fieldLabel}>HORA CUSTOM (opcional)</EliteText>
                <TextInput
                  value={timeInput}
                  onChangeText={setTimeInput}
                  placeholder={item.row.computed_time ? `Calculada: ${item.row.computed_time}` : 'ej. 21:30'}
                  placeholderTextColor={TEXT.muted}
                  style={styles.input}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <EliteText style={[styles.fieldLabel, { marginTop: Spacing.md }]}>NOTAS</EliteText>
                <TextInput
                  value={notesInput}
                  onChangeText={setNotesInput}
                  placeholder="Tus notas personales sobre esta intervención"
                  placeholderTextColor={TEXT.muted}
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                />
                <AnimatedPressable onPress={onSaveAdjustments} disabled={saving} style={styles.saveBtn}>
                  <EliteText style={styles.saveBtnText}>
                    {saving ? 'Guardando…' : 'Guardar ajustes'}
                  </EliteText>
                </AnimatedPressable>
              </Card>
            </Animated.View>

            {/* ── Acciones ── */}
            <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.actions}>
              {status !== 'active' && (
                <AnimatedPressable onPress={onActivate} style={styles.primaryBtn}>
                  <EliteText style={styles.primaryBtnText}>Activar</EliteText>
                </AnimatedPressable>
              )}
              {status === 'active' && (
                <AnimatedPressable onPress={onPause} style={styles.secondaryBtn}>
                  <EliteText style={styles.secondaryBtnText}>Pausar</EliteText>
                </AnimatedPressable>
              )}
              {status !== 'dismissed' && (
                <AnimatedPressable onPress={onDismiss} style={styles.dangerBtn}>
                  <EliteText style={styles.dangerBtnText}>Descartar</EliteText>
                </AnimatedPressable>
              )}
            </Animated.View>
          </ScrollView>
        )}
      </Screen>
    </MedicalDisclaimerGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  notFound: {
    fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.tertiary,
    textAlign: 'center', lineHeight: 20,
  },
  content: { padding: Spacing.md, paddingBottom: 60 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    backgroundColor: ELEVATION[2].bg, borderRadius: Radius.xs,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: TEXT.secondary },
  name: {
    fontFamily: Fonts.bold, fontSize: FontSizes.xl, color: TEXT.primary,
    marginTop: Spacing.sm, lineHeight: 26,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  baseBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  baseBadgeText: { fontFamily: Fonts.bold, fontSize: 9, color: ATP_BRAND.lime, letterSpacing: 1 },
  timeText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: TEXT.secondary },
  body: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, lineHeight: 20 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md },
  chip: {
    backgroundColor: ELEVATION[2].bg, borderRadius: Radius.xs,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  chipText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary },
  evidenceBadge: {
    alignSelf: 'flex-start', backgroundColor: withOpacity('#60A5FA', 0.12),
    borderRadius: Radius.xs, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  evidenceText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: '#60A5FA' },
  consultNote: {
    fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: '#fbbf24',
    marginTop: Spacing.sm, lineHeight: 17,
  },
  fieldLabel: { fontFamily: Fonts.bold, fontSize: 9, color: TEXT.tertiary, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#222', borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, color: TEXT.primary,
    fontSize: FontSizes.sm, fontFamily: Fonts.regular,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center', marginTop: Spacing.md,
  },
  saveBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  actions: { marginTop: Spacing.lg, gap: 8 },
  primaryBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000' },
  secondaryBtn: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  dangerBtn: { paddingVertical: 10, alignItems: 'center' },
  dangerBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: '#ef4444' },
});
