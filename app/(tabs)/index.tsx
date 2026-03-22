import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { DashboardCard } from '@/components/dashboard-card';
import { useAuth } from '@/src/contexts/auth-context';
import { Colors, Spacing, Radius } from '@/constants/theme';

/**
 * Pantalla Home / Dashboard — Panel principal con 4 cards de navegación.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atleta';

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado con marca + engranaje */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <EliteText variant="title">ELITE</EliteText>
          <EliteText variant="body" style={styles.subtitle}>
            Hola, {displayName}
          </EliteText>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Botón principal — ENTRENAR */}
      <Pressable
        onPress={() => router.push('/programs')}
        style={({ pressed }) => [styles.trainButton, pressed && { opacity: 0.8 }]}
      >
        <Ionicons name="flash" size={24} color={Colors.textOnGreen} />
        <EliteText variant="subtitle" style={styles.trainButtonText}>ENTRENAR</EliteText>
      </Pressable>

      {/* Grid de cards 2×2 */}
      <View style={styles.grid}>
        <DashboardCard
          icon="albums-outline"
          title="Mis Rutinas"
          description="Crea y organiza tus rutinas"
          onPress={() => router.push('/programs')}
          style={styles.card}
        />

        <DashboardCard
          icon="timer-outline"
          title="Programas Estándar"
          description="Tabata, HIIT y más"
          onPress={() => router.push('/standard-programs')}
          style={styles.card}
        />

        <DashboardCard
          icon="barbell-outline"
          title="Registrar entrenamiento"
          description="Log manual de sets"
          onPress={() => router.push('/log-exercise')}
          style={styles.card}
        />

        <DashboardCard
          icon="trophy-outline"
          title="Mis marcas personales"
          description="Records de fuerza"
          onPress={() => router.push('/personal-records')}
          style={styles.card}
        />
      </View>

      {/* Cards próximamente — sutiles al final */}
      <View style={styles.comingSoonSection}>
        <DashboardCard
          icon="calendar-outline"
          title="Programa de Hoy"
          description="Próximamente"
          onPress={() => {}}
          disabled
          style={styles.card}
        />
        <DashboardCard
          icon="trending-up-outline"
          title="Mi Progreso"
          description="Próximamente"
          onPress={() => {}}
          disabled
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
  trainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neonGreen,
    height: 60,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  trainButtonText: {
    color: Colors.textOnGreen,
    fontSize: 18,
    letterSpacing: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  comingSoonSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    opacity: 0.5,
  },
  card: {
    width: '48%',
  },
});
