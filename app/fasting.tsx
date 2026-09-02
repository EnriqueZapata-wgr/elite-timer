/**
 * Ayuno — Rediseño estilo ZERO.
 *
 * 3 estados: IDLE (selector + preview), ACTIVE (ring timer + zonas), HISTORY.
 * Columnas DB: fast_start, target_hours, actual_hours, status, date.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Dimensions, DeviceEventEmitter, Modal, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { ATP_BRAND, brandGradient, type AppThemeTokens } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { FASTING_PHASES, getCurrentPhase, getNextPhase } from '@/src/constants/fasting-phases';
import { FASTING_MEASURED_MODE } from '@/src/constants/flags';
import { measuredState, type MeasuredState } from '@/src/services/fasting-metrics-core';
import { loadLatestFastingMeasurement } from '@/src/services/fasting-measurement-service';
import { toLocalDateString } from '../src/utils/date-helpers';
import { TimeWheelPicker } from '@/src/components/ui/TimeWheelPicker';
import { AttestationGateModal } from '@/src/components/safety/AttestationGateModal';
import { FASTING_ALERTS } from '@/src/constants/attestation-copy';
import { fastingGateDecision, fastingAlertForHours, type GateDecision } from '@/src/services/safety/protocol-gate-core';
import { getSafetyState } from '@/src/services/safety/protocol-gate-service';
import { getSafetyParams, DEFAULT_SAFETY_PARAMS, type FastingSafetyParams } from '@/src/services/safety/safety-params-service';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';
import { ORB_SAFE_BOTTOM } from '@/src/components/argos/ArgosFloatingButton';
// MB-22: la lista de protocolos vive en constants (fuente única, compartida
// con la ficha de Ayuno del Centro).
import { FASTING_PROTOCOLS } from '@/src/constants/fasting-protocols';
import { calcularEstadisticas, formatearHoras } from '@/src/services/fasting-stats-core';
// 31-ago-2026 (backlog 15.2 / 15.3 / 15.6): una sola definición de "cumplí",
// el cierre del olvidado en un servicio idempotente, y las piezas puras de la
// pantalla fuera del archivo. Todo con prueba ejecutada en node.
import { ayunoCumplido, metaAlcanzada } from '@/src/services/fasting-cumplido-core';
import { MAX_FAST_HOURS, HUELLA_AUTOCIERRE_KEY, leerHuella } from '@/src/services/fasting-autoclose-core';
import { reconciliarAyunoActivo } from '@/src/services/fasting-autoclose-service';
import {
  fastErrorCopy, formatDuration, formatSince, formatTime, safeDate, construirSemana,
} from '@/src/services/fasting-screen-core';

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
// 28-ago-2026: BREAK_END_PRESETS VUELVE. Se había retirado citando el SPEC de
// Zero, que dice "no te avienta un diálogo de confirmación". Pero preguntar
// "¿ahora o ajustas la hora?" NO es un diálogo de confirmación: es una
// bifurcación de captura. Son cosas distintas y la diferencia se pagaba cara.
//
// Enrique, textual: "termino dándole aceptar, termina el ayuno, y después me
// tengo que ir a mi historial, y dentro de mi historial pongo editar ayuno, y
// entonces tengo que poner la hora de inicio, la hora de fin, y es más
// complicado, y eso genera fricción". Cinco pasos para corregir una hora.
const BREAK_END_PRESETS = [
  { label: 'Ahora', getDate: () => new Date() },
  { label: 'Hace 1h', getDate: () => new Date(Date.now() - 60 * 60 * 1000) },
  { label: 'Hace 2h', getDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { label: 'Hace 3h', getDate: () => new Date(Date.now() - 3 * 60 * 60 * 1000) },
];

// MAX_FAST_HOURS (120) y el umbral de olvidado (144) viven en
// fasting-autoclose-core desde el 31-ago-2026: la regla de cierre ya no es de
// esta pantalla.

// CONTENIDO MÉDICO — PENDIENTE FIRMA MARIANA (31-ago-2026: son afirmaciones
// fisiológicas con reloj, mismas fuentes que fasting-phases.ts; no se tocaron)
// Sprint Compliance 3: los hitos de CELEBRACIÓN terminan en 48h. A partir de
// 36h corren las ALERTAS DE SEGURIDAD escalantes del sign-off legal
// (FASTING_ALERTS §2.5), no celebraciones — 72h/96h se eliminaron.
const FAST_MILESTONES: { hours: number; title: string; message: string }[] = [
  {
    hours: 24,
    title: '24 horas de ayuno',
    message: 'Tu cuerpo agotó el glucógeno y entró en cetosis: ya estás quemando grasa. Mantén la hidratación.',
  },
  {
    hours: 48,
    title: '48 horas de ayuno',
    message: 'Entras en ayuno prolongado: la grasa domina como combustible. Asegura electrolitos (sodio, potasio, magnesio) e hidrátate bien.',
  },
  // 120h se maneja vía cierre automático (ver autoCloseAtLimit).
];

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.65;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// MB-9 · Track E.1: pasar la meta NO llena más nada. El sobretiempo se dibuja
// como un arco delgado y apagado JUSTO ADENTRO del anillo — registra que
// seguiste, no lo premia (sin color, sin celebración).
const OVERTIME_RADIUS = RADIUS - STROKE_WIDTH / 2 - 4;
const OVERTIME_CIRCUMFERENCE = 2 * Math.PI * OVERTIME_RADIUS;


// MB-8 Track F.1: las fases metabólicas viven parametrizadas en UN solo lugar
// (src/constants/fasting-phases — ventanas PROVISIONALES, las cierra Enrique).
// Aliases para el resto del archivo (breakFast, historial).
const getCurrentZone = getCurrentPhase;
const getNextZone = getNextPhase;

// formatDuration, formatTime, formatSince y safeDate viven en
// fasting-screen-core (puros, con prueba en node).

/** F.4: anillo chico de la tira semanal (consistencia de un vistazo). */
function DayRing({ letter, pct, isToday, t }: { letter: string; pct: number; isToday: boolean; t: AppThemeTokens }) {
  const size = 30;
  const sw = 3;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.borde} strokeWidth={sw} fill="transparent" />
        {pct > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={ATP_BRAND.lime} strokeWidth={sw} fill="transparent"
            strokeDasharray={`${c}`} strokeDashoffset={c * (1 - Math.min(1, pct))}
            strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <Text style={{ color: isToday ? t.texto : t.textoTenue, fontSize: 10, fontWeight: isToday ? '800' : '600' }}>
        {letter}
      </Text>
    </View>
  );
}

