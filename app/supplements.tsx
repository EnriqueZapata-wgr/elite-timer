/**
 * Suplementos — REGISTRO personal con tracking, agrupado por momento del día.
 *
 * Doctrina (Sprint SUPS+BHA): suplementos son REGISTRO, no recomendación.
 * ATP nunca sugiere suplementos — el usuario crea sus fichas desde cero
 * (biblioteca vacía por default; el catálogo curado y las recomendaciones
 * Braverman se degradaron en este sprint). Sello BHA por ficha vía scanner.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, DeviceEventEmitter, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { isPregnancyActive } from '@/src/services/supplements-service';
import { BhaScanSheet } from '@/src/components/supplements/BhaScanSheet';
import { getScoreColor } from '@/src/constants/brand';

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

export default function SupplementsScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [supplements, setSupplements] = useState<any[]>([]);
  // Multi-dosis (188): por suplemento, los dose_index tomados hoy.
  const [todayLogs, setTodayLogs] = useState<Record<string, number[]>>({});
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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
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
    const [suppsRes, logsRes, historyRes] = await Promise.all([
      supabase.from('user_supplements').select('*')
        .eq('user_id', userId).eq('is_active', true).order('timing'),
      supabase.from('supplement_logs').select('supplement_id, date, taken, dose_index')
        .eq('user_id', userId).gte('date', weekAgo),
      // MB-2 §3: historial propio (incl. inactivos) para el autocomplete del alta
      supabase.from('user_supplements')
        .select('name, dosage, brand, form, timing, reason, dose_pattern, dose_times, created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);
    // MB-8 Track B: supabase no lanza en 4xx — un error aquí se veía como
    // "plan vacío / 0% adherencia" sin señal alguna.
    if (suppsRes.error) logWarn('[supplements] fichas load failed:', suppsRes.error.message);
    if (logsRes.error) logWarn('[supplements] logs load failed:', logsRes.error.message);
    if (historyRes.error) logWarn('[supplements] history load failed:', historyRes.error.message);
    const supps = (suppsRes.data ?? []) as any[];
    const logs = (logsRes.data ?? []) as any[];
    setSupplements(supps);
    setNameHistory((historyRes.data ?? []) as any[]);
    const tl: Record<string, number[]> = {};
    logs.forEach((l) => {
      if (!l.taken || l.date !== today) return;
      const idx = Number.isFinite(Number(l.dose_index)) ? Number(l.dose_index) : 0;
      (tl[l.supplement_id] ??= []).push(idx);
    });
    setTodayLogs(tl);
    // MB-2: adherencia por TOMA (Σ tomadas / Σ esperadas del patrón × tomas/día)
    const doseCounts = Object.fromEntries(supps.map((s) => [s.id, doseCountFor(s.dose_times)]));
    const takenDoses = takenDosesBySupplement(logs, doseCounts);
    setWeeklyAdherence(weeklyAdherencePct(
      supps.map((s) => ({
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
    setShowAdd(true);
  }

  async function saveSupplement() {
    if (!newName.trim() || !newDosage.trim()) return;
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
    };
    // MB-8 Track B: alta/edición verificada — antes un 4xx cerraba el form
    // como si hubiera guardado (supabase-js no lanza).
    const { error } = editingId
      ? await supabase.from('user_supplements').update(payload).eq('id', editingId)
      : await supabase.from('user_supplements').insert({ user_id: userId, source: 'manual', ...payload });
    if (error) {
      logWarn('[supplements] save failed:', error.message);
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      return;
    }
    resetForm();
    setShowAdd(false);
    loadSupplements();
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
  const grouped = useMemo(() => TIMING_OPTIONS.map(t => ({
    ...t,
    items: supplements.filter(s => s.timing === t.id),
  })).filter(g => g.items.length > 0), [supplements]);

  // Multi-dosis (188): el progreso cuenta TOMAS, no suplementos (N tomas = N checks)
  // #35: memoizado junto con grouped.
  const { totalCount, takenCount, completionPct } = useMemo(() => {
    const total = supplements.reduce((acc, s) => acc + doseCountFor(s.dose_times), 0);
    const taken = supplements.reduce(
      (acc, s) => acc + Math.min((todayLogs[s.id] ?? []).length, doseCountFor(s.dose_times)), 0);
    return { totalCount: total, takenCount: taken, completionPct: total > 0 ? Math.round((taken / total) * 100) : 0 };
  }, [supplements, todayLogs]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#1D9E75', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>SUPLEMENTOS</Text>
          </View>
          {/* Punto de entrada del scanner BHA en la sección (scan standalone:
              suplemento o comida empaquetada, sin persistir en ficha) */}
          <Pressable onPress={() => openBhaScan(null)} hitSlop={12} style={{ marginRight: 14 }}>
            <Ionicons name="scan-outline" size={24} color="#4ade80" />
          </Pressable>
          <Pressable onPress={() => setShowAdd(true)} hitSlop={12}>
            <Ionicons name="add-circle-outline" size={26} color="#a8e02a" />
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
            <Text style={{ color: '#EF9F27', fontSize: 14, fontWeight: '700', lineHeight: 20, flex: 1 }}>
              Estás en embarazo: revisa TODO con tu nutriólogo clínico antes de tomar cualquier suplemento.
            </Text>
          </View>
        </View>
      )}

      {/* Doctrina: registro, no recomendación (copy obligatorio del sprint) */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{
          backgroundColor: '#121212', borderRadius: 12, padding: 12,
          borderWidth: 1, borderColor: '#1F1F1F',
        }}>
          <Text style={{ color: '#888', fontSize: 11, lineHeight: 16 }}>
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
            <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>HOY</Text>
            <Text style={{ color: '#1D9E75', fontSize: 14, fontWeight: '800' }}>
              {takenCount}/{totalCount}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#1a1a1a', borderRadius: 3 }}>
            <View style={{
              height: 6, backgroundColor: '#1D9E75', borderRadius: 3,
              width: `${completionPct}%`,
            }} />
          </View>
          {/* T4: adherencia semanal contra dose_pattern */}
          {weeklyAdherence !== null && (
            <Text style={{ color: '#999', fontSize: 11, marginTop: 8 }}>
              Adherencia esta semana: <Text style={{ color: weeklyAdherence >= 80 ? '#a8e02a' : '#fbbf24', fontWeight: '700' }}>{weeklyAdherence}%</Text>
            </Text>
          )}
          {totalCount > 0 && takenCount === totalCount && (
            <Text style={{ color: '#1D9E75', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>
              ✓ Todas las tomas de hoy registradas
            </Text>
          )}
        </View>
      </View>

      {/* Estado vacío — biblioteca vacía por default (doctrina: el user crea sus fichas) */}
      {supplements.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 }}>
          <Ionicons name="flask-outline" size={48} color="#333" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>Tu registro de suplementos</Text>
          <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            Crea las fichas de los suplementos que ya tomas (indicados por tu profesional) para registrar tus tomas del día.
          </Text>
          <Pressable onPress={() => setShowAdd(true)} style={{
            backgroundColor: '#a8e02a', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20,
          }}>
            <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>CREAR MI PRIMERA FICHA</Text>
          </Pressable>
        </View>
      )}

      {/* Suplementos agrupados por timing */}
      {grouped.length > 0 && (
        <Text style={{ color: '#666', fontSize: 11, paddingHorizontal: 20, marginBottom: 8 }}>
          Toca ✏️ para editar tomas y cantidades · desliza ← para eliminar
        </Text>
      )}
      {grouped.map(group => (
        <View key={group.id} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name={group.icon} size={16} color={group.color} />
            <Text style={{ color: group.color, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
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
                    backgroundColor: taken ? 'rgba(29,158,117,0.08)' : '#0a0a0a',
                    borderRadius: 14, padding: 14, marginBottom: 6,
                    borderWidth: 1,
                    borderColor: taken ? 'rgba(29,158,117,0.2)' : '#1a1a1a',
                  }}
                >
                  {taken ? (
                    <Ionicons name="checkmark-circle" size={26} color="#1D9E75" />
                  ) : (
                    <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                      {doseCount > 1 && takenIdxs.length > 0 && (
                        <Text style={{ color: '#1D9E75', fontSize: 9, fontWeight: '800' }}>{takenIdxs.length}</Text>
                      )}
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{
                        color: taken ? '#1D9E75' : '#fff', fontSize: 14, fontWeight: '600',
                        textDecorationLine: taken ? 'line-through' : 'none',
                      }}>
                        {supp.name}
                      </Text>
                      {/* ATP Functional Score (211): chip numérico 0-100.
                          Scans legados (solo bha_status binario) muestran chip
                          neutro "Evaluado" hasta re-escanear — cero adjetivos. */}
                      {supp.functional_score != null ? (
                        <View style={{ backgroundColor: `${getScoreColor(supp.functional_score)}1F`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: getScoreColor(supp.functional_score), fontSize: 8, fontWeight: '800' }}>
                            SCORE {supp.functional_score}
                          </Text>
                        </View>
                      ) : supp.bha_status ? (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#999', fontSize: 8, fontWeight: '800' }}>EVALUADO · RE-ESCANEA</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      <Text style={{ color: '#666', fontSize: 11 }}>{supp.dosage}</Text>
                      {supp.brand && <Text style={{ color: '#666', fontSize: 11 }}>· {supp.brand}</Text>}
                      {supp.form && <Text style={{ color: '#666', fontSize: 11 }}>· {FORM_OPTIONS.find(f => f.id === supp.form)?.label ?? supp.form}</Text>}
                      {/* T4: patrón de toma visible (dosis flexible, 167) */}
                      {supp.dose_pattern && <Text style={{ color: '#1D9E75', fontSize: 11 }}>· {supp.dose_pattern}</Text>}
                      {/* MB-2 §4: toma única con hora custom — visible en la fila
                          (con 2+ tomas ya salen los chips por dosis) */}
                      {doseCount === 1 && doseLabels[0] && isCustomDoseTime(doseLabels[0]) && (
                        <Text style={{ color: '#1D9E75', fontSize: 11 }}>· {doseLabels[0]}</Text>
                      )}
                      {supp.reason && <Text style={{ color: '#444', fontSize: 11 }}>· {supp.reason}</Text>}
                    </View>
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
                                backgroundColor: doseTaken ? 'rgba(29,158,117,0.15)' : '#111',
                                borderWidth: 1, borderColor: doseTaken ? '#1D9E75' : '#222',
                              }}
                            >
                              <Ionicons
                                name={doseTaken ? 'checkmark-circle' : 'ellipse-outline'}
                                size={12}
                                color={doseTaken ? '#1D9E75' : '#555'}
                              />
                              <Text style={{ color: doseTaken ? '#1D9E75' : '#777', fontSize: 10, fontWeight: '600' }}>
                                {doseLabels[i] ?? `Toma ${i + 1}`}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                    {/* Resumen del ATP Functional Score en la ficha */}
                    {(supp.functional_score != null || supp.bha_status) && supp.bha_scan_summary && (
                      <Text style={{ color: '#555', fontSize: 10, marginTop: 6, lineHeight: 14 }} numberOfLines={2}>
                        {String(supp.bha_scan_summary).split('\n')[0]}
                      </Text>
                    )}
                  </View>
                  {/* SUP-3: editar la ficha. P3.14: targets con padding propio y
                      hitSlop corto — los hitSlop 10 se traslapaban entre sí y con
                      el tap de la fila (marcar toma) → mis-taps en device. */}
                  <Pressable onPress={() => openEdit(supp)} hitSlop={4} style={{ padding: 8 }}>
                    <Ionicons name="pencil-outline" size={18} color="#666" />
                  </Pressable>
                  {/* CTA de escaneo ATP Functional Score (re-escanear si ya tiene score) */}
                  <Pressable
                    onPress={() => openBhaScan({ id: supp.id, name: supp.name, brand: supp.brand })}
                    hitSlop={4}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="scan-outline" size={20} color={supp.functional_score != null || supp.bha_status ? '#444' : '#4ade80'} />
                  </Pressable>
                </Pressable>
              </SwipeToDeleteRow>
            );
          })}
        </View>
      ))}

      {supplements.length > 0 && (
        <Text style={{ color: '#444', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
          Toca para marcar · Desliza ← (o mantén presionado) para eliminar · Escanea la etiqueta para tu ATP Functional Score
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => { resetForm(); setShowAdd(false); }} />
          {/* SUP-2 (MB-2): KAV + ScrollView con tope de altura RELATIVO (el 620
              fijo excedía el viewport en pantallas chicas con teclado abierto). */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{
              backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 24,
              maxHeight: '88%',
            }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20 }}>
                {editingId ? 'Editar suplemento' : 'Agregar suplemento'}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Nombre</Text>
            <TextInput
              value={newName} onChangeText={setNewName}
              placeholder="Ej: Magnesio glicinato" placeholderTextColor="#444"
              style={{
                backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: nameSuggestions.length > 0 ? 8 : 14,
                borderWidth: 1, borderColor: '#1a1a1a',
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
                    <Ionicons name="time-outline" size={12} color="#1D9E75" />
                    <Text style={{ color: '#1D9E75', fontSize: 12, fontWeight: '600' }}>{h.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Sweep §4: "Dosis" → "Cantidad" (registro del usuario, no pauta de ATP) */}
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Cantidad</Text>
            <TextInput
              value={newDosage} onChangeText={setNewDosage}
              placeholder="Ej: 400 mg" placeholderTextColor="#444"
              style={{
                backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1a1a1a',
              }}
            />

            {/* Multi-dosis (188): 2+ etiquetas = N tomas/día con N checks.
                MB-2 §3: wrap (los chips horizontales se salían de pantalla).
                MB-2 §4: horas custom HH:MM además de las 4 etiquetas. */}
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
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
                      backgroundColor: sel ? 'rgba(29,158,117,0.15)' : '#111',
                      borderWidth: 1.5, borderColor: sel ? '#1D9E75' : '#1a1a1a',
                    }}
                  >
                    <Text style={{ color: sel ? '#1D9E75' : '#999', fontSize: 12, fontWeight: '600' }}>{label}</Text>
                  </Pressable>
                );
              })}
              {/* Horas custom ya agregadas — tocar quita la toma */}
              {newDoseTimes.filter(isCustomDoseTime).map(t => (
                <Pressable
                  key={t}
                  onPress={() => toggleDoseTimeLabel(t)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: 'rgba(29,158,117,0.15)',
                    borderWidth: 1.5, borderColor: '#1D9E75',
                  }}
                >
                  <Text style={{ color: '#1D9E75', fontSize: 12, fontWeight: '600' }}>{t}</Text>
                  <Ionicons name="close-circle" size={14} color="#1D9E75" />
                </Pressable>
              ))}
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCustomTime(v => !v); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                  backgroundColor: '#111', borderWidth: 1.5, borderStyle: 'dashed',
                  borderColor: showCustomTime ? '#a8e02a' : '#333',
                }}
              >
                <Ionicons name="alarm-outline" size={14} color={showCustomTime ? '#a8e02a' : '#999'} />
                <Text style={{ color: showCustomTime ? '#a8e02a' : '#999', fontSize: 12, fontWeight: '600' }}>+ hora</Text>
              </Pressable>
            </View>
            {showCustomTime && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <TextInput
                  value={customTimeInput}
                  onChangeText={setCustomTimeInput}
                  placeholder="08:30" placeholderTextColor="#444"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  autoFocus
                  onSubmitEditing={addCustomDoseTime}
                  style={{
                    flex: 1, backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                    padding: 12, borderWidth: 1, borderColor: '#1a1a1a',
                  }}
                />
                <Pressable
                  onPress={addCustomDoseTime}
                  style={{
                    backgroundColor: '#a8e02a', borderRadius: 12, paddingHorizontal: 18,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>AGREGAR</Text>
                </Pressable>
              </View>
            )}

            {/* T4 (#54): patrón de toma — la adherencia se mide contra esto */}
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Frecuencia</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {DOSE_PATTERNS.map(p => (
                <Pressable
                  key={p}
                  onPress={() => setNewPattern(p)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: newPattern === p ? 'rgba(168,224,42,0.15)' : '#111',
                    borderWidth: 1.5, borderColor: newPattern === p ? '#a8e02a' : '#1a1a1a',
                  }}
                >
                  <Text style={{ color: newPattern === p ? '#a8e02a' : '#999', fontSize: 12, fontWeight: '600' }}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>¿Cuándo tomarlo?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {TIMING_OPTIONS.map(t => (
                <Pressable
                  key={t.id}
                  onPress={() => setNewTiming(t.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: newTiming === t.id ? `${t.color}20` : '#111',
                    borderWidth: 1.5,
                    borderColor: newTiming === t.id ? t.color : '#1a1a1a',
                  }}
                >
                  <Ionicons name={t.icon} size={14} color={newTiming === t.id ? t.color : '#666'} />
                  <Text style={{ color: newTiming === t.id ? t.color : '#999', fontSize: 12, fontWeight: '600' }}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Ficha ampliada (187): presentación */}
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Forma</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {FORM_OPTIONS.map(f => (
                <Pressable
                  key={f.id}
                  onPress={() => setNewForm(newForm === f.id ? null : f.id)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: newForm === f.id ? 'rgba(168,224,42,0.15)' : '#111',
                    borderWidth: 1.5, borderColor: newForm === f.id ? '#a8e02a' : '#1a1a1a',
                  }}
                >
                  <Text style={{ color: newForm === f.id ? '#a8e02a' : '#999', fontSize: 12, fontWeight: '600' }}>{f.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Marca (opcional)</Text>
            <TextInput
              value={newBrand} onChangeText={setNewBrand}
              placeholder="Ej: Thorne, NOW Foods" placeholderTextColor="#444"
              style={{
                backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1a1a1a',
              }}
            />

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Razón (opcional)</Text>
            <TextInput
              value={newReason} onChangeText={setNewReason}
              placeholder="Ej: Déficit de GABA" placeholderTextColor="#444"
              style={{
                backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#1a1a1a',
              }}
            />

            <Pressable
              onPress={saveSupplement}
              disabled={!newName.trim() || !newDosage.trim()}
              style={{
                backgroundColor: newName.trim() && newDosage.trim() ? '#a8e02a' : '#333',
                borderRadius: 16, padding: 16, alignItems: 'center',
              }}
            >
              <Text style={{
                color: newName.trim() && newDosage.trim() ? '#000' : '#666',
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
      {/* Scanner ATP Functional Score (Compliance S4; antes sello BHA) */}
      <BhaScanSheet
        visible={bhaVisible}
        userId={userId}
        supplement={bhaTarget}
        onClose={() => setBhaVisible(false)}
        onSealPersisted={loadSupplements}
      />
      <MedicalDisclaimer feature="supplements" />
    </ScrollView>
  );
}
