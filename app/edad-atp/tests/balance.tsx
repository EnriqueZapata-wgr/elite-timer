/**
 * Tests funcionales — Balance 1 pie, Old Man Test (sentadilla-levantada) y Plank.
 * Cronómetros guiados; guardan segundos en edad_atp_functional_tests.
 * TODO Sprint 5: Mariana formaliza rúbrica del Old Man Test.
 */
import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveFunctionalTests } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const TESTS = [
  { key: 'one_leg_balance', label: '⚖️ Balance 1 pie', desc: 'Párate en un pie con ojos cerrados. Inicia y detén al perder equilibrio.' },
  { key: 'plank', label: '🪵 Plank', desc: 'Mantén la plancha con técnica. Detén al romper la forma.' },
  { key: 'old_man_test', label: '🧎 Old Man Test', desc: 'Siéntate y levántate del piso sin apoyarte. Mide cuánto te toma.' },
];

export default function BalanceTests() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [sel, setSel] = useState(TESTS[0]);
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function toggle() {
    if (running) {
      if (timer.current) clearInterval(timer.current);
      setRunning(false);
      void save();
    } else {
      setSecs(0); setRunning(true);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    }
  }

  async function save() {
    if (!user?.id || secs <= 0) return;
    setSaving(true);
    const r = await saveFunctionalTests(user.id, [{ test_key: sel.key, value_primary: secs }]);
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: sel.key, seconds: secs });
    haptic.success();
    Alert.alert(sel.label, `${secs} segundos`, [{ text: 'OK' }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Tests de balance" />
      <View style={styles.content}>
        <View style={styles.tabs}>
          {TESTS.map((t) => (
            <Pressable key={t.key} onPress={() => { if (!running) { haptic.light(); setSel(t); setSecs(0); } }} style={[styles.tab, sel.key === t.key && styles.tabOn]}>
              <EliteText variant="caption" style={[styles.tabText, sel.key === t.key && styles.tabTextOn]}>{t.label}</EliteText>
            </Pressable>
          ))}
        </View>

        <EliteText variant="caption" style={styles.desc}>{sel.desc}</EliteText>

        <View style={styles.center}>
          <EliteText style={styles.timer}>{secs}s</EliteText>
          <Pressable onPress={toggle} disabled={saving} style={[styles.cta, running && styles.ctaStop]}>
            <EliteText variant="body" style={styles.ctaText}>{running ? 'Detener y guardar' : 'Iniciar'}</EliteText>
          </Pressable>
        </View>

        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  tabs: { flexDirection: 'row', gap: Spacing.xs },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#1a1a1a', alignItems: 'center' },
  tabOn: { borderColor: Colors.neonGreen },
  tabText: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  tabTextOn: { color: Colors.neonGreen },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  timer: { color: Colors.neonGreen, fontSize: 72, fontFamily: Fonts.extraBold },
  cta: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  ctaStop: { backgroundColor: '#E24B4A' },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
});
