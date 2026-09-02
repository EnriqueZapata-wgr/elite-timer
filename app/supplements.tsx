/**
 * Suplementos — REGISTRO personal con tracking, agrupado por momento del día.
 *
 * Doctrina (Sprint SUPS+BHA): suplementos son REGISTRO, no recomendación.
 * ATP nunca sugiere suplementos — el usuario crea sus fichas desde cero
 * (biblioteca vacía por default; el catálogo curado y las recomendaciones
 * Braverman se degradaron en este sprint). Sello BHA por ficha vía scanner.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, DeviceEventEmitter, KeyboardAvoidingView, Platform, Modal, ActivityIndicator } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import { warn as logWarn } from '../src/lib/logger';
import { getLocalToday, parseLocalDate, toLocalDateString } from '../src/utils/date-helpers';
import { fireElectronAward } from '@/src/services/economy/electron-award-client';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { DOSE_PATTERNS, DOSE_TIME_LABELS, doseCountFor, isCustomDoseTime, normalizeDoseTimeInput, sortDoseTimes, takenDosesBySupplement, weeklyAdherencePct } from '@/src/services/supplements-adherence-core';
import { normalizeSupplementName } from '@/src/services/supplements-plan-core';
// 312 (backlog 3.6): plan vs eventual, dosis por unidad, registro variable.
import {
  AMOUNT_UNITS, SIN_DATO, activosTexto, dosisPorUnidadTexto, esPlan, formatNumero,
  numeroONull, tomaTexto, unidadLabel,
} from '@/src/services/supplements/adherencia-core';
import { isPregnancyActive } from '@/src/services/supplements-service';
import { BhaScanSheet } from '@/src/components/supplements/BhaScanSheet';
import { SupplementScanSheet } from '@/src/components/supplements/SupplementScanSheet';
import { ATP_BRAND, getScoreColor, getScoreLabel } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';
import { ORB_SAFE_BOTTOM } from '@/src/components/argos/ArgosFloatingButton';

const TIMING_OPTIONS = [
  { id: 'morning', label: 'Mañana', icon: 'sunny-outline' as const, color: '#fbbf24' },
  { id: 'with_food', label: 'Con comida', icon: 'restaurant-outline' as const, color: '#a8e02a' },
  { id: 'afternoon', label: 'Tarde', icon: 'partly-sunny-outline' as const, color: '#fb923c' },
  { id: 'evening', label: 'Noche', icon: 'moon-outline' as const, color: '#818cf8' },
  { id: 'bedtime', label: 'Antes de dormir', icon: 'bed-outline' as const, color: '#c084fc' },
];

// Ficha ampliada (187): presentación del suplemento
const FORM_OPTIONS = [
  { id: 'capsula', label: 'Cápsula' },
  { id: 'polvo', label: 'Polvo' },
  { id: 'gotas', label: 'Gotas' },
  { id: 'tableta', label: 'Tableta' },
  { id: 'gomita', label: 'Gomita' },
] as const;

/** Agrupa fichas por momento del dia (solo los grupos con algo). */
function agruparPorTiming(items: any[]) {
  return TIMING_OPTIONS.map(t => ({
    ...t,
    items: items.filter(s => s.timing === t.id),
  })).filter(g => g.items.length > 0);
}

