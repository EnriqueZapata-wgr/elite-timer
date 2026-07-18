/**
 * Test funcional — Cooper 12 min. FORMULARIO (doctrina "SIMPLE vence inteligente"):
 * el test se auto-administra fuera de la app (pista o caminadora, 12 minutos); aquí
 * solo CAPTURAS tu resultado, en cualquier momento.
 *
 *   VO2max estimado = (metros − 504.9) / 44.73   (Cooper 1968)
 *
 * Campo alterno "VO2max directo": si tu wearable/laboratorio te da el dato, GANA
 * sobre el estimado por distancia. Guarda en health_measurements.vo2max_estimate —
 * exactamente la fuente que el motor v2 ya lee (loadUserData → vo2max_ml_kg_min).
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveHealthMeasurement, getLatestHealthMeasurement } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

/** VO2max (ml/kg/min) por fórmula de Cooper; null si la distancia no es válida. */
function vo2FromDistance(meters: number): number | null {
  if (!Number.isFinite(meters) || meters < 505 || meters > 5000) return null;
  return Math.round(((meters - 504.9) / 44.73) * 10) / 10;
}

export default function CooperTest() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  // ?return=vitals: el usuario vino desde Mediciones a medir su VO2max → volver con el valor.
  const { return: returnTo } = useLocalSearchParams<{ return?: string }>();
  const [meters, setMeters] = useState('');
  const [vo2Direct, setVo2Direct] = useState('');
  const [current, setCurrent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getLatestHealthMeasurement(user.id).then((row) => setCurrent(row?.vo2max_estimate ?? null));
  }, [user?.id]));

  const estimated = vo2FromDistance(parseFloat(meters));
  const direct = parseFloat(vo2Direct);
  const hasDirect = Number.isFinite(direct) && direct > 0;
  const finalVo2 = hasDirect ? Math.round(direct * 10) / 10 : estimated;

  async function save() {
    if (!user?.id) return;
    if (finalVo2 == null) {
      Alert.alert('Datos', 'Ingresa los metros recorridos en 12 min (505–5000) o un VO2max directo.');
      return;
    }
    setSaving(true);
    const r = await saveHealthMeasurement(user.id, { vo2max_estimate: finalVo2 });
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, {
      test: 'cooper', vo2max: finalVo2, source: hasDirect ? 'direct' : 'distance',
    });
    haptic.success();
    // Si vino desde Mediciones, regresar con el valor pre-llenado para confirmar (FIX 3).
    if (returnTo === 'vitals') {
      router.replace(`/edad-atp/vitals?focus=vo2max_estimate&prefill=${finalVo2}`);
      return;
    }
    Alert.alert('VO2max guardado', `${finalVo2} ml/kg/min`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Cooper 12 min" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.desc}>
          Cómo hacerlo: en pista o caminadora, corre/camina la MAYOR distancia posible en
          12 minutos. Hazlo cuando quieras — aquí solo capturas tu resultado.
        </EliteText>

        <View style={styles.card}>
          <NumberInputRow
            label="Distancia en 12 min" unit="m" value={meters} onChangeText={setMeters}
            helper="Metros recorridos (pista de 400 m: vueltas × 400)"
          />
          {estimated != null ? (
            <EliteText variant="caption" style={styles.derived}>VO2max estimado: {estimated} ml/kg/min</EliteText>
          ) : null}
        </View>

        <View style={styles.card}>
          <NumberInputRow
            label="VO2max directo" unit="ml/kg/min" value={vo2Direct} onChangeText={setVo2Direct}
            helper="Opcional — de tu wearable o prueba de esfuerzo. Si lo llenas, gana."
            badge={current != null ? `actual ${current}` : undefined}
          />
        </View>

        <Pressable onPress={save} disabled={saving} style={[styles.cta, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.ctaText}>
            {saving ? 'Guardando…' : finalVo2 != null ? `Guardar VO2max ${finalVo2}` : 'Guardar VO2max'}
          </EliteText>
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
  derived: { color: Colors.neonGreen, fontSize: FontSizes.xs, textAlign: 'right', marginTop: 2 },
  cta: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
});
