/**
 * Nutrición Hub — Resumen del día + cards de navegación.
 *
 * Muestra macros del día, agua inline, estado de ayuno, glucosa,
 * y cards de navegación a sub-pantallas.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, DeviceEventEmitter, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { HelpButton } from '@/src/components/HelpButton';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { getUserWaterGoal } from '@/src/services/hydration-service';
import { useMacroMode } from '@/src/hooks/useMacroMode';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { isFeatureVisible } from '@/src/services/nutrition-mode-core';
import { computeAndSaveDailyScore, getScoreTrend, type ScoreTrendPoint } from '@/src/services/nutrition-score-service';
import { getTodayInsight, NUTRITION_INSIGHT_EVENT, type CachedInsight } from '@/src/services/argos-nutrition-insights';
import type { ScoreBreakdown } from '@/src/services/nutrition-score-core';
import { NutritionScoreCard } from '@/src/components/nutricion/NutritionScoreCard';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, TEXT_COLORS, PILLAR_GRADIENTS } from '@/src/constants/brand';

const BLUE = CATEGORY_COLORS.nutrition;

interface DaySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
  waterMl: number;
  waterGoal: number;
  isFasting: boolean;
  fastHours: number;
  lastGlucose: number | null;
  glucoseContext: string | null;
}

const EMPTY: DaySummary = {
  calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0,
  waterMl: 0, waterGoal: 2500,
  isFasting: false, fastHours: 0,
  lastGlucose: null, glucoseContext: null,
};

const MACRO_BANNER_KEY = '@atp/macro_banner_seen';

export default function NutritionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { macroMode } = useMacroMode();
  // T1/T2 NUTRICIÓN: cards visibles según modo simple/completo (#52)
  const { mode } = useNutritionMode();
  const [summary, setSummary] = useState<DaySummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMacroBanner, setShowMacroBanner] = useState(false);
  // T3: score del día (se recalcula al enfocar / day_changed) + trend 7d
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [scoreTrend, setScoreTrend] = useState<ScoreTrendPoint[]>([]);
  // T6: insight post-meal de ARGOS (opt-in; null si no hay de hoy)
  const [insight, setInsight] = useState<CachedInsight | null>(null);

  useEffect(() => {
    getTodayInsight().then(setInsight);
    const sub = DeviceEventEmitter.addListener(NUTRITION_INSIGHT_EVENT, () => {
      getTodayInsight().then(setInsight);
    });
    return () => sub.remove();
  }, []);

  // Banner una sola vez cuando macros OFF (PRD §6.6 — borrador, validar Mariana)
  useEffect(() => {
    if (macroMode) { setShowMacroBanner(false); return; }
    AsyncStorage.getItem(MACRO_BANNER_KEY).then(seen => {
      if (!seen) setShowMacroBanner(true);
    });
  }, [macroMode]);

  const dismissMacroBanner = useCallback(() => {
    setShowMacroBanner(false);
    AsyncStorage.setItem(MACRO_BANNER_KEY, '1');
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    const today = getLocalToday();
    try {
      const [foodRes, waterRes, fastRes, glucoseRes, waterGoalMl] = await Promise.all([
        supabase.from('food_logs').select('calories, protein_g, carbs_g, fat_g').eq('user_id', user.id).eq('date', today),
        supabase.from('hydration_logs').select('total_ml').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('fasting_logs').select('fast_start, target_hours').eq('user_id', user.id).eq('status', 'active').limit(1),
        supabase.from('glucose_logs').select('value_mg_dl, context').eq('user_id', user.id).eq('date', today).order('time', { ascending: false }).limit(1),
        getUserWaterGoal(user.id),
      ]);

      const foods = foodRes.data ?? [];
      const activeFast = fastRes.data?.[0];
      // ÍTEM 4: guard NaN. Si fast_start viene nulo/corrupto, fastElapsed
      // sería NaN → fastHours: NaN → render "NaN h".
      const fastStartMs = activeFast?.fast_start ? new Date(activeFast.fast_start).getTime() : NaN;
      const fastElapsed = Number.isFinite(fastStartMs) ? (Date.now() - fastStartMs) / 3600000 : 0;

      setSummary({
        calories: foods.reduce((s: number, f: any) => s + (f.calories || 0), 0),
        protein: foods.reduce((s: number, f: any) => s + (f.protein_g || 0), 0),
        carbs: foods.reduce((s: number, f: any) => s + (f.carbs_g || 0), 0),
        fat: foods.reduce((s: number, f: any) => s + (f.fat_g || 0), 0),
        mealCount: foods.length,
        waterMl: (waterRes.data as any)?.total_ml ?? 0,
        waterGoal: waterGoalMl,
        isFasting: !!activeFast,
        fastHours: Math.floor(fastElapsed),
        lastGlucose: glucoseRes.data?.[0]?.value_mg_dl ?? null,
        glucoseContext: glucoseRes.data?.[0]?.context ?? null,
      });
    } catch { /* silenciar */ }

    // T3: score funcional — calcula + persiste (daily_nutrition_scores) y trae trend
    try {
      const [breakdown, trend] = await Promise.all([
        computeAndSaveDailyScore(user.id),
        getScoreTrend(user.id, 7),
      ]);
      setScoreBreakdown(breakdown);
      setScoreTrend(trend);
    } catch { /* score fail-soft */ }

    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  // F03.7: sincronizar en vivo cuando se registra agua/electrones desde HOY (sin pull-to-refresh).
  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('day_changed', () => loadData()),
      DeviceEventEmitter.addListener('electrons_changed', () => loadData()),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Nu1: addWater/waterPct removidos junto con la card de Hidratación (ahora en Hábitos).

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Nutrición" rightContent={
        <HelpButton
          title="¿Cómo registrar tu comida?"
          color="#5B9BD5"
          tips={[
            'Escribe lo que comiste o toma una foto y ARGOS estima los macros',
            'Puedes editar los macros antes de guardar',
            'Toca la unidad (g) para cambiar a piezas, cucharadas o tazas',
            'Mantén presionado un registro para eliminarlo',
            'Guarda comidas frecuentes en "Mis recetas" para reusar',
          ]}
        />
      } />
      <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
        <CommunityPresence pillar="nutrition" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {/* ═══ T3: SCORE DEL DÍA — la card estrella ═══ */}
        <Animated.View entering={FadeInUp.delay(30).springify()} style={{ marginBottom: Spacing.md }}>
          <NutritionScoreCard
            breakdown={scoreBreakdown}
            mode={mode}
            trend={scoreTrend}
            proteinG={summary.protein}
            waterMl={summary.waterMl}
          />
        </Animated.View>

        {/* ═══ HERO: Resumen del día (solo modo COMPLETO — en simple el
            score card ya trae proteína/agua sin ruido) ═══ */}
        {mode === 'complete' && (
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={PILLAR_GRADIENTS.nutrition} padding={20}>
            <EliteText style={s.heroTitle}>RESUMEN DEL DÍA</EliteText>
            {summary.mealCount === 0 ? (
              /* T4 HARDENING: primer día / día vacío — guía en vez de ceros. */
              <View style={s.emptyHero}>
                <Ionicons name="restaurant-outline" size={28} color={BLUE} />
                <EliteText style={s.emptyHeroTitle}>Tu día nutricional empieza aquí</EliteText>
                <EliteText style={s.emptyHeroText}>
                  Registra tu primera comida — foto o texto, como prefieras.
                </EliteText>
              </View>
            ) : macroMode ? (
              <View style={s.macroRow}>
                <View style={s.macroItem}>
                  <EliteText style={s.macroValue}>{summary.calories}</EliteText>
                  <EliteText style={s.macroLabel}>kcal</EliteText>
                </View>
                <View style={s.macroDivider} />
                <View style={s.macroItem}>
                  <EliteText style={[s.macroValue, { color: BLUE }]}>{summary.protein}g</EliteText>
                  <EliteText style={s.macroLabel}>Proteína</EliteText>
                </View>
                <View style={s.macroDivider} />
                <View style={s.macroItem}>
                  <EliteText style={s.macroValue}>{summary.carbs}g</EliteText>
                  <EliteText style={s.macroLabel}>Carbs</EliteText>
                </View>
                <View style={s.macroDivider} />
                <View style={s.macroItem}>
                  <EliteText style={s.macroValue}>{summary.fat}g</EliteText>
                  <EliteText style={s.macroLabel}>Grasa</EliteText>
                </View>
              </View>
            ) : (
              /* Macros OFF: solo proteína visible (decisión Mariana) */
              <View style={s.macroRow}>
                <View style={s.macroItem}>
                  <EliteText style={[s.macroValue, { color: BLUE }]}>{summary.protein}g</EliteText>
                  <EliteText style={s.macroLabel}>Proteína</EliteText>
                </View>
              </View>
            )}
            {summary.mealCount > 0 && (
              <EliteText style={s.heroSub}>
                {summary.mealCount} {summary.mealCount === 1 ? 'comida registrada' : 'comidas registradas'} hoy
              </EliteText>
            )}
          </GradientCard>
        </Animated.View>
        )}

        {/* Banner educativo una sola vez (macros OFF) */}
        {showMacroBanner && (
          <Animated.View entering={FadeInUp.delay(60).springify()} style={s.macroBanner}>
            <Ionicons name="bulb-outline" size={20} color={BLUE} />
            <EliteText style={s.macroBannerText}>
              Aquí no contamos calorías. Te enseñamos a elegir mejor.
            </EliteText>
            <Pressable onPress={dismissMacroBanner} hitSlop={8}>
              <Ionicons name="close" size={18} color="#888" />
            </Pressable>
          </Animated.View>
        )}

        {/* T1: REGISTRAR COMIDA — 3 vías (foto | texto | guardados) */}
        <Animated.View entering={FadeInUp.delay(70).springify()} style={{ marginTop: Spacing.md }}>
          <View style={s.registerRow}>
            {[
              { label: 'Foto', icon: 'camera-outline' as const, route: '/food-scan' },
              { label: 'Texto', icon: 'create-outline' as const, route: '/food-text' },
              { label: 'Guardados', icon: 'bookmark-outline' as const, route: '/food-register' },
            ].map((cta) => (
              <AnimatedPressable
                key={cta.label}
                onPress={() => { haptic.light(); router.push(cta.route as any); }}
                style={s.registerBtn}
              >
                <Ionicons name={cta.icon} size={18} color={BLUE} />
                <EliteText style={s.registerBtnText}>{cta.label}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* T1: AYUNO — visible solo cuando hay ayuno activo (no duplica el
            acceso de Hábitos; muestra estado vivo) */}
        {summary.isFasting && isFeatureVisible('fasting', mode) && (
          <Animated.View entering={FadeInUp.delay(75).springify()} style={{ marginTop: Spacing.sm }}>
            <NavCard icon="timer-outline" color="#fbbf24" title="Ayuno activo"
              subtitle={`${summary.fastHours}h en curso · toca para ver detalle`}
              onPress={() => { haptic.light(); router.push('/fasting' as any); }} />
          </Animated.View>
        )}

        {/* T6: insight post-meal de ARGOS (solo si el opt-in generó uno hoy) */}
        {insight && (
          <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginTop: Spacing.sm }}>
            <View style={s.insightCard}>
              <Ionicons name="eye" size={14} color="#a8e02a" style={{ marginTop: 2 }} />
              <EliteText style={s.insightText}>{insight.text}</EliteText>
            </View>
          </Animated.View>
        )}

        {/* T6: ARGOS nutricional — chat con contexto del pilar pre-cargado */}
        <Animated.View entering={FadeInUp.delay(85).springify()} style={{ marginTop: Spacing.sm }}>
          <NavCard icon="eye-outline" color="#a8e02a" title="Hablar con ARGOS"
            subtitle="Sobre tu nutrición de hoy — conoce tus datos"
            onPress={() => { haptic.light(); router.push('/argos-chat?from=nutrition' as any); }} />
        </Animated.View>

        {/* ARGOS recetas */}
        {isFeatureVisible('recipes', mode) && (
        <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginTop: Spacing.sm }}>
          <AnimatedPressable onPress={() => { haptic.medium(); router.push('/argos-recipes'); }}>
            <View style={{
              backgroundColor: 'rgba(56,189,248,0.06)', borderRadius: 16, padding: 18, marginBottom: 4,
              borderWidth: 1, borderColor: 'rgba(56,189,248,0.12)',
              flexDirection: 'row', alignItems: 'center', gap: 14,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: 'rgba(56,189,248,0.12)', justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name="eye-outline" size={22} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={{ color: '#38bdf8', fontSize: 14, fontWeight: '700' }}>Recetas + Lista de super</EliteText>
                <EliteText style={{ color: '#999', fontSize: 12 }}>ARGOS cocina según tus objetivos</EliteText>
              </View>
              <Ionicons name="sparkles-outline" size={18} color="#38bdf8" />
            </View>
          </AnimatedPressable>
        </Animated.View>
        )}

        {/* ═══ CARDS DE NAVEGACIÓN — visibles según modo (#52) ═══ */}
        <View style={{ marginTop: Spacing.lg }}>
          {isFeatureVisible('supplements', mode) && (
          <Animated.View entering={FadeInUp.delay(110).springify()}>
            <NavCard icon="flask-outline" color="#1D9E75" title="Suplementos" subtitle="Tu plan diario personalizado"
              onPress={() => { haptic.light(); router.push('/supplements' as any); }} />
          </Animated.View>
          )}

          {isFeatureVisible('recipes', mode) && (
          <Animated.View entering={FadeInUp.delay(120).springify()}>
            <NavCard icon="bookmark-outline" color="#fbbf24" title="Mis recetas" subtitle="Guarda comidas frecuentes para reusar"
              onPress={() => { haptic.light(); router.push('/my-recipes' as any); }} />
          </Animated.View>
          )}

          {/* Nu1: Ayuno e Hidratación se quitaron de Nutrición — viven en Hábitos → Mente
              (/fasting y /hydration). Evita duplicar el mismo acceso en dos pilares.
              T1: la card de arriba solo aparece con ayuno ACTIVO (estado vivo). */}

          {isFeatureVisible('glucose', mode) && (
          <Animated.View entering={FadeInUp.delay(180).springify()}>
            <NavCard icon="analytics-outline" color="#fb923c" title="Glucosa"
              subtitle={summary.lastGlucose ? `Último: ${summary.lastGlucose} mg/dL` : 'Registrar medición'}
              onPress={() => { haptic.light(); router.push('/glucose-log' as any); }} />
          </Animated.View>
          )}

          {isFeatureVisible('scanner', mode) && (
          <>
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <NavCard icon="barcode-outline" color="#a8e02a" title="Escanear etiqueta" subtitle="Foto de producto → aditivos y calidad"
              onPress={() => { haptic.light(); router.push({ pathname: '/food-scan', params: { mode: 'label' } } as any); }} />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(220).springify()}>
            <NavCard icon="medical-outline" color="#fbbf24" title="Evaluar suplemento" subtitle="Evalúa calidad y dosis"
              onPress={() => { haptic.light(); router.push({ pathname: '/food-scan', params: { mode: 'supplement' } } as any); }} />
          </Animated.View>
          </>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

    </Screen>
  );
}

