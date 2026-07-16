/**
 * MIS SÍNTOMAS — destino ÚNICO del síntoma (Mega-Sprint B · B3).
 *
 * Absorbe las 3 superficies viejas (sintomas.tsx sueltos + clinical-system.tsx
 * por sistema + widget del hub). Un solo modelo (user_symptoms · migración 202):
 * nombre + severidad + inicio + system_key opcional; marcar resuelto → duración.
 * Activos arriba, resueltos abajo con su duración.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TextInput, Modal, Pressable,
  DeviceEventEmitter, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  FUNCTIONAL_SYSTEMS, SEVERITY_LABELS, severityColor, type FunctionalSystemKey,
} from '@/src/constants/functional-systems';
import { SINTOMAS_QUICK_TAGS } from '@/src/constants/sintomas-catalog';
import {
  loadUserSymptoms, addUserSymptom, setSymptomResolved, deleteUserSymptom,
  SYMPTOMS_CHANGED_EVENT,
} from '@/src/services/salud/user-symptoms-service';
import {
  partitionByStatus, durationLabel, validateSymptomInput, type UserSymptom,
} from '@/src/services/salud/user-symptoms-core';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { ELEVATION, TEXT, TEXT_COLORS, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

function MisSintomasScreen() {
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState<UserSymptom[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState(3);
  const [systemKey, setSystemKey] = useState<FunctionalSystemKey | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setSymptoms(await loadUserSymptoms(user.id));
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    reload();
    const sub = DeviceEventEmitter.addListener(SYMPTOMS_CHANGED_EVENT, reload);
    return () => sub.remove();
  }, [reload]));

  const { active, resolved } = useMemo(() => partitionByStatus(symptoms), [symptoms]);
  const now = new Date();

  const openModal = () => { haptic.medium(); setName(''); setSeverity(3); setSystemKey(null); setModalOpen(true); };

  const save = async () => {
    if (!user?.id || saving) return;
    const check = validateSymptomInput({ name, severity, system_key: systemKey });
    if (!check.ok) { haptic.error(); return; }
    setSaving(true);
    const created = await addUserSymptom(user.id, { name, severity, system_key: systemKey });
    setSaving(false);
    if (created) { haptic.success(); setModalOpen(false); }
  };

  const toggleResolved = async (sym: UserSymptom) => {
    if (!user?.id) return;
    haptic.light();
    await setSymptomResolved(user.id, sym.id, sym.is_active); // activo → resolver
  };

  const remove = async (sym: UserSymptom) => {
    if (!user?.id) return;
    haptic.medium();
    await deleteUserSymptom(user.id, sym.id);
  };

  const systemName = (key: FunctionalSystemKey | null) =>
    key ? (FUNCTIONAL_SYSTEMS.find(s => s.key === key)?.name ?? key) : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Mis Síntomas" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Registra lo que sientes con su inicio. Al resolverlo verás cuánto duró — todo alimenta tu diagnóstico.
          </EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(70).springify()}>
          <AnimatedPressable onPress={openModal} style={s.addBtn}>
            <Ionicons name="add-circle" size={20} color="#000" />
            <Text style={s.addBtnText}>Registrar síntoma</Text>
          </AnimatedPressable>
        </Animated.View>

        {/* ── Activos ── */}
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>{`ACTIVOS (${active.length})`}</SectionTitle>
        {active.length === 0 && (
          <View style={s.emptyBox}><Text style={s.emptyText}>Sin síntomas activos. Toca “Registrar síntoma” cuando notes algo.</Text></View>
        )}
        {active.map((sym, idx) => (
          <Animated.View key={sym.id} entering={FadeInUp.delay(90 + Math.min(idx, 8) * 30).springify()} style={s.row}>
            <View style={[s.sevDot, { backgroundColor: severityColor(sym.severity) }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.symName} numberOfLines={1}>{sym.name}</Text>
              <Text style={s.symMeta}>
                {SEVERITY_LABELS[sym.severity]}
                {systemName(sym.system_key) ? ` · ${systemName(sym.system_key)}` : ''}
                {` · ${durationLabel(sym, now)}`}
              </Text>
            </View>
            <AnimatedPressable onPress={() => toggleResolved(sym)} style={s.resolveBtn} hitSlop={6}>
              <Ionicons name="checkmark-circle-outline" size={16} color={ATP_BRAND.lime} />
              <Text style={s.resolveText}>Resolver</Text>
            </AnimatedPressable>
          </Animated.View>
        ))}

        {/* ── Resueltos (con duración) ── */}
        {resolved.length > 0 && (
          <>
            <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>{`RESUELTOS (${resolved.length})`}</SectionTitle>
            {resolved.slice(0, 30).map((sym, idx) => (
              <Animated.View key={sym.id} entering={FadeInUp.delay(60 + Math.min(idx, 8) * 25).springify()} style={[s.row, s.rowResolved]}>
                <View style={[s.sevDot, { backgroundColor: TEXT.muted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.symName, s.symNameResolved]} numberOfLines={1}>{sym.name}</Text>
                  <Text style={s.symMeta}>Duró {durationLabel(sym, now)}{systemName(sym.system_key) ? ` · ${systemName(sym.system_key)}` : ''}</Text>
                </View>
                <Pressable onPress={() => toggleResolved(sym)} hitSlop={6}><Text style={s.reactivate}>Reactivar</Text></Pressable>
                <Pressable onPress={() => remove(sym)} hitSlop={6} style={{ marginLeft: 10 }}>
                  <Ionicons name="trash-outline" size={15} color={TEXT.muted} />
                </Pressable>
              </Animated.View>
            ))}
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── Modal registrar ── */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalOpen(false)} />
          <View style={s.modalCard}>
            <Text style={s.modalLabel}>REGISTRAR SÍNTOMA</Text>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="¿Qué sientes? (ej. fatiga por la tarde)"
              placeholderTextColor={TEXT.muted} style={s.modalInput} autoFocus
            />
            <View style={s.chipsRow}>
              {SINTOMAS_QUICK_TAGS.slice(0, 8).map(tag => (
                <Pressable key={tag} onPress={() => { haptic.light(); setName(tag); }} style={s.chip}>
                  <Text style={s.chipText}>{tag}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.fieldLabel}>SEVERIDAD — {SEVERITY_LABELS[severity]}</Text>
            <View style={s.sevRow}>
              {[1, 2, 3, 4, 5].map(lvl => (
                <Pressable key={lvl} onPress={() => { haptic.light(); setSeverity(lvl); }}
                  style={[s.sevOption, severity === lvl && { backgroundColor: withOpacity(severityColor(lvl), 0.18), borderColor: severityColor(lvl) }]}>
                  <Text style={[s.sevOptionText, severity === lvl && { color: severityColor(lvl) }]}>{lvl}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.fieldLabel}>SISTEMA (opcional)</Text>
            <View style={s.chipsRow}>
              <Pressable onPress={() => { haptic.light(); setSystemKey(null); }}
                style={[s.sysChip, systemKey === null && s.sysChipActive]}>
                <Text style={[s.sysChipText, systemKey === null && s.sysChipTextActive]}>Ninguno</Text>
              </Pressable>
              {FUNCTIONAL_SYSTEMS.map(sys => (
                <Pressable key={sys.key} onPress={() => { haptic.light(); setSystemKey(sys.key); }}
                  style={[s.sysChip, systemKey === sys.key && s.sysChipActive]}>
                  <Text style={[s.sysChipText, systemKey === sys.key && s.sysChipTextActive]}>{sys.icon} {sys.name}</Text>
                </Pressable>
              ))}
            </View>

            <AnimatedPressable onPress={save} disabled={!name.trim() || saving} style={s.modalSave}>
              <Text style={s.modalSaveText}>{saving ? 'Guardando…' : 'GUARDAR'}</Text>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.md, marginTop: Spacing.xs, fontFamily: Fonts.regular },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 12 },
  addBtnText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  emptyBox: { backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border, borderRadius: Radius.md, padding: Spacing.md },
  emptyText: { color: TEXT.tertiary, fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6 },
  rowResolved: { opacity: 0.7 },
  sevDot: { width: 9, height: 9, borderRadius: 4.5 },
  symName: { color: TEXT.primary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  symNameResolved: { textDecorationLine: 'line-through', color: TEXT.secondary },
  symMeta: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resolveText: { color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  reactivate: { color: TEXT.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: ELEVATION[2].bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: ELEVATION[2].border, padding: Spacing.lg, paddingBottom: Spacing.xl },
  modalLabel: { color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2, marginBottom: Spacing.md },
  modalInput: { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#222', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: TEXT.primary, fontSize: 14, fontFamily: Fonts.regular },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: '#0a0a0a', borderWidth: 0.5, borderColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.regular },
  fieldLabel: { color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2, marginTop: Spacing.md, marginBottom: 8 },
  sevRow: { flexDirection: 'row', gap: 8 },
  sevOption: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#222', backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  sevOptionText: { color: TEXT.secondary, fontSize: 15, fontFamily: Fonts.bold },
  sysChip: { backgroundColor: '#0a0a0a', borderWidth: 0.5, borderColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  sysChipActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: withOpacity(ATP_BRAND.lime, 0.4) },
  sysChipText: { color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.regular },
  sysChipTextActive: { color: ATP_BRAND.lime },
  modalSave: { backgroundColor: ATP_BRAND.lime, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.lg },
  modalSaveText: { color: '#000', fontSize: 14, fontFamily: Fonts.extraBold },
});

export default function MisSintomasGated() {
  return (
    <MedicalDisclaimerGate>
      <MisSintomasScreen />
    </MedicalDisclaimerGate>
  );
}
