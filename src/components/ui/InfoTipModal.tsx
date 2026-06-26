/**
 * InfoTipModal (#v13f 2.6) — modal centrado custom para el info-tip "i" de las cards del HOY.
 * Reemplaza el Alert nativo gris por una card con estilo de la app (fondo oscuro, título lima,
 * botón "Entendido"). Cierra al tap fuera de la card o en el botón. Modal nativo de RN (sin libs).
 */
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function InfoTipModal({ visible, title, message, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Card: come el tap para que no cierre al tocar dentro. */}
        <Pressable style={styles.card} onPress={() => { /* eat tap */ }}>
          <EliteText style={styles.title}>{title}</EliteText>
          <EliteText style={styles.message}>{message}</EliteText>
          <Pressable style={styles.button} onPress={onClose}>
            <EliteText style={styles.buttonText}>Entendido</EliteText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  card: { width: '100%', maxWidth: 320, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.card, padding: Spacing.xl },
  title: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginBottom: Spacing.md, letterSpacing: 1 },
  message: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 22 },
  button: { alignSelf: 'center', marginTop: Spacing.xl, backgroundColor: ATP_BRAND.lime, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 },
  buttonText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1 },
});
