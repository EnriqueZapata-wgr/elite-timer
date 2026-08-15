/**
 * MedicalDisclaimerModal (#42) — modal de consentimiento de disclaimers
 * médicos. Editorial ATP: overlay negro, título grande, copy scrolleable
 * por secciones, "Acepto y entiendo" (lima) / "No aceptar" (bloquea).
 *
 * mode='gate' → aceptar/rechazar (rechazo navega back vía onDecline).
 * mode='read' → solo lectura desde Settings > Legal (botón Cerrar).
 */
import { useMemo } from 'react';
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
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  visible: boolean;
  mode: 'gate' | 'read';
  onAccept?: () => void;
  onDecline?: () => void;
  onClose?: () => void;
}

export function MedicalDisclaimerModal({ visible, mode, onAccept, onDecline, onClose }: Props) {
  const dismiss = mode === 'read' ? onClose : onDecline;
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
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

// MB-31B: iconWrap/icono del medkit se quedan en el ámbar de marca a
// propósito (badge decorativo, no texto) en los dos temas.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: t.kind === 'dark' ? 'rgba(0,0,0,0.88)' : 'rgba(15,21,24,0.35)',
    justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xl,
  },
  card: {
    backgroundColor: t.flotante, borderWidth: 1, borderColor: t.bordeMarcado,
    borderRadius: 24, padding: Spacing.lg, maxHeight: '90%',
  },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: Spacing.md },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(251,191,36,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Kicker "AVISO MÉDICO": en oscuro ámbar de marca; en claro el ámbar no
  // se lee sobre acero (1.6:1), usa t.error, que sí está calibrado.
  kicker: {
    fontSize: 10, fontFamily: Fonts.semiBold,
    color: t.kind === 'dark' ? '#fbbf24' : t.error, letterSpacing: 2,
  },
  title: { fontSize: 19, fontFamily: Fonts.bold, color: t.texto, marginTop: 2, lineHeight: 25 },
  scroll: { flexGrow: 0 },
  intro: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: t.textoSecundario, lineHeight: 20 },
  sectionTitle: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: t.textoSecundario,
    letterSpacing: 2, marginBottom: 4,
  },
  sectionBody: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: t.textoSecundario, lineHeight: 18 },
  acceptBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 15,
    alignItems: 'center', marginTop: Spacing.md,
  },
  acceptText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: t.textoSobreLima, letterSpacing: 1 },
  declineBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  declineText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.textoSecundario },
});
