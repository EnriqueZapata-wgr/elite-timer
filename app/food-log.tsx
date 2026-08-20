/**
 * /food-log — la captura unificada (OLA3 · Anexo D §1).
 *
 * Un solo eje distinguía a food-text, food-scan y food-barcode: el SENSOR.
 * Todo lo demás ya era común, así que aquí vive una sola vez:
 *
 *  - Barra de tipo de comida PERSISTENTE (no un paso previo), preseleccionada
 *    con getCurrentMeal ?? defaultMealTypeByHour (la lógica buena que estaba
 *    escondida en food-register).
 *  - Selector de sensor: cambiar de sensor NO desmonta el tipo ni la hora.
 *  - Hora editable HH:MM, que era exclusiva del registro por texto y hoy la
 *    comparten los tres sensores.
 *  - Zona "de un toque" siempre visible: frecuentes del tipo seleccionado +
 *    registros de hoy con swipe-to-delete (lo mejor de food-register, que
 *    vivía en una ruta a la que el hub ni entraba).
 *  - Editor de horarios de comida, con sync a DB y timezone real.
 *
 * Ruta: /food-log?sensor=foto|texto|codigo&mealType=?&intent=comida|etiqueta
 *
 * Reglas duras (candados de food-log-service.test.ts): se escribe SOLO vía
 * saveFoodLog; `source` sigue distinguiendo el sensor real; wasEdited real;
 * updateFrequentFood y maybeGeneratePostMealInsight tras guardar.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text, Pressable, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { saveFoodLog, deleteFoodLogChecked } from '@/src/services/food-log-service';
import { warn as logWarn } from '@/src/lib/logger';
import { useAuth } from '@/src/contexts/auth-context';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import {
  DEFAULT_MEAL_TIMES, getMealTimes, setMealTimes, getCurrentMeal,
  MEAL_IDS, type MealId, type MealTimes,
} from '@/src/services/meal-times-service';
import { defaultMealTypeByHour } from '@/src/services/meal-times-core';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { maybeGeneratePostMealInsight } from '@/src/services/argos-nutrition-insights';
import { TextSensor } from '@/src/components/nutrition/foodlog/TextSensor';
import { PhotoSensor } from '@/src/components/nutrition/foodlog/PhotoSensor';
import { BarcodeSensor } from '@/src/components/nutrition/foodlog/BarcodeSensor';
import type { CaptureIntent, SensorId } from '@/src/components/nutrition/foodlog/types';

const BLUE = CATEGORY_COLORS.nutrition;

/** Los 5 de la ventana horaria + los 2 de entrenamiento que traía el escaneo. */
const MEAL_TYPES = [
  { id: 'breakfast', name: 'Desayuno' },
  { id: 'snack_am', name: 'Snack AM' },
  { id: 'lunch', name: 'Comida' },
  { id: 'snack_pm', name: 'Snack PM' },
  { id: 'dinner', name: 'Cena' },
  { id: 'pre_workout', name: 'Pre' },
  { id: 'post_workout', name: 'Post' },
];

const SENSORES: { id: SensorId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'foto', label: 'Foto', icon: 'camera-outline' },
  { id: 'texto', label: 'Texto', icon: 'create-outline' },
  { id: 'codigo', label: 'Código', icon: 'barcode-outline' },
];

function esSensor(v: unknown): v is SensorId {
  return v === 'foto' || v === 'texto' || v === 'codigo';
}

function horaActual(): { hh: string; mm: string } {
  const now = new Date();
  return {
    hh: now.getHours().toString().padStart(2, '0'),
    mm: now.getMinutes().toString().padStart(2, '0'),
  };
}

