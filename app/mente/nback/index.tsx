/**
 * N-Back — home del módulo (norte UX: referencia de Enrique, piel ATP).
 *
 * Week-strip · card Reto 20 días · card Hoy 0/12 con EMPEZAR SESIÓN ·
 * settings (speed / feedback / resume_mode — decisión #44-1) · accesos a
 * Cómo jugar y Estadísticas. Primera vez (0 sesiones) → tutorial N=1.
 */
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
import {
  NBACK_CONFIG, badgeForBestN, challengeDay, type NBackResumeMode,
} from '@/src/services/nback-core';
import {
  fetchNBackState, countRoundsOnDate, fetchRoundsByDate,
  getNBackSettings, saveNBackSettings, DEFAULT_NBACK_SETTINGS,
  type NBackSettings, type NBackUserState,
} from '@/src/services/nback-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function lastNDates(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(toLocalDateString(d));
  }
  return out;
}

export default function NBackHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [state, setState] = useState<NBackUserState | null>(null);
  const [roundsToday, setRoundsToday] = useState(0);
  const [weekMap, setWeekMap] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<NBackSettings>(DEFAULT_NBACK_SETTINGS);
  const [challengeDays, setChallengeDays] = useState(0);

  useFocusEffect(useCallback(() => {
    let alive = true;
    const today = getLocalToday();
    const week = lastNDates(7);
    getNBackSettings().then(s => { if (alive) setSettings(s); });
    if (user?.id) {
      fetchNBackState(user.id).then(st => {
        if (!alive) return;
        setState(st);
        if (st.challenge_started_on) {
          fetchRoundsByDate(user.id, st.challenge_started_on).then(map => {
            if (!alive) return;
            setChallengeDays(challengeDay(Object.keys(map).length));
            setWeekMap(map);
          });
        } else {
          fetchRoundsByDate(user.id, week[0]).then(map => { if (alive) setWeekMap(map); });
        }
      });
      countRoundsOnDate(user.id, today).then(c => { if (alive) setRoundsToday(c); });
    }
    return () => { alive = false; };
  }, [user?.id]));

  const updateSettings = useCallback((patch: Partial<NBackSettings>) => {
    haptic.light();
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveNBackSettings(next);
      return next;
    });
  }, []);

  const startSession = useCallback(() => {
    haptic.medium();
    if ((state?.sessions_total ?? 0) === 0) {
      // Primera vez: tutorial obligatorio (decisión #44-1).
      router.push('/mente/nback/como-jugar');
      return;
    }
    router.push('/mente/nback/sesion');
  }, [router, state?.sessions_total]);

  const today = getLocalToday();
  const week = lastNDates(7);
  const badge = badgeForBestN(state?.best_n ?? NBACK_CONFIG.N_START);
  const dayOfChallenge = challengeDays;
  const todayPct = Math.min(100, Math.round((roundsToday / NBACK_CONFIG.ROUNDS_PER_DAY) * 100));

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <StickyPillarBanner scrolled={scrolled} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={s.scroll}
      >
        {/* Header editorial */}
        <View style={s.header}>
          <EliteText style={s.kicker}>PILAR MENTE · COGNICIÓN</EliteText>
          <EliteText style={s.title}>N-Back</EliteText>
          <View style={s.levelRow}>
            <EliteText style={s.levelHero}>N = {state?.current_n ?? NBACK_CONFIG.N_START}</EliteText>
            <View style={s.badgePill}>
              <EliteText style={s.badgeText}>{badge.emoji} {badge.label}</EliteText>
            </View>
          </View>
        </View>

        <View style={s.body}>
          {/* Week strip */}
          <Animated.View entering={FadeInUp.delay(30).springify()} style={s.weekStrip}>
            {week.map(date => {
              const d = new Date(`${date}T12:00:00`);
              const isToday = date === today;
              const active = (weekMap[date] ?? 0) > 0;
              return (
                <View key={date} style={s.weekDay}>
                  <EliteText style={[s.weekLetter, isToday && { color: ATP_BRAND.lime }]}>
                    {DAY_LETTERS[d.getDay()]}
                  </EliteText>
                  <View style={[
                    s.weekDot,
                    active && s.weekDotActive,
                    isToday && s.weekDotToday,
                  ]}>
                    <EliteText style={[s.weekNum, (active || isToday) && { color: '#000' }]}>
                      {d.getDate()}
                    </EliteText>
                  </View>
                </View>
              );
            })}
          </Animated.View>

          {/* Reto 20 días */}
          <Animated.View entering={FadeInUp.delay(80).springify()} style={s.card}>
            <View style={s.cardTopRow}>
              <EliteText style={s.cardKicker}>RETO 20 DÍAS</EliteText>
              <EliteText style={s.cardPct}>{Math.round((dayOfChallenge / NBACK_CONFIG.CHALLENGE_DAYS) * 100)}%</EliteText>
            </View>
            <EliteText style={s.cardTitle}>
              {dayOfChallenge > 0
                ? `Día ${dayOfChallenge} de ${NBACK_CONFIG.CHALLENGE_DAYS}`
                : 'Tu reto arranca con el primer round'}
            </EliteText>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(dayOfChallenge / NBACK_CONFIG.CHALLENGE_DAYS) * 100}%` }]} />
            </View>
            <EliteText style={s.cardSub}>
              Memoria de trabajo entrenada {NBACK_CONFIG.CHALLENGE_DAYS} días — el protocolo con evidencia real.
            </EliteText>
          </Animated.View>

          {/* Hoy */}
          <Animated.View entering={FadeInUp.delay(130).springify()} style={s.card}>
            <View style={s.cardTopRow}>
              <EliteText style={s.cardKicker}>HOY</EliteText>
              <EliteText style={s.cardPct}>{todayPct}%</EliteText>
            </View>
            <EliteText style={s.cardTitle}>
              {roundsToday}/{NBACK_CONFIG.ROUNDS_PER_DAY} rounds · ~20 min
            </EliteText>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${todayPct}%` }]} />
            </View>
            <AnimatedPressable style={s.startBtn} onPress={startSession}>
              <Ionicons name="play" size={18} color="#000" />
              <EliteText style={s.startText}>
                {(state?.sessions_total ?? 0) === 0 ? 'APRENDER A JUGAR' : 'EMPEZAR SESIÓN'}
              </EliteText>
            </AnimatedPressable>
            {/* Decisión #44-3: el canal auditivo es obligatorio. */}
            <View style={s.audioHint}>
              <Ionicons name="headset-outline" size={13} color={TEXT.tertiary} />
              <EliteText style={s.audioHintText}>
                Usa auriculares o pon el altavoz claro — necesitas escuchar las letras con precisión.
              </EliteText>
            </View>
          </Animated.View>

          {/* Accesos */}
          <Animated.View entering={FadeInUp.delay(180).springify()} style={s.linksRow}>
            <AnimatedPressable
              style={s.linkBtn}
              onPress={() => { haptic.light(); router.push('/mente/nback/stats'); }}
            >
              <Ionicons name="stats-chart-outline" size={16} color={TEXT.primary} />
              <EliteText style={s.linkText}>Estadísticas</EliteText>
            </AnimatedPressable>
            <AnimatedPressable
              style={s.linkBtn}
              onPress={() => { haptic.light(); router.push('/mente/nback/como-jugar'); }}
            >
              <Ionicons name="help-circle-outline" size={16} color={TEXT.primary} />
              <EliteText style={s.linkText}>Cómo jugar</EliteText>
            </AnimatedPressable>
          </Animated.View>

          {/* Settings */}
          <Animated.View entering={FadeInUp.delay(230).springify()}>
            <EliteText style={s.sectionLabel}>AJUSTES</EliteText>

            <View style={s.settingRow}>
              <EliteText style={s.settingLabel}>Velocidad</EliteText>
              <View style={s.pillGroup}>
                {NBACK_CONFIG.SPEEDS.map(sp => (
                  <AnimatedPressable
                    key={sp}
                    style={[s.pill, settings.speed === sp && s.pillActive]}
                    onPress={() => updateSettings({ speed: sp })}
                  >
                    <EliteText style={[s.pillText, settings.speed === sp && s.pillTextActive]}>{sp}x</EliteText>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            <View style={s.settingRow}>
              <EliteText style={s.settingLabel}>Feedback al responder</EliteText>
              <AnimatedPressable
                style={[s.pill, settings.feedbackSound && s.pillActive]}
                onPress={() => updateSettings({ feedbackSound: !settings.feedbackSound })}
              >
                <EliteText style={[s.pillText, settings.feedbackSound && s.pillTextActive]}>
                  {settings.feedbackSound ? 'ON' : 'OFF'}
                </EliteText>
              </AnimatedPressable>
            </View>

            <View style={s.settingRowColumn}>
              <EliteText style={s.settingLabel}>Arrancar sesión en</EliteText>
              <View style={[s.pillGroup, { marginTop: 8 }]}>
                {([
                  { mode: 'last', label: 'Último N' },
                  { mode: 'best', label: 'Mi mejor N' },
                  { mode: 'restart', label: 'Desde 1' },
                ] as { mode: NBackResumeMode; label: string }[]).map(({ mode, label }) => (
                  <AnimatedPressable
                    key={mode}
                    style={[s.pill, settings.resumeMode === mode && s.pillActive]}
                    onPress={() => updateSettings({ resumeMode: mode })}
                  >
                    <EliteText style={[s.pillText, settings.resumeMode === mode && s.pillTextActive]}>{label}</EliteText>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </Animated.View>

          <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: Spacing.xxl },
  header: { paddingTop: 108, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  kicker: { color: '#7F77DD', fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { color: '#fff', fontSize: 34, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 2 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
  levelHero: { color: ATP_BRAND.lime, fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  badgePill: {
    backgroundColor: withOpacity('#7F77DD', 0.15), borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { color: '#b9b3f0', fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  body: { paddingHorizontal: Spacing.md },

  weekStrip: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: Spacing.md, paddingHorizontal: 2,
  },
  weekDay: { alignItems: 'center', gap: 6 },
  weekLetter: { color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1 },
  weekDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    alignItems: 'center', justifyContent: 'center',
  },
  weekDotActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.85), borderColor: 'transparent' },
  weekDotToday: { borderWidth: 1.5, borderColor: ATP_BRAND.lime },
  weekNum: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  card: {
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardKicker: { color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  cardPct: { color: ATP_BRAND.lime, fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  cardTitle: { color: '#fff', fontSize: FontSizes.xl, fontFamily: Fonts.bold, marginTop: 6 },
  cardSub: { color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 8 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 10, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: ATP_BRAND.lime, borderRadius: 3 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.pill,
    paddingVertical: 13, marginTop: Spacing.md,
  },
  startText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },
  audioHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  audioHintText: { flex: 1, color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular },

  linksRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2, marginBottom: Spacing.sm },
  linkBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, paddingVertical: 12,
  },
  linkText: { color: TEXT.primary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  sectionLabel: {
    color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  settingRowColumn: { paddingVertical: 10 },
  settingLabel: { color: TEXT.primary, fontSize: FontSizes.md, fontFamily: Fonts.regular },
  pillGroup: { flexDirection: 'row', gap: 8 },
  pill: {
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'transparent',
  },
  pillActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.15), borderColor: withOpacity(ATP_BRAND.lime, 0.5) },
  pillText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  pillTextActive: { color: ATP_BRAND.lime },
});
