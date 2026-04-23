/**
 * Kit — 6 pilares ATP como portal de navegacion.
 *
 * Cada card es un gradiente sutil del color del pilar con icono,
 * titulo, subtitulo y chevron. Tap → navega al hub de cada pilar.
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

const PILLARS = [
  {
    id: 'fitness',
    title: 'ATP FITNESS',
    subtitle: 'Fuerza · Cardio · Movilidad · HIIT',
    icon: 'barbell-outline' as const,
    color: '#a8e02a',
    route: '/fitness-hub',
  },
  {
    id: 'nutrition',
    title: 'ATP NUTRICIÓN',
    subtitle: 'Comidas · Ayuno · Hidratación',
    icon: 'restaurant-outline' as const,
    color: '#38bdf8',
    route: '/nutrition',
  },
  {
    id: 'mind',
    title: 'ATP MENTE',
    subtitle: 'Journal · Respiración · Meditación',
    icon: 'flower-outline' as const,
    color: '#c084fc',
    route: '/mind-hub',
  },
  {
    id: 'health',
    title: 'ATP SALUD',
    subtitle: 'Labs · Métricas · Diagnósticos',
    icon: 'heart-outline' as const,
    color: '#f472b6',
    route: '/my-health',
  },
  {
    id: 'cycle',
    title: 'ATP CICLO',
    subtitle: 'Calendario · Síntomas · Reportes',
    icon: 'calendar-outline' as const,
    color: '#fb7185',
    route: '/cycle',
  },
  {
    id: 'tests',
    title: 'ATP TESTS',
    subtitle: 'Evaluaciones · Quizzes · Score',
    icon: 'clipboard-outline' as const,
    color: '#fbbf24',
    route: '/quizzes',
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
            <Text style={s.title}>KIT</Text>
            <ElectronBadge />
          </View>
          <View style={s.subtitleRow}>
            <Text style={s.subtitleGreen}>TU ECOSISTEMA</Text>
          </View>
          <Text style={s.subtitleMain}>Explora tus pilares</Text>
        </Animated.View>

        {/* ARGOS card */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={s.cardWrap}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/argos-chat'); }}>
            <LinearGradient
              colors={['rgba(168,224,42,0.12)', 'rgba(168,224,42,0.03)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.card, { borderColor: 'rgba(168,224,42,0.15)' }]}
            >
              <View style={[s.accent, { backgroundColor: '#a8e02a' }]} />
              <View style={s.cardInner}>
                <View style={s.cardLeft}>
                  <View style={[s.iconCircle, { backgroundColor: 'rgba(168,224,42,0.15)' }]}>
                    <Ionicons name="eye-outline" size={28} color="#a8e02a" />
                  </View>
                  <View>
                    <Text style={s.cardTitle}>ARGOS</Text>
                    <Text style={s.cardSub}>Tu IA de salud funcional</Text>
                  </View>
                </View>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#a8e02a" />
              </View>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        {/* Braverman card */}
        <Animated.View entering={FadeInUp.delay(90).springify()} style={s.cardWrap}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/braverman' as any); }}>
            <LinearGradient
              colors={['rgba(192,132,252,0.12)', 'rgba(192,132,252,0.03)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.card, { borderColor: 'rgba(192,132,252,0.15)' }]}
            >
              <View style={[s.accent, { backgroundColor: '#c084fc' }]} />
              <View style={s.cardInner}>
                <View style={s.cardLeft}>
                  <View style={[s.iconCircle, { backgroundColor: 'rgba(192,132,252,0.15)' }]}>
                    <Text style={{ fontSize: 22 }}>🧬</Text>
                  </View>
                  <View>
                    <Text style={s.cardTitle}>BRAVERMAN</Text>
                    <Text style={s.cardSub}>Test de neurotransmisores</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
              </View>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        {/* Configurar protocolo */}
        <Animated.View entering={FadeInUp.delay(92).springify()} style={s.cardWrap}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/protocol-config' as any); }}>
            <LinearGradient
              colors={['rgba(168,224,42,0.10)', 'rgba(168,224,42,0.02)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.card, { borderColor: 'rgba(168,224,42,0.12)' }]}
            >
              <View style={[s.accent, { backgroundColor: '#a8e02a' }]} />
              <View style={s.cardInner}>
                <View style={s.cardLeft}>
                  <View style={[s.iconCircle, { backgroundColor: 'rgba(168,224,42,0.12)' }]}>
                    <Ionicons name="options-outline" size={28} color="#a8e02a" />
                  </View>
                  <View>
                    <Text style={s.cardTitle}>CONFIGURAR</Text>
                    <Text style={s.cardSub}>Electrones · Metas · Protocolo</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
              </View>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        {/* Suplementos card */}
        <Animated.View entering={FadeInUp.delay(95).springify()} style={s.cardWrap}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/supplements' as any); }}>
            <LinearGradient
              colors={['rgba(29,158,117,0.12)', 'rgba(29,158,117,0.03)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.card, { borderColor: 'rgba(29,158,117,0.15)' }]}
            >
              <View style={[s.accent, { backgroundColor: '#1D9E75' }]} />
              <View style={s.cardInner}>
                <View style={s.cardLeft}>
                  <View style={[s.iconCircle, { backgroundColor: 'rgba(29,158,117,0.15)' }]}>
                    <Ionicons name="flask-outline" size={28} color="#1D9E75" />
                  </View>
                  <View>
                    <Text style={s.cardTitle}>SUPLEMENTOS</Text>
                    <Text style={s.cardSub}>Tu plan diario personalizado</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
              </View>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

        {/* 6 pillar cards */}
        {PILLARS.map((pillar, idx) => (
          <Animated.View key={pillar.id} entering={FadeInUp.delay(100 + idx * 50).springify()} style={s.cardWrap}>
            <AnimatedPressable onPress={() => { haptic.medium(); router.push(pillar.route as any); }}>
              <LinearGradient
                colors={[`${pillar.color}14`, `${pillar.color}05`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.card}
              >
                {/* Barra de acento */}
                <View style={[s.accent, { backgroundColor: pillar.color }]} />

                <View style={s.cardInner}>
                  <View style={s.cardLeft}>
                    {/* Icono en circulo */}
                    <View style={[s.iconCircle, { backgroundColor: `${pillar.color}15` }]}>
                      <Ionicons name={pillar.icon} size={28} color={pillar.color} />
                    </View>

                    {/* Texto */}
                    <View>
                      <Text style={s.cardTitle}>{pillar.title}</Text>
                      <Text style={s.cardSub}>{pillar.subtitle}</Text>
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
