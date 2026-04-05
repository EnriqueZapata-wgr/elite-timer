/**
 * ExplanationModal — Modal bottom-sheet para explicar dominios de salud.
 *
 * Muestra: qué significa, cómo mejorar, datos necesarios, disclaimer.
 */
import { View, Modal, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { type DomainExplanation, HEALTH_DISCLAIMER } from '@/src/data/domain-explanations';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

interface ExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  explanation: DomainExplanation | null;
  currentScore?: number;
}

export function ExplanationModal({ visible, onClose, explanation, currentScore }: ExplanationModalProps) {
  if (!explanation) return null;

  const scoreColor = currentScore != null
    ? (currentScore >= 70 ? ATP_BRAND.lime : currentScore >= 40 ? '#EF9F27' : '#E24B4A')
    : '#555';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.modal} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Ionicons name={explanation.icon as any} size={24} color={explanation.color} />
              <EliteText style={s.modalTitle}>{explanation.name}</EliteText>
              <AnimatedPressable onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={20} color="#888" />
              </AnimatedPressable>
            </View>

            {/* Score actual */}
            {currentScore != null && (
              <View style={[s.scoreBadge, { backgroundColor: scoreColor + '15' }]}>
                <EliteText style={[s.scoreBadgeText, { color: scoreColor }]}>
                  Tu score: {Math.round(currentScore)}
                </EliteText>
              </View>
            )}

            {/* Qué significa */}
            <EliteText style={s.sectionLabel}>¿QUÉ SIGNIFICA?</EliteText>
            <EliteText style={s.explanationText}>{explanation.whatItMeans}</EliteText>

            {/* Cómo mejorar */}
            <EliteText style={s.sectionLabel}>¿CÓMO MEJORAR?</EliteText>
            {explanation.howToImprove.map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={ATP_BRAND.lime} />
                <EliteText style={s.tipText}>{tip}</EliteText>
              </View>
            ))}

            {/* Datos necesarios */}
            <EliteText style={s.sectionLabel}>DATOS QUE NECESITAMOS</EliteText>
            <View style={s.dataNeededRow}>
              {explanation.dataNeeded.map((d, i) => (
                <View key={i} style={s.dataPill}>
                  <EliteText style={s.dataPillText}>{d}</EliteText>
                </View>
              ))}
            </View>

            {/* Disclaimer */}
            <EliteText style={s.disclaimer}>{HEALTH_DISCLAIMER}</EliteText>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  closeBtn: { padding: 4 },
  scoreBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: Spacing.sm,
  },
  scoreBadgeText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#555',
    letterSpacing: 2,
    marginTop: Spacing.md,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999',
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#ccc',
    flex: 1,
    lineHeight: 20,
  },
  dataNeededRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dataPill: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: '#222',
  },
  dataPillText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#888',
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: '#444',
    marginTop: Spacing.md,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingBottom: Spacing.lg,
  },
});
