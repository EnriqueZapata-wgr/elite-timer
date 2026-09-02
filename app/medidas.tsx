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
import { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function MedidasScreen() {
  const { user } = useAuth();
  // 31-ago-2026 (21.3): la migración del 21-ago dejó la pantalla leyendo
  // useSurfaceTokens a nivel de RUTA. El <ThemeReady> que abre el claro lo
  // monta <Screen themed> más abajo, así que a esta altura el scope no existe
  // y el hook devolvía THEME_DARK siempre: lienzo claro con cards y texto del
  // oscuro encima. Por eso "seguía en negro". La ruta lee el tema GLOBAL
  // (manual cap. 5, candado 3a de mb31b-remate).
  const { kind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
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
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
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
                // El lima contrasta 1.34 sobre fondo claro: una línea de
                // gráfica en lima ahí es una línea invisible.
                color={kind === 'dark' ? ATP_BRAND.lime : t.tealTexto}
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

/**
 * 21-ago-2026 — migrada al tema. Antes usaba TEXT y ELEVATION, que son las
 * constantes del modo OSCURO: quien eligiera claro abría esta pantalla y la
 * veía negra. No era color clavado suelto, era una pantalla entera sin migrar.
 *
 * Los textos tenues (TEXT.tertiary) pasan a textoSecundario, no a textoTenue:
 * ese token contrasta 3.19 en claro y aquí lleva texto de leer, no etiquetas
 * grandes ni cosas deshabilitadas.
 */
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  card: {
    backgroundColor: t.card, borderRadius: Radius.card,
    borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: t.textoSecundario, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  heroKg: { color: t.texto, fontFamily: Fonts.extraBold, fontSize: 44, lineHeight: 48 },
  heroUnit: { color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, marginBottom: 8 },
  delta: { color: t.textoSecundario, marginTop: 2 },
  empty: { color: t.textoSecundario, lineHeight: 18, marginTop: 2 },
  chartWrap: { marginTop: Spacing.md, alignItems: 'center' },
  cta: { marginTop: Spacing.md },
  fila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  filaDivider: { borderBottomWidth: 1, borderBottomColor: t.borde },
  filaLabel: { color: t.textoSecundario, fontFamily: Fonts.regular, fontSize: FontSizes.md },
  filaValor: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  secundario: {
    marginTop: Spacing.sm, borderWidth: 1, borderColor: t.bordeMarcado,
    borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center',
  },
  secundarioText: { color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  nota: { color: t.textoSecundario, textAlign: 'center', lineHeight: 18 },
});
