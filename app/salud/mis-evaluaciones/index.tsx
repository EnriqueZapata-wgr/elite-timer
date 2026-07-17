/**
 * MIS EVALUACIONES — hub agrupador de cuestionarios y tests (Mega-Sprint B · B4).
 *
 * Doctrina menú puro: solo navegación. Reúne en UN lugar lo que estaba disperso
 * en 4 (quizzes.tsx, historia-clinica, edad-atp/questionnaires, edad-atp/tests).
 *
 * ⚠️ B4 es SOLO el hub agrupador. El Cuestionario Maestro (13 dimensiones ·
 * task #107) se implementa en su propio mega-sprint — aquí solo un slot
 * "próximamente". NO se rediseña el contenido de los cuestionarios todavía.
 */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { TEXT_COLORS, TEXT, withOpacity } from '@/src/constants/brand';

type Eval = { key: string; title: string; blurb: string; icon: string; color: string; route: string };

// Evaluaciones que YA existen (intocadas · B4 solo las agrupa).
const EVALUACIONES: Eval[] = [
  { key: 'braverman', title: 'Test de Braverman', blurb: 'Perfil de neurotransmisores (dopamina · acetilcolina · GABA · serotonina)', icon: 'flash-outline', color: '#c084fc', route: '/braverman' },
  { key: 'cronotipo', title: 'Cronotipo', blurb: 'León · Oso · Lobo — tu ritmo circadiano y horarios óptimos', icon: 'sunny-outline', color: '#fbbf24', route: '/quiz/chronotype' },
  { key: 'fitzpatrick', title: 'Tipo de piel (Fitzpatrick)', blurb: 'Tu fototipo — determina tu tiempo de exposición solar segura', icon: 'color-palette-outline', color: '#fb923c', route: '/historia-clinica/fitzpatrick' },
  { key: 'funcionales', title: 'Cuestionarios funcionales', blurb: 'Evaluaciones por área — sueño, digestión, hormonal, inflamación y más', icon: 'clipboard-outline', color: '#5B9BD5', route: '/quizzes' },
  { key: 'cognitivo', title: 'Test cognitivo', blurb: 'Tiempo de reacción y agilidad mental', icon: 'bulb-outline', color: '#7F77DD', route: '/edad-atp/cognitive' },
  { key: 'cinematicas', title: 'Pruebas cinemáticas', blurb: 'Plank · BOLT · Old Man Test · Recovery HR', icon: 'body-outline', color: '#22D3EE', route: '/edad-atp/cinematic-tests-index' },
];

export default function MisEvaluacionesScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Mis Evaluaciones" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Todos tus cuestionarios y pruebas en un solo lugar. Alimentan tu diagnóstico funcional.
          </EliteText>
        </Animated.View>

        {/* Mega-Sprint D: Cuestionario Maestro destacado (mapa y brújula de ATP). */}
        <Animated.View entering={FadeInUp.delay(60).springify()}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/salud/cuestionario-maestro' as any); }} style={s.masterCard}>
            <View style={s.cardRow}>
              <View style={[s.iconWrap, { backgroundColor: withOpacity('#A8E02A', 0.15) }]}>
                <Ionicons name="sparkles" size={22} color="#A8E02A" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.masterTitle}>Cuestionario Maestro ATP</EliteText>
                <EliteText variant="caption" style={s.cardBlurb}>
                  Tu mapa y brújula: levanta tu fenotipo epigenético completo y prescribe tus 5 intervenciones.
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A8E02A" />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {EVALUACIONES.map((e, idx) => (
          <Animated.View key={e.key} entering={FadeInUp.delay(80 + idx * 45).springify()}>
            <AnimatedPressable onPress={() => { haptic.medium(); router.push(e.route as any); }}>
              <GradientCard color={e.color} style={s.card}>
                <View style={s.cardRow}>
                  <View style={[s.iconWrap, { backgroundColor: withOpacity(e.color, 0.15) }]}>
                    <Ionicons name={e.icon as any} size={22} color={e.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.cardTitle}>{e.title}</EliteText>
                    <EliteText variant="caption" style={s.cardBlurb}>{e.blurb}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
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
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg, marginTop: Spacing.xs, fontFamily: Fonts.regular },
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary, marginBottom: 2 },
  cardBlurb: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, lineHeight: 16 },
  // Mega-Sprint D: Cuestionario Maestro destacado (lime-acentuado).
  masterCard: {
    backgroundColor: withOpacity('#A8E02A', 0.06), borderWidth: 1, borderColor: withOpacity('#A8E02A', 0.35),
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  masterTitle: { fontSize: FontSizes.md, fontFamily: Fonts.extraBold, color: '#A8E02A', marginBottom: 2 },
});
