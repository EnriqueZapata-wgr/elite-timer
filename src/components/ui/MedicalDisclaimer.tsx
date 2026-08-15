/**
 * MedicalDisclaimer — Disclaimer legal pie de pantalla por feature.
 * El copy vive en src/constants/medical-disclaimers.ts (fuente única, #42) —
 * compartido con el modal de consentimiento MedicalDisclaimerModal.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { DISCLAIMERS, type DisclaimerFeature } from '@/src/constants/medical-disclaimers';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export type { DisclaimerFeature };

interface Props { feature: DisclaimerFeature; compact?: boolean; }

export function MedicalDisclaimer({ feature, compact = false }: Props) {
  // NOCHE-4: el gris fijo se queda corto sobre papel en 11px. Al secundario
  // del tema, que si esta calibrado para letra chica en los dos modos.
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.container}>
      <EliteText style={s.text} numberOfLines={compact ? 2 : undefined}>
        {DISCLAIMERS[feature]}
      </EliteText>
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, marginTop: 24, marginBottom: 32 },
  text: { color: t.textoSecundario, fontSize: 11, lineHeight: 16, textAlign: 'left' },
});
