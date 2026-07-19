/**
 * AppTour (MB-10) — welcome tour EDITORIAL post-pago, 7 pantallas (una por pilar).
 *
 * Doctrina: apetito, no manual de usuario. Una idea + una imagen por pantalla.
 * Guiado-no-prisionero: "Saltar" siempre visible, sin culpa. Cero venta.
 *
 * Se muestra una vez (AsyncStorage @atp/tour_completed), al aterrizar en HOY tras
 * el onboarding. Firma estable (onComplete) para no tocar el disparador de HOY;
 * `sex` decide la 6ª pantalla (Ciclo para female, Comunidad para el resto — nunca
 * se le muestra contenido de ciclo a un hombre).
 */
import { useState } from 'react';
import { View, StyleSheet, Modal, ImageBackground, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { TEXT } from '@/src/constants/brand';
import { buildTourSteps, type TourImageKey } from '@/src/components/tour/app-tour-core';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

const { height } = Dimensions.get('window');

// Imágenes editoriales por pilar (require estático · Metro). El core puro no las
// referencia (rompería vitest); aquí se mapea imageKey → asset.
const IMG: Record<TourImageKey, any> = {
  hoy: require('@/assets/images/yo/disciplina-semanal.jpg'),
  fitness: require('@/assets/images/hoy-extra/cardio-01.png'),
  nutricion: require('@/assets/images/hoy-extra/proteina.png'),
  mente: require('@/assets/images/intervenciones/mente.jpg'),
  salud: require('@/assets/images/health-hub/mi-salud.png'),
  ciclo: require('@/assets/images/cycle/ciclo-01.png'),
  comunidad: require('@/assets/images/pillars/comunidad.png'),
  tests: require('@/assets/images/health-hub/tests-evaluaciones.png'),
};

interface Props {
  onComplete: () => void;
  sex?: string | null;
}

export function AppTour({ onComplete, sex }: Props) {
  const [step, setStep] = useState(0);
  const steps = buildTourSteps(sex);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  async function finish() {
    await AsyncStorage.setItem('@atp/tour_completed', 'true').catch(() => {});
    onComplete();
  }

  function next() {
    haptic.light();
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.container}>
        <ImageBackground key={current.kicker} source={IMG[current.imageKey]} style={s.image} imageStyle={s.imageInner}>
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.97)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Skip siempre visible (guiado-no-prisionero) */}
          <AnimatedPressable onPress={finish} style={s.skip} hitSlop={10}>
            <EliteText style={s.skipText}>Saltar</EliteText>
          </AnimatedPressable>

          <View style={s.bottom}>
            <Animated.View key={`t-${step}`} entering={FadeInUp.duration(450)}>
              <EliteText style={[s.kicker, { color: current.color }]}>{current.kicker}</EliteText>
              <EliteText style={s.title}>{current.title}</EliteText>
            </Animated.View>

            {/* Dots */}
            <Animated.View entering={FadeIn.duration(400)} style={s.dots}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    i === step && { width: 22, backgroundColor: current.color },
                    i < step && { backgroundColor: current.color },
                  ]}
                />
              ))}
            </Animated.View>

            <GradientCTA label={isLast ? 'EMPEZAR' : 'SIGUIENTE'} onPress={next} />
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { flex: 1, justifyContent: 'flex-end' },
  imageInner: { resizeMode: 'cover' },
  skip: { position: 'absolute', top: 54, right: Spacing.lg, paddingVertical: 6, paddingHorizontal: 12 },
  skipText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, letterSpacing: 0.5 },
  bottom: { paddingHorizontal: Spacing.lg, paddingBottom: 48, gap: Spacing.lg, minHeight: height * 0.42, justifyContent: 'flex-end' },
  kicker: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3, marginBottom: Spacing.sm },
  title: { fontSize: 26, fontFamily: Fonts.bold, color: '#fff', lineHeight: 34 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
});
