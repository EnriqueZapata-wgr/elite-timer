/**
 * <UploadTypePicker> — al subir un archivo, pregunta PRIMERO qué es (#10). Lista los 7 tipos
 * de UPLOAD_TYPES. Solo Labs y Composición alimentan el motor; el resto se adjunta como
 * contexto (#11). Controlado: visible/onSelect/onCancel.
 */
import { Modal, View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { UPLOAD_TYPES, type UploadType } from '@/src/constants/upload-types';

interface Props {
  visible: boolean;
  onSelect: (type: UploadType) => void;
  onCancel: () => void;
}

export function UploadTypePicker({ visible, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <EliteText style={styles.title}>¿Qué estás subiendo?</EliteText>
          <EliteText variant="caption" style={styles.subtitle}>
            Elige el tipo para procesarlo bien. Solo laboratorios y composición alimentan tu Edad ATP.
          </EliteText>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {UPLOAD_TYPES.map((t) => (
              <Pressable key={t.id} style={styles.option} onPress={() => onSelect(t)} accessibilityRole="button">
                <EliteText style={styles.icon}>{t.icon}</EliteText>
                <View style={styles.optText}>
                  <View style={styles.optHeader}>
                    <EliteText style={styles.optLabel}>{t.label}</EliteText>
                    {t.writesValues ? (
                      <View style={styles.motorPill}><EliteText style={styles.motorPillText}>alimenta el motor</EliteText></View>
                    ) : (
                      <View style={styles.ctxPill}><EliteText style={styles.ctxPillText}>contexto</EliteText></View>
                    )}
                  </View>
                  <EliteText variant="caption" style={styles.optHint}>{t.hint}</EliteText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.cancel} onPress={onCancel}><EliteText style={styles.cancelText}>Cancelar</EliteText></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surfaceBase, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.lg, maxHeight: '85%' },
  title: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2, marginBottom: Spacing.sm, lineHeight: 16 },
  list: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1c1c1c' },
  icon: { fontSize: 24 },
  optText: { flex: 1 },
  optHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  optLabel: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  optHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 1 },
  motorPill: { backgroundColor: 'rgba(168,224,42,0.14)', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  motorPillText: { color: Colors.neonGreen, fontSize: 9, fontFamily: Fonts.semiBold },
  ctxPill: { backgroundColor: 'rgba(142,142,147,0.16)', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  ctxPillText: { color: Colors.textMuted, fontSize: 9, fontFamily: Fonts.semiBold },
  cancel: { marginTop: Spacing.md, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
