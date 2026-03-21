/**
 * ExerciseHistory — Modal con historial cronológico de un ejercicio.
 *
 * Muestra todas las veces que el usuario hizo ese ejercicio,
 * agrupadas por fecha, con detalle set por set.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Modal, StyleSheet, Pressable, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { getExerciseHistory, getExercisePRs } from '@/src/services/exercise-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import type { ExerciseLog, PersonalRecord } from '@/src/types/exercise';

interface ExerciseHistoryProps {
  visible: boolean;
  exerciseId: string;
  onClose: () => void;
}

/** Agrupar logs por fecha (YYYY-MM-DD) */
function groupByDate(logs: ExerciseLog[]): Map<string, ExerciseLog[]> {
  const groups = new Map<string, ExerciseLog[]>();

  for (const log of logs) {
    const date = log.logged_at.split('T')[0];
    const existing = groups.get(date) ?? [];
    existing.push(log);
    groups.set(date, existing);
  }

  return groups;
}

/** Formatear fecha YYYY-MM-DD a formato legible */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return date.toLocaleDateString('es-ES', options);
}

export function ExerciseHistory({ visible, exerciseId, onClose }: ExerciseHistoryProps) {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [historyData, prData] = await Promise.all([
        getExerciseHistory(exerciseId, 100),
        getExercisePRs(exerciseId),
      ]);
      setLogs(historyData);
      setPrs(prData);
    } catch (err) {
      if (__DEV__) console.error('Error al cargar historial:', err);
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (visible) loadData();
  }, [visible, loadData]);

  const dateGroups = groupByDate(logs);
  const exerciseName = logs[0]?.exercise_name ?? '';

  // Crear set de PR weights para marcar cuáles son PR
  const prWeights = new Set(prs.map(pr => `${pr.rep_range}-${pr.weight_kg}`));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="barbell-outline" size={18} color={Colors.neonGreen} />
              <EliteText variant="label" style={styles.title} numberOfLines={1}>
                {exerciseName || 'Historial'}
              </EliteText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* PRs compactos */}
          {prs.length > 0 && (
            <View style={styles.prsRow}>
              <EliteText variant="caption" style={styles.prsLabel}>PRs:</EliteText>
              {prs.slice(0, 5).map((pr) => (
                <View key={pr.id} style={styles.prChip}>
                  <EliteText variant="caption" style={styles.prChipText}>
                    {pr.rep_range}RM: {pr.weight_kg}kg
                  </EliteText>
                </View>
              ))}
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.neonGreen} size="large" />
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EliteText variant="body" style={styles.emptyText}>
                Sin historial para este ejercicio
              </EliteText>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {Array.from(dateGroups.entries()).map(([dateStr, dateLogs]) => (
                <View key={dateStr} style={styles.dateGroup}>
                  {/* Fecha */}
                  <View style={styles.dateHeader}>
                    <View style={styles.dateDot} />
                    <EliteText variant="label" style={styles.dateText}>
                      {formatDate(dateStr)}
                    </EliteText>
                  </View>

                  {/* Sets de ese día */}
                  {dateLogs.map((log) => {
                    const isPR = prWeights.has(`${log.reps}-${log.weight_kg}`);
                    return (
                      <View key={log.id} style={styles.logRow}>
                        <EliteText variant="caption" style={styles.logSetNumber}>
                          Set {log.set_number}:
                        </EliteText>
                        <EliteText variant="body" style={styles.logData}>
                          {log.reps} reps
                          {log.weight_kg ? ` × ${log.weight_kg}kg` : ' (BW)'}
                          {log.rpe ? ` @RPE${log.rpe}` : ''}
                        </EliteText>
                        {isPR && (
                          <View style={styles.prMark}>
                            <EliteText variant="caption" style={styles.prMarkText}>PR</EliteText>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={{ height: Spacing.lg }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    maxHeight: '80%',
    paddingBottom: Spacing.lg,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    color: Colors.neonGreen,
    letterSpacing: 1,
    flex: 1,
  },

  // --- PRs compactos ---
  prsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexWrap: 'wrap',
  },
  prsLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
  },
  prChip: {
    backgroundColor: Colors.neonGreen + '15',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.neonGreen + '30',
  },
  prChipText: {
    color: Colors.neonGreen,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },

  // --- Loading / Empty ---
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
  },

  // --- Contenido ---
  scrollContent: {
    flex: 1,
  },

  // --- Grupo por fecha ---
  dateGroup: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neonGreen,
  },
  dateText: {
    color: Colors.textPrimary,
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // --- Log row ---
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md + Spacing.sm,
    paddingVertical: 3,
    gap: Spacing.xs,
  },
  logSetNumber: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    width: 45,
  },
  logData: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  prMark: {
    backgroundColor: Colors.neonGreen + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  prMarkText: {
    color: Colors.neonGreen,
    fontSize: 8,
    fontFamily: Fonts.bold,
  },
});
