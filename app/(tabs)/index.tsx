import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { DashboardCard } from '@/components/dashboard-card';
import { useAuth } from '@/src/contexts/auth-context';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Pantalla Home / Dashboard — Panel principal con 4 cards de navegación.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || 'coach';

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado con marca + engranaje */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <EliteText variant="title">ELITE</EliteText>
          <EliteText variant="body" style={styles.subtitle}>
            Bienvenido, {displayName}
          </EliteText>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
        </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  settingsButton: {
    padding: Spacing.sm,
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
