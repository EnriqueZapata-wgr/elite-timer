/**
 * Test funcional — Push-ups máximas continuas. Tap-to-count + cronómetro ascendente.
 * Guarda el máximo en edad_atp_functional_tests (test_key push_ups_max).
 */
import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { saveFunctionalTests } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function PushUpsTest() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [secs, setSecs] = useState(0);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function start() {
    setRunning(true); setCount(0); setSecs(0);
    timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
  }
  function tap() { if (running) { haptic.light(); setCount((c) => c + 1); } }

  async function finish() {
    if (timer.current) clearInterval(timer.current);
    setRunning(false);
    if (count <= 0) { Alert.alert('Sin reps', 'Cuenta al menos una lagartija.'); return; }
    if (!user?.id) return;
    setSaving(true);
    const r = await saveFunctionalTests(user.id, [{ test_key: 'push_ups_max', value_primary: count, value_secondary: secs }]);
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    haptic.success();
    Alert.alert('Test completado', `${count} lagartijas en ${secs}s`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Push-ups máximas" />
      <View style={styles.content}>
        {!running && count === 0 ? (
          <View style={styles.center}>
            <EliteText variant="caption" style={styles.desc}>
              Haz el máximo de lagartijas continuas con buena técnica. Toca la pantalla por cada repetición.
              Cuando ya no puedas más, pulsa "Terminar".
            </EliteText>
            <Pressable onPress={start} style={styles.cta}><EliteText variant="body" style={styles.ctaText}>Empezar</EliteText></Pressable>
          </View>
        ) : (
          <>
            <Pressable onPress={tap} style={styles.tapArea}>
              <EliteText style={styles.count}>{count}</EliteText>
              <EliteText variant="caption" style={styles.tapHint}>toca por cada rep · {secs}s</EliteText>
            </Pressable>
            <Pressable onPress={finish} disabled={saving} style={[styles.cta, saving && { opacity: 0.6 }]}>
              <EliteText variant="body" style={styles.ctaText}>{saving ? 'Guardando…' : 'Terminar'}</EliteText>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  cta: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  tapArea: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1a1a1a', gap: Spacing.sm },
  count: { color: Colors.neonGreen, fontSize: 96, fontFamily: Fonts.extraBold },
  tapHint: { color: Colors.textSecondary },
});
