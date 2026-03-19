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
 * Pantalla Mis Programas — Lista de programas creados por el usuario.
 * Muestra EmptyState si no hay programas, o una lista con cards.
 * Cada programa muestra nombre, descripción y cantidad de rutinas.
 */
export default function ProgramsScreen() {
  const router = useRouter();
  const { programs, deleteProgram } = usePrograms();

  // Solo programas del usuario (no estándar)
  const userPrograms = programs.filter(p => !p.isStandard);

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado con botón de regreso */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">MIS PROGRAMAS</EliteText>
      </View>

      {userPrograms.length === 0 ? (
        // Estado vacío — sin programas aún
        <EmptyState
          icon="albums-outline"
          message="No tienes programas aún. Crea uno para organizar tus rutinas."
          actionLabel="CREAR PROGRAMA"
          onAction={() => router.push('/create-program')}
        />
      ) : (
        // Lista de programas
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {userPrograms.map(program => (
            <EliteCard
              key={program.id}
              title={program.name}
              subtitle={`${program.description} · ${program.routines.length} rutina(s)`}
              onPress={() =>
                router.push({
                  pathname: '/create-routine',
                  params: { programId: program.id },
                })
              }
              style={styles.card}
              rightContent={
                <Pressable onPress={() => deleteProgram(program.id)}>
                  <Ionicons name="trash-outline" size={22} color={Colors.textSecondary} />
                </Pressable>
              }
            />
          ))}

          {/* Botón para crear otro programa */}
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
  card: {
    marginBottom: Spacing.sm,
  },
  createButton: {
    marginTop: Spacing.md,
    alignSelf: 'center',
  },
});
