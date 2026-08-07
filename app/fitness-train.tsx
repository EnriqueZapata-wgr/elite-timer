/**
 * Entrenar (MB-3.5 #7) — UNA acción primaria + grupo secundario chico.
 *
 * Antes: 7 destinos de peso igual (generador, ARGOS hero, mis rutinas, builder,
 * timer, HIIT, log suelto) — "varias cosas mandan a lo mismo". Simple beats smart:
 *  · Primaria: EMPEZAR SESIÓN DE HOY → generador determinista (la base gratis).
 *  · Secundarias: Mis rutinas · Construir · HIIT y timers · Registrar suelto.
 *  · ARGOS ya no es puerta hermana del generador — vive DENTRO del resultado
 *    ("ARGOS, ajústala"): el algoritmo arma el esqueleto, ARGOS es capa premium.
 *  · Timer rápido retirado como destino (duplicaba a HIIT, que trae Tabata/EMOM/
 *    AMRAP/30-30 con voz); /timer sigue ruteado para deep-links.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  DIA_LABELS, esEnfoquePlan, tituloDeAsignacion, diaSemanaLocal,
} from '@/src/services/fitness/plan-semanal-core';
import { getAsignacionHoy, type EstadoAsignacionHoy } from '@/src/services/fitness/plan-semanal-service';
import { getCycleInfo, PHASES } from '@/src/services/cycle-service';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, SEMANTIC, CATEGORY_COLORS, ELEVATION, withOpacity } from '@/src/constants/brand';

// MB-3.6 §4.2: colores de brand.ts (antes hex crudos); "y timers" fuera del
// copy — /timer murió (Bloque 1), HIIT es la casa de los intervalos.
const SECUNDARIOS = [
  { name: 'Mis rutinas', subtitle: 'Rutinas guardadas listas para ejecutar', icon: 'list-outline' as const, color: CATEGORY_COLORS.fitness, route: '/my-routines' as const },
  { name: 'Construir rutina', subtitle: 'Crea tu rutina desde cero', icon: 'construct-outline' as const, color: SEMANTIC.info, route: '/builder' as const, params: { mode: 'routine' } },
  { name: 'HIIT', subtitle: 'Tabata · EMOM · AMRAP · 30/30 con voz', icon: 'flame-outline' as const, color: SEMANTIC.error, route: '/fitness-hiit' as const },
  { name: 'Registrar ejercicio', subtitle: 'Registra series, reps y peso', icon: 'add-circle-outline' as const, color: ATP_BRAND.teal, route: '/log-exercise' as const },
];

export default function FitnessTrainScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-27 P2: la asignación del día. null = sin leer o lectura fallida —
  // la pantalla se comporta EXACTAMENTE como antes (degrada callada).
  const [asignacion, setAsignacion] = useState<EstadoAsignacionHoy | null>(null);
  // MB-27 P3: la fase del ciclo llega a Entrenar. getCycleInfo se auto-gatea
  // (canAccessCycle: solo mujer en modo propio, con datos). null = esta
  // pantalla se comporta EXACTAMENTE como hoy: nada que pedir, nada que
  // esconder — degrada callada (3.3).
  const [fase, setFase] = useState<{
    phase: string; day: number; cycleLen: number;
    largoFuente: 'observado' | 'ajuste'; cyclesUsed: number;
  } | null>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (!user?.id) return () => { alive = false; };
    getAsignacionHoy(user.id).then((estado) => { if (alive) setAsignacion(estado); });
    // MB-27 menor 7: fail-CLOSED — info null (acompañante, sin datos, dato
    // viejo) LIMPIA la tira; antes el estado anterior se quedaba pintado al
    // cambiar de modo sin desmontar.
    getCycleInfo(user.id)
      .then((info) => {
        if (alive) {
          setFase(info ? {
            phase: info.currentPhase, day: info.currentDay, cycleLen: info.cycleLen,
            largoFuente: info.largoFuente, cyclesUsed: info.cyclesUsed,
          } : null);
        }
      })
      .catch(() => { if (alive) setFase(null); });
    return () => { alive = false; };
  }, [user?.id]));

  function nav(item: typeof SECUNDARIOS[number]) {
    haptic.medium();
    if (item.params) {
      router.push({ pathname: item.route, params: item.params });
    } else {
      router.push(item.route);
    }
  }

  // El hero contesta: hoy toca X / hoy descansas / configura tu plan.
  const hoy = asignacion?.hoy ?? null;
  const empezarHoy = () => {
    haptic.medium();
    if (hoy?.focus && esEnfoquePlan(hoy.focus)) {
      router.push(`/routine-generator?enfoque=${hoy.focus}`);
    } else if (hoy?.routine_id) {
      // MB-27 menor 9: abre LA rutina asignada directo (auto-open en
      // /my-routines), no la lista para volver a buscarla.
      router.push({ pathname: '/my-routines', params: { abrir: hoy.routine_id } });
    } else {
      router.push('/routine-generator');
    }
  };
  const heroKicker = hoy
    ? 'TU PLAN DE HOY'
    : asignacion?.tienePlan
      ? 'HOY DESCANSAS'
      : 'OBJETIVO + EQUIPO + TIEMPO';
  const heroTitle = hoy ? `HOY TE TOCA ${tituloDeAsignacion(hoy).toUpperCase()}` : 'EMPEZAR SESIÓN DE HOY';
  const proxima = asignacion?.proxima ?? null;
  const heroCta = hoy
    ? 'Empezar'
    : proxima
      ? `Próximo: ${DIA_LABELS[diaSemanaLocal(proxima.date)]} · ${tituloDeAsignacion(proxima.row)}`
      : 'Generar mi rutina';

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Entrenar" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* LA acción primaria: sesión de hoy (molde editorial, protagonista) */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <AnimatedPressable onPress={empezarHoy}>
            <ImageBackground
              source={require('@/assets/images/agenda/entrenar/entrenar-02.webp')}
              style={s.heroCard}
              imageStyle={s.heroImg}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.5)', 'rgba(10,10,10,0.95)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.heroInner}>
                <EliteText style={s.heroKicker}>{heroKicker}</EliteText>
                <EliteText style={s.heroTitle}>{heroTitle}</EliteText>
                <View style={s.heroCtaRow}>
                  <EliteText style={s.heroCtaText}>{heroCta}</EliteText>
                  <Ionicons name="arrow-forward" size={16} color={ATP_BRAND.lime} />
                </View>
              </View>
            </ImageBackground>
          </AnimatedPressable>
        </Animated.View>

        {/* La salida clara: cambiar el plan, no prisionero. */}
        <Animated.View entering={FadeInUp.delay(90).springify()}>
          <AnimatedPressable
            style={s.planLink}
            onPress={() => { haptic.light(); router.push('/plan-entrenamiento'); }}
          >
            <Ionicons name="calendar-outline" size={16} color={TEXT_COLORS.secondary} />
            <EliteText style={s.planLinkText}>
              {asignacion?.tienePlan ? 'Cambiar mi plan de días' : 'Dí qué días entrenas y Entrenar te contesta'}
            </EliteText>
            <Ionicons name="chevron-forward" size={14} color={TEXT_COLORS.muted} />
          </AnimatedPressable>
        </Animated.View>

        {/* MB-27 P3: la fase, bidireccional. Folicular/ovulación EMPUJAN,
            lútea/menstrual escuchan — el copy es PHASES[x].exercise (el
            canónico, no un séptimo). Informa y sugiere: nada se esconde ni
            se prohíbe por la fase. Solo cuenta propia (getCycleInfo gatea). */}
        {fase && PHASES[fase.phase] && (
          <Animated.View entering={FadeInUp.delay(110).springify()}>
            <AnimatedPressable
              style={[s.faseCard, { borderColor: withOpacity(PHASES[fase.phase].color, 0.35) }]}
              onPress={() => { haptic.light(); router.push('/cycle'); }}
            >
              <Ionicons
                name={PHASES[fase.phase].icon as any}
                size={18}
                color={PHASES[fase.phase].color}
              />
              <View style={{ flex: 1 }}>
                <EliteText style={[s.faseTitulo, { color: PHASES[fase.phase].color }]}>
                  Fase {PHASES[fase.phase].label.toLowerCase()} · día {fase.day}
                </EliteText>
                <EliteText style={s.faseCopy}>{PHASES[fase.phase].exercise}</EliteText>
                {/* Audit V2 B1: el número SIEMPRE dice de dónde sale — regla
                    de la casa desde M3.b, ahora también fuera de /cycle. */}
                <EliteText style={s.faseFuente}>
                  {fase.largoFuente === 'observado'
                    ? `Ciclo de ${fase.cycleLen} días: promedio de tus últimos ${fase.cyclesUsed} ciclos registrados.`
                    : `Ciclo de ${fase.cycleLen} días: tu ajuste manual.`}
                </EliteText>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Grupo secundario chico */}
        <EliteText style={s.sectionLabel}>MÁS FORMAS DE ENTRENAR</EliteText>
        {SECUNDARIOS.map((item, idx) => (
          <Animated.View key={item.name} entering={FadeInUp.delay(120 + idx * 50).springify()}>
            <AnimatedPressable onPress={() => nav(item)}>
              <GradientCard color={item.color} style={s.card}>
                <View style={s.row}>
                  <View style={[s.icon, { backgroundColor: withOpacity(item.color, 0.15) }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EliteText style={s.name}>{item.name}</EliteText>
                    <EliteText style={s.sub}>{item.subtitle}</EliteText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.muted} />
                </View>
              </GradientCard>
            </AnimatedPressable>
          </Animated.View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Hero primario (molde editorial "Mis Datos")
  heroCard: {
    borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end',
    minHeight: 190, marginBottom: Spacing.lg,
  },
  heroImg: { resizeMode: 'cover' },
  heroInner: { padding: 20 },
  heroKicker: {
    fontSize: 9, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, marginBottom: 6,
  },
  heroTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: TEXT_COLORS.primary, lineHeight: 30 },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  heroCtaText: { color: ATP_BRAND.lime, fontSize: 14, fontFamily: Fonts.bold },

  // MB-27 P2: la fila quiet hacia el plan (salida clara, no protagonista).
  planLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: Spacing.sm, paddingHorizontal: 4,
    marginTop: -Spacing.sm, marginBottom: Spacing.md,
  },
  planLinkText: { flex: 1, fontSize: FontSizes.sm, color: TEXT_COLORS.secondary },

  // MB-27 P3: la tira de fase — informativa, con el color de la fase
  // desaturado en el borde (nunca a tope: no compite con el hero).
  faseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderRadius: 14,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  faseTitulo: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 0.5, marginBottom: 2 },
  faseCopy: { fontSize: FontSizes.sm, color: TEXT_COLORS.secondary, lineHeight: 18 },
  faseFuente: { fontSize: FontSizes.xs, color: TEXT_COLORS.muted, marginTop: 4 },

  sectionLabel: {
    fontSize: 11, fontFamily: Fonts.bold, color: TEXT_COLORS.secondary,
    letterSpacing: 2, marginBottom: Spacing.sm,
  },

  // Secundarias compactas
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginBottom: 2 },
  sub: { fontSize: FontSizes.xs, color: TEXT_COLORS.secondary },
});
