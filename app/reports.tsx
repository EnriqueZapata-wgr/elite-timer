/**
 * Reports — Hub de reportes en GradientCard: Identidad, Calendario de
 * adherencia, Electrones, Nutrición, Hidratación, Ayuno, Ejercicio, Glucosa,
 * Compliance, Mente y Ciclo.
 *
 * MB-11 C (SPEC Zero→ATP): toggle Semana/Mes/Año, calendario con puntos por
 * métrica, barras meta-cumplida, stats de identidad y secciones
 * personalizables (reordenar + prender/apagar, @atp/reports_sections).
 *
 * OLA1 R-0: es el hub maestro. Nutrición, hidratación, ayuno, mente y
 * electrones ya no pintan aquí su reporte completo: son tarjetas-resumen que
 * empujan a /reports/<dominio>, que es LA misma pantalla a la que se llega
 * desde el pilar. Lo demás sigue igual.
 */
import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { AdherenceCalendar } from '@/src/components/reports/AdherenceCalendar';
// OLA1 R-0: las cifras las pinta un solo componente por dominio, aquí en
// variante resumen y en /reports/<dominio> en variante completo.
import { SectionHeader, Stat, StatsRow } from '@/src/components/reports/ReportStats';
import { NutricionContent } from '@/src/components/reports/domains/nutricion';
import { HidratacionContent } from '@/src/components/reports/domains/hidratacion';
import { AyunoContent } from '@/src/components/reports/domains/ayuno';
import { MenteContent } from '@/src/components/reports/domains/mente';
import { EconomiaContent } from '@/src/components/reports/domains/economia';
import { JournalResumen } from '@/src/components/reports/domains/journal';
import { EmocionesResumen } from '@/src/components/reports/domains/emociones';
import { CicloResumen } from '@/src/components/reports/domains/ciclo';
import { NbackResumen } from '@/src/components/reports/domains/nback';
import { AdherenciaResumen } from '@/src/components/reports/domains/adherencia';
import { EntrenamientoResumen } from '@/src/components/reports/domains/entrenamiento';
import { GlucosaResumen } from '@/src/components/reports/domains/glucosa';
import { LabsResumen } from '@/src/components/reports/domains/labs';
import { loadLabsHubSummary } from '@/src/services/reports/labs-report-service';
import { ExpedienteResumen } from '@/src/components/reports/domains/expediente';
import { DOMAIN_DEFINITIONS } from '@/src/components/reports/domains';
import {
  REPORT_DOMAINS, parseRange, resolveRange, type ReportDomainKey,
} from '@/src/services/reports/report-domain-core';
import {
  shareMasterExport, type MasterExportFormat,
} from '@/src/services/reports/master-export-service';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS, ATP_BRAND, TEXT_COLORS, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme, useSurfaceTokens } from '@/src/contexts/theme-context';
import { useAuth } from '@/src/contexts/auth-context';
import { getMonthAdherence } from '@/src/services/reports/adherence-calendar-service';
import { shiftMonth, type FlagsByDate } from '@/src/services/reports/adherence-calendar-core';
import {
  effectiveOrder, isHidden, moveSection, toggleSection, parsePrefs,
  EMPTY_PREFS, type SectionPrefs,
} from '@/src/services/reports/report-prefs-core';
import {
  generateAndShareConsultaReport,
  CONSULTA_RANGES,
  type ConsultaRangeDays,
} from '@/src/services/salud/consulta-report-service';
import {
  getNutritionReport, getHydrationReport, getExerciseReport,
  getComplianceReport, getFastingReport, getElectronReport, getGlucoseReport,
  getMindReport, getCycleReport, getIdentityStats,
  type ReportPeriod, type NutritionReport, type HydrationReport,
  type ExerciseReport, type ComplianceReport, type FastingReport,
  type ElectronReport, type GlucoseReport, type MindReport, type CycleReport,
  type IdentityStats,
} from '@/src/services/reports-service';
// OLA1 R-4: una sola fila (nback_user_state) para que la tarjeta del hub diga
// cifras de verdad en vez de ser una puerta muda.
import { fetchNBackState, type NBackUserState } from '@/src/services/nback-service';

const LIME = '#a8e02a';
// OLA1 R-0: el azul de nutrición y el ámbar de ayuno se fueron al registro de
// dominios; aquí solo quedan los colores de las secciones que no navegan.
const ORANGE = '#fb923c';

