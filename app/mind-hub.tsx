/**
 * Mind Hub — Punto de entrada para Meditación, Respiración y Journaling.
 */
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/GradientCard';
import { MEDITATION_LIBRARY } from '@/src/data/meditation-library';
import { BREATHING_LIBRARY } from '@/src/data/breathing-library';
import { Colors, Spacing, Fonts, Radius } from '@/constants/theme';

const PURPLE = '#7F77DD';

export default function MindHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={28} color={PURPLE} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText style={styles.title}>MENTE</EliteText>
          <EliteText variant="caption" style={styles.subtitle}>
            Meditación, respiración y más
          </EliteText>
        </Animated.View>

        {/* Meditación */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <GradientCard color={PURPLE} onPress={() => router.push('/meditation')} style={styles.heroCard}>
            <View style={styles.heroCardBody}>
              <Ionicons name="sparkles-outline" size={28} color={PURPLE} />
              <View style={styles.heroCardInfo}>
                <EliteText variant="body" style={styles.heroCardTitle}>Meditación</EliteText>
                <EliteText variant="caption" style={styles.heroCardDesc}>
                  {MEDITATION_LIBRARY.length} sesiones guiadas · 3-20 min
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </View>
          </GradientCard>
        </Animated.View>

        {/* Respiración */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <GradientCard color={PURPLE} onPress={() => router.push('/breathing')} style={styles.heroCard}>
            <View style={styles.heroCardBody}>
              <Ionicons name="leaf-outline" size={28} color={PURPLE} />
              <View style={styles.heroCardInfo}>
                <EliteText variant="body" style={styles.heroCardTitle}>Respiración</EliteText>
                <EliteText variant="caption" style={styles.heroCardDesc}>
                  {BREATHING_LIBRARY.length} ejercicios · 3-5 min
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </View>
          </GradientCard>
        </Animated.View>

        {/* Check-in emocional */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <GradientCard color={PURPLE} onPress={() => router.push('/checkin')} style={styles.heroCard}>
            <View style={styles.heroCardBody}>
              <Ionicons name="heart-circle-outline" size={28} color={PURPLE} />
              <View style={styles.heroCardInfo}>
                <EliteText variant="body" style={[styles.heroCardTitle, { color: PURPLE }]}>Check-in emocional</EliteText>
                <EliteText variant="caption" style={styles.heroCardDesc}>
                  ¿Cómo te sientes ahora? · 30 segundos
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </View>
          </GradientCard>
        </Animated.View>

        {/* Journaling (próximamente) */}
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <View style={[styles.heroCardPlaceholder, { opacity: 0.4 }]}>
            <Ionicons name="journal-outline" size={28} color={PURPLE} />
            <View style={styles.heroCardInfo}>
              <EliteText variant="body" style={styles.heroCardTitle}>Journaling</EliteText>
              <EliteText variant="caption" style={styles.heroCardDesc}>
                Próximamente · Reflexión y gratitud
              </EliteText>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  backBtn: {
    position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm,
  },
  content: {
    paddingTop: Spacing.xxl + Spacing.lg, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: 32, fontFamily: Fonts.extraBold, color: PURPLE, letterSpacing: 4, marginBottom: Spacing.xs,
  },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.lg, fontSize: 14 },
  heroCard: { marginBottom: Spacing.sm },
  heroCardBody: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md,
  },
  heroCardInfo: { flex: 1 },
  heroCardTitle: { fontFamily: Fonts.bold, fontSize: 18, color: PURPLE },
  heroCardDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  heroCardPlaceholder: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md,
    backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#222',
  },
});
