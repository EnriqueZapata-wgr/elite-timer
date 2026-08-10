/**
 * Test Old Man (Sit-Rise Test) — siéntate y levántate del piso sin apoyos.
 *
 * IMPORTANTE: el motor v2 (area-fitness scoreOldMan) puntúa este test en la escala 0–10
 * de PUNTOS (sit-rise), NO en segundos. Empiezas en 10 y restas 1 por cada apoyo (mano,
 * rodilla, antebrazo) o pérdida de equilibrio al bajar y al subir. 10 pts = perfecto.
 * (El task lo describía en segundos; capturar segundos alimentaría basura al scorer 0–10.
 *  Ver flag en COWORK_REPORT.md.)
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveKinematicTest, getLatestKinematicTests } from '@/src/services/edad-atp/kinematic-tests-service';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { TEXT } from '@/src/constants/brand';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function TestOldManScreen() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [points, setPoints] = useState('');
  const [last, setLast] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestKinematicTests(user.id).then((m) => setLast(m.old_man_test?.value ?? null));
  }, [user?.id]));

  async function handleSave() {
    if (!user?.id) return;
    const n = parseDecimalInput(points);
    if (n == null || n < 0 || n > 10) { Alert.alert('Puntos', 'Ingresa un puntaje de 0 a 10.'); return; }
    const value = Math.round(n);
    setSaving(true);
    const r = await saveKinematicTest(user.id, 'old_man_test', value, 'points');
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', r.error ?? 'No se pudo guardar.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: 'old_man_test', value, source: 'cinematic' });
    haptic.success();
    Alert.alert('', `${value}/10 guardado ✓`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Old Man Test" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>
          Sin usar manos, siéntate en el piso y vuelve a ponerte de pie. Empiezas con 10 puntos y restas 1 por cada apoyo (mano, rodilla, antebrazo) o pérdida de equilibrio.
        </EliteText>
        <Pressable onPress={() => { haptic.light(); setHelpOpen(true); }} style={styles.helpLink}>
          <Ionicons name="help-circle-outline" size={16} color={TEXT.secondary} />
          <EliteText variant="caption" style={styles.helpLinkText}>¿Cómo se puntúa?</EliteText>
        </Pressable>
        <View style={styles.card}>
          <NumberInputRow
            label="Puntaje sit-rise" unit="pts (0–10)" value={points} onChangeText={setPoints}
            helper="10 = sin ningún apoyo. Resta 1 por cada mano/rodilla/antebrazo apoyado."
            badge={last != null ? `actual ${last}` : undefined}
          />
        </View>
        <GradientCTA label={saving ? 'GUARDANDO…' : 'GUARDAR RESULTADO'} pillar="fitness" onPress={handleSave} disabled={saving} style={styles.saveBtn} />
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </ScrollView>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <EliteText variant="body" style={styles.modalTitle}>Sit-Rise Test (Brito 2014)</EliteText>
            <EliteText variant="caption" style={styles.modalBody}>
              {'Desde de pie, baja a sentarte en el piso con piernas cruzadas y vuelve a levantarte, sin usar manos, rodillas, antebrazos ni costados como apoyo.\n\nEmpiezas con 10 puntos:\n• −1 por cada apoyo de mano, rodilla o antebrazo.\n• −1 si pierdes el equilibrio.\n\nPredictor validado de mortalidad por todas las causas. 10/10 = óptimo.'}
            </EliteText>
            <GradientCTA label="Entendido" onPress={() => setHelpOpen(false)} style={styles.modalClose} />
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
  helpLinkText: { color: TEXT.secondary, fontFamily: Fonts.semiBold },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  saveBtn: { marginTop: Spacing.md },
  backBtn: { paddingVertical: Spacing.sm, alignItems: 'center' },
  backText: { color: Colors.textSecondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: '#0d0d0d', borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1, borderColor: '#222', gap: Spacing.sm },
  modalTitle: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  modalBody: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  modalClose: { marginTop: Spacing.xs },
});
