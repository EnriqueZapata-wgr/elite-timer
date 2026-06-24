/**
 * SplashLoader — pantalla de carga unificada con el splash nativo (#75/auth-sprint).
 * Mismo logo + fondo negro que el splash de Expo, pero con una barra de progreso REAL 0-100%
 * (alimentada por compileDay) en vez del spinner indeterminado "Compilando tu día…". Así el
 * arranque se siente como UNA sola carga continua, no dos.
 *
 * La barra se anima con Reanimated 4 (withTiming) para que los saltos (45→65→80) se vean fluidos.
 */
import { useEffect } from 'react';
import { View, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND, BG, TEXT } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts } from '@/constants/theme';

const LOGO_SIZE = Math.round(Dimensions.get('window').width * 0.55);

interface SplashLoaderProps {
  /** Progreso 0-100. */
  progress: number;
  /** Etiqueta discreta bajo la barra (ej. "Compilando día…"). */
  label?: string;
  /** Si se pasa, muestra estado de error + botón Reintentar en vez de la barra. */
  error?: string | null;
  onRetry?: () => void;
}

export function SplashLoader({ progress, label, error, onRetry }: SplashLoaderProps) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(100, progress)), { duration: 300 });
  }, [progress, w]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/splash-icon.png')} style={styles.logo} resizeMode="contain" />
      <EliteText variant="caption" style={styles.tagline}>ACTIVA TU ENERGÍA Y SALUD</EliteText>

      {error ? (
        <View style={styles.errorBox}>
          <EliteText variant="body" style={styles.errorText}>{error}</EliteText>
          {onRetry ? (
            <Pressable onPress={onRetry} style={styles.retryBtn} hitSlop={8}>
              <Ionicons name="refresh-outline" size={18} color="#000" />
              <EliteText style={styles.retryText}>Reintentar</EliteText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.barWrap}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          {label ? <EliteText variant="caption" style={styles.label}>{label}</EliteText> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.screen, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  tagline: { color: ATP_BRAND.teal, letterSpacing: 2, marginTop: Spacing.md, marginBottom: Spacing.xxl },
  barWrap: { width: '80%', alignItems: 'center', gap: Spacing.sm },
  track: { width: '100%', height: 4, borderRadius: 2, backgroundColor: '#1A1A1A', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: ATP_BRAND.lime },
  label: { color: TEXT.secondary, letterSpacing: 1 },
  errorBox: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  errorText: { color: TEXT.secondary, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ATP_BRAND.lime, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 8 },
  retryText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.sm },
});
