import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteCard } from '@/components/elite-card';
import { EliteButton } from '@/components/elite-button';
import { EmptyState } from '@/components/empty-state';
import { usePrograms } from '@/contexts/programs-context';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Pantalla Mis Programas — Lista de programas y rutinas del usuario.
 *
 * Cada programa muestra sus rutinas con botón Play para ejecutarlas.
 * Las rutinas sin programa aparecen en una sección "Rutinas Sueltas".
 */
export default function ProgramsScreen() {
  const router = useRouter();
  const { programs, routines, getRoutinesForProgram, deleteProgram, deleteRoutine } = usePrograms();

  // Programas del usuario (no estándar)
  const userPrograms = programs.filter(p => !p.isStandard);

  // Rutinas que no pertenecen a ningún programa
  const assignedIds = new Set(userPrograms.flatMap(p => p.routineIds || []));
  const looseRoutines = routines.filter(r => !assignedIds.has(r.id));

  const hasContent = userPrograms.length > 0 || looseRoutines.length > 0;

  /** Navegar al timer activo con una rutina */
  const playRoutine = (routineId: string, programName: string) => {
    router.push({
      pathname: '/active-timer',
      params: { routineId, programName },
    });
  };

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">MIS PROGRAMAS</EliteText>
      </View>

      {!hasContent ? (
        <EmptyState
          icon="albums-outline"
          message="No tienes programas aún. Crea uno para organizar tus rutinas."
          actionLabel="CREAR PROGRAMA"
          onAction={() => router.push('/create-program')}
        />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {/* Programas del usuario con sus rutinas */}
          {userPrograms.map(program => {
            const programRoutines = getRoutinesForProgram(program.id);
            return (
              <View key={program.id} style={styles.programSection}>
                {/* Header del programa */}
                <View style={styles.programHeader}>
                  <View style={styles.programInfo}>
                    <EliteText variant="subtitle">{program.name}</EliteText>
                    <EliteText variant="caption">{program.description}</EliteText>
                  </View>
                  <Pressable onPress={() => deleteProgram(program.id)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Rutinas del programa */}
                {programRoutines.length === 0 ? (
                  <EliteText variant="caption" style={styles.emptyRoutines}>
                    Sin rutinas aún
                  </EliteText>
                ) : (
                  programRoutines.map(routine => (
                    <EliteCard
                      key={routine.id}
                      title={routine.name}
                      subtitle={`${routine.blocks.length} bloques · ${routine.rounds} ronda(s)`}
                      onPress={() => playRoutine(routine.id, program.name)}
                      style={styles.routineCard}
                      rightContent={
                        <Ionicons name="play-circle" size={32} color={Colors.neonGreen} />
                      }
                    />
                  ))
                )}

                {/* Agregar rutina al programa */}
                <Pressable
                  onPress={() => router.push({
                    pathname: '/create-routine',
                    params: { programId: program.id },
                  })}
                  style={styles.addRoutineButton}
                >
                  <Ionicons name="add" size={18} color={Colors.neonGreen} />
                  <EliteText variant="caption" style={styles.addRoutineText}>
                    Agregar rutina
                  </EliteText>
                </Pressable>
              </View>
            );
          })}

          {/* Rutinas sueltas (sin programa) */}
          {looseRoutines.length > 0 && (
            <View style={styles.programSection}>
              <EliteText variant="label" style={styles.sectionLabel}>
                RUTINAS SUELTAS
              </EliteText>
              {looseRoutines.map(routine => (
                <EliteCard
                  key={routine.id}
                  title={routine.name}
                  subtitle={`${routine.blocks.length} bloques · ${routine.rounds} ronda(s)`}
                  onPress={() => playRoutine(routine.id, 'Personalizado')}
                  style={styles.routineCard}
                  rightContent={
                    <View style={styles.routineActions}>
                      <Pressable onPress={() => playRoutine(routine.id, 'Personalizado')}>
                        <Ionicons name="play-circle" size={32} color={Colors.neonGreen} />
                      </Pressable>
                      <Pressable onPress={() => deleteRoutine(routine.id)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.textSecondary} />
                      </Pressable>
                    </View>
                  }
                />
              ))}
            </View>
          )}

          {/* Botón crear programa */}
          <EliteButton
            label="CREAR PROGRAMA"
            onPress={() => router.push('/create-program')}
            variant="outline"
            style={styles.createButton}
          />
        </ScrollView>
      )}
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
  // Sección de programa
  programSection: {
    marginBottom: Spacing.lg,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  programInfo: {
    flex: 1,
  },
  emptyRoutines: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  routineCard: {
    marginBottom: Spacing.xs,
  },
  addRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  addRoutineText: {
    color: Colors.neonGreen,
  },
  sectionLabel: {
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  routineActions: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  createButton: {
    marginTop: Spacing.md,
    alignSelf: 'center',
    marginBottom: Spacing.xxl,
  },
  card: {
    marginBottom: Spacing.sm,
  },
});
