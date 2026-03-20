import { ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteCard } from '@/components/elite-card';
import { STANDARD_PROGRAMS, STANDARD_ROUTINES } from '@/constants/standard-programs';
import { convertLegacyRoutine } from '@/src/engine/convertLegacy';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Pantalla Programas Estándar — Lista de programas predefinidos.
 * Tabata, HIIT, Quick timers y opción personalizada.
 * Tap en un programa → navega al Timer Activo con esa rutina.
 */
export default function StandardProgramsScreen() {
  const router = useRouter();

  /** Formatea segundos a "Xm" o "Xs" */
  const formatDuration = (seconds: number): string => {
    if (seconds >= 60) return `${Math.floor(seconds / 60)}min`;
    return `${seconds}s`;
  };

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">PROGRAMAS ESTÁNDAR</EliteText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Programas predefinidos */}
        {STANDARD_PROGRAMS.map(program => {
          const routine = STANDARD_ROUTINES[program.routineId];
          return (
          <EliteCard
            key={program.id}
            title={program.name}
            subtitle={`${program.description} · ${formatDuration(routine.totalDuration)}`}
            onPress={() => {
              const engineRoutine = convertLegacyRoutine(routine);
              router.push({
                pathname: '/execution',
                params: { routine: JSON.stringify(engineRoutine) },
              });
            }}
            style={styles.card}
            rightContent={
              <Ionicons name="play-circle" size={36} color={Colors.neonGreen} />
            }
          />
          );
        })}

        {/* Opción personalizada */}
        <EliteCard
          title="Personalizado"
          subtitle="Crea tu propia rutina desde cero"
          onPress={() => router.push('/create-routine')}
          style={styles.card}
          rightContent={
            <Ionicons name="add-circle" size={36} color={Colors.neonGreen} />
          }
        />
      </ScrollView>
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
  card: {
    marginBottom: Spacing.sm,
  },
});
