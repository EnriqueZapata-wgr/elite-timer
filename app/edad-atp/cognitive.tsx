/**
 * Edad ATP — test cognitivo (placeholder Sprint 2). El test interactivo de
 * Reaction Time viene en Sprint 4; por ahora permite ingresar RT manual.
 */
import { useState, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { saveFunctionalTests, getLatestFunctionalTests, type FunctionalTestEntry } from '@/src/services/edad-atp/capture-service';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

export default function CognitiveCapture() {
  // MB-31B remate: tokens del tema (oscuro idéntico; claro = acero).
  const { kind, tokens: t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
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
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
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

        <GradientCTA
          label={last ? 'VOLVER A HACER EL TEST' : 'HACER TEST INTERACTIVO'}
          pillar="mind"
          onPress={() => router.push('/edad-atp/tests/reaction-time')}
        />

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
        <GradientCTA label={saving ? 'GUARDANDO…' : 'GUARDAR'} onPress={handleSave} disabled={saving} style={styles.saveBtn} />
      </ScrollView>
    </Screen>
  );
}

// MB-31B remate: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  lastCard: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(168,224,42,0.35)' },
  lastTitle: { color: t.texto, fontFamily: Fonts.semiBold },
  lastVals: { color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: 2 },
  infoCard: { backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: Radius.card, padding: Spacing.md, gap: 6 },
  infoTitle: { color: t.texto, fontFamily: Fonts.bold },
  infoText: { color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 18 },
  card: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: t.borde },
  saveBtn: { marginTop: Spacing.sm },
});
