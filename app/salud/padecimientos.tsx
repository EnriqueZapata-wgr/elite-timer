/**
 * Padecimientos (SALUD F5) — registro ligero de condiciones + episodios (recurrencia).
 *
 * Modelo normalizado de la migración 173: padecimiento = definición de la
 * condición; cada ocurrencia = un episodio (started_on / resolved_on, con
 * duration_days GENERADO en Postgres). Peso ALTO en el DX — el harvest de
 * dx-engine.ts ya lee ambas tablas.
 *
 * Copy no-alarmista (medicina funcional): esto es un REGISTRO del user para su
 * expediente, no un diagnóstico. Todo DENTRO de cards; formulario en bottom
 * sheet modal (patrón quick-add de health-hub.tsx).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, DeviceEventEmitter, KeyboardAvoidingView,
  LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet,
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
import { getLocalToday, formatLocalDate } from '@/src/utils/date-helpers';
import {
  CATEGORY_LABELS,
  PADECIMIENTO_CATEGORIES,
  episodioStatusLabel,
  validatePadecimientoInput,
  type PadecimientoCategory,
  type PadecimientoView,
} from '@/src/services/salud/padecimientos-core';
import {
  addEpisodio,
  addPadecimiento,
  deletePadecimiento,
  loadPadecimientos,
  resolveEpisodio,
  PADECIMIENTOS_CHANGED_EVENT,
} from '@/src/services/salud/padecimientos-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const DX_NOTE = 'Esto alimenta tu Mapa Funcional. No sustituye la valoración de tu profesional de salud.';

export default function PadecimientosScreen() {
  const { user } = useAuth();
  const [views, setViews] = useState<PadecimientoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const startedRef = useRef(false);

  // ── Formulario (bottom sheet) ──
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fName, setFName] = useState('');
  const [fCategory, setFCategory] = useState<PadecimientoCategory>('otro');
  const [fChronic, setFChronic] = useState(false);
  const [fStartedOn, setFStartedOn] = useState('');
  const [fResolved, setFResolved] = useState(false);
  const [fNotes, setFNotes] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await loadPadecimientos(user.id);
    setViews(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (startedRef.current || !user?.id) return;
    startedRef.current = true;
    load().catch(() => setLoading(false));
    const sub = DeviceEventEmitter.addListener(PADECIMIENTOS_CHANGED_EVENT, () => { load().catch(() => {}); });
    return () => sub.remove();
  }, [user?.id, load]);

  const openForm = () => {
    haptic.medium();
    setFName('');
    setFCategory('otro');
    setFChronic(false);
    setFStartedOn(getLocalToday());
    setFResolved(false);
    setFNotes('');
    setFormOpen(true);
  };

  const onSave = useCallback(async () => {
    if (!user?.id || saving) return;
    const validated = validatePadecimientoInput(
      {
        name: fName,
        category: fCategory,
        isChronic: fChronic,
        startedOn: fStartedOn,
        isResolved: fResolved,
        notes: fNotes,
      },
      getLocalToday(),
    );
    if (!validated.ok) {
      haptic.warning();
      Alert.alert('Revisa el registro', validated.error);
      return;
    }
    setSaving(true);
    const created = await addPadecimiento(user.id, validated.value);
    setSaving(false);
    if (created) {
      haptic.success();
      setFormOpen(false);
      setExpanded((prev) => ({ ...prev, [created.id]: true }));
    } else {
      haptic.warning();
      Alert.alert('Algo no salió', 'No se pudo guardar el padecimiento. Intenta de nuevo.');
    }
  }, [user?.id, saving, fName, fCategory, fChronic, fStartedOn, fResolved, fNotes]);

  const toggle = (id: string) => {
    haptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onNewEpisodio = (v: PadecimientoView) => {
    if (!user?.id) return;
    haptic.medium();
    Alert.alert(
      'Nuevo episodio',
      `¿Registrar que "${v.padecimiento.name}" volvió a presentarse (inició hoy)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Registrar', onPress: () => { addEpisodio(user.id!, v.padecimiento.id).catch(() => {}); } },
      ],
    );
  };

  const onResolve = (episodioId: string, name: string) => {
    if (!user?.id) return;
    haptic.light();
    Alert.alert('Marcar como resuelto', `¿"${name}" se resolvió hoy?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, resuelto', onPress: () => { resolveEpisodio(user.id!, episodioId).catch(() => {}); } },
    ]);
  };

  const onDelete = (v: PadecimientoView) => {
    if (!user?.id) return;
    haptic.light();
    Alert.alert(
      'Eliminar del expediente',
      `Se eliminará "${v.padecimiento.name}" con sus ${v.episodios.length} episodio(s).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => { deletePadecimiento(user.id!, v.padecimiento.id).catch(() => {}); } },
      ],
    );
  };

  return (
    <MedicalDisclaimerGate>
      <Screen edges={[]}>
        <ScreenHeader title="Padecimientos" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* ── Intro + CTA ── */}
            <Animated.View entering={FadeInUp.delay(40).springify()}>
              <Card variant="elevated">
                <EliteText style={styles.introLabel}>TU EXPEDIENTE</EliteText>
                <EliteText style={styles.introText}>
                  Registra las condiciones que has vivido — desde una gripe hasta algo
                  crónico. La frecuencia y duración de los episodios le dan mucha señal
                  a tu Mapa Funcional.
                </EliteText>
                <AnimatedPressable onPress={openForm} style={styles.cta}>
                  <Ionicons name="add" size={18} color="#000" />
                  <EliteText style={styles.ctaText}>Registrar padecimiento</EliteText>
                </AnimatedPressable>
                <EliteText style={styles.dxNote}>{DX_NOTE}</EliteText>
              </Card>
            </Animated.View>

            {/* ── Lista con episodios expandibles ── */}
            {views.length === 0 ? (
              <Animated.View entering={FadeInUp.delay(90).springify()}>
                <Card variant="elevated" style={{ marginTop: Spacing.sm }}>
                  <EliteText style={styles.emptyText}>
                    Aún no registras padecimientos. Es tu registro personal — no un
                    diagnóstico — y ayuda a ARGOS a entender tu historia.
                  </EliteText>
                </Card>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp.delay(90).springify()}>
                <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>TUS PADECIMIENTOS</SectionTitle>
                <Card variant="elevated" style={styles.listCard}>
                  {views.map((v) => {
                    const isOpen = !!expanded[v.padecimiento.id];
                    return (
                      <View key={v.padecimiento.id} style={styles.pedCard}>
                        <Pressable onPress={() => toggle(v.padecimiento.id)} style={styles.pedHeader}>
                          <View style={[styles.statusDot, { backgroundColor: v.isActive ? '#fbbf24' : '#4ade80' }]} />
                          <View style={{ flex: 1 }}>
                            <EliteText style={styles.pedName}>{v.padecimiento.name}</EliteText>
                            <EliteText style={styles.pedMeta}>
                              {CATEGORY_LABELS[v.padecimiento.category]}
                              {v.padecimiento.is_chronic ? ' · crónico' : ''}
                              {` · ${v.isActive ? 'activo' : 'resuelto'}`}
                            </EliteText>
                          </View>
                          {v.episodios.length > 1 && (
                            <View style={styles.epBadge}>
                              <EliteText style={styles.epBadgeText}>{v.episodios.length}×</EliteText>
                            </View>
                          )}
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT.tertiary} />
                        </Pressable>

                        {isOpen && (
                          <View style={styles.pedBody}>
                            {v.padecimiento.notes ? (
                              <EliteText style={styles.pedNotes}>{v.padecimiento.notes}</EliteText>
                            ) : null}

                            {v.episodios.map((ep) => (
                              <View key={ep.id} style={styles.epRow}>
                                <View style={[styles.epDot, ep.resolved_on === null && { backgroundColor: '#fbbf24' }]} />
                                <View style={{ flex: 1 }}>
                                  <EliteText style={styles.epDates}>
                                    {formatLocalDate(ep.started_on, { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </EliteText>
                                  <EliteText style={styles.epStatus}>{episodioStatusLabel(ep)}</EliteText>
                                </View>
                                {ep.resolved_on === null && (
                                  <Pressable
                                    onPress={() => onResolve(ep.id, v.padecimiento.name)}
                                    style={styles.epAction}
                                    hitSlop={6}
                                  >
                                    <EliteText style={styles.epActionText}>Resolver</EliteText>
                                  </Pressable>
                                )}
                              </View>
                            ))}

                            <View style={styles.pedActions}>
                              {!v.isActive && (
                                <Pressable onPress={() => onNewEpisodio(v)} style={styles.pedActionBtn} hitSlop={6}>
                                  <Ionicons name="repeat" size={14} color={TEXT.secondary} />
                                  <EliteText style={styles.pedActionText}>Volvió a presentarse</EliteText>
                                </Pressable>
                              )}
                              <Pressable onPress={() => onDelete(v)} style={styles.pedActionBtn} hitSlop={6}>
                                <Ionicons name="trash-outline" size={14} color={TEXT.muted} />
                                <EliteText style={[styles.pedActionText, { color: TEXT.muted }]}>Eliminar</EliteText>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </Card>
              </Animated.View>
            )}

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        )}

        {/* ── Modal de registro (bottom sheet, patrón health-hub) ── */}
        <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setFormOpen(false)} />
            <View style={styles.modalCard}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <EliteText style={styles.modalLabel}>REGISTRAR PADECIMIENTO</EliteText>

                <TextInput
                  value={fName}
                  onChangeText={setFName}
                  placeholder="¿Qué padecimiento? (ej. gripe, gastritis)"
                  placeholderTextColor={TEXT.muted}
                  style={styles.input}
                  maxLength={80}
                  autoFocus
                />

                <EliteText style={styles.fieldLabel}>CATEGORÍA</EliteText>
                <View style={styles.chipsRow}>
                  {PADECIMIENTO_CATEGORIES.map((c) => {
                    const on = fCategory === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => { haptic.light(); setFCategory(c); }}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <EliteText style={[styles.chipText, on && styles.chipTextOn]}>
                          {CATEGORY_LABELS[c]}
                        </EliteText>
                      </Pressable>
                    );
                  })}
                </View>

                <EliteText style={styles.fieldLabel}>FECHA APROXIMADA DE INICIO</EliteText>
                <TextInput
                  value={fStartedOn}
                  onChangeText={setFStartedOn}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={TEXT.muted}
                  style={styles.input}
                  maxLength={10}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.togglesRow}>
                  <Pressable
                    onPress={() => { haptic.light(); setFResolved((r) => !r); }}
                    style={[styles.toggleChip, !fResolved && styles.toggleChipOn]}
                  >
                    <EliteText style={[styles.toggleText, !fResolved && styles.toggleTextOn]}>Sigue activo</EliteText>
                  </Pressable>
                  <Pressable
                    onPress={() => { haptic.light(); setFResolved((r) => !r); }}
                    style={[styles.toggleChip, fResolved && styles.toggleChipOn]}
                  >
                    <EliteText style={[styles.toggleText, fResolved && styles.toggleTextOn]}>Ya se resolvió</EliteText>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => { haptic.light(); setFChronic((c) => !c); }}
                  style={styles.chronicRow}
                >
                  <Ionicons
                    name={fChronic ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={fChronic ? ATP_BRAND.lime : TEXT.tertiary}
                  />
                  <EliteText style={styles.chronicText}>Es crónico (me acompaña de forma continua)</EliteText>
                </Pressable>

                <TextInput
                  value={fNotes}
                  onChangeText={setFNotes}
                  placeholder="Notas opcionales (manejo, contexto)…"
                  placeholderTextColor={TEXT.muted}
                  style={[styles.input, { minHeight: 60 }]}
                  maxLength={500}
                  multiline
                />

                <AnimatedPressable onPress={onSave} disabled={saving} style={styles.modalSave}>
                  {saving && <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />}
                  <EliteText style={styles.modalSaveText}>{saving ? 'Guardando…' : 'GUARDAR'}</EliteText>
                </AnimatedPressable>

                <EliteText style={styles.dxNote}>{DX_NOTE}</EliteText>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Screen>
    </MedicalDisclaimerGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 60 },

  // Intro
  introLabel: { fontFamily: Fonts.bold, fontSize: 10, color: TEXT.tertiary, letterSpacing: 2, marginBottom: 6 },
  introText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, lineHeight: 20 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md,
    paddingVertical: 13, marginTop: Spacing.md,
  },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000' },
  dxNote: {
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary,
    lineHeight: 16, marginTop: Spacing.sm, textAlign: 'center',
  },
  emptyText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.tertiary, lineHeight: 20 },

  // Lista (card contenedora ELEVATION[1] + padecimientos ELEVATION[2], patrón health-hub FIX 3)
  listCard: { padding: Spacing.sm, paddingBottom: 4 },
  pedCard: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 12, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  pedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  pedName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.primary },
  pedMeta: { fontFamily: Fonts.regular, fontSize: 11, color: TEXT.tertiary, marginTop: 1 },
  epBadge: {
    minWidth: 24, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: withOpacity('#1D9E75', 0.18), justifyContent: 'center', alignItems: 'center',
  },
  epBadgeText: { fontFamily: Fonts.bold, fontSize: 11, color: '#1D9E75' },
  pedBody: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: ELEVATION[2].border, paddingTop: Spacing.sm,
  },
  pedNotes: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary, lineHeight: 17, marginBottom: 6 },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  epDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  epDates: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: TEXT.primary },
  epStatus: { fontFamily: Fonts.regular, fontSize: 11, color: TEXT.tertiary, marginTop: 1 },
  epAction: {
    backgroundColor: ELEVATION[3].bg, borderWidth: 1, borderColor: ELEVATION[3].border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  epActionText: { fontFamily: Fonts.semiBold, fontSize: 11, color: TEXT.primary },
  pedActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  pedActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  pedActionText: { fontFamily: Fonts.semiBold, fontSize: 12, color: TEXT.secondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: ELEVATION[2].bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: ELEVATION[2].border,
    padding: Spacing.lg, paddingBottom: Spacing.xl, maxHeight: '86%',
  },
  modalLabel: {
    fontFamily: Fonts.semiBold, fontSize: 10, color: TEXT.tertiary,
    letterSpacing: 2, marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#222', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: TEXT.primary,
    fontSize: 14, fontFamily: Fonts.regular,
  },
  fieldLabel: {
    fontFamily: Fonts.semiBold, fontSize: 10, color: TEXT.tertiary,
    letterSpacing: 2, marginTop: Spacing.md, marginBottom: 8,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  chip: {
    backgroundColor: '#0a0a0a', borderWidth: 0.5, borderColor: '#1a1a1a',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
  },
  chipOn: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: ATP_BRAND.lime },
  chipText: { fontFamily: Fonts.regular, fontSize: 11, color: TEXT.secondary },
  chipTextOn: { fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
  togglesRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  toggleChip: {
    flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#222',
    backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center',
  },
  toggleChipOn: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: ATP_BRAND.lime },
  toggleText: { fontFamily: Fonts.semiBold, fontSize: 13, color: TEXT.secondary },
  toggleTextOn: { color: ATP_BRAND.lime },
  chronicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, marginBottom: Spacing.md },
  chronicText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, flex: 1 },
  modalSave: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ATP_BRAND.lime, borderRadius: 14, paddingVertical: 14, marginTop: Spacing.sm,
  },
  modalSaveText: { fontFamily: Fonts.extraBold, fontSize: 14, color: '#000' },
});
