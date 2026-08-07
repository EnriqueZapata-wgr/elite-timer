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
import { evaluarTechoEncendido } from '@/src/services/hoy/techo-service';
import { ELEVATION, TEXT, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function PlanEntrenamientoScreen() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanSemanal>({});
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!user?.id) return () => { alive = false; };
    getAsignacionHoy(user.id).then((estado) => {
      if (alive && estado) setPlan(estado.plan);
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

    // Test 8: la asignación no revive strength en silencio. Si está en
    // reposo o graduado se avisa, y solo el sí del usuario lo reactiva.
    // Audit B3: esta es una PUERTA DE ENCENDIDO — pasa por el techo ANTES
    // de ofrecer, como las otras tres (contrato de techo-service). Si el
    // día ya está lleno, el aviso lo dice y se respeta la decisión.
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
        const avisoTecho = await evaluarTechoEncendido(userId, ['strength']);
        if (avisoTecho) {
          Alert.alert(
            'Tu plan quedó guardado, y tu día ya está lleno',
            `Volver Fuerza a activo te deja en ${avisoTecho.total} hábitos y el techo que protege tu día es ${avisoTecho.techo}. ` +
              `Si lo dejas en ${enEstado}, Entrenar igual te dice qué toca.` +
              (avisoTecho.candidatos.length > 0
                ? ` Lo que más te ha costado: ${avisoTecho.candidatos.map((c) => c.name).join(', ')}.`
                : ''),
            [
              { text: 'Dejarlo así', style: 'cancel', onPress: () => router.back() },
              { text: 'Encenderlo igual', onPress: () => { reactivar(); } },
            ],
          );
          return;
        }
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
    <Screen edges={[]}>
      <ScreenHeader title="Mi plan de entrenar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText variant="caption" style={s.intro}>
            Dilo una vez y Entrenar te contesta cada día. Toca un día para
            encenderlo o apagarlo, y elige qué toca. Dos días bien puestos
            valen más que siete en papel.
          </EliteText>
        </Animated.View>

        {DIAS_ORDEN_UI.map((dow, idx) => {
          const activo = plan[dow] !== undefined;
          return (
            <Animated.View key={dow} entering={FadeInUp.delay(70 + idx * 30).springify()}>
              <View style={[s.diaCard, activo && s.diaCardActiva]}>
                <AnimatedPressable style={s.diaHeader} onPress={() => toggleDia(dow)}>
                  <EliteText style={[s.diaNombre, !activo && { color: TEXT.tertiary }]}>
                    {DIA_LABELS[dow]}
                  </EliteText>
                  <EliteText variant="caption" style={activo ? s.diaEstadoOn : s.diaEstadoOff}>
                    {activo ? ENFOQUE_LABELS[plan[dow]!] : 'Descanso'}
                  </EliteText>
                </AnimatedPressable>
                {activo && (
                  <View style={s.chips}>
                    {ENFOQUES_PLAN.map((e) => (
                      <AnimatedPressable
                        key={e}
                        style={[s.chip, plan[dow] === e && s.chipActiva]}
                        onPress={() => setEnfoque(dow, e)}
                      >
                        <EliteText style={[s.chipText, plan[dow] === e && s.chipTextActiva]}>
                          {ENFOQUE_LABELS[e]}
                        </EliteText>
                      </AnimatedPressable>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}

        <EliteText variant="caption" style={s.nota}>
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
  intro: { color: TEXT.secondary, lineHeight: 19, marginBottom: Spacing.md },
  diaCard: {
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card,
    borderWidth: 1, borderColor: ELEVATION[1].border,
    marginBottom: Spacing.sm, overflow: 'hidden',
  },
  diaCardActiva: { borderColor: withOpacity(ATP_BRAND.lime, 0.35) },
  diaHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
  },
  diaNombre: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  diaEstadoOn: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold },
  diaEstadoOff: { color: TEXT.tertiary },
  chips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
  },
  chip: {
    borderWidth: 1, borderColor: ELEVATION[2].border, borderRadius: 999,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  chipActiva: { borderColor: ATP_BRAND.lime, backgroundColor: withOpacity(ATP_BRAND.lime, 0.12) },
  chipText: { color: TEXT.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  chipTextActiva: { color: ATP_BRAND.lime },
  nota: { color: TEXT.tertiary, lineHeight: 18, textAlign: 'center', marginTop: Spacing.xs },
  cta: { marginTop: Spacing.md },
});
