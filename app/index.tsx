/**
 * Index — Redirect según estado de autenticación.
 *
 * Si hay sesión → Dashboard (tabs). Si no → Login.
 * Mientras verifica, muestra splash ELITE con loader.
 */
import { Redirect } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/contexts/auth-context';
import { EliteText } from '@/components/elite-text';
import { Colors } from '@/constants/theme';

export default function IndexRedirect() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <EliteText variant="title" style={styles.logo}>ATP</EliteText>
        <ActivityIndicator size="large" color={Colors.neonGreen} style={styles.loader} />
      </View>
    );
  }

  if (session) return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    letterSpacing: 16,
  },
  loader: {
    marginTop: 24,
  },
});
