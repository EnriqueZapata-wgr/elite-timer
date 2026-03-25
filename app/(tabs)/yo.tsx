/**
 * Yo — "¿Cómo voy?" Grid de categorías de bienestar.
 *
 * Cada card navega al detalle de esa categoría.
 * Fitness es la única activa por ahora, las demás son "Próximamente".
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { getWeeklyStats, type WeeklyStats } from '@/src/services/exercise-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';

// === CATEGORÍAS ===

interface Category {
  key: string;
  label: string;
  icon: string;
  color: string;
  active: boolean;
}

const CATEGORIES: Category[] = [
  { key: 'fitness', label: 'Fitness', icon: 'barbell-outline', color: '#a8e02a', active: true },
  { key: 'nutrition', label: 'Nutrición', icon: 'restaurant-outline', color: '#5B9BD5', active: false },
  { key: 'mind', label: 'Mente', icon: 'sparkles-outline', color: '#7F77DD', active: false },
  { key: 'optimization', label: 'Optimización', icon: 'flask-outline', color: '#EF9F27', active: false },
  { key: 'metrics', label: 'Métricas', icon: 'analytics-outline', color: '#1D9E75', active: false },
  { key: 'rest', label: 'Descanso', icon: 'moon-outline', color: '#E0E0E0', active: false },
];

// === COMPONENTE ===

export default function YoScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [weekStats, setWeekStats] = useState<WeeklyStats>({
    workouts: 0, totalSeconds: 0, volumeKg: 0, prs: 0,
  });

  useFocusEffect(
    useCallback(() => {
      getWeeklyStats().then(setWeekStats).catch(() => {});
    }, [])
  );

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atleta';

  const getSubtitle = (cat: Category): string => {
    if (cat.key === 'fitness') {
      return `${weekStats.workouts} sesion${weekStats.workouts !== 1 ? 'es' : ''} esta semana`;
    }
    return 'Próximamente';
  };

  const handleCardPress = (cat: Category) => {
    if (cat.key === 'fitness') {
      router.push('/personal-records');
    } else {
      Alert.alert(cat.label, 'Próximamente');
    }
  };

  return (
    <ScreenContainer centered={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={styles.header}>
            <View>
              <EliteText style={styles.title}>YO</EliteText>
              <EliteText variant="body" style={styles.userName}>{userName}</EliteText>
              <EliteText variant="caption" style={styles.score}>ATP Score: --</EliteText>
            </View>
            <AnimatedPressable onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ── Grid de categorías ── */}
        <View style={styles.grid}>
          {CATEGORIES.map((cat, idx) => (
            <Animated.View
              key={cat.key}
              entering={FadeInUp.delay(100 + idx * 50).springify()}
              style={styles.gridItem}
            >
              <GradientCard
                color={cat.color}
                onPress={() => handleCardPress(cat)}
                style={[styles.card, !cat.active && styles.cardInactive]}
              >
                <View style={styles.cardBody}>
                  <View style={styles.cardIconRow}>
                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                    {!cat.active && (
                      <View style={styles.comingSoonBadge}>
                        <EliteText variant="caption" style={styles.comingSoonText}>PRONTO</EliteText>
                      </View>
                    )}
                  </View>
                  <EliteText variant="body" style={[styles.cardLabel, { color: cat.color }]}>
                    {cat.label}
                  </EliteText>
                  <EliteText variant="caption" style={[
                    styles.cardSubtitle,
                    cat.active && { color: cat.color },
                  ]}>
                    {getSubtitle(cat)}
                  </EliteText>
                </View>

                {cat.active && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={styles.cardChevron} />
                )}
              </GradientCard>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    color: Colors.neonGreen,
    letterSpacing: 4,
  },
  userName: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  score: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  settingsBtn: { padding: Spacing.sm },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },
  card: {
    minHeight: 110,
  },
  cardInactive: {
    opacity: 0.5,
  },
  cardBody: {
    padding: 20,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  cardLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  cardChevron: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  comingSoonBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  comingSoonText: {
    color: '#666',
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
});
