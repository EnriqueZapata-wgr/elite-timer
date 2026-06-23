/**
 * Convertir E- → H+. Sin slider (no hay dep): stepper de presets (múltiplos de 100) + Máx.
 * Preview en vivo (previewProtons × multiplier de reto). Confirma vía RPC convert.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ProtonOrb } from '@/src/components/economy/ProtonOrb';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getElectronBalance } from '@/src/services/economy/electron-service';
import { getConversionRate, previewProtons, convertElectronsToProtons } from '@/src/services/economy/electron-to-proton-converter';
import { formatFull } from '@/src/services/economy/format';
import { ELEVATION, TEXT, ATP_BRAND } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const STEPS = [100, 500, 1000, 5000];

export default function ConvertScreen() {
  const { user } = useAuth();
  const [available, setAvailable] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [electrons, setElectrons] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [bal, rate] = await Promise.all([getElectronBalance(user.id), getConversionRate(user.id)]);
    setAvailable(bal.current_electrons);
    setMultiplier(rate.multiplier);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxConvertible = Math.floor(available / 100) * 100;
  const protons = previewProtons(electrons, multiplier);
  const canConvert = electrons >= 100 && electrons <= maxConvertible;

  function step(delta: number) {
    haptic.light();
    setElectrons((v) => Math.max(0, Math.min(maxConvertible, v + delta)));
  }

  async function confirm() {
    if (!user?.id || !canConvert || busy) return;
    setBusy(true);
    const r = await convertElectronsToProtons(user.id, electrons);
    setBusy(false);
    if (!r.success) { Alert.alert('No se pudo convertir', r.error ?? 'Intenta de nuevo.'); return; }
    haptic.success();
    DeviceEventEmitter.emit('balance_changed');
    Alert.alert('¡Convertido!', `Recibiste ${formatFull(r.protonsGained)} H+`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Convertir" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.orbWrap}><ProtonOrb size={64} /></View>

        <EliteText variant="caption" style={styles.muted}>
          Tienes {formatFull(available)} E- · tasa 100 E- = {formatFull(300 * multiplier)} H+
          {multiplier > 1 ? `  (reto ×${multiplier})` : ''}
        </EliteText>

        <View style={styles.amountCard}>
          <EliteText variant="caption" style={styles.muted}>CONVERTIR</EliteText>
          <EliteText style={styles.amount}>{formatFull(electrons)} <EliteText style={styles.unit}>E-</EliteText></EliteText>
          <Ionicons name="arrow-down" size={20} color={TEXT.secondary} />
          <EliteText style={[styles.amount, { color: ATP_BRAND.lime }]}>{formatFull(protons)} <EliteText style={styles.unit}>H+</EliteText></EliteText>
        </View>

        <View style={styles.steps}>
          {STEPS.map((s) => (
            <AnimatedPressable key={s} onPress={() => step(s)} style={styles.stepBtn}>
              <EliteText style={styles.stepText}>+{s >= 1000 ? `${s / 1000}K` : s}</EliteText>
            </AnimatedPressable>
          ))}
          <AnimatedPressable onPress={() => { haptic.light(); setElectrons(maxConvertible); }} style={[styles.stepBtn, styles.maxBtn]}>
            <EliteText style={[styles.stepText, { color: ATP_BRAND.lime }]}>MÁX</EliteText>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => { haptic.light(); setElectrons(0); }} style={styles.stepBtn}>
            <EliteText style={styles.stepText}>Reset</EliteText>
          </AnimatedPressable>
        </View>

        <AnimatedPressable
          onPress={confirm}
          disabled={!canConvert || busy}
          style={[styles.cta, (!canConvert || busy) && styles.ctaDisabled]}
        >
          <EliteText style={styles.ctaText}>{busy ? 'Convirtiendo…' : 'Confirmar conversión'}</EliteText>
        </AnimatedPressable>
        <EliteText variant="caption" style={[styles.muted, { textAlign: 'center' }]}>
          Convertir NO baja tu rank (los E- lifetime se conservan).
        </EliteText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 80 },
  orbWrap: { alignItems: 'center', marginTop: Spacing.sm },
  muted: { color: TEXT.secondary, textAlign: 'center' },
  amountCard: {
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, padding: Spacing.lg,
    borderWidth: 0.5, borderColor: ELEVATION[1].border, alignItems: 'center', gap: Spacing.sm,
  },
  amount: { fontSize: FontSizes.hero, fontFamily: Fonts.extraBold, color: TEXT.primary },
  unit: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.secondary },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  stepBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[2].border,
  },
  maxBtn: { borderColor: ATP_BRAND.lime },
  stepText: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  cta: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.md },
});
