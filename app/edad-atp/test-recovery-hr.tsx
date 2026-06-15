/**
 * Test Recovery HR — recuperación cardiaca a 1 minuto.
 * Captura FC al pico de esfuerzo y FC tras 1 min de descanso → guarda el DELTA (caída).
 * Motor (scoreRecoveryHR): delta ≥40 = 100. Mayor caída = mejor recuperación.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveKinematicTest, getLatestKinematicTests } from '@/src/services/edad-atp/kinematic-tests-service';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function TestRecoveryHrScreen() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [peak, setPeak] = useState('');
  const [rest, setRest] = useState('');
  const [last, setLast] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestKinematicTests(user.id).then((m) => setLast(m.recovery_hr?.value ?? null));
  }, [user?.id]));

  const peakN = parseDecimalInput(peak);
  const restN = parseDecimalInput(rest);
  const inRange = (n: number | null) => n != null && n >= 40 && n <= 220;
  const delta = inRange(peakN) && inRange(restN) ? Math.round(peakN! - restN!) : null;

  async function handleSave() {
    if (!user?.id) return;
    if (!inRange(peakN) || !inRange(restN)) { Alert.alert('FC', 'Ingresa ambas frecuencias (40–220 BPM).'); return; }
    if (delta == null || delta <= 0) { Alert.alert('Revisa', 'La FC de descanso debe ser menor que la de pico (la caída debe ser positiva).'); return; }
    setSaving(true);
    const r = await saveKinematicTest(user.id, 'recovery_hr', delta, 'bpm', `pico ${Math.round(peakN!)} / 1min ${Math.round(restN!)}`);
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', r.error ?? 'No se pudo guardar.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: 'recovery_hr', value: delta, source: 'cinematic' });
    haptic.success();
    Alert.alert('', `Caída de ${delta} BPM guardada ✓`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Recovery HR" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>
          Mide cuánto baja tu pulso en 1 minuto tras un esfuerzo intenso. Mayor caída = mejor recuperación cardiaca (marcador de salud cardiovascular).
        </EliteText>
        <Pressable onPress={() => { haptic.light(); setHelpOpen(true); }} style={styles.helpLink}>
          <Ionicons name="help-circle-outline" size={16} color={Colors.neonGreen} />
          <EliteText variant="caption" style={styles.helpLinkText}>¿Cómo medir?</EliteText>
        </Pressable>
        <View style={styles.card}>
          <NumberInputRow label="FC al pico de esfuerzo" unit="BPM" value={peak} onChangeText={setPeak} helper="Justo al terminar el esfuerzo intenso" />
          <NumberInputRow label="FC tras 1 min de descanso" unit="BPM" value={rest} onChangeText={setRest} helper="Exactamente 1 minuto después" badge={last != null ? `caída actual ${last}` : undefined} />
          {delta != null ? (
            <EliteText variant="caption" style={styles.delta}>Caída: {delta} BPM {delta >= 40 ? '· excelente' : delta >= 25 ? '· buena' : ''}</EliteText>
          ) : null}
        </View>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar resultado'}</EliteText>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </ScrollView>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <EliteText variant="body" style={styles.modalTitle}>¿Cómo medir la recuperación?</EliteText>
            <EliteText variant="caption" style={styles.modalBody}>
              {'1. Haz un esfuerzo intenso (sprint, escaleras, burpees) hasta acercarte a tu FC máxima.\n2. Apunta tu FC justo al terminar (FC pico).\n3. Descansa quieto exactamente 1 minuto.\n4. Apunta tu FC de nuevo.\n\nMedición: Apple Watch, Garmin, pulsioxímetro, o tu pulso manual 15s × 4.\nDelta = FC pico − FC 1min. ≥40 BPM = excelente.'}
            </EliteText>
            <Pressable onPress={() => setHelpOpen(false)} style={styles.modalClose}>
              <EliteText variant="body" style={styles.modalCloseText}>Entendido</EliteText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  helpLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  helpLinkText: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a', marginTop: Spacing.sm },
  delta: { color: Colors.neonGreen, fontSize: FontSizes.sm, textAlign: 'right', marginTop: Spacing.xs, fontFamily: Fonts.semiBold },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  backText: { color: Colors.textSecondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: '#0d0d0d', borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1, borderColor: '#222', gap: Spacing.sm },
  modalTitle: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  modalBody: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  modalClose: { backgroundColor: Colors.neonGreen, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center', marginTop: Spacing.xs },
  modalCloseText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
