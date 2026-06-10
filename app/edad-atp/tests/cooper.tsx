/**
 * Test funcional — Cooper 12 minutos. Timer + distancia GPS (opcional) → VO2max.
 * VO2max = (distancia_m − 504.9) / 44.73 (Cooper). Guarda en health_measurements.vo2max_estimate.
 * GPS requiere permiso de ubicación (app.json/build); si falta, distancia manual.
 */
import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveHealthMeasurement } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const DURATION = 12 * 60; // segundos

function haversine(a: Location.LocationObjectCoords, b: Location.LocationObjectCoords): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function CooperTest() {
  useKeepAwake();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro');
  const [remaining, setRemaining] = useState(DURATION);
  const [distanceM, setDistanceM] = useState(0);
  const [manual, setManual] = useState('');
  const [gps, setGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const sub = useRef<Location.LocationSubscription | null>(null);
  const last = useRef<Location.LocationObjectCoords | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { sub.current?.remove(); if (timer.current) clearInterval(timer.current); }, []);

  async function start() {
    setPhase('running');
    setRemaining(DURATION);
    setDistanceM(0);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setGps(true);
        sub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
          (loc) => {
            if (last.current) setDistanceM((d) => d + haversine(last.current!, loc.coords));
            last.current = loc.coords;
          },
        );
      }
    } catch { /* sin GPS → distancia manual */ }
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { finishTimer(); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  function finishTimer() {
    if (timer.current) clearInterval(timer.current);
    sub.current?.remove();
    haptic.success();
    setManual(gps ? String(Math.round(distanceM)) : '');
    setPhase('done');
  }

  async function save() {
    if (!user?.id) return;
    const d = parseFloat(manual);
    if (!Number.isFinite(d) || d <= 0) { Alert.alert('Distancia', 'Ingresa la distancia recorrida en metros.'); return; }
    const vo2 = Math.max(0, Math.round(((d - 504.9) / 44.73) * 10) / 10);
    setSaving(true);
    const r = await saveHealthMeasurement(user.id, { vo2max_estimate: vo2 });
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: 'cooper', vo2max: vo2, distance_m: Math.round(d) });
    haptic.success();
    Alert.alert('Cooper completado', `${Math.round(d)} m · VO2max ${vo2} ml/kg/min`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Cooper 12 min" />
      <View style={styles.content}>
        {phase === 'intro' && (
          <View style={styles.center}>
            <EliteText variant="caption" style={styles.desc}>
              Corre la mayor distancia posible en 12 minutos. Con GPS medimos la distancia
              automáticamente; si no, la ingresas al terminar. Mantén el teléfono contigo.
            </EliteText>
            <Pressable onPress={start} style={styles.cta}><EliteText variant="body" style={styles.ctaText}>Empezar</EliteText></Pressable>
          </View>
        )}

        {phase === 'running' && (
          <View style={styles.center}>
            <EliteText style={styles.timer}>{mm}:{ss}</EliteText>
            {gps ? (
              <EliteText variant="body" style={styles.dist}>{(distanceM / 1000).toFixed(2)} km</EliteText>
            ) : (
              <EliteText variant="caption" style={styles.desc}>Sin GPS — ingresa la distancia al terminar</EliteText>
            )}
            <Pressable onPress={finishTimer} style={styles.stopBtn}><EliteText variant="body" style={styles.stopText}>Terminar antes</EliteText></Pressable>
          </View>
        )}

        {phase === 'done' && (
          <View style={styles.center}>
            <View style={styles.card}>
              <NumberInputRow label="Distancia" unit="m" value={manual} onChangeText={setManual} helper="Metros recorridos en 12 min" />
            </View>
            <Pressable onPress={save} disabled={saving} style={[styles.cta, saving && { opacity: 0.6 }]}>
              <EliteText variant="body" style={styles.ctaText}>{saving ? 'Guardando…' : 'Guardar VO2max'}</EliteText>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  desc: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  cta: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  timer: { color: Colors.neonGreen, fontSize: 72, fontFamily: Fonts.extraBold },
  dist: { color: '#fff', fontSize: FontSizes.xl, fontFamily: Fonts.bold },
  stopBtn: { borderWidth: 1, borderColor: '#1a1a1a', borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  stopText: { color: Colors.textSecondary },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a', width: '100%' },
});