export default function SupplementsScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  // MB-31B3: la pantalla migro a tokens y sigue el tema global.
  // Reglas 1-3 del manual en claro: lima y teal no son texto; los colores de
  // concepto son icono/relleno, no letra. En oscuro nada cambia.
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const tealTx = kind === 'dark' ? '#1D9E75' : t.tealTexto;
  const conceptTx = (c: string) => (kind === 'dark' ? c : t.texto);
  const [userId, setUserId] = useState('');
  const [supplements, setSupplements] = useState<any[]>([]);
  // La pantalla no tenia NINGUNA senal de carga: en cada entrada, mientras
  // la consulta iba y venia, un usuario con ocho fichas veia el estado
  // vacio completo, con el boton "CREAR MI PRIMERA FICHA". Y si la
  // consulta fallaba, ese vacio se quedaba para siempre. El comentario de
  // MB-8 ya lo habia diagnosticado; el logWarn avisa al desarrollador, no
  // al usuario.
  const [cargado, setCargado] = useState(false);
  const [falloCarga, setFalloCarga] = useState(false);
  // Multi-dosis (188): por suplemento, los dose_index tomados hoy.
  const [todayLogs, setTodayLogs] = useState<Record<string, number[]>>({});
  // 312 (10.3): unidades reales registradas hoy por (suplemento, toma) cuando
  // difieren de la ficha. Ausente = la programada.
  const [todayUnits, setTodayUnits] = useState<Record<string, Record<number, number>>>({});
  // Mini-hoja "cuantas tomaste": destino (ficha + toma) y el texto tecleado.
  const [unitsTarget, setUnitsTarget] = useState<{ id: string; name: string; doseIndex: number; form: string | null } | null>(null);
  const [unitsInput, setUnitsInput] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  // SUP-3 (MB-2): edición de ficha existente — sin esto, un suplemento creado
  // con 1 toma jamás podía ganar la 2ª (AM+PM); solo quedaba borrar y recrear.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newForm, setNewForm] = useState<string | null>(null);
  const [newTiming, setNewTiming] = useState('morning');
  const [newReason, setNewReason] = useState('');
  // Multi-dosis (188): tomas del día (Vit C 3×día = 3 etiquetas seleccionadas)
  const [newDoseTimes, setNewDoseTimes] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState<string>(DOSE_PATTERNS[0]);
  // 312 (10.4): del plan (cuenta en adherencia) o eventual (se registra, no penaliza).
  const [newIsPlan, setNewIsPlan] = useState(true);
  // 312 (10.1): reactivo por unidad y unidades por toma. Texto libre en el
  // input; se guarda como numero o null (nunca 0 inventado).
  const [newAmountPerUnit, setNewAmountPerUnit] = useState('');
  const [newAmountUnit, setNewAmountUnit] = useState<string | null>(null);
  const [newUnitsPerDose, setNewUnitsPerDose] = useState('');
  // MB-2 §4: hora custom HH:MM además de las 4 etiquetas fijas
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  // MB-2 §3: autocomplete sobre el historial del PROPIO usuario (incl. fichas
  // desactivadas) — doctrina "sin catálogo": solo lo que el user ya tecleó.
  const [nameHistory, setNameHistory] = useState<any[]>([]);
  const [weeklyAdherence, setWeeklyAdherence] = useState<number | null>(null);
  // Máscara EMBARAZO (4.1.4): dato real de cycle_settings / client_profiles
  const [pregnancyActive, setPregnancyActive] = useState(false);
  // Scanner BHA: ficha destino (null = cerrado; {id:''} = scan standalone)
  const [bhaTarget, setBhaTarget] = useState<{ id: string; name: string; brand?: string | null } | null>(null);
  const [bhaVisible, setBhaVisible] = useState(false);
  // OLA3: el escaneo de etiqueta que vivía en food-scan?mode=supplement. La
  // tabla user_supplements tiene un dueño, y es esta pantalla.
  const params = useLocalSearchParams<{ capture?: string }>();
  const [scanVisible, setScanVisible] = useState(params.capture === 'foto');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) { setUserId(user.id); return; }
      } catch { /* cae abajo */ }
      // Sin sesion resuelta, loadAll nunca corre y `cargado` nunca se pone,
      // asi que la pantalla se quedaba en blanco PARA SIEMPRE: ni vacio, ni
      // error, ni spinner. Peor que el bug que este arreglo persigue.
      setFalloCarga(true);
      setCargado(true);
    })();
  }, []);

  // #35 perf (MB-2): UNA pasada — antes eran 4-5 round-trips (fichas, logs de
  // hoy, y getWeeklyAdherence RE-leyendo fichas + logs de 7 días). Ahora: 2
  // queries en paralelo; logs de hoy y adherencia semanal se derivan de la
  // misma lectura con los cores puros.
  const loadAll = useCallback(async () => {
    if (!userId) return;
    const today = getLocalToday();
    const cursor = parseLocalDate(today);
    cursor.setDate(cursor.getDate() - 6);
    const weekAgo = toLocalDateString(cursor);
    // Noche 30/31 ago: supabase-js SI rechaza cuando falla el fetch (modo
    // avion). Con Promise.all eso lanzaba dentro del efecto, `cargado` no se
    // ponia nunca y la pantalla quedaba en blanco (el mismo fallo que cocina
    // corrigio el 30). allSettled: un rechazo cuenta como fallo de lectura.
    // Los logs van con select('*') para que una columna nueva (312) no rompa
    // la lectura en un cliente que corra antes del db push.
    const settled = await Promise.allSettled([
      supabase.from('user_supplements').select('*')
        .eq('user_id', userId).eq('is_active', true).order('timing'),
      supabase.from('supplement_logs').select('*')
        .eq('user_id', userId).gte('date', weekAgo),
      // MB-2 §3: historial propio (incl. inactivos) para el autocomplete del alta
      supabase.from('user_supplements').select('*')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);
    const sinRed = { data: null, error: { message: 'fetch rechazado (sin conexion)' } };
    const suppsRes = settled[0].status === 'fulfilled' ? settled[0].value : sinRed;
    const logsRes = settled[1].status === 'fulfilled' ? settled[1].value : sinRed;
    const historyRes = settled[2].status === 'fulfilled' ? settled[2].value : sinRed;
    // MB-8 Track B: supabase no lanza en 4xx — un error aquí se veía como
    // "plan vacío / 0% adherencia" sin señal alguna.
    // Tambien los LOGS: si fallan, las tomas de hoy salen sin palomear
    // aunque el usuario ya las haya tomado (riesgo real de doble toma) y la
    // adherencia semanal se pinta en 0% como si fuera dato bueno.
    setFalloCarga(!!(suppsRes.error || logsRes.error));
    setCargado(true);
    if (suppsRes.error) logWarn('[supplements] fichas load failed:', suppsRes.error.message);
    if (logsRes.error) logWarn('[supplements] logs load failed:', logsRes.error.message);
    if (historyRes.error) logWarn('[supplements] history load failed:', historyRes.error.message);
    const supps = (suppsRes.data ?? []) as any[];
    const logs = (logsRes.data ?? []) as any[];
    setSupplements(supps);
    setNameHistory((historyRes.data ?? []) as any[]);
    const tl: Record<string, number[]> = {};
    const tu: Record<string, Record<number, number>> = {};
    logs.forEach((l) => {
      if (!l.taken || l.date !== today) return;
      const idx = Number.isFinite(Number(l.dose_index)) ? Number(l.dose_index) : 0;
      (tl[l.supplement_id] ??= []).push(idx);
      const u = numeroONull(l.units_taken);
      if (u !== null) (tu[l.supplement_id] ??= {})[idx] = u;
    });
    setTodayLogs(tl);
    setTodayUnits(tu);
    // MB-2: adherencia por TOMA (Σ tomadas / Σ esperadas del patrón × tomas/día)
    // 312 (10.4): solo las fichas del plan; las eventuales no penalizan.
    const planSupps = supps.filter(esPlan);
    const doseCounts = Object.fromEntries(planSupps.map((s) => [s.id, doseCountFor(s.dose_times)]));
    const takenDoses = takenDosesBySupplement(logs, doseCounts);
    setWeeklyAdherence(weeklyAdherencePct(
      planSupps.map((s) => ({
        dosePattern: s.dose_pattern,
        doseCount: doseCounts[s.id],
        takenDoses: takenDoses[s.id] ?? 0,
      })),
    ));
  }, [userId]);

  useFocusEffect(useCallback(() => {
    if (userId) {
      loadAll();
      isPregnancyActive(userId).then(setPregnancyActive).catch(() => {});
    }
  }, [userId, loadAll]));

  /** Compat: los callsites post-guardado refrescan todo de una pasada. */
  function loadSupplements() { return loadAll(); }

  /**
   * B9 (4EP): Reintentar del estado de fallo. Si la sesion no resolvio en
   * el arranque (userId vacio), loadAll no haria nada y el spinner se
   * quedaria: se vuelve a pedir el usuario primero.
   */
  async function reintentar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCargado(false);
    if (userId) { await loadAll(); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setUserId(user.id); return; } // el useFocusEffect dispara loadAll
    } catch { /* cae abajo */ }
    setFalloCarga(true);
    setCargado(true);
  }

  /** Toggle de UNA toma (dose_index). N tomas = N checks (188). */
  async function toggleDose(supplementId: string, doseIndex: number) {
    const today = getLocalToday();
    const takenIdxs = todayLogs[supplementId] ?? [];
    const currentlyTaken = takenIdxs.includes(doseIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTodayLogs(prev => ({
      ...prev,
      [supplementId]: currentlyTaken
        ? (prev[supplementId] ?? []).filter(i => i !== doseIndex)
        : [...(prev[supplementId] ?? []), doseIndex],
    }));

    if (currentlyTaken) {
      const { error } = await supabase.from('supplement_logs')
        .delete()
        .eq('user_id', userId)
        .eq('supplement_id', supplementId)
        .eq('date', today)
        .eq('dose_index', doseIndex);
      // MB-8 Track B: si el write falla, revertir el optimista (el check
      // "destachado" que en DB sigue tachado era un fantasma silencioso).
      if (error) {
        logWarn('[supplements] toggle off failed:', error.message);
        setTodayLogs(prev => ({
          ...prev,
          [supplementId]: [...(prev[supplementId] ?? []), doseIndex],
        }));
        return;
      }
      // 312: el log se borro; la cantidad variable de esa toma se va con el.
      setTodayUnits(prev => {
        const { [doseIndex]: _quitada, ...resto } = prev[supplementId] ?? {};
        return { ...prev, [supplementId]: resto };
      });
    } else {
      const { error } = await supabase.from('supplement_logs').upsert({
        user_id: userId,
        supplement_id: supplementId,
        date: today,
        dose_index: doseIndex,
        taken: true,
      }, { onConflict: 'user_id,supplement_id,date,dose_index' });
      if (error) {
        logWarn('[supplements] toggle on failed:', error.message);
        setTodayLogs(prev => ({
          ...prev,
          [supplementId]: (prev[supplementId] ?? []).filter(i => i !== doseIndex),
        }));
        return;
      }
      // Economía (fire-and-forget; no-op si flag OFF). Key por suplemento/día
      // SIN dose_index → DECISIÓN multi-dosis: máximo 1 electrón por suplemento
      // al día (la 2ª/3ª toma no re-acredita; cap 8/día global se mantiene).
      fireElectronAward({
        habit_type: 'supplement_check', evidence_tier: 'self', local_date: today,
        idempotency_key: `supplement_check_${userId}_${today}_${supplementId}`,
        metadata: { supplement_id: supplementId, dose_index: doseIndex },
      });
    }
    DeviceEventEmitter.emit('electrons_changed');
  }

  /** 312 (10.3): abre la mini-hoja "cuantas tomaste" para una toma de hoy. */
  function openUnits(supp: any, doseIndex: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const actual = todayUnits[supp.id]?.[doseIndex] ?? numeroONull(supp.units_per_dose);
    setUnitsInput(actual !== null ? formatNumero(actual) : '');
    setUnitsTarget({ id: supp.id, name: supp.name, doseIndex, form: supp.form ?? null });
  }

  /**
   * 312 (10.3): registra la cantidad REAL de una toma de hoy sin tocar la
   * ficha ("hoy tome 2 en vez de 1"). Marca la toma como tomada si no lo
   * estaba (mismo electron que toggleDose: maximo 1 por suplemento y dia).
   */
  async function registrarUnidades() {
    if (!unitsTarget) return;
    const units = numeroONull(unitsInput);
    if (units === null || units <= 0) {
      Alert.alert('Cantidad inválida', 'Escribe cuántas unidades tomaste, por ejemplo 2.');
      return;
    }
    const { id: supplementId, doseIndex } = unitsTarget;
    const today = getLocalToday();
    const yaTomada = (todayLogs[supplementId] ?? []).includes(doseIndex);
    const { error } = await supabase.from('supplement_logs').upsert({
      user_id: userId,
      supplement_id: supplementId,
      date: today,
      dose_index: doseIndex,
      taken: true,
      units_taken: units,
    }, { onConflict: 'user_id,supplement_id,date,dose_index' });
    if (error) {
      logWarn('[supplements] units save failed:', error.message);
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      return;
    }
    setTodayUnits(prev => ({ ...prev, [supplementId]: { ...(prev[supplementId] ?? {}), [doseIndex]: units } }));
    if (!yaTomada) {
      setTodayLogs(prev => ({ ...prev, [supplementId]: [...(prev[supplementId] ?? []), doseIndex] }));
      fireElectronAward({
        habit_type: 'supplement_check', evidence_tier: 'self', local_date: today,
        idempotency_key: `supplement_check_${userId}_${today}_${supplementId}`,
        metadata: { supplement_id: supplementId, dose_index: doseIndex },
      });
      DeviceEventEmitter.emit('electrons_changed');
    }
    setUnitsTarget(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function toggleDoseTimeLabel(label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // MB-2 §4: orden cronológico mezclando etiquetas y horas custom (antes el
    // filtro por DOSE_TIME_LABELS descartaba cualquier HH:MM al seleccionar)
    setNewDoseTimes(prev => prev.includes(label)
      ? prev.filter(l => l !== label)
      : sortDoseTimes([...prev, label]));
  }

  /** MB-2 §4: agrega la hora custom validada (HH:MM) como toma. */
  function addCustomDoseTime() {
    const t = normalizeDoseTimeInput(customTimeInput);
    if (!t) {
      Alert.alert('Hora inválida', 'Usa formato de 24 horas, por ejemplo 08:30 o 21:15.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewDoseTimes(prev => prev.includes(t) ? prev : sortDoseTimes([...prev, t]));
    setCustomTimeInput('');
    setShowCustomTime(false);
  }

  function resetForm() {
    setNewName(''); setNewDosage(''); setNewBrand(''); setNewForm(null);
    setNewTiming('morning'); setNewReason(''); setNewPattern(DOSE_PATTERNS[0]); setNewDoseTimes([]);
    setShowCustomTime(false); setCustomTimeInput('');
    setNewIsPlan(true); setNewAmountPerUnit(''); setNewAmountUnit(null); setNewUnitsPerDose('');
    setEditingId(null);
  }

  // MB-2 §3: sugerencias del historial propio — match por nombre normalizado,
  // dedupe, excluye el match exacto (ya está escrito). Solo en alta nueva.
  const nameSuggestions = useMemo(() => {
    if (editingId) return [];
    const q = normalizeSupplementName(newName);
    if (q.length < 2) return [];
    const seen = new Set<string>();
    const out: any[] = [];
    for (const h of nameHistory) {
      const n = normalizeSupplementName(h.name);
      if (!n || n === q || !n.includes(q) || seen.has(n)) continue;
      seen.add(n);
      out.push(h);
      if (out.length >= 4) break;
    }
    return out;
  }, [editingId, newName, nameHistory]);

  /** Toca una sugerencia → prellena la ficha completa desde el historial. */
  function applySuggestion(h: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewName(h.name ?? '');
    setNewDosage(h.dosage ?? '');
    setNewBrand(h.brand ?? '');
    setNewForm(h.form ?? null);
    setNewTiming(h.timing ?? 'morning');
    setNewReason(h.reason ?? '');
    setNewPattern(h.dose_pattern ?? DOSE_PATTERNS[0]);
    setNewDoseTimes(Array.isArray(h.dose_times) ? h.dose_times : []);
    cargarDosisEnForm(h);
  }

  /** 312: plan/eventual y dosis por unidad de una ficha (o del historial) al form. */
  function cargarDosisEnForm(row: any) {
    setNewIsPlan(esPlan(row));
    const apu = numeroONull(row?.amount_per_unit);
    const upd = numeroONull(row?.units_per_dose);
    setNewAmountPerUnit(apu !== null ? formatNumero(apu) : '');
    setNewAmountUnit(row?.amount_unit ?? null);
    setNewUnitsPerDose(upd !== null ? formatNumero(upd) : '');
  }

  /** SUP-3: abre el mismo sheet en modo edición, prellenado desde la ficha. */
  function openEdit(supp: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(supp.id);
    setNewName(supp.name ?? '');
    setNewDosage(supp.dosage ?? '');
    setNewBrand(supp.brand ?? '');
    setNewForm(supp.form ?? null);
    setNewTiming(supp.timing ?? 'morning');
    setNewReason(supp.reason ?? '');
    setNewPattern(supp.dose_pattern ?? DOSE_PATTERNS[0]);
    setNewDoseTimes(Array.isArray(supp.dose_times) ? supp.dose_times : []);
    cargarDosisEnForm(supp);
    setShowAdd(true);
  }

  async function saveSupplement() {
    if (!newName.trim() || !newDosage.trim()) return;
    const amountPerUnitNum = numeroONull(newAmountPerUnit);
    const unitsPerDoseNum = numeroONull(newUnitsPerDose);
    if ((amountPerUnitNum !== null && amountPerUnitNum <= 0) || (unitsPerDoseNum !== null && unitsPerDoseNum <= 0)) {
      Alert.alert('Revisa la dosis', 'La cantidad por unidad y las unidades por toma deben ser mayores a cero, o quedar vacías.');
      return;
    }
    if (amountPerUnitNum !== null && !newAmountUnit) {
      Alert.alert('Falta la unidad', 'Elige mg, mcg, g, UI o ml para la cantidad por unidad.');
      return;
    }
    const payload = {
      name: newName.trim(),
      dosage: newDosage.trim(),
      brand: newBrand.trim() || null,        // ficha ampliada (187)
      form: newForm,                          // ficha ampliada (187)
      timing: newTiming,
      reason: newReason.trim() || null,
      dose_pattern: newPattern, // T4 (#54): patrón de toma (migración 167)
      // Multi-dosis (188): 2+ tomas persiste array (1 toma = legacy NULL).
      // MB-2 §4: una sola toma con hora custom TAMBIÉN persiste — la hora
      // elegida debe llegar a la agenda (si fuera NULL caería al default 08:00).
      dose_times: newDoseTimes.length >= 2 || newDoseTimes.some(isCustomDoseTime)
        ? newDoseTimes
        : null,
      // 312 (10.4): del plan o eventual.
      is_plan: newIsPlan,
      // 312 (10.1): dosis por unidad. Vacio o no numerico = null (raya), nunca 0.
      // La unidad solo viaja si hay cantidad: "mg" sin numero no dice nada.
      amount_per_unit: amountPerUnitNum,
      amount_unit: amountPerUnitNum !== null ? newAmountUnit : null,
      units_per_dose: unitsPerDoseNum,
    };
    // MB-8 Track B: alta/edición verificada — antes un 4xx cerraba el form
    // como si hubiera guardado (supabase-js no lanza).
    let { error } = editingId
      ? await supabase.from('user_supplements').update(payload).eq('id', editingId)
      : await supabase.from('user_supplements').insert({ user_id: userId, source: 'manual', ...payload });
    // 312: si este cliente corre ANTES del db push, PostgREST no conoce las
    // columnas nuevas (PGRST204 "Could not find the 'is_plan' column"). Antes
    // que dejar a la persona sin poder guardar su ficha, se reintenta UNA vez
    // sin los campos de 312 y se avisa al desarrollador.
    let sinCampos312 = false;
    if (error && /PGRST204|schema cache/i.test(error.message)) {
      logWarn('[supplements] save sin columnas 312 (db push pendiente):', error.message);
      const { is_plan: _p, amount_per_unit: _a, amount_unit: _u, units_per_dose: _d, ...legacy } = payload;
      ({ error } = editingId
        ? await supabase.from('user_supplements').update(legacy).eq('id', editingId)
        : await supabase.from('user_supplements').insert({ user_id: userId, source: 'manual', ...legacy }));
      sinCampos312 = !error;
    }
    if (error) {
      logWarn('[supplements] save failed:', error.message);
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      return;
    }
    resetForm();
    setShowAdd(false);
    loadSupplements();
    if (sinCampos312) {
      // M1 (4EP): lo tecleado en dosis y plan NO se guardo; se dice, no se
      // festeja.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Guardada sin dosis ni marca de plan', 'Actualiza la app y vuelve a editarla.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function openBhaScan(supp: { id: string; name: string; brand?: string | null } | null) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBhaTarget(supp);
    setBhaVisible(true);
  }

  async function removeSupplement(id: string, name: string) {
    Alert.alert('Eliminar suplemento', `¿Eliminar "${name}" de tu plan?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          // MB-8 Track B: baja verificada.
          const { error } = await supabase.from('user_supplements').update({ is_active: false }).eq('id', id);
          if (error) {
            logWarn('[supplements] remove failed:', error.message);
            Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
            return;
          }
          loadSupplements();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  // Agrupar por timing (#35: memoizado — cada toggle re-renderizaba y recalculaba)
  // 312 (10.4): dos secciones, MI PLAN y EVENTUALES, cada una agrupada por
  // momento del dia como siempre. Una ficha sin marca (anterior a 312) es plan.
  const sections = useMemo(() => {
    const plan = supplements.filter(esPlan);
    const eventuales = supplements.filter(s => !esPlan(s));
    return [
      { key: 'plan', label: 'MI PLAN', nota: 'Cuentan para tu adherencia', groups: agruparPorTiming(plan), count: plan.length },
      { key: 'eventual', label: 'EVENTUALES', nota: 'Se registran, no penalizan', groups: agruparPorTiming(eventuales), count: eventuales.length },
    ].filter(sec => sec.count > 0);
  }, [supplements]);

  // Multi-dosis (188): el progreso cuenta TOMAS, no suplementos (N tomas = N checks)
  // #35: memoizado junto con grouped. 312: HOY mide solo el plan; las
  // eventuales tomadas hoy se dicen aparte.
  const { totalCount, takenCount, completionPct, eventualesHoy } = useMemo(() => {
    const plan = supplements.filter(esPlan);
    const total = plan.reduce((acc, s) => acc + doseCountFor(s.dose_times), 0);
    const taken = plan.reduce(
      (acc, s) => acc + Math.min((todayLogs[s.id] ?? []).length, doseCountFor(s.dose_times)), 0);
    const ev = supplements.filter(s => !esPlan(s)).reduce(
      (acc, s) => acc + Math.min((todayLogs[s.id] ?? []).length, doseCountFor(s.dose_times)), 0);
    return { totalCount: total, takenCount: taken, completionPct: total > 0 ? Math.round((taken / total) * 100) : 0, eventualesHoy: ev };
  }, [supplements, todayLogs]);

  return (
    <ThemeReady>
    <ScrollView style={{ flex: 1, backgroundColor: t.fondo }} contentContainerStyle={{ paddingBottom: 40 + ORB_SAFE_BOTTOM }}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={t.texto} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tealTx, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
            <Text style={{ color: t.texto, fontSize: 22, fontWeight: '800' }}>SUPLEMENTOS</Text>
          </View>
          {/* Punto de entrada del scanner BHA en la sección (scan standalone:
              suplemento o comida empaquetada, sin persistir en ficha) */}
          {/* OLA3: escaneo de la ETIQUETA (formulación, formas, excipientes).
              Llegó de food-scan?mode=supplement y creaba fichas desde el pilar
              de comida; hoy entra por aquí, junto al scanner de score. */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setScanVisible(true); }}
            hitSlop={12}
            style={{ marginRight: 14 }}
          >
            <Ionicons name="camera-outline" size={24} color={t.textoSecundario} />
          </Pressable>
          <Pressable onPress={() => openBhaScan(null)} hitSlop={12} style={{ marginRight: 14 }}>
            <Ionicons name="scan-outline" size={24} color={kind === 'dark' ? '#4ade80' : t.tealTexto} />
          </Pressable>
          {/* 312 (10.5): historial de 30 dias y adherencia. */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/supplements/historial'); }}
            hitSlop={12}
            style={{ marginRight: 14 }}
          >
            <Ionicons name="time-outline" size={24} color={t.textoSecundario} />
          </Pressable>
          <Pressable onPress={() => setShowAdd(true)} hitSlop={12}>
            <Ionicons name="add-circle-outline" size={26} color={acento} />
          </Pressable>
        </View>
      </View>

      {/* Máscara EMBARAZO (4.1.4) — banner GRANDE si el dato real está activo */}
      {pregnancyActive && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: 'rgba(239,159,39,0.12)', borderRadius: 16, padding: 18,
            borderWidth: 1.5, borderColor: '#EF9F27', flexDirection: 'row', gap: 12, alignItems: 'center',
          }}>
            <Ionicons name="warning-outline" size={28} color="#EF9F27" />
            <Text style={{ color: kind === 'dark' ? '#EF9F27' : t.texto, fontSize: 14, fontWeight: '700', lineHeight: 20, flex: 1 }}>
              Estás en embarazo: revisa TODO con tu nutriólogo clínico antes de tomar cualquier suplemento.
            </Text>
          </View>
        </View>
      )}

      {/* Doctrina: registro, no recomendación (copy obligatorio del sprint) */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{
          backgroundColor: t.card, borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: t.borde,
        }}>
          <Text style={{ color: t.textoSecundario, fontSize: 11, lineHeight: 16 }}>
            Esto es tu registro. No es recomendación. Es responsabilidad de quien te lo indicó.
          </Text>
        </View>
      </View>

      {/* Progreso del día + adherencia semanal */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View style={{
          backgroundColor: 'rgba(29,158,117,0.08)', borderRadius: 16, padding: 18,
          borderWidth: 1, borderColor: 'rgba(29,158,117,0.15)',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>HOY</Text>
            <Text style={{ color: tealTx, fontSize: 14, fontWeight: '800' }}>
              {takenCount}/{totalCount}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: t.borde, borderRadius: 3 }}>
            <View style={{
              height: 6, backgroundColor: tealTx, borderRadius: 3,
              width: `${completionPct}%`,
            }} />
          </View>
          {/* T4: adherencia semanal contra dose_pattern */}
          {weeklyAdherence !== null && (
            <Text style={{ color: t.textoSecundario, fontSize: 11, marginTop: 8 }}>
              Adherencia esta semana: <Text style={{ color: weeklyAdherence >= 80 ? acento : (kind === 'dark' ? '#fbbf24' : t.texto), fontWeight: '700' }}>{weeklyAdherence}%</Text>
            </Text>
          )}
          {totalCount > 0 && takenCount === totalCount && (
            <Text style={{ color: tealTx, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>
              ✓ Todas las tomas de hoy registradas
            </Text>
          )}
          {eventualesHoy > 0 && (
            <Text style={{ color: t.textoSecundario, fontSize: 11, marginTop: 6 }}>
              {eventualesHoy === 1 ? '1 toma eventual registrada hoy' : `${eventualesHoy} tomas eventuales registradas hoy`}
            </Text>
          )}
        </View>
      </View>

      {/* B9 (4EP): senal de carga explicita mientras la consulta va y viene. */}
      {!cargado && (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="small" color={t.textoSecundario} />
          <Text style={{ color: t.textoSecundario, fontSize: 12, marginTop: 10 }}>Leyendo tus fichas</Text>
        </View>
      )}

      {/* D-2: el fallo de lectura NO se pinta como "todavia no tienes". */}
      {cargado && falloCarga && supplements.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 }}>
          <Ionicons name="cloud-offline-outline" size={48} color={t.textoSecundario} />
          <Text style={{ color: t.texto, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
            Tus fichas no se pudieron leer
          </Text>
          <Text style={{ color: t.textoSecundario, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>
            Siguen guardadas. Revisa tu conexión e intenta de nuevo.
          </Text>
          <Pressable
            onPress={reintentar}
            style={{ marginTop: 18, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999, borderWidth: 1, borderColor: t.bordeMarcado }}
          >
            <Text style={{ color: t.texto, fontSize: 13, fontWeight: '700' }}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {/* Estado vacío — biblioteca vacía por default (doctrina: el user crea sus fichas).
          Solo DESPUES de cargar y solo si no hubo fallo. */}
      {cargado && !falloCarga && supplements.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 }}>
          <Ionicons name="flask-outline" size={48} color={t.bordeMarcado} />
          <Text style={{ color: t.texto, fontSize: 18, fontWeight: '700', marginTop: 16 }}>Tu registro de suplementos</Text>
          <Text style={{ color: t.textoSecundario, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            Crea las fichas de los suplementos que ya tomas (indicados por tu profesional) para registrar tus tomas del día.
          </Text>
          <Pressable onPress={() => setShowAdd(true)} style={{
            backgroundColor: ATP_BRAND.lime, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20,
          }}>
            <Text style={{ color: ATP_BRAND.black, fontSize: 14, fontWeight: '800' }}>CREAR MI PRIMERA FICHA</Text>
          </Pressable>
        </View>
      )}

      {/* Suplementos: MI PLAN y EVENTUALES (312), cada uno agrupado por timing */}
      {sections.length > 0 && (
        <Text style={{ color: t.textoSecundario, fontSize: 11, paddingHorizontal: 20, marginBottom: 8 }}>
          Toca ✏️ para editar tomas y cantidades · desliza ← para eliminar
        </Text>
      )}
      {sections.map(sec => (
      <View key={sec.key}>
        <View style={{ paddingHorizontal: 20, marginBottom: 10, marginTop: 4, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ color: t.texto, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 }}>{sec.label}</Text>
          <Text style={{ color: t.textoSecundario, fontSize: 11 }}>{sec.nota}</Text>
        </View>
      {sec.groups.map(group => (
        <View key={group.id} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name={group.icon} size={16} color={group.color} />
            <Text style={{ color: kind === 'dark' ? group.color : t.textoSecundario, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
              {group.label.toUpperCase()}
            </Text>
          </View>

          {group.items.map(supp => {
            const doseCount = doseCountFor(supp.dose_times);
            const takenIdxs = todayLogs[supp.id] ?? [];
            const taken = takenIdxs.length >= doseCount; // fila completa = todas las tomas
            const doseLabels: string[] = Array.isArray(supp.dose_times) ? supp.dose_times : [];
            return (
              <SwipeToDeleteRow
                key={supp.id}
                onConfirmDelete={() => removeSupplement(supp.id, supp.name)}
              >
                <Pressable
                  onPress={() => toggleDose(supp.id, doseCount === 1 ? 0 : (
                    // Multi-dosis: tap en la fila marca la SIGUIENTE toma pendiente
                    // (o desmarca la última si ya están todas).
                    taken
                      ? takenIdxs[takenIdxs.length - 1]
                      : Array.from({ length: doseCount }, (_, i) => i).find(i => !takenIdxs.includes(i)) ?? 0
                  ))}
                  onLongPress={() => removeSupplement(supp.id, supp.name)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: taken ? 'rgba(29,158,117,0.08)' : t.hundido,
                    borderRadius: 14, padding: 14, marginBottom: 6,
                    borderWidth: 1,
                    borderColor: taken ? 'rgba(29,158,117,0.2)' : t.borde,
                  }}
                >
                  {taken ? (
                    <Ionicons name="checkmark-circle" size={26} color={tealTx} />
                  ) : (
                    <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.bordeMarcado, alignItems: 'center', justifyContent: 'center' }}>
                      {doseCount > 1 && takenIdxs.length > 0 && (
                        <Text style={{ color: tealTx, fontSize: 9, fontWeight: '800' }}>{takenIdxs.length}</Text>
                      )}
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{
                        color: taken ? tealTx : t.texto, fontSize: 14, fontWeight: '600',
                        textDecorationLine: taken ? 'line-through' : 'none',
                      }}>
                        {supp.name}
                      </Text>
                      {/* ATP Functional Score (211): chip numérico 0-100.
                          Scans legados (solo bha_status binario) muestran chip
                          neutro "Evaluado" hasta re-escanear — cero adjetivos.
                          MB-17: la etiqueta de nivel acompaña SIEMPRE al color. */}
                      {supp.functional_score != null ? (
                        <View style={{ backgroundColor: `${getScoreColor(supp.functional_score)}1F`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: getScoreColor(supp.functional_score), fontSize: 8, fontWeight: '800' }}>
                            SCORE {supp.functional_score} · {getScoreLabel(supp.functional_score)}
                          </Text>
                        </View>
                      ) : supp.bha_status ? (
                        <View style={{ backgroundColor: kind === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,21,24,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: t.textoSecundario, fontSize: 8, fontWeight: '800' }}>EVALUADO · RE-ESCANEA</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      <Text style={{ color: t.textoSecundario, fontSize: 11 }}>{supp.dosage}</Text>
                      {supp.brand && <Text style={{ color: t.textoSecundario, fontSize: 11 }}>· {supp.brand}</Text>}
                      {supp.form && <Text style={{ color: t.textoSecundario, fontSize: 11 }}>· {FORM_OPTIONS.find(f => f.id === supp.form)?.label ?? supp.form}</Text>}
                      {/* T4: patrón de toma visible (dosis flexible, 167) */}
                      {supp.dose_pattern && <Text style={{ color: tealTx, fontSize: 11 }}>· {supp.dose_pattern}</Text>}
                      {/* MB-2 §4: toma única con hora custom — visible en la fila
                          (con 2+ tomas ya salen los chips por dosis) */}
                      {doseCount === 1 && doseLabels[0] && isCustomDoseTime(doseLabels[0]) && (
                        <Text style={{ color: tealTx, fontSize: 11 }}>· {doseLabels[0]}</Text>
                      )}
                      {supp.reason && <Text style={{ color: t.textoSecundario, fontSize: 11 }}>· {supp.reason}</Text>}
                    </View>
                    {/* 312 (10.1 / 10.2): lo que la ficha sabe de la dosis. Sin dato no
                        se pinta 0: se pinta raya. Los activos vienen del escaneo. */}
                    {(numeroONull(supp.amount_per_unit) !== null || numeroONull(supp.units_per_dose) !== null) && (
                      <Text style={{ color: t.textoSecundario, fontSize: 11, marginTop: 2 }}>
                        {dosisPorUnidadTexto(supp)}
                        {doseCount === 1 && todayUnits[supp.id]?.[0] !== undefined
                          ? ` · hoy ${tomaTexto(supp, todayUnits[supp.id][0])}`
                          : ` · por toma ${tomaTexto(supp)}`}
                      </Text>
                    )}
                    {activosTexto(supp.scan_actives) && (
                      <Text style={{ color: t.textoSecundario, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                        Etiqueta{supp.scan_serving ? ` (${supp.scan_serving})` : ''}: {activosTexto(supp.scan_actives)}
                      </Text>
                    )}
                    {/* Multi-dosis (188): N tomas = N checks individuales */}
                    {doseCount > 1 && (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {Array.from({ length: doseCount }, (_, i) => {
                          const doseTaken = takenIdxs.includes(i);
                          return (
                            <Pressable
                              key={i}
                              onPress={() => toggleDose(supp.id, i)}
                              hitSlop={6}
                              style={{
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
                                backgroundColor: doseTaken ? 'rgba(29,158,117,0.15)' : t.card,
                                borderWidth: 1, borderColor: doseTaken ? tealTx : t.borde,
                              }}
                            >
                              <Ionicons
                                name={doseTaken ? 'checkmark-circle' : 'ellipse-outline'}
                                size={12}
                                color={doseTaken ? tealTx : t.textoTenue}
                              />
                              <Text style={{ color: doseTaken ? tealTx : t.textoSecundario, fontSize: 10, fontWeight: '600' }}>
                                {doseLabels[i] ?? `Toma ${i + 1}`}{todayUnits[supp.id]?.[i] !== undefined ? ` ×${formatNumero(todayUnits[supp.id][i])}` : ''}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                    {/* Resumen del ATP Functional Score en la ficha */}
                    {(supp.functional_score != null || supp.bha_status) && supp.bha_scan_summary && (
                      <Text style={{ color: t.textoSecundario, fontSize: 10, marginTop: 6, lineHeight: 14 }} numberOfLines={2}>
                        {String(supp.bha_scan_summary).split('\n')[0]}
                      </Text>
                    )}
                  </View>
                  {/* SUP-3: editar la ficha. P3.14: targets con padding propio y
                      hitSlop corto — los hitSlop 10 se traslapaban entre sí y con
                      el tap de la fila (marcar toma) → mis-taps en device. */}
                  {/* 312 (10.3): cantidad real de hoy sin tocar la ficha. Con varias
                      tomas, la hoja pregunta cual. */}
                  <Pressable
                    onPress={() => openUnits(supp, doseCount === 1 ? 0 : (takenIdxs.length > 0 ? takenIdxs[takenIdxs.length - 1] : 0))}
                    hitSlop={4}
                    style={{ paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, borderColor: t.borde, backgroundColor: t.card }}
                  >
                    <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '800' }}>
                      {doseCount === 1 && todayUnits[supp.id]?.[0] !== undefined ? `×${formatNumero(todayUnits[supp.id][0])}` : '×N'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => openEdit(supp)} hitSlop={4} style={{ padding: 8 }}>
                    <Ionicons name="pencil-outline" size={18} color={t.textoSecundario} />
                  </Pressable>
                  {/* CTA de escaneo ATP Functional Score (re-escanear si ya tiene score) */}
                  <Pressable
                    onPress={() => openBhaScan({ id: supp.id, name: supp.name, brand: supp.brand })}
                    hitSlop={4}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="scan-outline" size={20} color={supp.functional_score != null || supp.bha_status ? t.sinDatos : (kind === 'dark' ? '#4ade80' : t.tealTexto)} />
                  </Pressable>
                </Pressable>
              </SwipeToDeleteRow>
            );
          })}
        </View>
      ))}
      </View>
      ))}

      {supplements.length > 0 && (
        <Text style={{ color: t.textoSecundario, fontSize: 10, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
          Toca para marcar · ×N para registrar cuántas tomaste hoy · Desliza ← (o mantén presionado) para eliminar
        </Text>
      )}

      {/* ══════════════════════════════════════════
          MODAL — Agregar suplemento
      ══════════════════════════════════════════ */}
      {/* Triple-audit P1.3: el sheet era un overlay absolute INLINE dentro del
          ScrollView raíz — en web se posicionaba contra el contenido scrolleado
          (invisible) y Escape no cerraba. Modal lo saca del árbol del scroll y
          onRequestClose da Escape (web) + back (Android) gratis. */}
      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={() => { resetForm(); setShowAdd(false); }}
      >
        {/* Velo de modal (doctrina): oscuro 0.7 negro -> claro 0.35 tinta fría */}
        <View style={{ flex: 1, backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => { resetForm(); setShowAdd(false); }} />
          {/* SUP-2 (MB-2): KAV + ScrollView con tope de altura RELATIVO (el 620
              fijo excedía el viewport en pantallas chicas con teclado abierto). */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{
              backgroundColor: t.flotante, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 24,
              maxHeight: '88%',
            }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.bordeMarcado, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ color: t.texto, fontSize: 18, fontWeight: '800', marginBottom: 20 }}>
                {editingId ? 'Editar suplemento' : 'Agregar suplemento'}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Nombre</Text>
            <TextInput
              value={newName} onChangeText={setNewName}
              placeholder="Ej: Magnesio glicinato" placeholderTextColor={t.textoSecundario}
              style={{
                backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: nameSuggestions.length > 0 ? 8 : 14,
                borderWidth: 1, borderColor: t.borde,
              }}
            />
            {/* MB-2 §3: autocomplete del historial PROPIO (sin catálogo) —
                tocar prellena la ficha completa para re-agregar sin re-teclear */}
            {nameSuggestions.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {nameSuggestions.map((h, i) => (
                  <Pressable
                    key={`${h.name}-${i}`}
                    onPress={() => applySuggestion(h)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
                      backgroundColor: 'rgba(29,158,117,0.1)',
                      borderWidth: 1, borderColor: 'rgba(29,158,117,0.3)',
                    }}
                  >
                    <Ionicons name="time-outline" size={12} color={tealTx} />
                    <Text style={{ color: tealTx, fontSize: 12, fontWeight: '600' }}>{h.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* 312 (10.4): del plan o eventual. Pedido textual de Enrique: poder
                marcar cuales son del plan y cuales no. */}
            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>¿Es parte de tu plan?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              {[
                { v: true, label: 'Del plan' },
                { v: false, label: 'Eventual' },
              ].map(opt => {
                const sel = newIsPlan === opt.v;
                return (
                  <Pressable
                    key={String(opt.v)}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewIsPlan(opt.v); }}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 20,
                      backgroundColor: sel ? 'rgba(29,158,117,0.15)' : t.card,
                      borderWidth: 1.5, borderColor: sel ? tealTx : t.borde,
                    }}
                  >
                    <Text style={{ color: sel ? tealTx : t.textoSecundario, fontSize: 12, fontWeight: '700' }}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ color: t.textoSecundario, fontSize: 10, marginBottom: 14, lineHeight: 14 }}>
              {newIsPlan
                ? 'Del plan: cuenta en tu progreso del día y en la adherencia.'
                : 'Eventual: se registra cuando lo tomas, sin restar adherencia (ashwagandha bajo estrés, por ejemplo).'}
            </Text>

            {/* Sweep §4: "Dosis" → "Cantidad" (registro del usuario, no pauta de ATP) */}
            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Cantidad</Text>
            <TextInput
              value={newDosage} onChangeText={setNewDosage}
              placeholder="Ej: 400 mg" placeholderTextColor={t.textoSecundario}
              style={{
                backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 14, borderWidth: 1, borderColor: t.borde,
              }}
            />

            {/* Multi-dosis (188): 2+ etiquetas = N tomas/día con N checks.
                MB-2 §3: wrap (los chips horizontales se salían de pantalla).
                MB-2 §4: horas custom HH:MM además de las 4 etiquetas. */}
            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
              Tomas al día {newDoseTimes.length >= 2 ? `(${newDoseTimes.length} tomas)` : '(1 toma)'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: showCustomTime ? 8 : 14 }}>
              {DOSE_TIME_LABELS.map(label => {
                const sel = newDoseTimes.includes(label);
                return (
                  <Pressable
                    key={label}
                    onPress={() => toggleDoseTimeLabel(label)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                      backgroundColor: sel ? 'rgba(29,158,117,0.15)' : t.card,
                      borderWidth: 1.5, borderColor: sel ? tealTx : t.borde,
                    }}
                  >
                    <Text style={{ color: sel ? tealTx : t.textoSecundario, fontSize: 12, fontWeight: '600' }}>{label}</Text>
                  </Pressable>
                );
              })}
              {/* Horas custom ya agregadas — tocar quita la toma */}
              {newDoseTimes.filter(isCustomDoseTime).map(tLabel => (
                <Pressable
                  key={tLabel}
                  onPress={() => toggleDoseTimeLabel(tLabel)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: 'rgba(29,158,117,0.15)',
                    borderWidth: 1.5, borderColor: tealTx,
                  }}
                >
                  <Text style={{ color: tealTx, fontSize: 12, fontWeight: '600' }}>{tLabel}</Text>
                  <Ionicons name="close-circle" size={14} color={tealTx} />
                </Pressable>
              ))}
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCustomTime(v => !v); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                  backgroundColor: t.card, borderWidth: 1.5, borderStyle: 'dashed',
                  borderColor: showCustomTime ? ATP_BRAND.lime : t.bordeMarcado,
                }}
              >
                <Ionicons name="alarm-outline" size={14} color={showCustomTime ? acento : t.textoSecundario} />
                <Text style={{ color: showCustomTime ? acento : t.textoSecundario, fontSize: 12, fontWeight: '600' }}>+ hora</Text>
              </Pressable>
            </View>
            {showCustomTime && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <TextInput
                  value={customTimeInput}
                  onChangeText={setCustomTimeInput}
                  placeholder="08:30" placeholderTextColor={t.textoSecundario}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  autoFocus
                  onSubmitEditing={addCustomDoseTime}
                  style={{
                    flex: 1, backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                    padding: 12, borderWidth: 1, borderColor: t.borde,
                  }}
                />
                <Pressable
                  onPress={addCustomDoseTime}
                  style={{
                    backgroundColor: ATP_BRAND.lime, borderRadius: 12, paddingHorizontal: 18,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: ATP_BRAND.black, fontSize: 13, fontWeight: '800' }}>AGREGAR</Text>
                </Pressable>
              </View>
            )}

            {/* T4 (#54): patrón de toma — la adherencia se mide contra esto */}
            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Frecuencia</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {DOSE_PATTERNS.map(p => (
                <Pressable
                  key={p}
                  onPress={() => setNewPattern(p)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: newPattern === p ? 'rgba(168,224,42,0.15)' : t.card,
                    borderWidth: 1.5, borderColor: newPattern === p ? ATP_BRAND.lime : t.borde,
                  }}
                >
                  <Text style={{ color: newPattern === p ? acento : t.textoSecundario, fontSize: 12, fontWeight: '600' }}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>¿Cuándo tomarlo?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {TIMING_OPTIONS.map(opt => (
                <Pressable
                  key={opt.id}
                  onPress={() => setNewTiming(opt.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: newTiming === opt.id ? `${opt.color}20` : t.card,
                    borderWidth: 1.5,
                    borderColor: newTiming === opt.id ? opt.color : t.borde,
                  }}
                >
                  <Ionicons name={opt.icon} size={14} color={newTiming === opt.id ? opt.color : t.textoSecundario} />
                  <Text style={{ color: newTiming === opt.id ? conceptTx(opt.color) : t.textoSecundario, fontSize: 12, fontWeight: '600' }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Ficha ampliada (187): presentación */}
            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Forma</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {FORM_OPTIONS.map(f => (
                <Pressable
                  key={f.id}
                  onPress={() => setNewForm(newForm === f.id ? null : f.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: newForm === f.id ? 'rgba(168,224,42,0.15)' : t.card,
                    borderWidth: 1.5, borderColor: newForm === f.id ? ATP_BRAND.lime : t.borde,
                  }}
                >
                  <Text style={{ color: newForm === f.id ? acento : t.textoSecundario, fontSize: 12, fontWeight: '600' }}>{f.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* 312 (10.1): dosis por unidad. Registro de lo que dice la etiqueta o
                lo que la persona sabe; ATP no propone cantidades. Vacio = raya. */}
            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
              Por {unidadLabel(newForm, 1)} (opcional)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <TextInput
                value={newAmountPerUnit} onChangeText={setNewAmountPerUnit}
                placeholder="Ej: 400" placeholderTextColor={t.textoSecundario}
                keyboardType="decimal-pad"
                style={{
                  flex: 1, backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                  padding: 14, borderWidth: 1, borderColor: t.borde,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {AMOUNT_UNITS.map(u => {
                  const sel = newAmountUnit === u;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setNewAmountUnit(sel ? null : u)}
                      style={{
                        paddingHorizontal: 9, paddingVertical: 9, borderRadius: 14,
                        backgroundColor: sel ? 'rgba(168,224,42,0.15)' : t.card,
                        borderWidth: 1.5, borderColor: sel ? ATP_BRAND.lime : t.borde,
                      }}
                    >
                      <Text style={{ color: sel ? acento : t.textoSecundario, fontSize: 11, fontWeight: '700' }}>{u}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
              {`${unidadLabel(newForm, 2).charAt(0).toUpperCase()}${unidadLabel(newForm, 2).slice(1)} por toma (opcional)`}
            </Text>
            <TextInput
              value={newUnitsPerDose} onChangeText={setNewUnitsPerDose}
              placeholder="Ej: 2" placeholderTextColor={t.textoSecundario}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 6, borderWidth: 1, borderColor: t.borde,
              }}
            />
            <Text style={{ color: t.textoSecundario, fontSize: 10, marginBottom: 14 }}>
              Cada toma: {tomaTexto({
                form: newForm,
                amount_per_unit: numeroONull(newAmountPerUnit),
                amount_unit: newAmountUnit,
                units_per_dose: numeroONull(newUnitsPerDose),
              })}
            </Text>

            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Marca (opcional)</Text>
            <TextInput
              value={newBrand} onChangeText={setNewBrand}
              placeholder="Ej: Thorne, NOW Foods" placeholderTextColor={t.textoSecundario}
              style={{
                backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 14, borderWidth: 1, borderColor: t.borde,
              }}
            />

            <Text style={{ color: t.textoSecundario, fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Razón (opcional)</Text>
            <TextInput
              value={newReason} onChangeText={setNewReason}
              placeholder="Ej: Déficit de GABA" placeholderTextColor={t.textoSecundario}
              style={{
                backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 20, borderWidth: 1, borderColor: t.borde,
              }}
            />

            <Pressable
              onPress={saveSupplement}
              disabled={!newName.trim() || !newDosage.trim()}
              style={{
                backgroundColor: newName.trim() && newDosage.trim() ? ATP_BRAND.lime : t.bordeMarcado,
                borderRadius: 16, padding: 16, alignItems: 'center',
              }}
            >
              <Text style={{
                color: newName.trim() && newDosage.trim() ? ATP_BRAND.black : t.textoSecundario,
                fontSize: 16, fontWeight: '800',
              }}>
                {editingId ? 'GUARDAR CAMBIOS' : 'AGREGAR'}
              </Text>
            </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* 312 (10.3): mini-hoja "cuantas tomaste hoy". Registra la toma real
          en supplement_logs.units_taken sin tocar la ficha. */}
      <Modal
        visible={unitsTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitsTarget(null)}
      >
        <View style={{ flex: 1, backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)', justifyContent: 'center', paddingHorizontal: 28 }}>
          <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={() => setUnitsTarget(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ backgroundColor: t.flotante, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: t.borde }}>
              <Text style={{ color: t.texto, fontSize: 16, fontWeight: '800' }}>¿Cuántas tomaste hoy?</Text>
              <Text style={{ color: t.textoSecundario, fontSize: 12, marginTop: 4, marginBottom: 14 }}>
                {unitsTarget?.name ?? ''}{unitsTarget && doseCountFor(supplements.find(x => x.id === unitsTarget.id)?.dose_times) > 1
                  ? ` · ${(supplements.find(x => x.id === unitsTarget.id)?.dose_times ?? [])[unitsTarget.doseIndex] ?? `Toma ${unitsTarget.doseIndex + 1}`}`
                  : ''}. Solo cambia el registro de hoy, no la ficha.
              </Text>
              {unitsTarget && doseCountFor(supplements.find(x => x.id === unitsTarget.id)?.dose_times) > 1 && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {(supplements.find(x => x.id === unitsTarget.id)?.dose_times ?? []).map((lbl: string, i: number) => {
                    const sel = unitsTarget.doseIndex === i;
                    return (
                      <Pressable
                        key={`${lbl}-${i}`}
                        onPress={() => setUnitsTarget(prev => (prev ? { ...prev, doseIndex: i } : prev))}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
                          backgroundColor: sel ? 'rgba(29,158,117,0.15)' : t.card,
                          borderWidth: 1, borderColor: sel ? tealTx : t.borde,
                        }}
                      >
                        <Text style={{ color: sel ? tealTx : t.textoSecundario, fontSize: 11, fontWeight: '600' }}>{lbl}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {['1', '2', '3'].map(n => (
                  <Pressable
                    key={n}
                    onPress={() => setUnitsInput(n)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
                      backgroundColor: unitsInput === n ? 'rgba(29,158,117,0.15)' : t.card,
                      borderWidth: 1.5, borderColor: unitsInput === n ? tealTx : t.borde,
                    }}
                  >
                    <Text style={{ color: unitsInput === n ? tealTx : t.textoSecundario, fontSize: 13, fontWeight: '700' }}>{n}</Text>
                  </Pressable>
                ))}
                <TextInput
                  value={unitsInput}
                  onChangeText={setUnitsInput}
                  placeholder="Otra" placeholderTextColor={t.textoSecundario}
                  keyboardType="decimal-pad"
                  maxLength={6}
                  onSubmitEditing={registrarUnidades}
                  style={{
                    flex: 1, backgroundColor: t.card, color: t.texto, fontSize: 15, borderRadius: 12,
                    padding: 10, borderWidth: 1, borderColor: t.borde,
                  }}
                />
              </View>
              <Text style={{ color: t.textoSecundario, fontSize: 10, marginTop: 8 }}>
                {unitsTarget ? `${numeroONull(unitsInput) !== null ? formatNumero(unitsInput) : SIN_DATO} ${unidadLabel(unitsTarget.form, numeroONull(unitsInput) ?? 2)} · ${tomaTexto(supplements.find(x => x.id === unitsTarget.id), numeroONull(unitsInput))}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable onPress={() => setUnitsTarget(null)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: t.bordeMarcado }}>
                  <Text style={{ color: t.texto, fontSize: 13, fontWeight: '700' }}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={registrarUnidades} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: ATP_BRAND.lime }}>
                  <Text style={{ color: ATP_BRAND.black, fontSize: 13, fontWeight: '800' }}>GUARDAR</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Scanner ATP Functional Score (Compliance S4; antes sello BHA) */}
      <BhaScanSheet
        visible={bhaVisible}
        userId={userId}
        supplement={bhaTarget}
        onClose={() => setBhaVisible(false)}
        onSealPersisted={loadSupplements}
      />
      {/* OLA3: hoja de captura del escaneo de suplemento (analyzeSupplementPhoto,
          10 contextos, dedupe por nombre, sin score persistido — compliance S4) */}
      <SupplementScanSheet
        visible={scanVisible}
        userId={userId}
        onClose={() => setScanVisible(false)}
        onPlanChanged={loadSupplements}
      />
      <MedicalDisclaimer feature="supplements" />
    </ScrollView>
    </ThemeReady>
  );
}
