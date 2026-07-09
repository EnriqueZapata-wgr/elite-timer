/**
 * NutritionScoreCard — score del día, la card estrella del hub (T1/T3, #72).
 *
 * Score 0-100 grande con semáforo (rojo tenue <50 · gris 50-69 · lima 70+),
 * sub-línea con proteína/agua, red flag o highlight principal, trend de
 * 7 días en mini-barras y el modo activo como nota discreta.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { scoreColor, type ScoreBreakdown } from '@/src/services/nutrition-score-core';
import type { ScoreTrendPoint } from '@/src/services/nutrition-score-service';
import type { NutritionMode } from '@/src/services/nutrition-mode-core';
import { ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Props {
  breakdown: ScoreBreakdown | null;
  mode: NutritionMode;
  trend: ScoreTrendPoint[];
  proteinG: number;
  waterMl: number;
}

const TREND_H = 26;

export function NutritionScoreCard({ breakdown, mode, trend, proteinG, waterMl }: Props) {
  const score = breakdown?.total ?? null;
  const color = score === null ? TEXT.tertiary : scoreColor(score);
  const headline = breakdown?.redFlags[0] ?? breakdown?.highlights[0] ?? null;

  return (
    <View style={[s.card, { borderColor: withOpacity(color, 0.35) }]}>
      <View style={s.topRow}>
        <View>
          <EliteText style={s.label}>SCORE DEL DÍA</EliteText>
          <EliteText style={[s.score, { color }]}>{score === null ? '—' : score}</EliteText>
          <EliteText style={s.sub}>
            {breakdown
              ? `${Math.round(proteinG)}/${breakdown.proteinTargetG}g proteína · ${(waterMl / 1000).toFixed(1)}/${(breakdown.waterGoalMl / 1000).toFixed(1)}L agua`
              : 'Registra tu primera comida para activarlo'}
          </EliteText>
        </View>

        {/* Trend 7 días */}
        {trend.length > 1 && (
          <View style={s.trendBox}>
            <View style={s.trendRow}>
              {trend.map((p) => (
                <View
                  key={p.date}
                  style={[
                    s.trendBar,
                    {
                      height: Math.max(3, (p.score / 100) * TREND_H),
                      backgroundColor: withOpacity(scoreColor(p.score), 0.85),
                    },
                  ]}
                />
              ))}
            </View>
            <EliteText style={s.trendLabel}>7 días</EliteText>
          </View>
        )}
      </View>

      {headline && (
        <EliteText style={[s.headline, { color: withOpacity(color, 0.9) }]}>
          {headline}
        </EliteText>
      )}

      <EliteText style={s.modeNote}>
        {mode === 'simple' ? 'modo simple · proteína + agua + macros ATP' : 'modo completo · macros, micros, timing y calidad'}
      </EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: 11, fontFamily: Fonts.bold, color: TEXT.secondary, letterSpacing: 2 },
  score: { fontSize: 56, fontFamily: Fonts.extraBold, lineHeight: 60, marginTop: 2 },
  sub: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary },
  trendBox: { alignItems: 'flex-end', gap: 4, paddingTop: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: TREND_H },
  trendBar: { width: 6, borderRadius: 3 },
  trendLabel: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary },
  headline: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  modeNote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary },
});

export default NutritionScoreCard;
