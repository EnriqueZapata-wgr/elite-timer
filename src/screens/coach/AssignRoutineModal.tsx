/**
 * AssignRoutineModal — Seleccionar rutina del coach + programación para asignar a cliente.
 */
import { useState, useEffect } from 'react';
import { View, Modal, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/src/constants/brand';
import { getCoachRoutines, assignRoutineToClient, type ClientRoutine } from '@/src/services/coach-panel-service';

const TEAL = CATEGORY_COLORS.metrics;
const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

interface Props {
  visible: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onAssigned: () => void;
}

export function AssignRoutineModal({ visible, onClose, clientId, clientName, onAssigned }: Props) {
  const [routines, setRoutines] = useState<ClientRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] = useState<ClientRoutine | null>(null);
  const [scheduleType, setScheduleType] = useState<'weekly_cycle' | 'specific_date'>('weekly_cycle');
  const [selectedDay, setSelectedDay] = useState<number>(1); // Lunes
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'select' | 'schedule'>('select');

  useEffect(() => {
    if (visible) {
      setStep('select');
      setSelectedRoutine(null);
      setLoading(true);
      getCoachRoutines().then(setRoutines).catch(() => {}).finally(() => setLoading(false));
    }
  }, [visible]);

  const handleAssign = async () => {
    if (!selectedRoutine) return;
    setSaving(true);
    try {
      await assignRoutineToClient(
        clientId,
        selectedRoutine.id,
        scheduleType,
        scheduleType === 'weekly_cycle' ? selectedDay : undefined,
        scheduleType === 'specific_date' ? new Date().toISOString().split('T')[0] : undefined,
      );
      onAssigned();
      onClose();
    } catch { /* silenciar */ }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <EliteText variant="label" style={styles.title}>
              {step === 'select' ? 'ASIGNAR RUTINA' : 'PROGRAMAR'}
            </EliteText>
            <EliteText variant="caption" style={styles.subtitle}>Para {clientName}</EliteText>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {step === 'select' ? (
            /* Paso 1: seleccionar rutina */
            <ScrollView style={styles.body}>
              {loading ? (
                <ActivityIndicator color={TEAL} style={{ marginVertical: Spacing.lg }} />
              ) : routines.length === 0 ? (
                <EliteText variant="caption" style={styles.emptyText}>
                  No tienes rutinas. Crea una primero en Biblioteca.
                </EliteText>
              ) : (
                routines.map(r => (
                  <Pressable
                    key={r.id}
                    onPress={() => { setSelectedRoutine(r); setStep('schedule'); }}
                    style={styles.routineItem}
                  >
                    <View style={[styles.routineDot, {
                      backgroundColor: r.mode === 'timer' ? Colors.neonGreen : CATEGORY_COLORS.mind,
                    }]} />
                    <View style={styles.routineInfo}>
                      <EliteText variant="body" style={styles.routineName}>{r.name}</EliteText>
                      <EliteText variant="caption" style={styles.routineMeta}>
                        {r.mode === 'timer' ? 'Timer' : 'Rutina'}
                      </EliteText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          ) : (
            /* Paso 2: programar */
            <View style={styles.body}>
              <EliteText variant="body" style={styles.selectedName}>
                {selectedRoutine?.name}
              </EliteText>

              {/* Tipo de programación */}
              <View style={styles.scheduleToggle}>
                <Pressable
                  onPress={() => setScheduleType('weekly_cycle')}
                  style={[styles.scheduleOption, scheduleType === 'weekly_cycle' && styles.scheduleOptionActive]}
                >
                  <EliteText variant="caption" style={[
                    styles.scheduleOptionText,
                    scheduleType === 'weekly_cycle' && { color: TEAL },
                  ]}>Semanal</EliteText>
                </Pressable>
                <Pressable
                  onPress={() => setScheduleType('specific_date')}
                  style={[styles.scheduleOption, scheduleType === 'specific_date' && styles.scheduleOptionActive]}
                >
                  <EliteText variant="caption" style={[
                    styles.scheduleOptionText,
                    scheduleType === 'specific_date' && { color: TEAL },
                  ]}>Hoy</EliteText>
                </Pressable>
              </View>

              {/* Selector de día (solo weekly) */}
              {scheduleType === 'weekly_cycle' && (
                <View style={styles.daysRow}>
                  {DAY_LABELS.map((label, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => setSelectedDay(idx)}
                      style={[styles.dayChip, selectedDay === idx && styles.dayChipActive]}
                    >
                      <EliteText variant="caption" style={[
                        styles.dayText,
                        selectedDay === idx && { color: TEAL },
                      ]}>{label}</EliteText>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.actionRow}>
                <Pressable onPress={() => setStep('select')}>
                  <EliteText variant="caption" style={styles.backText}>← Cambiar rutina</EliteText>
                </Pressable>
                <EliteButton
                  label={saving ? 'Asignando...' : 'Asignar'}
                  onPress={handleAssign}
                  style={styles.assignBtn}
                />
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    width: '100%',
    maxWidth: 480,
    maxHeight: '70%',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  header: { padding: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: '#2a2a2a' },
  title: { color: TEAL, letterSpacing: 3, fontSize: 13 },
  subtitle: { color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md, padding: Spacing.xs },
  body: { padding: Spacing.md },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
  routineItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.surfaceLight,
  },
  routineDot: { width: 8, height: 8, borderRadius: 4 },
  routineInfo: { flex: 1 },
  routineName: { fontFamily: Fonts.semiBold, fontSize: 14 },
  routineMeta: { color: Colors.textSecondary, fontSize: 11 },
  selectedName: { fontFamily: Fonts.bold, fontSize: 16, marginBottom: Spacing.md },
  scheduleToggle: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  scheduleOption: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: '#2a2a2a',
  },
  scheduleOptionActive: { borderColor: TEAL, backgroundColor: TEAL + '15' },
  scheduleOptionText: { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 13 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  dayChip: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  dayChipActive: { borderColor: TEAL, backgroundColor: TEAL + '20' },
  dayText: { color: Colors.textSecondary, fontFamily: Fonts.bold, fontSize: 13 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm,
  },
  backText: { color: Colors.textSecondary, fontSize: 12 },
  assignBtn: { minWidth: 120 },
});
