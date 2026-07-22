/**
 * Sprint Compliance 3 — Gate de atestación de protocolos de riesgo.
 *
 * Tres variantes según GateDecision:
 *  - 'attest': afirmaciones en primera persona (texto EXACTO del sign-off §2),
 *    TODAS obligatorias; "COMENZAR" deshabilitado hasta palomear todo. Botón
 *    "Detener/cancelar" siempre disponible. Al confirmar se loguea la
 *    atestación (user_attestation_log) y recién entonces se ejecuta onProceed.
 *  - 'blocked' por embarazo/lactancia (§2.6): bloqueo total, no palomeable.
 *  - 'blocked' por condición declarada (capa 1): bloqueo total.
 *
 * El estado de las casillas se resetea en cada apertura: el gate corre CADA
 * VEZ (el contexto cambia entre sesiones).
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ConsentCheckboxRow } from '@/src/components/legal/ConsentCheckboxRow';
import { haptic } from '@/src/utils/haptics';
import {
  ATTESTATIONS,
  PREGNANCY_HARD_BLOCK_MESSAGE,
  CONDITION_HARD_BLOCK_MESSAGE,
  type AttestationId,
} from '@/src/constants/attestation-copy';
import type { GateDecision } from '@/src/services/safety/protocol-gate-core';
import { logAttestation } from '@/src/services/safety/protocol-gate-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, SEMANTIC, withOpacity } from '@/src/constants/brand';

interface Props {
  visible: boolean;
  decision: Exclude<GateDecision, { result: 'allowed' }> | null;
  userId: string | null;
  /** Key del protocolo/plantilla para el log. */
  protocolKey?: string;
  /** Todas las casillas confirmadas y logueadas → arrancar. */
  onProceed: () => void;
  /** Cerró sin confirmar (o bloqueado). */
  onClose: () => void;
}

export function AttestationGateModal({ visible, decision, userId, protocolKey, onProceed, onClose }: Props) {
  const [checked, setChecked] = useState<boolean[]>([]);
  const [saving, setSaving] = useState(false);

  const spec = decision?.result === 'attest' ? ATTESTATIONS[decision.attestationId as AttestationId] : null;

  // Reset en cada apertura: el gate corre CADA VEZ.
  useEffect(() => {
    if (visible && spec) setChecked(new Array(spec.checks.length).fill(false));
  }, [visible, spec?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!decision) return null;

  const allChecked = spec ? checked.length === spec.checks.length && checked.every(Boolean) : false;

  async function handleProceed() {
    if (!spec || !allChecked || saving) return;
    setSaving(true);
    try {
      if (userId) await logAttestation(userId, spec.id, protocolKey);
      haptic.success();
      onProceed();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {decision.result === 'blocked' ? (
            <>
              <View style={[s.iconWrap, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
                <Ionicons name="hand-left-outline" size={30} color={SEMANTIC.error} />
              </View>
              <EliteText style={s.title}>
                {decision.reason === 'pregnancy' ? 'Protocolo no disponible' : 'Protocolo bloqueado por seguridad'}
              </EliteText>
              <EliteText style={s.body}>
                {decision.reason === 'pregnancy' ? PREGNANCY_HARD_BLOCK_MESSAGE : CONDITION_HARD_BLOCK_MESSAGE}
              </EliteText>
              <AnimatedPressable style={s.primaryBtn} onPress={() => { haptic.medium(); onClose(); }}>
                <EliteText style={s.primaryBtnText}>ENTENDIDO</EliteText>
              </AnimatedPressable>
            </>
          ) : spec ? (
            <>
              <View style={s.iconWrap}>
                <Ionicons name="shield-checkmark-outline" size={30} color={ATP_BRAND.lime} />
              </View>
              <EliteText style={s.title}>{spec.heading}</EliteText>
              <ScrollView style={s.checksScroll} contentContainerStyle={{ gap: 14 }}>
                {spec.checks.map((text, i) => (
                  <ConsentCheckboxRow
                    key={i}
                    text={text}
                    checked={!!checked[i]}
                    onToggle={() => setChecked(prev => prev.map((v, j) => (j === i ? !v : v)))}
                  />
                ))}
              </ScrollView>
              {spec.footer && <EliteText style={s.footer}>{spec.footer}</EliteText>}
              <AnimatedPressable
                style={[s.primaryBtn, !allChecked && s.primaryBtnDisabled]}
                onPress={handleProceed}
                disabled={!allChecked || saving}
              >
                <EliteText style={[s.primaryBtnText, !allChecked && { opacity: 0.4 }]}>
                  {saving ? 'Guardando…' : 'COMENZAR'}
                </EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.secondaryBtn} onPress={() => { haptic.light(); onClose(); }}>
                <EliteText style={s.secondaryText}>Hoy no</EliteText>
              </AnimatedPressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 24, padding: Spacing.lg, alignItems: 'center', maxHeight: '86%',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18, fontFamily: Fonts.bold, color: TEXT.primary,
    textAlign: 'center', lineHeight: 25,
  },
  body: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#999',
    textAlign: 'center', marginTop: 10, lineHeight: 20,
  },
  checksScroll: { alignSelf: 'stretch', marginTop: Spacing.md, flexGrow: 0 },
  footer: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#8a7a2f',
    marginTop: Spacing.md, lineHeight: 17, alignSelf: 'stretch',
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
