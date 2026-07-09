/**
 * MENTE › Progreso — streaks + medallas cross-pilar (T5 Sprint MENTE).
 *
 * 4 cards de racha (journal · respiración · meditación · check-in) con la
 * próxima medalla como objetivo, y la vitrina de medallas ganadas
 * (7d · 30d · 90d · 365d). Al entrar sincroniza medallas nuevas.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { BackButton } from '@/src/components/ui/BackButton';
import { supabase } from '@/src/lib/supabase';
import {
  fetchMenteStreaks,
  fetchMenteMedals,
  syncMenteMedals,
  type MenteStreaks,
  type MenteMedal,
} from '@/src/services/mente-streaks-service';
import {
  CATEGORY_COPY,
  MEDAL_TIERS,
  MENTE_CATEGORIES,
  nextMedalTarget,
  streakCopy,
  type MenteCategory,
} from '@/src/services/mente-streaks-core';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const ZERO: MenteStreaks = { journal: 0, breathing: 0, meditation: 0, checkin: 0 };

export default function MenteProgresoScreen() {
  const router = useRouter();
  const [streaks, setStreaks] = useState<MenteStreaks>(ZERO);
  const [medals, setMedals] = useState<MenteMedal[]>([]);
  const [justAwarded, setJustAwarded] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const s = await fetchMenteStreaks(user.id);
      const existing = await fetchMenteMedals(user.id);
      const fresh = await syncMenteMedals(user.id, s, existing);
      if (!alive) return;
      setStreaks(s);
      setMedals([
        ...existing,
        ...fresh.map((f) => ({ ...f, awarded_at: new Date().toISOString() })),
      ]);
      if (fresh.length > 0) {
        haptic.success();
        setJustAwarded(fresh.map((f) => `${f.category}-${f.tier}`));
      }
    })();
    return () => { alive = false; };
  }, []));

  const medalFor = (cat: MenteCategory, tier: string) =>
    medals.find((m) => m.category === cat && m.tier === tier);

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="light" />
      <View style={s.header}>
        <BackButton onPress={() => router.back()} />
        <View>
          <EliteText style={s.kicker}>MENTE</EliteText>
          <EliteText style={s.title}>Progreso</EliteText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Rachas por categoría */}
        {MENTE_CATEGORIES.map((cat, idx) => {
          const copy = CATEGORY_COPY[cat];
          const streak = streaks[cat];
          const next = nextMedalTarget(streak);
          return (
            <Animated.View key={cat} entering={FadeInUp.delay(50 + idx * 60).springify()}>
              <View style={s.streakCard}>
                <View style={s.streakLeft}>
                  <Ionicons name={copy.icon as any} size={20} color={streak > 0 ? ATP_BRAND.lime : TEXT.tertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={s.streakLabel}>{copy.label}</EliteText>
                  <EliteText style={[s.streakValue, streak === 0 && { color: TEXT.tertiary }]}>
                    {streakCopy(streak)}
                  </EliteText>
                  <EliteText style={s.streakNext}>
                    {next
                      ? `Próxima medalla: ${MEDAL_TIERS.find(m => m.tier === next.tier)?.label} · faltan ${next.remaining} días`
                      : 'Medalla de 1 año conseguida. Leyenda.'}
                  </EliteText>
                </View>
                {streak > 0 && (
                  <View style={s.fireBadge}>
                    <EliteText style={s.fireText}>🔥 {streak}</EliteText>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}

        {/* Vitrina de medallas */}
        <Animated.View entering={FadeInUp.delay(320).springify()}>
          <EliteText style={s.sectionLabel}>MEDALLAS</EliteText>
          <View style={s.medalGrid}>
            {MENTE_CATEGORIES.map((cat) => (
              <View key={cat} style={s.medalRow}>
                <EliteText style={s.medalRowLabel}>{CATEGORY_COPY[cat].label}</EliteText>
                <View style={s.medalRowTiers}>
                  {MEDAL_TIERS.map((t) => {
                    const earned = medalFor(cat, t.tier);
                    const isNew = justAwarded.includes(`${cat}-${t.tier}`);
                    return (
                      <View
                        key={t.tier}
                        style={[
                          s.medal,
                          earned && s.medalEarned,
                          isNew && s.medalNew,
                        ]}
                      >
                        <EliteText style={[s.medalText, earned ? s.medalTextEarned : null]}>
                          {t.tier}
                        </EliteText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
          <EliteText style={s.legend}>7 días · 30 días · 90 días · 365 días consecutivos</EliteText>
        </Animated.View>

        {/* Copy editorial */}
        <Animated.View entering={FadeInUp.delay(380).springify()} style={s.quoteBox}>
          <EliteText style={s.quote}>
            La constancia no se negocia con motivación. Se construye con sistemas.
          </EliteText>
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  kicker: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: 2, marginTop: 2 },
  content: { paddingHorizontal: Spacing.md },

  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border,
    borderWidth: 0.5, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  streakLeft: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  streakLabel: {
    fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: TEXT.secondary,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  streakValue: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl, color: TEXT.primary, marginTop: 2 },
  streakNext: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, marginTop: 2 },
  fireBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  fireText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: ATP_BRAND.lime },

  sectionLabel: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold, color: TEXT.secondary,
    textTransform: 'uppercase', marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  medalGrid: {
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border,
    borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm,
  },
  medalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  medalRowLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  medalRowTiers: { flexDirection: 'row', gap: 6 },
  medal: {
    minWidth: 44, alignItems: 'center', borderRadius: Radius.pill,
    borderWidth: 1, borderColor: '#222', paddingVertical: 4, paddingHorizontal: 6,
  },
  medalEarned: {
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.10),
  },
  medalNew: { borderColor: ATP_BRAND.lime, backgroundColor: withOpacity(ATP_BRAND.lime, 0.22) },
  medalText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: TEXT.muted },
  medalTextEarned: { color: ATP_BRAND.lime },
  legend: {
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary,
    textAlign: 'center', marginTop: Spacing.sm,
  },

  quoteBox: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  quote: {
    fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.secondary,
    textAlign: 'center', fontStyle: 'italic', lineHeight: 22,
  },
});
