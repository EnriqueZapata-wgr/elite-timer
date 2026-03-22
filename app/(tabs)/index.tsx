import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { DashboardCard } from '@/components/dashboard-card';
import { useAuth } from '@/src/contexts/auth-context';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

/**
 * Dashboard — Panel principal con botón hero ENTRENAR + cards de navegación.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atleta';

  return (
    <ScreenContainer centered={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <EliteText variant="title" style={styles.brand}>ELITE</EliteText>
          <EliteText variant="body" style={styles.greeting}>
            Hola, {displayName}
          </EliteText>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Hero — ENTRENAR */}
      <Animated.View entering={FadeInUp.delay(50).springify()}>
        <Pressable
          onPress={() => router.push('/programs')}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient
            colors={['#a8e02a', '#7ab01e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroButton}
          >
            <Ionicons name="flash" size={28} color={Colors.textOnGreen} />
            <EliteText variant="subtitle" style={styles.heroText}>ENTRENAR</EliteText>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Grid principal */}
      <View style={styles.grid}>
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.card}>
          <DashboardCard
            icon="albums-outline"
            title="Mis Rutinas"
            description="Crea y organiza tus rutinas"
            onPress={() => router.push('/programs')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.card}>
          <DashboardCard
            icon="timer-outline"
            title="Programas Estándar"
            description="Tabata, HIIT y más"
            onPress={() => router.push('/standard-programs')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.card}>
          <DashboardCard
            icon="barbell-outline"
            title="Registrar entrenamiento"
            description="Log manual de sets"
            onPress={() => router.push('/log-exercise')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.card}>
          <DashboardCard
            icon="trophy-outline"
            title="Mis marcas personales"
            description="Records de fuerza"
            onPress={() => router.push('/personal-records')}
          />
        </Animated.View>
      </View>

      {/* Próximamente */}
      <View style={styles.comingSoon}>
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.card}>
          <DashboardCard
            icon="calendar-outline"
            title="Programa de Hoy"
            description="Próximamente"
            onPress={() => {}}
            disabled
          />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.card}>
          <DashboardCard
            icon="trending-up-outline"
            title="Mi Progreso"
            description="Próximamente"
            onPress={() => {}}
            disabled
          />
        </Animated.View>
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
    paddingBottom: Spacing.lg,
  },
  headerLeft: { flex: 1 },
  brand: {
    fontSize: FontSizes.xl,
    letterSpacing: 6,
  },
  greeting: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontSize: FontSizes.md,
  },
  settingsButton: { padding: Spacing.sm },

  // Hero
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 80,
    borderRadius: 20,
    marginBottom: Spacing.lg,
  },
  heroText: {
    color: Colors.textOnGreen,
    fontSize: 20,
    fontFamily: Fonts.bold,
    letterSpacing: 4,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  card: { width: '48%' },

  comingSoon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    opacity: 0.4,
  },
});
