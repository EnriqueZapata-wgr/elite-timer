/**
 * Edad ATP — test cognitivo (placeholder Sprint 2). El test interactivo de
 * Reaction Time viene en Sprint 4; por ahora permite ingresar RT manual.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { saveFunctionalTests, getLatestFunctionalTests, type FunctionalTestEntry } from '@/src/services/edad-atp/capture-service';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

export default function CognitiveCapture() {
  const { user } = useAuth();
  const [simple, setSimple] = useState('');
  const [choice, setChoice] = useState('');
  const [last, setLast] = useState<{ simple?: number; choice?: number; ago?: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestFunctionalTests(user.id).then((ft) => {
      const s = ft.reaction_time_simple;
      const c = ft.reaction_time_choice;
      if (!s && !c) return;
      setLast({ simple: s?.value, choice: c?.value, ago: (s ?? c) ? daysAgo((s ?? c)!.measured_at) : undefined });
      if (s) setSimple(String(s.value));
      if (c) setChoice(String(c.value));
    });
  }, [user?.id]));

  async function handleSave() {
    if (!user?.id) return;
    const entries: FunctionalTestEntry[] = [];
    const s = parseFloat(simple);
    const c = parseFloat(choice);
    if (Number.isFinite(s)) entries.push({ test_key: 'reaction_time_simple', value_primary: s });
    if (Number.isFinite(c)) entries.push({ test_key: 'reaction_time_choice', value_primary: c });
    if (entries.length === 0) { Alert.alert('Sin datos', 'Ingresa al menos un tiempo de reacción.'); return; }
    setSaving(true);
    const result = await saveFunctionalTests(user.id, entries);
    setSaving(false);
    if (!result.ok) { Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.'); return; }
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="mind" title="Test cognitivo" />
      <ScrollView contentContainerStyle={styles.content}>
        {last ? (
          <View style={styles.lastCard}>
            <EliteText variant="body" style={styles.lastTitle}>Último test{last.ago != null ? ` · hace ${last.ago}d` : ''}</EliteText>
            <EliteText variant="caption" style={styles.lastVals}>
              {last.simple != null ? `RT simple ${last.simple}ms` : ''}{last.simple != null && last.choice != null ? '  ·  ' : ''}{last.choice != null ? `RT choice ${last.choice}ms` : ''}
            </EliteText>
          </View>
        ) : null}

        <Pressable onPress={() => { haptic.medium(); router.push('/edad-atp/tests/reaction-time' as any); }} style={styles.testBtn}>
          <EliteText variant="body" style={styles.testBtnText}>{last ? 'Volver a hacer test interactivo' : 'Hacer test interactivo'}</EliteText>
        </Pressable>

        <View style={styles.infoCard}>
          <EliteText variant="body" style={styles.infoTitle}>Tiempo de reacción (Deary-Liewald)</EliteText>
          <EliteText variant="caption" style={styles.infoText}>
            Haz el test interactivo arriba, o ingresa tu RT manual si lo tienes de otra app.
          </EliteText>
        </View>
        <View style={styles.card}>
          <NumberInputRow label="RT simple" unit="ms" value={simple} onChangeText={setSimple} helper="Estímulo único" />
          <NumberInputRow label="RT choice" unit="ms" value={choice} onChangeText={setChoice} helper="4 opciones" />
        </View>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  lastCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(168,224,42,0.35)' },
  lastTitle: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  lastVals: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  testBtn: { borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  testBtnText: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  infoCard: { backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: Radius.card, padding: Spacing.md, gap: 6 },
  infoTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  infoText: { color: Colors.textSecondary, fontSize: FontSizes.xs, lineHeight: 18 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
