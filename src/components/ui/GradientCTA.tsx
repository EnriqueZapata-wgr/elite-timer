/**
 * GradientCTA — botón de acción del design system (molde "Mis Datos").
 *
 * Doctrina §1: superficies heroicas = DEGRADADOS, nunca lime plano.
 * El CTA primario usa brandGradient() (lime→teal o el gradiente del pilar);
 * el variant 'quiet' es la acción secundaria silenciosa (TERMINAR, Volver).
 * Spring scale + haptic incluidos — nada de Pressable plano con opacity.
 *
 * Uso:
 *   <GradientCTA label="COMENZAR" onPress={start} />
 *   <GradientCTA label="TERMINAR" variant="quiet" onPress={end} />
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from './AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { brandGradient, TEXT, TEXT_COLORS, ATP_BRAND } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  /** primary = degradado de marca (héroe) · quiet = acción secundaria neutra. */
  variant?: 'primary' | 'quiet';
  /** Tiñe el degradado con el gradiente del pilar (p.ej. 'mind'). */
  pillar?: Parameters<typeof brandGradient>[0];
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GradientCTA({ label, onPress, variant = 'primary', pillar, icon, disabled, style }: Props) {
  const handlePress = () => {
    haptic.medium();
    onPress();
  };

  if (variant === 'quiet') {
    return (
      <AnimatedPressable onPress={handlePress} disabled={disabled} style={style}>
        <View style={styles.quiet}>
          {icon && <Ionicons name={icon} size={16} color={TEXT.secondary} />}
          <EliteText style={styles.quietText}>{label}</EliteText>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable onPress={handlePress} disabled={disabled} style={style}>
      <LinearGradient
        colors={brandGradient(pillar)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primary}
      >
        {icon && <Ionicons name={icon} size={18} color={TEXT_COLORS.onAccent} />}
        <EliteText style={styles.primaryText}>{label}</EliteText>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl + Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    shadowColor: ATP_BRAND.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.lg,
    letterSpacing: 3,
  },
  quiet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  quietText: {
    color: TEXT.secondary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    letterSpacing: 2,
  },
});
