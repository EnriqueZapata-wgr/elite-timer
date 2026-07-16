/**
 * MIS DATOS — destino ÚNICO de todo dato numérico de salud (Mega-Sprint B · B2).
 *
 * Consolida lo que estaba disperso en 8 pantallas / 2 árboles (health-input,
 * my-health, edad-atp/biomarkers|composition|vitals|labs, glucose-log,
 * ketones-log) en UN destino con secciones. Cada sección muestra el último valor
 * (dato DENTRO del destino · doctrina) y navega a su captura.
 *
 * DECISIÓN DE IMPLEMENTACIÓN (brief B2.2): NO se migran tablas — ya son canónicas
 * por tipo (health_measurements para composición+vitals, lab_values append-only
 * para labs, glucose_logs/ketones_logs para glucosa/cetonas). Mis Datos es la
 * vista/navegación consolidada · cero riesgo de pérdida de datos. La captura
 * sigue escribiendo la MISMA tabla canónica que antes.
 */
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { getLatestMeasurement } from '@/src/services/health-measurement-service';
import { loadCanonicalLabValues } from '@/src/services/edad-atp/lab-values-service';
import {
  EMPTY_SUMMARY, fmt, fmtBp, relativeDays, glucoseStatus, ketosisStatus,
  type MisDatosSummary,
} from '@/src/services/salud/mis-datos-core';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { ELEVATION, TEXT, TEXT_COLORS, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

const LEVEL_COLOR: Record<'ok' | 'warn' | 'high', string> = {
  ok: '#4ade80', warn: '#fbbf24', high: '#ef4444',
};

function MisDatosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sum, setSum] = useState<MisDatosSummary>(EMPTY_SUMMARY);

  const load = useCallback(async () => {
    if (!user?.id) return;
    // Cada fuente es fail-soft (una que falle no rompe el resto).
    const [measurement, labs, glucose, ketones] = await Promise.all([
      getLatestMeasurement(user.id).catch(() => null),
      loadCanonicalLabValues(user.id).catch(() => ({} as any)),
      supabase.from('glucose_logs').select('value_mg_dl, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle().then(r => r.data ?? null, () => null),
      supabase.from('ketones_logs').select('value_mmol, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle().then(r => r.data ?? null, () => null),
    ]);
    const labEntries = Object.values((labs ?? {}) as Record<string, { measured_at: string }>);
    const latestLabDate = labEntries.length
      ? labEntries.map(e => e.measured_at).sort().reverse()[0] : null;
    setSum({
      labsCount: labEntries.length,
      labsLatestDate: latestLabDate,
      weightKg: (measurement as any)?.weight_kg ?? null,
      bodyFatPct: (measurement as any)?.body_fat_pct ?? null,
      systolicBp: (measurement as any)?.systolic_bp ?? null,
      diastolicBp: (measurement as any)?.diastolic_bp ?? null,
      restingHr: (measurement as any)?.resting_hr ?? null,
      vo2max: (measurement as any)?.vo2max_estimate ?? null,
      glucoseMgDl: (glucose as any)?.value_mg_dl ?? null,
      glucoseAt: (glucose as any)?.created_at ?? null,
      ketonesMmol: (ketones as any)?.value_mmol ?? null,
      ketonesAt: (ketones as any)?.created_at ?? null,
    });
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const gStatus = glucoseStatus(sum.glucoseMgDl);
  const kStatus = ketosisStatus(sum.ketonesMmol);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Mis Datos" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Todos tus números de salud en un solo lugar. Cada dato se guarda una sola vez.
          </EliteText>
        </Animated.View>

        {/* Labs de sangre */}
        <Section
          idx={0} icon="flask-outline" color="#60A5FA" title="Labs de sangre"
          value={sum.labsCount > 0 ? `${sum.labsCount} parámetros` : 'Sin datos'}
          meta={sum.labsLatestDate ? `Último: ${relativeDays(sum.labsLatestDate, now)}` : 'Sube tu primer estudio'}
          onPress={() => { haptic.medium(); router.push('/edad-atp/labs' as any); }}
          onCapture={() => { haptic.medium(); router.push('/edad-atp/biomarkers' as any); }}
        />

        {/* Composición corporal */}
        <Section
          idx={1} icon="body-outline" color="#22C55E" title="Composición corporal"
          value={sum.weightKg != null ? `${fmt(sum.weightKg, 'kg', 1)} · ${fmt(sum.bodyFatPct, '%', 1)} grasa` : 'Sin datos'}
          meta="Peso · grasa · músculo · medidas"
          onPress={() => { haptic.medium(); router.push('/edad-atp/composition' as any); }}
        />

        {/* Signos vitales */}
        <Section
          idx={2} icon="pulse-outline" color="#EF4444" title="Signos vitales"
          value={sum.systolicBp != null ? `${fmtBp(sum.systolicBp, sum.diastolicBp)} mmHg · ${fmt(sum.restingHr, 'lpm')} reposo` : 'Sin datos'}
          meta={sum.vo2max != null ? `VO2max ${fmt(sum.vo2max, '', 1)}` : 'Presión · FC · VO2max'}
          onPress={() => { haptic.medium(); router.push('/edad-atp/vitals' as any); }}
        />

        {/* Glucosa */}
        <Section
          idx={3} icon="water-outline" color="#FB923C" title="Glucosa"
          value={sum.glucoseMgDl != null ? `${fmt(sum.glucoseMgDl, 'mg/dL')}` : 'Sin registros'}
          meta={gStatus ? gStatus.label : 'Registra tu glucosa'}
          metaColor={gStatus ? LEVEL_COLOR[gStatus.level] : undefined}
          onPress={() => { haptic.medium(); router.push('/glucose-log' as any); }}
        />

        {/* Cetonas */}
        <Section
          idx={4} icon="flame-outline" color="#C084FC" title="Cetonas en sangre"
          value={sum.ketonesMmol != null ? `${fmt(sum.ketonesMmol, 'mmol/L', 1)}` : 'Sin registros'}
          meta={kStatus ? kStatus.label : 'Registra tus cetonas'}
          metaColor={kStatus ? LEVEL_COLOR[kStatus.level] : undefined}
          onPress={() => { haptic.medium(); router.push('/ketones-log' as any); }}
        />

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

function Section({ idx, icon, color, title, value, meta, metaColor, onPress, onCapture }: {
  idx: number; icon: string; color: string; title: string; value: string;
  meta: string; metaColor?: string; onPress: () => void; onCapture?: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(80 + idx * 45).springify()}>
      <AnimatedPressable onPress={onPress} style={s.card}>
        <View style={[s.iconWrap, { backgroundColor: withOpacity(color, 0.15) }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <EliteText style={s.cardTitle}>{title}</EliteText>
          <EliteText style={s.cardValue}>{value}</EliteText>
          <EliteText style={[s.cardMeta, metaColor ? { color: metaColor } : null]}>{meta}</EliteText>
        </View>
        {onCapture ? (
          <AnimatedPressable onPress={onCapture} style={s.captureBtn} hitSlop={6}>
            <Ionicons name="add" size={18} color="#000" />
          </AnimatedPressable>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg, marginTop: Spacing.xs, fontFamily: Fonts.regular },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: TEXT.secondary },
  cardValue: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: 1 },
  cardMeta: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2 },
  captureBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: ATP_BRAND.lime, alignItems: 'center', justifyContent: 'center' },
});

export default function MisDatosGated() {
  return (
    <MedicalDisclaimerGate>
      <MisDatosScreen />
    </MedicalDisclaimerGate>
  );
}
