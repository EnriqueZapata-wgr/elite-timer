import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { DashboardCard } from '@/components/dashboard-card';
import { Colors, Spacing, Radius } from '@/constants/theme';

/**
 * Pantalla Home / Dashboard — Panel principal con 4 cards de navegación.
 *
 * Cards:
 * 1. Mis Programas — crear y organizar rutinas (próximamente)
 * 2. Programa de Hoy — rutina del día (próximamente)
 * 3. Mi Progreso — historial y estadísticas (próximamente)
 * 4. Programas Estándar — timers predefinidos (activo → navega al Timer)
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

      {/* DEV: Botones de prueba del engine */}
      <View style={styles.devSection}>
        <EliteText variant="label" style={styles.devLabel}>
          PROBAR ENGINE
        </EliteText>
        <View style={styles.devButtons}>
          <Pressable
            style={styles.devButton}
            onPress={() => router.push({ pathname: '/execution', params: { testId: 'tabata' } })}
          >
            <Ionicons name="flash" size={20} color={Colors.neonGreen} />
            <EliteText variant="body" style={styles.devButtonText}>Tabata</EliteText>
            <EliteText variant="caption" style={styles.devButtonSub}>4:00 · 16 steps</EliteText>
          </Pressable>

          <Pressable
            style={styles.devButton}
            onPress={() => router.push({ pathname: '/execution', params: { testId: 'guinness' } })}
          >
            <Ionicons name="trophy" size={20} color={Colors.neonGreen} />
            <EliteText variant="body" style={styles.devButtonText}>Guinness</EliteText>
            <EliteText variant="caption" style={styles.devButtonSub}>1:07:56 · 239 steps</EliteText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Encabezado — espacio superior generoso, separación inferior del grid
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  // Subtítulo — gris secundario para contraste con el título verde
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  // Grid 2×2 — flexWrap con espacio entre filas
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  // Card individual — ocupa ~48% del ancho para dejar gap entre columnas
  card: {
    width: '48%',
  },
  // DEV: sección de pruebas del engine
  devSection: {
    marginTop: Spacing.xl,
    width: '100%',
  },
  devLabel: {
    letterSpacing: 3,
    color: Colors.neonGreen,
    marginBottom: Spacing.sm,
  },
  devButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  devButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neonGreen,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  devButtonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  devButtonSub: {
    color: Colors.textSecondary,
  },
});
