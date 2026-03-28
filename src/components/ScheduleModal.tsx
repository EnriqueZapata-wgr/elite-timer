/**
 * ScheduleModal — Modal para programar una rutina en el calendario.
 *
 * Dos modos:
 *   1. Ciclo semanal: chips L M X J V S D (multi-select)
 *   2. Fecha específica: grid de los próximos 14 días
 *
 * Muestra los schedules actuales con opción de eliminar.
 */
import { useState, useEffect } from 'react';
import {
  View, Modal, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import {
  getRoutineSchedule,
  scheduleWeeklyCycle,
  scheduleSpecificDate,
  removeSchedule,
  type ScheduledRoutine,
} from '@/src/services/schedule-service';

// === CONSTANTES ===

/** Etiquetas de días — índice = DOW de PostgreSQL (0=dom) */
const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_FULL_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

// === PROPS ===

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  routineId: string;
  routineName: string;
}

// === COMPONENTE ===

export function ScheduleModal({ visible, onClose, routineId, routineName }: ScheduleModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ScheduledRoutine[]>([]);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'weekly' | 'date' | null>(null);

  // Cargar schedules al abrir
  useEffect(() => {
    if (visible) {
      loadSchedules();
    } else {
      // Reset al cerrar
      setMode(null);
      setSelectedDays(new Set());
    }
  }, [visible]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await getRoutineSchedule(routineId);
      setSchedules(data);
      // Pre-seleccionar días del ciclo semanal existente
      const weeklyDays = data
        .filter(s => s.schedule_type === 'weekly_cycle' && s.day_of_week !== null)
        .map(s => s.day_of_week!);
      setSelectedDays(new Set(weeklyDays));
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleSaveWeekly = async () => {
    setSaving(true);
    try {
      await scheduleWeeklyCycle(routineId, Array.from(selectedDays));
      await loadSchedules();
      setMode(null);
    } catch { /* silenciar */ }
    setSaving(false);
  };

  const handleSaveDate = async (dateStr: string) => {
    setSaving(true);
    try {
      await scheduleSpecificDate(routineId, dateStr);
      await loadSchedules();
      setMode(null);
    } catch { /* silenciar */ }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    try {
      await removeSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch { /* silenciar */ }
  };

  // Generar próximos 14 días
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      dayLabel: DAY_LABELS[d.getDay()],
      monthLabel: MONTH_NAMES[d.getMonth()],
      isToday: i === 0,
    };
  });

  // Fechas ya programadas (para marcarlas en el grid)
  const scheduledDates = new Set(
    schedules
      .filter(s => s.schedule_type === 'specific_date' && s.specific_date)
      .map(s => s.specific_date!)
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <EliteText variant="label" style={styles.modalTitle} numberOfLines={1}>
              PROGRAMAR
            </EliteText>
            <EliteText variant="caption" style={styles.modalSubtitle} numberOfLines={1}>
              {routineName}
            </EliteText>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={Colors.neonGreen} style={{ marginVertical: Spacing.lg }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
              {/* ── Schedules actuales ── */}
              {schedules.length > 0 && (
                <View style={styles.section}>
                  <EliteText variant="caption" style={styles.sectionLabel}>PROGRAMADO</EliteText>
                  {schedules.map(s => (
                    <View key={s.id} style={styles.scheduleRow}>
                      <Ionicons
                        name={s.schedule_type === 'weekly_cycle' ? 'repeat-outline' : 'calendar-outline'}
                        size={16}
                        color={Colors.neonGreen}
                      />
                      <EliteText variant="body" style={styles.scheduleText}>
                        {s.schedule_type === 'weekly_cycle' && s.day_of_week !== null
                          ? DAY_FULL_LABELS[s.day_of_week]
                          : s.specific_date ?? ''}
                      </EliteText>
                      <Pressable onPress={() => handleRemove(s.id)} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Modo selector ── */}
              {mode === null && (
                <View style={styles.section}>
                  <Pressable style={styles.optionCard} onPress={() => setMode('weekly')}>
                    <Ionicons name="repeat-outline" size={24} color={Colors.neonGreen} />
                    <View style={styles.optionText}>
                      <EliteText variant="body" style={styles.optionTitle}>Ciclo semanal</EliteText>
                      <EliteText variant="caption">Se repite cada semana</EliteText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </Pressable>

                  <Pressable style={styles.optionCard} onPress={() => setMode('date')}>
                    <Ionicons name="calendar-outline" size={24} color={Colors.info} />
                    <View style={styles.optionText}>
                      <EliteText variant="body" style={styles.optionTitle}>Fecha específica</EliteText>
                      <EliteText variant="caption">Un solo día</EliteText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              )}

              {/* ── Ciclo semanal ── */}
              {mode === 'weekly' && (
                <View style={styles.section}>
                  <EliteText variant="caption" style={styles.sectionLabel}>SELECCIONA DÍAS</EliteText>
                  <View style={styles.daysRow}>
                    {DAY_LABELS.map((label, idx) => {
                      const active = selectedDays.has(idx);
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => toggleDay(idx)}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                        >
                          <EliteText
                            variant="caption"
                            style={[styles.dayChipText, active && styles.dayChipTextActive]}
                          >
                            {label}
                          </EliteText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => setMode(null)}>
                      <EliteText variant="caption" style={styles.cancelText}>Cancelar</EliteText>
                    </Pressable>
                    <EliteButton
                      label={saving ? 'Guardando...' : 'Guardar'}
                      onPress={handleSaveWeekly}
                      style={styles.saveBtn}
                    />
                  </View>
                </View>
              )}

              {/* ── Fecha específica ── */}
              {mode === 'date' && (
                <View style={styles.section}>
                  <EliteText variant="caption" style={styles.sectionLabel}>PRÓXIMOS 14 DÍAS</EliteText>
                  <View style={styles.dateGrid}>
                    {next14Days.map(d => {
                      const alreadyScheduled = scheduledDates.has(d.date);
                      return (
                        <Pressable
                          key={d.date}
                          onPress={() => !alreadyScheduled && handleSaveDate(d.date)}
                          style={[
                            styles.dateCard,
                            d.isToday && styles.dateCardToday,
                            alreadyScheduled && styles.dateCardScheduled,
                          ]}
                        >
                          <EliteText variant="caption" style={styles.dateDayLabel}>
                            {d.dayLabel}
                          </EliteText>
                          <EliteText variant="body" style={[
                            styles.dateDayNum,
                            d.isToday && { color: Colors.neonGreen },
                          ]}>
                            {d.dayNum}
                          </EliteText>
                          <EliteText variant="caption" style={styles.dateMonthLabel}>
                            {d.monthLabel}
                          </EliteText>
                          {alreadyScheduled && (
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={Colors.neonGreen}
                              style={styles.dateCheck}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable onPress={() => setMode(null)} style={{ alignSelf: 'center', marginTop: Spacing.sm }}>
                    <EliteText variant="caption" style={styles.cancelText}>Cancelar</EliteText>
                  </Pressable>
                </View>
              )}

              {saving && (
                <ActivityIndicator size="small" color={Colors.neonGreen} style={{ marginVertical: Spacing.sm }} />
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// === ESTILOS ===

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
    maxHeight: '80%',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  modalHeader: {
    padding: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    color: Colors.neonGreen,
    letterSpacing: 3,
    fontSize: 13,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  body: {
    padding: Spacing.md,
  },

  // Secciones
  section: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: 11,
    marginBottom: Spacing.sm,
  },

  // Schedules actuales
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  scheduleText: {
    flex: 1,
    fontSize: 14,
  },

  // Opciones (weekly / date)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: Fonts.semiBold,
    marginBottom: 2,
  },

  // Chips de días
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: Colors.surfaceLight,
  },
  dayChipActive: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '20',
  },
  dayChipText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  dayChipTextActive: {
    color: Colors.neonGreen,
  },

  // Acciones
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    padding: Spacing.sm,
  },
  saveBtn: {
    minWidth: 120,
  },

  // Grid de fechas
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  dateCard: {
    width: 58,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: Colors.surfaceLight,
  },
  dateCardToday: {
    borderColor: Colors.neonGreen + '50',
  },
  dateCardScheduled: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '10',
  },
  dateDayLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  dateDayNum: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  dateMonthLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  dateCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});
