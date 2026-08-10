/**
 * OptionCard — Card de opcion reutilizable para quizzes de onboarding.
 * Soporta single-select (radio) y multi-select (checkbox).
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, PILL, TEXT_COLORS } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  text: string;
  icon?: string;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}

export function OptionCard({ text, icon, selected, multi = false, onPress }: Props) {
  // MB-31B: superficies/texto del scope; el lima del indicador es relleno
  // con negro encima (igual en los dos temas); como icono suelto en claro
  // pasa al teal calibrado.
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); onPress(); }}
      style={[
        styles.card,
        { backgroundColor: t.hundido, borderColor: t.borde },
        selected && styles.cardSelected,
      ]}
    >
      {/* Radio / Checkbox */}
      <View style={[styles.indicator, { borderColor: t.bordeMarcado }, selected && styles.indicatorSelected]}>
        {selected && (
          multi
            ? <Ionicons name="checkmark" size={12} color={TEXT_COLORS.onAccent} />
            : <View style={styles.radioDot} />
        )}
      </View>

      {/* Icon opcional */}
      {icon && (
        <Ionicons
          name={icon as any}
          size={20}
          color={selected ? (dark ? ATP_BRAND.lime : t.tealTexto) : (dark ? PILL.textColor : t.textoSecundario)}
          style={{ marginRight: 4 }}
        />
      )}

      {/* Texto */}
      <EliteText
        style={[
          styles.text,
          { color: dark ? 'rgba(255,255,255,0.8)' : t.textoSecundario },
          selected && [styles.textSelected, { color: t.texto }],
        ]}
      >
        {text}
      </EliteText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardSelected: {
    borderColor: ATP_BRAND.lime,
    backgroundColor: 'rgba(168,224,42,0.06)',
  },
  indicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: {
    borderColor: ATP_BRAND.lime,
    backgroundColor: ATP_BRAND.lime,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_COLORS.onAccent,
  },
  text: {
    flex: 1,
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
  },
  textSelected: {
    fontFamily: Fonts.semiBold,
  },
});
