/**
 * Index — Redirect según estado de autenticación y onboarding.
 * Mientras verifica, muestra logo vertical ATP con loader.
 */
import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { Colors } from '@/constants/theme';

const logoVertical = require('@/assets/images/splash-icon.png');

export default function IndexRedirect() {
  const { session, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  const [onboardingRoute, setOnboardingRoute] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id && !loading) {
      setCheckingOnboarding(true);
      supabase.from('profiles').select('onboarding_step').eq('id', session.user.id).single()
        .then(({ data }) => {
          const step = data?.onboarding_step;
          if (step === 'completed') {
            setOnboardingDone(true);
          } else {
            setOnboardingDone(false);
            // Redirigir al paso correcto (onboarding v2 — 7 bloques)
            switch (step) {
              case 'context':    setOnboardingRoute('/onboarding/summary'); break;
              case 'nutrition':  setOnboardingRoute('/onboarding/context'); break;
              case 'health':     setOnboardingRoute('/onboarding/nutrition'); break;
              case 'chronotype': setOnboardingRoute('/onboarding/health'); break;
              case 'goal':       setOnboardingRoute('/onboarding/chronotype'); break;
              case 'basics':     setOnboardingRoute('/onboarding/goal'); break;
              default:           setOnboardingRoute('/onboarding-basics'); break;
            }
          }
          setCheckingOnboarding(false);
        }, () => { setOnboardingDone(true); setCheckingOnboarding(false); });
    }
  }, [session?.user?.id, loading]);

  if (loading || checkingOnboarding) {
    return (
      <View style={styles.splash}>
        <Image source={logoVertical} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
      </View>
    );
  }

  if (!session) return <Redirect href={'/onboarding' as any} />;
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
