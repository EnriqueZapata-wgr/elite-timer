/**
 * N-Back — cómo jugar (tutorial; primera vez es la puerta obligada a la
 * sesión con N=1 forzado — decisión #44-1).
 *
 * V1.5 (D10): paginado — una idea por pantalla con "ENTENDIDO", indicador de
 * progreso y "EMPEZAR" al final (antes era una lista corrida poco amigable).
 * La primera ronda además trae coach on-the-fly (sesion.tsx).
 */
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { haptic } from '@/src/utils/haptics';
import { NBACK_CONFIG } from '@/src/services/nback-core';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: 'eye-outline',
    title: 'Dos estímulos a la vez',
    body: 'En cada turno se ilumina una celda del grid Y suena una letra. Son dos canales independientes: posición y sonido.',
  },
  {
    icon: 'time-outline',
    title: 'Compara con N turnos atrás',
    body: 'Con N=2: si la celda actual es la MISMA que hace 2 turnos, toca POSICIÓN. Si la letra actual es la MISMA que hace 2 turnos, toca SONIDO. Pueden coincidir los dos, uno o ninguno.',
  },
  {
    icon: 'trending-up-outline',
    title: 'El nivel se adapta a ti',
    body: `≥${NBACK_CONFIG.RAISE_THRESHOLD * 100}% en AMBOS canales → subes de nivel. <${NBACK_CONFIG.DROP_THRESHOLD * 100}% en cualquiera → baja para consolidar. En medio → te quedas. No hay techo: N=8+ es territorio de élite.`,
  },
  {
    icon: 'headset-outline',
    title: 'El sonido es obligatorio',
    body: 'Usa auriculares o pon el altavoz claro: necesitas distinguir las letras con precisión. Si tu teléfono está en silencio, reactiva el sonido antes de empezar.',
  },
  {
    icon: 'flash-outline',
    title: 'Tu constancia paga',
    body: `${NBACK_CONFIG.ROUNDS_PER_DAY} rounds al día (~20 min) por ${NBACK_CONFIG.CHALLENGE_DAYS} días. El primer round del día suma tu electrón en HOY; completar la sesión diaria, romper tu récord de N y sostener la racha suman H+.`,
  },
];

export default function NBackComoJugarScreen() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [idx, setIdx] = useState(0);

  // MB-31B3: tokens del tema — solo migran los neutros; el lima del juego
  // (icono, dot activo, gradiente molécula) es identidad y se queda.
  const { kind, tokens: t } = useAppTheme();
  const secTxt = { color: t.textoSecundario };
  const priTxt = { color: t.texto };
  const tenueTxt = { color: t.textoTenue };
  const cardSurf = { backgroundColor: t.card, borderColor: t.borde };

  const last = idx === STEPS.length - 1;
  const step = STEPS[idx];

  const advance = useCallback(() => {
    if (idx < STEPS.length - 1) {
      haptic.light();
      setIdx(i => i + 1);
    } else {
      haptic.medium();
      router.replace('/mente/nback/sesion');
    }
  }, [idx, router]);

  return (
    <ThemeReady>
    <View style={[s.screen, { backgroundColor: t.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <StickyPillarBanner scrolled={scrolled} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={s.scroll}
      >
        <View style={s.header}>
          <EliteText style={s.kicker}>N-BACK · TUTORIAL</EliteText>
          <EliteText style={[s.title, priTxt]}>Cómo jugar</EliteText>
          {/* B-4 (MB-12): alineado con el artículo de Saber más — te prometemos
              el entrenamiento, no el milagro. */}
          <EliteText style={[s.subtitle, secTxt]}>
            Dual N-Back: entrena tu memoria de trabajo con dificultad
            creciente. Te prometemos el entrenamiento, no el milagro.
          </EliteText>
        </View>

        <View style={s.body}>
          {/* Una idea por pantalla (D10) — la card re-entra al avanzar. */}
          <Animated.View key={idx} entering={FadeInRight.duration(220)} style={[s.stepCardBig, cardSurf]}>
            <View style={s.stepIconBig}>
              <Ionicons name={step.icon as any} size={28} color={ATP_BRAND.lime} />
            </View>
            <EliteText style={[s.stepTitleBig, priTxt]}>{step.title}</EliteText>
            <EliteText style={[s.stepBodyBig, secTxt]}>{step.body}</EliteText>
          </Animated.View>

          {/* Progreso */}
          <View style={s.dotsRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === idx && s.dotActive]} />
            ))}
          </View>

          <AnimatedPressable style={s.startBtn} onPress={advance}>
            <LinearGradient colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.startBtnInner}>
              {last && <Ionicons name="play" size={18} color={t.textoSobreLima} />}
              <EliteText style={[s.startText, { color: t.textoSobreLima }]}>{last ? 'EMPEZAR' : 'ENTENDIDO'}</EliteText>
            </LinearGradient>
          </AnimatedPressable>
          {idx > 0 && (
            <AnimatedPressable
              style={s.backStepBtn}
              onPress={() => { haptic.light(); setIdx(i => Math.max(0, i - 1)); }}
            >
              <EliteText style={[s.backStepText, secTxt]}>Anterior</EliteText>
            </AnimatedPressable>
          )}
          {last && (
            <EliteText style={[s.startHint, tenueTxt]}>
              Tu primera sesión arranca en N=1 para que aprendas la mecánica sin presión.
            </EliteText>
          )}

          <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
    </ThemeReady>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: Spacing.xxl },
  header: { paddingTop: 108, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  kicker: { color: '#7F77DD', fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 2 },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 20 },
  body: { paddingHorizontal: Spacing.md },

  stepCardBig: {
    borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
    minHeight: 230,
  },
  stepIconBig: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  stepTitleBig: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, letterSpacing: 0.5 },
  stepBodyBig: { fontSize: FontSizes.md, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 23 },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotActive: { backgroundColor: ATP_BRAND.lime, width: 18 },

  backStepBtn: { alignItems: 'center', paddingVertical: 12 },
  backStepText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  // V1.5.2 (#1): CTA en gradiente molécula (fuera lime plano full-width)
  startBtn: { borderRadius: Radius.pill, overflow: 'hidden', marginTop: Spacing.md },
  startBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  // El color se aplica inline con t.textoSobreLima (texto sobre relleno lima).
  startText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },
  startHint: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: 10,
  },
});