export default function FoodLogScreen() {
  const params = useLocalSearchParams<{ sensor?: string; mealType?: string; intent?: string }>();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const { kind, tokens: t } = useAppTheme();
  // El lima como TEXTO no pasa el contraste en claro (regla 1 de la guía).
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const { mode: nutritionMode } = useNutritionMode();

  // El sensor por defecto es TEXTO: el más barato y el que no pide permisos.
  const [sensor, setSensor] = useState<SensorId>(esSensor(params.sensor) ? params.sensor : 'texto');
  // ¿El sensor actual se eligió tocando su chip? Al montar NO: el sensor
  // inicial viene del parámetro de la ruta. Solo el gesto abre la cámara.
  const [sensorPorGesto, setSensorPorGesto] = useState(false);
  // Barrido B (20-ago-2026): el parámetro también manda con la pantalla YA
  // montada (ARGOS o un deep link tibio piden otro sensor). El initializer de
  // useState solo corre al montar; sin esto, pedir la ruta con otro parámetro
  // desde la misma pantalla no hacía nada. Solo valores válidos: un parámetro
  // inválido no tumba lo que el usuario ya eligió. Pedir el MISMO valor dos
  // veces seguidas no re-fuerza nada: el efecto solo corre cuando cambia.
  // Y aquí el cambio NO es gesto: la cámara no se abre sola (mismo criterio
  // que el montaje).
  useEffect(() => {
    if (esSensor(params.sensor)) {
      setSensor(params.sensor);
      setSensorPorGesto(false);
    }
  }, [params.sensor]);
  const intent: CaptureIntent = params.intent === 'etiqueta' ? 'etiqueta' : 'comida';

  // Tipo de comida: el param manda; si no, la ventana del usuario; si no, el reloj.
  const [mealType, setMealType] = useState<string>(params.mealType || defaultMealTypeByHour());
  const [tipoResuelto, setTipoResuelto] = useState(false);

  const inicial = horaActual();
  const [timeHH, setTimeHH] = useState(inicial.hh);
  const [timeMM, setTimeMM] = useState(inicial.mm);
  const mealTime = `${timeHH.padStart(2, '0')}:${timeMM.padStart(2, '0')}`;

  // El panel toma la pantalla: se esconde el chrome de la carcasa.
  const [takeover, setTakeover] = useState(false);

  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [frequents, setFrequents] = useState<any[]>([]);
  const [justLogged, setJustLogged] = useState<string | null>(null);

  // Horarios de comida configurables + sync DB + timezone real.
  const [mealTimes, setMealTimesState] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [timezone, setTimezone] = useState<string>('America/Mexico_City');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<MealTimes>(DEFAULT_MEAL_TIMES);

  const cargarLogs = useCallback(async () => {
    if (!user?.id) return;
    const today = getLocalToday();
    const { data, error } = await supabase.from('food_logs')
      .select('id, meal_type, description, calories, protein_g')
      .eq('user_id', user.id).eq('date', today)
      .order('meal_time', { ascending: true });
    // MB-8 Track B (G7): un 400 no es "día sin registros".
    if (error) logWarn('[food-log] today logs failed:', error.message);
    else setTodayLogs(data ?? []);
  }, [user?.id]);

  const cargarFrecuentes = useCallback(async (tipo: string) => {
    if (!user?.id) return;
    const { data, error } = await supabase.from('user_frequent_foods').select('*')
      .eq('user_id', user.id).eq('meal_type', tipo)
      .order('times_used', { ascending: false }).limit(6);
    if (!error) setFrequents(data ?? []);
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    void cargarLogs();
    getMealTimes(user.id).then(({ mealTimes: mt, timezone: tz }) => {
      setMealTimesState(mt); setTimezone(tz);
      // La lógica buena que estaba enterrada en food-register: la ventana del
      // usuario primero, el reloj como respaldo. Solo la primera vez: si ya
      // tocaste un tipo, mandas tú.
      if (!tipoResuelto && !params.mealType) {
        const adivinado = getCurrentMeal(mt, tz) ?? defaultMealTypeByHour();
        setMealType(adivinado);
        void cargarFrecuentes(adivinado);
      }
      setTipoResuelto(true);
    });
  }, [user?.id, tipoResuelto, params.mealType, cargarLogs, cargarFrecuentes]));

  // Los frecuentes siguen al tipo seleccionado: corregir el tipo cambia la lista.
  useFocusEffect(useCallback(() => { void cargarFrecuentes(mealType); }, [mealType, cargarFrecuentes]));

  const onSaved = useCallback(() => {
    void cargarLogs();
    void cargarFrecuentes(mealType);
  }, [cargarLogs, cargarFrecuentes, mealType]);

  // Registro a un toque desde frecuentes: mismo camino de guardado que los
  // tres sensores (saveFoodLog → food_logs; ninguna ruta paralela).
  async function addFrequentQuick(food: any) {
    if (!user?.id) return;
    haptic.medium();
    const result = await saveFoodLog({
      userId: user.id,
      date: getLocalToday(),
      mealTime,
      mealType: food.meal_type,
      description: food.food_name,
      source: 'frequent',
      calories: food.calories,
      proteinG: food.protein_g,
      carbsG: food.carbs_g,
      fatG: food.fat_g,
      extras: { items: food.items },
    });
    if (!result.ok) {
      Alert.alert('Error al registrar', 'Intenta de nuevo.');
      return;
    }
    // times_used (best-effort, con log si falla)
    const { error: freqErr } = await supabase.from('user_frequent_foods')
      .update({ times_used: (food.times_used || 0) + 1, last_used_at: new Date().toISOString() })
      .eq('id', food.id);
    if (freqErr) logWarn('[food-log] times_used update failed:', freqErr.message);

    analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'frequent', meal_type: food.meal_type });
    void maybeGeneratePostMealInsight(user.id, food.food_name);
    haptic.success();
    // Sin Alert que tapar: el check inline y la lista que se refresca SON la
    // confirmación (un toque = registrado, cero diálogos).
    setJustLogged(food.id);
    setTimeout(() => setJustLogged(null), 2000);
    onSaved();
  }

  async function handleDeleteLog(logId: string, desc: string) {
    haptic.heavy();
    Alert.alert('Eliminar registro', `¿Eliminar "${desc}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          // MB-8 Track B (G2): borrado verificado — 0 filas o error ≠ éxito.
          const del = await deleteFoodLogChecked(logId);
          if (!del.ok) {
            Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
            return;
          }
          haptic.success();
          void cargarLogs();
        },
      },
    ]);
  }

  function openEditor() {
    haptic.light();
    setEditDraft(mealTimes);
    setEditorOpen(true);
  }

  async function guardarHorarios() {
    if (!user?.id) { setEditorOpen(false); return; }
    haptic.medium();
    await setMealTimes(user.id, editDraft, timezone);
    setMealTimesState(editDraft);
    setEditorOpen(false);
  }

  const updateDraft = (id: MealId, field: 'start' | 'end', v: string) =>
    setEditDraft((p) => ({ ...p, [id]: { ...p[id], [field]: v } }));

  const panelProps = {
    mealType,
    mealTime,
    intent,
    onTakeover: setTakeover,
    onSaved,
    porGesto: sensorPorGesto,
  };

  const oculto = takeover ? s.oculto : undefined;

  return (
    <Screen keyboard themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <View style={oculto}>
        <PillarHeader pillar="nutrition" title={intent === 'etiqueta' ? 'Leer etiqueta' : 'Registrar'} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ Barra de tipo de comida — persistente, no un paso previo ═══ */}
        <View style={oculto}>
          {intent !== 'etiqueta' && (
            <>
              <View style={s.barraTitulo}>
                <SectionTitle>TIPO DE COMIDA</SectionTitle>
                <Pressable onPress={openEditor} hitSlop={8} style={s.editTimesBtn}>
                  <Ionicons name="time-outline" size={14} color={acento} />
                  <EliteText style={[s.editTimesText, { color: acento }]}>Horarios</EliteText>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {MEAL_TYPES.map((m) => {
                  const activo = mealType === m.id;
                  return (
                    <AnimatedPressable
                      key={m.id}
                      scaleDown={0.94}
                      onPress={() => { haptic.light(); setMealType(m.id); }}
                      style={[
                        s.chip,
                        { backgroundColor: t.card, borderColor: t.borde },
                        activo && { backgroundColor: BLUE + '18', borderColor: BLUE + '50' },
                      ]}
                    >
                      <EliteText style={{
                        fontSize: FontSizes.md,
                        fontFamily: activo ? Fonts.bold : Fonts.regular,
                        color: activo ? BLUE : t.textoSecundario,
                      }}>
                        {m.name}
                      </EliteText>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>

              {/* Hora del registro — deja de ser exclusiva del sensor texto. */}
              <View style={s.horaRow}>
                <EliteText style={[s.horaLabel, { color: t.textoSecundario }]}>Hora</EliteText>
                <TextInput
                  style={[s.timeInput, { backgroundColor: t.card, borderColor: t.bordeMarcado, color: t.texto }]}
                  value={timeHH}
                  onChangeText={(v) => {
                    const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                    const num = parseInt(clean, 10);
                    if (clean === '' || (num >= 0 && num <= 23)) setTimeHH(clean);
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <EliteText style={[s.timeSeparator, { color: t.textoSecundario }]}>:</EliteText>
                <TextInput
                  style={[s.timeInput, { backgroundColor: t.card, borderColor: t.bordeMarcado, color: t.texto }]}
                  value={timeMM}
                  onChangeText={(v) => {
                    const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                    const num = parseInt(clean, 10);
                    if (clean === '' || (num >= 0 && num <= 59)) setTimeMM(clean);
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
              </View>
            </>
          )}

          {/* ═══ Selector de sensor ═══ */}
          <View style={s.sensorRow}>
            {SENSORES.map((sen) => {
              const activo = sensor === sen.id;
              return (
                <AnimatedPressable
                  key={sen.id}
                  scaleDown={0.95}
                  onPress={() => { haptic.light(); setSensorPorGesto(true); setSensor(sen.id); }}
                  style={[
                    s.sensorBtn,
                    { backgroundColor: t.card, borderColor: t.borde },
                    activo && { backgroundColor: BLUE + '18', borderColor: BLUE + '55' },
                  ]}
                >
                  <Ionicons name={sen.icon} size={18} color={activo ? BLUE : t.textoSecundario} />
                  <EliteText style={{
                    fontSize: FontSizes.sm,
                    fontFamily: activo ? Fonts.bold : Fonts.regular,
                    color: activo ? BLUE : t.textoSecundario,
                  }}>
                    {sen.label}
                  </EliteText>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* ═══ El sensor activo ═══ */}
        {sensor === 'texto' && <TextSensor key="texto" {...panelProps} />}
        {sensor === 'foto' && <PhotoSensor key="foto" {...panelProps} />}
        {sensor === 'codigo' && <BarcodeSensor key="codigo" {...panelProps} />}

        {/* ═══ Zona "de un toque" ═══ */}
        <View style={oculto}>
          {frequents.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <SectionTitle>
                {`FRECUENTES · ${(MEAL_TYPES.find(m => m.id === mealType)?.name ?? '').toUpperCase()}`}
              </SectionTitle>
              {frequents.map((food: any, idx: number) => (
                <Animated.View key={food.id} entering={FadeInUp.delay(60 + idx * 40).springify()}>
                  <AnimatedPressable onPress={() => addFrequentQuick(food)} style={[s.frequentCard, { backgroundColor: t.hundido }]}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[s.frequentName, { color: t.texto }]} numberOfLines={1}>{food.food_name}</EliteText>
                      <Text style={[s.frequentMeta, { color: t.textoSecundario }]}>
                        {/* P1: en SIMPLE la proteína es el único número. */}
                        {nutritionMode === 'complete' && food.calories ? `${Math.round(food.calories)} kcal · ` : ''}
                        {food.protein_g ? `${Math.round(food.protein_g)}g prot` : ''}
                        {food.times_used > 1 ? ` · ${food.times_used}x` : ''}
                      </Text>
                    </View>
                    <Ionicons
                      name={justLogged === food.id ? 'checkmark-circle' : 'add-circle-outline'}
                      size={22}
                      color={ATP_BRAND.lime}
                    />
                  </AnimatedPressable>
                </Animated.View>
              ))}
            </View>
          )}

          {todayLogs.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <SectionTitle>REGISTROS DE HOY</SectionTitle>
              {todayLogs.map((log: any) => (
                <SwipeToDeleteRow
                  key={log.id}
                  onConfirmDelete={() => handleDeleteLog(log.id, log.description || 'este alimento')}
                >
                  <Pressable onLongPress={() => handleDeleteLog(log.id, log.description || 'este alimento')}>
                    <View style={[s.logRow, { borderBottomColor: t.borde }]}>
                      <Ionicons name="checkmark-circle" size={16} color={ATP_BRAND.lime} />
                      <View style={{ flex: 1 }}>
                        <EliteText style={[s.logDesc, { color: t.texto }]} numberOfLines={1}>{log.description}</EliteText>
                      </View>
                      <EliteText style={[s.logKcal, { color: t.textoSecundario }]}>
                        {nutritionMode === 'complete' && log.calories ? `${log.calories} kcal · ` : ''}
                        {log.protein_g ? `${log.protein_g}g prot` : ''}
                      </EliteText>
                    </View>
                  </Pressable>
                </SwipeToDeleteRow>
              ))}
              <Text style={{ color: t.sinDatos, fontSize: 9, textAlign: 'center', marginTop: 6 }}>
                Desliza ← para eliminar
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Editor de horarios de comida — sync DB + timezone real. */}
      <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
        <Pressable style={[s.modalBackdrop, { backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)' }]} onPress={() => setEditorOpen(false)}>
          <Pressable style={[s.modalCard, { backgroundColor: t.flotante, borderColor: t.borde }]} onPress={() => {}}>
            <EliteText style={[s.modalTitle, { color: t.texto }]}>Tus horarios de comida</EliteText>
            <EliteText style={[s.modalHint, { color: t.textoSecundario }]}>Formato 24h (HH:MM). Se sincronizan en todos tus dispositivos.</EliteText>
            {MEAL_IDS.map((id) => {
              const meal = MEAL_TYPES.find((m) => m.id === id);
              return (
                <View key={id} style={s.editRow}>
                  <EliteText style={[s.editLabel, { color: t.texto }]}>{meal?.name ?? id}</EliteText>
                  <View style={s.editTimes}>
                    <TextInput
                      style={[s.editInput, { backgroundColor: t.hundido, color: t.texto, borderColor: t.borde }]}
                      value={editDraft[id].start}
                      onChangeText={(v) => updateDraft(id, 'start', v)}
                      placeholder={DEFAULT_MEAL_TIMES[id].start}
                      placeholderTextColor={t.textoTenue}
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                    <EliteText style={[s.editDash, { color: t.textoSecundario }]}>–</EliteText>
                    <TextInput
                      style={[s.editInput, { backgroundColor: t.hundido, color: t.texto, borderColor: t.borde }]}
                      value={editDraft[id].end}
                      onChangeText={(v) => updateDraft(id, 'end', v)}
                      placeholder={DEFAULT_MEAL_TIMES[id].end}
                      placeholderTextColor={t.textoTenue}
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              );
            })}
            <View style={s.modalBtns}>
              <Pressable onPress={() => setEditorOpen(false)} style={s.modalCancel}>
                <EliteText style={[s.modalCancelText, { color: t.textoSecundario }]}>Cancelar</EliteText>
              </Pressable>
              <Pressable onPress={guardarHorarios} style={s.modalSave}>
                <EliteText style={[s.modalSaveText, { color: t.textoSobreLima }]}>Guardar</EliteText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  oculto: { display: 'none' },

  barraTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editTimesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(168,224,42,0.3)',
  },
  editTimesText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.card, borderWidth: 1,
  },

  horaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  horaLabel: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, marginRight: Spacing.xs },
  timeInput: {
    width: 52, height: 40, borderRadius: Radius.sm, borderWidth: 1,
    fontFamily: Fonts.bold, fontSize: FontSizes.lg, textAlign: 'center',
  },
  timeSeparator: { fontFamily: Fonts.bold, fontSize: FontSizes.lg },

  sensorRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.md },
  sensorBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1,
  },

  // Editor de horarios (modal)
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  modalCard: { borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1 },
  modalTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold },
  modalHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 4, marginBottom: Spacing.md },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.sm },
  editLabel: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, flex: 1 },
  editTimes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editDash: { fontFamily: Fonts.semiBold },
  editInput: {
    width: 64, textAlign: 'center', borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 8, fontFamily: Fonts.semiBold,
    borderWidth: 1,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontFamily: Fonts.semiBold },
  modalSave: { backgroundColor: '#a8e02a', borderRadius: Radius.sm, paddingVertical: 10, paddingHorizontal: 20 },
  modalSaveText: { fontFamily: Fonts.bold },

  // Log rows
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  logDesc: { fontSize: FontSizes.sm, fontFamily: Fonts.regular },
  logKcal: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  // Frecuentes
  frequentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  frequentName: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  frequentMeta: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
});
