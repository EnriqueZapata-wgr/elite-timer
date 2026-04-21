/**
 * InsightCard — Pantalla de validacion/insight entre bloques.
 * Muestra un mensaje personalizado con animacion antes de continuar.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';

interface Props {
  icon: string;
  color?: string;
  title: string;
  description: string;
  onContinue: () => void;
}

export function InsightCard({ icon, color = '#a8e02a', title, description, onContinue }: Props) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.content}>
        {/* Icon */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={36} color={color} />
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <EliteText style={styles.title}>{title}</EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).springify()}>
          <EliteText style={styles.description}>{description}</EliteText>
        </Animated.View>

        {/* Button */}
        <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.btnWrap}>
          <AnimatedPressable
            onPress={() => { haptic.medium(); onContinue(); }}
            style={styles.btn}
          >
            <EliteText style={styles.btnText}>CONTINUAR</EliteText>
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </AnimatedPressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  btnWrap: {
    width: '100%',
    marginTop: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#a8e02a',
    borderRadius: Radius.lg,
    paddingVertical: 16,
  },
  btnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
});
