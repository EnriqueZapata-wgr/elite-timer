/**
 * MedicalDisclaimerModal (#42) — modal de consentimiento de disclaimers
 * médicos. Editorial ATP: overlay negro, título grande, copy scrolleable
 * por secciones, "Acepto y entiendo" (lima) / "No aceptar" (bloquea).
 *
 * mode='gate' → aceptar/rechazar (rechazo navega back vía onDecline).
 * mode='read' → solo lectura desde Settings > Legal (botón Cerrar).
 */
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import {
  DISCLAIMERS,
  DISCLAIMER_SECTIONS,
  MEDICAL_DISCLAIMER_VERSION,
} from '@/src/constants/medical-disclaimers';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT } from '@/src/constants/brand';

interface Props {
  visible: boolean;
  mode: 'gate' | 'read';
  onAccept?: () => void;
  onDecline?: () => void;
  onClose?: () => void;
}

export function MedicalDisclaimerModal({ visible, mode, onAccept, onDecline, onClose }: Props) {
  const dismiss = mode === 'read' ? onClose : onDecline;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name="medkit-outline" size={22} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={s.kicker}>AVISO MÉDICO · v{MEDICAL_DISCLAIMER_VERSION}</EliteText>
              <EliteText style={s.title}>ATP no sustituye a tu médico</EliteText>
            </View>
          </View>

          <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: Spacing.md }}>
            <EliteText style={s.intro}>{DISCLAIMERS.global}</EliteText>
            {DISCLAIMER_SECTIONS.filter(sec => sec.feature !== 'global').map(sec => (
              <View key={sec.feature} style={{ marginTop: Spacing.md }}>
                <EliteText style={s.sectionTitle}>{sec.title.toUpperCase()}</EliteText>
                <EliteText style={s.sectionBody}>{DISCLAIMERS[sec.feature]}</EliteText>
              </View>
            ))}
          </ScrollView>

          {mode === 'gate' ? (
            <>
              <AnimatedPressable style={s.acceptBtn} onPress={() => { haptic.success(); onAccept?.(); }}>
                <EliteText style={s.acceptText}>ACEPTO Y ENTIENDO</EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.declineBtn} onPress={() => { haptic.light(); onDecline?.(); }}>
                <EliteText style={s.declineText}>No aceptar</EliteText>
              </AnimatedPressable>
            </>
          ) : (
            <AnimatedPressable style={s.acceptBtn} onPress={() => { haptic.light(); onClose?.(); }}>
              <EliteText style={s.acceptText}>CERRAR</EliteText>
            </AnimatedPressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xl,
  },
  card: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 24, padding: Spacing.lg, maxHeight: '90%',
  },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: Spacing.md },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(251,191,36,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  kicker: { fontSize: 10, fontFamily: Fonts.semiBold, color: '#fbbf24', letterSpacing: 2 },
  title: { fontSize: 19, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: 2, lineHeight: 25 },
  scroll: { flexGrow: 0 },
  intro: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#ccc', lineHeight: 20 },
  sectionTitle: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: '#888',
    letterSpacing: 2, marginBottom: 4,
  },
  sectionBody: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#999', lineHeight: 18 },
  acceptBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 15,
    alignItems: 'center', marginTop: Spacing.md,
  },
  acceptText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  declineBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  declineText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#666' },
});
