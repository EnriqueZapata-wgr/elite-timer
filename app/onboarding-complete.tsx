/**
 * Onboarding Complete — Pantalla de transición "Generando tu día".
 *
 * Muestra progreso falso mientras genera el plan diario, luego navega al home.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { generateDailyPlan } from '@/src/services/protocol-builder-service';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, SURFACES } from '@/src/constants/brand';

const MESSAGES = [
  'Combinando tus protocolos...',
  'Ajustando a tu cronotipo...',
  'Creando timeline personalizado...',
  '¡Listo!',
];

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progreso falso: avanza en 4 pasos
    const timers = MESSAGES.map((_, i) =>
      setTimeout(() => {
        setMessageIndex(i);
        setProgress((i + 1) / MESSAGES.length);
      }, i * 900),
    );

    // Acción real: generar plan y navegar
    const finishTimer = setTimeout(async () => {
      try {
        if (user) {
          await generateDailyPlan(user.id, undefined, true);
          await supabase.from('profiles').update({ onboarding_step: 'completed' }).eq('id', user.id);
        }
      } catch { /* falla silenciosa — el plan se genera en home */ }

      haptic.success();
      router.replace('/(tabs)');
    }, 3500);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icono */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <Ionicons
            name={messageIndex === MESSAGES.length - 1 ? 'checkmark-circle' : 'pulse'}
            size={80}
            color={ATP_BRAND.lime}
          />
        </Animated.View>

        {/* Mensaje actual */}
        <Animated.View entering={FadeIn.duration(300)} key={messageIndex}>
          <EliteText variant="subtitle" style={styles.message}>
            {MESSAGES[messageIndex]}
          </EliteText>
        </Animated.View>

        {/* Barra de progreso */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  message: {
    fontSize: FontSizes.xl,
    color: TEXT_COLORS.primary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: SURFACES.cardLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 3,
  },
});
