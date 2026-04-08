/**
 * FilterPills — Barra horizontal de pills de filtro/tab.
 *
 * Reemplaza las 3 implementaciones inline (filterPill en index, tabPill en
 * fitness-hub, periodPill en reports). Estilo unico desde brand.ts: PILL.
 *
 * Uso:
 *   const [filter, setFilter] = useState('Todos');
 *   <FilterPills options={['Todos','Fitness']} selected={filter} onSelect={setFilter} />
 */
import { ScrollView, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { PILL } from '@/src/constants/brand';

interface FilterPillsProps<T extends string> {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  /** Si false, no aplica padding horizontal — para uso dentro de un container que ya lo tiene */
  withPadding?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FilterPills<T extends string>({
  options, selected, onSelect, withPadding = true, style,
}: FilterPillsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, style]}
      contentContainerStyle={[styles.content, !withPadding && { paddingHorizontal: 0 }]}
    >
      {options.map(option => {
        const isActive = selected === option;
        return (
          <AnimatedPressable
            key={option}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => { haptic.light(); onSelect(option); }}
          >
            <Text style={[styles.text, isActive && styles.textActive]}>
              {option.toUpperCase()}
            </Text>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    height: PILL.height,
    paddingHorizontal: PILL.paddingHorizontal,
    borderRadius: PILL.borderRadius,
    borderWidth: PILL.borderWidth,
    backgroundColor: PILL.bg,
    borderColor: PILL.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: PILL.activeBg,
    borderColor: PILL.activeBorderColor,
  },
  text: {
    fontSize: PILL.fontSize,
    fontWeight: PILL.fontWeight,
    letterSpacing: PILL.letterSpacing,
    color: PILL.textColor,
  },
  textActive: {
    color: PILL.activeTextColor,
  },
});
