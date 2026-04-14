/**
 * Ciclo Menstrual — Hub principal de tracking.
 *
 * Muestra fase actual, calendario interactivo mensual, modal de registro
 * diario (DayEditorModal) y navegación a gráficas, historial y ajustes.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { InfoButton } from '@/src/components/InfoButton';
import { CYCLE_INFO } from '@/src/constants/cycle-info';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { PILLAR_GRADIENTS, SURFACES, TEXT_COLORS, CARD, withOpacity } from '@/src/constants/brand';

// ═══ CONSTANTES ═══

const ROSE = '#fb7185';
const RED = '#ef4444';
const YELLOW = '#fbbf24';
const GREEN = '#22c55e';
const VIOLET = '#a78bfa';

const SCREEN_W = Dimensions.get('window').width;
const DAY_SIZE = Math.floor((SCREEN_W - Spacing.md * 2 - 12) / 7);

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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
  { key: 'libido', label: 'Líbido', icon: 'heart-outline' },
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

/** Genera todos los días de un mes como array de YYYY-MM-DD */
function getMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= count; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    days.push(`${year}-${mm}-${dd}`);
  }
  return days;
}

/** Día de la semana: 0=Lunes, 6=Domingo */
function getWeekday(dateStr: string): number {
  return (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7;
}

// ═══ CÁLCULO DE FASES ═══

function calcPhase(day: number, cycleLen: number, periodLen: number): PhaseInfo {
  const ovDay = Math.round(cycleLen / 2);
  const until = Math.max(0, cycleLen - day + 1);

  if (day <= periodLen) {
    return {
      phase: 'menstrual', label: 'Menstrual', icon: 'water', color: RED,
      cycleDay: day, daysUntilPeriod: until,
      description: 'Tu cuerpo se renueva. Prioriza descanso y alimentos ricos en hierro.',
    };
  }
  if (day < ovDay - 2) {
    return {
      phase: 'follicular', label: 'Folicular', icon: 'leaf-outline', color: GREEN,
      cycleDay: day, daysUntilPeriod: until,
      description: 'Energía en ascenso. Ideal para entrenamientos de fuerza e intensidad.',
    };
  }
  if (day <= ovDay + 1) {
    return {
      phase: 'ovulation', label: 'Ovulación', icon: 'sunny-outline', color: YELLOW,
      cycleDay: day, daysUntilPeriod: until,
      description: 'Pico de energía y confianza. Máximo rendimiento físico.',
    };
  }
  return {
    phase: 'luteal', label: 'Lútea', icon: 'moon-outline', color: VIOLET,
    cycleDay: day, daysUntilPeriod: until,
    description: 'Energía desciende gradualmente. Enfócate en cardio suave y flexibilidad.',
  };
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
  const userId = user?.id ?? '';
  const today = getLocalToday();

  // Estado principal
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [settings, setSettings] = useState({ avg_cycle_length: 28, avg_period_length: 5 });
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
      const [logsRes, settingsRes] = await Promise.all([
        supabase
          .from('cycle_daily_logs')
          .select('date,is_period,flow_level,had_sex,sex_protected,energy,mood,appetite,libido,cramps,bloating,temperature_c,hrv_ms,notes')
          .eq('user_id', userId)
          .gte('date', ninetyAgo)
          .order('date', { ascending: true }),
        supabase
          .from('cycle_settings')
          .select('avg_cycle_length,avg_period_length')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);
      if (logsRes.data) setLogs(logsRes.data as DayLog[]);
      if (settingsRes.data) {
        setSettings({
          avg_cycle_length: settingsRes.data.avg_cycle_length ?? 28,
          avg_period_length: settingsRes.data.avg_period_length ?? 5,
        });
      }
    } catch { /* silencioso */ }
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

  const phaseInfo = useMemo<PhaseInfo | null>(() => {
    if (!lastPeriodStart) return null;
    const day = diffDays(lastPeriodStart, today) + 1;
    if (day < 1 || day > settings.avg_cycle_length + 14) return null;
    return calcPhase(day, settings.avg_cycle_length, settings.avg_period_length);
  }, [lastPeriodStart, today, settings]);

  // Predicciones: próximo período, ovulación y ventana fértil
  const predictions = useMemo(() => {
    if (!lastPeriodStart) return { periodDays: new Set<string>(), ovDay: '', fertileDays: new Set<string>() };
    const { avg_cycle_length: cl, avg_period_length: pl } = settings;
    // Próximo período predicho
    const nextStart = addDays(lastPeriodStart, cl);
    const pDays = new Set<string>();
    for (let i = 0; i < pl; i++) pDays.add(addDays(nextStart, i));
    // Ovulación y ventana fértil
    const ovDate = addDays(lastPeriodStart, Math.round(cl / 2) - 1);
    const fDays = new Set<string>();
    for (let i = -3; i <= 1; i++) fDays.add(addDays(ovDate, i));
    return { periodDays: pDays, ovDay: ovDate, fertileDays: fDays };
  }, [lastPeriodStart, settings]);

  // Calendario: días del mes visible
  const monthDays = useMemo(() => getMonthDays(calMonth.year, calMonth.month), [calMonth]);
  const firstWeekday = useMemo(() => monthDays.length > 0 ? getWeekday(monthDays[0]) : 0, [monthDays]);

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

  const openEditor = (date: string) => {
    haptic.medium();
    const existing = logsMap.get(date);
    setEditorDate(date);
    setEditorData(existing ? { ...existing } : { is_period: false, had_sex: false });
    setEditorVisible(true);
  };

  const updateEditor = (field: string, value: any) => {
    setEditorData(prev => ({ ...prev, [field]: value }));
  };

  const saveEditor = async () => {
    if (!userId) return;
    haptic.medium();
    setSaving(true);
    try {
      const d = editorData;
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
      // Recalcular cycle_periods si se marcó período
      if (d.is_period) await recalcPeriods();
      haptic.success();
      setEditorVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
    }
    setSaving(false);
  };

  /** Agrupa días consecutivos con is_period=true en cycle_periods */
  const recalcPeriods = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('cycle_daily_logs')
        .select('date')
        .eq('user_id', userId)
        .eq('is_period', true)
        .order('date', { ascending: true });

      if (!data?.length) return;

      // Agrupar consecutivos
      const groups: { s: string; e: string }[] = [];
      let cs = data[0].date, ce = cs;
      for (let i = 1; i < data.length; i++) {
        if (diffDays(ce, data[i].date) === 1) { ce = data[i].date; }
        else { groups.push({ s: cs, e: ce }); cs = data[i].date; ce = cs; }
      }
      groups.push({ s: cs, e: ce });

      // Reinsertar períodos
      await supabase.from('cycle_periods').delete().eq('user_id', userId);
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        await supabase.from('cycle_periods').insert({
          user_id: userId,
          start_date: g.s,
          end_date: g.e,
          period_length: diffDays(g.s, g.e) + 1,
          cycle_length: i > 0 ? diffDays(groups[i - 1].s, g.s) : null,
        });
      }
    } catch { /* silencioso */ }
  };

  /** Formato: "6 de Abril" */
  const fmtDate = (d: string) => {
    const x = new Date(d + 'T12:00:00');
    return `${x.getDate()} de ${MONTHS[x.getMonth()]}`;
  };

  // ═══ RENDER: LOADING ═══

  if (loading) {
    return (
      <Screen>
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
    <Screen>
      <PillarHeader pillar="cycle" title="Ciclo" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl * 2 }}
      >
        {/* ── 1. Card de fase actual ── */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          {phaseInfo ? (
            <GradientCard gradient={PILLAR_GRADIENTS.cycle} style={{ marginBottom: Spacing.sm }} padding={Spacing.lg}>
              <View style={st.phaseRow}>
                <View style={{ flex: 1 }}>
                  <EliteText style={st.phaseDay}>
                    DÍA {phaseInfo.cycleDay} DE {settings.avg_cycle_length}
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
                  width: `${Math.min(100, (phaseInfo.cycleDay / settings.avg_cycle_length) * 100)}%`,
                  backgroundColor: phaseInfo.color,
                }]} />
              </View>
              <EliteText style={st.phaseDesc}>{phaseInfo.description}</EliteText>
            </GradientCard>
          ) : (
            <GradientCard gradient={PILLAR_GRADIENTS.cycle} style={{ marginBottom: Spacing.sm }} padding={Spacing.lg}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Ionicons name="water-outline" size={32} color={ROSE} />
                <EliteText style={{ color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.lg, textAlign: 'center' }}>
                  Sin datos de ciclo
                </EliteText>
                <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, textAlign: 'center' }}>
                  Registra tu primer día de período para comenzar el tracking.
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
              {WEEKDAYS.map(d => (
                <View key={d} style={st.weekCell}>
                  <EliteText style={st.weekText}>{d}</EliteText>
                </View>
              ))}
            </View>

            {/* Grid de días */}
            <View style={st.calGrid}>
              {/* Celdas vacías antes del primer día */}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <View key={`e${i}`} style={st.dayCell} />
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
                } else if (lastPeriodStart) {
                  // Colorear fases folicular y lútea
                  const daysDiff = Math.floor((new Date(dateStr + 'T12:00:00').getTime() - new Date(lastPeriodStart + 'T12:00:00').getTime()) / 86400000);
                  const cycleDay = daysDiff >= 0 ? (daysDiff % settings.avg_cycle_length) + 1 : -1;
                  const ovDay = Math.round(settings.avg_cycle_length / 2);
                  const fertStart = ovDay - 3;
                  const fertEnd = ovDay + 1;
                  const BLUE_PHASE = '#38bdf8';
                  const PURPLE_PHASE = '#c084fc';
                  if (cycleDay > settings.avg_period_length && cycleDay < fertStart) {
                    // Folicular
                    bg = isFut ? withOpacity(BLUE_PHASE, 0.08) : withOpacity(BLUE_PHASE, 0.25);
                  } else if (cycleDay > fertEnd && cycleDay <= settings.avg_cycle_length) {
                    // Lútea
                    bg = isFut ? withOpacity(PURPLE_PHASE, 0.06) : withOpacity(PURPLE_PHASE, 0.2);
                  }
                }

                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => openEditor(dateStr)}
                    style={[st.dayCell, { backgroundColor: bg }, isT && st.dayToday]}
                  >
                    <EliteText style={[
                      st.dayText,
                      isPer && !isFut && { color: '#fff', fontFamily: Fonts.bold },
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
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <EliteText style={st.regBtnText}>Registrar hoy</EliteText>
          </AnimatedPressable>
        </Animated.View>

        {/* ── 4. Cards de navegación ── */}
        <Animated.View entering={FadeInUp.delay(240).springify()}>
          <SectionTitle style={{ marginTop: Spacing.lg }}>HERRAMIENTAS</SectionTitle>
          <View style={st.navGrid}>
            {([
              { route: '/cycle-charts', icon: 'analytics-outline', title: 'Gráficas', sub: 'Tendencias y patrones' },
              { route: '/cycle-history', icon: 'calendar-outline', title: 'Historial', sub: 'Ciclos anteriores' },
              { route: '/cycle-settings', icon: 'settings-outline', title: 'Ajustes', sub: 'Duración y modo' },
            ] as const).map(n => (
              <AnimatedPressable
                key={n.route}
                onPress={() => { haptic.medium(); router.push(n.route as any); }}
                style={st.navCard}
              >
                <Ionicons name={n.icon as any} size={24} color={ROSE} />
                <EliteText style={st.navText}>{n.title}</EliteText>
                <EliteText style={st.navSub}>{n.sub}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ═══ DayEditorModal ═══ */}
      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <Pressable style={st.overlay} onPress={() => setEditorVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ justifyContent: 'flex-end' }}
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
                <EliteText style={{ color: '#fff', fontSize: 15, fontFamily: Fonts.bold, marginBottom: 10 }}>¿Tienes periodo hoy?</EliteText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  {[
                    { value: true, label: 'Sí, tengo periodo', icon: 'water-outline' as const, color: RED },
                    { value: false, label: 'No', icon: 'close-circle-outline' as const, color: '#666' },
                  ].map(opt => (
                    <AnimatedPressable key={String(opt.value)} onPress={() => { haptic.light(); updateEditor('is_period', opt.value); }} style={{ flex: 1 }}>
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14,
                        backgroundColor: editorData.is_period === opt.value ? `${opt.color}20` : '#0a0a0a',
                        borderWidth: 1.5,
                        borderColor: editorData.is_period === opt.value ? opt.color : '#1a1a1a',
                      }}>
                        <Ionicons name={opt.icon} size={18} color={editorData.is_period === opt.value ? opt.color : '#666'} />
                        <EliteText style={{ color: editorData.is_period === opt.value ? '#fff' : '#666', fontSize: 13, fontFamily: Fonts.semiBold }}>
                          {opt.label}
                        </EliteText>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
                {editorData.is_period && (
                  <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <EliteText style={{ color: '#999', fontSize: 12, fontFamily: Fonts.semiBold }}>Nivel de flujo</EliteText>
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
                              backgroundColor: active ? `${RED}20` : '#0a0a0a',
                              borderWidth: 1.5, borderColor: active ? RED : '#1a1a1a',
                            }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED, opacity: dotOpacity, marginBottom: 4 }} />
                              <EliteText style={{ color: active ? '#fff' : '#666', fontSize: 11, fontFamily: Fonts.semiBold }}>{o.label}</EliteText>
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
                          backgroundColor: isActive ? 'rgba(192,132,252,0.15)' : '#0a0a0a',
                          borderWidth: 1.5, borderColor: isActive ? VIOLET : '#1a1a1a',
                        }}>
                          <Ionicons name={opt.icon} size={18} color={isActive ? VIOLET : '#666'} />
                          <EliteText style={{ color: isActive ? '#fff' : '#666', fontSize: 10, fontFamily: Fonts.semiBold, marginTop: 4, textAlign: 'center' }}>
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
                      <Ionicons name={sym.icon as any} size={14} color={TEXT_COLORS.secondary} />
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
                            <EliteText style={[st.symDotT, filled && { color: '#fff' }]}>
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
                    placeholderTextColor="#444"
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
                    placeholderTextColor="#444"
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
                  placeholderTextColor="#444"
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
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <EliteText style={st.saveBtnText}>
                    {saving ? 'Guardando...' : 'Guardar registro'}
                  </EliteText>
                </AnimatedPressable>

                <AnimatedPressable onPress={() => setEditorVisible(false)} style={st.cancelBtn}>
                  <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm }}>Cancelar</EliteText>
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

