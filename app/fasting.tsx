/**
 * Ayuno — Rediseño estilo ZERO.
 *
 * 3 estados: IDLE (selector + preview), ACTIVE (ring timer + zonas), HISTORY.
 * Columnas DB: fast_start, target_hours, actual_hours, status, date.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Dimensions, DeviceEventEmitter, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';
import { warn as logWarn } from '../src/lib/logger';
import { awardBooleanElectron } from '../src/services/electron-service';
import { getFastingTier } from '../src/constants/electrons';
import * as fastingService from '../src/services/fasting-service';
import { useAnalytics, ATP_EVENTS } from '../src/lib/analytics';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { BreakFastGuide } from '@/src/components/nutrition/BreakFastGuide';
import { ATP_BRAND, brandGradient } from '@/src/constants/brand';
import { FASTING_PHASES, getCurrentPhase, getNextPhase } from '@/src/constants/fasting-phases';
import { toLocalDateString } from '../src/utils/date-helpers';
import { TimeWheelPicker } from '@/src/components/ui/TimeWheelPicker';
import { AttestationGateModal } from '@/src/components/safety/AttestationGateModal';
import { FASTING_ALERTS } from '@/src/constants/attestation-copy';
import { fastingGateDecision, fastingAlertForHours, type GateDecision } from '@/src/services/safety/protocol-gate-core';
import { getSafetyState } from '@/src/services/safety/protocol-gate-service';
import { getSafetyParams, DEFAULT_SAFETY_PARAMS, type FastingSafetyParams } from '@/src/services/safety/safety-params-service';

// Presets rápidos para los wheel pickers (reemplazan mode="datetime").
const START_PRESETS = [
  { label: 'Hace 12h', getDate: () => new Date(Date.now() - 12 * 60 * 60 * 1000) },
  { label: 'Hace 16h', getDate: () => new Date(Date.now() - 16 * 60 * 60 * 1000) },
  { label: 'Hace 24h', getDate: () => new Date(Date.now() - 24 * 60 * 60 * 1000) },
];
const PAST_END_PRESETS = [
  { label: 'Ahora', getDate: () => new Date() },
  { label: 'Hace 1h', getDate: () => new Date(Date.now() - 60 * 60 * 1000) },
];
// MB-8 Track F: BREAK_END_PRESETS se retiró — TERMINAR cierra al momento
// (SPEC: sin diálogo de confirmación); corregir un fin olvidado vive en el
// historial (editar ayuno).

/** Mapea el reason de un MutationResult fallido a copy en español para el usuario. */
function fastErrorCopy(reason: fastingService.MutationReason): string {
  switch (reason) {
    case 'no_rows': return 'La fila no se encontró. Cierra y abre la app.';
    case 'constraint': return 'Hay un registro en conflicto. Revisa tu historial de ayunos.';
    case 'rls': return 'No tienes permiso para esta operación. Vuelve a iniciar sesión.';
    case 'network': return 'Problema de conexión. Revisa tu internet e intenta de nuevo.';
    default: return 'Ocurrió un error. Intenta de nuevo.';
  }
}

// Decisión de producto: el ayuno máximo en ATP es 120 horas. Protocolos
// funcionales no proponen ayunos más largos; ayunos mayores requieren
// supervisión médica.
const MAX_FAST_HOURS = 120;
// Margen para detectar ayunos olvidados/corruptos (> límite + 24h).
const FAST_CORRUPT_THRESHOLD_HOURS = MAX_FAST_HOURS + 24;

// CONTENIDO MÉDICO — pendiente validación de Mariana antes de Founders M1
// Sprint Compliance 3: los hitos de CELEBRACIÓN terminan en 48h. A partir de
// 36h corren las ALERTAS DE SEGURIDAD escalantes del sign-off legal
// (FASTING_ALERTS §2.5), no celebraciones — 72h/96h se eliminaron.
const FAST_MILESTONES: { hours: number; title: string; message: string }[] = [
  {
    hours: 24,
    title: '24 horas de ayuno',
    message: 'Tu cuerpo agotó el glucógeno y entró en cetosis — ya estás quemando grasa. Mantén la hidratación.',
  },
  {
    hours: 48,
    title: '48 horas de ayuno',
    message: 'Entras en ayuno prolongado: la grasa domina como combustible. Asegura electrolitos —sodio, potasio, magnesio— e hidrátate bien.',
  },
  // 120h se maneja vía cierre automático (ver autoCloseAtLimit).
];

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.65;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Protocolos de ayuno (copy es-MX — E.3: toda sigla se explica)
const FASTING_PROTOCOLS = [
  { id: '12:12', hours: 12, label: '12:12', description: 'Para empezar — 12 h de ayuno, 12 de alimentación', color: '#22c55e' },
  { id: '14:10', hours: 14, label: '14:10', description: 'Intermedio — 14 h de ayuno, 10 de alimentación', color: '#38bdf8' },
  { id: '16:8', hours: 16, label: '16:8', description: 'El clásico — 16 h de ayuno, 8 de alimentación', color: '#a8e02a' },
  { id: '18:6', hours: 18, label: '18:6', description: 'Avanzado — 18 h de ayuno, 6 de alimentación', color: '#f59e0b' },
  { id: '20:4', hours: 20, label: '20:4', description: 'Exigente — 20 h de ayuno, 4 de alimentación', color: '#f97316' },
  { id: '24:0', hours: 24, label: 'OMAD', description: 'Una comida al día — 24 h de ayuno', color: '#ef4444' },
  { id: '36:0', hours: 36, label: '36 h', description: 'Extendido — 36 horas, requiere experiencia', color: '#c084fc' },
  { id: '72:0', hours: 72, label: '72 h', description: 'Prolongado — 72 horas, con protocolo de seguridad', color: '#ec4899' },
];

// MB-8 Track F.1: las fases metabólicas viven parametrizadas en UN solo lugar
// (src/constants/fasting-phases — ventanas PROVISIONALES, las cierra Enrique).
// Aliases para el resto del archivo (breakFast, historial).
const getCurrentZone = getCurrentPhase;
const getNextZone = getNextPhase;

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** F.3: "desde tu último ayuno" — en días cuando ya son ≥48 h. */
function formatSince(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / 1440);
  if (days >= 2) return `${days} días`;
  return formatDuration(totalMinutes);
}

/** F.4: anillo chico de la tira semanal (consistencia de un vistazo). */
function DayRing({ letter, pct, isToday }: { letter: string; pct: number; isToday: boolean }) {
  const size = 30;
  const sw = 3;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#1f1f1f" strokeWidth={sw} fill="transparent" />
        {pct > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={ATP_BRAND.lime} strokeWidth={sw} fill="transparent"
            strokeDasharray={`${c}`} strokeDashoffset={c * (1 - Math.min(1, pct))}
            strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <Text style={{ color: isToday ? '#fff' : '#555', fontSize: 10, fontWeight: isToday ? '800' : '600' }}>
        {letter}
      </Text>
    </View>
  );
}

