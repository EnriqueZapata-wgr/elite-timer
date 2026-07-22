/**
 * Sprint Compliance 2 — Checkbox de consentimiento granular (reutilizable).
 *
 * Renderiza el texto EXACTO del checkbox (Parte 3 del Aviso). NUNCA
 * pre-marcado: el estado inicial siempre debe ser false (art. 8 LFPDPPP —
 * el consentimiento es acción afirmativa del titular).
 */
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

interface Props {
  text: string;
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
}

export function ConsentCheckboxRow({ text, checked, onToggle, required }: Props) {
  return (
    <Pressable
      onPress={() => { haptic.light(); onToggle(); }}
      style={s.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[s.checkbox, checked && s.checkboxOn]}>
        {checked && <Ionicons name="checkmark" size={14} color="#000" />}
      </View>
      <EliteText style={s.text}>
        {text}
        {required ? <EliteText style={s.requiredMark}> *</EliteText> : null}
      </EliteText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  text: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#ccc', lineHeight: 18 },
  requiredMark: { color: ATP_BRAND.lime, fontFamily: Fonts.bold },
});
