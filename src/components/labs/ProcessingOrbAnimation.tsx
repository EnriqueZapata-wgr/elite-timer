/**
 * ProcessingOrbAnimation — orb reanimated reutilizable (labs hoy; análisis genético/plan ARGOS
 * en el futuro). Pulsa en 'processing', se asienta en checkmark ('extracted') o X ('failed').
 * Implementación simple (View + reanimated + Ionicon), sin Skia. Dispara haptic al cambiar de estado.
 */
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, cancelAnimation } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/src/utils/haptics';
import { Colors } from '@/constants/theme';
import { SEMANTIC } from '@/src/constants/brand';

export type OrbStatus = 'processing' | 'extracted' | 'failed';

export function ProcessingOrbAnimation({ status, size = 120 }: { status: OrbStatus; size?: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (status === 'processing') {
      scale.value = withRepeat(withTiming(1.15, { duration: 1500 }), -1, true);
      haptic.light();
    } else {
      cancelAnimation(scale);
      scale.value = withSpring(1, { damping: 12 });
      if (status === 'extracted') haptic.success();
      else haptic.warning();
    }
    return () => cancelAnimation(scale);
  }, [status, scale]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = status === 'failed' ? SEMANTIC.error : Colors.neonGreen;
  const icon = status === 'extracted' ? 'checkmark' : status === 'failed' ? 'close' : 'flask';
  const inner = size * 0.62;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.orb,
          {
            width: inner, height: inner, borderRadius: inner,
            backgroundColor: color + '1F', borderColor: color,
            shadowColor: color,
          },
          orbStyle,
        ]}
      >
        <Ionicons name={icon as any} size={size * 0.3} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  orb: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
