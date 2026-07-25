/**
 * Entrenar (MB-3.5 #7) — UNA acción primaria + grupo secundario chico.
 *
 * Antes: 7 destinos de peso igual (generador, ARGOS hero, mis rutinas, builder,
 * timer, HIIT, log suelto) — "varias cosas mandan a lo mismo". Simple beats smart:
 *  · Primaria: EMPEZAR SESIÓN DE HOY → generador determinista (la base gratis).
 *  · Secundarias: Mis rutinas · Construir · HIIT y timers · Registrar suelto.
 *  · ARGOS ya no es puerta hermana del generador — vive DENTRO del resultado
 *    ("ARGOS, ajústala"): el algoritmo arma el esqueleto, ARGOS es capa premium.
 *  · Timer rápido retirado como destino (duplicaba a HIIT, que trae Tabata/EMOM/
 *    AMRAP/30-30 con voz); /timer sigue ruteado para deep-links.
 */
import { View, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, withOpacity } from '@/src/constants/brand';

const SECUNDARIOS = [
  { name: 'Mis rutinas', subtitle: 'Rutinas guardadas listas para ejecutar', icon: 'list-outline' as const, color: '#a8e02a', route: '/my-routines' as const },
  { name: 'Construir rutina', subtitle: 'Crea tu rutina desde cero', icon: 'construct-outline' as const, color: '#60a5fa', route: '/builder' as const, params: { mode: 'routine' } },
  { name: 'HIIT y timers', subtitle: 'Tabata · EMOM · AMRAP · 30/30 con voz', icon: 'flame-outline' as const, color: '#fb7185', route: '/fitness-hiit' as const },
  { name: 'Registrar ejercicio', subtitle: 'Loguea sets, reps y peso', icon: 'add-circle-outline' as const, color: '#34d399', route: '/log-exercise' as const },
];

export default function FitnessTrainScreen() {
  const router = useRouter();

  function nav(item: typeof SECUNDARIOS[number]) {
    haptic.medium();
    if (item.params) {
      router.push({ pathname: item.route, params: item.params });
    } else {
      router.push(item.route);
    }
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Entrenar" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* LA acción primaria: sesión de hoy (molde editorial, protagonista) */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/routine-generator'); }}>
            <ImageBackground
              source={require('@/assets/images/agenda/entrenar/entrenar-02.png')}
              style={s.heroCard}
              imageStyle={s.heroImg}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.5)', 'rgba(10,10,10,0.95)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.heroInner}>
                <EliteText style={s.heroKicker}>OBJETIVO + EQUIPO + TIEMPO</EliteText>
                <EliteText style={s.heroTitle}>EMPEZAR SESIÓN DE HOY</EliteText>
                <View style={s.heroCtaRow}>
                  <EliteText style={s.heroCtaText}>Generar mi rutina</EliteText>
                  <Ionicons name="arrow-forward" size={16} color="#a8e02a" />
                </View>
              </View>
            </ImageBackground>
          </AnimatedPressable>
        </Animated.View>

        {/* Grupo secundario chico */}
        <EliteText style={s.sectionLabel}>MÁS FORMAS DE ENTRENAR</EliteText>
        {SECUNDARIOS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(120 + idx * 50).springify()}>
            <AnimatedPressable onPress={() => nav(item)}>
              <GradientCard color={item.color} style={s.card}>
                <View style={s.row}>
                  <View style={[s.icon, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.name}>{item.name}</EliteText>
                    <EliteText style={s.sub}>{item.subtitle}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.muted} />
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

  // Hero primario (molde editorial "Mis Datos")
  heroCard: {
    borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end',
    minHeight: 190, marginBottom: Spacing.lg,
  },
  heroImg: { resizeMode: 'cover' },
  heroInner: { padding: 20 },
  heroKicker: {
    fontSize: 9, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, marginBottom: 6,
  },
  heroTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: '#fff', lineHeight: 30 },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heroCtaText: { color: '#a8e02a', fontSize: 14, fontFamily: Fonts.bold },

  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.bold, color: TEXT_COLORS.secondary,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },

  // Secundarias compactas
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginBottom: 2 },
  sub: { fontSize: FontSizes.xs, color: TEXT_COLORS.secondary },
});
