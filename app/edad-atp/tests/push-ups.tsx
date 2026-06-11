/**
 * Test funcional — Push-ups máximas. FORMULARIO (doctrina "SIMPLE vence inteligente"):
 * haz el test cuando quieras y captura aquí tu resultado.
 * Guarda en edad_atp_functional_tests (test_key push_ups_max — la key que el motor
 * lee vía loadUserData.push_ups_max → adapter push_ups).
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
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveFunctionalTests, getLatestFunctionalTests } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function PushUpsTest() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [reps, setReps] = useState('');
  const [last, setLast] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestFunctionalTests(user.id).then((ft) => setLast(ft.push_ups_max?.value ?? null));
  }, [user?.id]));

  async function save() {
    if (!user?.id) return;
    const n = Math.round(parseFloat(reps));
    if (!Number.isFinite(n) || n < 1 || n > 200) { Alert.alert('Reps', 'Ingresa tus repeticiones (1–200).'); return; }
    setSaving(true);
    const r = await saveFunctionalTests(user.id, [{ test_key: 'push_ups_max', value_primary: n }]);
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: 'push_ups', count: n });
    haptic.success();
    Alert.alert('Resultado guardado', `${n} lagartijas`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Push-ups máximas" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.desc}>
          Cómo hacerlo: máximo de lagartijas CONTINUAS con buena técnica (pecho casi al
          piso, cuerpo en línea). Sin pausas largas. Captura aquí tu resultado.
        </EliteText>
        <View style={styles.card}>
          <NumberInputRow
            label="Lagartijas continuas" unit="reps" value={reps} onChangeText={setReps}
            badge={last != null ? `actual ${last}` : undefined}
          />
        </View>
        <Pressable onPress={save} disabled={saving} style={[styles.cta, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.ctaText}>{saving ? 'Guardando…' : 'Guardar resultado'}</EliteText>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  cta: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
});
