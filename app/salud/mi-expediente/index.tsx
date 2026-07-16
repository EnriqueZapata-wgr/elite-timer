/**
 * MI EXPEDIENTE — timeline cronológico del registro epigenético (Mega-Sprint B · B5).
 *
 * Eje temporal que cruza síntomas (inicio/fin), intervenciones activadas, labs y
 * mediciones. Scroll cronológico agrupado por mes. Doctrina registro_epigenetico:
 * rastreo diagnóstico + motivación + ruta. ARGOS podrá leerlo (V1.1) para
 * correlacionar patrones. Exportable al médico post-beta.
 */
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { loadUserSymptoms } from '@/src/services/salud/user-symptoms-service';
import { getMyProtocol } from '@/src/services/interventions/intervention-service';
import { loadCanonicalLabValues } from '@/src/services/edad-atp/lab-values-service';
import {
  buildTimeline, groupByMonth, iconFor, shortDate,
  type TimelineEvent, type TimelineSources,
} from '@/src/services/salud/mi-expediente-core';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { ELEVATION, TEXT, TEXT_COLORS } from '@/src/constants/brand';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

const EMPTY: TimelineSources = { symptoms: [], interventionsActivated: [], labs: [], measurements: [], glucose: [], ketones: [] };

function MiExpedienteScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [symptoms, protocol, labs, glucose, ketones] = await Promise.all([
      loadUserSymptoms(user.id).catch(() => []),
      getMyProtocol(user.id).catch(() => []),
      loadCanonicalLabValues(user.id).catch(() => ({} as any)),
      supabase.from('glucose_logs').select('value_mg_dl, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(30).then(r => r.data ?? [], () => []),
      supabase.from('ketones_logs').select('value_mmol, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(30).then(r => r.data ?? [], () => []),
    ]);
    const src: TimelineSources = {
      ...EMPTY,
      symptoms: symptoms.map(s => ({ id: s.id, name: s.name, started_at: s.started_at, resolved_at: s.resolved_at, severity: s.severity })),
      interventionsActivated: protocol.map(p => ({ id: p.row.id, name: p.def.name, activated_at: (p.row as any).activated_at ?? null })),
      labs: Object.entries((labs ?? {}) as Record<string, { measured_at: string }>).map(([marker, v]) => ({ marker, measured_at: v.measured_at })),
      glucose: ((glucose as any[]) ?? []).map(g => ({ value: g.value_mg_dl, at: g.created_at })),
      ketones: ((ketones as any[]) ?? []).map(k => ({ value: k.value_mmol, at: k.created_at })),
    };
    setEvents(buildTimeline(src));
    setLoaded(true);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const groups = groupByMonth(events);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Mi Expediente" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            Tu historia en el tiempo: síntomas, intervenciones, labs y mediciones. Todo lo que ATP correlaciona.
          </EliteText>
        </Animated.View>

        {loaded && events.length === 0 && (
          <View style={s.emptyBox}>
            <EliteText style={s.emptyText}>
              Tu expediente está vacío. Registra síntomas, activa intervenciones o sube labs —
              cada acción queda aquí, en orden.
            </EliteText>
          </View>
        )}

        {groups.map((g, gi) => (
          <Animated.View key={g.month} entering={FadeInUp.delay(60 + gi * 40).springify()}>
            <EliteText style={s.monthLabel}>{g.month.toUpperCase()}</EliteText>
            {g.events.map((e) => (
              <View key={e.id} style={s.eventRow}>
                <View style={s.eventLeft}>
                  <EliteText style={s.eventIcon}>{iconFor(e.kind)}</EliteText>
                  <View style={s.eventLine} />
                </View>
                <View style={s.eventBody}>
                  <EliteText style={s.eventTitle} numberOfLines={2}>{e.title}</EliteText>
                  <EliteText style={s.eventMeta}>{shortDate(e.at)}{e.detail ? ` · ${e.detail}` : ''}</EliteText>
                </View>
              </View>
            ))}
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg, marginTop: Spacing.xs, fontFamily: Fonts.regular },
  emptyBox: { backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border, borderRadius: Radius.md, padding: Spacing.md },
  emptyText: { color: TEXT.tertiary, fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 20 },
  monthLabel: { color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  eventRow: { flexDirection: 'row', gap: Spacing.sm },
  eventLeft: { alignItems: 'center', width: 28 },
  eventIcon: { fontSize: 16 },
  eventLine: { flex: 1, width: 1.5, backgroundColor: ELEVATION[2].border, marginTop: 2 },
  eventBody: { flex: 1, paddingBottom: Spacing.md },
  eventTitle: { color: TEXT.primary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  eventMeta: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
});

export default function MiExpedienteGated() {
  return (
    <MedicalDisclaimerGate>
      <MiExpedienteScreen />
    </MedicalDisclaimerGate>
  );
}
