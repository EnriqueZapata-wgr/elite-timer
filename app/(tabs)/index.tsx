import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { DashboardCard } from '@/components/dashboard-card';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Pantalla Home / Dashboard — Panel principal con 4 cards de navegación.
 */
export default function DashboardScreen() {
  const router = useRouter();

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado con marca y saludo */}
      <View style={styles.header}>
        <EliteText variant="title">ELITE</EliteText>
        <EliteText variant="body" style={styles.subtitle}>
          Bienvenido, coach
        </EliteText>
      </View>

      {/* Grid de cards 2×2 */}
      <View style={styles.grid}>
        <DashboardCard
          icon="albums-outline"
          title="Mis Programas"
          description="Crea y organiza tus rutinas"
          onPress={() => router.push('/programs')}
          style={styles.card}
        />

        <DashboardCard
          icon="calendar-outline"
          title="Programa de Hoy"
          description="Tu rutina del día"
          onPress={() => {}}
          disabled
          style={styles.card}
        />

        <DashboardCard
          icon="trending-up-outline"
          title="Mi Progreso"
          description="Historial y estadísticas"
          onPress={() => {}}
          disabled
          style={styles.card}
        />

        <DashboardCard
          icon="timer-outline"
          title="Programas Estándar"
          description="Tabata, HIIT y más"
          onPress={() => router.push('/standard-programs')}
          style={styles.card}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  card: {
    width: '48%',
  },
});
