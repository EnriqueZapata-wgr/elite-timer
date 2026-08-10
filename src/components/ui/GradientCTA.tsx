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
import { brandGradient, TEXT_COLORS, ATP_BRAND, CATEGORY_COLORS } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

/** Glow del CTA por pilar (el fill NO cambia — ver nota MB-5 abajo). */
const PILLAR_GLOW: Partial<Record<string, string>> = {
  fitness: CATEGORY_COLORS.fitness,
  nutrition: CATEGORY_COLORS.nutrition,
  mind: CATEGORY_COLORS.mind,
};

interface Props {
  label: string;
  onPress: () => void;
  /** primary = degradado de marca (héroe) · quiet = acción secundaria neutra. */
  variant?: 'primary' | 'quiet';
  /**
   * MB-5 Bloque 3 (bug transversal "botones hiperoscuros"): antes `pillar`
   * rellenaba el CTA con PILLAR_GRADIENTS — un gradiente de FONDO
   * (color al 25% → negro 95%) con texto onAccent oscuro encima: el botón se
   * veía "apagado, como si tuviera algo encima" (Movilidad, GUARDAR SESIÓN de
   * cardio). Ahora el fill primario es SIEMPRE la molécula brillante
   * lime→teal (doctrina §1) y `pillar` solo tiñe el glow.
   */
  pillar?: Parameters<typeof brandGradient>[0];
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GradientCTA({ label, onPress, variant = 'primary', pillar, icon, disabled, style }: Props) {
  // MB-31B: el quiet lee el scope (oscuro de siempre fuera de <ThemeReady>);
  // el primary no cambia — degradado de marca + negro encima en los dos temas.
  const t = useSurfaceTokens();
  const handlePress = () => {
    haptic.medium();
    onPress();
  };

  if (variant === 'quiet') {
    return (
      <AnimatedPressable onPress={handlePress} disabled={disabled} style={style}>
        <View style={styles.quiet}>
          {icon && <Ionicons name={icon} size={16} color={t.textoSecundario} />}
          <EliteText style={[styles.quietText, { color: t.textoSecundario }]}>{label}</EliteText>
        </View>
      </AnimatedPressable>
    );
  }

  const glow = (pillar && PILLAR_GLOW[pillar]) || ATP_BRAND.lime;
  return (
    <AnimatedPressable onPress={handlePress} disabled={disabled} style={style}>
      <LinearGradient
        colors={brandGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primary, { shadowColor: glow }]}
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
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    letterSpacing: 2,
  },
});
