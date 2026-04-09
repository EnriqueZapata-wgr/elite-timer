/**
 * Nutrición — Dashboard diario de alimentación, hidratación, ayuno e insights.
 * Carga datos directamente desde Supabase sin service intermedio.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, TextInput, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { NutritionGapsCard } from '@/src/components/nutrition/NutritionGapsCard';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC, withOpacity, BG, PILLAR_GRADIENTS } from '@/src/constants/brand';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { GradientCard } from '@/src/components/ui/GradientCard';

const BLUE = CATEGORY_COLORS.nutrition;

// ═══ Sub-componentes ═══

function FoodLogCard({ log }: { log: any }) {
  const scoreColor = !log.quality_score ? TEXT_COLORS.muted : log.quality_score >= 75 ? SEMANTIC.success : log.quality_score >= 50 ? SEMANTIC.warning : SEMANTIC.error;
  const timeStr = log.meal_time ? new Date('2000-01-01T' + log.meal_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <View style={s.foodCard}>
      <View style={[s.foodThumb, { backgroundColor: SURFACES.cardLight }]}>
        <Ionicons name="restaurant-outline" size={20} color={TEXT_COLORS.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>{timeStr}</EliteText>
        <EliteText style={{ color: TEXT_COLORS.primary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold }} numberOfLines={1}>{log.description || 'Comida'}</EliteText>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
          {log.calories ? <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>{log.calories} kcal</EliteText> : null}
          {log.protein_g ? <EliteText variant="caption" style={{ color: BLUE, fontSize: FontSizes.xs }}>P: {log.protein_g}g</EliteText> : null}
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <EliteText style={{ fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: scoreColor }}>{log.quality_score || '—'}</EliteText>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: scoreColor, marginTop: 2 }} />
      </View>
    </View>
  );
}

function FastingZone({ hours, label, reached }: { hours: number; label: string; reached: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={reached ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={reached ? SEMANTIC.success : TEXT_COLORS.muted} />
      <EliteText variant="caption" style={{ color: reached ? SEMANTIC.success : TEXT_COLORS.muted, fontSize: FontSizes.xs }}>
        {hours}h — {label}
      </EliteText>
    </View>
  );
}

function generateInsights(foods: any[], waterMl: number, waterTarget: number) {
  const totalProt = foods.reduce((sum, f) => sum + (f.protein_g || 0), 0);
  const avgScore = foods.length > 0 ? Math.round(foods.reduce((sum, f) => sum + (f.quality_score || 0), 0) / foods.length) : 0;

  let p: string | null = null;
  let a: string | null = null;

  if (totalProt >= 100) p = `Llevas ${totalProt}g de proteína. Excelente para recuperación y composición corporal.`;
  else if (avgScore >= 70) p = `Tu puntuación promedio es ${avgScore}. ¡Vas en la dirección correcta!`;

  if (waterMl < waterTarget * 0.4 && new Date().getHours() > 14) a = 'Tu hidratación está baja. Beber agua mejora energía y digestión.';
  else if (foods.length > 0 && avgScore < 50) a = 'Tu puntuación es baja. Prioriza proteína y vegetales en tu próxima comida.';
  else if (totalProt < 50 && new Date().getHours() > 16) a = `Solo ${totalProt}g de proteína y ya pasó la tarde. Necesitas más.`;

  return { positive: p, alert: a };
}

// ═══ Pantalla principal ═══

export default function NutritionScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [waterTarget] = useState(2500);
  const [isFasting, setIsFasting] = useState(false);
  const [fastingStart, setFastingStart] = useState<Date | null>(null);
  const [fastingHours, setFastingHours] = useState(0);
  const [fastingMins, setFastingMins] = useState(0);
  const [fastingTarget] = useState(16);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  // ── Ayuno: modales y estado extendido ──
  const [showFastStartModal, setShowFastStartModal] = useState(false);
  const [showFastStopModal, setShowFastStopModal] = useState(false);
  const [fastManualHH, setFastManualHH] = useState('');
  const [fastManualMM, setFastManualMM] = useState('');
  const [fastTargetSelection, setFastTargetSelection] = useState(16);
  const [completedFast, setCompletedFast] = useState<{ duration: string; start: string; end: string } | null>(null);

  // ── Carga de datos ──
  const loadData = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    const today = new Date().toISOString().split('T')[0];
    try {
      const [foodRes, waterRes, fastRes, recipeRes] = await Promise.all([
        supabase.from('food_logs').select('*').eq('user_id', user.id).eq('date', today).order('meal_time', { ascending: true }),
        supabase.from('hydration_logs').select('total_ml').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('fasting_logs').select('*').eq('user_id', user.id).eq('status', 'active').order('fast_start', { ascending: false }).limit(1),
        supabase.from('recipes').select('*').limit(6),
      ]);

      // Comidas
      const foods = foodRes.data ?? [];
      setFoodLogs(foods);

      // Macros totales
      const cals = foods.reduce((sum: number, f: any) => sum + (f.calories || 0), 0);
      const prot = foods.reduce((sum: number, f: any) => sum + (f.protein_g || 0), 0);
      const carb = foods.reduce((sum: number, f: any) => sum + (f.carbs_g || 0), 0);
      const fat = foods.reduce((sum: number, f: any) => sum + (f.fat_g || 0), 0);
      setMacros({ calories: cals, protein: prot, carbs: carb, fat: fat });

      // Score promedio
      const scored = foods.filter((f: any) => f.quality_score != null);
      if (scored.length > 0) {
        setDailyScore(Math.round(scored.reduce((sum: number, f: any) => sum + f.quality_score, 0) / scored.length));
      } else {
        setDailyScore(null);
      }

      // Hidratacion (un solo log por dia con total_ml acumulado)
      setWaterMl((waterRes.data as { total_ml?: number } | null)?.total_ml ?? 0);

      // Ayuno activo
      const activeFast = fastRes.data?.[0] ?? null;
      if (activeFast) {
        setIsFasting(true);
        setFastingStart(new Date(activeFast.fast_start));
        const elapsed = (Date.now() - new Date(activeFast.fast_start).getTime()) / 1000;
        setFastingHours(Math.floor(elapsed / 3600));
        setFastingMins(Math.floor((elapsed % 3600) / 60));
      } else {
        setIsFasting(false);
        setFastingStart(null);
        setFastingHours(0);
        setFastingMins(0);
      }

      // Ayuno completado hoy (para mostrar resumen)
      const { data: completedData } = await supabase
        .from('fasting_logs')
        .select('fast_start, fast_end')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('fast_start', today + 'T00:00:00')
        .order('fast_end', { ascending: false })
        .limit(1);
      if (completedData?.[0]) {
        const s = new Date(completedData[0].fast_start);
        const e = new Date(completedData[0].fast_end);
        const diffMs = e.getTime() - s.getTime();
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const fmt = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        setCompletedFast({ duration: `${h}h ${m}m`, start: fmt(s), end: fmt(e) });
      } else if (!activeFast) {
        setCompletedFast(null);
      }

      // Recetas
      setRecipes(recipeRes.data ?? []);
    } catch { /* silencioso */ }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Timer del ayuno (cada 60s) ──
  useEffect(() => {
    if (!isFasting || !fastingStart) return;
    const tick = () => {
      const elapsed = (Date.now() - fastingStart.getTime()) / 1000;
      setFastingHours(Math.floor(elapsed / 3600));
      setFastingMins(Math.floor((elapsed % 3600) / 60));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [isFasting, fastingStart]);

  // ── Agregar agua ──
  // El esquema de hydration_logs usa total_ml + entries[] con UNIQUE(user_id, date),
  // asi que hacemos upsert leyendo el log de hoy primero.
  const addWater = async (ml: number) => {
    if (!user?.id) return;
    haptic.light();
    setWaterMl(prev => prev + ml); // actualizacion optimista
    const dateStr = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    try {
      // 1) Leer el log existente del dia (si hay)
      const { data: existing } = await supabase
        .from('hydration_logs')
        .select('id, total_ml, entries')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      const prevEntries = (existing?.entries as Array<{ time: string; amount_ml: number }>) ?? [];
      const newEntries = [...prevEntries, { time: nowTime, amount_ml: ml }];
      const newTotal = (existing?.total_ml ?? 0) + ml;

      if (existing?.id) {
        await supabase
          .from('hydration_logs')
          .update({ total_ml: newTotal, entries: newEntries, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('hydration_logs')
          .insert({ user_id: user.id, date: dateStr, total_ml: newTotal, entries: newEntries });
      }
    } catch (err) {
      if (__DEV__) console.error('addWater error:', err);
      setWaterMl(prev => prev - ml); // rollback
    }
  };

  // ── Abrir modal de ayuno ──
  const handleFastingPress = () => {
    haptic.medium();
    const now = new Date();
    setFastManualHH(String(now.getHours()).padStart(2, '0'));
    setFastManualMM(String(now.getMinutes()).padStart(2, '0'));
    if (isFasting) {
      setShowFastStopModal(true);
    } else {
      setFastTargetSelection(16);
      setShowFastStartModal(true);
    }
  };

  // ── Iniciar ayuno (ahora o a otra hora) ──
  // Esquema fasting_logs: fast_start, fast_end, target_hours, status, UNIQUE(user_id, date)
  const startFasting = async (useCustomTime: boolean) => {
    if (!user?.id) return;
    let startTime: Date;
    if (useCustomTime) {
      const hh = Math.min(23, Math.max(0, parseInt(fastManualHH) || 0));
      const mm = Math.min(59, Math.max(0, parseInt(fastManualMM) || 0));
      startTime = new Date();
      startTime.setHours(hh, mm, 0, 0);
    } else {
      startTime = new Date();
    }
    const dateStr = startTime.toISOString().split('T')[0];
    try {
      await supabase.from('fasting_logs').upsert({
        user_id: user.id,
        date: dateStr,
        fast_start: startTime.toISOString(),
        target_hours: fastTargetSelection,
        status: 'active',
      }, { onConflict: 'user_id,date' });
    } catch (err) {
      if (__DEV__) console.error('startFasting error:', err);
      return;
    }
    setIsFasting(true);
    setFastingStart(startTime);
    setFastingHours(0);
    setFastingMins(0);
    setShowFastStartModal(false);
  };

  // ── Detener ayuno (ahora o a otra hora) ──
  const stopFasting = async (useCustomTime: boolean) => {
    if (!user?.id) return;
    let endTime: Date;
    if (useCustomTime) {
      const hh = Math.min(23, Math.max(0, parseInt(fastManualHH) || 0));
      const mm = Math.min(59, Math.max(0, parseInt(fastManualMM) || 0));
      endTime = new Date();
      endTime.setHours(hh, mm, 0, 0);
    } else {
      endTime = new Date();
    }
    try {
      const { data } = await supabase
        .from('fasting_logs')
        .select('id, fast_start')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('fast_start', { ascending: false })
        .limit(1);
      if (data?.[0]) {
        const s = new Date(data[0].fast_start);
        const diffMs = endTime.getTime() - s.getTime();
        const actualHours = Math.round((diffMs / 3600000) * 10) / 10;
        await supabase
          .from('fasting_logs')
          .update({
            fast_end: endTime.toISOString(),
            actual_hours: actualHours,
            status: 'completed',
          })
          .eq('id', data[0].id);

        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const fmt = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        setCompletedFast({ duration: `${h}h ${m}m`, start: fmt(s), end: fmt(endTime) });
      }
    } catch (err) {
      if (__DEV__) console.error('stopFasting error:', err);
    }
    setIsFasting(false);
    setFastingStart(null);
    setFastingHours(0);
    setFastingMins(0);
    setShowFastStopModal(false);
  };

  // ── Derivados ──
  const waterPct = Math.min(100, Math.round((waterMl / waterTarget) * 100));
  const fastPct = Math.min(100, Math.round(((fastingHours + fastingMins / 60) / fastingTarget) * 100));
  const scoreColor = dailyScore == null ? TEXT_COLORS.muted : dailyScore >= 75 ? SEMANTIC.success : dailyScore >= 50 ? SEMANTIC.warning : SEMANTIC.error;
  const insights = generateInsights(foodLogs, waterMl, waterTarget);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ padding: Spacing.md, paddingTop: Spacing.xl, gap: Spacing.sm }}>
          <SkeletonLoader variant="card" height={140} />
          <SkeletonLoader variant="card" height={80} />
          <SkeletonLoader variant="card" height={80} />
          <SkeletonLoader variant="card" height={48} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <PillarHeader pillar="nutrition" title="Nutrición" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {/* ══ 1. Hero — Score + macros ══ */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={PILLAR_GRADIENTS.nutrition} padding={20} style={s.heroCardWrap}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
              <EliteText style={[s.scoreNumber, { color: scoreColor }]}>{dailyScore ?? '—'}</EliteText>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>SCORE DEL DÍA</EliteText>
            </View>
            <View style={s.macroRow}>
              <View style={s.macroItem}>
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>{macros.calories}</EliteText>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>kcal</EliteText>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <EliteText style={{ color: BLUE, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>{macros.protein}g</EliteText>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>Proteína</EliteText>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>{macros.carbs}g</EliteText>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>Carbs</EliteText>
              </View>
              <View style={s.macroDivider} />
              <View style={s.macroItem}>
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>{macros.fat}g</EliteText>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>Grasa</EliteText>
              </View>
            </View>
          </GradientCard>
        </Animated.View>

        {/* ══ 2. Hidratación ══ */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="water-outline" size={18} color={BLUE} />
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>Hidratación</EliteText>
              </View>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>
                {(waterMl / 1000).toFixed(1)} / {(waterTarget / 1000).toFixed(1)}L
              </EliteText>
            </View>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${waterPct}%`, backgroundColor: BLUE }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <AnimatedPressable onPress={() => addWater(250)} style={s.waterBtn}>
                <EliteText style={{ color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>+250ml</EliteText>
              </AnimatedPressable>
              <AnimatedPressable onPress={() => addWater(500)} style={s.waterBtn}>
                <EliteText style={{ color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>+500ml</EliteText>
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>

        {/* ══ 3. Ayuno intermitente ══ */}
        <Animated.View entering={FadeInUp.delay(190).springify()}>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="timer-outline" size={18} color={SEMANTIC.warning} />
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>Ayuno</EliteText>
              </View>
              {isFasting && (
                <EliteText style={{ color: SEMANTIC.warning, fontFamily: Fonts.bold, fontSize: FontSizes.lg }}>
                  {String(fastingHours).padStart(2, '0')}:{String(fastingMins).padStart(2, '0')}
                </EliteText>
              )}
            </View>

            {/* Ayuno completado hoy */}
            {!isFasting && completedFast && (
              <View style={{ backgroundColor: withOpacity(SEMANTIC.success, 0.08), borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={SEMANTIC.success} />
                  <EliteText style={{ color: SEMANTIC.success, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>
                    Ayuno completado: {completedFast.duration}
                  </EliteText>
                </View>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginTop: 2, marginLeft: 22 }}>
                  {completedFast.start} → {completedFast.end}
                </EliteText>
              </View>
            )}

            {isFasting && (
              <>
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${fastPct}%`, backgroundColor: fastPct >= 100 ? SEMANTIC.success : SEMANTIC.warning }]} />
                </View>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginTop: 4 }}>
                  {fastingHours}h {fastingMins}m de {fastTargetSelection}h objetivo
                </EliteText>
                <View style={{ gap: 4, marginTop: Spacing.sm }}>
                  <FastingZone hours={12} label="Cetosis ligera" reached={fastingHours >= 12} />
                  <FastingZone hours={14} label="Autofagia activa" reached={fastingHours >= 14} />
                  <FastingZone hours={16} label="Objetivo completo" reached={fastingHours >= 16} />
                  <FastingZone hours={18} label="Autofagia profunda" reached={fastingHours >= 18} />
                </View>
              </>
            )}

            {/* Botón principal iniciar/detener */}
            <AnimatedPressable onPress={handleFastingPress} style={[s.fastingBtn, isFasting && { borderColor: SEMANTIC.error }]}>
              <Ionicons name={isFasting ? 'stop-circle-outline' : 'play-circle-outline'} size={18} color={isFasting ? SEMANTIC.error : SEMANTIC.warning} />
              <EliteText style={{ color: isFasting ? SEMANTIC.error : SEMANTIC.warning, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>
                {isFasting ? 'Detener ayuno' : 'Iniciar ayuno'}
              </EliteText>
            </AnimatedPressable>

            {/* ── Modal: Iniciar ayuno ── */}
            {showFastStartModal && (
              <View style={s.fastModal}>
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.md, marginBottom: Spacing.sm }}>
                  Iniciar ayuno
                </EliteText>

                {/* Selector de objetivo */}
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginBottom: 6 }}>Objetivo</EliteText>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: Spacing.md, flexWrap: 'wrap' }}>
                  {[12, 14, 16, 18, 24].map(h => (
                    <Pressable
                      key={h}
                      onPress={() => setFastTargetSelection(h)}
                      style={[s.targetPill, fastTargetSelection === h && { backgroundColor: SEMANTIC.warning, borderColor: SEMANTIC.warning }]}
                    >
                      <EliteText style={{ color: fastTargetSelection === h ? '#000' : TEXT_COLORS.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs }}>
                        {h}h
                      </EliteText>
                    </Pressable>
                  ))}
                </View>

                {/* Opciones: Ahora / A otra hora */}
                <AnimatedPressable onPress={() => startFasting(false)} style={s.fastModalBtn}>
                  <Ionicons name="flash-outline" size={16} color={SEMANTIC.warning} />
                  <EliteText style={{ color: SEMANTIC.warning, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>Ahora mismo</EliteText>
                </AnimatedPressable>

                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: Spacing.sm, marginBottom: 6 }}>
                  O elige una hora:
                </EliteText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm }}>
                  <TextInput
                    style={s.timeInput}
                    value={fastManualHH}
                    onChangeText={t => setFastManualHH(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="HH"
                    placeholderTextColor={TEXT_COLORS.muted}
                  />
                  <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.lg }}>:</EliteText>
                  <TextInput
                    style={s.timeInput}
                    value={fastManualMM}
                    onChangeText={t => setFastManualMM(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor={TEXT_COLORS.muted}
                  />
                  <AnimatedPressable onPress={() => startFasting(true)} style={[s.fastModalBtn, { flex: 1, marginTop: 0 }]}>
                    <EliteText style={{ color: SEMANTIC.warning, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>Iniciar a esa hora</EliteText>
                  </AnimatedPressable>
                </View>

                <Pressable onPress={() => setShowFastStartModal(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>Cancelar</EliteText>
                </Pressable>
              </View>
            )}

            {/* ── Modal: Detener ayuno ── */}
            {showFastStopModal && (
              <View style={s.fastModal}>
                <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.md, marginBottom: Spacing.sm }}>
                  Detener ayuno
                </EliteText>

                <AnimatedPressable onPress={() => stopFasting(false)} style={[s.fastModalBtn, { borderColor: SEMANTIC.error }]}>
                  <Ionicons name="stop-circle-outline" size={16} color={SEMANTIC.error} />
                  <EliteText style={{ color: SEMANTIC.error, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>Ahora mismo</EliteText>
                </AnimatedPressable>

                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: Spacing.sm, marginBottom: 6 }}>
                  O elige la hora en que rompiste el ayuno:
                </EliteText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm }}>
                  <TextInput
                    style={s.timeInput}
                    value={fastManualHH}
                    onChangeText={t => setFastManualHH(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="HH"
                    placeholderTextColor={TEXT_COLORS.muted}
                  />
                  <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.lg }}>:</EliteText>
                  <TextInput
                    style={s.timeInput}
                    value={fastManualMM}
                    onChangeText={t => setFastManualMM(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor={TEXT_COLORS.muted}
                  />
                  <AnimatedPressable onPress={() => stopFasting(true)} style={[s.fastModalBtn, { flex: 1, marginTop: 0, borderColor: SEMANTIC.error }]}>
                    <EliteText style={{ color: SEMANTIC.error, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>Detener a esa hora</EliteText>
                  </AnimatedPressable>
                </View>

                <Pressable onPress={() => setShowFastStopModal(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>Cancelar</EliteText>
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ══ 4. Escanear comida (CTA) ══ */}
        <Animated.View entering={FadeInUp.delay(260).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push({ pathname: '/food-scan', params: { mode: 'food' } } as any); }}
            style={s.scanButton}
          >
            <Ionicons name="camera-outline" size={22} color={Colors.textOnGreen} />
            <EliteText style={{ color: Colors.textOnGreen, fontFamily: Fonts.bold, fontSize: FontSizes.md }}>Escanear comida</EliteText>
          </AnimatedPressable>
        </Animated.View>

        {/* ══ 4b. Registrar por descripción ══ */}
        <AnimatedPressable
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border, marginBottom: 16, marginTop: 8 }}
          onPress={() => router.push('/food-text' as any)}
        >
          <Ionicons name="create-outline" size={18} color="#5B9BD5" />
          <EliteText style={{ fontSize: 14, color: '#5B9BD5', fontWeight: '500' }}>Registrar por descripción</EliteText>
        </AnimatedPressable>

        {/* ══ 5. Registro de hoy ══ */}
        <Animated.View entering={FadeInUp.delay(330).springify()}>
          <SectionTitle>REGISTRO DE HOY</SectionTitle>
          {foodLogs.length === 0 ? (
            <EmptyState
              icon="restaurant-outline"
              title="Sin comidas registradas"
              subtitle="Escanea o registra tu primera comida del día"
              actionLabel="Registrar comida"
              onAction={() => router.push({ pathname: '/food-scan', params: { mode: 'food' } } as any)}
              color={BLUE}
            />
          ) : (
            foodLogs.map((log, idx) => (
              <StaggerItem key={log.id ?? idx} index={idx}>
                <FoodLogCard log={log} />
              </StaggerItem>
            ))
          )}
        </Animated.View>

        {/* ══ 5b. Lo que te falta hoy ══ */}
        {foodLogs.length > 0 && (
          <Animated.View entering={FadeInUp.delay(360).springify()} style={{ marginTop: Spacing.sm }}>
            <NutritionGapsCard consumed={{ calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat }} />
          </Animated.View>
        )}

        {/* ══ 6. Analiza productos ══ */}
        <Animated.View entering={FadeInUp.delay(380).springify()}>
          <SectionTitle>ANALIZA PRODUCTOS</SectionTitle>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <AnimatedPressable
              style={s.analyzeCard}
              onPress={() => { haptic.light(); router.push({ pathname: '/food-scan', params: { mode: 'label' } } as any); }}
            >
              <Ionicons name="barcode-outline" size={22} color={SEMANTIC.warning} />
              <EliteText style={s.analyzeTitle}>Etiquetas</EliteText>
              <EliteText variant="caption" style={s.analyzeSub}>Foto de producto → aditivos</EliteText>
            </AnimatedPressable>
            <AnimatedPressable
              style={s.analyzeCard}
              onPress={() => { haptic.light(); router.push({ pathname: '/food-scan', params: { mode: 'supplement' } } as any); }}
            >
              <Ionicons name="medkit-outline" size={22} color={CATEGORY_COLORS.metrics} />
              <EliteText style={s.analyzeTitle}>Suplementos</EliteText>
              <EliteText variant="caption" style={s.analyzeSub}>Evalúa calidad y dosis</EliteText>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ══ 7. Recetas sugeridas ══ */}
        {recipes.length > 0 && (
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <SectionTitle>RECETAS SUGERIDAS</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
              {recipes.map((r: any) => (
                <View key={r.id} style={s.recipeCard}>
                  <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }} numberOfLines={2}>{r.name}</EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginTop: 4 }}>
                    {r.calories ?? 0} kcal · {r.protein_g ?? 0}g prot · {r.prep_time_min ?? 0} min
                  </EliteText>
                  {r.tags?.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {(r.tags as string[]).slice(0, 2).map((t: string, i: number) => (
                        <View key={i} style={{ backgroundColor: withOpacity(BLUE, 0.12), paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.xs }}>
                          <EliteText variant="caption" style={{ color: BLUE, fontSize: 9 }}>{t.replace('_', ' ')}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ══ 7. Insights ══ */}
        {(insights.positive || insights.alert) && (
          <Animated.View entering={FadeInUp.delay(470).springify()}>
            <SectionTitle>INSIGHTS</SectionTitle>
            {insights.positive && (
              <View style={[s.insightCard, { borderLeftColor: SEMANTIC.success }]}>
                <Ionicons name="checkmark-circle" size={16} color={SEMANTIC.success} />
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, flex: 1 }}>{insights.positive}</EliteText>
              </View>
            )}
            {insights.alert && (
              <View style={[s.insightCard, { borderLeftColor: SEMANTIC.warning }]}>
                <Ionicons name="alert-circle" size={16} color={SEMANTIC.warning} />
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, flex: 1 }}>{insights.alert}</EliteText>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══ Estilos ═══

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.screen },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },

  // Hero
  heroCardWrap: {
    marginTop: Spacing.sm,
  },
  scoreNumber: { fontSize: 48, fontFamily: Fonts.extraBold },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  macroItem: { alignItems: 'center' },
  macroDivider: { width: 1, height: 28, backgroundColor: SURFACES.border },

  // Cards genéricas
  card: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.lg, marginTop: Spacing.sm,
  },

  // Barras de progreso
  progressBar: { height: 6, backgroundColor: SURFACES.cardLight, borderRadius: Radius.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.xs },

  // Hidratación
  waterBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    backgroundColor: withOpacity(BLUE, 0.1), borderRadius: Radius.sm, borderWidth: 0.5, borderColor: withOpacity(BLUE, 0.25),
  },

  // Ayuno
  fastingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: SEMANTIC.warning,
  },

  // Escanear comida (CTA)
  scanButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.neonGreen, borderRadius: Radius.card, paddingVertical: Spacing.md, marginTop: Spacing.md,
  },

  // Modal inline de ayuno
  fastModal: {
    backgroundColor: SURFACES.cardLight, borderRadius: Radius.sm, padding: Spacing.md, marginTop: Spacing.sm,
  },
  fastModalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: SEMANTIC.warning, marginTop: 4,
  },
  targetPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: SURFACES.border,
  },
  timeInput: {
    width: 48, textAlign: 'center' as const, color: TEXT_COLORS.primary,
    fontFamily: Fonts.bold, fontSize: FontSizes.lg,
    backgroundColor: SURFACES.card, borderRadius: Radius.xs, borderWidth: 1, borderColor: SURFACES.border,
    paddingVertical: 6,
  },

  // Comidas
  foodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.sm, marginBottom: Spacing.xs,
  },
  foodThumb: {
    width: 52, height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center',
  },

  // Recetas
  recipeCard: {
    width: 180, backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 0.5, borderColor: SURFACES.border,
  },

  // Analyze cards
  analyzeCard: {
    flex: 1, backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.md, gap: 6,
    borderWidth: 0.5, borderColor: SURFACES.border,
  },
  analyzeTitle: { color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  analyzeSub: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, lineHeight: 14 },

  // Insights
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.md,
    borderLeftWidth: 3, marginBottom: Spacing.xs,
  },
});
