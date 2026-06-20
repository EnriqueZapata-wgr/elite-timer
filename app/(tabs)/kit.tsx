/**
 * Mi ATP — portal de navegación con 2 frentes top-level.
 *
 * Arquitectura (Session 2 addendum):
 *   Mi ATP
 *   ├── HISTORIA CLÍNICA → /health-hub (expediente vivo)
 *   └── HÁBITOS          → /habits-portal (sub-portal con 4 sub-cards)
 *
 * La ruta sigue siendo /kit (no se renombra el archivo para no romper
 * historial/links); solo el label visible es "Mi ATP".
 */
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ElectronBadge } from '@/src/components/ui/ElectronBadge';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

const FRONTS = [
  {
    id: 'historia',
    title: 'HISTORIA CLÍNICA',
    subtitle: 'Tu expediente vivo: labs, tests, biomarcadores',
    icon: 'pulse-outline' as const,
    color: '#1D9E75',
    route: '/health-hub',
  },
  {
    id: 'habitos',
    title: 'HÁBITOS',
    subtitle: 'Tu práctica diaria: nutrición, fitness y más',
    icon: 'repeat-outline' as const,
    color: '#7F77DD',
    route: '/habits-portal',
  },
  {
    // M2: acceso directo a ATP MI SALUD (antes solo se entraba mal-ruteado desde Historia Clínica).
    id: 'misalud',
    title: 'ATP MI SALUD',
    subtitle: 'Tu panel funcional: corazón, glucosa, biomarcadores',
    icon: 'heart-outline' as const,
    color: '#38bdf8',
    route: '/my-health',
  },
];

export default function KitScreen() {
  const router = useRouter();

  return (
    <TabScreen>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.title}>Mi ATP</Text>
            <ElectronBadge />
          </View>
          <View style={s.subtitleRow}>
            <Text style={s.subtitleGreen}>TU ECOSISTEMA</Text>
          </View>
          <Text style={s.subtitleMain}>Tus frentes</Text>
        </Animated.View>

        {/* N2: card de ARGOS eliminada de Mi ATP — ARGOS pasa al menú inferior (Parte 8).
            argos-chat sigue funcional (FAB actual / 5to tab). */}

        {/* Frentes top-level */}
        {FRONTS.map((front, idx) => (
          <Animated.View key={front.id} entering={FadeInUp.delay(100 + idx * 50).springify()} style={s.cardWrap}>
            <AnimatedPressable onPress={() => { haptic.medium(); router.push(front.route as any); }}>
              <LinearGradient
                colors={[`${front.color}14`, `${front.color}05`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.card}
              >
                {/* Barra de acento */}
                <View style={[s.accent, { backgroundColor: front.color }]} />

                <View style={s.cardInner}>
                  <View style={s.cardLeft}>
                    {/* Icono en circulo */}
                    <View style={[s.iconCircle, { backgroundColor: `${front.color}15` }]}>
                      <Ionicons name={front.icon} size={28} color={front.color} />
                    </View>

                    {/* Texto */}
                    <View>
                      <Text style={s.cardTitle}>{front.title}</Text>
                      <Text style={s.cardSub}>{front.subtitle}</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
                </View>
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </TabScreen>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.md,
  },

  // Header
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    letterSpacing: 2,
  },
  subtitleRow: {
    marginTop: 4,
  },
  subtitleGreen: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#a8e02a',
    letterSpacing: 3,
  },
  subtitleMain: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginTop: 2,
  },

  // Cards
  cardWrap: {
    marginBottom: 12,
  },
  card: {
    height: 120,
    borderRadius: 16,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
});
