/**
 * QuestionnaireQuestion — pregunta con opciones tipo card (radio) para los
 * cuestionarios de dominio de Edad ATP. Reutilizable.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, BG, BORDER, TEXT } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export type QuestionOption = { label: string; value: string };

interface Props {
  text: string;
  options: QuestionOption[];
  selected?: string;
  onSelect: (value: string) => void;
}

export function QuestionnaireQuestion({ text, options, selected, onSelect }: Props) {
  return (
    <View style={styles.block}>
      <EliteText variant="body" style={styles.question}>{text}</EliteText>
      <View style={styles.options}>
        {options.map((o) => {
          const active = selected === o.value;
          return (
            <AnimatedPressable
              key={o.value}
              onPress={() => { haptic.light(); onSelect(o.value); }}
              style={[styles.option, active && styles.optionActive]}
            >
              <EliteText variant="caption" style={[styles.optionText, active && styles.optionTextActive]}>{o.label}</EliteText>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Spacing.md },
  question: { color: TEXT.primary, fontFamily: Fonts.semiBold, marginBottom: Spacing.sm },
  options: { gap: 8 },
  option: {
    paddingVertical: 12, paddingHorizontal: Spacing.md, borderRadius: Radius.md,
    backgroundColor: BG.card, borderWidth: 1, borderColor: BORDER.card,
  },
  // Lima solo como estado seleccionado (feedback semántico, ACCENT_ROLES c).
  optionActive: { backgroundColor: 'rgba(168,224,42,0.12)', borderColor: ATP_BRAND.lime },
  optionText: { color: TEXT.secondary, fontSize: FontSizes.sm },
  optionTextActive: { color: TEXT.primary, fontFamily: Fonts.semiBold },
});