// ═══ NAV CARD COMPONENT ═══
function NavCard({ icon, color, title, subtitle, badge, badgeColor, onPress }: {
  icon: string; color: string; title: string; subtitle: string;
  badge?: string; badgeColor?: string; onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={s.navCard}>
      <GradientCard gradient={{ start: `${color}12`, end: `${color}04` }} accentColor={color} accentPosition="left" padding={16}>
        <View style={s.navRow}>
          <View style={[s.navIcon, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={22} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={s.navTitle}>{title}</EliteText>
            <EliteText style={s.navSub}>{subtitle}</EliteText>
          </View>
          {badge ? (
            <View style={[s.badge, { backgroundColor: `${badgeColor ?? color}20` }]}>
              <EliteText style={[s.badgeText, { color: badgeColor ?? color }]}>{badge}</EliteText>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
          )}
        </View>
      </GradientCard>
    </AnimatedPressable>
  );
}

// ═══ ESTILOS ═══
const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  heroTitle: {
    fontSize: 11, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2, marginBottom: Spacing.md,
  },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: '#fff' },
  macroLabel: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  macroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroSub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: Spacing.md },
  // T4 HARDENING: empty state del hero (día sin comidas)
  emptyHero: { alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  emptyHeroTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#fff', marginTop: 4 },
  emptyHeroText: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 19,
  },

  macroBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(91,155,213,0.08)', borderWidth: 1, borderColor: 'rgba(91,155,213,0.2)',
    borderRadius: 14, padding: 14, marginTop: Spacing.md,
  },
  macroBannerText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#cbd5e1', lineHeight: 18 },

  navCard: { marginBottom: Spacing.sm },
  // T1: fila de 3 vías de registro
  registerRow: { flexDirection: 'row', gap: Spacing.sm },
  registerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(91,155,213,0.08)', borderWidth: 1, borderColor: 'rgba(91,155,213,0.25)',
    borderRadius: Radius.md, paddingVertical: 12,
  },
  registerBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: BLUE },
  // T6: insight post-meal
  insightCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(168,224,42,0.06)', borderWidth: 1, borderColor: 'rgba(168,224,42,0.2)',
    borderRadius: 14, padding: 14,
  },
  insightText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#cbd5e1', lineHeight: 19, fontStyle: 'italic' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: '#fff' },
  navSub: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold },

  waterBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  waterBarFill: { height: 4, borderRadius: 2, backgroundColor: '#38bdf8' },
  waterBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  waterBtnMinus: {
    flex: 1, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)', paddingVertical: 10, borderRadius: Radius.sm, alignItems: 'center',
  },
  waterBtnMinusText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#ef4444' },
  waterBtn: { flex: 1, backgroundColor: 'rgba(56,189,248,0.10)', paddingVertical: 10, borderRadius: Radius.sm, alignItems: 'center' },
  waterBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#38bdf8' },
});
