/**
 * Onboarding Complete — Pantalla de transición "Generando tu día".
 *
 * Muestra progreso con círculo SVG animado, mensajes progresivos,
 * genera el plan diario, activa trial de 7 días, y navega al home.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { generateDailyPlan } from '@/src/services/protocol-builder-service';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

const MESSAGES = [
  'Analizando tus respuestas...',
  'Combinando protocolos seleccionados...',
  'Ajustando a tu cronotipo...',
  'Creando timeline personalizado...',
  '¡Listo!',
];

// Parámetros SVG
const CIRCLE_SIZE = 120;
const CIRCLE_STROKE = 6;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      // Paso 1: Analizando
      setMessageIndex(0);
      setProgress(0.2);
      await new Promise(r => setTimeout(r, 800));
      if (cancelled) return;

      // Paso 2: Combinando
      setMessageIndex(1);
      setProgress(0.4);
      await new Promise(r => setTimeout(r, 800));
      if (cancelled) return;

      // Paso 3: Ajustando + generar plan real
      setMessageIndex(2);
      setProgress(0.6);
      try {
        if (user?.id) {
          await generateDailyPlan(user.id, undefined, true);
        }
      } catch { /* falla silenciosa — el plan se genera en home */ }
      if (cancelled) return;

      // Paso 4: Creando timeline
      setMessageIndex(3);
      setProgress(0.9);
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;

      // Activar trial de 7 días Standard
      try {
        if (user?.id) {
          const { data: existingSub } = await supabase
            .from('user_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!existingSub) {
            const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            await supabase.from('user_subscriptions').insert({
              user_id: user.id,
              tier: 'standard',
              status: 'trialing',
              trial_end: trialEnd,
              current_period_start: new Date().toISOString(),
              current_period_end: trialEnd,
            });
          }
        }
      } catch { /* tabla puede no existir aún — silenciar */ }

      // Paso 5: ¡Listo!
      setMessageIndex(4);
      setProgress(1);
      haptic.success();
      await new Promise(r => setTimeout(r, 500));
      if (cancelled) return;

      // Marcar onboarding como completado y navegar
      try {
        if (user?.id) {
          await supabase.from('profiles').update({ onboarding_step: 'completed' }).eq('id', user.id);
        }
      } catch { /* silenciar */ }

      router.replace('/(tabs)');
    };

    generate();
    return () => { cancelled = true; };
  }, []);

  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <EliteText style={styles.logo}>ATP</EliteText>
        </Animated.View>

        {/* Círculo animado de progreso */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.circleWrap}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            {/* Track */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_RADIUS}
              stroke="#1a1a1a"
              strokeWidth={CIRCLE_STROKE}
              fill="none"
            />
            {/* Progreso */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_RADIUS}
              stroke={ATP_BRAND.lime}
              strokeWidth={CIRCLE_STROKE}
              fill="none"
              strokeDasharray={`${CIRCLE_CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
            />
          </Svg>
          {/* Ícono dentro del círculo */}
          <View style={styles.circleIcon}>
            <Ionicons
              name={messageIndex >= MESSAGES.length - 1 ? 'checkmark' : 'flash'}
              size={32}
              color={ATP_BRAND.lime}
            />
          </View>
        </Animated.View>

        {/* Título */}
        <EliteText style={styles.title}>Generando tu día...</EliteText>

        {/* Mensaje actual */}
        <Animated.View entering={FadeIn.duration(300)} key={messageIndex}>
          <EliteText style={styles.message}>
            {MESSAGES[messageIndex]}
          </EliteText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  logo: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    color: ATP_BRAND.lime,
    letterSpacing: 4,
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  message: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
  },
});
