/**
 * Mi plan de entrenar (MB-27 Pieza 2) — el usuario dice UNA vez qué días
 * entrena qué, y Entrenar le contesta "hoy te toca X".
 *
 * Escribe scheduled_routines (autoasignación, mig 257) vía plan-semanal-
 * service. Las filas de rutina guardada (coach o propias) no se tocan.
 *
 * Doctrina MB-26 (test 8): guardar el plan NO revive strength en silencio.
 * Si strength está en reposo o graduado, se AVISA y el usuario decide;
 * reactivarHabitos corre solo con su sí explícito.
 *
 * "Volver a moverme" manda en el tono: dos días a la semana es una
 * asignación válida y digna, no un plan de atleta a medias.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  DIA_LABELS, DIAS_ORDEN_UI, ENFOQUES_PLAN, ENFOQUE_LABELS,
  type EnfoquePlan, type PlanSemanal,
} from '@/src/services/fitness/plan-semanal-core';
import { getAsignacionHoy, savePlanSemanal } from '@/src/services/fitness/plan-semanal-service';
import { getHabitStates, reactivarHabitos } from '@/src/services/hoy/habit-states-service';
import { estadosPorKey, estadoDe } from '@/src/services/hoy/habit-states-core';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { useAppTheme } from '@/src/contexts/theme-context';

export default function PlanEntrenamientoScreen() {
  const { user } = useAuth();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: t } = useAppTheme();
  // Regla 1 de la guía: lima como TEXTO no sobrevive el claro → teal calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const [plan, setPlan] = useState<PlanSemanal>({});
  // Audit B7: las rutinas concretas agendadas (coach o propias) se DICEN —
  // antes este editor pintaba "Descanso" sobre un lunes que sí tenía
  // "Piernas de acero" agendada.
  const [rutinasDia, setRutinasDia] = useState<Partial<Record<number, string>>>({});
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!user?.id) return () => { alive = false; };
    getAsignacionHoy(user.id).then((estado) => {
      if (alive && estado) {
        setPlan(estado.plan);
        setRutinasDia(estado.rutinasDia);
      }
    });
    return () => { alive = false; };
  }, [user?.id]));

  const toggleDia = (dow: number) => {
    haptic.light();
    setPlan((p) => {
      const next = { ...p };
      if (next[dow] !== undefined) delete next[dow];
      else next[dow] = 'full_body';
      return next;
    });
  };

  const setEnfoque = (dow: number, enfoque: EnfoquePlan) => {
    haptic.light();
    setPlan((p) => ({ ...p, [dow]: enfoque }));
  };

  const guardar = async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    const userId = user.id;
    const res = await savePlanSemanal(userId, plan);
    setBusy(false);
    if (!res.ok) {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.');
      return;
    }
    haptic.success();

    // Test 8 (VIVE: es doctrina de reposo/graduación, no de techo): la
    // asignación no revive strength en silencio — se avisa y solo el sí
    // explícito lo reactiva. MB-27 V3: el bloque del techo murió con la
    // doctrina; encender es encender.
    const dias = Object.keys(plan).length;
    if (dias > 0) {
      const estados = estadosPorKey(await getHabitStates(userId));
      const estadoStrength = estadoDe('strength', estados);
      if (estadoStrength !== 'activo') {
        const enEstado = estadoStrength === 'reposo' ? 'reposo' : 'graduado';
        const reactivar = async () => {
          await reactivarHabitos(userId, ['strength']);
          router.back();
        };
        Alert.alert(
          'Tu hábito de fuerza está en ' + enEstado,
          'Tu plan quedó guardado. ¿Quieres que Fuerza vuelva a contar en tu día? Si lo dejas como está, Entrenar igual te dice qué toca.',
          [
            { text: 'Dejarlo así', style: 'cancel', onPress: () => router.back() },
            { text: 'Volverlo a activo', onPress: () => { reactivar(); } },
          ],
        );
        return;
      }
    }
    router.back();
  };

  return (
    <Screen themed edges={[]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Mi plan de entrenar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText variant="caption" style={[s.intro, { color: t.textoSecundario }]}>
            Dilo una vez y Entrenar te contesta cada día. Toca un día para
            encenderlo o apagarlo, y elige qué toca. Dos días bien puestos
            valen más que siete en papel.
          </EliteText>
        </Animated.View>

        {DIAS_ORDEN_UI.map((dow, idx) => {
          const activo = plan[dow] !== undefined;
          const rutina = rutinasDia[dow];
          return (
            <Animated.View key={dow} entering={FadeInUp.delay(70 + idx * 30).springify()}>
              <View style={[s.diaCard, { backgroundColor: t.card, borderColor: t.borde }, activo && s.diaCardActiva]}>
                <AnimatedPressable style={s.diaHeader} onPress={() => toggleDia(dow)}>
                  <EliteText style={[s.diaNombre, { color: activo ? t.texto : t.textoTenue }]}>
                    {DIA_LABELS[dow]}
                  </EliteText>
                  <EliteText variant="caption" style={activo ? [s.diaEstadoOn, { color: acento }] : [s.diaEstadoOff, { color: t.textoTenue }]}>
                    {activo ? ENFOQUE_LABELS[plan[dow]!] : rutina ?? 'Descanso'}
                  </EliteText>
                </AnimatedPressable>
                {activo && (
                  <View style={s.chips}>
                    {ENFOQUES_PLAN.map((e) => (
                      <AnimatedPressable
                        key={e}
                        style={[s.chip, { borderColor: t.bordeMarcado }, plan[dow] === e && s.chipActiva]}
                        onPress={() => setEnfoque(dow, e)}
                      >
                        <EliteText style={[s.chipText, { color: t.textoSecundario }, plan[dow] === e && { color: acento }]}>
                          {ENFOQUE_LABELS[e]}
                        </EliteText>
                      </AnimatedPressable>
                    ))}
                  </View>
                )}
                {rutina != null && (
                  <EliteText variant="caption" style={[s.rutinaNota, { color: t.textoTenue }]}>
                    {activo
                      ? `Este día ya tiene la rutina "${rutina}" agendada, y la rutina manda sobre el enfoque.`
                      : `Rutina agendada: ${rutina}. Se maneja desde Mis rutinas, no desde aquí.`}
                  </EliteText>
                )}
              </View>
            </Animated.View>
          );
        })}

        <EliteText variant="caption" style={[s.nota, { color: t.textoTenue }]}>
          Entrenar de verdad se registra al entrenar: agendar un día no
          palomea nada por ti.
        </EliteText>

        <GradientCTA
          label={busy ? 'GUARDANDO…' : 'GUARDAR MI PLAN'}
          onPress={guardar}
          disabled={busy}
          style={s.cta}
        />
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  intro: { lineHeight: 19, marginBottom: Spacing.md },
  diaCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    marginBottom: Spacing.sm, overflow: 'hidden',
  },
  diaCardActiva: { borderColor: withOpacity(ATP_BRAND.lime, 0.35) },
  diaHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
  },
  diaNombre: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  diaEstadoOn: { fontFamily: Fonts.semiBold },
  diaEstadoOff: {},
  chips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
  },
  chip: {
    borderWidth: 1, borderRadius: 999,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  chipActiva: { borderColor: ATP_BRAND.lime, backgroundColor: withOpacity(ATP_BRAND.lime, 0.12) },
  chipText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  rutinaNota: {
    lineHeight: 17,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  },
  nota: { lineHeight: 18, textAlign: 'center', marginTop: Spacing.xs },
  cta: { marginTop: Spacing.md },
});
