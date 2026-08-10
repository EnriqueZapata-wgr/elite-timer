/**
 * Mi Fitness — Fuerza, Cardio, Movilidad, Récords personales.
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

// MB-3.6: Fuerza y Récords FUSIONADAS (un dato = un lugar); Movilidad
// reactivada — la evaluación real vive en /mobility-assessment (Bloque 2).
const ITEMS = [
  { name: 'Fuerza y récords', subtitle: 'Benchmarks · variantes · todos tus PRs', icon: 'barbell-outline' as const, color: CATEGORY_COLORS.fitness, route: '/fitness-strength' as const },
  { name: 'Cardio', subtitle: 'Sesiones · distancias · tiempos', icon: 'pulse-outline' as const, color: SEMANTIC.error, route: '/fitness-cardio' as const },
  { name: 'Movilidad', subtitle: 'Evalúate · rutinas de movilidad', icon: 'body-outline' as const, color: CATEGORY_COLORS.mind, route: '/mobility-assessment' as const },
  // MB-19 PIEZA 0: el censo las encontró sin puerta. Son features vivas (historial de
  // sesiones desde execution_logs, y resumen mensual con gráficas), no redirects viejos.
  // Su casa es Mi Fitness: las dos leen entrenamientos.
  { name: 'Mi progreso', subtitle: 'Resumen del mes · frecuencia · volumen', icon: 'trending-up-outline' as const, color: ATP_BRAND.teal, route: '/progress' as const },
  { name: 'Historial', subtitle: 'Todas tus sesiones, por fecha', icon: 'time-outline' as const, color: SEMANTIC.info, route: '/history' as const },
];

export default function FitnessMyScreen() {
  const router = useRouter();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: t } = useAppTheme();

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="fitness" title="Mi Fitness" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {ITEMS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(50 + idx * 50).springify()}>
            <AnimatedPressable onPress={() => { haptic.medium(); router.push(item.route); }}>
              <GradientCard color={item.color} style={s.card}>
                <View style={s.row}>
                  <View style={[s.icon, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.name, { color: t.texto }]}>{item.name}</EliteText>
                    <EliteText style={[s.sub, { color: t.textoSecundario }]}>{item.subtitle}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textoTenue} />
                </View>
              </GradientCard>
            </AnimatedPressable>
          </Animated.View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.bold, marginBottom: 2 },
  sub: { fontSize: FontSizes.xs },
});
