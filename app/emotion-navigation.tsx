/**
 * Navegación emocional (MB-4 · Bloque 2) — el diferenciador.
 *
 * Va DESPUÉS del check-in, nunca dentro: primero se valida lo que la persona
 * siente; solo después se ofrece moverse. Flujo (spec §4, decidido por Enrique):
 *   1. Frase que encuadra (rotación determinista por día).
 *   2. Vuelve a su emoción en el mapa y pregunta según cuadrante.
 *   3. El movimiento es REAL: la cámara recorre la cadena y el usuario lee
 *      las emociones vecinas — ver que se puede mover ES el ejercicio.
 *   4. El vehículo: la herramienta concreta de Mente para ese movimiento.
 *
 * Reglas: ofrecer nunca imponer (STAY siempre visible) · crisis rompe el
 * flujo (acompañamiento, no reframing) · cero nombres propios · sin promesas.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { CrisisSupportBanner } from '@/src/components/global/CrisisSupportBanner';
import { EmotionMap2D, type EmotionMapHandle } from '@/src/components/checkin/EmotionMap2D';
import { EMOTIONS } from '@/src/data/emotions-library';
import {
  buildNavigationPlan, pickFramingPhrase, isCrisisHotline, hasCrisisTrajectory,
  CRISIS_TRAJECTORY_WINDOW_DAYS,
} from '@/src/services/emotion-navigation-core';
import { logNavigationMove } from '@/src/services/emotion-stats-service';
import { saveCheckin, getRecentCheckins } from '@/src/services/checkin-service';
import { deriveCheckinAxes } from '@/src/services/checkin-axes-core';
import { warn as logWarn } from '@/src/lib/logger';
import { STAY_COPY, type RegulationTool } from '@/src/data/emotion-navigation';
import { colorAtPoint, normX, normY } from '@/src/services/emotion-map-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, withOpacity } from '@/src/constants/brand';

const CHAIN_STEP_MS = 1200; // la cámara se detiene a leer cada vecino

type Phase = 'frame' | 'map';
type SubStep = 'question' | 'moving' | 'tools';

export default function EmotionNavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ emotionId?: string }>();
  const emotionId = params.emotionId ?? '';

  const plan = useMemo(() => buildNavigationPlan(emotionId), [emotionId]);
  const origin = EMOTIONS.find(e => e.id === emotionId);
  const phrase = useMemo(() => pickFramingPhrase(getLocalToday()), []);

  const [phase, setPhase] = useState<Phase>('frame');
  const [moveIndex, setMoveIndex] = useState(0);
  const [subStep, setSubStep] = useState<SubStep>('question');
  const [focusId, setFocusId] = useState(emotionId);
  const mapRef = useRef<EmotionMapHandle>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Track F (MB-10): al VOLVER de la herramienta se ofrece el re-check-in corto
  // ("¿cómo quedaste?"). Ese segundo dato alimenta la métrica de efectividad de
  // MB-9 — es el único modo de saber si esto sirve.
  const pendingRecheck = useRef<{ chainIds: string[] } | null>(null);
  const [recheck, setRecheck] = useState<'offer' | 'saved' | null>(null);
  const [recheckSaving, setRecheckSaving] = useState(false);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // A-4 (MB-12): la Línea de la Vida es de NIVEL 2 — por emoción marcadora
  // (isCrisisHotline) o por trayectoria (3+ check-ins nivel 1 en 7 días). El
  // acompañamiento (nivel 1) no la dispara solo: si el banner sale con
  // cualquier mal día, se aprende a ignorar.
  const [hotline, setHotline] = useState(() => isCrisisHotline(emotionId));
  useEffect(() => {
    if (!plan?.crisis || hotline) return;
    let cancelled = false;
    getRecentCheckins(CRISIS_TRAJECTORY_WINDOW_DAYS)
      .then((rows) => {
        if (!cancelled && hasCrisisTrajectory(rows, getLocalToday())) setHotline(true);
      })
      .catch(() => { /* best-effort: el marcador directo ya cubrió el caso agudo */ });
    return () => { cancelled = true; };
  }, [plan?.crisis, hotline, emotionId]);

  useFocusEffect(useCallback(() => {
    // Regresó de la herramienta (el push dejó marca) → ofrecer el re-check-in.
    if (pendingRecheck.current) setRecheck((r) => r ?? 'offer');
  }, []));

  const move = plan?.moves[moveIndex];

  const originColor = origin
    ? colorAtPoint(normX(origin.quadrant, origin.intensity), normY(origin.energy))
    : TEXT_COLORS.secondary;

  // Al entrar al mapa: volver a SU emoción (ahí donde se registró).
  useEffect(() => {
    if (phase !== 'map' || !origin) return;
    const t = setTimeout(() => mapRef.current?.centerOnEmotion(origin.id, { zoom: 0.9 }), 80);
    timers.current.push(t);
  }, [phase, origin]);

  if (!plan || !origin) {
    // Sin emoción válida no hay nada que navegar — salir silencioso.
    return (
      <Screen>
        <PillarHeader pillar="mind" title="Navegar" onBack={() => router.back()} />
        <View style={styles.center}>
          <EliteText variant="body" style={{ color: Colors.textSecondary }}>
            No encontramos tu emoción. Vuelve a intentarlo desde el check-in.
          </EliteText>
        </View>
      </Screen>
    );
  }

  // ═══ CRISIS: el flujo se rompe — acompañamiento, no reframing ═══
  if (plan.crisis) {
    return (
      <Screen>
        <PillarHeader pillar="mind" title="Acompañamiento" onBack={() => router.back()} />
        <View style={styles.crisisWrap}>
          {hotline && <CrisisSupportBanner />}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.crisisCard}>
            <EliteText variant="body" style={styles.crisisText}>
              Ahora mismo no toca analizar nada. Toca acompañarte.
            </EliteText>
            {plan.crisisTool && (
              <Pressable
                onPress={() => { haptic.medium(); router.push(plan.crisisTool!.route as Href); }}
                style={[styles.crisisBtn, { borderColor: withOpacity(originColor, 0.4) }]}
              >
                <Ionicons name="headset-outline" size={18} color={originColor} />
                <EliteText variant="body" style={[styles.crisisBtnText, { color: originColor }]}>
                  {plan.crisisTool.title}
                </EliteText>
              </Pressable>
            )}
            <Pressable onPress={() => router.back()} style={styles.stayLink}>
              <EliteText variant="caption" style={styles.stayText}>Volver</EliteText>
            </Pressable>
          </Animated.View>
        </View>
      </Screen>
    );
  }

  // ═══ FASE 1: LA FRASE QUE ENCUADRA ═══
  if (phase === 'frame') {
    return (
      <Screen>
        <View style={styles.ambient} pointerEvents="none">
          <LinearGradient colors={[withOpacity(originColor, 0.22), 'transparent']} style={{ flex: 1 }} />
        </View>
        <PillarHeader pillar="mind" title="Navegar" onBack={() => router.back()} />
        <View style={styles.frameWrap}>
          <Animated.View entering={FadeIn.duration(500)}>
            <EliteText style={styles.framePhrase}>{phrase}</EliteText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.frameActions}>
            <Pressable
              onPress={() => { haptic.medium(); setPhase('map'); }}
              style={[styles.frameCta, { backgroundColor: originColor }]}
            >
              <EliteText style={styles.frameCtaText}>VAMOS</EliteText>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.stayLink}>
              <EliteText variant="caption" style={styles.stayText}>Ahora no</EliteText>
            </Pressable>
          </Animated.View>
        </View>
      </Screen>
    );
  }

  // ═══ FASE 2: EL MAPA — pregunta → movimiento real → vehículo ═══

  const startMovement = () => {
    if (!move) return;
    haptic.medium();
    // C.1: registra el movimiento tomado desde el estado de origen — materia
    // prima de la efectividad. Fire-and-forget: no interrumpe el flujo.
    logNavigationMove(origin.id, move.move);
    if (move.chainIds.length <= 1) {
      setSubStep('tools');
      return;
    }
    setSubStep('moving');
    move.chainIds.forEach((id, i) => {
      if (i === 0) return;
      const t = setTimeout(() => {
        setFocusId(id);
        mapRef.current?.centerOnEmotion(id, { zoom: 0.95, durationMs: 700 });
        haptic.light();
      }, i * CHAIN_STEP_MS);
      timers.current.push(t);
    });
    const done = setTimeout(() => setSubStep('tools'), move.chainIds.length * CHAIN_STEP_MS + 300);
    timers.current.push(done);
  };

  const nextMove = () => {
    haptic.light();
    const next = moveIndex + 1;
    setMoveIndex(next);
    setSubStep('question');
    const startId = plan.moves[next].chainIds[0];
    setFocusId(startId);
    mapRef.current?.centerOnEmotion(startId, { zoom: 0.9 });
  };

  const openTool = (tool: RegulationTool) => {
    haptic.medium();
    // Track F: marcar el viaje — al volver, "¿cómo quedaste?".
    if (move) pendingRecheck.current = { chainIds: move.chainIds };
    router.push(tool.route as Href);
  };

  // Track F: el re-check-in corto ES un check-in real (mismo registro, misma
  // estadística, misma salvaguarda) — así la efectividad de MB-9 tiene su
  // segundo punto sin duplicar nada.
  const handleRecheckPick = async (e: (typeof EMOTIONS)[number]) => {
    if (recheckSaving) return;
    haptic.medium();
    setRecheckSaving(true);
    try {
      const axes = deriveCheckinAxes(e.quadrant, [{ energy: e.energy, intensity: e.intensity }]);
      await saveCheckin({
        quadrant: e.quadrant,
        emotions: [e.id],
        energy_level: axes.energy_level,
        pleasantness: axes.pleasantness,
        // Track E: el re-check-in post-herramienta también etiqueta su puerta.
        entry_gate: 'recheck',
      });
      pendingRecheck.current = null;
      setRecheck('saved');
    } catch (err) {
      // Best-effort: perder el dato no debe atrapar a la persona en la pantalla.
      logWarn('[emotion-navigation] recheck save failed', err);
      pendingRecheck.current = null;
      setRecheck(null);
    }
    setRecheckSaving(false);
  };

  const dismissRecheck = () => {
    haptic.light();
    pendingRecheck.current = null;
    setRecheck(null);
  };

  const focusEmotion = EMOTIONS.find(e => e.id === focusId);
  const focusColor = focusEmotion
    ? colorAtPoint(normX(focusEmotion.quadrant, focusEmotion.intensity), normY(focusEmotion.energy))
    : originColor;

  return (
    <Screen>
      <View style={styles.ambient} pointerEvents="none">
        <LinearGradient colors={[withOpacity(focusColor, 0.2), 'transparent']} style={{ flex: 1 }} />
      </View>
      <PillarHeader pillar="mind" title="Navegar" onBack={() => router.back()} />

      <View style={styles.mapCanvas}>
        <EmotionMap2D
          ref={mapRef}
          initialQuadrant={origin.quadrant}
          selectedIds={[focusId]}
          highlightIds={subStep === 'question' ? undefined : move?.chainIds}
          interactive={subStep !== 'moving'}
        />
      </View>

      {/* Track F: re-check-in corto al volver de la herramienta */}
      {recheck === 'offer' && (() => {
        const chainIds = pendingRecheck.current?.chainIds ?? [origin.id];
        const options = [...new Set([...chainIds].reverse())]
          .map(id => EMOTIONS.find(e => e.id === id))
          .filter((e): e is NonNullable<typeof e> => !!e)
          .slice(0, 4);
        return (
          <Animated.View entering={SlideInDown.duration(280)} style={styles.card}>
            <EliteText style={[styles.question, { color: focusColor }]}>¿Cómo quedaste?</EliteText>
            <EliteText variant="body" style={styles.subtext}>
              Un toque y ya. Este segundo dato es el que enseña si moverte funciona.
            </EliteText>
            <View style={styles.recheckWrap}>
              {options.map(e => (
                <Pressable
                  key={e.id}
                  disabled={recheckSaving}
                  onPress={() => handleRecheckPick(e)}
                  style={[styles.recheckChip, recheckSaving && { opacity: 0.6 }]}
                >
                  <EliteText variant="body" style={styles.recheckChipText}>
                    {e.label}{e.id === origin.id ? ' · igual' : ''}
                  </EliteText>
                </Pressable>
              ))}
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={dismissRecheck} style={styles.stayLink}>
                <EliteText variant="caption" style={styles.stayText}>Prefiero no decir</EliteText>
              </Pressable>
            </View>
          </Animated.View>
        );
      })()}

      {recheck === 'saved' && (
        <Animated.View entering={SlideInDown.duration(280)} style={styles.card}>
          <EliteText style={[styles.question, { color: focusColor }]}>Registrado</EliteText>
          <EliteText variant="body" style={styles.subtext}>
            Con cada ida y vuelta, tu estadística aprende qué movimiento te funciona a ti.
          </EliteText>
          <View style={styles.cardActions}>
            <View />
            <Pressable
              onPress={() => { haptic.medium(); router.back(); }}
              style={[styles.cta, { backgroundColor: focusColor }]}
            >
              <EliteText style={styles.ctaText}>LISTO</EliteText>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Tarjeta inferior según sub-paso */}
      {recheck === null && move && subStep === 'question' && (
        <Animated.View entering={SlideInDown.duration(280)} style={styles.card}>
          <EliteText style={[styles.question, { color: focusColor }]}>{move.question}</EliteText>
          <EliteText variant="body" style={styles.subtext}>{move.subtext}</EliteText>
          {/* B.2: el destino lejano es horizonte tenue; la app solo ofrece el
              siguiente paso. La ruta es un arco con escalas, no una cuerda. */}
          {move.chainIds.length > 2 && (
            <EliteText style={styles.horizon} numberOfLines={1}>
              {(() => {
                const dest = EMOTIONS.find(e => e.id === move.chainIds[move.chainIds.length - 1]);
                return dest ? `Hacia el horizonte: ${dest.label.toLowerCase()} · un paso a la vez` : '';
              })()}
            </EliteText>
          )}
          <View style={styles.cardActions}>
            <Pressable onPress={() => { haptic.light(); router.back(); }} style={styles.stayLink}>
              <EliteText variant="caption" style={styles.stayText}>{STAY_COPY}</EliteText>
            </Pressable>
            <Pressable onPress={startMovement} style={[styles.cta, { backgroundColor: focusColor }]}>
              <EliteText style={styles.ctaText}>
                {move.chainIds.length > 1 ? 'VER EL MOVIMIENTO' : 'VER CÓMO'}
              </EliteText>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {recheck === null && subStep === 'moving' && focusEmotion && (
        <Animated.View key={focusId} entering={FadeIn.duration(250)} style={styles.card}>
          <EliteText style={[styles.movingLabel, { color: focusColor }]}>{focusEmotion.label}</EliteText>
          <EliteText variant="caption" style={styles.movingDesc} numberOfLines={2}>
            {focusEmotion.description}
          </EliteText>
        </Animated.View>
      )}

      {recheck === null && move && subStep === 'tools' && (
        <Animated.View entering={SlideInDown.duration(280)} style={styles.card}>
          <EliteText variant="caption" style={styles.toolsTitle}>EL VEHÍCULO</EliteText>
          <EliteText variant="body" style={styles.subtext}>
            Moverse de verdad, no solo imaginarlo. Elige uno:
          </EliteText>
          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
            {move.tools.map((tool, i) => (
              <Animated.View key={tool.id} entering={FadeInDown.delay(i * 60).duration(300)}>
                <Pressable onPress={() => openTool(tool)} style={styles.toolRow}>
                  <View style={{ flex: 1 }}>
                    <EliteText variant="body" style={styles.toolTitle}>{tool.title}</EliteText>
                    <EliteText variant="caption" style={styles.toolDetail}>{tool.detail}</EliteText>
                  </View>
                  {tool.minutes != null && (
                    <EliteText variant="caption" style={styles.toolMin}>{tool.minutes} min</EliteText>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={TEXT_COLORS.secondary} />
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
          <View style={styles.cardActions}>
            <Pressable onPress={() => { haptic.light(); router.back(); }} style={styles.stayLink}>
              <EliteText variant="caption" style={styles.stayText}>{STAY_COPY}</EliteText>
            </Pressable>
            {moveIndex < plan.moves.length - 1 && (
              <Pressable onPress={nextMove} style={[styles.cta, { backgroundColor: focusColor }]}>
                <EliteText style={styles.ctaText}>SIGUIENTE MOVIMIENTO</EliteText>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320, zIndex: 0 },
  mapCanvas: { flex: 1 },

  // Frase que encuadra
  frameWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.xl },
  framePhrase: {
    fontSize: 30, lineHeight: 40, fontFamily: Fonts.extraBold,
    color: Colors.textPrimary, textAlign: 'center',
  },
  frameActions: { alignItems: 'center', gap: Spacing.md },
  frameCta: {
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  frameCtaText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.lg, letterSpacing: 2 },

  // Tarjeta inferior
  card: {
    backgroundColor: SURFACES.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 0.5, borderColor: SURFACES.border,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg,
  },
  question: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, lineHeight: 30 },
  subtext: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 21, marginTop: Spacing.xs },
  horizon: {
    color: withOpacity(TEXT_COLORS.secondary, 0.55), fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold, letterSpacing: 0.5, marginTop: Spacing.sm, fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Spacing.md, gap: Spacing.sm,
  },
  cta: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: Radius.pill,
  },
  ctaText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.sm, letterSpacing: 1.5 },
  stayLink: { paddingVertical: Spacing.sm },
  stayText: { color: Colors.textSecondary, fontSize: FontSizes.sm },

  // Recorriendo la cadena
  movingLabel: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  movingDesc: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 20, marginTop: 4 },

  // Track F: re-check-in corto ("¿cómo quedaste?")
  recheckWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  recheckChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill, backgroundColor: SURFACES.card,
    borderWidth: 1, borderColor: SURFACES.border,
  },
  recheckChipText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },

  // Vehículo
  toolsTitle: {
    color: Colors.textSecondary, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: 2,
  },
  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2, borderBottomWidth: 0.5, borderBottomColor: SURFACES.border,
  },
  toolTitle: { color: Colors.textPrimary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  toolDetail: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 18, marginTop: 1 },
  toolMin: { color: Colors.textSecondary, fontSize: FontSizes.xs },

  // Crisis
  crisisWrap: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  crisisCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5,
    borderColor: SURFACES.border, padding: Spacing.lg, gap: Spacing.md, alignItems: 'center',
  },
  crisisText: { color: Colors.textPrimary, fontSize: FontSizes.lg, lineHeight: 26, textAlign: 'center' },
  crisisBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
  },
  crisisBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
});
