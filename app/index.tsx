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

  useEffect(() => {
    if (session?.user?.id && !loading) {
      setCheckingOnboarding(true);
      supabase.from('profiles').select('onboarding_step').eq('id', session.user.id).single()
        .then(({ data }) => {
          setOnboardingDone(data?.onboarding_step === 'completed');
          setCheckingOnboarding(false);
        })
        .then(undefined, () => { setOnboardingDone(true); setCheckingOnboarding(false); });
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
  if (onboardingDone === false) return <Redirect href={'/onboarding-basics' as any} />;
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
