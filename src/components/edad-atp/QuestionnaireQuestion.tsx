/**
 * QuestionnaireQuestion — pregunta con opciones tipo card (radio) para los
 * cuestionarios de dominio de Edad ATP. Reutilizable.
 */
import { View, Pressable, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

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
            <Pressable
              key={o.value}
              onPress={() => { haptic.light(); onSelect(o.value); }}
              style={[styles.option, active && styles.optionActive]}
            >
              <EliteText variant="caption" style={[styles.optionText, active && styles.optionTextActive]}>{o.label}</EliteText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Spacing.md },
  question: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, marginBottom: Spacing.sm },
  options: { gap: 8 },
  option: {
    paddingVertical: 12, paddingHorizontal: Spacing.md, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#1a1a1a',
  },
  optionActive: { backgroundColor: 'rgba(168,224,42,0.12)', borderColor: Colors.neonGreen },
  optionText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  optionTextActive: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
});