type PeriodLabel = 'Semana' | 'Mes' | 'Año' | 'Todo';
const PERIOD_LABELS: readonly PeriodLabel[] = ['Semana', 'Mes', 'Año', 'Todo'];
const LABEL_TO_KEY: Record<PeriodLabel, ReportPeriod> = {
  'Semana': 'week', 'Mes': 'month', 'Año': 'year', 'Todo': 'all',
};

// #5 Batch 2: las cards de YO llegan con foco (?period=month) en vez de aterrizar
// genérico. Param → PeriodLabel inicial (inválido/ausente → Semana).
// '3month' quedó fuera de las pills (MB-11 C: Semana/Mes/Año) — deep links
// viejos caen a Mes.
const KEY_TO_LABEL: Record<string, PeriodLabel> = {
  week: 'Semana', month: 'Mes', '3month': 'Mes', year: 'Año', all: 'Todo',
};

/** Secciones personalizables, en su orden default. */
// NOCHE-REP: 'labs' y 'expediente' entran al final. effectiveOrder apendea las
// llaves nuevas donde el default las pone, así que a quien ya reordenó su hub
// le aparecen abajo sin perder el orden que eligió.
const SECTION_KEYS = [
  'calendario', 'electrones', 'nutricion', 'hidratacion', 'ayuno',
  'ejercicio', 'glucosa', 'compliance', 'mente', 'journal', 'emociones',
  'nback', 'ciclo', 'labs', 'expediente',
] as const;
type SectionKey = typeof SECTION_KEYS[number];

const SECTION_NAMES: Record<SectionKey, string> = {
  calendario: 'Calendario', electrones: 'Electrones', nutricion: 'Nutrición',
  hidratacion: 'Hidratación', ayuno: 'Ayuno', ejercicio: 'Ejercicio',
  glucosa: 'Glucosa', compliance: 'Compliance', mente: 'Mente',
  journal: 'Journal', emociones: 'Emociones', nback: 'N-Back', ciclo: 'Ciclo',
  labs: 'Labs', expediente: 'Expediente',
};

const PREFS_KEY = '@atp/reports_sections';

/**
 * OLA1 R-0: qué sección del hub lleva a qué reporte. Las llaves de sección NO
 * se renombran: la preferencia guardada de la gente dice 'electrones', y
 * cambiarla les borraría el orden que ya eligieron.
 *
 * Apagar una sección oculta SU TARJETA, nada más. La ruta /reports/<dominio>
 * sigue viva: si entras desde el pilar, el reporte abre y el atrás te regresa
 * ahí aunque en el hub lo tengas apagado.
 */
const SECTION_TO_DOMAIN: Partial<Record<SectionKey, ReportDomainKey>> = {
  nutricion: 'nutricion',
  hidratacion: 'hidratacion',
  ayuno: 'ayuno',
  mente: 'mente',
  journal: 'journal',
  emociones: 'emociones',
  ciclo: 'ciclo',
  nback: 'nback',
  compliance: 'adherencia',
  electrones: 'economia',
  ejercicio: 'entrenamiento',
  glucosa: 'glucosa',
  labs: 'labs',
  expediente: 'expediente',
};