const st = StyleSheet.create({
  // ── Fase ──
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phaseDay: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, letterSpacing: 1 },
  phaseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  phaseName: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  bar: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.xs, overflow: 'hidden', marginTop: Spacing.sm },
  barFill: { height: '100%', borderRadius: Radius.xs },
  phaseDesc: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginTop: Spacing.sm, lineHeight: 18 },

  // ── Calendario ──
  calCard: {
    backgroundColor: CARD.bg, borderRadius: CARD.borderRadius,
    borderWidth: CARD.borderWidth, borderColor: CARD.borderColor,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  calMonth: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { width: DAY_SIZE, alignItems: 'center', paddingVertical: 4 },
  weekText: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: DAY_SIZE / 2, marginBottom: 2 },
  dayToday: { borderWidth: 2, borderColor: ROSE },
  dayText: { color: '#fff', fontSize: FontSizes.sm },
  dotRow: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.md,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 0.5, borderTopColor: SURFACES.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs },

  // ── Botón registrar ──
  regBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ROSE, borderRadius: Radius.card,
    paddingVertical: 14, marginTop: Spacing.md,
  },
  regBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.md },

  // ── Navegación ──
  navGrid: { flexDirection: 'row', gap: Spacing.sm },
  navCard: {
    flex: 1, backgroundColor: CARD.bg, borderRadius: CARD.borderRadius,
    borderWidth: CARD.borderWidth, borderColor: CARD.borderColor,
    padding: Spacing.md, alignItems: 'center', gap: 6,
  },
  navText: { color: '#fff', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  navSub: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, textAlign: 'center' },

  // ── Modal ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: Spacing.md },
  modalDate: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.xl, textAlign: 'center', marginBottom: Spacing.lg },

  // ── Toggles ──
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  toggleLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.md },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: SURFACES.border },
  toggleBtnT: { color: TEXT_COLORS.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  // ── Pills ──
  pillRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: SURFACES.border },
  pillT: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  // ── Síntomas ──
  symRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  symLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 100 },
  symLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm },
  symDots: { flexDirection: 'row', gap: 6 },
  symDot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    borderColor: SURFACES.border, alignItems: 'center', justifyContent: 'center',
  },
  symDotT: { color: TEXT_COLORS.muted, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  // ── Inputs ──
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  inputLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.md },
  input: {
    width: 80, backgroundColor: '#111', borderRadius: Radius.sm,
    paddingVertical: 8, paddingHorizontal: 12, fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold, color: '#fff', textAlign: 'center',
    borderWidth: 0.5, borderColor: '#333',
  },
  notes: {
    backgroundColor: '#111', borderRadius: Radius.sm, padding: Spacing.md,
    fontSize: FontSizes.md, fontFamily: Fonts.regular, color: '#fff',
    borderWidth: 0.5, borderColor: '#333', minHeight: 80, marginBottom: Spacing.md,
  },

  // ── Guardar / Cancelar ──
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ROSE, borderRadius: Radius.card,
    paddingVertical: 14, marginTop: Spacing.sm,
  },
  saveBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.md },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.md },
});
