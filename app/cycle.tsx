/**
 * Ciclo Menstrual — Hub principal de tracking.
 *
 * Muestra fase actual, calendario interactivo mensual, modal de registro
 * diario (DayEditorModal) y navegación a gráficas, historial y ajustes.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Alert, Modal,
  TextInput, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { EliteText } from '@/components/elite-text';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
import { getMonthDays, getWeekdayMondayFirst } from '@/src/utils/cycle-calendar';
import { getPhase, resolverCiclo, largoDeCiclo } from '@/src/services/cycle/cycle-phase-core';
import { agruparPeriodos } from '@/src/services/cycle/cycle-periods-core';
import { haptic } from '@/src/utils/haptics';
import { InfoButton } from '@/src/components/InfoButton';
import { CYCLE_INFO } from '@/src/constants/cycle-info';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { PILLAR_GRADIENTS, TEXT_COLORS, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { useCycleGate } from '@/src/hooks/use-cycle-gate';
import { derivePregnancyProgress, type PregnancyStatus } from '@/src/utils/pregnancy';
import { userErrorMessage } from '@/src/utils/user-error';
import { type PeriodStartLike } from '@/src/services/cycle/cycle-length-core';

// ═══ CONSTANTES ═══

const ROSE = '#fb7185';
const RED = '#ef4444';
const YELLOW = '#fbbf24';
const GREEN = '#22c55e';
const VIOLET = '#a78bfa';

const SCREEN_W = Dimensions.get('window').width;
// Fallback antes de medir: el grid vive dentro de ScrollView (Spacing.md) + calCard (Spacing.md),
// así que el ancho real es SCREEN_W - 4*Spacing.md. El cálculo viejo (-2*md-12) sobreestimaba el
// ancho → la 7ª columna (Domingo) se envolvía y desalineaba todo el grid. El tamaño real se
// recalcula con onLayout (cellSize) para ser a prueba de cambios de padding.
const DAY_SIZE = Math.floor((SCREEN_W - Spacing.md * 4) / 7);

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// REG-8: rangos fisiológicos para biométricos del ciclo. Un valor con typo
// (p.ej. 365 °C en vez de 36.5) corrompe la predicción del ciclo —
// preferimos rechazar con aviso a que el usuario lo corrija.
const TEMP_MIN_C = 34;
const TEMP_MAX_C = 42;
const HRV_MIN_MS = 0;
const HRV_MAX_MS = 300;

const FLOW_OPTS = [
  { key: 'spotting', label: 'Manchado' },
  { key: 'light', label: 'Poco' },
  { key: 'medium', label: 'Medio' },
  { key: 'heavy', label: 'Abundante' },
] as const;

const SYMPTOMS = [
  { key: 'energy', label: 'Energía', icon: 'flash-outline' },
  { key: 'mood', label: 'Ánimo', icon: 'happy-outline' },
  { key: 'appetite', label: 'Apetito', icon: 'restaurant-outline' },
  { key: 'libido', label: 'Libido', icon: 'heart-outline' },
  { key: 'cramps', label: 'Cólicos', icon: 'medical-outline' },
  { key: 'bloating', label: 'Hinchazón', icon: 'water-outline' },
] as const;

// ═══ TIPOS ═══

interface DayLog {
  date: string;
  is_period: boolean;
  flow_level: string | null;
  had_sex: boolean;
  sex_protected: boolean | null;
  energy: number | null;
  mood: number | null;
  appetite: number | null;
  libido: number | null;
  cramps: number | null;
  bloating: number | null;
  temperature_c: number | null;
  hrv_ms: number | null;
  notes: string | null;
}

type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

interface PhaseInfo {
  phase: Phase;
  label: string;
  icon: string;
  color: string;
  cycleDay: number;
  daysUntilPeriod: number;
  description: string;
}

// ═══ HELPERS DE FECHA ═══

/** Suma n días a una fecha YYYY-MM-DD */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toLocalDateString(d);
}

/** Diferencia en días entre dos fechas YYYY-MM-DD */
function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000,
  );
}

// getMonthDays / getWeekdayMondayFirst viven en src/utils/cycle-calendar.ts (testeable).

// ═══ CÁLCULO DE FASES ═══

// MB-27 P3: la DECISIÓN de fase vive en cycle-phase-core (única, con test de
// mutación). Aquí solo queda la presentación. Antes esta pantalla cortaba con
// la mitad del ciclo y el resto de la app con los umbrales canónicos: la
// misma usuaria veía dos fases distintas el mismo día según la pantalla.
const PHASE_META: Record<Phase, { label: string; icon: string; color: string; description: string }> = {
  // MB-7: copy BIDIRECCIONAL — el ciclo es una ventaja que un hombre no tiene.
  menstrual: {
    label: 'Menstrual', icon: 'water', color: RED,
    description: 'Empieza tu ciclo nuevo. Afina y escucha señales: entrena con lo de hoy, baja el ego no la ambición.',
  },
  follicular: {
    label: 'Folicular', icon: 'leaf-outline', color: GREEN,
    description: 'Estrógenos en ascenso: tu ventana de construir. Métele a los bloques duros y a lo nuevo.',
  },
  ovulation: {
    label: 'Ovulación', icon: 'sunny-outline', color: YELLOW,
    description: 'Tu pico: fuerza, potencia y confianza al máximo. LA ventana para ir por un récord.',
  },
  luteal: {
    label: 'Lútea', icon: 'moon-outline', color: VIOLET,
    description: 'Progesterona al mando: sostener y consolidar. Sigues fuerte, con otra marcha: ajusta volumen, no intención.',
  },
};

function calcPhase(day: number, cycleLen: number, periodLen: number): PhaseInfo {
  const phase = getPhase(day, cycleLen, periodLen) as Phase;
  const until = Math.max(0, cycleLen - day + 1);
  return { phase, ...PHASE_META[phase], cycleDay: day, daysUntilPeriod: until };
}