export default function ReportsScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const { user } = useAuth();
  // MB-31B2: tokens del tema (oscuro idéntico; claro = acero).
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>(
    KEY_TO_LABEL[params.period ?? ''] ?? 'Semana',
  );
  const period = LABEL_TO_KEY[periodLabel];

  const [electrons, setElectrons] = useState<ElectronReport>({ daily: [], avgPerDay: 0, total: 0, bestDay: 0 });
  const [nutrition, setNutrition] = useState<NutritionReport>({ daily: [], avgCalories: 0, avgProtein: 0, avgScore: 0 });
  const [hydration, setHydration] = useState<HydrationReport>({ daily: [], avgMl: 0 });
  const [fasting, setFasting] = useState<FastingReport>({ totalFasts: 0, avgHours: 0, longestFast: 0, fastsPerWeek: 0, daily: [] });
  const [exercise, setExercise] = useState<ExerciseReport>({ sessionsPerWeek: 0, totalVolumeKg: 0, prsThisPeriod: 0, cardioSessions: 0 });
  const [glucose, setGlucose] = useState<GlucoseReport>({ daily: [], avgFasting: 0, avgPostMeal: 0, readings: 0 });
  const [compliance, setCompliance] = useState<ComplianceReport>({ daily: [], avgPct: 0 });
  const [mind, setMind] = useState<MindReport>({ breathingSessions: 0, meditationSessions: 0, totalMinutes: 0, journalEntries: 0, checkins: 0 });
  const [cycle, setCycle] = useState<CycleReport>({ periodDays: 0, avgEnergy: 0, avgMood: 0, logsCount: 0 });
  // D-2: si una sola lectura truena, Promise.all no entra al `then` y las
  // once secciones se quedaban en su valor inicial, que es CERO en todas.
  // O sea que un reporte vacio por falta de senal se veia igual que el de
  // alguien que no hizo nada en 30 dias, y encima con boton de exportar a
  // PDF "para tu consulta". Eso no se le entrega a nadie.
  const [falloCarga, setFalloCarga] = useState(false);
  const [identity, setIdentity] = useState<IdentityStats | null>(null);
  const [nback, setNback] = useState<NBackUserState | null>(null);
  // NOCHE-REP: dos cifras de labs, de UNA consulta. Ver el comentario de
  // loadLabsHubSummary: la evaluación de bandas exige el dominio completo.
  const [labs, setLabs] = useState<{ parametros: number; mediciones: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // MB-29 P1 (H3): el reporte para el médico — rango elegible + PDF.
  const [consultaRange, setConsultaRange] = useState<ConsultaRangeDays>(30);
  const [consultaSharing, setConsultaSharing] = useState(false);

  // NOCHE-REP: el export maestro. Es el otro destinatario: el usuario mismo.
  const [maestroSharing, setMaestroSharing] = useState(false);

  const handleMaestro = useCallback(async (format: MasterExportFormat) => {
    if (maestroSharing) return;
    haptic.medium();
    setMaestroSharing(true);
    try {
      const rango = parseRange(period) ?? 'week';
      const resolved = resolveRange(rango, new Date());
      const dominios = Object.values(DOMAIN_DEFINITIONS)
        .filter((d): d is NonNullable<typeof d> => !!d);
      const out = await shareMasterExport(dominios, resolved, format);
      if (out.result === 'empty') {
        Alert.alert('No hay nada que llevarte', out.resumen);
      } else if (out.result === 'unavailable') {
        Alert.alert(
          'Tu versión aún no comparte archivos',
          'Este teléfono trae una versión de la app sin el módulo de compartir. Llega con la próxima actualización de la tienda.',
        );
      } else if (out.result === 'error') {
        Alert.alert(
          'No se pudo generar',
          'No pudimos escribir el archivo. Nada se generó a medias: intenta de nuevo en un momento.',
        );
      } else if (out.manifiesto.dominiosNoLeidos.length > 0) {
        // Se avisa AQUÍ y además queda marcado dentro del archivo: enterarse
        // por un archivo incompleto es peor que enterarse en la pantalla.
        Alert.alert('Tu archivo va incompleto', out.resumen);
      }
    } finally {
      setMaestroSharing(false);
    }
  }, [maestroSharing, period]);
  const firstName = ((user?.user_metadata?.full_name as string) || '').trim().split(' ')[0] || '';

  const handleConsulta = useCallback(async () => {
    if (consultaSharing || !user?.id) return;
    haptic.medium();
    setConsultaSharing(true);
    try {
      const result = await generateAndShareConsultaReport(user.id, firstName, consultaRange);
      if (result === 'unavailable') {
        Alert.alert(
          'Tu versión aún no comparte PDF',
          'Este teléfono trae una versión de la app sin el módulo de PDF. Llega con la próxima actualización de la tienda.',
        );
      } else if (result === 'error') {
        Alert.alert(
          'No se pudo generar',
          'No pudimos leer todos tus registros en este momento. Nada se generó a medias: intenta de nuevo en un momento.',
        );
      }
    } finally {
      setConsultaSharing(false);
    }
  }, [consultaSharing, user?.id, firstName, consultaRange]);

  // MB-11 C: calendario de adherencia (mes visible + flags por día).
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth0, setCalMonth0] = useState(now.getMonth());
  const [calFlags, setCalFlags] = useState<FlagsByDate>({});
  const atCurrentMonth = calYear === now.getFullYear() && calMonth0 === now.getMonth();

  // MB-11 C: preferencias de secciones (orden + ocultas) + modo edición.
  const [prefs, setPrefs] = useState<SectionPrefs>(EMPTY_PREFS);
  const [editMode, setEditMode] = useState(false);
  const order = effectiveOrder(SECTION_KEYS, prefs);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => { const p = parsePrefs(raw); if (p) setPrefs(p); })
      .catch(() => {});
  }, []);

  function savePrefs(next: SectionPrefs) {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  }

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      getElectronReport(period),
      getNutritionReport(period),
      getHydrationReport(period),
      getFastingReport(period),
      getExerciseReport(period),
      getGlucoseReport(period),
      getComplianceReport(period),
      getMindReport(period),
      getCycleReport(period),
      getIdentityStats(),
      // Si truena, la tarjeta de N-Back no aparece. No tumba el hub entero.
      user?.id ? fetchNBackState(user.id).catch(() => null) : Promise.resolve(null),
      // Igual con labs: ya viene fail-soft desde el servicio.
      loadLabsHubSummary(resolveRange(parseRange(period) ?? 'week', new Date())),
    ]).then(([el, nu, hy, fa, ex, gl, co, mi, cy, id, nb, lb]) => {
      setElectrons(el); setNutrition(nu); setHydration(hy);
      setFasting(fa); setExercise(ex); setGlucose(gl); setCompliance(co);
      setMind(mi); setCycle(cy); setIdentity(id); setNback(nb); setLabs(lb);
      setFalloCarga(false);
    }).catch(() => setFalloCarga(true)).finally(() => setLoading(false));
  }, [period, user?.id]));

  // Flags del mes visible (independiente del período de las gráficas).
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    getMonthAdherence(user.id, calYear, calMonth0)
      .then((f) => { if (alive) setCalFlags(f); })
      .catch(() => { if (alive) setCalFlags({}); });
    return () => { alive = false; };
  }, [user?.id, calYear, calMonth0]);

  function shiftCalendar(delta: -1 | 1) {
    const [y, m] = shiftMonth(calYear, calMonth0, delta);
    setCalYear(y); setCalMonth0(m);
  }

  // ── Secciones personalizables (MB-11 C). null = sin datos y no se pinta. ──
  const sections: Record<SectionKey, () => ReactNode> = {
    calendario: () => (
      <GradientCard gradient={{ start: 'rgba(26,188,156,0.08)', end: 'rgba(26,188,156,0.02)' }}>
        <SectionHeader icon="calendar-number-outline" color={ATP_BRAND.teal} title="CALENDARIO" />
        <AdherenceCalendar
          year={calYear} month0={calMonth0} flags={calFlags}
          onShift={shiftCalendar} atCurrentMonth={atCurrentMonth}
        />
      </GradientCard>
    ),
    // OLA1 R-0: estas cinco pasan de contenido a puerta. La gráfica completa
    // y el export viven en /reports/<dominio>; aquí queda el resumen.
    electrones: () => (
      <DomainCard domain="economia" gradient={{ start: 'rgba(168,224,42,0.10)', end: 'rgba(168,224,42,0.02)' }} period={period}>
        <EconomiaContent data={{ electrons, movements: [], truncated: false }} variant="resumen" />
      </DomainCard>
    ),
    nutricion: () => (
      <DomainCard domain="nutricion" gradient={PILLAR_GRADIENTS.nutrition} period={period}>
        <NutricionContent data={nutrition} variant="resumen" />
      </DomainCard>
    ),
    hidratacion: () => (
      <DomainCard domain="hidratacion" gradient={{ start: 'rgba(96,165,250,0.10)', end: 'rgba(96,165,250,0.02)' }} period={period}>
        <HidratacionContent data={hydration} variant="resumen" />
      </DomainCard>
    ),
    ayuno: () => (
      <DomainCard domain="ayuno" gradient={{ start: 'rgba(251,191,36,0.10)', end: 'rgba(251,191,36,0.02)' }} period={period}>
        <AyunoContent data={fasting} variant="resumen" />
      </DomainCard>
    ),
    // NOCHE-REP: el ejercicio era la cifra sin casa más grande del hub. Ahora
    // es la puerta del dominio entrenamiento, donde además viven el volumen
    // día por día, la progresión de fuerza y el apego al plan. La llave de la
    // sección NO se renombra: la preferencia guardada de la gente dice
    // 'ejercicio', y cambiarla les borraría el orden que ya eligieron.
    ejercicio: () => (
      <DomainCard domain="entrenamiento" gradient={PILLAR_GRADIENTS.fitness} period={period}>
        <EntrenamientoResumen
          sessionsPerWeek={exercise.sessionsPerWeek}
          totalVolumeKg={exercise.totalVolumeKg}
          prs={exercise.prsThisPeriod}
          cardio={exercise.cardioSessions}
        />
      </DomainCard>
    ),
    // NOCHE-REP: la glucosa tenía barras aquí y nada más. Ahora es la puerta
    // del dominio, donde además viven las cetonas y el índice que sale de las
    // dos. Sigue escondida en cero: quien nunca se ha picado el dedo no
    // necesita una tarjeta de guiones, y desde la bitácora se llega igual.
    glucosa: () => glucose.readings > 0 ? (
      <DomainCard domain="glucosa" gradient={{ start: 'rgba(251,146,60,0.10)', end: 'rgba(251,146,60,0.02)' }} period={period}>
        <GlucosaResumen
          avgFasting={glucose.avgFasting}
          avgPostMeal={glucose.avgPostMeal}
          readings={glucose.readings}
        />
      </DomainCard>
    ) : null,
    // OLA1 R-5: compliance era la cifra sin casa. Ahora es la puerta del
    // dominio adherencia, donde ademas viven las rachas y las medallas. La
    // llave de la seccion NO se renombra: la preferencia guardada de la gente
    // dice 'compliance'.
    compliance: () => (
      <DomainCard domain="adherencia" gradient={{ start: 'rgba(168,224,42,0.08)', end: 'rgba(168,224,42,0.02)' }} period={period}>
        <AdherenciaResumen avgPct={compliance.avgPct} streak={identity?.streakCurrent ?? null} />
      </DomainCard>
    ),
    // Mente ya no se esconde en cero: la tarjeta es la puerta al reporte, y
    // esconder la puerta dejaba el dominio inalcanzable desde el hub. El cero
    // se dice, que es cierto, y adentro está el estado vacío con su copy.
    mente: () => (
      <DomainCard domain="mente" gradient={{ start: 'rgba(192,132,252,0.08)', end: 'rgba(192,132,252,0.02)' }} period={period}>
        <MenteContent data={mind} variant="resumen" />
      </DomainCard>
    ),
    // OLA1 R-1: el journal deja de ser una cifra dentro de mente y gana su
    // puerta. La cifra es la MISMA de getMindReport: no se cuenta dos veces.
    journal: () => (
      <DomainCard domain="journal" gradient={{ start: 'rgba(167,139,250,0.10)', end: 'rgba(167,139,250,0.02)' }} period={period}>
        <JournalResumen entries={mind.journalEntries} />
      </DomainCard>
    ),
    // OLA1 R-2: las emociones dejan de vivir en dos pantallas colgadas del
    // pilar y ganan su puerta aqui. La cifra sale de getMindReport, la misma
    // que ya alimenta mente.
    emociones: () => (
      <DomainCard domain="emociones" gradient={{ start: 'rgba(129,140,248,0.10)', end: 'rgba(129,140,248,0.02)' }} period={period}>
        <EmocionesResumen checkins={mind.checkins} />
      </DomainCard>
    ),
    // OLA1 R-4: N-Back tenia sus estadisticas colgadas del juego y sin puerta
    // desde reportes. En cero no se pinta: quien nunca jugo no necesita una
    // tarjeta de ceros, y desde el juego se llega igual.
    nback: () => nback && nback.sessions_total > 0 ? (
      <DomainCard domain="nback" gradient={{ start: 'rgba(127,119,221,0.10)', end: 'rgba(127,119,221,0.02)' }} period={period}>
        <NbackResumen rounds={nback.sessions_total} bestN={nback.best_n} />
      </DomainCard>
    ) : null,
    // OLA1 R-3: la tarjeta de ciclo pasa de cifra muda a puerta del dominio.
    // Sigue escondida en cero: a diferencia de mente, aqui el cero puede
    // significar "esta app no es para mi", y el guard del dominio ya decide
    // quien entra. Quien tiene ciclo llega igual desde el pilar.
    ciclo: () => cycle.logsCount > 0 ? (
      <DomainCard domain="ciclo" gradient={{ start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.02)' }} period={period}>
        <CicloResumen
          periodDays={cycle.periodDays}
          avgEnergy={cycle.avgEnergy}
          avgMood={cycle.avgMood}
          logsCount={cycle.logsCount}
        />
      </DomainCard>
    ) : null,
    // NOCHE-REP: los labs vivían solo colgados de Edad ATP y no se alcanzaban
    // desde reportes. En cero no se pinta: una tarjeta de ceros no invita a
    // subir un estudio, y para eso ya está la puerta de Mi Salud.
    labs: () => labs && labs.mediciones > 0 ? (
      <DomainCard domain="labs" gradient={{ start: 'rgba(29,158,117,0.10)', end: 'rgba(29,158,117,0.02)' }} period={period}>
        <LabsResumen parametros={labs.parametros} mediciones={labs.mediciones} />
      </DomainCard>
    ) : null,
    // NOCHE-REP: el expediente SÍ se pinta siempre, aunque esté vacío. Es la
    // única sección cuyo valor está justo en decir qué falta: esconderla
    // cuando no hay nada la volvería invisible para quien más la necesita.
    expediente: () => (
      <DomainCard domain="expediente" gradient={{ start: 'rgba(34,211,238,0.10)', end: 'rgba(34,211,238,0.02)' }} period={period}>
        <ExpedienteResumen />
      </DomainCard>
    ),
  };

  return (
    <Screen themed>
      <PillarHeader pillar="metrics" title="Reportes" />
      <View style={s.pillsRow}>
        <View style={{ flex: 1 }}>
          <FilterPills options={PERIOD_LABELS} selected={periodLabel} onSelect={setPeriodLabel} />
        </View>
        {/* MB-11 C: personalizar — reordenar y prender/apagar secciones */}
        <AnimatedPressable
          onPress={() => { haptic.light(); setEditMode(e => !e); }}
          style={[s.gearBtn, editMode && s.gearBtnActive]}
        >
          <Ionicons name="options-outline" size={18} color={editMode ? TEXT_COLORS.onAccent : t.textoSecundario} />
        </AnimatedPressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* NOCHE-REP: la carga dice QUÉ está haciendo. Un "Cargando..." pelado
            es indistinguible de una pantalla colgada, y esta semana hubo dos.
            El apagado va en el finally de la promesa, no en el then: si una
            lectura truena, esto se quita igual. */}
        {loading && (
          <EliteText style={s.loadingText}>Juntando tus registros del período…</EliteText>
        )}

        {/* D-2: el reporte NO se pinta en ceros por un fallo de lectura.
            Mismo criterio y mismo copy que /cycle. */}
        {!loading && falloCarga && (
          <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
            <Ionicons name="cloud-offline-outline" size={44} color={t.textoSecundario} />
            <EliteText style={{ color: t.texto, fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>
              Tu reporte no se pudo armar
            </EliteText>
            <EliteText style={{ color: t.textoSecundario, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
              Tus registros siguen guardados. Revisa tu conexión y vuelve a entrar.
            </EliteText>
          </View>
        )}

        {/* IDENTIDAD — tu historia completa, siempre arriba (MB-11 C) */}
        <Animated.View entering={FadeInUp.delay(30).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(26,188,156,0.10)', end: 'rgba(26,188,156,0.02)' }}>
            <SectionHeader icon="person-outline" color={ATP_BRAND.teal} title="IDENTIDAD" />
            <StatsRow>
              <Stat value={identity?.streakCurrent != null ? `${identity.streakCurrent}d` : '—'} label="racha" />
              <Stat value={identity?.streakLongest != null ? `${identity.streakLongest}d` : '—'} label="racha récord" />
              <Stat value={identity?.totalFasts != null ? `${identity.totalFasts}` : '—'} label="ayunos" />
              <Stat value={identity?.longestFastH != null && identity.longestFastH > 0 ? `${identity.longestFastH}h` : '—'} label="ayuno récord" />
              <Stat value={identity?.totalWorkouts != null ? `${identity.totalWorkouts}` : '—'} label="entrenos" />
            </StatsRow>
            {identity != null && identity.totalFasts === 0 && identity.totalWorkouts === 0 && (
              <EliteText style={s.emptyHint}>
                Tu historia empieza hoy: cada entreno y cada ayuno que registres se quedan aquí.
              </EliteText>
            )}
          </GradientCard>
        </Animated.View>

        {/* PARA TU CONSULTA — MB-29 P1 (H3): fija, es el trabajo que el
            perfil de glucosa nos contrata. Solo datos, cero interpretación. */}
        <Animated.View entering={FadeInUp.delay(45).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(29,158,117,0.12)', end: 'rgba(29,158,117,0.02)' }}>
            <SectionHeader icon="document-text-outline" color={ATP_BRAND.teal} title="PARA TU CONSULTA" />
            <EliteText style={s.consultaBody}>
              Un PDF con lo que registraste en el rango que elijas: mediciones, laboratorios,
              síntomas e intervenciones. Sin interpretar nada: la lectura la hace tu médico.
            </EliteText>
            <View style={s.consultaRangeRow}>
              {CONSULTA_RANGES.map((d) => (
                <AnimatedPressable
                  key={d}
                  onPress={() => { haptic.light(); setConsultaRange(d); }}
                  style={[s.consultaRangePill, consultaRange === d && s.consultaRangePillActive]}
                >
                  <EliteText style={[s.consultaRangeText, consultaRange === d && s.consultaRangeTextActive]}>
                    {d} días
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
            <AnimatedPressable
              onPress={handleConsulta}
              disabled={consultaSharing}
              style={[s.consultaCta, consultaSharing && s.consultaCtaDisabled]}
            >
              <Ionicons name="share-outline" size={16} color={t.textoSobreLima} />
              <EliteText style={s.consultaCtaText}>
                {consultaSharing ? 'Generando…' : 'Generar y compartir PDF'}
              </EliteText>
            </AnimatedPressable>
          </GradientCard>
        </Animated.View>

        {/* LLÉVATE TODO — NOCHE-REP: el otro destinatario de tus datos eres TÚ.
            El de arriba es para tu médico y está escrito para leerse en cinco
            minutos; este es todo, crudo, sin una sola interpretación encima.
            Son dos archivos distintos a propósito: uno solo tendría que
            elegir a quién servirle mal. */}
        <Animated.View entering={FadeInUp.delay(52).springify()} style={s.cardWrap}>
          <GradientCard gradient={{ start: 'rgba(34,211,238,0.10)', end: 'rgba(34,211,238,0.02)' }}>
            {/* El acento sale del registro de dominios, no de un literal: el
                expediente ya tiene color y aquí no se le inventa otro. */}
            <SectionHeader icon="download-outline" color={REPORT_DOMAINS.expediente.accent} title="LLÉVATE TODO" />
            <EliteText style={s.consultaBody}>
              Todos tus reportes del rango que tienes arriba, en un solo archivo tuyo. Sin
              resumir y sin interpretar: es tu dato y te lo puedes llevar a donde quieras,
              incluso fuera de ATP.
            </EliteText>
            <View style={s.exportRow}>
              {(['csv', 'json'] as const).map((f) => (
                <AnimatedPressable
                  key={f}
                  onPress={() => handleMaestro(f)}
                  disabled={maestroSharing}
                  style={[s.exportBtn, maestroSharing && s.consultaCtaDisabled]}
                >
                  <Ionicons name="share-outline" size={15} color={t.texto} />
                  <EliteText style={s.exportBtnText}>
                    {maestroSharing ? 'Juntando…' : f.toUpperCase()}
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
            <EliteText style={s.exportNota}>
              Si alguna sección no carga, va marcada dentro del archivo en vez de
              desaparecer. Un pilar ausente se leería como historial perdido.
            </EliteText>
          </GradientCard>
        </Animated.View>

        {/* Ni durante la carga ni con fallo: un cero que el usuario alcanza
            a leer se lo cree, y despues salta al valor real. */}
        {!loading && !falloCarga && order.map((key, i) => {
          const k = key as SectionKey;
          const hidden = isHidden(prefs, k);
          if (hidden && !editMode) return null;
          const content = sections[k]();
          if (content == null && !editMode) return null;
          return (
            <Animated.View key={k} entering={FadeInUp.delay(60 + i * 30).springify()} style={s.cardWrap}>
              {editMode && (
                <View style={s.editRow}>
                  <EliteText style={s.editName}>{SECTION_NAMES[k]}</EliteText>
                  <View style={s.editControls}>
                    <AnimatedPressable onPress={() => { haptic.light(); savePrefs({ ...prefs, order: moveSection(order, k, -1) }); }} style={s.editBtn}>
                      <Ionicons name="chevron-up" size={16} color={t.textoSecundario} />
                    </AnimatedPressable>
                    <AnimatedPressable onPress={() => { haptic.light(); savePrefs({ ...prefs, order: moveSection(order, k, 1) }); }} style={s.editBtn}>
                      <Ionicons name="chevron-down" size={16} color={t.textoSecundario} />
                    </AnimatedPressable>
                    <AnimatedPressable onPress={() => { haptic.light(); savePrefs(toggleSection({ ...prefs, order }, k)); }} style={s.editBtn}>
                      {/* El lima sobre acero casi no se ve: en claro el ojo activo va en teal calibrado. */}
                      <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={16} color={hidden ? t.textoTenue : (t.kind === 'dark' ? LIME : t.tealTexto)} />
                    </AnimatedPressable>
                  </View>
                </View>
              )}
              {!hidden && (content ?? (
                // En modo edición una sección sin datos se anuncia, no desaparece.
                <EliteText style={s.emptyHint}>{SECTION_NAMES[k]}: sin datos en este período.</EliteText>
              ))}
            </Animated.View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

/**
 * OLA1 R-0: la tarjeta de un dominio es una puerta. Se empuja con push y
 * NUNCA con replace: así el atrás desde el reporte regresa al hub, igual que
 * regresa al pilar cuando se entra desde el pilar. Es la misma pantalla.
 *
 * Se le pasa el periodo que el hub tiene en pantalla para que el reporte abra
 * en el mismo rango que estabas viendo.
 */
function DomainCard({ domain, gradient, period, children }: {
  domain: ReportDomainKey;
  gradient: { start: string; end: string };
  period: ReportPeriod;
  children: ReactNode;
}) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const accent = REPORT_DOMAINS[domain].accent;
  return (
    <GradientCard
      gradient={gradient}
      onPress={() => {
        haptic.light();
        router.push({ pathname: '/reports/[dominio]', params: { dominio: domain, period } });
      }}
    >
      {children}
      <View style={s.domainCta}>
        <EliteText style={[s.domainCtaText, { color: accent }]}>Ver reporte</EliteText>
        <Ionicons name="chevron-forward" size={14} color={accent} />
      </View>
    </GradientCard>
  );
}

// MB-31B2: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  loadingText: { color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: Spacing.lg },

  // MB-11 C: pills + botón personalizar
  pillsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: 4, paddingRight: Spacing.md },
  gearBtn: { padding: 8, borderRadius: 999, borderWidth: 1, borderColor: t.bordeMarcado },
  gearBtnActive: { backgroundColor: LIME, borderColor: LIME },
  // MB-11 C: fila de edición por sección (reordenar / ocultar)
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  editName: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.texto, letterSpacing: 1 },
  editControls: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: t.bordeMarcado },
  emptyHint: { fontSize: FontSizes.sm, color: t.textoSecundario, fontFamily: Fonts.regular, lineHeight: 18, marginTop: 4 },

  // MB-29 P1: card del reporte para la consulta
  consultaBody: { fontSize: FontSizes.sm, color: t.textoSecundario, fontFamily: Fonts.regular, lineHeight: 19, marginBottom: Spacing.sm },
  consultaRangeRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  consultaRangePill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: t.bordeMarcado },
  consultaRangePillActive: { backgroundColor: 'rgba(29,158,117,0.18)', borderColor: ATP_BRAND.teal },
  consultaRangeText: { fontSize: FontSizes.sm, color: t.textoSecundario, fontFamily: Fonts.semiBold },
  consultaRangeTextActive: { color: t.texto },
  consultaCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ATP_BRAND.lime, borderRadius: 12, paddingVertical: 12 },
  consultaCtaDisabled: { opacity: 0.7 },
  consultaCtaText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: t.textoSobreLima },

  // NOCHE-REP: botones del export maestro
  exportRow: { flexDirection: 'row', gap: Spacing.sm },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12,
    borderWidth: 1, borderColor: t.bordeMarcado,
  },
  exportBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.texto },
  exportNota: {
    fontSize: FontSizes.xs, color: t.textoTenue, fontFamily: Fonts.regular,
    lineHeight: 16, marginTop: Spacing.sm,
  },

  cardWrap: { marginBottom: Spacing.md },

  // OLA1 R-0: el "ver reporte" al pie de las tarjetas navegables
  domainCta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  domainCtaText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
