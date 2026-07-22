/**
 * Síntomas Aislados (SALUD F5) — quick-tap de síntomas sueltos, peso BAJO en el DX.
 *
 * Chips de síntomas frecuentes de medicina funcional + input libre, severidad
 * OPCIONAL (1-5) y nota corta. Timeline vertical agrupado por día (más reciente
 * arriba). Todo DENTRO de cards (regla Enrique: nada suelto). Patrón visual de
 * app/salud/diagnostico/index.tsx (Screen + ScreenHeader + tokens canónicos).
 *
 * Tabla: clinical_symptoms_aislados (migración 174) — el harvest del DX
 * (dx-engine.ts) ya lee tag/severity/logged_at de aquí.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, DeviceEventEmitter, ScrollView, StyleSheet,
  TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Card } from '@/src/components/ui/Card';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday, toLocalDateString, formatLocalDate } from '@/src/utils/date-helpers';
import { SINTOMAS_QUICK_TAGS } from '@/src/constants/sintomas-catalog';
import {
  groupSintomasByDay,
  validateSintomaInput,
  type SintomaAisladoRow,
} from '@/src/services/salud/sintomas-core';
import {
  addSintoma,
  deleteSintoma,
  loadSintomas,
  SINTOMAS_CHANGED_EVENT,
} from '@/src/services/salud/sintomas-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

function localYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

function timeOf(loggedAt: string): string {
  return new Date(loggedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function SintomasScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SintomaAisladoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Formulario quick-tap
  const [tag, setTag] = useState('');
  const [severity, setSeverity] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await loadSintomas(user.id);
    setRows(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (startedRef.current || !user?.id) return;
    startedRef.current = true;
    load().catch(() => setLoading(false));
    const sub = DeviceEventEmitter.addListener(SINTOMAS_CHANGED_EVENT, () => { load().catch(() => {}); });
    return () => sub.remove();
  }, [user?.id, load]);

  const onChipTap = (t: string) => {
    haptic.light();
    setTag((prev) => (prev === t ? '' : t));
  };

  const onSave = useCallback(async () => {
    if (!user?.id || saving) return;
    const validated = validateSintomaInput(tag, severity, note);
    if (!validated.ok) {
      haptic.warning();
      Alert.alert('Revisa el registro', validated.error);
      return;
    }
    setSaving(true);
    const created = await addSintoma(user.id, validated.value);
    setSaving(false);
    if (created) {
      haptic.success();
      setTag('');
      setSeverity(null);
      setNote('');
    } else {
      haptic.warning();
      Alert.alert('Algo no salió', 'No se pudo guardar el síntoma. Intenta de nuevo.');
    }
  }, [user?.id, saving, tag, severity, note]);

  const onDelete = (row: SintomaAisladoRow) => {
    haptic.light();
    Alert.alert('Quitar registro', `¿Quitar "${row.tag}" del timeline?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => { if (user?.id) deleteSintoma(user.id, row.id).catch(() => {}); },
      },
    ]);
  };

  const today = getLocalToday();
  const yesterday = localYesterday();
  const groups = groupSintomasByDay(rows);
  const canSave = tag.trim().length > 0 && !saving;

  const headerFor = (day: string): string => {
    if (day === today) return 'Hoy';
    if (day === yesterday) return 'Ayer';
    return formatLocalDate(day, { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <MedicalDisclaimerGate>
      <Screen keyboard edges={[]}>
        <ScreenHeader title="Síntomas" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ── Registro quick-tap ── */}
            <Animated.View entering={FadeInUp.delay(40).springify()}>
              <Card variant="elevated">
                <EliteText style={styles.formLabel}>¿QUÉ SIENTES?</EliteText>
                <View style={styles.chipsRow}>
                  {SINTOMAS_QUICK_TAGS.map((t) => {
                    const on = tag === t;
                    return (
                      <AnimatedPressable
                        key={t}
                        onPress={() => onChipTap(t)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <EliteText style={[styles.chipText, on && styles.chipTextOn]}>{t}</EliteText>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                <TextInput
                  value={tag}
                  onChangeText={setTag}
                  placeholder="Otro síntoma (texto libre)…"
                  placeholderTextColor={TEXT.muted}
                  style={styles.input}
                  maxLength={60}
                />

                <EliteText style={styles.fieldLabel}>
                  SEVERIDAD (OPCIONAL){severity ? ` — ${severity}/5` : ''}
                </EliteText>
                <View style={styles.severityRow}>
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const on = severity === lvl;
                    return (
                      <AnimatedPressable
                        key={lvl}
                        onPress={() => { haptic.light(); setSeverity(on ? null : lvl); }}
                        style={[styles.severityOption, on && styles.severityOptionOn]}
                      >
                        <EliteText style={[styles.severityOptionText, on && { color: ATP_BRAND.lime }]}>
                          {lvl}
                        </EliteText>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Nota opcional (ej. después de comer)…"
                  placeholderTextColor={TEXT.muted}
                  style={styles.input}
                  maxLength={280}
                />

                <AnimatedPressable onPress={onSave} disabled={!canSave} style={[styles.cta, !canSave && { opacity: 0.5 }]}>
                  {saving && <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />}
                  <EliteText style={styles.ctaText}>{saving ? 'Guardando…' : 'Registrar síntoma'}</EliteText>
                </AnimatedPressable>

                <EliteText style={styles.dxNote}>
                  Esto alimenta tu Mapa Funcional. No sustituye la valoración de tu profesional de salud.
                </EliteText>
              </Card>
            </Animated.View>

            {/* ── Timeline por día ── */}
            {groups.length === 0 ? (
              <Animated.View entering={FadeInUp.delay(90).springify()}>
                <Card variant="elevated" style={{ marginTop: Spacing.sm }}>
                  <EliteText style={styles.emptyText}>
                    Aún no registras síntomas aislados. Un toque en un chip y a registrar —
                    con el tiempo, los patrones le dan señal a ARGOS.
                  </EliteText>
                </Card>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp.delay(90).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>TU TIMELINE</SectionTitle>
                <Card variant="elevated">
                  {groups.map((g, gi) => (
                    <View key={g.day} style={gi > 0 && styles.dayBlock}>
                      <EliteText style={styles.dayHeader}>{headerFor(g.day).toUpperCase()}</EliteText>
                      {g.items.map((row) => (
                        <View key={row.id} style={styles.itemRow}>
                          <View style={styles.itemDot} />
                          <View style={{ flex: 1 }}>
                            <EliteText style={styles.itemTag}>{row.tag}</EliteText>
                            <EliteText style={styles.itemMeta}>
                              {timeOf(row.logged_at)}
                              {row.severity ? ` · severidad ${row.severity}/5` : ''}
                            </EliteText>
                            {row.note ? <EliteText style={styles.itemNote}>{row.note}</EliteText> : null}
                          </View>
                          <AnimatedPressable onPress={() => onDelete(row)} hitSlop={8} style={styles.deleteBtn}>
                            <Ionicons name="close" size={14} color={TEXT.muted} />
                          </AnimatedPressable>
                        </View>
                      ))}
                    </View>
                  ))}
                </Card>
              </Animated.View>
            )}

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        )}
      </Screen>
    </MedicalDisclaimerGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 60 },

  // Formulario
  formLabel: { fontFamily: Fonts.bold, fontSize: 10, color: TEXT.tertiary, letterSpacing: 2, marginBottom: Spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#222',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
  },
  chipOn: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: ATP_BRAND.lime },
  chipText: { fontFamily: Fonts.regular, fontSize: 11, color: TEXT.secondary },
  chipTextOn: { fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  input: {
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#222', borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 11, color: TEXT.primary,
    fontSize: 14, fontFamily: Fonts.regular, marginTop: Spacing.sm,
  },
  fieldLabel: {
    fontFamily: Fonts.bold, fontSize: 10, color: TEXT.tertiary, letterSpacing: 2,
    marginTop: Spacing.md, marginBottom: 8,
  },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityOption: {
    flex: 1, height: 40, borderRadius: Radius.md, borderWidth: 1, borderColor: '#222',
    backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center',
  },
  severityOptionOn: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: ATP_BRAND.lime },
  severityOptionText: { fontFamily: Fonts.bold, fontSize: 15, color: TEXT.secondary },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md,
    paddingVertical: 13, marginTop: Spacing.md,
  },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000' },
  dxNote: {
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary,
    lineHeight: 16, marginTop: Spacing.sm, textAlign: 'center',
  },

  // Timeline
  emptyText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.tertiary, lineHeight: 20 },
  dayBlock: { borderTopWidth: 1, borderTopColor: ELEVATION[1].border, marginTop: Spacing.sm, paddingTop: Spacing.sm },
  dayHeader: { fontFamily: Fonts.bold, fontSize: 10, color: TEXT.tertiary, letterSpacing: 2, marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: withOpacity(ATP_BRAND.lime, 0.5), marginTop: 5 },
  itemTag: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  itemMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, marginTop: 1 },
  itemNote: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary, marginTop: 3, lineHeight: 16 },
  deleteBtn: { padding: 4, marginTop: 2 },
});
