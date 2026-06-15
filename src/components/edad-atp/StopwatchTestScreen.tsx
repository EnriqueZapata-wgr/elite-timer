/**
 * StopwatchTestScreen — pantalla reutilizable de test cinemático con cronómetro
 * (plank, BOLT). Empezar/Detener/Reiniciar + un modal "¿Cómo se hace?". Guarda los
 * segundos vía kinematic-tests-service (que alimenta el motor v2).
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { useStopwatch } from '@/src/hooks/useStopwatch';
import { saveKinematicTest, type KinematicTestKey } from '@/src/services/edad-atp/kinematic-tests-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  testKey: Extract<KinematicTestKey, 'plank' | 'bolt'>;
  title: string;
  intro: string;
  helperTitle: string;
  helperBody: string;
  maxSeconds: number;
}

export function StopwatchTestScreen({ testKey, title, intro, helperTitle, helperBody, maxSeconds }: Props) {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const { elapsed, running, start, stop, reset } = useStopwatch();
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const canSave = !running && elapsed > 0;

  async function handleSave() {
    if (!user?.id) return;
    const value = Math.round(elapsed); // segundos enteros
    if (value < 1) { Alert.alert('Sin tiempo', 'Inicia y detén el cronómetro primero.'); return; }
    if (value > maxSeconds) { Alert.alert('Fuera de rango', `El máximo es ${maxSeconds}s.`); return; }
    setSaving(true);
    const r = await saveKinematicTest(user.id, testKey, value, 'seconds');
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', r.error ?? 'No se pudo guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: testKey, value, source: 'cinematic' });
    haptic.success();
    Alert.alert('', `${value}s guardados ✓`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>{intro}</EliteText>

        <Pressable onPress={() => { haptic.light(); setHelpOpen(true); }} style={styles.helpLink}>
          <Ionicons name="help-circle-outline" size={16} color={Colors.neonGreen} />
          <EliteText variant="caption" style={styles.helpLinkText}>¿Cómo se hace?</EliteText>
        </Pressable>

        <View style={styles.timerCard}>
          <EliteText style={styles.timer}>{elapsed.toFixed(1)}<EliteText style={styles.timerUnit}> s</EliteText></EliteText>
          <View style={styles.controls}>
            {!running ? (
              <Pressable onPress={() => { haptic.medium(); start(); }} style={[styles.ctrl, styles.ctrlStart]}>
                <Ionicons name="play" size={20} color={Colors.textOnGreen} />
                <EliteText variant="body" style={styles.ctrlStartText}>{elapsed > 0 ? 'Reanudar' : 'Empezar'}</EliteText>
              </Pressable>
            ) : (
              <Pressable onPress={() => { haptic.medium(); stop(); }} style={[styles.ctrl, styles.ctrlStop]}>
                <Ionicons name="stop" size={20} color="#fff" />
                <EliteText variant="body" style={styles.ctrlStopText}>Detener</EliteText>
              </Pressable>
            )}
            <Pressable onPress={() => { haptic.light(); reset(); }} style={[styles.ctrl, styles.ctrlReset]} disabled={running}>
              <Ionicons name="refresh" size={18} color={running ? Colors.textMuted : Colors.textSecondary} />
              <EliteText variant="caption" style={[styles.ctrlResetText, running && { color: Colors.textMuted }]}>Reiniciar</EliteText>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={handleSave} disabled={!canSave || saving} style={[styles.saveBtn, (!canSave || saving) && { opacity: 0.5 }]}>
          <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar resultado'}</EliteText>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </ScrollView>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <EliteText variant="body" style={styles.modalTitle}>{helperTitle}</EliteText>
            <EliteText variant="caption" style={styles.modalBody}>{helperBody}</EliteText>
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
  timerCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1, borderColor: '#1a1a1a', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  timer: { fontFamily: Fonts.extraBold, fontSize: FontSizes.timer, color: Colors.neonGreen },
  timerUnit: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, color: Colors.textSecondary },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ctrl: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.pill },
  ctrlStart: { backgroundColor: Colors.neonGreen },
  ctrlStartText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  ctrlStop: { backgroundColor: Colors.error },
  ctrlStopText: { color: '#fff', fontFamily: Fonts.bold },
  ctrlReset: { borderWidth: 1, borderColor: '#222' },
  ctrlResetText: { color: Colors.textSecondary },
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
