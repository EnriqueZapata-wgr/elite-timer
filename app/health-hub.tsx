/**
 * Historia Clínica — expediente vivo (F3 sprint UX blockers V1.3).
 *
 * Antes: solo launcher de 8 cards ("captura pero output confuso"). Ahora:
 * resumen ejecutivo + 7 sistemas funcionales colapsables con síntomas
 * registrados (clinical_symptoms, migración 152) + quick-add + drill-down
 * por sistema (/clinical-system). Los módulos del ecosistema siguen abajo.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TextInput, Modal, Pressable,
  LayoutAnimation, DeviceEventEmitter, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, ELEVATION, TEXT, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  FUNCTIONAL_SYSTEMS,
  SEVERITY_LABELS,
  severityColor,
  type FunctionalSystemKey,
} from '@/src/constants/functional-systems';
import {
  loadSymptoms,
  addSymptom,
  groupSymptomsBySystem,
  buildExecutiveSummary,
  type ClinicalSymptom,
} from '@/src/services/clinical-history-service';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

type Card = { key: string; title: string; subtitle: string; icon: string; gradient: [string, string]; route: string };

// #cableado-final 3.7: imágenes B/N estáticas por card (require() estático — Metro).
const HEALTH_HUB_IMAGES: Record<string, any> = {
  mi_salud: require('@/assets/images/health-hub/mi-salud.png'),
  protocolos: require('@/assets/images/health-hub/protocolos.png'),
  glucosa: require('@/assets/images/health-hub/glucosa.png'),
  cetonas: require('@/assets/images/health-hub/cetonas.png'),
  labs: require('@/assets/images/health-hub/laboratorios.png'),
  biomarcadores: require('@/assets/images/health-hub/biomarcadores.png'),
  tests: require('@/assets/images/health-hub/tests-evaluaciones.png'),
  cinematicas: require('@/assets/images/health-hub/pruebas-cinematicas.png'),
  // #67 p5b: sin asset dedicado aún — reutiliza el B/N de tests
  historia_clinica: require('@/assets/images/health-hub/tests-evaluaciones.png'),
};

const CARDS: Card[] = [
  { key: 'mi_salud', title: 'ATP MI SALUD', subtitle: 'Tu panel funcional: corazón, glucosa, biomarcadores', icon: '🫀', gradient: ['#38BDF8', '#3B82F6'], route: '/my-health' },
  { key: 'protocolos', title: 'PROTOCOLOS', subtitle: 'Configura electrones, metas y horarios', icon: '⚙️', gradient: ['#A8E02A', '#1ABC9C'], route: '/protocol-config' },
  { key: 'glucosa', title: 'GLUCOSA', subtitle: 'Registro y rangos funcionales', icon: '🩸', gradient: ['#FB923C', '#EF4444'], route: '/glucose-log' },
  { key: 'cetonas', title: 'CETONAS EN SANGRE', subtitle: 'Monitoreo de cetosis (mmol/L)', icon: '💧', gradient: ['#C084FC', '#A855F7'], route: '/ketones-log' },
  { key: 'labs', title: 'LABORATORIOS', subtitle: 'Sube y consulta tus estudios', icon: '🧪', gradient: ['#60A5FA', '#3B82F6'], route: '/edad-atp/labs' },
  { key: 'biomarcadores', title: 'BIOMARCADORES', subtitle: 'Peso, composición, fuerza de agarre, medidas', icon: '📊', gradient: ['#22C55E', '#16A34A'], route: '/health-input' },
  { key: 'tests', title: 'TESTS Y EVALUACIONES', subtitle: 'Braverman · Evaluaciones funcionales', icon: '🧠', gradient: ['#C084FC', '#8B5CF6'], route: '/quizzes' },
  // #67 p5b (cherry-pick 7570251): cuestionarios de historia clínica funcional
  { key: 'historia_clinica', title: 'HISTORIA CLÍNICA', subtitle: 'Padecimientos, familiares, tratamientos, salud bucal', icon: '📋', gradient: ['#1D9E75', '#16A34A'], route: '/historia-clinica' },
  { key: 'cinematicas', title: 'PRUEBAS CINEMÁTICAS', subtitle: 'Plank · BOLT · Old Man · Recovery HR', icon: '🏃', gradient: ['#22D3EE', '#0EA5E9'], route: '/edad-atp/cinematic-tests-index' },
];

function HealthHubScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [symptoms, setSymptoms] = useState<ClinicalSymptom[]>([]);
  const [expanded, setExpanded] = useState<Partial<Record<FunctionalSystemKey, boolean>>>({});
  // Modal quick-add
  const [modalSystem, setModalSystem] = useState<FunctionalSystemKey | null>(null);
  const [formName, setFormName] = useState('');
  const [formSeverity, setFormSeverity] = useState(3);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const rows = await loadSymptoms(user.id);
    setSymptoms(rows);
  }, [user?.id]);

  useEffect(() => {
    reload();
    const sub = DeviceEventEmitter.addListener('clinical_history_changed', reload);
    return () => sub.remove();
  }, [reload]);

  const grouped = groupSymptomsBySystem(symptoms);
  const summary = buildExecutiveSummary(symptoms);

  // El sistema con mayor carga arranca abierto (patrón "grupo con pendientes abre")
  useEffect(() => {
    if (summary.focusSystem && expanded[summary.focusSystem] === undefined) {
      setExpanded(prev => ({ ...prev, [summary.focusSystem as FunctionalSystemKey]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.focusSystem]);

  const toggleSystem = (key: FunctionalSystemKey) => {
    haptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openAddModal = (key: FunctionalSystemKey) => {
    haptic.medium();
    setFormName('');
    setFormSeverity(3);
    setModalSystem(key);
  };

  const saveSymptom = async () => {
    if (!user?.id || !modalSystem || !formName.trim() || saving) return;
    setSaving(true);
    const created = await addSymptom(user.id, modalSystem, formName, formSeverity);
    setSaving(false);
    if (created) {
      haptic.success();
      setModalSystem(null);
      setExpanded(prev => ({ ...prev, [created.system_key]: true }));
    }
  };

  const modalMeta = modalSystem
    ? FUNCTIONAL_SYSTEMS.find(fs => fs.key === modalSystem)!
    : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Historia Clínica" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>Tu expediente vivo de salud funcional</EliteText>
        </Animated.View>

        {/* ── Resumen ejecutivo ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={s.summaryCard}>
          <Text style={s.summaryLabel}>RESUMEN DEL EXPEDIENTE</Text>
          <Text style={s.summaryHeadline}>{summary.headline}</Text>
          <View style={s.summaryActions}>
            <AnimatedPressable
              onPress={() => openAddModal(summary.focusSystem ?? 'energia')}
              style={s.summaryCtaPrimary}
            >
              <Ionicons name="add" size={16} color="#000" />
              <Text style={s.summaryCtaPrimaryText}>Añadir síntoma</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => { haptic.light(); router.push('/argos-chat' as any); }}
              style={s.summaryCtaSecondary}
            >
              <Text style={s.summaryCtaSecondaryText}>Ver reporte ARGOS</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ── 7 sistemas funcionales ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Sistemas funcionales</SectionTitle>
        </Animated.View>

        {FUNCTIONAL_SYSTEMS.map((sys, idx) => {
          const sysSymptoms = grouped[sys.key];
          const active = sysSymptoms.filter(x => x.status === 'active');
          const isOpen = !!expanded[sys.key];
          return (
            <Animated.View key={sys.key} entering={FadeInUp.delay(140 + idx * 30).springify()} style={s.systemCard}>
              <Pressable onPress={() => toggleSystem(sys.key)} style={s.systemHeader}>
                <Text style={{ fontSize: 18 }}>{sys.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.systemName}>{sys.name}</Text>
                  <Text style={s.systemScope} numberOfLines={1}>{sys.scope}</Text>
                </View>
                {active.length > 0 && (
                  <View style={[s.countBadge, { backgroundColor: withOpacity(sys.color, 0.15) }]}>
                    <Text style={[s.countBadgeText, { color: sys.color }]}>{active.length}</Text>
                  </View>
                )}
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT.tertiary} />
              </Pressable>

              {isOpen && (
                <View style={s.systemBody}>
                  {active.length === 0 && (
                    <Text style={s.emptyText}>Sin síntomas activos en este sistema</Text>
                  )}
                  {active.map(sym => (
                    <Pressable
                      key={sym.id}
                      onPress={() => router.push(`/clinical-system?system=${sys.key}` as any)}
                      style={s.symptomRow}
                    >
                      <View style={[s.severityDot, { backgroundColor: severityColor(sym.severity) }]} />
                      <Text style={s.symptomName} numberOfLines={1}>{sym.name}</Text>
                      <Text style={[s.symptomSeverity, { color: severityColor(sym.severity) }]}>
                        {SEVERITY_LABELS[sym.severity]}
                      </Text>
                    </Pressable>
                  ))}
                  <View style={s.systemActions}>
                    <Pressable onPress={() => openAddModal(sys.key)} style={s.systemActionBtn} hitSlop={6}>
                      <Ionicons name="add-circle-outline" size={15} color={TEXT.secondary} />
                      <Text style={s.systemActionText}>Añadir síntoma</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push(`/clinical-system?system=${sys.key}` as any)}
                      style={s.systemActionBtn}
                      hitSlop={6}
                    >
                      <Text style={[s.systemActionText, { color: sys.color }]}>Ver sistema</Text>
                      <Ionicons name="chevron-forward" size={13} color={sys.color} />
                    </Pressable>
                  </View>
                </View>
              )}
            </Animated.View>
          );
        })}

        {/* ── Módulos del ecosistema ── */}
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Módulos</SectionTitle>
        {CARDS.map((c, idx) => (
          <Animated.View key={c.key} entering={FadeInUp.delay(120 + idx * 40).springify()}>
            <EditorialCard
              cardKey={`hh_${c.key}`} icon={c.icon} title={c.title} subtitle={c.subtitle}
              gradient={c.gradient} imageBn={HEALTH_HUB_IMAGES[c.key]}
              onTap={() => router.push(c.route as any)}
            />
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── Modal quick-add síntoma ── */}
      <Modal visible={modalSystem != null} transparent animationType="fade" onRequestClose={() => setModalSystem(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalSystem(null)} />
          {modalMeta && (
            <View style={s.modalCard}>
              <Text style={s.modalLabel}>AÑADIR SÍNTOMA · {modalMeta.name.toUpperCase()}</Text>

              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="¿Qué sientes? (ej. fatiga por la tarde)"
                placeholderTextColor={TEXT.muted}
                style={s.modalInput}
                autoFocus
              />

              {/* Ejemplos rápidos del sistema */}
              <View style={s.chipsRow}>
                {modalMeta.exampleSymptoms.slice(0, 4).map(ex => (
                  <Pressable key={ex} onPress={() => { haptic.light(); setFormName(ex); }} style={s.chip}>
                    <Text style={s.chipText}>{ex}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.modalFieldLabel}>SEVERIDAD — {SEVERITY_LABELS[formSeverity]}</Text>
              <View style={s.severityRow}>
                {[1, 2, 3, 4, 5].map(lvl => (
                  <Pressable
                    key={lvl}
                    onPress={() => { haptic.light(); setFormSeverity(lvl); }}
                    style={[
                      s.severityOption,
                      formSeverity === lvl && {
                        backgroundColor: withOpacity(severityColor(lvl), 0.18),
                        borderColor: severityColor(lvl),
                      },
                    ]}
                  >
                    <Text style={[s.severityOptionText, formSeverity === lvl && { color: severityColor(lvl) }]}>
                      {lvl}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <AnimatedPressable
                onPress={saveSymptom}
                disabled={!formName.trim() || saving}
                style={s.modalSave}
              >
                <Text style={s.modalSaveText}>{saving ? 'Guardando…' : 'GUARDAR SÍNTOMA'}</Text>
              </AnimatedPressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.sm,
    marginBottom: Spacing.lg, marginTop: Spacing.xs, fontFamily: Fonts.regular,
  },

  // Resumen ejecutivo
  summaryCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: 16, padding: Spacing.md,
  },
  summaryLabel: {
    color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold,
    letterSpacing: 2, marginBottom: 6,
  },
  summaryHeadline: {
    color: TEXT.primary, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, lineHeight: 24,
  },
  summaryActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
  summaryCtaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ATP_BRAND.lime, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  summaryCtaPrimaryText: { color: '#000', fontSize: 13, fontFamily: Fonts.bold },
  summaryCtaSecondary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
  },
  summaryCtaSecondaryText: { color: TEXT.primary, fontSize: 13, fontFamily: Fonts.semiBold },

  // Sistemas funcionales colapsables
  systemCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: 14, marginBottom: 8, overflow: 'hidden',
  },
  systemHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md,
  },
  systemName: { color: TEXT.primary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  systemScope: { color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.regular, marginTop: 1 },
  countBadge: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  countBadgeText: { fontSize: 12, fontFamily: Fonts.bold },
  systemBody: {
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: '#141414', paddingTop: Spacing.sm,
  },
  emptyText: { color: TEXT.muted, fontSize: 12, fontFamily: Fonts.regular, paddingVertical: 4 },
  symptomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9,
  },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  symptomName: { flex: 1, color: '#ccc', fontSize: 13, fontFamily: Fonts.regular },
  symptomSeverity: { fontSize: 11, fontFamily: Fonts.semiBold },
  systemActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6,
  },
  systemActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  systemActionText: { color: TEXT.secondary, fontSize: 12, fontFamily: Fonts.semiBold },

  // Modal quick-add
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: ELEVATION[2].bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: ELEVATION[2].border, padding: Spacing.lg, paddingBottom: Spacing.xl,
  },
  modalLabel: {
    color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold,
    letterSpacing: 2, marginBottom: Spacing.md,
  },
  modalInput: {
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#222', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: TEXT.primary,
    fontSize: 14, fontFamily: Fonts.regular,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    backgroundColor: '#0a0a0a', borderWidth: 0.5, borderColor: '#1a1a1a',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
  },
  chipText: { color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.regular },
  modalFieldLabel: {
    color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold,
    letterSpacing: 2, marginTop: Spacing.md, marginBottom: 8,
  },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityOption: {
    flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#222',
    backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center',
  },
  severityOptionText: { color: TEXT.secondary, fontSize: 15, fontFamily: Fonts.bold },
  modalSave: {
    backgroundColor: ATP_BRAND.lime, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  modalSaveText: { color: '#000', fontSize: 14, fontFamily: Fonts.extraBold },
});

// #42: gate de disclaimers médicos — modal en primera visita (o bump de versión).
export default function HealthHubScreenGated() {
  return (
    <MedicalDisclaimerGate>
      <HealthHubScreen />
    </MedicalDisclaimerGate>
  );
}
