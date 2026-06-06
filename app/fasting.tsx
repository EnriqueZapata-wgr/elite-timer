/**
 * Ayuno — Rediseño estilo ZERO.
 *
 * 3 estados: IDLE (selector + preview), ACTIVE (ring timer + zonas), HISTORY.
 * Columnas DB: fast_start, target_hours, actual_hours, status, date.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Dimensions, DeviceEventEmitter } from 'react-native';
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
import { TimeWheelPicker } from '@/src/components/ui/TimeWheelPicker';

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
const BREAK_END_PRESETS = [
  { label: 'Ahora', getDate: () => new Date() },
  { label: 'Hace 30m', getDate: () => new Date(Date.now() - 30 * 60 * 1000) },
  { label: 'Hace 1h', getDate: () => new Date(Date.now() - 60 * 60 * 1000) },
  { label: 'Hace 2h', getDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) },
];

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
const FAST_MILESTONES: { hours: number; title: string; message: string }[] = [
  {
    hours: 24,
    title: '24 horas de ayuno',
    message: 'Tu cuerpo agotó el glucógeno y entró en cetosis — ya estás quemando grasa. Mantén la hidratación.',
  },
  {
    hours: 48,
    title: '48 horas de ayuno',
    message: 'La autofagia (reciclaje celular) se intensifica. Asegura electrolitos: sodio, potasio, magnesio.',
  },
  {
    hours: 72,
    title: '72 horas — ayuno prolongado',
    message: 'Los beneficios son profundos, pero a partir de aquí escucha tu cuerpo de cerca. Si sientes mareo, debilidad extrema o palpitaciones, rompe el ayuno.',
  },
  {
    hours: 96,
    title: '96 horas — ayuno extendido',
    message: 'Cómo rompes el ayuno (refeeding) es tan importante como el ayuno: hazlo gradual. Considera el acompañamiento de un profesional.',
  },
  // Hito 120h se maneja vía cierre automático (ver autoCloseAtLimit).
];

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.65;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Protocolos de ayuno
const FASTING_PROTOCOLS = [
  { id: '12:12', hours: 12, label: '12:12', description: 'Principiante — 12h ayuno, 12h alimentación', color: '#22c55e' },
  { id: '14:10', hours: 14, label: '14:10', description: 'Intermedio — 14h ayuno, 10h alimentación', color: '#38bdf8' },
  { id: '16:8', hours: 16, label: '16:8', description: 'Popular — 16h ayuno, 8h alimentación', color: '#a8e02a' },
  { id: '18:6', hours: 18, label: '18:6', description: 'Avanzado — 18h ayuno, 6h alimentación', color: '#f59e0b' },
  { id: '20:4', hours: 20, label: '20:4', description: 'Warrior — 20h ayuno, 4h alimentación', color: '#f97316' },
  { id: '24:0', hours: 24, label: 'OMAD', description: 'Una comida al día — 24h de ayuno', color: '#ef4444' },
  { id: '36:0', hours: 36, label: '36h', description: 'Ayuno extendido — 36 horas', color: '#c084fc' },
  { id: '72:0', hours: 72, label: '72h', description: 'Ayuno prolongado — 72 horas', color: '#ec4899' },
];

// Zonas biológicas del ayuno
const FASTING_ZONES = [
  { hours: 0, label: 'Fase alimentada', description: 'Digestión y absorción de nutrientes', color: '#22c55e', icon: 'restaurant-outline' as const },
  { hours: 4, label: 'Postabsorción', description: 'Glucosa en sangre baja, empieza a usar reservas', color: '#38bdf8', icon: 'trending-down-outline' as const },
  { hours: 8, label: 'Glucogenólisis', description: 'Tu hígado libera glucógeno almacenado', color: '#60a5fa', icon: 'flash-outline' as const },
  { hours: 12, label: 'Cetosis temprana', description: 'Empiezas a quemar grasa como combustible', color: '#a8e02a', icon: 'flame-outline' as const },
  { hours: 16, label: 'Autofagia', description: 'Tus células reciclan componentes dañados', color: '#f59e0b', icon: 'refresh-outline' as const },
  { hours: 24, label: 'Autofagia profunda', description: 'Reparación celular intensa + hormona de crecimiento', color: '#f97316', icon: 'shield-outline' as const },
  { hours: 36, label: 'Reparación inmune', description: 'Sistema inmune se regenera', color: '#c084fc', icon: 'medkit-outline' as const },
  { hours: 48, label: 'Reset metabólico', description: 'Sensibilidad a insulina se restaura profundamente', color: '#ec4899', icon: 'nuclear-outline' as const },
];

function getCurrentZone(hours: number) {
  let zone = FASTING_ZONES[0];
  for (const z of FASTING_ZONES) {
    if (hours >= z.hours) zone = z;
  }
  return zone;
}

function getNextZone(hours: number) {
  for (const z of FASTING_ZONES) {
    if (z.hours > hours) return z;
  }
  return null;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
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
  const [showProtocols, setShowProtocols] = useState(false);
  const [elapsed, setElapsed] = useState(0); // minutos
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Custom start time (IDLE): customStartSet = usar hora custom al iniciar;
  // startWheelOpen = modal del wheel picker abierto.
  const [customStartSet, setCustomStartSet] = useState(false);
  const [startWheelOpen, setStartWheelOpen] = useState(false);
  const [customStartTime, setCustomStartTime] = useState(new Date());
  // Break-fast end picker: showEndPicker = modal del wheel abierto.
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [customEndTime, setCustomEndTime] = useState(new Date());

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

    // Avisos progresivos (24/48/72/96).
    for (const m of FAST_MILESTONES) {
      if (hours >= m.hours && !shownMilestonesRef.current.has(m.hours)) {
        shownMilestonesRef.current.add(m.hours);
        if (activeFast?.id) {
          AsyncStorage.setItem(
            milestoneStorageKey(activeFast.id),
            JSON.stringify(Array.from(shownMilestonesRef.current)),
          ).catch(() => {});
        }
        Alert.alert(m.title, m.message);
      }
    }
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
    Alert.alert(
      'Alcanzaste 120 horas',
      'Alcanzaste 120 horas, el límite de los protocolos de ATP. Tu ayuno se cierra aquí. Rompe de forma gradual y cuidadosa — ayunos más largos requieren supervisión médica.'
    );
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
        Alert.alert(
          'Límite de 120h alcanzado',
          'Tu ayuno alcanzó el límite de 120h y se cerró automáticamente.'
        );
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
      setShowEndPicker(false);
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
    const durationMinutes = actualHours * 60;
    Alert.alert(
      '¡Ayuno completado!',
      `Duraste ${formatDuration(durationMinutes)} · Alcanzaste: ${zone.label}`,
    );

    if (activeFast?.id) {
      AsyncStorage.removeItem(milestoneStorageKey(activeFast.id)).catch(() => {});
    }
    setActiveFast(null);
    setElapsed(0);
    setShowEndPicker(false);
    loadHistory();
    DeviceEventEmitter.emit('day_changed');
  }

  // F16.13: Alert con 2 botones. El 3-button Alert tenía comportamiento
  // inconsistente entre Android versions / RN-Web (el middle onPress podía
  // no disparar). "Elegir hora" se expone como Pressable secundario debajo
  // del botón principal.
  function handleBreakFast() {
    Alert.alert(
      'Romper ayuno',
      `Has ayunado ${formatDuration(elapsed)}`,
      [
        { text: 'Seguir ayunando', style: 'cancel' },
        { text: 'Terminé ahora', onPress: () => breakFastWithTime(new Date()) },
      ],
    );
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
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>AYUNO</Text>
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
                  style={{ flex: 1, backgroundColor: '#a8e02a', borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>GUARDAR</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

      ) : activeFast ? (
        /* ════════════════════════════════════════════════════════════════
           AYUNANDO — Timer activo
        ════════════════════════════════════════════════════════════════ */
        <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
          {/* Ring timer */}
          <View style={{ width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                stroke="#1a1a1a" strokeWidth={STROKE_WIDTH} fill="transparent"
              />
              <Circle
                cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
                stroke={currentZone.color} strokeWidth={STROKE_WIDTH} fill="transparent"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>

            {/* Center content */}
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                {formatDuration(elapsed)}
              </Text>
              <Text style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
                de {selectedProtocol.hours}h objetivo
              </Text>
              {remainingMinutes > 0 ? (
                <Text style={{ color: currentZone.color, fontSize: 12, fontWeight: '600', marginTop: 8 }}>
                  Faltan {formatDuration(remainingMinutes)}
                </Text>
              ) : (
                <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '800', marginTop: 8 }}>
                  ¡OBJETIVO ALCANZADO!
                </Text>
              )}
            </View>
          </View>

          {/* Zona actual */}
          <View style={{
            backgroundColor: `${currentZone.color}10`, borderRadius: 16, padding: 16,
            width: '100%', marginBottom: 12,
            borderWidth: 1, borderColor: `${currentZone.color}25`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={currentZone.icon} size={20} color={currentZone.color} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: currentZone.color, fontSize: 14, fontWeight: '700' }}>
                  {currentZone.label}
                </Text>
                <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                  {currentZone.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Siguiente zona */}
          {nextZone && (
            <View style={{
              backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, width: '100%', marginBottom: 20,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Ionicons name="arrow-forward-outline" size={16} color="#666" />
              <Text style={{ color: '#666', fontSize: 12, flex: 1 }}>
                Siguiente: <Text style={{ color: nextZone.color, fontWeight: '600' }}>{nextZone.label}</Text> en {formatDuration(timeToNext)}
              </Text>
            </View>
          )}

          {/* Checklist de zonas */}
          <View style={{ width: '100%', marginBottom: 16 }}>
            <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
              PROGRESO POR ZONAS
            </Text>
            {FASTING_ZONES.filter(z => z.hours > 0 && z.hours <= selectedProtocol.hours).map(zone => {
              const reached = elapsedHours >= zone.hours;
              const isCurrent = zone === currentZone;
              return (
                <View key={zone.hours} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingVertical: 6, paddingHorizontal: 4,
                  opacity: reached ? 1 : 0.4,
                }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: reached ? `${zone.color}20` : '#1a1a1a',
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: isCurrent ? 2 : 0, borderColor: zone.color,
                  }}>
                    {reached ? (
                      <Ionicons name="checkmark" size={14} color={zone.color} />
                    ) : (
                      <Text style={{ color: '#444', fontSize: 9, fontWeight: '700' }}>{zone.hours}h</Text>
                    )}
                  </View>
                  <Text style={{ color: reached ? '#fff' : '#555', fontSize: 12, fontWeight: isCurrent ? '700' : '500', flex: 1 }}>
                    {zone.label}
                  </Text>
                  {isCurrent && (
                    <Text style={{ color: zone.color, fontSize: 9, fontWeight: '800' }}>AQUÍ</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Hora de inicio (tap para editar) */}
          <Pressable
            onPress={() => setActiveStartEditOpen(true)}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}
          >
            <Text style={{ color: '#666', fontSize: 12 }}>
              {(() => {
                const start = safeDate(activeFast.fast_start);
                return start ? `Iniciaste a las ${formatTime(start)}` : 'Iniciaste a las --:--';
              })()}
            </Text>
            <Ionicons name="pencil-outline" size={13} color="#a8e02a" />
          </Pressable>

          {/* Botones */}
          <Pressable
            onPress={handleBreakFast}
            style={{
              backgroundColor: '#a8e02a', borderRadius: 18, paddingVertical: 18,
              width: '100%', alignItems: 'center', marginBottom: 8,
            }}
          >
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '800' }}>ROMPER AYUNO</Text>
          </Pressable>

          {/* F16.13: link secundario al picker custom (antes era opción del Alert 3-button). */}
          {!showEndPicker && (
            <Pressable
              onPress={() => { setCustomEndTime(new Date()); setShowEndPicker(true); analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { which: 'break_end' }); }}
              hitSlop={8}
              style={{ alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#a8e02a', fontSize: 13, fontWeight: '600' }}>
                Elegir otra hora de fin
              </Text>
            </Pressable>
          )}

          {/* Picker de hora de fin (wheel modal — reemplaza mode="datetime") */}
          <TimeWheelPicker
            visible={showEndPicker}
            initialValue={customEndTime}
            // AY-3: undefined si fast_start es inválido — evita que el picker se congele.
            minDate={safeDate(activeFast.fast_start) ?? undefined}
            maxDate={new Date()}
            title="¿Cuándo terminaste?"
            presets={BREAK_END_PRESETS}
            onConfirm={(date) => { setShowEndPicker(false); analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: 'break_end', applied: true }); breakFastWithTime(date); }}
            onCancel={() => { setShowEndPicker(false); analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: 'break_end', applied: false }); }}
          />

          <Pressable onPress={cancelFast}>
            <Text style={{ color: '#666', fontSize: 13 }}>Cancelar y eliminar</Text>
          </Pressable>
        </View>

      ) : (
        /* ════════════════════════════════════════════════════════════════
           IDLE — Iniciar ayuno
        ════════════════════════════════════════════════════════════════ */
        <View style={{ paddingHorizontal: 20 }}>
          {/* Selector de protocolo */}
          <Pressable onPress={() => setShowProtocols(!showProtocols)}>
            <LinearGradient
              colors={[`${selectedProtocol.color}12`, `${selectedProtocol.color}04`]}
              style={{
                borderRadius: 18, padding: 20, marginBottom: 20,
                borderWidth: 1, borderColor: `${selectedProtocol.color}25`,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>PROTOCOLO</Text>
                  <Text style={{ color: selectedProtocol.color, fontSize: 32, fontWeight: '900', marginTop: 4 }}>
                    {selectedProtocol.label}
                  </Text>
                  <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    {selectedProtocol.description}
                  </Text>
                </View>
                <Ionicons name={showProtocols ? 'chevron-up' : 'chevron-down'} size={22} color="#666" />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Lista de protocolos expandible (capada a MAX_FAST_HOURS) */}
          {showProtocols && (
            <View style={{ marginBottom: 20, gap: 6 }}>
              {FASTING_PROTOCOLS.filter(p => p.hours <= MAX_FAST_HOURS).map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedProtocol(p);
                    setShowProtocols(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: selectedProtocol.id === p.id ? `${p.color}10` : '#0a0a0a',
                    borderRadius: 14, padding: 14,
                    borderWidth: 1,
                    borderColor: selectedProtocol.id === p.id ? `${p.color}30` : '#1a1a1a',
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: `${p.color}15`,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: p.color, fontSize: 12, fontWeight: '900' }}>{p.hours}h</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{p.label}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{p.description}</Text>
                  </View>
                  {selectedProtocol.id === p.id && (
                    <Ionicons name="checkmark-circle" size={20} color={p.color} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Ring preview */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: RING_SIZE * 0.8, height: RING_SIZE * 0.8, justifyContent: 'center', alignItems: 'center' }}>
              <Svg width={RING_SIZE * 0.8} height={RING_SIZE * 0.8}>
                <Circle
                  cx={RING_SIZE * 0.4} cy={RING_SIZE * 0.4} r={RADIUS * 0.8}
                  stroke="#1a1a1a" strokeWidth={STROKE_WIDTH - 2} fill="transparent"
                  strokeDasharray="4 8"
                />
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: '#333', fontSize: 36, fontWeight: '900' }}>0:00</Text>
                <Text style={{ color: '#444', fontSize: 12 }}>de {selectedProtocol.hours}h</Text>
              </View>
            </View>
          </View>

          {/* Zonas biológicas preview */}
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
            ZONAS QUE ALCANZARÁS
          </Text>
          {FASTING_ZONES.filter(z => z.hours <= selectedProtocol.hours && z.hours > 0).map(zone => (
            <View key={zone.hours} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 8, paddingHorizontal: 4, opacity: 0.7,
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: `${zone.color}15`,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name={zone.icon} size={14} color={zone.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ccc', fontSize: 13, fontWeight: '600' }}>{zone.label}</Text>
                <Text style={{ color: '#666', fontSize: 11 }}>{zone.description}</Text>
              </View>
              <Text style={{ color: zone.color, fontSize: 12, fontWeight: '700' }}>{zone.hours}h</Text>
            </View>
          ))}

          {/* BOTÓN INICIAR */}
          <Pressable
            onPress={startFast}
            style={{
              backgroundColor: selectedProtocol.color, borderRadius: 20, paddingVertical: 20,
              alignItems: 'center', marginTop: 24,
              shadowColor: selectedProtocol.color,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 12,
            }}
          >
            <Text style={{ color: '#000', fontSize: 20, fontWeight: '900', letterSpacing: 1 }}>
              INICIAR AYUNO
            </Text>
          </Pressable>

          {/* ¿Empezaste antes? (wheel modal — reemplaza mode="datetime") */}
          <Pressable
            onPress={() => { setCustomStartTime(customStartSet ? customStartTime : new Date()); setStartWheelOpen(true); analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { which: 'start' }); }}
            style={{ alignItems: 'center', marginTop: 12 }}
          >
            <Text style={{ color: customStartSet ? selectedProtocol.color : '#666', fontSize: 13, fontWeight: customStartSet ? '600' : '400' }}>
              {customStartSet
                ? `Empezaste hace ${formatDuration((Date.now() - customStartTime.getTime()) / (1000 * 60))} · cambiar`
                : '¿Empezaste antes? Elige la hora'}
            </Text>
          </Pressable>

          {customStartSet && (
            <Pressable onPress={() => setCustomStartSet(false)} style={{ alignItems: 'center', marginTop: 6 }}>
              <Text style={{ color: '#666', fontSize: 12 }}>Usar hora actual</Text>
            </Pressable>
          )}

          <TimeWheelPicker
            visible={startWheelOpen}
            initialValue={customStartTime}
            maxDate={new Date()}
            title="¿Cuándo empezaste?"
            presets={START_PRESETS}
            onConfirm={(date) => { setCustomStartTime(date); setCustomStartSet(true); setStartWheelOpen(false); analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: 'start', applied: true }); }}
            onCancel={() => { setStartWheelOpen(false); analytics.track(ATP_EVENTS.FAST_PICKER_DISMISSED, { which: 'start', applied: false }); }}
          />

          {/* Historial rápido */}
          {history.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
                  RECIENTES
                </Text>
                <Pressable onPress={() => setShowHistory(true)}>
                  <Text style={{ color: '#a8e02a', fontSize: 11, fontWeight: '600' }}>Ver todo</Text>
                </Pressable>
              </View>
              {history.slice(0, 3).map(fast => {
                const hours = fast.actual_hours || 0;
                const zone = getCurrentZone(hours);
                return (
                  <View key={fast.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: '#0a0a0a', borderRadius: 12, padding: 12, marginBottom: 6,
                  }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: `${zone.color}15`,
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Text style={{ color: zone.color, fontSize: 12, fontWeight: '900' }}>{Math.round(hours)}h</Text>
                    </View>
                    <Text style={{ color: '#ccc', fontSize: 13, flex: 1 }}>{zone.label}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>
                      {(() => {
                        const d = safeDate(fast.fast_start);
                        return d ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '--';
                      })()}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
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

      <MedicalDisclaimer feature="fasting" />
    </ScrollView>
  );
}
