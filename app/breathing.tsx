/**
 * Respiración — Timer con animación de círculo expandible/contractible.
 *
 * Ciclos de inhala/retén/exhala con visualización.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView, Animated as RNAnimated, DeviceEventEmitter, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import AnimatedRN, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { toggleCompletion } from '@/src/services/protocol-service';
import { awardPracticeElectron, type PracticeAwardStatus } from '@/src/services/electron-service';
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';
import { qualifiesForPracticeElectron } from '@/src/services/practice-electron-core';
import { vibrateMedium, haptic } from '@/src/utils/haptics';
import { AttestationGateModal } from '@/src/components/safety/AttestationGateModal';
import {
  familyForBreathingTemplate, gateDecisionForFamily, capBreathingTemplate,
  type GateDecision,
} from '@/src/services/safety/protocol-gate-core';
import { getSafetyState } from '@/src/services/safety/protocol-gate-service';
import { getSafetyParams, DEFAULT_SAFETY_PARAMS } from '@/src/services/safety/safety-params-service';
import { playBeep, initAudio } from '@/src/utils/sounds';
import { supabase } from '@/src/lib/supabase';
import { error as logError } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { BREATHING_LIBRARY, type BreathingTemplate, type BreathingPhase } from '@/src/data/breathing-library';
import { fetchAudioPieces, type AudioPiece } from '@/src/services/mente-audio-service';
import { AudioPieceCard } from '@/src/components/mente/AudioPieceCard';
import { useSubscription } from '@/src/hooks/useSubscription';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import {
  advanceBreathSecond,
  phaseColor,
  phaseTargetScale,
  templateTotalSeconds,
  INITIAL_STEP,
  type BreathStep,
} from '@/src/services/breath-timer-core';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, ATP_BRAND } from '@/src/constants/brand';
import { BackButton } from '@/src/components/ui/BackButton';
import { MenteHero } from '@/src/components/mente/MenteHero';

// #138: hero editorial del pilar (require estático · Metro).
const HERO_RESPIRACION = require('@/assets/images/intervenciones/respiracion.jpg');

const PURPLE = CATEGORY_COLORS.mind;
const BLUE = '#60a5fa';

const BREATH_ICONS: Record<string, string> = {
  'box-4': 'square-outline',
  '478-relaxation': 'moon-outline',
  'coherent-5': 'pulse-outline',
  'wim-hof': 'snow-outline',
  'energizing-3': 'flash-outline',
  'calming-2-1': 'leaf-outline',
};

function getBreathIcon(id: string): string {
  return BREATH_ICONS[id] || 'cloud-outline';
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const diffH = Math.floor((Date.now() - d.getTime()) / 3600000);
  if (diffH < 1) return 'Hace poco';
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// === COMPONENTE PRINCIPAL ===

export default function BreathingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    breathingId?: string;
    protocolItemId?: string;
  }>();

  const [selected, setSelected] = useState<BreathingTemplate | null>(() => {
    if (params.breathingId) {
      return BREATHING_LIBRARY.find(b => b.id === params.breathingId) ?? null;
    }
    return null;
  });
  // Para box breathing: muestra config antes del timer
  const [configuring, setConfiguring] = useState(false);

  // Sprint Compliance 3: gate de atestación para respiración intensa
  // (wim hof / hiperventilación). Corre CADA VEZ — clearedId autoriza SOLO la
  // sesión actual y se limpia al salir del timer. Hard-block por condición
  // declarada / embarazo (capa 1). Límites técnicos: máx 3 rondas guiadas +
  // retención con tope (capBreathingTemplate).
  const [clearedId, setClearedId] = useState<string | null>(null);
  const [gate, setGate] = useState<Exclude<GateDecision, { result: 'allowed' }> | null>(null);
  const [gateUserId, setGateUserId] = useState<string | null>(null);
  const gateRequestedRef = useRef<string | null>(null);

  const riskFamily = selected
    ? familyForBreathingTemplate(selected.id, DEFAULT_SAFETY_PARAMS.protocol_gate)
    : null;
  const needsGate = !!selected && !!riskFamily && clearedId !== selected.id && !(configuring && selected.id === 'box-4');

  useEffect(() => {
    if (!needsGate || !selected || gateRequestedRef.current === selected.id) return;
    gateRequestedRef.current = selected.id;
    (async () => {
      try {
        const [{ data: { user } }, safetyParams] = await Promise.all([
          supabase.auth.getUser(),
          getSafetyParams(),
        ]);
        setGateUserId(user?.id ?? null);
        const family = familyForBreathingTemplate(selected.id, safetyParams.protocol_gate);
        if (!family) { setClearedId(selected.id); return; }
        const state = user?.id
          ? await getSafetyState(user.id)
          : { conditions: [], pregnancy: false, lactancia: false };
        const decision = gateDecisionForFamily(family, state, safetyParams.protocol_gate);
        if (decision.result === 'allowed') setClearedId(selected.id);
        else setGate(decision);
      } catch {
        // Fail-safe conservador: sin datos, pedir la atestación estándar.
        setGate({ result: 'attest', attestationId: 'wim_hof' });
      }
    })();
  }, [needsGate, selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeGate = () => {
    setGate(null);
    gateRequestedRef.current = null;
    if (params.breathingId) router.back();
    else setSelected(null);
  };

  const handleSelect = (t: BreathingTemplate) => {
    setSelected(t);
    if (t.id === 'box-4') setConfiguring(true);
  };

  if (!selected) {
    return <SelectorScreen onSelect={handleSelect} onBack={() => router.back()} />;
  }

  if (configuring && selected.id === 'box-4') {
    return (
      <BoxConfigScreen
        template={selected}
        onStart={(customTemplate) => { setSelected(customTemplate); setConfiguring(false); }}
        onBack={() => { setConfiguring(false); setSelected(null); }}
      />
    );
  }

  if (needsGate) {
    return (
      <SafeAreaView style={styles.screen}>
        <AttestationGateModal
          visible={!!gate}
          decision={gate}
          userId={gateUserId}
          protocolKey={selected.id}
          onProceed={() => { setGate(null); setClearedId(selected.id); }}
          onClose={closeGate}
        />
      </SafeAreaView>
    );
  }

  // Límites técnicos solo en plantillas de riesgo (las suaves no se tocan).
  const runTemplate = riskFamily
    ? capBreathingTemplate(selected, DEFAULT_SAFETY_PARAMS.breath_limits)
    : selected;

  return (
    <BreathingTimerScreen
      template={runTemplate}
      protocolItemId={params.protocolItemId}
      onBack={() => {
        setClearedId(null); // la próxima sesión vuelve a atestar
        gateRequestedRef.current = null;
        if (params.breathingId) router.back();
        else setSelected(null);
      }}
      onComplete={() => { setClearedId(null); router.back(); }}
    />
  );
}

// ══════════════════════════════
// SELECTOR
// ══════════════════════════════

function SelectorScreen({ onSelect, onBack }: {
  onSelect: (t: BreathingTemplate) => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  // Overhaul A2: breathwork narrado del catálogo (pranayama_guiado y las que
  // se sumen) — la sección "Con guía" arriba del timer visual.
  const [pieces, setPieces] = useState<AudioPiece[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const { isPro } = useSubscription();

  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchAudioPieces().then(all => {
      if (alive) setPieces(all.filter(p => p.categoria === 'respiracion'));
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('mind_sessions').select('*')
        .eq('user_id', user.id).eq('type', 'breathing')
        .order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => { if (alive) setRecentSessions(data ?? []); });
    });
    return () => { alive = false; };
  }, []));

  const openPiece = useCallback((piece: AudioPiece) => {
    haptic.light();
    if (piece.tier === 'pro' && !isPro) {
      router.push('/paywall');
      return;
    }
    router.push({ pathname: '/mente/player', params: { slug: piece.slug } });
  }, [isPro, router]);

  return (
    <View style={styles.screen}>
      <StickyPillarBanner scrolled={scrolled} onBack={onBack} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.selectorScroll}
      >
        <MenteHero
          image={HERO_RESPIRACION}
          kicker="PILAR MENTE"
          title="Respiración"
          subtitle={`${BREATHING_LIBRARY.length} ejercicios · calma, foco y energía`}
        />
        <View style={styles.selectorContent}>

        {pieces.length > 0 && (
          <>
            <Text style={styles.selectorSection}>CON GUÍA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginBottom: 14 }}>
              {pieces.map(piece => (
                <AudioPieceCard key={piece.slug} piece={piece} onPress={openPiece} />
              ))}
            </View>
            <Text style={styles.selectorSection}>TIMER VISUAL</Text>
          </>
        )}

        {BREATHING_LIBRARY.map((t, idx) => (
          <AnimatedRN.View key={t.id} entering={FadeInUp.delay(50 + idx * 40).springify()}>
            <AnimatedPressable onPress={() => onSelect(t)}>
              <View style={{
                backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 10,
                flexDirection: 'row', alignItems: 'center',
                borderWidth: 1, borderColor: `${PURPLE}15`,
              }}>
                <View style={{ width: 4, height: 48, backgroundColor: PURPLE, borderRadius: 2, marginRight: 14 }} />
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: `${PURPLE}15`,
                  justifyContent: 'center', alignItems: 'center', marginRight: 14,
                }}>
                  <Ionicons name={getBreathIcon(t.id) as any} size={22} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontFamily: Fonts.bold }}>{t.title}</Text>
                  <Text style={{ color: '#999', fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 }}>{t.description}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    <View style={{ backgroundColor: `${PURPLE}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: PURPLE, fontSize: 10, fontFamily: Fonts.semiBold }}>{t.durationMinutes} min</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(168,224,42,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#a8e02a', fontSize: 10, fontFamily: Fonts.semiBold }}>{t.phases.map(p => p.seconds + 's').join('-')}</Text>
                    </View>
                    {/* Sprint MENTE: nivel + beneficio principal */}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#999', fontSize: 10, fontFamily: Fonts.semiBold }}>{t.level}</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ color: '#999', fontSize: 10, fontFamily: Fonts.semiBold }}>{t.benefit}</Text>
                    </View>
                    {t.contraindications && (
                      <View style={{ backgroundColor: 'rgba(239,159,39,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ color: '#EF9F27', fontSize: 10, fontFamily: Fonts.semiBold }}>⚠ precauciones</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="play-circle-outline" size={28} color={ATP_BRAND.teal} />
              </View>
            </AnimatedPressable>
          </AnimatedRN.View>
        ))}

        {/* Historial reciente */}
        {recentSessions.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: '#666', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 12 }}>
              HISTORIAL RECIENTE
            </Text>
            {recentSessions.map(session => (
              <View key={session.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)',
              }}>
                <Ionicons name="checkmark-circle" size={18} color="#a8e02a" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontFamily: Fonts.semiBold }}>
                    {session.template_name || 'Respiración'}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 11, fontFamily: Fonts.regular }}>
                    {Math.round((session.duration_seconds || 0) / 60)} min · {session.rounds_completed || 0} rondas
                  </Text>
                </View>
                <Text style={{ color: '#666', fontSize: 11, fontFamily: Fonts.regular }}>
                  {formatRelativeDate(session.created_at)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════
// BOX BREATHING CONFIG
// ══════════════════════════════

function BoxConfigScreen({ template, onStart, onBack }: {
  template: BreathingTemplate;
  onStart: (t: BreathingTemplate) => void;
  onBack: () => void;
}) {
  const [inhale, setInhale] = useState(4);
  const [holdFull, setHoldFull] = useState(4);
  const [exhale, setExhale] = useState(4);
  const [holdEmpty, setHoldEmpty] = useState(4);
  const [cycles, setCycles] = useState(18);

  const cycleSeconds = inhale + holdFull + exhale + holdEmpty;
  const totalSeconds = cycles * cycleSeconds;
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  const handleStart = () => {
    const customTemplate: BreathingTemplate = {
      ...template,
      cycles,
      durationMinutes: Math.ceil(totalSeconds / 60),
      phases: [
        { action: 'inhale', seconds: inhale, label: 'Inhala' },
        { action: 'hold', seconds: holdFull, label: 'Retén' },
        { action: 'exhale', seconds: exhale, label: 'Exhala' },
        { action: 'hold_empty', seconds: holdEmpty, label: 'Vacío' },
      ],
    };
    onStart(customTemplate);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.backBtn}>
        <BackButton onPress={onBack} color={PURPLE} />
      </View>

      <View style={styles.configContainer}>
        <EliteText style={styles.configTitle}>BOX BREATHING</EliteText>
        <EliteText variant="caption" style={styles.configSub}>Configura cada lado de la caja</EliteText>

        <View style={styles.configRows}>
          <ConfigRow label="Inhala" value={inhale} onChange={setInhale} />
          <ConfigRow label="Retén" value={holdFull} onChange={setHoldFull} />
          <ConfigRow label="Exhala" value={exhale} onChange={setExhale} />
          <ConfigRow label="Vacío" value={holdEmpty} onChange={setHoldEmpty} />
        </View>

        <View style={styles.configDivider} />

        <ConfigRow label="Ciclos" value={cycles} onChange={setCycles} min={1} max={50} />

        <EliteText variant="caption" style={styles.configTotal}>
          Tiempo total: {totalMin > 0 ? `${totalMin}m ` : ''}{totalSec > 0 ? `${totalSec}s` : ''}
          {' '}({inhale}-{holdFull}-{exhale}-{holdEmpty} × {cycles})
        </EliteText>

        <GradientCTA label="COMENZAR" onPress={handleStart} />
      </View>
    </SafeAreaView>
  );
}

