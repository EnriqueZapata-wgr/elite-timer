/**
 * Index — Redirect según estado de autenticación y onboarding.
 * Mientras verifica, muestra logo vertical ATP con loader.
 */
import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { resolveOnboardingRoute } from '@/src/services/onboarding-v2-core';
import { Colors } from '@/constants/theme';

const logoVertical = require('@/assets/images/splash-icon.png');

export default function IndexRedirect() {
  const { session, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  const [onboardingRoute, setOnboardingRoute] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id || loading) return;
    const userId = session.user.id;
    setCheckingOnboarding(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_step')
          .eq('id', userId)
          .single();
        const step = data?.onboarding_step;
        if (step === 'completed') {
          // Backfill (Step COACH 7.2/N): founders que terminaron onboarding ANTES
          // del paso de voz (COACH 4/N) no tienen fila en coach_voice_config.
          // Si falta, redirigir al paso de voz en modo backfill (vuelve a HOY).
          const { data: voiceConfig } = await supabase
            .from('coach_voice_config')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          if (!voiceConfig) {
            setOnboardingDone(false);
            setOnboardingRoute('/onboarding/voice-config?mode=backfill');
          } else {
            setOnboardingDone(true);
          }
        } else {
          // Onboarding v2 (F2 sprint UX blockers): 'v2_<step>' → su pantalla;
          // valores legacy v1 → reiniciar en v2 welcome (los datos ya
          // capturados persisten y las pantallas v2 los prefillan).
          setOnboardingDone(false);
          setOnboardingRoute(resolveOnboardingRoute(step) ?? '/onboarding/v2/welcome');
        }
      } catch {
        // Error de query → degradar a tabs (mismo comportamiento previo).
        setOnboardingDone(true);
      } finally {
        setCheckingOnboarding(false);
      }
    })();
  }, [session?.user?.id, loading]);

  if (loading || checkingOnboarding) {
    return (
      <View style={styles.splash}>
        <Image source={logoVertical} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
      </View>
    );
  }

  // Sin sesión → login. El onboarding post-signup vive en /onboarding/v2/*.
  if (!session) return <Redirect href={'/login' as any} />;
  if (onboardingDone === false && onboardingRoute) return <Redirect href={onboardingRoute as any} />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
  loader: {
    marginTop: 24,
  },
});
