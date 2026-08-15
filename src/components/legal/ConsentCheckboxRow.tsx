/**
 * Sprint Compliance 2 — Checkbox de consentimiento granular (reutilizable).
 *
 * Renderiza el texto EXACTO del checkbox (Parte 3 del Aviso). NUNCA
 * pre-marcado: el estado inicial siempre debe ser false (art. 8 LFPDPPP —
 * el consentimiento es acción afirmativa del titular).
 */
import { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  text: string;
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
}

export function ConsentCheckboxRow({ text, checked, onToggle, required }: Props) {
  // NOCHE-4: el texto del consentimiento iba en gris claro fijo. Es el copy
  // que la persona esta aceptando: tiene que leerse en los dos temas.
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable
      onPress={() => { haptic.light(); onToggle(); }}
      style={s.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[s.checkbox, checked && s.checkboxOn]}>
        {checked && <Ionicons name="checkmark" size={14} color={t.textoSobreLima} />}
      </View>
      <EliteText style={s.text}>
        {text}
        {required ? <EliteText style={s.requiredMark}> *</EliteText> : null}
      </EliteText>
    </Pressable>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: t.bordeMarcado,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  // El lima marcado se queda en los dos temas: es relleno, y lleva negro encima.
  checkboxOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  text: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: t.texto, lineHeight: 18 },
  // El asterisco de obligatorio como LETRA: en claro el lima no se ve.
  requiredMark: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.bold },
});
