/**
 * Sprint Compliance 2 — Modal de consentimiento contextual (CB-6 voz, CB-7 ciclo).
 *
 * Parte 3 del Aviso: estos checkboxes se muestran AL ACTIVAR la función, no en
 * el signup. El checkbox llega NO pre-marcado; aceptar loguea en
 * user_consent_log y desbloquea la función. Declinar cierra sin activar.
 */
import { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ConsentCheckboxRow } from '@/src/components/legal/ConsentCheckboxRow';
import { haptic } from '@/src/utils/haptics';
import { CONSENT_BY_ID, type ConsentCheckboxId } from '@/src/constants/consent-copy';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

interface Props {
  visible: boolean;
  checkboxId: Extract<ConsentCheckboxId, 'CB-6' | 'CB-7'>;
  title: string;
  /** Aceptó (el caller loguea CB y activa la función). */
  onAccept: () => void;
  /** Cerró sin aceptar (la función no se activa). */
  onDecline: () => void;
  saving?: boolean;
}

export function ContextualConsentModal({ visible, checkboxId, title, onAccept, onDecline, saving }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={30} color={ATP_BRAND.lime} />
          </View>
          <EliteText style={s.title}>{title}</EliteText>
          <EliteText style={s.body}>
            Tú tienes el control: esta función solo se activa con tu consentimiento
            expreso, y puedes revocarlo cuando quieras desde Perfil → Privacidad.
          </EliteText>

          <View style={{ alignSelf: 'stretch', marginTop: Spacing.md }}>
            <ConsentCheckboxRow
              text={CONSENT_BY_ID[checkboxId].text}
              checked={checked}
              onToggle={() => setChecked(c => !c)}
            />
          </View>

          <AnimatedPressable
            style={[s.primaryBtn, !checked && s.primaryBtnDisabled]}
            onPress={() => { if (checked && !saving) { haptic.success(); onAccept(); } }}
            disabled={!checked || saving}
          >
            <EliteText style={[s.primaryBtnText, !checked && { opacity: 0.4 }]}>
              {saving ? 'Guardando…' : 'ACEPTAR Y ACTIVAR'}
            </EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={s.secondaryBtn} onPress={() => { haptic.light(); onDecline(); }}>
            <EliteText style={s.secondaryText}>Ahora no</EliteText>
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
    width: 60, height: 60, borderRadius: 30, backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20, fontFamily: Fonts.bold, color: TEXT.primary,
    textAlign: 'center', lineHeight: 27,
  },
  body: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#999',
    textAlign: 'center', marginTop: 10, lineHeight: 20,
  },
  primaryBtn: {
    alignSelf: 'stretch', backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.lg,
  },
  primaryBtnDisabled: { backgroundColor: '#1a1a1a' },
  primaryBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  secondaryBtn: { paddingVertical: 12, marginTop: 4 },
  secondaryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#666' },
});