/**
 * Devuelve un Date válido o null. Evita `Invalid Date` propagándose a
 * `toLocaleTimeString`/`toLocaleDateString` (RangeError) o a props
 * numéricas de SVG (NaN → crash de react-native-svg).
 */
function safeDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value as any);
  return isNaN(d.getTime()) ? null : d;
}

export default function FastingScreen() {
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const [userId, setUserId] = useState('');
  const [activeFast, setActiveFast] = useState<any>(null);
  const [selectedProtocol, setSelectedProtocol] = useState(FASTING_PROTOCOLS[2]); // 16:8
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [elapsed, setElapsed] = useState(0); // minutos
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Custom start time (IDLE): customStartSet = usar hora custom al iniciar;
  // startWheelOpen = modal del wheel picker abierto.
  const [customStartSet, setCustomStartSet] = useState(false);
  const [startWheelOpen, setStartWheelOpen] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(new Date());
  // MB-8 Track F: hojas de meta (F.2) y de fase metabólica (F.1).
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [phaseSheetOpen, setPhaseSheetOpen] = useState(false);
  // Cambio de meta con gate pendiente (ayuno activo → objetivo largo).
  const [pendingGoal, setPendingGoal] = useState<typeof FASTING_PROTOCOLS[number] | null>(null);

  // Sprint Compliance 3: gate de ayuno prolongado (atestación >48h + hard
  // blocks embarazo/TCA/diabetes) + parámetros de seguridad server-driven.
  const [fastingGate, setFastingGate] = useState<Exclude<GateDecision, { result: 'allowed' }> | null>(null);
  const [gateVisible, setGateVisible] = useState(false);
  const fastingParamsRef = useRef<FastingSafetyParams>(DEFAULT_SAFETY_PARAMS.fasting_safety);
  useEffect(() => {
    getSafetyParams().then(p => { fastingParamsRef.current = p.fasting_safety; }).catch(() => {});
  }, []);

  // Track D.2 (MB-8): cierre guiado del ayuno (proteína primero).
  const [breakGuide, setBreakGuide] = useState<{ fastId: string; hours: number; zoneLabel: string } | null>(null);

  // Registro de ayuno pasado
  const [showPastFast, setShowPastFast] = useState(false);
  const [pastStart, setPastStart] = useState(new Date(Date.now() - 16 * 60 * 60 * 1000));
  const [pastEnd, setPastEnd] = useState(new Date());
  const [pastPickerMode, setPastPickerMode] = useState<'start' | 'end'>('start');
  const [pastWheelOpen, setPastWheelOpen] = useState(false); // modal del wheel para ayuno pasado

  // Editar ayuno pasado del historial (flujo de 2 pasos: start → end).
  const [editingFast, setEditingFast] = useState<fastingService.FastingLog | null>(null);
  const [editMode, setEditMode] = useState<'start' | 'end' | null>(null);
  // Editar SOLO la hora de inicio del ayuno activo (1 paso).
  const [activeStartEditOpen, setActiveStartEditOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  // Sprint 1.5 B/C: el timer arrancaba SIEMPRE 16:8 hardcoded. Ahora inicializa
  // del goal del user (user_day_preferences.goals.fasting_hours). Con la muerte
  // de protocol-config, el picker de ESTA pantalla es el writer del goal.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('user_day_preferences').select('goals').eq('user_id', userId).maybeSingle();
        const hours = (data?.goals as any)?.fasting_hours;
        if (typeof hours === 'number') {
          const match = FASTING_PROTOCOLS.find(p => p.hours === hours);
          if (match) setSelectedProtocol(prev => (activeFast ? prev : match));
        }
      } catch { /* default 16:8 */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /** Persiste el protocolo elegido como goal (merge sobre goals existentes). */
  const persistFastingGoal = useCallback(async (hours: number) => {
    if (!userId) return;
    try {
      const { data, error: readErr } = await supabase
        .from('user_day_preferences').select('goals').eq('user_id', userId).maybeSingle();
      if (readErr) logWarn('[fasting] goals read failed:', readErr.message);
      const goals = { ...((data?.goals as any) ?? {}), fasting_hours: hours };
      // MB-8 Track B (G8): el try/catch no atrapa 4xx — chequear {error}.
      const { error } = await supabase.from('user_day_preferences').upsert({ user_id: userId, goals });
      if (error) logWarn('[fasting] goal upsert failed:', error.message);
    } catch (e) { logWarn('[fasting] persistFastingGoal failed:', e); }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    if (userId) {
      loadActiveFast();
      loadHistory();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [userId]));

  // Hitos mostrados para el ayuno activo (persistido por fast.id).
  const shownMilestonesRef = useRef<Set<number>>(new Set());
  const autoCloseTriggeredRef = useRef(false);
  const milestoneStorageKey = (fastId: string) => `@atp/fast_milestones_${fastId}`;

  // Reset y carga de hitos al cambiar de ayuno activo.
  useEffect(() => {
    autoCloseTriggeredRef.current = false;
    if (!activeFast?.id) {
      shownMilestonesRef.current = new Set();
      return;
    }
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(milestoneStorageKey(activeFast.id));
        const arr: number[] = raw ? JSON.parse(raw) : [];
        shownMilestonesRef.current = new Set(Array.isArray(arr) ? arr : []);
      } catch {
        shownMilestonesRef.current = new Set();
      }
    })();
  }, [activeFast?.id]);

  // Timer tick cada 30 segundos
  useEffect(() => {
    if (activeFast) {
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 30000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [activeFast]);

  function updateElapsed() {
    const start = safeDate(activeFast?.fast_start);
    if (!start) return;
    const elapsedMs = Date.now() - start.getTime();
    const elapsedMin = elapsedMs / (1000 * 60);
    setElapsed(elapsedMin);
    const hours = elapsedMin / 60;

    // Auto-cierre en vivo al alcanzar 120h.
    if (hours >= MAX_FAST_HOURS && !autoCloseTriggeredRef.current) {
      autoCloseTriggeredRef.current = true;
      autoCloseAtLimit(start);
      return;
    }

    // Hitos de celebración (24/48).
    for (const m of FAST_MILESTONES) {
      if (hours >= m.hours && !shownMilestonesRef.current.has(m.hours)) {
        shownMilestonesRef.current.add(m.hours);
        persistShownMilestones();
        Alert.alert(m.title, m.message);
      }
    }

    // Sprint Compliance 3: alertas de seguridad ESCALANTES (§2.5 del sign-off)
    // desde las 36h. Comparten el storage de hitos (marcan su hora).
    const safetyAlert = fastingAlertForHours(hours, shownMilestonesRef.current, fastingParamsRef.current);
    if (safetyAlert) {
      shownMilestonesRef.current.add(safetyAlert.markHour);
      persistShownMilestones();
      const copy = FASTING_ALERTS[safetyAlert.key];
      Alert.alert(copy.title, copy.message);
    }
  }

  function persistShownMilestones() {
    if (!activeFast?.id) return;
    AsyncStorage.setItem(
      milestoneStorageKey(activeFast.id),
      JSON.stringify(Array.from(shownMilestonesRef.current)),
    ).catch(() => {});
  }

  async function autoCloseAtLimit(start: Date) {
    if (!activeFast) return;
    const fastEnd = new Date(start.getTime() + MAX_FAST_HOURS * 60 * 60 * 1000);
    const result = await fastingService.autoCloseAtLimit({ fastId: activeFast.id, hours: MAX_FAST_HOURS, fastEnd });
    if (!result.ok) {
      logWarn('Live auto-close at limit failed:', result.message);
      // No limpiar estado: dejar al usuario reintentar manualmente.
      autoCloseTriggeredRef.current = false;
      return;
    }
    try {
      const tier = getFastingTier(MAX_FAST_HOURS);
      if (tier) {
        await awardBooleanElectron(userId, tier);
        DeviceEventEmitter.emit('electrons_changed');
      }
    } catch { /* opcional */ }
    if (activeFast.id) {
      AsyncStorage.removeItem(milestoneStorageKey(activeFast.id)).catch(() => {});
    }
    setActiveFast(null);
    setElapsed(0);
    DeviceEventEmitter.emit('day_changed');
    loadHistory();
    // Texto EXACTO §2.5 del sign-off (auto-cierre obligatorio a 120h).
    Alert.alert(FASTING_ALERTS.autoClose120h.title, FASTING_ALERTS.autoClose120h.message);
  }

  async function loadActiveFast() {
    const data = await fastingService.getActiveFast(userId);

    // Reemplaza AY-6: alineado al límite duro de 120h.
    // - fast_start inválido/nulo → ayuno corrupto → cancelar.
    // - 120h ≤ duración ≤ 144h → ayuno alcanzó el límite → cerrar como
    //   COMPLETADO a 120h exactas + aviso.
    // - duración > 144h → ayuno olvidado/corrupto → cancelar (NO inflar logros).
    if (data) {
      const start = safeDate(data.fast_start);
      if (!start) {
        const r = await fastingService.cancelActiveFast(data.id);
        if (!r.ok) {
          // No se pudo limpiar en DB → mantener el estado para reintentar (no perder la fila).
          logWarn('Auto-cancel invalid-start fast failed:', r.message);
          setActiveFast(data);
          return;
        }
        setActiveFast(null);
        return;
      }
      const hoursElapsed = (Date.now() - start.getTime()) / (1000 * 60 * 60);
      if (!isFinite(hoursElapsed)) {
        const r = await fastingService.cancelActiveFast(data.id);
        if (!r.ok) {
          logWarn('Auto-cancel non-finite fast failed:', r.message);
          setActiveFast(data);
          return;
        }
        setActiveFast(null);
        return;
      }
      if (hoursElapsed > FAST_CORRUPT_THRESHOLD_HOURS) {
        // > 144h: olvidado, no es un ayuno real.
        const r = await fastingService.cancelActiveFast(data.id);
        if (!r.ok) {
          logWarn('Auto-cancel forgotten fast failed:', r.message);
          setActiveFast(data);
          return;
        }
        setActiveFast(null);
        Alert.alert('Ayuno limpiado', 'Encontramos un ayuno sin cerrar y lo limpiamos.');
        return;
      }
      if (hoursElapsed >= MAX_FAST_HOURS) {
        // 120h ≤ duración ≤ 144h: cerrar como completado a 120h exactas.
        const fastEnd = new Date(start.getTime() + MAX_FAST_HOURS * 60 * 60 * 1000);
        const closeResult = await fastingService.autoCloseAtLimit({ fastId: data.id, hours: MAX_FAST_HOURS, fastEnd });
        if (!closeResult.ok) {
          // Cierre falló → mantener el ayuno activo visible para reintentar (no perderlo).
          logWarn('Auto-close at limit failed:', closeResult.message);
          setActiveFast(data);
          return;
        }
        // Electrón por tier de ayuno
        try {
          const tier = getFastingTier(MAX_FAST_HOURS);
          if (tier) {
            await awardBooleanElectron(userId, tier);
            DeviceEventEmitter.emit('electrons_changed');
          }
        } catch { /* opcional */ }
        DeviceEventEmitter.emit('day_changed');
        // Texto EXACTO §2.5 del sign-off (auto-cierre obligatorio a 120h).
        Alert.alert(FASTING_ALERTS.autoClose120h.title, FASTING_ALERTS.autoClose120h.message);
        setActiveFast(null);
        loadHistory();
        return;
      }
    }

    setActiveFast(data);
    if (data?.target_hours) {
      const protocol = FASTING_PROTOCOLS.find(p => p.hours === data.target_hours) || FASTING_PROTOCOLS[2];
      setSelectedProtocol(protocol);
    }
  }

  async function loadHistory() {
    const data = await fastingService.loadHistory(userId);
    setHistory(data);
  }

  async function startFast() {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // AY-8: bloquear si ya hay un ayuno activo (evita huérfanos duplicados).
    const existing = await fastingService.getActiveFast(userId);
    if (existing) {
      Alert.alert('Ayuno activo', 'Ya tienes un ayuno en curso. Termínalo o cancélalo antes de iniciar uno nuevo.');
      // Recargar para que la UI muestre el ayuno activo en vez del IDLE.
      loadActiveFast();
      return;
    }

    // Sprint Compliance 3: gate del ayuno — hard block embarazo/lactancia
    // (>12h) y TCA/diabetes declarados (>48h); atestación §2.4 en objetivo >48h.
    const safetyState = await getSafetyState(userId);
    const decision = fastingGateDecision(selectedProtocol.hours, safetyState, fastingParamsRef.current);
    if (decision.result !== 'allowed') {
      setFastingGate(decision);
      setGateVisible(true);
      return;
    }
    await doStartFast();
  }

  /** Arranque real del contador (post-gate). */
  async function doStartFast() {
    const startTime = customStartSet ? customStartTime : new Date();
    analytics.track(ATP_EVENTS.FAST_START_ATTEMPTED, { targetHours: selectedProtocol.hours, customStart: customStartSet });
    const result = await fastingService.startFast({
      userId,
      targetHours: selectedProtocol.hours,
      startTime,
    });
    if (!result.ok) {
      analytics.track(ATP_EVENTS.FAST_START_FAILED, { reason: result.reason });
      Alert.alert('Error', 'No se pudo iniciar el ayuno. Intenta de nuevo.');
      return;
    }
    analytics.track(ATP_EVENTS.FAST_START_SUCCEEDED, { targetHours: selectedProtocol.hours });
    setActiveFast(result.data);
    setCustomStartSet(false);
    DeviceEventEmitter.emit('day_changed');
  }

  async function breakFastWithTime(endTime: Date) {
    if (!activeFast) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const start = safeDate(activeFast.fast_start);
    if (!start) {
      Alert.alert('Ayuno inválido', 'Este ayuno tiene una hora de inicio corrupta. Vamos a cancelarlo.');
      await fastingService.cancelActiveFast(activeFast.id);
      setActiveFast(null);
      setElapsed(0);
      return;
    }
    const actualHours = (endTime.getTime() - start.getTime()) / (1000 * 60 * 60);

    // AY-4: validar contra NaN/Infinity además de <=0.
    if (!isFinite(actualHours) || actualHours <= 0) {
      Alert.alert('Error', 'La hora de fin debe ser después del inicio.');
      return;
    }

    // AY-5 / F16.13: el servicio verifica filas (.select()). Un UPDATE que
    // devuelve 0 filas (RLS / row-not-found / 200-but-0-rows) → ok:false →
    // NO limpiamos estado local (evita el bug "Paty atrapada 90h").
    analytics.track(ATP_EVENTS.FAST_BREAK_ATTEMPTED, { fastId: activeFast.id });
    const result = await fastingService.breakFast({
      fastId: activeFast.id,
      endTime,
      actualHours,
    });
    if (!result.ok) {
      analytics.track(ATP_EVENTS.FAST_BREAK_FAILED, { reason: result.reason });
      Alert.alert('No se pudo cerrar el ayuno', fastErrorCopy(result.reason));
      return; // CRITICAL: no limpiar estado, no premiar electrón.
    }
    analytics.track(ATP_EVENTS.FAST_BREAK_SUCCEEDED, { durationHours: Math.round(actualHours * 10) / 10 });

    // Electrón por tier de ayuno
    try {
      const tier = getFastingTier(actualHours);
      if (tier) {
        await awardBooleanElectron(userId, tier);
        DeviceEventEmitter.emit('electrons_changed');
      }
    } catch { /* opcional */ }

    const zone = getCurrentZone(actualHours);
    // Track D.2 (MB-8): cierre guiado — proteína primero + broke_fast_with.
    setBreakGuide({ fastId: activeFast.id, hours: actualHours, zoneLabel: zone.label });

    if (activeFast?.id) {
      AsyncStorage.removeItem(milestoneStorageKey(activeFast.id)).catch(() => {});
    }
    setActiveFast(null);
    setElapsed(0);
    loadHistory();
    DeviceEventEmitter.emit('day_changed');
  }

  // MB-8 Track F.0: TERMINAR ya no confirma con diálogo (SPEC: el botón baja
  // de énfasis visual, no se esconde) — llama breakFastWithTime(new Date())
  // directo. El cierre guiado (BreakFastGuide) es la pantalla de aterrizaje.

  // === META EDITABLE (F.2) ===
  /** Aplica la meta elegida: estado + goal persistido + target del ayuno activo. */
  async function applyGoal(p: typeof FASTING_PROTOCOLS[number]) {
    setSelectedProtocol(p);
    persistFastingGoal(p.hours);
    if (activeFast) {
      const r = await fastingService.updateFast({ fastId: activeFast.id, targetHours: p.hours });
      if (r.ok) setActiveFast(r.data);
      else logWarn('[fasting] target update failed:', r.message);
    }
  }

  /** Selección desde la hoja de meta. Con ayuno ACTIVO y objetivo largo, corre
   * el mismo gate de seguridad que al iniciar (no se brinca la atestación). */
  async function selectGoal(p: typeof FASTING_PROTOCOLS[number]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoalSheetOpen(false);
    if (activeFast) {
      const safetyState = await getSafetyState(userId);
      const decision = fastingGateDecision(p.hours, safetyState, fastingParamsRef.current);
      if (decision.result !== 'allowed') {
        setPendingGoal(p);
        setFastingGate(decision);
        setGateVisible(true);
        return;
      }
    }
    applyGoal(p);
  }

  // Efectos secundarios de un savePastFast exitoso (electrón + refresh + cleanup).
  async function finalizePastFastSuccess(hours: number) {
    try {
      const tier = getFastingTier(hours);
      if (tier) {
        await awardBooleanElectron(userId, tier);
        DeviceEventEmitter.emit('electrons_changed');
      }
    } catch { /* opcional */ }
    setShowPastFast(false);
    loadHistory();
    DeviceEventEmitter.emit('day_changed');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function savePastFast() {
    const hours = (pastEnd.getTime() - pastStart.getTime()) / (1000 * 60 * 60);
    // AY-4: validar contra NaN además de <=0.
    if (!isFinite(hours) || hours <= 0) {
      Alert.alert('Error', 'El fin debe ser después del inicio.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // AY-9: fecha local (regla #3) — el servicio usa toLocalDateString(start).
    const doSave = () => fastingService.savePastFast({
      userId,
      start: pastStart,
      end: pastEnd,
      targetHours: selectedProtocol.hours,
      actualHours: hours,
    });
    const result = await doSave();

    // UNIQUE violation (23505): un registro en conflicto. Ofrecer reemplazar.
    // Post-070 el viejo UNIQUE(user_id,date) ya no existe; el partial unique es
    // sobre status='active' y savePastFast inserta 'completed', así que este path
    // es defensivo (rara vez se dispara). Ver flag COWORK_REPORT.
    if (!result.ok && result.reason === 'constraint') {
      Alert.alert(
        'Ya hay un registro',
        'Ya tienes un ayuno que se solapa con ese rango. ¿Reemplazarlo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reemplazar',
            onPress: async () => {
              // Primero cancela el ayuno activo (si lo hay), luego reintenta.
              const active = await fastingService.getActiveFast(userId);
              if (active) await fastingService.cancelActiveFast(active.id);
              const retry = await doSave();
              if (!retry.ok) {
                Alert.alert('Error', fastErrorCopy(retry.reason));
                return;
              }
              await finalizePastFastSuccess(hours);
            },
          },
        ],
      );
      return;
    }

    if (!result.ok) {
      Alert.alert('Error', fastErrorCopy(result.reason));
      return;
    }

    await finalizePastFastSuccess(hours);
  }

  async function cancelFast() {
    if (!activeFast) return;
    Alert.alert('Cancelar ayuno', '¿Eliminar este ayuno sin registrarlo?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          const cancelledId = activeFast.id;
          analytics.track(ATP_EVENTS.FAST_CANCEL_ATTEMPTED, { fastId: cancelledId });
          const result = await fastingService.cancelActiveFast(cancelledId);
          if (!result.ok) {
            analytics.track(ATP_EVENTS.FAST_CANCEL_FAILED, { reason: result.reason });
            Alert.alert('No se pudo cancelar', fastErrorCopy(result.reason));
            return; // NO limpiar estado si falló.
          }
          analytics.track(ATP_EVENTS.FAST_CANCEL_SUCCEEDED, { fastId: cancelledId });
          if (cancelledId) {
            AsyncStorage.removeItem(milestoneStorageKey(cancelledId)).catch(() => {});
          }
          setActiveFast(null);
          setElapsed(0);
          DeviceEventEmitter.emit('day_changed');
          DeviceEventEmitter.emit('electrons_changed');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  async function deleteFast(id: string) {
    Alert.alert('Eliminar registro', '¿Eliminar este ayuno del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          analytics.track(ATP_EVENTS.FAST_DELETE_ATTEMPTED, { fastId: id });
          const result = await fastingService.deleteFast(id);
          if (!result.ok) {
            analytics.track(ATP_EVENTS.FAST_DELETE_FAILED, { reason: result.reason });
            Alert.alert('No se pudo eliminar', fastErrorCopy(result.reason));
            return;
          }
          analytics.track(ATP_EVENTS.FAST_DELETE_SUCCEEDED, { fastId: id });
          loadHistory();
          DeviceEventEmitter.emit('day_changed');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  // === EDITAR AYUNO (start/end de un ayuno existente) ===
  function openEditFast(fast: fastingService.FastingLog) {
    if (!fast.fast_start) {
      Alert.alert('No editable', 'Este ayuno no tiene hora de inicio válida.');
      return;
    }
    analytics.track(ATP_EVENTS.FAST_EDIT_ATTEMPTED, { fastId: fast.id });
    setEditingFast(fast);
    setEditMode('start');
  }

  function closeEdit() {
    setEditingFast(null);
    setEditMode(null);
  }

  // Confirma el nuevo inicio → pasa a editar el fin (sin persistir todavía).
  function handleEditStartConfirm(newStart: Date) {
    if (!editingFast) return;
    setEditingFast({ ...editingFast, fast_start: newStart.toISOString() });
    setEditMode('end');
  }

  // Confirma el nuevo fin → persiste start+end vía updateFast.
  async function handleEditEndConfirm(newEnd: Date) {
    if (!editingFast || !editingFast.fast_start) { closeEdit(); return; }
    const result = await fastingService.updateFast({
      fastId: editingFast.id,
      fastStart: new Date(editingFast.fast_start),
      fastEnd: newEnd,
    });
    if (!result.ok) {
      analytics.track(ATP_EVENTS.FAST_EDIT_FAILED, { reason: result.reason });
      Alert.alert('No se pudo guardar', fastErrorCopy(result.reason));
      closeEdit();
      return;
    }
    analytics.track(ATP_EVENTS.FAST_EDIT_SUCCEEDED, { fastId: editingFast.id });
    await loadHistory();
    DeviceEventEmitter.emit('day_changed');
    DeviceEventEmitter.emit('electrons_changed');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeEdit();
  }

  // Edita SOLO la hora de inicio del ayuno activo (no toca el fin: sigue activo).
  async function handleActiveStartEditConfirm(newStart: Date) {
    if (!activeFast) { setActiveStartEditOpen(false); return; }
    analytics.track(ATP_EVENTS.FAST_EDIT_ATTEMPTED, { fastId: activeFast.id, which: 'active_start' });
    const result = await fastingService.updateFast({ fastId: activeFast.id, fastStart: newStart });
    if (!result.ok) {
      analytics.track(ATP_EVENTS.FAST_EDIT_FAILED, { reason: result.reason });
      Alert.alert('No se pudo guardar', fastErrorCopy(result.reason));
      setActiveStartEditOpen(false);
      return;
    }
    analytics.track(ATP_EVENTS.FAST_EDIT_SUCCEEDED, { fastId: activeFast.id, which: 'active_start' });
    setActiveFast(result.data);
    updateElapsed();
    DeviceEventEmitter.emit('day_changed');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveStartEditOpen(false);
  }

  // === CÁLCULOS ===
  // AY-1: blindar contra NaN/Infinity. Si elapsed o targetMinutes son
  // inválidos, `progress` cae a 0 (en vez de propagarse a SVG y crashear).
  const safeElapsed = isFinite(elapsed) ? elapsed : 0;
  const elapsedHours = safeElapsed / 60;
  const targetMinutes = selectedProtocol.hours * 60;
  const rawProgress = targetMinutes > 0 ? safeElapsed / targetMinutes : 0;
  const progress = isFinite(rawProgress) ? Math.max(0, Math.min(rawProgress, 1)) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const currentZone = getCurrentZone(elapsedHours);
  const nextZone = getNextZone(elapsedHours);
  const timeToNext = nextZone ? (nextZone.hours * 60 - safeElapsed) : 0;
  const remainingMinutes = Math.max(targetMinutes - safeElapsed, 0);

  // === DERIVADOS DEL LAYOUT MB-8 (Track F) ===
  // F.4: marcador que viaja sobre el anillo (posición polar del progreso).
  const markerAngle = progress * 2 * Math.PI - Math.PI / 2;
  const markerX = RING_SIZE / 2 + RADIUS * Math.cos(markerAngle);
  const markerY = RING_SIZE / 2 + RADIUS * Math.sin(markerAngle);
  // F.3: vacío que informa — tiempo desde el último ayuno completado.
  const lastCompleted = history[0] ?? null;
  const lastEnd = lastCompleted ? (safeDate(lastCompleted.fast_end) ?? safeDate(lastCompleted.fast_start)) : null;
  const sinceLastMin = lastEnd ? Math.max(0, (Date.now() - lastEnd.getTime()) / 60000) : 0;
  // F.2: hora meta proyectada del ayuno activo (recálculo en vivo).
  const activeStart = activeFast ? safeDate(activeFast.fast_start) : null;
  const goalEnd = activeStart ? new Date(activeStart.getTime() + selectedProtocol.hours * 3600000) : null;
  // F.4: tira de la semana (7 días terminando hoy; hoy incluye el ayuno en curso).
  const WEEK_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const week: { key: string; letter: string; pct: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toLocalDateString(d);
    let pct = 0;
    for (const f of history) {
      if (f.date !== key) continue;
      const t = f.target_hours || 16;
      pct = Math.max(pct, Math.min(1, (f.actual_hours || 0) / t));
    }
    const isToday = i === 0;
    if (isToday && activeFast) pct = Math.max(pct, progress);
    week.push({ key, letter: WEEK_LETTERS[d.getDay()], pct, isToday });
  }

  // === RENDER ===
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View>
              <Text style={{ color: '#5B9BD5', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
              {/* F.0.6: el estado se anuncia con palabras */}
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>
                {activeFast ? 'Estás ayunando' : 'AYUNO'}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setShowHistory(!showHistory)} hitSlop={12}>
            <Ionicons name={showHistory ? 'timer-outline' : 'time-outline'} size={24} color="#999" />
          </Pressable>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════
          HISTORIAL
      ════════════════════════════════════════════════════════════════ */}
      {showHistory ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 16 }}>
            HISTORIAL ({history.length})
          </Text>

          {history.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="hourglass-outline" size={40} color="#333" />
              <Text style={{ color: '#666', fontSize: 14, marginTop: 12 }}>Aún no tienes ayunos completados</Text>
            </View>
          ) : (
            history.map(fast => {
              // AY-2: fallback a null si fast_start es inválido para evitar RangeError en toLocaleDateString.
              const date = safeDate(fast.fast_start);
              const hours = fast.actual_hours || 0;
              const zone = getCurrentZone(hours);
              return (
                <Pressable
                  key={fast.id}
                  onPress={() => openEditFast(fast)}
                  onLongPress={() => deleteFast(fast.id)}
                  style={{
                    backgroundColor: '#0a0a0a', borderRadius: 16, padding: 16, marginBottom: 8,
                    borderLeftWidth: 3, borderLeftColor: zone.color,
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                  }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: `${zone.color}15`,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: zone.color, fontSize: 16, fontWeight: '900' }}>
                      {Math.round(hours)}h
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                      Ayuno de {Math.round(hours * 10) / 10} horas
                    </Text>
                    <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                      {date ? date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
                      {' · '}{zone.label}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: zone.color, fontSize: 11, fontWeight: '600' }}>
                      {fast.target_hours}h objetivo
                    </Text>
                    <Text style={{ color: hours >= fast.target_hours ? '#22c55e' : '#f59e0b', fontSize: 10, marginTop: 2 }}>
                      {hours >= fast.target_hours ? '✓ Completado' : 'Parcial'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
          <Text style={{ color: '#444', fontSize: 9, textAlign: 'center', marginTop: 8 }}>
            Toca para editar · mantén presionado para eliminar
          </Text>

          {/* Registrar ayuno pasado */}
          <Pressable
            onPress={() => { setPastStart(new Date(Date.now() - 16 * 60 * 60 * 1000)); setPastEnd(new Date()); setPastPickerMode('start'); setShowPastFast(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 12 }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#a8e02a" />
            <Text style={{ color: '#a8e02a', fontSize: 13, fontWeight: '600' }}>Registrar ayuno pasado</Text>
          </Pressable>

          {showPastFast && (
            <View style={{
              backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20, marginTop: 16,
              borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
            }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 16 }}>
                Registrar ayuno pasado
              </Text>

              {/* Toggle start/end */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Pressable
                  onPress={() => { setPastPickerMode('start'); setPastWheelOpen(true); analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { which: 'past_start' }); }}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: pastPickerMode === 'start' ? 'rgba(168,224,42,0.15)' : '#111',
                    borderWidth: 1, borderColor: pastPickerMode === 'start' ? '#a8e02a' : '#1a1a1a',
                  }}
                >
                  <Text style={{ color: pastPickerMode === 'start' ? '#a8e02a' : '#666', fontSize: 11, fontWeight: '700' }}>INICIO</Text>
                  <Text style={{ color: pastPickerMode === 'start' ? '#fff' : '#999', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                    {pastStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} {formatTime(pastStart)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setPastPickerMode('end'); setPastWheelOpen(true); analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { which: 'past_end' }); }}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: pastPickerMode === 'end' ? 'rgba(168,224,42,0.15)' : '#111',
                    borderWidth: 1, borderColor: pastPickerMode === 'end' ? '#a8e02a' : '#1a1a1a',
                  }}
                >
                  <Text style={{ color: pastPickerMode === 'end' ? '#a8e02a' : '#666', fontSize: 11, fontWeight: '700' }}>FIN</Text>
                  <Text style={{ color: pastPickerMode === 'end' ? '#fff' : '#999', fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                    {pastEnd.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} {formatTime(pastEnd)}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ color: '#555', fontSize: 11, textAlign: 'center', marginBottom: 4 }}>
                Toca INICIO o FIN para ajustar la fecha y hora.
              </Text>

              <TimeWheelPicker
                visible={pastWheelOpen}
                initialValue={pastPickerMode === 'start' ? pastStart : pastEnd}
                maxDate={new Date()}
                title={pastPickerMode === 'start' ? 'Inicio del ayuno' : 'Fin del ayuno'}
                presets={pastPickerMode === 'start' ? START_PRESETS : PAST_END_PRESETS}
                onConfirm={(date) => {
                  if (pastPickerMode === 'start') setPastStart(date);
                  else setPastEnd(date);
                  setPastWheelOpen(false);
                  analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: pastPickerMode === 'start' ? 'past_start' : 'past_end', applied: true });
                }}
                onCancel={() => { setPastWheelOpen(false); analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: pastPickerMode === 'start' ? 'past_start' : 'past_end', applied: false }); }}
              />

              {/* Duración calculada */}
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Text style={{ color: '#999', fontSize: 11 }}>Duración:</Text>
                <Text style={{ color: '#a8e02a', fontSize: 22, fontWeight: '800' }}>
                  {formatDuration((pastEnd.getTime() - pastStart.getTime()) / (1000 * 60))}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowPastFast(false)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#1a1a1a' }}
                >
                  <Text style={{ color: '#999', fontSize: 14 }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={savePastFast}
                  style={{ flex: 1, backgroundColor: ATP_BRAND.lime, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>GUARDAR</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

      ) : (
        /* ═══ TIMER — UN solo layout para reposo y ayuno activo (MB-8 Track F).
           El anillo y el botón primario viven SIEMPRE en el mismo lugar;
           solo cambia lo que hay adentro y el peso visual (SPEC Zero→ATP). ═══ */
        <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
          {/* Anillo fijo — cero salto de layout (F.0.2) */}
          <View style={{ width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                stroke="#1a1a1a" strokeWidth={STROKE_WIDTH} fill="transparent"
                strokeDasharray={activeFast ? undefined : '3 9'}
              />
              {activeFast && (
                <>
                  <Circle
                    cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                    stroke={currentZone.color} strokeWidth={STROKE_WIDTH} fill="transparent"
                    strokeDasharray={`${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation={-90}
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                  {/* F.4: marcador que viaja — ves dónde vas, no solo cuánto falta */}
                  <Circle cx={markerX} cy={markerY} r={STROKE_WIDTH / 2 + 3} fill={currentZone.color} stroke="#000" strokeWidth={2.5} />
                </>
              )}
            </Svg>

            {/* Centro: el número es el héroe (F.0.3) */}
            <View style={{ position: 'absolute', alignItems: 'center', paddingHorizontal: 28 }}>
              {activeFast ? (
                <>
                  <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>TRANSCURRIDO</Text>
                  <Text style={{ color: '#fff', fontSize: 44, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 2 }}>
                    {formatDuration(elapsed)}
                  </Text>
                  {remainingMinutes > 0 ? (
                    <Text style={{ color: currentZone.color, fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                      Faltan {formatDuration(remainingMinutes)}
                    </Text>
                  ) : (
                    <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '800', marginTop: 6 }}>
                      ¡META ALCANZADA!
                    </Text>
                  )}
                </>
              ) : lastCompleted ? (
                /* F.3: vacío que informa — dato real en vez de anillo muerto */
                <>
                  <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }}>DESDE TU ÚLTIMO AYUNO</Text>
                  <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 2 }}>
                    {formatSince(sinceLastMin)}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 6 }}>
                    ayunaste {Math.round((lastCompleted.actual_hours || 0) * 10) / 10} h
                  </Text>
                </>
              ) : (
                /* F.3: primera vez — el vacío invita, no acusa */
                <>
                  <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>TU PRIMER AYUNO</Text>
                  <Text style={{ color: '#fff', fontSize: 44, fontWeight: '900', marginTop: 2 }}>
                    {selectedProtocol.hours} h
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 6 }}>empieza cuando tú digas</Text>
                </>
              )}
            </View>

            {/* Badge de meta sobre el anillo — presente en AMBOS estados (SPEC #6) */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGoalSheetOpen(true); }}
              hitSlop={8}
              style={{
                position: 'absolute', top: 0, right: 0,
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: '#121212', borderWidth: 1, borderColor: `${selectedProtocol.color}55`,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: selectedProtocol.color, fontSize: 13, fontWeight: '900' }}>{selectedProtocol.hours}</Text>
            </Pressable>
          </View>

          {/* F.1: fase metabólica en vivo — la narrativa de tu cuerpo */}
          {activeFast && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPhaseSheetOpen(true); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: `${currentZone.color}12`, borderWidth: 1, borderColor: `${currentZone.color}30`,
                borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, marginBottom: 6,
              }}
            >
              <Ionicons name={currentZone.icon} size={15} color={currentZone.color} />
              <Text style={{ color: currentZone.color, fontSize: 13, fontWeight: '700' }}>{currentZone.label}</Text>
              <Ionicons name="chevron-up" size={13} color="#666" />
            </Pressable>
          )}

          {/* INICIO · META — se edita donde se ve (F.2), 3 niveles de texto (F.0.4) */}
          <View style={{ flexDirection: 'row', width: '100%', marginTop: 14 }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>INICIO</Text>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {activeFast
                  ? (activeStart ? formatTime(activeStart) : '--:--')
                  : customStartSet ? formatTime(customStartTime) : 'Ahora'}
              </Text>
              <Pressable
                onPress={activeFast
                  ? () => setActiveStartEditOpen(true)
                  : () => { setCustomStartTime(customStartSet ? customStartTime : new Date()); setStartWheelOpen(true); analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { which: 'start' }); }}
                hitSlop={8}
              >
                <Text style={{ color: '#a8e02a', fontSize: 12, fontWeight: '600' }}>
                  {activeFast ? 'Editar inicio' : '¿Empezaste antes?'}
                </Text>
              </Pressable>
              {!activeFast && customStartSet && (
                <Pressable onPress={() => setCustomStartSet(false)} hitSlop={8}>
                  <Text style={{ color: '#666', fontSize: 11 }}>Usar ahora</Text>
                </Pressable>
              )}
            </View>
            <View style={{ width: 1, backgroundColor: '#1a1a1a' }} />
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>META</Text>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {selectedProtocol.hours} h{activeFast && goalEnd ? ` · ${formatTime(goalEnd)}` : ''}
              </Text>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGoalSheetOpen(true); }} hitSlop={8}>
                <Text style={{ color: '#a8e02a', fontSize: 12, fontWeight: '600' }}>Cambiar meta</Text>
              </Pressable>
            </View>
          </View>

          {/* F.4: tu semana de un vistazo */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10, marginTop: 18 }}>
            {week.map((d) => (
              <DayRing key={d.key} letter={d.letter} pct={d.pct} isToday={d.isToday} />
            ))}
          </View>

          {/* BOTÓN PRIMARIO — mismo lugar, mismo tamaño; solo cambia el peso
              visual (F.0.1). Terminar NO pide confirmación: el cierre guiado
              (BreakFastGuide) es el aterrizaje. */}
          {activeFast ? (
            <Pressable
              onPress={() => breakFastWithTime(new Date())}
              style={{
                width: '100%', borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 22,
                backgroundColor: 'rgba(168,224,42,0.13)', borderWidth: 1, borderColor: 'rgba(168,224,42,0.35)',
              }}
            >
              <Text style={{ color: ATP_BRAND.lime, fontSize: 17, fontWeight: '800', letterSpacing: 1 }}>TERMINAR AYUNO</Text>
            </Pressable>
          ) : (
            <Pressable onPress={startFast} style={{ width: '100%', borderRadius: 18, overflow: 'hidden', marginTop: 22 }}>
              <LinearGradient
                colors={brandGradient()}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 18, alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontSize: 17, fontWeight: '900', letterSpacing: 1 }}>INICIAR AYUNO</Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Único secundario del estado activo (destructivo, con confirmación) */}
          {activeFast && (
            <Pressable onPress={cancelFast} style={{ paddingVertical: 14 }}>
              <Text style={{ color: '#666', fontSize: 13 }}>Cancelar y eliminar</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Hoja de META (F.2): los 8 protocolos plegados aquí — antes
          vivían expandidos en la pantalla ── */}
      <Modal visible={goalSheetOpen} transparent animationType="slide" onRequestClose={() => setGoalSheetOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }} onPress={() => setGoalSheetOpen(false)}>
          <Pressable
            style={{ backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: '#1f1f1f' }}
            onPress={() => {}}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 4 }}>Tu meta de ayuno</Text>
            <Text style={{ color: '#777', fontSize: 12, marginBottom: 14 }}>
              {activeFast ? 'Puedes ajustarla sin cortar el ayuno en curso.' : 'Se recuerda para tus próximos ayunos.'}
            </Text>
            {FASTING_PROTOCOLS.filter(p => p.hours <= MAX_FAST_HOURS).map(p => (
              <Pressable
                key={p.id}
                onPress={() => selectGoal(p)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: selectedProtocol.id === p.id ? `${p.color}10` : 'transparent',
                  borderRadius: 14, padding: 12,
                  borderWidth: 1,
                  borderColor: selectedProtocol.id === p.id ? `${p.color}30` : 'transparent',
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${p.color}15`, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: p.color, fontSize: 12, fontWeight: '900' }}>{p.hours}h</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{p.label}</Text>
                  <Text style={{ color: '#666', fontSize: 11 }}>{p.description}</Text>
                </View>
                {selectedProtocol.id === p.id && <Ionicons name="checkmark-circle" size={20} color={p.color} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Hoja de FASE (F.1): qué pasa ahora, qué sigue, mapa completo ── */}
      <Modal visible={phaseSheetOpen} transparent animationType="slide" onRequestClose={() => setPhaseSheetOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }} onPress={() => setPhaseSheetOpen(false)}>
          <Pressable
            style={{ backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: '#1f1f1f' }}
            onPress={() => {}}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${currentZone.color}18`, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={currentZone.icon} size={20} color={currentZone.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>AHORA, EN TU CUERPO</Text>
                <Text style={{ color: currentZone.color, fontSize: 17, fontWeight: '800' }}>{currentZone.label}</Text>
              </View>
            </View>
            <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>{currentZone.now}</Text>

            {nextZone && (
              <View style={{ backgroundColor: '#0a0a0a', borderRadius: 12, padding: 12, marginTop: 14 }}>
                <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
                  SIGUIENTE · {nextZone.label.toUpperCase()} · EN {formatDuration(timeToNext).toUpperCase()}
                </Text>
                <Text style={{ color: '#888', fontSize: 12, marginTop: 4, lineHeight: 18 }}>{nextZone.description}</Text>
              </View>
            )}

            {/* Mapa de fases (la checklist de antes, plegada aquí) */}
            <View style={{ marginTop: 16 }}>
              {FASTING_PHASES.filter(p => p.hours > 0).map(p => {
                const reached = elapsedHours >= p.hours;
                return (
                  <View key={p.hours} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, opacity: reached ? 1 : 0.45 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: reached ? `${p.color}20` : '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
                      {reached
                        ? <Ionicons name="checkmark" size={13} color={p.color} />
                        : <Text style={{ color: '#555', fontSize: 8, fontWeight: '700' }}>{p.hours}h</Text>}
                    </View>
                    <Text style={{ color: reached ? '#fff' : '#666', fontSize: 12, flex: 1 }}>{p.label}</Text>
                    <Text style={{ color: '#555', fontSize: 10 }}>{p.hours} h</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── ¿Empezaste antes? (IDLE): wheel de hora de inicio custom ── */}
      <TimeWheelPicker
        visible={startWheelOpen}
        initialValue={customStartTime}
        maxDate={new Date()}
        title="¿Cuándo empezaste?"
        presets={START_PRESETS}
        onConfirm={(date) => { setCustomStartTime(date); setCustomStartSet(true); setStartWheelOpen(false); analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: 'start', applied: true }); }}
        onCancel={() => { setStartWheelOpen(false); analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: 'start', applied: false }); }}
      />

      {/* ── Editar ayuno pasado: paso 1 (INICIO) ── */}
      {editingFast && editMode === 'start' && (
        <TimeWheelPicker
          visible
          initialValue={editingFast.fast_start ? new Date(editingFast.fast_start) : new Date()}
          title="Edita la hora de INICIO"
          maxDate={editingFast.fast_end ? new Date(editingFast.fast_end) : new Date()}
          presets={START_PRESETS}
          onConfirm={handleEditStartConfirm}
          onCancel={closeEdit}
        />
      )}

      {/* ── Editar ayuno pasado: paso 2 (FIN) ── */}
      {editingFast && editMode === 'end' && (
        <TimeWheelPicker
          visible
          initialValue={editingFast.fast_end ? new Date(editingFast.fast_end) : new Date()}
          title="Edita la hora de FIN"
          minDate={editingFast.fast_start ? new Date(editingFast.fast_start) : undefined}
          maxDate={new Date()}
          presets={PAST_END_PRESETS}
          onConfirm={handleEditEndConfirm}
          onCancel={closeEdit}
        />
      )}

      {/* ── Editar SOLO inicio del ayuno activo ── */}
      {activeFast && (
        <TimeWheelPicker
          visible={activeStartEditOpen}
          initialValue={safeDate(activeFast.fast_start) ?? new Date()}
          title="Edita la hora de INICIO"
          maxDate={new Date()}
          presets={START_PRESETS}
          onConfirm={handleActiveStartEditConfirm}
          onCancel={() => setActiveStartEditOpen(false)}
        />
      )}

      {/* Track D.2 (MB-8): cierre guiado — proteína primero + broke_fast_with */}
      <BreakFastGuide
        visible={!!breakGuide}
        hours={breakGuide?.hours ?? 0}
        zoneLabel={breakGuide?.zoneLabel ?? ''}
        onRecord={(brokeWith) => {
          if (!breakGuide) return;
          fastingService.recordBrokeFastWith(breakGuide.fastId, brokeWith).then((r) => {
            if (!r.ok) logWarn('[fasting] broke_fast_with failed:', r.message);
          });
        }}
        onRegisterMeal={() => { setBreakGuide(null); router.push('/food-scan'); }}
        onClose={() => setBreakGuide(null)}
      />

      {/* Sprint Compliance 3: gate de ayuno prolongado (atestación §2.4 / hard block) */}
      <AttestationGateModal
        visible={gateVisible}
        decision={fastingGate}
        userId={userId || null}
        protocolKey={`fasting_${(pendingGoal ?? selectedProtocol).hours}h`}
        onProceed={() => {
          setGateVisible(false); setFastingGate(null);
          // F.2: el gate también cubre el cambio de meta con ayuno activo.
          if (pendingGoal) { applyGoal(pendingGoal); setPendingGoal(null); }
          else doStartFast();
        }}
        onClose={() => { setGateVisible(false); setFastingGate(null); setPendingGoal(null); }}
      />

      <MedicalDisclaimer feature="fasting" />
    </ScrollView>
  );
}
