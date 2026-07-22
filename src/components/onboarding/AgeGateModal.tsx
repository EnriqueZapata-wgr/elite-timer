/**
 * AgeGateModal (#41 → Sprint Compliance 2) — gate de edad en onboarding v2.
 *
 * Edad mínima 18 DURO (decisión compliance fila 5): <18 bloquea la cuenta.
 * El variant 'parental' (13-17 con email del tutor) se eliminó — ATP trata
 * datos sensibles de salud y es solo-adultos (Aviso §7, T&C §3).
 *
 * Editorial ATP: fondo negro con overlay, acento lima, Poppins.
 */
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT } from '@/src/constants/brand';

interface Props {
  visible: boolean;
  /** Bloqueado (<18): salir (signOut → login). */
  onExit: () => void;
  /** Cerró para corregir una fecha mal capturada. */
  onDismiss: () => void;
}

export function AgeGateModal({ visible, onExit, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onExit}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="hand-left-outline" size={32} color="#ef4444" />
          </View>
          <EliteText style={s.title}>ATP no está disponible{'\n'}para menores de 18 años</EliteText>
          <EliteText style={s.body}>
            ATP trata datos sensibles de salud y está dirigida exclusivamente a personas
            mayores de 18 años. No podemos crear tu cuenta. Te esperamos cuando cumplas 18.
          </EliteText>
          <AnimatedPressable style={s.primaryBtn} onPress={() => { haptic.medium(); onExit(); }}>
            <EliteText style={s.primaryBtnText}>ENTENDIDO</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={s.secondaryBtn} onPress={() => { haptic.light(); onDismiss(); }}>
            <EliteText style={s.secondaryText}>Corregir mi fecha de nacimiento</EliteText>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 24, padding: Spacing.lg, alignItems: 'center',
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20, fontFamily: Fonts.bold, color: TEXT.primary,
    textAlign: 'center', lineHeight: 28,
  },
  body: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#999',
    textAlign: 'center', marginTop: 10, lineHeight: 20,
  },
  primaryBtn: {
    alignSelf: 'stretch', backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.lg,
  },
  primaryBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  secondaryBtn: { paddingVertical: 12, marginTop: 4 },
  secondaryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#666' },
});
