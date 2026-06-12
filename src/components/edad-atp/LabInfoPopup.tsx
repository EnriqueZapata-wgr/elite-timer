/**
 * <LabInfoPopup> — popup de descripción de un parámetro de lab (#3). Se abre al mantener
 * apretado (long-press) un parámetro. Lee nombre + descripción de LAB_PARAM_META (fuente
 * única). Incluye disclaimer médico (no diagnostica). Controlado por el padre (visible/onClose).
 */
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { getLabParamMeta } from './component-meta';

interface Props {
  /** parameter_key canónico (o null para cerrado). */
  parameterKey: string | null;
  onClose: () => void;
  /** Valor + unidad opcionales para mostrar en el encabezado. */
  value?: number | null;
}

export function LabInfoPopup({ parameterKey, onClose, value }: Props) {
  const meta = parameterKey ? getLabParamMeta(parameterKey) : null;
  return (
    <Modal visible={parameterKey != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {meta ? (
            <>
              <View style={styles.headerRow}>
                <EliteText style={styles.title}>{meta.display_name}</EliteText>
                {meta.abbr && meta.abbr !== meta.display_name ? (
                  <View style={styles.abbrPill}><EliteText style={styles.abbr}>{meta.abbr}</EliteText></View>
                ) : null}
              </View>
              {value != null && Number.isFinite(value) ? (
                <EliteText style={styles.value}>{value} {meta.unit ?? ''}</EliteText>
              ) : null}
              {meta.description ? (
                <EliteText variant="body" style={styles.desc}>{meta.description}</EliteText>
              ) : (
                <EliteText variant="body" style={styles.desc}>Parámetro de laboratorio.</EliteText>
              )}
              <EliteText variant="caption" style={styles.disclaimer}>
                Información educativa. No reemplaza la evaluación de tu médico ni un diagnóstico.
              </EliteText>
              <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
                <EliteText style={styles.closeText}>Entendido</EliteText>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.lg },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: '#222' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  title: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  abbrPill: { backgroundColor: 'rgba(168,224,42,0.12)', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  abbr: { color: Colors.neonGreen, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  value: { color: Colors.neonGreen, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  disclaimer: { color: Colors.textMuted, fontSize: FontSizes.xs, lineHeight: 15, marginTop: 2 },
  closeBtn: { marginTop: Spacing.sm, backgroundColor: 'rgba(168,224,42,0.12)', borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  closeText: { color: Colors.neonGreen, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
