/**
 * NavOptionsRow — las opciones cuando ARGOS no está seguro a dónde llevarte.
 *
 * El resolvedor devuelve `ambigua` cuando el primer candidato no le saca 1.45x
 * al segundo. Su contrato es NO ADIVINAR, y este componente es la otra mitad de
 * ese contrato: sin un lugar donde el usuario elija, "no adivinar" se convierte
 * en "no servir".
 *
 * Molde de chip tomado de ChatEmptyState para que la desambiguación no se sienta
 * como otra app. Sin lima: elegir entre dos pantallas no es la acción heroica de
 * la pantalla, es una aclaración (disciplina de acento, DESIGN_SYSTEM §1).
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import type { CandidatoNav } from '@/src/services/argos-nav-resolver-core';

interface Props {
  opciones: CandidatoNav[];
  onPick: (candidato: CandidatoNav) => void;
}

export function NavOptionsRow({ opciones, onPick }: Props) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  if (opciones.length === 0) return null;
  return (
    <View style={s.wrap}>
      {opciones.map((op) => (
        <AnimatedPressable key={op.ruta} onPress={() => onPick(op)} style={s.chip}>
          <Ionicons name="arrow-forward" size={14} color={withOpacity(t.texto, 0.6)} />
          <Text style={s.chipText} numberOfLines={1}>{op.titulo}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  wrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: 12, justifyContent: 'flex-start',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: t.hundido, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: t.borde,
    maxWidth: '100%',
  },
  chipText: {
    color: withOpacity(t.texto, 0.8), fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    flexShrink: 1,
  },
});
