/**
 * Medidas (MB-27 Pieza 1) — la app de peso y medidas del usuario.
 *
 * Desbloquea "Bajar grasa": el pack cuyo resultado no se podía ver. Lee la
 * tabla canónica (health_measurements, dictamen 1.1) y NO captura nada aquí:
 * la puerta de captura es /edad-atp/composition — peso rápido con ?focus
 * (menos de diez segundos), medidas completas sin focus. Cero terceras
 * pantallas de captura.
 *
 * ⚠️ La gráfica no promete nada: muestra la tendencia, no la califica ni la
 * declara resultado de nada. Cero declaración médica.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { EliteText } from '@/components/elite-text';
import { SimpleLineChart } from '@/src/components/charts/SimpleCharts';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getMeasurementHistory } from '@/src/services/health-measurement-service';
import {
  serieDePeso, ultimoPeso, resumenMedidas, ultimaGrasa,
  type MedicionRow, type PuntoPeso, type UltimoPeso, type MedidaResumen,
} from '@/src/services/cuerpo/medidas-core';
import { ELEVATION, TEXT, ATP_BRAND } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function MedidasScreen() {
  const { user } = useAuth();
  const [serie, setSerie] = useState<PuntoPeso[]>([]);
  const [ultimo, setUltimo] = useState<UltimoPeso | null>(null);
  const [medidas, setMedidas] = useState<MedidaResumen[]>([]);
  // MB-27 menor 8: el alias 'grasa' promete → la pantalla cumple.
  const [grasa, setGrasa] = useState<{ pct: number; date: string } | null>(null);
  const [cargado, setCargado] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!user?.id) return () => { alive = false; };
    getMeasurementHistory(user.id, 90).then((rows) => {
      if (!alive) return;
      const data = rows as MedicionRow[];
      setSerie(serieDePeso(data));
      setUltimo(ultimoPeso(data));
      setMedidas(resumenMedidas(data));
      setGrasa(ultimaGrasa(data));
      setCargado(true);
    }).catch(() => { if (alive) setCargado(true); });
    return () => { alive = false; };
  }, [user?.id]));

  const registrarPeso = () => {
    haptic.light();
    router.push('/edad-atp/composition?focus=weight_kg');
  };

  const medidasCompletas = () => {
    haptic.light();
    router.push('/edad-atp/composition');
  };

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Medidas" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── El dato: tu peso, y cómo se ha movido ── */}
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.card}>
          <EliteText style={s.sectionTitle}>PESO</EliteText>
          {ultimo ? (
            <>
              <View style={s.heroRow}>
                <EliteText style={s.heroKg}>{ultimo.kg}</EliteText>
                <EliteText style={s.heroUnit}>kg</EliteText>
              </View>
              {ultimo.deltaKg != null && ultimo.deltaKg !== 0 && (
                <EliteText variant="caption" style={s.delta}>
                  {ultimo.deltaKg > 0 ? '+' : ''}{ultimo.deltaKg} kg desde tu medición anterior
                </EliteText>
              )}
            </>
          ) : (
            <EliteText variant="caption" style={s.empty}>
              {cargado
                ? 'Todavía no registras tu peso. El primer registro toma segundos.'
                : ' '}
            </EliteText>
          )}
          {serie.length >= 2 && (
            <View style={s.chartWrap}>
              <SimpleLineChart
                data={serie.map(({ label, value }) => ({ label, value }))}
                color={ATP_BRAND.lime}
                height={120}
              />
            </View>
          )}
          {ultimo && serie.length < 2 && (
            <EliteText variant="caption" style={s.empty}>
              Con dos registros aparece aquí tu tendencia.
            </EliteText>
          )}
          <GradientCTA label="REGISTRAR PESO" onPress={registrarPeso} style={s.cta} />
        </Animated.View>

        {/* ── Las medidas: lentas y ocasionales, sin competir con el peso ── */}
        <Animated.View entering={FadeInUp.delay(90).springify()} style={s.card}>
          <EliteText style={s.sectionTitle}>MEDIDAS</EliteText>
          {grasa != null && (
            <View style={[s.fila, (medidas.length > 0) && s.filaDivider]}>
              <EliteText style={s.filaLabel}>Grasa corporal</EliteText>
              <EliteText style={s.filaValor}>{grasa.pct} %</EliteText>
            </View>
          )}
          {medidas.length > 0 ? (
            medidas.map((m, i) => (
              <View key={m.key} style={[s.fila, i < medidas.length - 1 && s.filaDivider]}>
                <EliteText style={s.filaLabel}>{m.label}</EliteText>
                <EliteText style={s.filaValor}>{m.cm} cm</EliteText>
              </View>
            ))
          ) : (
            <EliteText variant="caption" style={s.empty}>
              {cargado ? 'Sin medidas registradas todavía. Cinta métrica y dos minutos.' : ' '}
            </EliteText>
          )}
          <AnimatedPressable style={s.secundario} onPress={medidasCompletas}>
            <EliteText style={s.secundarioText}>
              {medidas.length > 0 ? 'Actualizar medidas' : 'Tomar mis medidas'}
            </EliteText>
          </AnimatedPressable>
        </Animated.View>

        <EliteText variant="caption" style={s.nota}>
          Todo se guarda en tu expediente de Salud, una fila por día. Tu
          historial no se toca.
        </EliteText>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  card: {
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card,
    borderWidth: 1, borderColor: ELEVATION[1].border,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  heroKg: { color: TEXT.primary, fontFamily: Fonts.extraBold, fontSize: 44, lineHeight: 48 },
  heroUnit: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, marginBottom: 8 },
  delta: { color: TEXT.secondary, marginTop: 2 },
  empty: { color: TEXT.tertiary, lineHeight: 18, marginTop: 2 },
  chartWrap: { marginTop: Spacing.md, alignItems: 'center' },
  cta: { marginTop: Spacing.md },
  fila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  filaDivider: { borderBottomWidth: 1, borderBottomColor: ELEVATION[1].border },
  filaLabel: { color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: FontSizes.md },
  filaValor: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  secundario: {
    marginTop: Spacing.sm, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center',
  },
  secundarioText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  nota: { color: TEXT.tertiary, textAlign: 'center', lineHeight: 18 },
});
