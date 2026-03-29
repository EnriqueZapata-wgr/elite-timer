/**
 * SaveableSection — Wrapper con borde naranja cuando hay cambios sin guardar.
 */
import { View, StyleSheet } from 'react-native';
import { SURFACES, SEMANTIC } from '@/src/constants/brand';
import { Spacing } from '@/constants/theme';
import type { ReactNode } from 'react';

interface Props {
  hasChanges: boolean;
  children: ReactNode;
}

export function SaveableSection({ hasChanges, children }: Props) {
  return (
    <View style={[st.section, hasChanges && st.unsaved]}>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  section: {
    backgroundColor: SURFACES.card,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    borderWidth: 0.5,
    borderColor: SURFACES.border,
  },
  unsaved: {
    borderLeftColor: SEMANTIC.warning,
  },
});