/** Encuentra el inicio del último bloque consecutivo de is_period=true */
function findLastPeriodStart(logs: DayLog[]): string | null {
  const periodSet = new Set(logs.filter(l => l.is_period).map(l => l.date));
  if (periodSet.size === 0) return null;
  // Tomar el día más reciente y caminar hacia atrás
  const sorted = [...periodSet].sort((a, b) => b.localeCompare(a));
  let cur = sorted[0];
  while (periodSet.has(addDays(cur, -1))) cur = addDays(cur, -1);
  return cur;
}

// ═══ PANTALLA PRINCIPAL ═══

export default function CycleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  // MB-31B2: tokens del tema. Las GradientCard de fase van con gradiente de
  // pilar (fondo oscuro anclado en el kit): su interior conserva texto claro
  // estático; todo lo demás (calendario, sheet, navegación) sigue el tema.
  const t = useAppTheme().tokens;
  const st = useMemo(() => makeStyles(t), [t]);
  // MB-7: gate biological_sex — cierra el deep-link a /cycle para no-female.
  // MB-22 P4: el gate trae el MODO; en acompañante el calendario es de OTRA
  // persona — se esconde lo que habla al cuerpo del usuario (embarazo, copy
  // de fase) y el banner lo deja clarísimo.
  const gate = useCycleGate();
  const acompanante = gate.mode === 'acompanante';
  const userId = user?.id ?? '';
  const today = getLocalToday();

  // Estado principal
  const [loading, setLoading] = useState(true);
  // D-2 (MB-12): fallo de red ≠ "sin datos de ciclo".
  const [loadFailed, setLoadFailed] = useState(false);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [settings, setSettings] = useState({ avg_cycle_length: 28, avg_period_length: 5 });
  // M3.b: los inicios de periodo observados (cycle_periods) alimentan la
  // predicción cuando hay suficientes ciclos; antes todo salía del ajuste manual.
  const [periods, setPeriods] = useState<PeriodStartLike[]>([]);
  // MB-7: máscara ATP Embarazo — estado desde cycle_settings.pregnancy_status.
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Estado del modal editor
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorDate, setEditorDate] = useState(today);
  const [editorData, setEditorData] = useState<Partial<DayLog>>({});
  const [saving, setSaving] = useState(false);

  // ── Carga de datos ──

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const ninetyAgo = addDays(today, -90);
      const [logsRes, settingsRes, periodsRes] = await Promise.all([
        supabase
          .from('cycle_daily_logs')
          .select('date,is_period,flow_level,had_sex,sex_protected,energy,mood,appetite,libido,cramps,bloating,temperature_c,hrv_ms,notes')
          .eq('user_id', userId)
          .gte('date', ninetyAgo)
          .order('date', { ascending: true }),
        supabase
          .from('cycle_settings')
          .select('avg_cycle_length,avg_period_length,pregnancy_status')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('cycle_periods')
          .select('start_date')
          .eq('user_id', userId)
          .order('start_date', { ascending: false })
          .limit(6),
      ]);
      // D-2 (MB-12): con error de red no se pinta "Sin datos de ciclo".
      if (logsRes.error) setLoadFailed(true);
      else { setLoadFailed(false); setLogs((logsRes.data ?? []) as DayLog[]); }
      // Fallo aquí no tumba la pantalla: sin observados manda el ajuste manual.
      if (periodsRes.error) logWarn('[cycle] cycle_periods query failed', periodsRes.error);
      else setPeriods((periodsRes.data ?? []) as PeriodStartLike[]);
      if (settingsRes.data) {
        setSettings({
          avg_cycle_length: settingsRes.data.avg_cycle_length ?? 28,
          avg_period_length: settingsRes.data.avg_period_length ?? 5,
        });
        setPregnancyStatus((settingsRes.data as any).pregnancy_status ?? null);
      }
    } catch (e) { logWarn('[cycle] loadData failed', e); }
    setLoading(false);
  }, [userId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Datos derivados ──

  const logsMap = useMemo(() => {
    const m = new Map<string, DayLog>();
    logs.forEach(l => m.set(l.date, l));
    return m;
  }, [logs]);

  const lastPeriodStart = useMemo(() => findLastPeriodStart(logs), [logs]);

  // MB-7: máscara embarazo — si está activo, el pilar muestra semana gestacional
  // + trimestre, NUNCA predicción de menstruación (doctrina 080). Sensibilidad
  // extra: cero lenguaje de riesgo, solo la etapa.
  // MB-22 P4: en acompañante NUNCA se deriva embarazo — ese estado es del
  // cuerpo del usuario, no del calendario que lleva de otra persona.
  const pregnancy = useMemo(
    () => (acompanante ? null : derivePregnancyProgress(pregnancyStatus, new Date())),
    [pregnancyStatus, acompanante],
  );

  // Audit B1: LA resolución {inicio, largo, periodo} vive en
  // cycle-phase-core y es la MISMA que consume Entrenar vía getCycleInfo.
  // Precedencia: cycle_periods manda el inicio (fallback a los logs de esta
  // pantalla solo sin periods); el largo observado gana al ajuste manual;
  // la guarda de frescura vive adentro. `largoDeCiclo` es el mismo punto de
  // decisión para pintar el calendario cuando la resolución de HOY es null.
  const resolucion = useMemo(
    () => resolverCiclo({
      periods,
      inicioDeLogs: lastPeriodStart,
      avgCycleLength: settings.avg_cycle_length,
      avgPeriodLength: settings.avg_period_length,
      hoy: today,
    }),
    [periods, lastPeriodStart, settings, today],
  );
  const largo = useMemo(
    () => largoDeCiclo(periods, settings.avg_cycle_length),
    [periods, settings.avg_cycle_length],
  );
  const observed = largo.fuente === 'observado' ? { cyclesUsed: largo.cyclesUsed } : null;
  const cycleLen = resolucion?.cycleLen ?? largo.cycleLen;

  const phaseInfo = useMemo<PhaseInfo | null>(() => {
    if (!resolucion) return null;
    return calcPhase(resolucion.day, resolucion.cycleLen, resolucion.periodLen);
  }, [resolucion]);

  // Audit V2 B1: UNA sola ancla para TODO el calendario — la misma de la
  // resolución (periods manda, logs de fallback). Antes las bandas usaban
  // resolucion.inicio y las predicciones lastPeriodStart de logs: card
  // "Día 1" con el punto de ovulación de otra fecha en un solo scroll.
  const inicioCalendario = resolucion?.inicio ?? lastPeriodStart;

  // Predicciones: próximo período, ovulación y ventana fértil
  const predictions = useMemo(() => {
    // MB-7: en modo embarazo NO se predice menstruación (doctrina 080).
    if (pregnancy) return { periodDays: new Set<string>(), ovDay: '', fertileDays: new Set<string>() };
    if (!inicioCalendario) return { periodDays: new Set<string>(), ovDay: '', fertileDays: new Set<string>() };
    const cl = cycleLen;
    const pl = settings.avg_period_length;
    // Próximo período predicho
    const nextStart = addDays(inicioCalendario, cl);
    const pDays = new Set<string>();
    for (let i = 0; i < pl; i++) pDays.add(addDays(nextStart, i));
    // Ovulación y ventana fértil (predicción de concepción, no fase)
    const ovDate = addDays(inicioCalendario, Math.round(cl / 2) - 1);
    const fDays = new Set<string>();
    for (let i = -3; i <= 1; i++) fDays.add(addDays(ovDate, i));
    return { periodDays: pDays, ovDay: ovDate, fertileDays: fDays };
  }, [inicioCalendario, settings, cycleLen, pregnancy]);

  // Calendario: días del mes visible
  const monthDays = useMemo(() => getMonthDays(calMonth.year, calMonth.month), [calMonth]);
  const firstWeekday = useMemo(() => monthDays.length > 0 ? getWeekdayMondayFirst(monthDays[0]) : 0, [monthDays]);
  // Ancho real del grid medido en runtime → tamaño de celda exacto (7 columnas siempre caben).
  const [gridW, setGridW] = useState(0);
  const cellSize = gridW > 0 ? Math.floor(gridW / 7) : DAY_SIZE;

  const navigateMonth = (delta: number) => {
    haptic.light();
    setCalMonth(prev => {
      let m = prev.month + delta, y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  };

  // ── Editor modal: abrir, actualizar, guardar ──

  // M3.a: baseline de lo que se abrió, para detectar cambios sin guardar.
  const editorBaselineRef = useRef('{}');

  const openEditor = (date: string) => {
    haptic.medium();
    const existing = logsMap.get(date);
    const initial = existing ? { ...existing } : { is_period: false, had_sex: false };
    setEditorDate(date);
    setEditorData(initial);
    editorBaselineRef.current = JSON.stringify(initial);
    setEditorVisible(true);
  };

  const updateEditor = (field: string, value: any) => {
    setEditorData(prev => ({ ...prev, [field]: value }));
  };

  // M3.a: tocar fuera, Cancelar o el back cerraban tirando los cambios en
  // silencio, y el unico escritor es Guardar al fondo del sheet. Cerrar con
  // cambios ahora avisa; sin cambios, cierra directo como siempre.
  const closeEditor = () => {
    if (JSON.stringify(editorData) !== editorBaselineRef.current) {
      Alert.alert(
        'Cambios sin guardar',
        'Lo que marcaste en este día no se ha guardado.',
        [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => setEditorVisible(false) },
        ],
      );
      return;
    }
    setEditorVisible(false);
  };

  const saveEditor = async () => {
    if (!userId) return;
    const d = editorData;

    // REG-8: validar rangos antes de tocar la DB. Si la temperatura o el HRV
    // están fuera de rango fisiológico, abortar el save y pedirle al usuario
    // que corrija — un dato falso ensucia la predicción del ciclo más que
    // un dato faltante.
    if (d.temperature_c != null) {
      if (!Number.isFinite(d.temperature_c) || d.temperature_c < TEMP_MIN_C || d.temperature_c > TEMP_MAX_C) {
        logWarn('cycle: temperatura fuera de rango', { value: d.temperature_c, min: TEMP_MIN_C, max: TEMP_MAX_C });
        Alert.alert(
          'Temperatura fuera de rango',
          `Revisa el valor (rango esperado: ${TEMP_MIN_C}–${TEMP_MAX_C} °C).`,
        );
        return;
      }
    }
    if (d.hrv_ms != null) {
      if (!Number.isFinite(d.hrv_ms) || d.hrv_ms < HRV_MIN_MS || d.hrv_ms > HRV_MAX_MS) {
        logWarn('cycle: HRV fuera de rango', { value: d.hrv_ms, min: HRV_MIN_MS, max: HRV_MAX_MS });
        Alert.alert(
          'HRV fuera de rango',
          `Revisa el valor (rango esperado: ${HRV_MIN_MS}–${HRV_MAX_MS} ms).`,
        );
        return;
      }
    }

    haptic.medium();
    setSaving(true);
    try {
      const { error } = await supabase.from('cycle_daily_logs').upsert({
        user_id: userId,
        date: editorDate,
        is_period: d.is_period ?? false,
        flow_level: d.is_period ? (d.flow_level ?? 'medium') : null,
        had_sex: d.had_sex ?? false,
        sex_protected: d.had_sex ? (d.sex_protected ?? null) : null,
        energy: d.energy ?? null,
        mood: d.mood ?? null,
        appetite: d.appetite ?? null,
        libido: d.libido ?? null,
        cramps: d.cramps ?? null,
        bloating: d.bloating ?? null,
        temperature_c: d.temperature_c ?? null,
        hrv_ms: d.hrv_ms ?? null,
        notes: d.notes ?? null,
      }, { onConflict: 'user_id,date' });

      if (error) throw error;
      // Audit V2 B1: cycle_periods se reconstruye ante CUALQUIER cambio de
      // is_period — marcar Y desmarcar. Solo-marcar dejaba un período
      // fantasma permanente (el zombi) que contaminaba fase, largo
      // observado y todos los consumidores de getCycleInfo. Editar
      // síntomas sin tocar el período no recalcula: nada cambió.
      const periodoAntes = logsMap.get(editorDate)?.is_period ?? false;
      if ((d.is_period ?? false) !== periodoAntes) await recalcPeriods();
      haptic.success();
      setEditorVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', userErrorMessage(e, 'No se pudo guardar.'));
    }
    setSaving(false);
  };

  /** Agrupa días consecutivos con is_period=true en cycle_periods */
  const recalcPeriods = async () => {
    if (!userId) return;
    try {
      const { data, error: selectError } = await supabase
        .from('cycle_daily_logs')
        .select('date')
        .eq('user_id', userId)
        .eq('is_period', true)
        .order('date', { ascending: true });

      if (selectError) {
        Alert.alert('Error', 'No se pudo recalcular el historial del ciclo.');
        return;
      }

      // Audit V2 B1: el agrupado vive en cycle-periods-core (puro, con el
      // zombi en test). Lista VACÍA = desmarcó el último día con período:
      // la tabla se limpia — el return temprano viejo la dejaba intacta.
      const periodos = agruparPeriodos((data ?? []).map((r: { date: string }) => r.date));
      if (periodos.length === 0) {
        const { error: clearError } = await supabase
          .from('cycle_periods').delete().eq('user_id', userId);
        if (clearError) Alert.alert('Error', 'No se pudo limpiar el historial del ciclo.');
        return;
      }

      // REG-2: armar filas y hacer UN solo insert batch. Antes hacíamos N
      // inserts secuenciales: si uno fallaba a la mitad, el historial
      // quedaba parcialmente reescrito (corrupto). Si el insert batch
      // falla, NO hacemos el delete (ver orden abajo).
      const rows = periodos.map((p) => ({ user_id: userId, ...p }));

      const { error: deleteError } = await supabase
        .from('cycle_periods').delete().eq('user_id', userId);
      if (deleteError) {
        Alert.alert('Error', 'No se pudo limpiar el historial previo del ciclo.');
        return;
      }

      const { error: insertError } = await supabase
        .from('cycle_periods').insert(rows);
      if (insertError) {
        Alert.alert(
          'Error',
          'Se eliminó el historial previo pero no se pudieron guardar los nuevos períodos. Vuelve a tocar un día con período para reintentar.',
        );
        return;
      }
    } catch (e) { logWarn('[cycle] rebuildPeriods threw', e); }
  };

  /** Formato: "6 de Abril" */
  const fmtDate = (d: string) => {
    const x = new Date(d + 'T12:00:00');
    return `${x.getDate()} de ${MONTHS[x.getMonth()]}`;
  };

  // ═══ RENDER: LOADING ═══
  // MB-7: mientras el gate verifica o bloquea (no-female), no renderizar
  // contenido de ciclo — solo el loader neutro.
  if (loading || gate.state !== 'allowed') {
    return (
      <Screen themed>
        <PillarHeader pillar="cycle" title="Ciclo" />
        <View style={{ padding: Spacing.md }}>
          <SkeletonLoader width="100%" height={140} style={{ borderRadius: Radius.card }} />
          <View style={{ height: Spacing.md }} />
          <SkeletonLoader width="100%" height={300} style={{ borderRadius: Radius.card }} />
        </View>
      </Screen>
    );
  }

  // ═══ RENDER: PRINCIPAL ═══

  return (
    <Screen themed>
      <PillarHeader pillar="cycle" title="Ciclo" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl * 2 }}
      >
        {/* ── MB-22 P4: banner de modo acompañante — la verdad, clarísima. ── */}
        {acompanante && (
          <Animated.View entering={FadeInUp.springify()} style={st.acompBanner}>
            <Ionicons name="people-outline" size={16} color={ROSE} />
            <EliteText style={st.acompText}>
              Modo acompañante: este calendario es de otra persona y lo llevas
              tú, con lo que sabes. No se conecta con ninguna cuenta, y nada de
              aquí entra a tu Edad ATP ni a ARGOS.
            </EliteText>
          </Animated.View>
        )}

        {/* ── 1. Card de fase actual (o máscara embarazo) ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          {pregnancy ? (
            // MB-7: máscara ATP Embarazo — semana + trimestre, sin predicción de
            // menstruación. Copy cálido y sin alarmismo.
            <GradientCard gradient={PILLAR_GRADIENTS.cycle} style={{ marginBottom: Spacing.sm }} padding={Spacing.lg}>
              <View style={st.phaseNameRow}>
                <Ionicons name="heart-circle-outline" size={24} color={ROSE} />
                <EliteText style={[st.phaseName, { color: ROSE }]}>Embarazo</EliteText>
              </View>
              <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, marginTop: Spacing.sm }}>
                {pregnancy.label}
              </EliteText>
              <EliteText style={st.phaseDesc}>
                {pregnancy.daysToDue > 0
                  ? `Faltan ~${pregnancy.daysToDue} días para tu fecha probable. Estás acompañada en cada etapa.`
                  : 'Estás en la recta final. Estás acompañada en cada etapa.'}
              </EliteText>
              <View style={[st.bar, { marginTop: Spacing.md }]}>
                <View style={[st.barFill, {
                  width: `${Math.min(100, (pregnancy.week / 40) * 100)}%`,
                  backgroundColor: ROSE,
                }]} />
              </View>
            </GradientCard>
          ) : phaseInfo ? (
            <GradientCard gradient={PILLAR_GRADIENTS.cycle} style={{ marginBottom: Spacing.sm }} padding={Spacing.lg}>
              <View style={st.phaseRow}>
                <View style={{ flex: 1 }}>
                  <EliteText style={st.phaseDay}>
                    DÍA {phaseInfo.cycleDay} DE {cycleLen}
                  </EliteText>
                  <View style={st.phaseNameRow}>
                    <Ionicons name={phaseInfo.icon as any} size={22} color={phaseInfo.color} />
                    <EliteText style={[st.phaseName, { color: phaseInfo.color }]}>
                      Fase {phaseInfo.label}
                    </EliteText>
                    <InfoButton
                      title={CYCLE_INFO.phases[phaseInfo.phase]?.title ?? 'Fase del ciclo'}
                      explanation={CYCLE_INFO.phases[phaseInfo.phase]?.text ?? ''}
                      color={phaseInfo.color}
                      size={16}
                    />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>
                    Próximo período
                  </EliteText>
                  <EliteText style={{ color: ROSE, fontFamily: Fonts.bold, fontSize: FontSizes.lg }}>
                    ~{phaseInfo.daysUntilPeriod}d
                  </EliteText>
                </View>
              </View>
              {/* Barra de progreso del ciclo */}
              <View style={st.bar}>
                <View style={[st.barFill, {
                  width: `${Math.min(100, (phaseInfo.cycleDay / cycleLen) * 100)}%`,
                  backgroundColor: phaseInfo.color,
                }]} />
              </View>
              {/* M3.b: de dónde sale el número. Si la app aprende de sus
                  registros, se le dice; nunca cambia un dato de su cuerpo en
                  silencio. */}
              <EliteText style={st.cycleSrc}>
                {observed
                  ? `Ciclo de ${cycleLen} días: promedio de tus últimos ${observed.cyclesUsed} ciclos registrados.`
                  : `Ciclo de ${cycleLen} días, según tus ajustes. Con más registros el número se afina solo.`}
              </EliteText>
              {/* MB-22 P4: el copy de fase le habla al cuerpo de quien cicla
                  ("tu ventana", "métele") — en acompañante no aplica. */}
              {!acompanante && (
                <EliteText style={st.phaseDesc}>{phaseInfo.description}</EliteText>
              )}
            </GradientCard>
          ) : (
            <GradientCard gradient={PILLAR_GRADIENTS.cycle} style={{ marginBottom: Spacing.sm }} padding={Spacing.lg}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Ionicons name={loadFailed ? 'cloud-offline-outline' : 'water-outline'} size={32} color={ROSE} />
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.lg, textAlign: 'center' }}>
                  {loadFailed ? 'Tu ciclo no se pudo leer' : 'Sin datos de ciclo'}
                </EliteText>
                <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, textAlign: 'center' }}>
                  {loadFailed
                    ? 'Tus registros siguen guardados. Revisa tu conexión y vuelve a entrar.'
                    : acompanante
                      ? 'Registra el primer día de período para comenzar el calendario.'
                      : 'Registra tu primer día de período para comenzar el tracking.'}
                </EliteText>
              </View>
            </GradientCard>
          )}
        </Animated.View>

        {/* ── 2. Calendario interactivo ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <View style={st.calCard}>
            {/* Header del mes con flechas */}
            <View style={st.calHeader}>
              <AnimatedPressable onPress={() => navigateMonth(-1)} style={{ padding: Spacing.xs }}>
                <Ionicons name="chevron-back" size={20} color={ROSE} />
              </AnimatedPressable>
              <EliteText style={st.calMonth}>
                {MONTHS[calMonth.month]} {calMonth.year}
              </EliteText>
              <AnimatedPressable onPress={() => navigateMonth(1)} style={{ padding: Spacing.xs }}>
                <Ionicons name="chevron-forward" size={20} color={ROSE} />
              </AnimatedPressable>
            </View>

            {/* Encabezados de días de semana */}
            <View style={st.weekRow}>
              {WEEKDAYS.map((d, i) => (
                <View key={`${d}${i}`} style={[st.weekCell, { width: cellSize }]}>
                  <EliteText style={st.weekText}>{d}</EliteText>
                </View>
              ))}
            </View>

            {/* Grid de días — onLayout mide el ancho real para que las 7 columnas quepan */}
            <View style={st.calGrid} onLayout={e => setGridW(e.nativeEvent.layout.width)}>
              {/* Celdas vacías antes del primer día */}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <View key={`e${i}`} style={[st.dayCell, { width: cellSize, height: cellSize, borderRadius: cellSize / 2 }]} />
              ))}

              {monthDays.map(dateStr => {
                const num = parseInt(dateStr.split('-')[2], 10);
                const log = logsMap.get(dateStr);
                const isT = dateStr === today;
                const isFut = dateStr > today;
                const isPer = log?.is_period;
                const predPer = !isPer && predictions.periodDays.has(dateStr);
                const isOv = dateStr === predictions.ovDay;
                const isFert = predictions.fertileDays.has(dateStr) && !isOv;

                // Calcular día del ciclo para colorear fases
                let bg = 'transparent';
                if (isPer) {
                  bg = isFut ? withOpacity(RED, 0.3) : RED;
                } else if (predPer && isFut) {
                  bg = withOpacity(RED, 0.15);
                } else if (isOv) {
                  bg = isFut ? withOpacity(YELLOW, 0.15) : withOpacity(YELLOW, 0.4);
                } else if (isFert) {
                  bg = isFut ? withOpacity(GREEN, 0.1) : withOpacity(GREEN, 0.35);
                } else if (inicioCalendario) {
                  // Audit B1: las bandas cortan con LA MISMA resolución que
                  // la card Y la misma ancla que las predicciones
                  // (inicioCalendario). Antes cada quien traía la suya.
                  const daysDiff = Math.floor((new Date(dateStr + 'T12:00:00').getTime() - new Date(inicioCalendario + 'T12:00:00').getTime()) / 86400000);
                  const cycleDay = daysDiff >= 0 ? (daysDiff % cycleLen) + 1 : -1;
                  const BLUE_PHASE = '#38bdf8';
                  const PURPLE_PHASE = '#c084fc';
                  if (cycleDay > 0) {
                    const fase = getPhase(cycleDay, cycleLen, settings.avg_period_length);
                    if (fase === 'follicular') {
                      bg = isFut ? withOpacity(BLUE_PHASE, 0.08) : withOpacity(BLUE_PHASE, 0.25);
                    } else if (fase === 'luteal') {
                      bg = isFut ? withOpacity(PURPLE_PHASE, 0.06) : withOpacity(PURPLE_PHASE, 0.2);
                    } else if (fase === 'ovulation') {
                      bg = isFut ? withOpacity(YELLOW, 0.08) : withOpacity(YELLOW, 0.2);
                    }
                  }
                }

                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => openEditor(dateStr)}
                    style={[st.dayCell, { width: cellSize, height: cellSize, borderRadius: cellSize / 2, backgroundColor: bg }, isT && st.dayToday]}
                  >
                    <EliteText style={[
                      st.dayText,
                      isPer && !isFut && { color: TEXT_COLORS.primary, fontFamily: Fonts.bold },
                      isFut && { opacity: 0.3 },
                    ]}>
                      {num}
                    </EliteText>
                    {/* Indicadores: rojo=período, rosa=sexo */}
                    <View style={st.dotRow}>
                      {isPer && <View style={[st.dot, { backgroundColor: RED }]} />}
                      {log?.had_sex && <View style={[st.dot, { backgroundColor: ROSE }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Leyenda */}
            <View style={st.legend}>
              {[
                { c: RED, t: 'Período' },
                { c: '#38bdf8', t: 'Folicular' },
                { c: GREEN, t: 'Fértil' },
                { c: YELLOW, t: 'Ovulación' },
                { c: '#c084fc', t: 'Lútea' },
              ].map(l => (
                <View key={l.t} style={st.legendItem}>
                  <View style={[st.legendDot, { backgroundColor: l.c }]} />
                  <EliteText style={st.legendText}>{l.t}</EliteText>
                </View>
              ))}
            </View>
            {/* InfoButton de ventana fértil — separado de la leyenda */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 4 }}>
              <InfoButton title={CYCLE_INFO.fertileWindow.title} explanation={CYCLE_INFO.fertileWindow.text} color={GREEN} size={14} />
            </View>
          </View>
        </Animated.View>

        {/* ── 3. Botón registrar hoy ── */}
        <Animated.View entering={FadeInUp.delay(180).springify()}>
          <AnimatedPressable onPress={() => openEditor(today)} style={st.regBtn}>
            <Ionicons name="add-circle-outline" size={20} color={t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent} />
            <EliteText style={st.regBtnText}>Registrar hoy</EliteText>
          </AnimatedPressable>
        </Animated.View>

        {/* ── 4. Cards de navegación ── */}
        <Animated.View entering={FadeInUp.delay(240).springify()}>
          <SectionTitle style={{ marginTop: Spacing.lg }}>HERRAMIENTAS</SectionTitle>
          <View style={st.navGrid}>
            {([
              { route: '/reports/ciclo?tab=graficas', icon: 'analytics-outline', title: 'Gráficas', sub: 'Tendencias y patrones' },
              { route: '/reports/ciclo?tab=ciclos', icon: 'calendar-outline', title: 'Historial', sub: 'Ciclos anteriores' },
              { route: '/cycle-settings', icon: 'settings-outline', title: 'Ajustes', sub: 'Duración y modo' },
            ] as const).map(n => (
              <AnimatedPressable
                key={n.route}
                onPress={() => { haptic.medium(); router.push(n.route); }}
                style={st.navCard}
              >
                <Ionicons name={n.icon as any} size={24} color={ROSE} />
                <EliteText style={st.navText}>{n.title}</EliteText>
                <EliteText style={st.navSub}>{n.sub}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>
        <MedicalDisclaimer feature="cycle" />
      </ScrollView>

      {/* ═══ DayEditorModal ═══ */}
      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <Pressable style={st.overlay} onPress={closeEditor}>
          {/* M3.a: flex 1 le da al KeyboardAvoidingView altura RESUELTA. Sin
              eso, el maxHeight 90% del sheet era inerte (porcentaje contra
              padre de altura automática), el sheet crecía con el contenido y
              el desborde se iba por arriba, donde vive "¿Tienes periodo hoy?".
              El área vacía sobre el sheet sigue cerrando (el toque burbujea
              al overlay). */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <Pressable style={st.sheet} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Handle */}
                <View style={st.handle} />
                <EliteText style={st.modalDate}>
                  {fmtDate(editorDate)}{editorDate === today ? '  (hoy)' : ''}
                </EliteText>

                {/* ── Período ── */}
                <SectionTitle>PERÍODO</SectionTitle>
                <EliteText style={{ color: t.texto, fontSize: 15, fontFamily: Fonts.bold, marginBottom: 10 }}>¿Tienes periodo hoy?</EliteText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  {[
                    { value: true, label: 'Sí, tengo periodo', icon: 'water-outline' as const, color: RED },
                    { value: false, label: 'No', icon: 'close-circle-outline' as const, color: t.textoTenue },
                  ].map(opt => (
                    <AnimatedPressable key={String(opt.value)} onPress={() => { haptic.light(); updateEditor('is_period', opt.value); }} style={{ flex: 1 }}>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14,
                        backgroundColor: editorData.is_period === opt.value ? `${opt.color}20` : t.hundido,
                        borderWidth: 1.5,
                        borderColor: editorData.is_period === opt.value ? opt.color : t.borde,
                      }}>
                        <Ionicons name={opt.icon} size={18} color={editorData.is_period === opt.value ? opt.color : t.textoTenue} />
                        <EliteText style={{ color: editorData.is_period === opt.value ? t.texto : t.textoTenue, fontSize: 13, fontFamily: Fonts.semiBold }}>
                          {opt.label}
                        </EliteText>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
                {editorData.is_period && (
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <EliteText style={{ color: t.textoSecundario, fontSize: 12, fontFamily: Fonts.semiBold }}>Nivel de flujo</EliteText>
                      <InfoButton title={CYCLE_INFO.flowLevel.title} explanation={CYCLE_INFO.flowLevel.text} color={RED} size={14} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {FLOW_OPTS.map(o => {
                        const active = editorData.flow_level === o.key;
                        const dotOpacity = o.key === 'spotting' ? 0.3 : o.key === 'light' ? 0.5 : o.key === 'medium' ? 0.75 : 1;
                        return (
                          <AnimatedPressable key={o.key} onPress={() => { haptic.light(); updateEditor('flow_level', o.key); }} style={{ flex: 1 }}>
                            <View style={{
                              alignItems: 'center', paddingVertical: 12, borderRadius: 14,
                              backgroundColor: active ? `${RED}20` : t.hundido,
                              borderWidth: 1.5, borderColor: active ? RED : t.borde,
                            }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED, opacity: dotOpacity, marginBottom: 4 }} />
                              <EliteText style={{ color: active ? t.texto : t.textoTenue, fontSize: 11, fontFamily: Fonts.semiBold }}>{o.label}</EliteText>
                            </View>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* ── Relaciones ── */}
                <SectionTitle style={{ marginTop: Spacing.md }}>RELACIONES</SectionTitle>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[
                    { value: 'none', label: 'No', icon: 'remove-circle-outline' as const },
                    { value: 'protected', label: 'Con protección', icon: 'shield-checkmark-outline' as const },
                    { value: 'unprotected', label: 'Sin protección', icon: 'alert-circle-outline' as const },
                  ].map(opt => {
                    const currentVal = !editorData.had_sex ? 'none' : editorData.sex_protected ? 'protected' : 'unprotected';
                    const isActive = currentVal === opt.value;
                    return (
                      <AnimatedPressable key={opt.value} onPress={() => {
                        haptic.light();
                        if (opt.value === 'none') { updateEditor('had_sex', false); updateEditor('sex_protected', null); }
                        else if (opt.value === 'protected') { updateEditor('had_sex', true); updateEditor('sex_protected', true); }
                        else { updateEditor('had_sex', true); updateEditor('sex_protected', false); }
                      }} style={{ flex: 1 }}>
                        <View style={{
                          alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14,
                          backgroundColor: isActive ? 'rgba(192,132,252,0.15)' : t.hundido,
                          borderWidth: 1.5, borderColor: isActive ? VIOLET : t.borde,
                        }}>
                          <Ionicons name={opt.icon} size={18} color={isActive ? VIOLET : t.textoTenue} />
                          <EliteText style={{ color: isActive ? t.texto : t.textoTenue, fontSize: 10, fontFamily: Fonts.semiBold, marginTop: 4, textAlign: 'center' }}>
                            {opt.label}
                          </EliteText>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {/* ── Síntomas (barras 1-5) ── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md }}>
                  <SectionTitle>SÍNTOMAS</SectionTitle>
                  <InfoButton title={CYCLE_INFO.symptoms.title} explanation={CYCLE_INFO.symptoms.text} color={ROSE} size={14} />
                </View>
                {SYMPTOMS.map(sym => (
                  <View key={sym.key} style={st.symRow}>
                    <View style={st.symLabelRow}>
                      <Ionicons name={sym.icon as any} size={14} color={t.textoSecundario} />
                      <EliteText style={st.symLabel}>{sym.label}</EliteText>
                    </View>
                    <View style={st.symDots}>
                      {[1, 2, 3, 4, 5].map(v => {
                        const current = (editorData as any)[sym.key] ?? 0;
                        const filled = current >= v;
                        return (
                          <Pressable
                            key={v}
                            onPress={() => { haptic.light(); updateEditor(sym.key, (editorData as any)[sym.key] === v ? 0 : v); }}
                            style={[st.symDot, filled && { backgroundColor: ROSE, borderColor: ROSE }]}
                          >
                            {/* Sobre el relleno rosa: blanco en oscuro (como siempre), negro en claro (manual 3.6). */}
                            <EliteText style={[st.symDotT, filled && { color: t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent }]}>
                              {v}
                            </EliteText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}

                {/* ── Biométricos ── */}
                <SectionTitle style={{ marginTop: Spacing.md }}>BIOMÉTRICOS</SectionTitle>
                <View style={st.inputRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <EliteText style={st.inputLabel}>Temperatura (°C)</EliteText>
                    <InfoButton title={CYCLE_INFO.temperature.title} explanation={CYCLE_INFO.temperature.text} color="#fb923c" size={14} />
                  </View>
                  <TextInput
                    style={st.input}
                    placeholder="36.5"
                    placeholderTextColor={t.sinDatos}
                    keyboardType="decimal-pad"
                    value={editorData.temperature_c != null ? String(editorData.temperature_c) : ''}
                    onChangeText={t => { const n = parseFloat(t); updateEditor('temperature_c', isNaN(n) ? null : n); }}
                  />
                </View>
                <View style={st.inputRow}>
                  <EliteText style={st.inputLabel}>HRV (ms)</EliteText>
                  <TextInput
                    style={st.input}
                    placeholder="45"
                    placeholderTextColor={t.sinDatos}
                    keyboardType="number-pad"
                    value={editorData.hrv_ms != null ? String(editorData.hrv_ms) : ''}
                    onChangeText={t => { const n = parseInt(t, 10); updateEditor('hrv_ms', isNaN(n) ? null : n); }}
                  />
                </View>

                {/* ── Notas ── */}
                <SectionTitle style={{ marginTop: Spacing.md }}>NOTAS</SectionTitle>
                <TextInput
                  style={st.notes}
                  placeholder="¿Cómo te sientes hoy?"
                  placeholderTextColor={t.sinDatos}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={editorData.notes ?? ''}
                  onChangeText={t => updateEditor('notes', t)}
                />

                {/* ── Botón guardar ── */}
                <AnimatedPressable
                  onPress={saveEditor}
                  disabled={saving}
                  style={[st.saveBtn, saving && { opacity: 0.5 }]}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent} />
                  <EliteText style={st.saveBtnText}>
                    {saving ? 'Guardando...' : 'Guardar registro'}
                  </EliteText>
                </AnimatedPressable>

                <AnimatedPressable onPress={closeEditor} style={st.cancelBtn}>
                  <EliteText style={{ color: t.textoTenue, fontSize: FontSizes.sm }}>Cancelar</EliteText>
                </AnimatedPressable>

                <View style={{ height: Spacing.xl }} />
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Screen>
  );
}

// ═══ ESTILOS ═══

// MB-31B2: los estilos leen los tokens del tema. Los estilos del interior de
// las GradientCard de fase (phaseDay, phaseDesc, cycleSrc, bar) quedan
// anclados al oscuro con TEXT_COLORS: el gradiente de pilar es oscuro en los
// dos temas (identidad, no tema).
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  // ── MB-22 P4: banner de modo acompañante ──
  acompBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: withOpacity('#D4537E', 0.10),
    borderWidth: 0.5,
    borderColor: withOpacity('#D4537E', 0.3),
    borderRadius: Radius.card,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  acompText: {
    flex: 1,
    color: t.textoSecundario,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    lineHeight: 17,
  },

  // ── Fase (interior de GradientCard oscura: anclado, no tematizado) ──
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phaseDay: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, letterSpacing: 1 },
  phaseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  phaseName: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  bar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.xs, overflow: 'hidden', marginTop: Spacing.sm },
  barFill: { height: '100%', borderRadius: Radius.xs },
  cycleSrc: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: 6, lineHeight: 15 },
  phaseDesc: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginTop: Spacing.sm, lineHeight: 18 },

  // ── Calendario ──
  calCard: {
    backgroundColor: t.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: t.borde,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  calMonth: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { width: DAY_SIZE, alignItems: 'center', paddingVertical: 4 },
  weekText: { color: t.textoTenue, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: DAY_SIZE / 2, marginBottom: 2 },
  dayToday: { borderWidth: 2, borderColor: ROSE },
  dayText: { color: t.texto, fontSize: FontSizes.sm },
  dotRow: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.md,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: t.borde,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: t.textoTenue, fontSize: FontSizes.xs },

  // ── Botón registrar (relleno rosa: blanco en oscuro, negro en claro) ──
  regBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ROSE, borderRadius: Radius.card,
    paddingVertical: 14, marginTop: Spacing.md,
  },
  regBtnText: { color: t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.md },

  // ── Navegación ──
  navGrid: { flexDirection: 'row', gap: Spacing.sm },
  navCard: {
    flex: 1, backgroundColor: t.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: t.borde,
    padding: Spacing.md, alignItems: 'center', gap: 6,
  },
  navText: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  navSub: { color: t.textoTenue, fontSize: FontSizes.xs, textAlign: 'center' },

  // ── Modal ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.flotante, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.sinDatos, alignSelf: 'center', marginBottom: Spacing.md },
  modalDate: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xl, textAlign: 'center', marginBottom: Spacing.lg },

  // ── Toggles ──
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  toggleLabel: { color: t.textoSecundario, fontSize: FontSizes.md },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: t.borde },
  toggleBtnT: { color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  // ── Pills ──
  pillRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: t.borde },
  pillT: { color: t.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  // ── Síntomas ──
  symRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  symLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 100 },
  symLabel: { color: t.textoSecundario, fontSize: FontSizes.sm },
  symDots: { flexDirection: 'row', gap: 6 },
  symDot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    borderColor: t.borde, alignItems: 'center', justifyContent: 'center',
  },
  symDotT: { color: t.textoTenue, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  // ── Inputs ──
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  inputLabel: { color: t.textoSecundario, fontSize: FontSizes.md },
  input: {
    width: 80, backgroundColor: t.hundido, borderRadius: Radius.sm,
    paddingVertical: 8, paddingHorizontal: 12, fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold, color: t.texto, textAlign: 'center',
    borderWidth: 0.5, borderColor: t.bordeMarcado,
  },
  notes: {
    backgroundColor: t.hundido, borderRadius: Radius.sm, padding: Spacing.md,
    fontSize: FontSizes.md, fontFamily: Fonts.regular, color: t.texto,
    borderWidth: 0.5, borderColor: t.bordeMarcado, minHeight: 80, marginBottom: Spacing.md,
  },

  // ── Guardar / Cancelar ──
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ROSE, borderRadius: Radius.card,
    paddingVertical: 14, marginTop: Spacing.sm,
  },
  saveBtnText: { color: t.kind === 'dark' ? TEXT_COLORS.primary : TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.md },
});
