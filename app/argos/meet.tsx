/**
 * Meet ARGOS — primer contacto post-onboarding (T6 Sprint MAGIA ARGOS).
 *
 * Pantalla cinemática: ARGOS se presenta por nombre. Al terminar, marca
 * profiles.argos_introduced_at (migración 163) y libera el floating button
 * cross-app. Se muestra UNA vez, tras completar el onboarding v2.
 *
 * COPY: borrador de Fable — Enrique revisa el guion final (marcado en el buzón).
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ArgosAvatar } from '@/src/components/argos/ArgosAvatar';
import { useArgosPresence } from '@/src/components/argos/ArgosPresenceContext';
import { markArgosIntroduced } from '@/src/services/argos-intro-service';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

export default function MeetArgosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setIntroduced } = useArgosPresence();
  const [avatarState, setAvatarState] = useState<'speaking' | 'idle'>('speaking');
  const [loading, setLoading] = useState(false);

  const firstName = ((user?.user_metadata?.full_name as string) || '').trim().split(' ')[0] || '';

  // Cinemática: ARGOS "habla" al entrar, luego se calma.
  useEffect(() => {
    const t = setTimeout(() => setAvatarState('idle'), 3200);
    return () => clearTimeout(t);
  }, []);

  async function begin() {
    if (loading) return;
    setLoading(true);
    haptic.success();
    // Marca la intro (best-effort) y libera el floating de inmediato.
    if (user?.id) {
      try { await markArgosIntroduced(user.id); } catch { /* fail-open */ }
    }
    setIntroduced(true);
    router.replace('/(tabs)' as any);
  }

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.center}>
        <Animated.View entering={FadeIn.duration(600)}>
          <ArgosAvatar state={avatarState} size={140} variant="full" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(500)}>
          <EliteText style={s.hello}>
            {firstName ? `Hola, ${firstName}.` : 'Hola.'}
          </EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(1300).duration(500)}>
          <EliteText style={s.name}>Soy ARGOS.</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(2100).duration(500)}>
          <EliteText style={s.promise}>Voy a estar aquí para ti.</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(2900).duration(500)}>
          <EliteText style={s.micro}>
            Conozco tu historial, tus datos y tus objetivos. Te acompaño en cada
            pilar —fitness, nutrición, mente, salud— con inteligencia de salud
            funcional. Pregúntame lo que quieras, cuando quieras.
          </EliteText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(3400).duration(500)} style={s.bottomBar}>
        <AnimatedPressable style={s.cta} onPress={begin} disabled={loading}>
          <EliteText style={s.ctaText}>{loading ? 'Un momento…' : 'COMENCEMOS'}</EliteText>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  hello: { fontSize: 30, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center', marginTop: 28 },
  name: { fontSize: 26, fontFamily: Fonts.bold, color: ATP_BRAND.lime, textAlign: 'center' },
  promise: { fontSize: 20, fontFamily: Fonts.semiBold, color: '#fff', textAlign: 'center' },
  micro: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#888',
    textAlign: 'center', lineHeight: 21, marginTop: 12, paddingHorizontal: Spacing.sm,
  },
  bottomBar: { paddingBottom: 24 },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
