/**
 * Edad ATP — test cognitivo (placeholder Sprint 2). El test interactivo de
 * Reaction Time viene en Sprint 4; por ahora permite ingresar RT manual.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { saveFunctionalTests, type FunctionalTestEntry } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function CognitiveCapture() {
  const { user } = useAuth();
  const [simple, setSimple] = useState('');
  const [choice, setChoice] = useState('');
  const [saving, setSaving] = useState(false);

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
        <View style={styles.infoCard}>
          <EliteText variant="body" style={styles.infoTitle}>Tiempo de reacción (Deary-Liewald)</EliteText>
          <EliteText variant="caption" style={styles.infoText}>
            El test interactivo estará disponible en una próxima versión. Por ahora puedes ingresar tu RT
            manual si lo tienes de otra app.
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
  infoCard: { backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: Radius.card, padding: Spacing.md, gap: 6 },
  infoTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  infoText: { color: Colors.textSecondary, fontSize: FontSizes.xs, lineHeight: 18 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
