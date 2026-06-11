/**
 * Tests funcionales — FORMULARIO de captura (doctrina "SIMPLE vence inteligente"):
 * cada test se auto-administra fuera de la app con un reloj/cronómetro de mano y aquí
 * solo capturas el resultado, en cualquier momento. CERO flujos en vivo.
 *
 * AUDITORÍA DE KEYS (cada guardado aterriza EXACTAMENTE donde el motor v2 lee):
 *  - test_de_equilibrio_en_un_pie → matriz (Tests) → adapter balance_1leg_s
 *    (legacy 'one_leg_balance' se lee como alias en load-all-params).
 *  - sentadilla_libre             → matriz (Tests) → adapter squat_60s
 *  - plank / bolt / old_man_test / recovery_hr → MOTOR_PASSTHROUGH_FT_KEYS → adapter
 *
 * Old Man Test: el motor espera SCORE 0-10 (sit-rising), NO segundos. La versión
 * anterior guardaba segundos — esas filas legacy quedan sin alias a propósito.
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
import { saveFunctionalTests, getLatestFunctionalTests, type FunctionalTestEntry } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type FieldDef = {
  key: string; label: string; unit: string; helper: string;
  /** Claves legacy solo para PRE-LLENAR (no se reescriben). */
  legacyKeys?: string[];
  min?: number; max?: number; integer?: boolean;
};

const FIELDS: FieldDef[] = [
  {
    key: 'test_de_equilibrio_en_un_pie', label: '⚖️ Balance 1 pie', unit: 's', legacyKeys: ['one_leg_balance'],
    helper: 'Ojos cerrados, descalzo. Cronometra hasta que el pie libre toque el piso.',
    min: 1, max: 600,
  },
  {
    key: 'plank', label: '🪵 Plank', unit: 's',
    helper: 'Plancha con técnica estricta. Cronometra hasta romper la forma.',
    min: 1, max: 1200,
  },
  {
    key: 'old_man_test', label: '🧎 Old Man Test', unit: 'pts',
    helper: 'Siéntate al piso y levántate sin apoyos. Empieza en 10; resta 1 por cada mano/rodilla/antebrazo que apoyes o si pierdes el equilibrio.',
    min: 0, max: 10,
  },
  {
    key: 'bolt', label: '🫁 BOLT', unit: 's',
    helper: 'Tras una exhalación normal, tapa tu nariz y cuenta segundos hasta la PRIMERA urgencia de respirar (no aguante máximo).',
    min: 1, max: 120,
  },
  {
    key: 'sentadilla_libre', label: '🏋️ Sentadilla 60s', unit: 'reps', integer: true,
    helper: 'Máximo de sentadillas libres con buena técnica en 60 segundos.',
    min: 1, max: 120,
  },
  {
    key: 'recovery_hr', label: '❤️‍🩹 Recovery HR 1 min', unit: 'lpm', integer: true,
    helper: 'FC al terminar un esfuerzo intenso MENOS tu FC tras 1 minuto de descanso (caída = mejor recuperación).',
    min: 1, max: 100,
  },
];

export default function FunctionalTestsForm() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [v, setV] = useState<Record<string, string>>({});
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  // Pre-poblar con la última captura por test (incluye keys legacy, solo lectura).
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestFunctionalTests(user.id).then((ft) => {
      const init: Record<string, string> = {};
      for (const f of FIELDS) {
        const hit = ft[f.key] ?? f.legacyKeys?.map((lk) => ft[lk]).find((x) => x != null);
        if (hit) init[f.key] = String(hit.value);
      }
      setV(init);
      setSnapshot(init);
    });
  }, [user?.id]));

  async function handleSave() {
    if (!user?.id) return;
    // Guardar SOLO campos modificados (no reescribir todo a ciegas).
    const entries: FunctionalTestEntry[] = [];
    for (const f of FIELDS) {
      const raw = v[f.key] ?? '';
      if (raw === (snapshot[f.key] ?? '')) continue;
      if (raw.trim() === '') continue;
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) {
        Alert.alert(f.label, `Valor fuera de rango (${f.min}–${f.max} ${f.unit}).`);
        return;
      }
      entries.push({ test_key: f.key, value_primary: f.integer ? Math.round(n) : n });
    }
    if (entries.length === 0) { Alert.alert('Sin cambios', 'Modifica al menos un resultado para guardar.'); return; }
    setSaving(true);
    const r = await saveFunctionalTests(user.id, entries);
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, {
      test: 'functional_form', keys: entries.map((e) => e.test_key).join(','),
    });
    haptic.success();
    Alert.alert('', 'Resultados guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Tests funcionales" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.desc}>
          Auto-adminístrate cada test con un cronómetro cuando quieras y captura aquí tu
          resultado. Solo se guardan los campos que cambies.
        </EliteText>
        {FIELDS.map((f) => (
          <View key={f.key} style={styles.card}>
            <NumberInputRow
              label={f.label} unit={f.unit} helper={f.helper}
              value={v[f.key] ?? ''} onChangeText={(x) => set(f.key, x)}
              badge={snapshot[f.key] ? `actual ${snapshot[f.key]}` : undefined}
            />
          </View>
        ))}
        <Pressable onPress={handleSave} disabled={saving} style={[styles.cta, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.ctaText}>{saving ? 'Guardando…' : 'Guardar resultados'}</EliteText>
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
  card:{ backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  cta: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
});
