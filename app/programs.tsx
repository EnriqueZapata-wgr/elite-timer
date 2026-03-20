/**
 * Pantalla Mis Programas — Lista de rutinas del usuario (formato engine).
 *
 * Muestra rutinas guardadas con stats en vivo, botón FAB para crear nuevas,
 * y acciones de ejecutar, editar y eliminar en cada rutina.
 *
 * También mantiene compatibilidad con las rutinas legacy del ProgramsContext.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EmptyState } from '@/components/empty-state';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { flattenRoutine, calcRoutineStats, formatTimeHuman } from '@/src/engine';
import type { Routine } from '@/src/engine/types';
import type { RoutineCalcStats } from '@/src/engine/helpers';
import {
  getRoutines,
  deleteRoutine as deleteStoredRoutine,
} from '@/src/utils/routine-storage';

export default function ProgramsScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  // Recargar al volver a la pantalla (por si se guardó algo en el builder)
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [])
  );

  const loadRoutines = async () => {
    const data = await getRoutines();
    setRoutines(data);
    setLoading(false);
  };

  /** Calcular stats de una rutina (con cache implícito via render) */
  const getStats = (routine: Routine): RoutineCalcStats | null => {
    try {
      const steps = flattenRoutine(routine);
      return calcRoutineStats(steps);
    } catch {
      return null;
    }
  };

  /** Ejecutar rutina directamente */
  const playRoutine = (routine: Routine) => {
    router.push({
      pathname: '/execution',
      params: { routine: JSON.stringify(routine) },
    });
  };

  /** Abrir builder para editar */
  const editRoutine = (routine: Routine) => {
    router.push({
      pathname: '/builder',
      params: { routineId: routine.id },
    });
  };

  /** Eliminar con confirmación */
  const handleDelete = (routine: Routine) => {
    Alert.alert(
      'Eliminar rutina',
      `¿Eliminar "${routine.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteStoredRoutine(routine.id);
            loadRoutines();
          },
        },
      ],
    );
  };

  /** Contar bloques hoja recursivamente */
  const countLeafBlocks = (routine: Routine): number => {
    let count = 0;
    const walk = (blocks: Routine['blocks']) => {
      for (const b of blocks) {
        if (b.type === 'group') {
          walk(b.children ?? []);
        } else {
          count++;
        }
      }
    };
    walk(routine.blocks);
    return count;
  };

  const hasContent = routines.length > 0;

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">MIS RUTINAS</EliteText>
      </View>

      {!hasContent && !loading ? (
        <EmptyState
          icon="layers-outline"
          message="No tienes rutinas aún. Crea una con el builder visual."
          actionLabel="CREAR RUTINA"
          onAction={() => router.push('/builder')}
        />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {routines.map(routine => {
            const stats = getStats(routine);
            const leafCount = countLeafBlocks(routine);

            return (
              <Pressable
                key={routine.id}
                onPress={() => editRoutine(routine)}
                onLongPress={() => handleDelete(routine)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                {/* Info principal */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <EliteText variant="subtitle" style={styles.cardTitle} numberOfLines={1}>
                      {routine.name}
                    </EliteText>
                    {routine.category && (
                      <View style={styles.categoryBadge}>
                        <EliteText variant="caption" style={styles.categoryText}>
                          {routine.category}
                        </EliteText>
                      </View>
                    )}
                  </View>

                  {/* Stats compactos */}
                  <View style={styles.cardStats}>
                    {stats && (
                      <>
                        <EliteText variant="caption" style={styles.statText}>
                          {stats.formattedTotal}
                        </EliteText>
                        <EliteText variant="caption" style={styles.statSep}>·</EliteText>
                        <EliteText variant="caption" style={styles.statText}>
                          {leafCount} pasos
                        </EliteText>
                        <EliteText variant="caption" style={styles.statSep}>·</EliteText>
                        <EliteText variant="caption" style={[styles.statText, { color: '#a8e02a' }]}>
                          {Math.round(stats.workRatio * 100)}%W
                        </EliteText>
                        <EliteText variant="caption" style={styles.statSep}>/</EliteText>
                        <EliteText variant="caption" style={[styles.statText, { color: '#5B9BD5' }]}>
                          {Math.round(stats.restRatio * 100)}%R
                        </EliteText>
                      </>
                    )}
                  </View>
                </View>

                {/* Acciones */}
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => playRoutine(routine)}
                    hitSlop={8}
                    style={styles.playBtn}
                  >
                    <Ionicons name="play-circle" size={36} color={Colors.neonGreen} />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}

          {/* Padding inferior */}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* FAB — Botón flotante crear nueva rutina */}
      <Pressable
        onPress={() => router.push('/builder')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="add" size={28} color={Colors.textOnGreen} />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  list: {
    flex: 1,
  },

  // --- Card de rutina ---
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  cardPressed: {
    opacity: 0.7,
    borderColor: Colors.neonGreen,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  categoryText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  statText: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
  },
  statSep: {
    color: Colors.disabled,
    fontSize: 11,
  },
  cardActions: {
    marginLeft: Spacing.md,
  },
  playBtn: {
    padding: Spacing.xs,
  },

  // --- FAB ---
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
