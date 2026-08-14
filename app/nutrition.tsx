/**
 * Nutrición Hub — navegación del pilar, no tablero (OLA3 · Anexo D §1).
 *
 * loadData hacía 5 lecturas que computeAndSaveDailyScore YA hacía por su
 * cuenta, y tres de ellas eran de datos con dueño externo: el agua vive en
 * /hydration, el ayuno en /fasting y la glucosa en /glucose-log. Murieron.
 * El agua se queda SOLO como insumo del score, tomada del desglose.
 *
 * Lo que queda: score del día, insight de ARGOS, chat del pilar y los accesos
 * (Registrar · Cocina · Suplementos · Glucosa). Cero queries propias más allá
 * del score.
 */
import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, DeviceEventEmitter, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import { HelpButton } from '@/src/components/HelpButton';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';
import { useMacroMode } from '@/src/hooks/useMacroMode';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { isFeatureVisible } from '@/src/services/nutrition-mode-core';
import { computeAndSaveDailyScore, getScoreTrend, type ScoreTrendPoint } from '@/src/services/nutrition-score-service';
import { getTodayInsight, NUTRITION_INSIGHT_EVENT, type CachedInsight } from '@/src/services/argos-nutrition-insights';
import { openArgosChat } from '@/src/services/argos-nav';
import type { ScoreBreakdown } from '@/src/services/nutrition-score-core';
import { NutritionScoreCard } from '@/src/components/nutricion/NutritionScoreCard';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, TEXT_COLORS } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { ArgosMark } from '@/src/components/argos/ArgosMark';

const BLUE = CATEGORY_COLORS.nutrition;

const MACRO_BANNER_KEY = '@atp/macro_banner_seen';

export default function NutritionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B3: la pantalla migró a tokens (Screen themed) y sigue el tema global.
  const { kind, tokens: t } = useAppTheme();
  const { macroMode } = useMacroMode();
  // T1/T2 NUTRICIÓN: cards visibles según modo simple/completo (#52)
  const { mode } = useNutritionMode();
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
    if (!user?.id) { setRefreshing(false); return; }
    // T3: score funcional — calcula + persiste (daily_nutrition_scores) y trae
    // trend. Es la ÚNICA lectura del hub: proteína y agua viajan dentro del
    // desglose, así que no hay que volver a preguntarle a las tablas.
    try {
      const [breakdown, trend] = await Promise.all([
        computeAndSaveDailyScore(user.id),
        getScoreTrend(user.id, 7),
      ]);
      setScoreBreakdown(breakdown);
      setScoreTrend(trend);
    } catch { /* score fail-soft */ }
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
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
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
            proteinG={scoreBreakdown?.proteinG ?? 0}
            waterMl={scoreBreakdown?.waterMl ?? 0}
          />
        </Animated.View>

        {/* MB-8 Track E.2: el hub es navegación, no tablero. La card RESUMEN
            DEL DÍA duplicaba los macros que ya viven en el registro (un dato
            vive en UN solo lugar) — fuera. El score card se queda: es la
            síntesis de coaching (decisión MB-1.5 "score = coaching"), no un
            dato crudo. Los macros del día se consultan en Registrar. */}

        {/* Banner educativo una sola vez (macros OFF) */}
        {showMacroBanner && (
          <Animated.View entering={FadeInUp.delay(60).springify()} style={s.macroBanner}>
            <Ionicons name="bulb-outline" size={20} color={BLUE} />
            <EliteText style={s.macroBannerText}>
              Aquí no contamos calorías. Te enseñamos a elegir mejor.
            </EliteText>
            {/* MB-1.5 §1: pressed visible */}
            <Pressable
              onPress={dismissMacroBanner}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.5, transform: [{ scale: 0.9 }] }}
            >
              <Ionicons name="close" size={18} color={t.textoSecundario} />
            </Pressable>
          </Animated.View>
        )}

        {/* OLA3: las 3 vías son SENSORES del mismo flujo. "Guardados" ya no
            es un botón: los frecuentes y los registros de hoy viven dentro de
            /food-log, siempre visibles. */}
        <Animated.View entering={FadeInUp.delay(70).springify()} style={{ marginTop: Spacing.md }}>
          <View style={s.registerRow}>
            {([
              { label: 'Foto', icon: 'camera-outline', sensor: 'foto' },
              { label: 'Texto', icon: 'create-outline', sensor: 'texto' },
              { label: 'Código', icon: 'barcode-outline', sensor: 'codigo' },
            ] as const).map((cta) => (
              <AnimatedPressable
                key={cta.label}
                onPress={() => { haptic.light(); router.push({ pathname: '/food-log', params: { sensor: cta.sensor } }); }}
                style={s.registerBtn}
              >
                <Ionicons name={cta.icon} size={18} color={BLUE} />
                <EliteText style={s.registerBtnText}>{cta.label}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
        </Animated.View>

        {/* T6: insight post-meal de ARGOS (solo si el opt-in generó uno hoy) */}
        {insight && (
          <Animated.View entering={FadeInUp.delay(80).springify()} style={{ marginTop: Spacing.sm }}>
            <View style={s.insightCard}>
              <ArgosMark size={14} style={{ marginTop: 2 }} />
              <EliteText style={s.insightText}>{insight.text}</EliteText>
            </View>
          </Animated.View>
        )}

        {/* T6: ARGOS nutricional — chat con contexto del pilar pre-cargado */}
        <Animated.View entering={FadeInUp.delay(85).springify()} style={{ marginTop: Spacing.sm }}>
          <NavCard mark color="#a8e02a" title="Hablar con ARGOS"
            subtitle="Sobre tu nutrición de hoy: conoce tus datos"
            onPress={() => { haptic.light(); openArgosChat({ from: 'nutrition' }); }} />
        </Animated.View>

        {/* Cocina: recetas, lista y preferencias bajo un techo. */}
        {isFeatureVisible('recipes', mode) && (
        <Animated.View entering={FadeInUp.delay(90).springify()} style={{ marginTop: Spacing.sm }}>
          <NavCard icon="basket-outline" color="#38bdf8" title="Cocina"
            subtitle="Tus recetas, tu lista del súper y tus preferencias"
            onPress={() => { haptic.light(); router.push('/cocina'); }} />
        </Animated.View>
        )}

        {/* ═══ CARDS DE NAVEGACIÓN — visibles según modo (#52) ═══ */}
        <View style={{ marginTop: Spacing.lg }}>
          {isFeatureVisible('supplements', mode) && (
          <Animated.View entering={FadeInUp.delay(110).springify()}>
            <NavCard icon="flask-outline" color="#1D9E75" title="Suplementos" subtitle="Tu plan diario personalizado"
              onPress={() => { haptic.light(); router.push('/supplements'); }} />
          </Animated.View>
          )}

          {/* Nu1 + OLA3: Ayuno, Hidratación y Glucosa tienen dueño fuera del
              pilar (/fasting, /hydration, /glucose-log). El hub solo enlaza;
              ya no lee sus tablas. Mis recetas y Preferencias son pestañas de
              /cocina y dejaron de tener card propia. */}

          {isFeatureVisible('glucose', mode) && (
          <Animated.View entering={FadeInUp.delay(180).springify()}>
            {/* E.2: sin dato duro — el valor vive en /glucose-log */}
            <NavCard icon="analytics-outline" color="#fb923c" title="Glucosa"
              subtitle="Registra y consulta tus mediciones"
              onPress={() => { haptic.light(); router.push('/glucose-log'); }} />
          </Animated.View>
          )}

          {isFeatureVisible('scanner', mode) && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            {/* Etiqueta es sub-modo del sensor foto: sin él se pierden
                LABEL_CONTEXT y cleanliness_score. */}
            <NavCard icon="pricetag-outline" color="#a8e02a" title="Escanear etiqueta" subtitle="Foto de producto → aditivos y calidad"
              onPress={() => { haptic.light(); router.push({ pathname: '/food-log', params: { sensor: 'foto', intent: 'etiqueta' } }); }} />
          </Animated.View>
          )}
          {/* "Evaluar suplemento" se mudó a /supplements: una tabla, un dueño. */}
        </View>

        {/* B-5 (MB-12): las macros del pilar son estimación de IA */}
        <MedicalDisclaimer feature="nutrition" />
        <View style={{ height: 80 }} />
      </ScrollView>

    </Screen>
  );
}

