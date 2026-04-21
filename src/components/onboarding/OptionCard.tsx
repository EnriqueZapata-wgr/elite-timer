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

interface Props {
  text: string;
  icon?: string;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}

export function OptionCard({ text, icon, selected, multi = false, onPress }: Props) {
  return (
    <AnimatedPressable
      onPress={() => { haptic.light(); onPress(); }}
      style={[styles.card, selected && styles.cardSelected]}
    >
      {/* Radio / Checkbox */}
      <View style={[styles.indicator, selected && styles.indicatorSelected]}>
        {selected && (
          multi
            ? <Ionicons name="checkmark" size={12} color="#000" />
            : <View style={styles.radioDot} />
        )}
      </View>

      {/* Icon opcional */}
      {icon && (
        <Ionicons
          name={icon as any}
          size={20}
          color={selected ? '#a8e02a' : '#666'}
          style={{ marginRight: 4 }}
        />
      )}

      {/* Texto */}
      <EliteText style={[styles.text, selected && styles.textSelected]}>
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
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardSelected: {
    borderColor: '#a8e02a',
    backgroundColor: 'rgba(168,224,42,0.06)',
  },
  indicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: {
    borderColor: '#a8e02a',
    backgroundColor: '#a8e02a',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
  },
  text: {
    flex: 1,
    color: '#ccc',
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
  },
  textSelected: {
    color: '#fff',
    fontFamily: Fonts.semiBold,
  },
});