export default function FastingScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  // MB-31B3: la pantalla migro a tokens y sigue el tema global.
  const { kind, tokens: t } = useAppTheme();
  // Regla 1 del manual: el lima no es texto en claro; acento calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  // Verde/ambar de estado fuera de paleta: se conservan en oscuro (como hoy)
  // y en claro caen a tokens legibles (reportado en el run).
  const verdeOk = kind === 'dark' ? '#22c55e' : t.tealTexto;
  const ambarParcial = kind === 'dark' ? '#f59e0b' : t.textoSecundario;
  // Texto suave de lectura en hojas: los tokens SON el canon (doctrina de
  // color), no un literal #ccc/#bbb metido en el ternario del oscuro.
  const suave = t.texto;
  const suave2 = t.textoSecundario;
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

  // MB-9 · Track E.3: estado REAL medido vía GKI (glucosa + cetonas), detrás del
  // flag FASTING_MEASURED_MODE. Sin datos → cae al estimado por tiempo.
  const [measured, setMeasured] = useState<MeasuredState | null>(null);
  useEffect(() => {
    if (!FASTING_MEASURED_MODE || !activeFast?.fast_start) { setMeasured(null); return; }
    let alive = true;
    loadLatestFastingMeasurement(activeFast.fast_start).then((m) => {
      if (!alive) return;
      setMeasured(m.glucoseMgdl != null && m.ketonesMmol != null
        ? measuredState(m.glucoseMgdl, m.ketonesMmol, 'mgdl')
        : null);
    });
    return () => { alive = false; };
  }, [activeFast?.fast_start, activeFast?.id]);

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
  // Bifurcación al terminar: elegir la hora sin salir de la pantalla.
  const [breakEndOpen, setBreakEndOpen] = useState(false);
  /**
   * 4EP: `cerrando` era estado de React, y el estado se lee del closure del
   * render: dos invocaciones en el mismo tick pasaban las dos. Como mutex no
   * servía. El ref decide (se lee y escribe al instante) y el estado solo pinta
   * el botón atenuado.
   *
   * Importa de verdad: `breakFast` actualiza por id SIN filtrar por estado
   * (fasting-service.ts), así que un segundo cierre SOBREESCRIBE las horas de un
   * ayuno ya cerrado. El backlog ya lo reporta, y meter un paso intermedio
   * alarga justo esa ventana.
   */
  const cerrandoRef = useRef(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  // Sprint 1.5 B/C: el timer arrancaba SIEMPRE 16:8 hardcoded. Ahora inicializa
  // del goal del user. MB-22: lectura y escritura viven en fasting-service
  // (getFastingGoalHours/setFastingGoalHours), compartidas con la ficha de
  // Ayuno del Centro — un dato, un writer.
  // AY-G1 (a): con ayuno en curso, SU target_hours es la única verdad del
  // protocolo mostrado. Esto vivía suelto dentro de loadActiveFast, así que sus
  // cuatro salidas tempranas de error dejaban el anillo dibujado contra el
  // default de 16:8. Declarativo cubre los 16 sitios que tocan activeFast.
  useEffect(() => {
    const meta = activeFast?.target_hours;
    if (!meta) return;
    const p = FASTING_PROTOCOLS.find(x => x.hours === meta);
    if (p) setSelectedProtocol(p);
    else logWarn('Ayuno activo con target_hours fuera de la lista:', meta);
  }, [activeFast?.target_hours]);

  // AY-G1 (b): la meta del perfil SOLO siembra el estado sin ayuno. Antes leía
  // activeFast de un closure congelado (null en el primer ciclo) y pisaba el
  // target_hours del ayuno en curso: 20 h dibujadas contra 16, y el anillo decía
  // "ya llegaste" cuatro horas antes. El cleanup descarta la escritura si el
  // ayuno llega mientras esperamos, así que ya no importa quién resuelva primero.
  useEffect(() => {
    if (!userId || activeFast) return;
    let cancelado = false;
    (async () => {
      const hours = await fastingService.getFastingGoalHours(userId);
      if (cancelado) return;
      const match = FASTING_PROTOCOLS.find(p => p.hours === hours);
      if (match) setSelectedProtocol(match);
    })();
    return () => { cancelado = true; };
  }, [userId, activeFast]);

  /** Persiste el protocolo elegido como goal (merge sobre goals existentes). */
  const persistFastingGoal = useCallback(async (hours: number) => {
    if (!userId) return;
    await fastingService.setFastingGoalHours(userId, hours);
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
      autoCloseAtLimit();
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

  /**
   * 31-ago-2026 (backlog 15.3): el cierre del ayuno olvidado ya NO vive aquí.
   * reconciliarAyunoActivo (fasting-autoclose-service) decide y ejecuta, y lo
   * llama también compileDay, así que el olvidado se cierra aunque nadie abra
   * esta pantalla. Es idempotente: si HOY lo cerró un segundo antes, aquí
   * llega `ya_cerrado` y no se toca nada ni se avisa dos veces.
   *
   * Política sin cambio: inicio corrupto o > 144 h cancela; 120 a 144 h
   * cierra como completado a 120 h exactas con el texto §2.5 del sign-off.
   */
  async function reconciliar(): Promise<fastingService.FastingLog | null> {
    const r = await reconciliarAyunoActivo(userId, { emitir: true });
    if (r.evento === 'cerrado_en_limite' || r.evento === 'cancelado_olvidado' || r.evento === 'cancelado_invalido' || r.evento === 'ya_cerrado') {
      if (r.fastId) AsyncStorage.removeItem(milestoneStorageKey(r.fastId)).catch(() => {});
      loadHistory();
    }
    if (r.evento === 'fallo') {
      // No se pudo escribir: se deja el ayuno visible para reintentar, no se pierde la fila.
      logWarn('[fasting] reconciliar falló; el ayuno sigue activo para reintentar');
    }
    // El aviso sale de la HUELLA, no del evento de esta llamada: así se
    // muestra igual si el cierre lo hizo esta pantalla o HOY al arrancar.
    await mostrarAvisoDeAutocierre();
    return r.fast;
  }

  /**
   * 4EP 31-ago-2026: el auto-cierre puede ocurrir en compileDay (HOY) sin que
   * esta pantalla esté abierta, y el aviso §2.5 del sign-off es compliance:
   * tiene que verse. El servicio deja huella en AsyncStorage; aquí se lee,
   * se avisa y se borra. Una sola vez por cierre.
   */
  async function mostrarAvisoDeAutocierre() {
    let raw: string | null = null;
    try { raw = await AsyncStorage.getItem(HUELLA_AUTOCIERRE_KEY); } catch { return; }
    const huella = leerHuella(raw);
    if (raw != null) AsyncStorage.removeItem(HUELLA_AUTOCIERRE_KEY).catch(() => {});
    if (!huella) return;
    if (huella.evento === 'cerrado_en_limite') {
      // Texto EXACTO §2.5 del sign-off (auto-cierre obligatorio a 120h).
      Alert.alert(FASTING_ALERTS.autoClose120h.title, FASTING_ALERTS.autoClose120h.message);
    } else {
      Alert.alert('Ayuno limpiado', 'Encontramos un ayuno sin cerrar y lo limpiamos.');
    }
  }

  /** Cierre en vivo al llegar a 120 h con la pantalla abierta (tick del cronómetro). */
  async function autoCloseAtLimit() {
    if (!activeFast) return;
    const fast = await reconciliar();
    if (fast) {
      // Siguió activo (fallo de red o de RLS): dejar reintentar en el siguiente tick.
      autoCloseTriggeredRef.current = false;
      return;
    }
    setActiveFast(null);
    setElapsed(0);
  }

  async function loadActiveFast() {
    // AY-G1: el protocolo ya no se escribe aquí. Lo deriva el efecto (a) desde
    // activeFast.target_hours, que cubre también las salidas tempranas de error.
    setActiveFast(await reconciliar());
  }

  /**
   * 28-ago: el tope por defecto del servicio son 20 ayunos, y de aquí salen
   * también las estadísticas. Con 20, a quien lleva 44 ayunos la app le diría
   * "tu ayuno más largo" mirando solo el último mes: un dato falso presentado
   * como histórico. 200 cubre años de uso y sigue siendo una sola query.
   */
  const HISTORIAL_TOPE = 200;
  /**
   * Las cuentas viven en fasting-stats-core, que es puro y tiene su propia
   * prueba. Aquí solo se lee. La higiene (fuera los de 0 h y los de más de
   * 120) pasa allá adentro: con la basura real de la base, el promedio crudo
   * sale en 23.8 h cuando el ayuno típico es de 16, y el "más largo" saldría
   * 263 h, que es imposible y además irresponsable en una app de salud.
   */
  const stats = useMemo(
    () => calcularEstadisticas(history, toLocalDateString(new Date())),
    [history],
  );

  async function loadHistory() {
    const data = await fastingService.loadHistory(userId, HISTORIAL_TOPE);
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

  /**
   * La bifurcación que pidió Enrique. NO es un diálogo de confirmación (eso lo
   * prohíbe el SPEC de Zero y con razón): es preguntar UN dato que la app antes
   * daba por sentado. Quien rompió el ayuno hace tres horas ya no tiene que
   * cerrar mal, irse al historial, entrar a editar y recapturar inicio y fin.
   */
  function preguntarHoraDeCierre() {
    if (!activeFast || cerrandoRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      '¿Cuándo rompiste el ayuno?',
      'Si fue hace rato, ajusta la hora para que tus horas queden bien.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ajustar la hora', onPress: () => {
          analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { picker: 'break_end' });
          setBreakEndOpen(true);
        } },
        { text: 'Ahora', onPress: () => breakFastWithTime(new Date()) },
      ],
    );
  }

  /** Confirmación del selector: cierra con la hora elegida. */
  function handleBreakEndConfirm(fecha: Date) {
    setBreakEndOpen(false);
    breakFastWithTime(fecha);
  }

  async function breakFastWithTime(endTime: Date) {
    if (!activeFast || cerrandoRef.current) return;
    cerrandoRef.current = true;
    setCerrando(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // try/finally: el guard contra doble cierre se suelta SIEMPRE, por
    // cualquiera de las cinco salidas. Un guard que se queda tomado deja el
    // botón muerto sin decir nada, que es la enfermedad que ya nos costó caro
    // esta semana en Mi Salud.
    try {
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
      // 31-ago-2026: si otro camino (HOY, otro dispositivo) ya lo cerró, la
      // pantalla se pone al día en vez de seguir enseñando un cronómetro
      // de un ayuno que ya no existe. Sin electrón: lo dio quien cerró.
      if (result.reason === 'already_closed') { setActiveFast(null); setElapsed(0); loadHistory(); }
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
    } finally {
      cerrandoRef.current = false;
      setCerrando(false);
    }
  }

  // 28-ago-2026: TERMINAR ahora pregunta la HORA (preguntarHoraDeCierre), no la
  // intención. El botón conserva su lugar y su peso visual; el cierre guiado
  // (BreakFastGuide) sigue siendo la pantalla de aterrizaje.

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
            if (result.reason === 'already_closed') { setActiveFast(null); setElapsed(0); loadHistory(); }
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
  // Track E.1: fracción de sobretiempo (topada a +100% de la meta para el arco).
  const overtimeMinutes = Math.max(0, safeElapsed - targetMinutes);
  const overtimeFrac = targetMinutes > 0 ? Math.min(overtimeMinutes / targetMinutes, 1) : 0;

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
  // F.4: tira de la semana (7 días terminando hoy; hoy incluye el ayuno en
  // curso). 31-ago-2026: se arma en fasting-screen-core y cada ayuno cae en su
  // día canónico (el de FIN, decisión 15.1), no en `date` (inicio). Antes el
  // 16:8 de anoche pintaba AYER mientras HOY lo daba por cumplido hoy.
  const week = useMemo(
    () => construirSemana(history, new Date(), activeFast ? progress : null, toLocalDateString),
    [history, activeFast, progress],
  );

  // === RENDER ===
  return (
    <ThemeReady>
    <ScrollView style={{ flex: 1, backgroundColor: t.fondo }} contentContainerStyle={{ paddingBottom: 40 + ORB_SAFE_BOTTOM }}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={t.texto} />
            </Pressable>
            <View>
              <Text style={{ color: kind === 'dark' ? '#5B9BD5' : t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
              {/* F.0.6: el estado se anuncia con palabras */}
              <Text style={{ color: t.texto, fontSize: 22, fontWeight: '800' }}>
                {activeFast ? 'Estás ayunando' : 'AYUNO'}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setShowHistory(!showHistory)} hitSlop={12}>
            <Ionicons name={showHistory ? 'timer-outline' : 'time-outline'} size={24} color={t.textoSecundario} />
          </Pressable>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════
          HISTORIAL
      ════════════════════════════════════════════════════════════════ */}
      {showHistory ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 16 }}>
            HISTORIAL ({history.length})
          </Text>

          {history.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="hourglass-outline" size={40} color={t.bordeMarcado} />
              <Text style={{ color: t.textoSecundario, fontSize: 14, marginTop: 12 }}>Aún no tienes ayunos completados</Text>
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
                    backgroundColor: t.hundido, borderRadius: 16, padding: 16, marginBottom: 8,
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
                    <Text style={{ color: t.texto, fontSize: 14, fontWeight: '600' }}>
                      Ayuno de {Math.round(hours * 10) / 10} horas
                    </Text>
                    <Text style={{ color: t.textoSecundario, fontSize: 11, marginTop: 2 }}>
                      {date ? date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}
                      {' · '}{zone.label}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: zone.color, fontSize: 11, fontWeight: '600' }}>
                      {fast.target_hours}h objetivo
                    </Text>
                    {/* 31-ago-2026: la misma regla que el calendario de adherencia
                        (ayunoCumplido: 95 % de la meta). Antes era estricta aquí y
                        con tolerancia allá: el mismo ayuno salía "Parcial" en esta
                        lista y verde en Reportes. */}
                    <Text style={{ color: ayunoCumplido(fast) ? verdeOk : ambarParcial, fontSize: 10, marginTop: 2 }}>
                      {ayunoCumplido(fast) ? '✓ Completado' : 'Parcial'}
                    </Text>
                  </View>
                  {/* CIERRE-1: borrar un ayuno solo existía como tap largo. Un
                      gesto invisible para NAVEGAR se perdona; uno para BORRAR
                      no, porque el usuario tampoco descubre cómo deshacer lo
                      que hizo sin querer. El tap largo se queda intacto: esto
                      es una vía más, no un reemplazo. deleteFast ya pide
                      confirmación, así que el botón no borra de golpe. */}
                  <Pressable
                    onPress={() => deleteFast(fast.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ayuno de ${Math.round(hours)} horas`}
                    style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.5 : 1 })}
                  >
                    <Ionicons name="trash-outline" size={16} color={t.error} />
                  </Pressable>
                </Pressable>
              );
            })
          )}
          {/* 31-ago-2026: era t.sinDatos como tinta (contraste ~1.8, regla 4);
              textoTenue a 9 px tampoco llega (2.27 en oscuro). */}
          <Text style={{ color: t.textoSecundario, fontSize: 9, textAlign: 'center', marginTop: 8 }}>
            Toca para editar · el bote elimina
          </Text>

          {/* Registrar ayuno pasado */}
          <Pressable
            onPress={() => { setPastStart(new Date(Date.now() - 16 * 60 * 60 * 1000)); setPastEnd(new Date()); setPastPickerMode('start'); setShowPastFast(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 12 }}
          >
            <Ionicons name="add-circle-outline" size={18} color={acento} />
            <Text style={{ color: acento, fontSize: 13, fontWeight: '600' }}>Registrar ayuno pasado</Text>
          </Pressable>

          {showPastFast && (
            <View style={{
              backgroundColor: t.hundido, borderRadius: 20, padding: 20, marginTop: 16,
              borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
            }}>
              <Text style={{ color: t.texto, fontSize: 16, fontWeight: '800', marginBottom: 16 }}>
                Registrar ayuno pasado
              </Text>

              {/* Toggle start/end */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Pressable
                  onPress={() => { setPastPickerMode('start'); setPastWheelOpen(true); analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { which: 'past_start' }); }}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: pastPickerMode === 'start' ? 'rgba(168,224,42,0.15)' : t.card,
                    borderWidth: 1, borderColor: pastPickerMode === 'start' ? ATP_BRAND.lime : t.borde,
                  }}
                >
                  <Text style={{ color: pastPickerMode === 'start' ? acento : t.textoSecundario, fontSize: 11, fontWeight: '700' }}>INICIO</Text>
                  <Text style={{ color: pastPickerMode === 'start' ? t.texto : t.textoSecundario, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                    {pastStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} {formatTime(pastStart)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setPastPickerMode('end'); setPastWheelOpen(true); analytics.track(ATP_EVENTS.FAST_PICKER_OPENED, { which: 'past_end' }); }}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: pastPickerMode === 'end' ? 'rgba(168,224,42,0.15)' : t.card,
                    borderWidth: 1, borderColor: pastPickerMode === 'end' ? ATP_BRAND.lime : t.borde,
                  }}
                >
                  <Text style={{ color: pastPickerMode === 'end' ? acento : t.textoSecundario, fontSize: 11, fontWeight: '700' }}>FIN</Text>
                  <Text style={{ color: pastPickerMode === 'end' ? t.texto : t.textoSecundario, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                    {pastEnd.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} {formatTime(pastEnd)}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ color: t.textoTenue, fontSize: 11, textAlign: 'center', marginBottom: 4 }}>
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
                <Text style={{ color: t.textoSecundario, fontSize: 11 }}>Duración:</Text>
                <Text style={{ color: acento, fontSize: 22, fontWeight: '800' }}>
                  {formatDuration((pastEnd.getTime() - pastStart.getTime()) / (1000 * 60))}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowPastFast(false)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.borde }}
                >
                  <Text style={{ color: t.textoSecundario, fontSize: 14 }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={savePastFast}
                  style={{ flex: 1, backgroundColor: ATP_BRAND.lime, borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: ATP_BRAND.black, fontSize: 14, fontWeight: '800' }}>GUARDAR</Text>
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
                stroke={t.borde} strokeWidth={STROKE_WIDTH} fill="transparent"
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
                  <Circle cx={markerX} cy={markerY} r={STROKE_WIDTH / 2 + 3} fill={currentZone.color} stroke={t.fondo} strokeWidth={2.5} />
                  {/* E.1: sobretiempo — arco delgado y apagado, sin color ni premio */}
                  {overtimeFrac > 0 && (
                    <Circle
                      cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={OVERTIME_RADIUS}
                      stroke={t.sinDatos} strokeWidth={3} fill="transparent"
                      strokeDasharray={`${OVERTIME_CIRCUMFERENCE}`}
                      strokeDashoffset={OVERTIME_CIRCUMFERENCE * (1 - overtimeFrac)}
                      strokeLinecap="round"
                      rotation={-90}
                      origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                    />
                  )}
                </>
              )}
            </Svg>

            {/* Centro: el número es el héroe (F.0.3) */}
            <View style={{ position: 'absolute', alignItems: 'center', paddingHorizontal: 28 }}>
              {activeFast ? (
                <>
                  <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>TRANSCURRIDO</Text>
                  <Text style={{ color: t.texto, fontSize: 44, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 2 }}>
                    {formatDuration(elapsed)}
                  </Text>
                  {/* 31-ago-2026: "ya llegaste" lo decide metaAlcanzada (estricta,
                      minuto a minuto), la misma regla que HOY y ARGOS. */}
                  {!metaAlcanzada(elapsedHours, selectedProtocol.hours) ? (
                    <Text style={{ color: currentZone.color, fontSize: 12, fontWeight: '600', marginTop: 6 }}>
                      Faltan {formatDuration(remainingMinutes)}
                    </Text>
                  ) : (
                    /* E.1: al cumplir la meta el copy empuja a romperlo bien, no
                       a seguir alargando. El botón TERMINAR abre el cierre guiado. */
                    <>
                      <Text style={{ color: verdeOk, fontSize: 13, fontWeight: '800', marginTop: 6 }}>
                        YA LLEGASTE
                      </Text>
                      <Text style={{ color: t.textoSecundario, fontSize: 11, marginTop: 3, textAlign: 'center', lineHeight: 15 }}>
                        Romperlo bien cuenta{'\n'}tanto como sostenerlo
                      </Text>
                    </>
                  )}
                </>
              ) : lastCompleted ? (
                /* F.3: vacío que informa — dato real en vez de anillo muerto */
                <>
                  <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }}>DESDE TU ÚLTIMO AYUNO</Text>
                  <Text style={{ color: t.texto, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 2 }}>
                    {formatSince(sinceLastMin)}
                  </Text>
                  <Text style={{ color: t.textoSecundario, fontSize: 12, marginTop: 6 }}>
                    ayunaste {Math.round((lastCompleted.actual_hours || 0) * 10) / 10} h
                  </Text>
                </>
              ) : (
                /* F.3: primera vez — el vacío invita, no acusa */
                <>
                  <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>TU PRIMER AYUNO</Text>
                  <Text style={{ color: t.texto, fontSize: 44, fontWeight: '900', marginTop: 2 }}>
                    {selectedProtocol.hours} h
                  </Text>
                  <Text style={{ color: t.textoSecundario, fontSize: 12, marginTop: 6 }}>empieza cuando tú digas</Text>
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
                backgroundColor: t.card, borderWidth: 1, borderColor: `${selectedProtocol.color}55`,
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
              {/* 31-ago-2026 (backlog 15.5): ventana sin firma de Mariana. */}
              <Text style={{ color: t.textoSecundario, fontSize: 11 }}>aproximado</Text>
              <Ionicons name="chevron-up" size={13} color={t.textoSecundario} />
            </Pressable>
          )}

          {/* INICIO · META — se edita donde se ve (F.2), 3 niveles de texto (F.0.4) */}
          <View style={{ flexDirection: 'row', width: '100%', marginTop: 14 }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>INICIO</Text>
              <Text style={{ color: t.texto, fontSize: 15, fontWeight: '700' }}>
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
                <Text style={{ color: acento, fontSize: 12, fontWeight: '600' }}>
                  {activeFast ? 'Editar inicio' : '¿Empezaste antes?'}
                </Text>
              </Pressable>
              {!activeFast && customStartSet && (
                <Pressable onPress={() => setCustomStartSet(false)} hitSlop={8}>
                  <Text style={{ color: t.textoSecundario, fontSize: 11 }}>Usar ahora</Text>
                </Pressable>
              )}
            </View>
            <View style={{ width: 1, backgroundColor: t.borde }} />
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>META</Text>
              <Text style={{ color: t.texto, fontSize: 15, fontWeight: '700' }}>
                {selectedProtocol.hours} h{activeFast && goalEnd ? ` · ${formatTime(goalEnd)}` : ''}
              </Text>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGoalSheetOpen(true); }} hitSlop={8}>
                <Text style={{ color: acento, fontSize: 12, fontWeight: '600' }}>Cambiar meta</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Estadísticas rápidas (28-ago-2026) ──
              Enrique: "no me está dando estadísticas rápidas acerca de mis
              ayunos, mi promedio de ayunos, mi ayuno más largo".

              Van SIN iconos a propósito, y no por estética: el censo de iconos
              (icon-censo.test.ts) tiene vetados en GLIFOS_DE_FUNCION justo los
              que uno elegiría aquí — stats-chart, trending-up, bar-chart,
              analytics, flame, calendar. Y sin superficies presionables, que es
              la doctrina de contención del SPEC de Zero: la pantalla ya tiene
              demasiadas decisiones. Son tres números, no tres botones. */}
          {stats.total > 0 && (
            <View style={{ flexDirection: 'row', width: '100%', marginTop: 18 }}>
              {/* 31-ago-2026 (backlog 15.4): la mediana se calculaba y no se
                  pintaba. Es el número honesto cuando hay un ayuno raro en la
                  lista; va junto al promedio para que se lean juntos. */}
              {([
                { et: 'PROMEDIO', v: formatearHoras(stats.promedio) },
                { et: 'MEDIANA', v: formatearHoras(stats.mediana) },
                { et: 'MÁS LARGO', v: formatearHoras(stats.masLargo) },
                { et: 'RACHA', v: stats.racha > 0 ? `${stats.racha} d` : '—' },
              ] as const).map((x, i) => (
                <View
                  key={x.et}
                  style={{
                    flex: 1, alignItems: 'center',
                    borderLeftWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderLeftColor: t.borde,
                  }}
                >
                  <Text style={{ color: t.textoSecundario, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }}>
                    {x.et}
                  </Text>
                  <Text style={{ color: t.texto, fontSize: 16, fontWeight: '800', marginTop: 4 }}>
                    {x.v}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* F.4: tu semana de un vistazo */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10, marginTop: 18 }}>
            {week.map((d) => (
              <DayRing key={d.key} letter={d.letter} pct={d.pct} isToday={d.isToday} t={t} />
            ))}
          </View>

          {/* BOTÓN PRIMARIO — mismo lugar, mismo tamaño; solo cambia el peso
              visual (F.0.1). Ahora pregunta la HORA, no la intención: el cierre
              guiado (BreakFastGuide) sigue siendo el aterrizaje. */}
          {activeFast ? (
            <Pressable
              onPress={preguntarHoraDeCierre}
              disabled={cerrando}
              style={{
                width: '100%', borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 22,
                backgroundColor: 'rgba(168,224,42,0.13)', borderWidth: 1, borderColor: 'rgba(168,224,42,0.35)',
                opacity: cerrando ? 0.5 : 1,
              }}
            >
              <Text style={{ color: acento, fontSize: 17, fontWeight: '800', letterSpacing: 1 }}>TERMINAR AYUNO</Text>
            </Pressable>
          ) : (
            <Pressable onPress={startFast} style={{ width: '100%', borderRadius: 18, overflow: 'hidden', marginTop: 22 }}>
              <LinearGradient
                colors={brandGradient()}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 18, alignItems: 'center' }}
              >
                <Text style={{ color: ATP_BRAND.black, fontSize: 17, fontWeight: '900', letterSpacing: 1 }}>INICIAR AYUNO</Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Único secundario del estado activo (destructivo, con confirmación) */}
          {activeFast && (
            <Pressable onPress={cancelFast} style={{ paddingVertical: 14 }}>
              <Text style={{ color: t.textoSecundario, fontSize: 13 }}>Cancelar y eliminar</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Hoja de META (F.2): los 8 protocolos plegados aquí — antes
          vivían expandidos en la pantalla ── */}
      <Modal visible={goalSheetOpen} transparent animationType="slide" onRequestClose={() => setGoalSheetOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(15,21,24,0.35)', justifyContent: 'flex-end' }} onPress={() => setGoalSheetOpen(false)}>
          <Pressable
            style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: t.borde }}
            onPress={() => {}}
          >
            <Text style={{ color: t.texto, fontSize: 17, fontWeight: '800', marginBottom: 4 }}>Tu meta de ayuno</Text>
            <Text style={{ color: t.textoSecundario, fontSize: 12, marginBottom: 14 }}>
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
                  <Text style={{ color: t.texto, fontSize: 14, fontWeight: '700' }}>{p.label}</Text>
                  <Text style={{ color: t.textoSecundario, fontSize: 11 }}>{p.description}</Text>
                </View>
                {selectedProtocol.id === p.id && <Ionicons name="checkmark-circle" size={20} color={p.color} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Hoja de FASE (F.1): qué pasa ahora, qué sigue, mapa completo ── */}
      <Modal visible={phaseSheetOpen} transparent animationType="slide" onRequestClose={() => setPhaseSheetOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(15,21,24,0.35)', justifyContent: 'flex-end' }} onPress={() => setPhaseSheetOpen(false)}>
          <Pressable
            style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: t.borde }}
            onPress={() => {}}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${currentZone.color}18`, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={currentZone.icon} size={20} color={currentZone.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>AHORA, EN TU CUERPO</Text>
                <Text style={{ color: currentZone.color, fontSize: 17, fontWeight: '800' }}>{currentZone.label}</Text>
                {/* E.3: dos modos. Con sangre → estado real medido (GKI = profundidad
                    de cetosis, nunca autofagia). Sin sangre → estimado por tiempo. */}
                {measured ? (
                  <Text style={{ color: acento, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                    MEDIDO · GKI {measured.gki} · {measured.zone.label}
                  </Text>
                ) : (
                  <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 }}>
                    ESTIMADO POR TIEMPO · APROXIMADO
                  </Text>
                )}
              </View>
            </View>
            <Text style={{ color: suave, fontSize: 13, lineHeight: 20 }}>{currentZone.now}</Text>

            {/* E.1: no se anuncia una fase que cae DESPUÉS de tu meta — nada de
                niveles por desbloquear más allá de lo que te propusiste. */}
            {nextZone && nextZone.hours < selectedProtocol.hours && (
              <View style={{ backgroundColor: t.hundido, borderRadius: 12, padding: 12, marginTop: 14 }}>
                {/* 31-ago-2026 (backlog 15.5): las ventanas de fase no están
                    firmadas por Mariana; se dicen como aproximadas. */}
                <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
                  SIGUIENTE · {nextZone.label.toUpperCase()} · EN {formatDuration(timeToNext).toUpperCase()} (APROXIMADO)
                </Text>
                <Text style={{ color: t.textoSecundario, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{nextZone.description}</Text>
              </View>
            )}

            {/* Mapa de fases — SOLO las que caben en tu meta (E.1). Con meta de
                16 h, "ayuno prolongado" no existe en tu pantalla. */}
            <View style={{ marginTop: 16 }}>
              {FASTING_PHASES.filter(p => p.hours > 0 && p.hours < selectedProtocol.hours).map(p => {
                const reached = elapsedHours >= p.hours;
                return (
                  <View key={p.hours} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, opacity: reached ? 1 : 0.45 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: reached ? `${p.color}20` : t.flotante, justifyContent: 'center', alignItems: 'center' }}>
                      {reached
                        ? <Ionicons name="checkmark" size={13} color={p.color} />
                        : <Text style={{ color: t.textoTenue, fontSize: 8, fontWeight: '700' }}>{p.hours}h</Text>}
                    </View>
                    <Text style={{ color: reached ? t.texto : t.textoSecundario, fontSize: 12, flex: 1 }}>{p.label}</Text>
                    <Text style={{ color: t.textoSecundario, fontSize: 10 }}>{p.hours} h · aproximado</Text>
                  </View>
                );
              })}
            </View>

            {/* E.2: la métrica de mejora cambia de eje — velocidad, no duración.
                Framing + vacío que informa (se mide con sangre). */}
            <View style={{ marginTop: 16, backgroundColor: t.hundido, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.borde }}>
              <Text style={{ color: acento, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>TU PROGRESO REAL</Text>
              <Text style={{ color: suave2, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                Lo que importa no son las horas que aguantas, sino qué tan rápido cambias de combustible: eso es flexibilidad metabólica. La curva se mueve a la izquierda, no la barra más lejos.
              </Text>
              <Text style={{ color: t.textoSecundario, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
                Para verla, mide tu glucosa y cetonas durante el ayuno. Con eso ATP calcula cuándo entraste en cetosis y si cada vez lo haces antes.
              </Text>
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
          // 4EP 31-ago: con el inicio exacto como piso, el picker permitía fin ==
          // inicio, la base rechazaba con 23514 y el copy decía "registro en
          // conflicto". Mismo remedio que el cierre: un minuto después del inicio.
          minDate={editingFast.fast_start ? new Date(new Date(editingFast.fast_start).getTime() + 60000) : undefined}
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

      {/* ── Ajustar la hora de FIN al terminar (28-ago-2026) ──
          El mínimo es el inicio del ayuno MÁS UN MINUTO, y el máximo es ahora.

          El minuto extra no es capricho: 4EP encontró que con el inicio exacto
          como piso, un preset fuera de rango se acotaba JUSTO al inicio, daba
          cero horas, y breakFastWithTime lo rebotaba con "la hora de fin debe
          ser después del inicio". Callejón sin salida: la rueda enseñaba algo
          que Aceptar siempre rechazaba, y la única salida era cancelar.

          Con el piso corrido y el acotado del picker redondeando hacia ADENTRO
          del rango, ahora sí es cierto que no se puede elegir una hora que dé
          horas negativas ni una en el futuro. La validación de
          breakFastWithTime queda como segunda red, no como única. */}
      {activeFast && (
        <TimeWheelPicker
          visible={breakEndOpen}
          initialValue={new Date()}
          title="¿Cuándo rompiste el ayuno?"
          minDate={(() => {
            const ini = safeDate(activeFast.fast_start);
            return ini ? new Date(ini.getTime() + 60000) : undefined;
          })()}
          maxDate={new Date()}
          presets={BREAK_END_PRESETS}
          onConfirm={handleBreakEndConfirm}
          onCancel={() => setBreakEndOpen(false)}
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
        onRegisterMeal={() => { setBreakGuide(null); router.push({ pathname: '/food-log', params: { sensor: 'foto' } }); }}
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
    </ThemeReady>
  );
}