function ConfigRow({ label, value, onChange, min = 1, max = 30 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <View style={styles.configRow}>
      <EliteText variant="body" style={styles.configRowLabel}>{label}</EliteText>
      <View style={styles.configStepper}>
        <Pressable
          onPress={() => { haptic.light(); onChange(Math.max(min, value - 1)); }}
          disabled={value <= min}
          style={[styles.configStepBtn, value <= min && { opacity: 0.3 }]}
        >
          <Ionicons name="remove" size={18} color={ATP_BRAND.teal} />
        </Pressable>
        <EliteText style={styles.configStepValue}>{value}<EliteText style={styles.configStepUnit}>s</EliteText></EliteText>
        <Pressable
          onPress={() => { haptic.light(); onChange(Math.min(max, value + 1)); }}
          disabled={value >= max}
          style={[styles.configStepBtn, value >= max && { opacity: 0.3 }]}
        >
          <Ionicons name="add" size={18} color={ATP_BRAND.teal} />
        </Pressable>
      </View>
    </View>
  );
}

// ══════════════════════════════
// TIMER DE RESPIRACIÓN
// ══════════════════════════════

function BreathingTimerScreen({ template, protocolItemId, onBack, onComplete }: {
  template: BreathingTemplate;
  protocolItemId?: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  useKeepAwake();

  const totalSeconds = templateTotalSeconds(template);

  // MB-5: 'preparing' = cuenta 3-2-1 antes de la primera inhalación (estado explícito).
  const [status, setStatus] = useState<'idle' | 'preparing' | 'running' | 'paused' | 'completed'>('idle');
  // Delta economía: qué pasó con el e- (≥80% real + cap 3/día + 3h server-side).
  const [electronStatus, setElectronStatus] = useState<PracticeAwardStatus | 'not_eligible' | null>(null);
  const [prepLeft, setPrepLeft] = useState(3);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [secondsInPhase, setSecondsInPhase] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // T2 MENTE: la verdad del avance vive en el ref (síncrono) y la máquina de
  // estados pura (breath-timer-core, testeada). Los useState solo pintan.
  const stepRef = useRef<BreathStep>(INITIAL_STEP);
  // MB-5: guard — handleComplete puede dispararse por el tick final Y por
  // "TERMINAR" casi simultáneos; solo el primero registra la sesión.
  const completedRef = useRef(false);

  // Animación del círculo
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const currentPhase = template.phases[currentPhaseIdx];
  const totalProgress = totalSeconds > 0 ? totalElapsed / totalSeconds : 0;
  const totalRemaining = totalSeconds - totalElapsed;
  // T2 MENTE: color por fase (requisito Enrique — verde inhala / azul retén /
  // naranja exhala). En idle el anillo queda en el morado del pilar.
  const ringColor = status === 'idle' || status === 'preparing' || !currentPhase ? PURPLE : phaseColor(currentPhase.action);
  // MB-5: idle y preparing comparten el layout de "aún no corre".
  const preSession = status === 'idle' || status === 'preparing';

  // Animar círculo según fase: crece en inhala, decrece en exhala, se
  // mantiene en retención (phaseTargetScale del core).
  useEffect(() => {
    if (status !== 'running' || !currentPhase) return;
    const remaining = currentPhase.seconds - secondsInPhase;
    if (remaining <= 0) return;
    const target = phaseTargetScale(currentPhase.action);
    if (target !== null) {
      RNAnimated.timing(scaleAnim, {
        toValue: target,
        duration: remaining * 1000,
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhaseIdx, status]);

  // Timer principal — un tick por segundo sobre la máquina de estados pura.
  useEffect(() => {
    if (status !== 'running') {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    intervalRef.current = setInterval(() => {
      const { next, event } = advanceBreathSecond(stepRef.current, template);
      if (event === 'completed') {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setTotalElapsed(prev => prev + 1);
        setTimeout(() => handleComplete(), 0);
        return;
      }
      stepRef.current = next;
      setCurrentCycle(next.cycleIdx);
      setCurrentPhaseIdx(next.phaseIdx);
      setSecondsInPhase(next.secondsInPhase);
      setTotalElapsed(prev => prev + 1);
      if (event === 'cycle_advanced') vibrateMedium();
      else if (event === 'phase_advanced') haptic.light();
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // MB-5: primera vez pasa por 'preparing' (3-2-1); reanudar va directo.
  const handleStart = () => {
    if (status === 'idle') {
      try { initAudio(); } catch { /* fail-soft */ }
      setPrepLeft(3);
      setStatus('preparing');
      return;
    }
    setStatus('running');
  };

  // Cuenta regresiva de preparación: 3-2-1 con háptico, luego arranca.
  useEffect(() => {
    if (status !== 'preparing') return;
    haptic.light();
    const t = setTimeout(() => {
      if (prepLeft > 1) { setPrepLeft(p => p - 1); return; }
      try { playBeep(0.5); } catch { vibrateMedium(); }
      setStatus('running');
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, prepLeft]);

  const handlePause = () => {
    scaleAnim.stopAnimation();
    setStatus('paused');
  };

  const handleComplete = async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setStatus('completed');
    try { initAudio(); playBeep(0.5); } catch { /* */ }
    vibrateMedium();
    setTimeout(() => { try { playBeep(0.5); } catch { /* */ } vibrateMedium(); }, 1500);

    // Protocolo
    if (protocolItemId) {
      try { await toggleCompletion(protocolItemId); } catch { /* silenciar */ }
    }

    // Guardar sesión + electrón
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Guardar en mind_sessions
        const { error: insertError } = await supabase.from('mind_sessions').insert({
          user_id: user.id,
          type: 'breathing',
          template_id: template.id,
          template_name: template.title,
          duration_seconds: totalElapsed,
          rounds_completed: currentCycle + 1,
          date: getLocalToday(),
        });
        if (insertError) {
          logError('Breathing insert error:', insertError.message);
          Alert.alert(
            'Sesión no guardada',
            'Completaste la respiración, pero no pudimos registrarla. Revisa tu conexión.'
          );
        } else {
          // Delta economía 2026-07-23: e- solo con ≥80% del tiempo real; cap
          // 3/día + espaciado 3h los decide el trigger server-side (213).
          if (qualifiesForPracticeElectron(totalElapsed, totalSeconds)) {
            setElectronStatus(await awardPracticeElectron(user.id, 'breathwork'));
          } else {
            setElectronStatus('not_eligible');
          }
          DeviceEventEmitter.emit('electrons_changed');
          DeviceEventEmitter.emit('day_changed');
        }
      }
    } catch (e: any) {
      logError('Breathing handleComplete catch:', e?.message ?? String(e));
      Alert.alert(
        'Sesión no guardada',
        'Completaste la respiración, pero no pudimos registrarla. Revisa tu conexión.'
      );
    }
  };

  const handleEnd = () => {
    const m = Math.floor(totalElapsed / 60);
    const s = totalElapsed % 60;
    Alert.alert(
      '¿Terminar sesión?',
      `Llevas ${m > 0 ? `${m}m ${s}s` : `${s}s`} — se registra tu tiempo real.`,
      [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Terminar', onPress: handleComplete },
      ],
    );
  };

  // MB-5: salida sin castigo — el back durante sesión activa NO descarta en
  // silencio: confirma y registra el tiempo real (mismo camino que TERMINAR).
  const handleBack = () => {
    if ((status === 'running' || status === 'paused') && totalElapsed > 0) {
      handleEnd();
      return;
    }
    onBack();
  };

  const formatMmSs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // === Completado ===
  if (status === 'completed') {
    const m = Math.floor(totalElapsed / 60);
    const s = totalElapsed % 60;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.completedContainer}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: 'rgba(168,224,42,0.15)',
            justifyContent: 'center', alignItems: 'center', marginBottom: 20,
          }}>
            <Ionicons name="checkmark" size={40} color="#a8e02a" />
          </View>
          <EliteText style={styles.completedTitle}>¡Sesión completada!</EliteText>
          <EliteText variant="caption" style={styles.completedSub}>
            {template.title} · {m > 0 ? `${m}m ${s}s` : `${s}s`} · {currentCycle + 1} rondas
          </EliteText>
          <EliteText variant="body" style={styles.completedMessage}>
            {template.closingMessage}
          </EliteText>

          {/* Electrón ganado — Delta economía: solo si de verdad se otorgó
              (≥80% real + cap/espaciado server-side); si no, mensaje suave. */}
          <View style={{
            backgroundColor: 'rgba(168,224,42,0.1)', borderRadius: 16,
            padding: 16, marginVertical: 16, width: '80%', alignItems: 'center',
          }}>
            {electronStatus === 'awarded_first' || electronStatus === 'awarded_extra' ? (
              <>
                <Text style={{ color: '#a8e02a', fontSize: 18, fontFamily: Fonts.extraBold }}>
                  +{ELECTRON_WEIGHTS.breathwork.weight.toFixed(1)} {ELECTRON_WEIGHTS.breathwork.weight === 1 ? 'electrón' : 'electrones'}
                </Text>
                <Text style={{ color: '#999', fontSize: 12, fontFamily: Fonts.regular, marginTop: 4 }}>Breathwork completado</Text>
              </>
            ) : (
              <Text style={{ color: '#999', fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center' }}>
                {electronStatus === 'cap_reached' || electronStatus === 'spacing'
                  ? 'Ya registraste tu práctica — vuelve en un rato para sumar otro electrón.'
                  : electronStatus === 'not_eligible'
                    ? 'Registramos tu tiempo real. Completa al menos el 80% para sumar tu electrón.'
                    : 'Sesión registrada.'}
              </Text>
            )}
          </View>

          <GradientCTA label="CONTINUAR" onPress={onComplete} />
        </View>
      </SafeAreaView>
    );
  }

  // === Timer activo ===
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.backBtn}>
        <BackButton onPress={handleBack} color={PURPLE} />
      </View>

      <View style={styles.timerContainer}>
        {/* Header */}
        <EliteText style={styles.timerTitle}>{template.title}</EliteText>

        {/* Círculo animado — color por fase (T2 MENTE) */}
        <View style={styles.circleContainer}>
          <RNAnimated.View style={[
            styles.breathCircle,
            {
              transform: [{ scale: scaleAnim }],
              borderColor: ringColor,
              backgroundColor: `${ringColor}15`,
              shadowColor: ringColor,
            },
          ]}>
            <EliteText style={styles.actionText}>
              {status === 'idle' ? 'Listo' : status === 'preparing' ? 'Prepárate' : currentPhase?.label ?? ''}
            </EliteText>
            {status === 'preparing' && (
              <EliteText style={[styles.phaseCountdown, { color: ringColor }]}>
                {prepLeft}
              </EliteText>
            )}
            {!preSession && (
              <EliteText style={[styles.phaseCountdown, { color: ringColor }]}>
                {currentPhase ? currentPhase.seconds - secondsInPhase : 0}
              </EliteText>
            )}
          </RNAnimated.View>
        </View>

        {/* Info */}
        {!preSession && (
          <AnimatedRN.View entering={FadeIn.duration(300)} style={styles.infoSection}>
            <EliteText variant="caption" style={styles.cycleText}>
              Ciclo {currentCycle + 1} de {template.cycles}
            </EliteText>
            <EliteText variant="body" style={styles.remainingText}>
              {formatMmSs(totalRemaining)}
            </EliteText>
            <View style={styles.totalProgressBar}>
              <View style={[styles.totalProgressFill, { width: `${totalProgress * 100}%` }]} />
            </View>
          </AnimatedRN.View>
        )}

        {preSession && (
          <>
            <EliteText variant="caption" style={styles.idleInfo}>
              {template.durationMinutes} min · {template.cycles} ciclos · {template.phases.map(p => p.seconds + 's').join('-')}
            </EliteText>
            {/* T2 MENTE: contraindicaciones ANTES de iniciar (Wim Hof et al) */}
            {template.contraindications && template.contraindications.length > 0 && (
              <View style={styles.contraCard}>
                <Ionicons name="warning-outline" size={16} color="#EF9F27" />
                <EliteText variant="caption" style={styles.contraText}>
                  No recomendado con: {template.contraindications.join(' · ')}.
                  {' '}Si aplica, consulta con un experto antes.
                </EliteText>
              </View>
            )}
          </>
        )}

        {/* Controles — GradientCTA del design system (MB-5) */}
        <View style={styles.controls}>
          {status === 'idle' ? (
            <GradientCTA label="COMENZAR" onPress={handleStart} />
          ) : status === 'preparing' ? (
            <GradientCTA label="CANCELAR" variant="quiet" onPress={() => setStatus('idle')} />
          ) : status === 'running' ? (
            <>
              <GradientCTA label="PAUSAR" onPress={handlePause} />
              <GradientCTA label="TERMINAR" variant="quiet" onPress={handleEnd} />
            </>
          ) : (
            <>
              <GradientCTA label="REANUDAR" onPress={handleStart} />
              <GradientCTA label="TERMINAR" variant="quiet" onPress={handleEnd} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// === ESTILOS ===

const CIRCLE_SIZE = 200;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  backBtn: {
    position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm,
  },

  // Selector (A2/A3: hero full-bleed dentro del scroll; el padding vive en el body)
  selectorScroll: { paddingBottom: Spacing.xxl },
  selectorContent: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  selectorSection: {
    color: '#666', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1,
    marginTop: Spacing.sm, marginBottom: 12,
  },
  selectorSub: { color: Colors.textSecondary, marginBottom: Spacing.lg, fontSize: FontSizes.md },
  selectorCard: { marginBottom: Spacing.sm },
  selectorCardBody: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
  },
  selectorCardInfo: { flex: 1 },
  selectorCardTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: PURPLE },
  selectorCardDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 2 },
  selectorCardMeta: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginTop: 4, fontFamily: Fonts.semiBold },

  // Timer
  timerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  timerTitle: {
    fontSize: 22, fontFamily: Fonts.extraBold, color: PURPLE, letterSpacing: 2, marginBottom: Spacing.lg,
  },

  // Círculo animado
  circleContainer: {
    width: CIRCLE_SIZE * 1.6, height: CIRCLE_SIZE * 1.6,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  breathCircle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: Radius.pill,
    backgroundColor: PURPLE + '15', borderWidth: 3, borderColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 25, elevation: 8,
  },
  actionText: {
    fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, color: TEXT_COLORS.primary, letterSpacing: 2,
  },
  phaseCountdown: {
    fontSize: 40, fontFamily: Fonts.extraBold, color: PURPLE, fontVariant: ['tabular-nums'],
    marginTop: Spacing.xs,
  },

  // Info
  infoSection: { alignItems: 'center', marginBottom: Spacing.lg, width: '60%' },
  cycleText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, marginBottom: Spacing.xs },
  remainingText: {
    color: PURPLE, fontSize: 20, fontFamily: Fonts.bold, fontVariant: ['tabular-nums'],
    marginBottom: Spacing.sm,
  },
  totalProgressBar: {
    width: '100%', height: 3, backgroundColor: Colors.surfaceLight, borderRadius: Radius.xs, overflow: 'hidden',
  },
  totalProgressFill: { height: '100%', backgroundColor: PURPLE, borderRadius: Radius.xs },
  idleInfo: { color: Colors.textSecondary, marginBottom: Spacing.md, fontSize: FontSizes.md },
  // T2 MENTE: advertencia de contraindicaciones antes de iniciar
  contraCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(239,159,39,0.10)', borderColor: 'rgba(239,159,39,0.35)',
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg, marginHorizontal: Spacing.lg, maxWidth: 340,
  },
  contraText: { flex: 1, color: '#EF9F27', fontSize: FontSizes.sm, lineHeight: 18 },

  // Controles (botones = GradientCTA del design system)
  controls: { alignItems: 'center', gap: Spacing.md },

  // Completado
  completedContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  completedTitle: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, color: PURPLE },
  completedSub: { color: Colors.textSecondary, fontSize: FontSizes.md },
  completedMessage: {
    color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center',
    fontSize: FontSizes.lg, paddingHorizontal: Spacing.xl, marginVertical: Spacing.md,
  },
  // Config
  configContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg,
  },
  configTitle: {
    fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, color: PURPLE, letterSpacing: 3, marginBottom: Spacing.xs,
  },
  configSub: { color: Colors.textSecondary, marginBottom: Spacing.xl, fontSize: FontSizes.md },
  configRows: { width: '100%', gap: Spacing.sm },
  configDivider: {
    width: '100%', height: 1, backgroundColor: Colors.surfaceLight, marginVertical: Spacing.md,
  },
  configRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingVertical: Spacing.xs,
  },
  configRowLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, color: Colors.textPrimary },
  configStepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  configStepBtn: {
    width: 44, height: 44, borderRadius: Radius.lg, borderWidth: 1, borderColor: ATP_BRAND.teal + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  configStepValue: {
    fontFamily: Fonts.extraBold, fontSize: FontSizes.hero, color: PURPLE, minWidth: 50, textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  configStepUnit: { fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, color: Colors.textSecondary },
  configTotal: {
    color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.xl, fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },
});
