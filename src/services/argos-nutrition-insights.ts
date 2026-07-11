/**
 * ARGOS post-meal insights — I/O (T6 Sprint NUTRICIÓN).
 *
 * Feature OPT-IN (Settings > Salud > Nutrición, default OFF — no invasivo).
 * Al registrar comida (flag ON + throttle), pide a ARGOS un insight breve y
 * lo cachea local; el hub de nutrición lo muestra en una card discreta.
 * Fire-and-forget: nunca bloquea el guardado de la comida.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { callAnthropic, extractResponseText } from './anthropic-client';
import { ATP_LLM } from '@/src/constants/llm-config';
import { getArgosCallMetadata } from './argos-service';
import { getLocalToday } from '@/src/utils/date-helpers';
import { proteinTargetG } from './nutrition-score-core';
import {
  buildPostMealPrompt,
  sanitizeInsightText,
  shouldGenerateInsight,
} from './argos-nutrition-insights-core';

const ENABLED_KEY = '@atp/argos_nutrition_insights';
const CACHE_KEY = '@atp/argos_post_meal_insight';

export const NUTRITION_INSIGHT_EVENT = 'nutrition_insight_changed';

export interface CachedInsight {
  date: string;
  text: string;
  at: number;
}

export async function getInsightsEnabled(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(ENABLED_KEY)) === '1'; } catch { return false; }
}

export async function setInsightsEnabled(enabled: boolean): Promise<void> {
  try { await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0'); } catch { /* noop */ }
}

/** Insight cacheado de HOY (null si no hay o es de otro día). */
export async function getTodayInsight(): Promise<CachedInsight | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedInsight;
    return cached.date === getLocalToday() ? cached : null;
  } catch { return null; }
}

/**
 * Post-meal: genera insight si el flag está ON y pasó el throttle.
 * Llamar con `void` tras registrar comida — nunca lanza.
 */
export async function maybeGeneratePostMealInsight(
  userId: string,
  mealDescription: string,
): Promise<void> {
  try {
    const enabled = await getInsightsEnabled();
    const prev = await getTodayInsight();
    if (!shouldGenerateInsight({ enabled, lastGeneratedAt: prev?.at ?? null, now: Date.now() })) return;

    const today = getLocalToday();
    const [foodRes, scoreRes, weightRes] = await Promise.all([
      supabase.from('food_logs').select('protein_g').eq('user_id', userId).eq('date', today),
      supabase.from('daily_nutrition_scores').select('overall_score').eq('user_id', userId).eq('date', today).maybeSingle(),
      supabase.from('body_measurements').select('weight_kg').eq('user_id', userId)
        .not('weight_kg', 'is', null).order('measured_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const foods = (foodRes.data ?? []) as any[];
    const proteinG = foods.reduce((s, f) => s + (Number(f.protein_g) || 0), 0);

    const prompt = buildPostMealPrompt({
      description: mealDescription,
      proteinG,
      proteinTargetG: proteinTargetG((weightRes.data as any)?.weight_kg ?? null),
      scoreToday: (scoreRes.data as any)?.overall_score ?? null,
      mealsToday: foods.length,
    });

    const meta = await getArgosCallMetadata({ callerUserId: userId, requestType: 'insight' });
    // MAX_TOKENS_ESTIMATE (antes 150): Sonnet 5 con adaptive thinking cuenta
    // thinking + texto contra el cap → 150 dejaba el insight vacío/truncado.
    const data = await callAnthropic(
      [{ role: 'user', content: prompt.user }],
      ATP_LLM.MAX_TOKENS_ESTIMATE,
      undefined,
      prompt.system,
      meta,
    );
    const text = sanitizeInsightText(extractResponseText(data));
    if (!text) return;

    const cached: CachedInsight = { date: today, text, at: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    DeviceEventEmitter.emit(NUTRITION_INSIGHT_EVENT);
  } catch (e) {
    logWarn('[argos-insights] post-meal failed (no-op):', e);
  }
}