// ═══ NAV CARD COMPONENT ═══
function NavCard({ icon, mark, color, title, subtitle, badge, badgeColor, onPress }: {
  icon?: string; mark?: boolean; color: string; title: string; subtitle: string;
  badge?: string; badgeColor?: string; onPress: () => void;
}) {
  // MB-31B3: el degradado de la card es tinte transparente sobre el fondo —
  // el texto neutro sigue el tema (mismo criterio que fitness-hub).
  const { tokens: t } = useAppTheme();
  return (
    <AnimatedPressable onPress={onPress} style={s.navCard}>
      <GradientCard gradient={{ start: `${color}12`, end: `${color}04` }} accentColor={color} accentPosition="left" padding={16}>
        <View style={s.navRow}>
          <View style={[s.navIcon, { backgroundColor: `${color}15` }]}>
            {/* MB-20 4.4: la orbe es ARGOS en todas partes — mark dibuja ArgosMark. */}
            {mark ? <ArgosMark size={22} /> : <Ionicons name={icon as any} size={22} color={color} />}
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={[s.navTitle, { color: t.texto }]}>{title}</EliteText>
            <EliteText style={[s.navSub, { color: t.textoSecundario }]}>{subtitle}</EliteText>
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

  macroBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(91,155,213,0.08)', borderWidth: 1, borderColor: 'rgba(91,155,213,0.2)',
    borderRadius: 14, padding: 14, marginTop: Spacing.md,
  },
  macroBannerText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#cbd5e1', lineHeight: 18 },

  navCard: { marginBottom: Spacing.sm },
  // T1: vías de registro — 4 desde MB-28B, en cuadrícula 2x2 para que
  // "Guardados" no se aplaste en una sola fila.
  registerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  registerBtn: {
    flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
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
  navTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold },
  navSub: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 2 },
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
