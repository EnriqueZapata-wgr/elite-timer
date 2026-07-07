/**
 * MedicalDisclaimer — Disclaimer legal pie de pantalla por feature.
 * El copy vive en src/constants/medical-disclaimers.ts (fuente única, #42) —
 * compartido con el modal de consentimiento MedicalDisclaimerModal.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { DISCLAIMERS, type DisclaimerFeature } from '@/src/constants/medical-disclaimers';

export type { DisclaimerFeature };

interface Props { feature: DisclaimerFeature; compact?: boolean; }

export function MedicalDisclaimer({ feature, compact = false }: Props) {
  return (
    <View style={s.container}>
      <EliteText style={s.text} numberOfLines={compact ? 2 : undefined}>
        {DISCLAIMERS[feature]}
      </EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, marginTop: 24, marginBottom: 32 },
  text: { color: '#666', fontSize: 11, lineHeight: 16, textAlign: 'left' },
});
