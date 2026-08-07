/**
 * N-Back — home del módulo (norte UX: referencia de Enrique, piel ATP).
 *
 * Week-strip · card Reto 20 días · card Hoy 0/12 con EMPEZAR SESIÓN ·
 * accesos a Cómo jugar, Estadísticas y Personalizar (V1.5 #C7: los ajustes
 * viven en /mente/nback/personalizar — la home queda de foco).
 * Primera vez (0 sesiones) → tutorial N=1.
 */
import { useCallback, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';
import { NBACK_CONFIG, badgeForBestN, challengeDay } from '@/src/services/nback-core';
import {
  fetchNBackState, countRoundsOnDate, fetchRoundsByDate,
  type NBackUserState,
} from '@/src/services/nback-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// V1.5.2 (#1): hero editorial con la portada MJ del módulo (molde MenteHero:
// imagen + overlay gradiente + acento morado del pilar — fuera header plano).
const HERO_NBACK = require('@/assets/images/mente/cards/card_nback.webp');

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
  // D-2 (MB-12): fallo de red ≠ usuario nuevo — no se pinta N=1 ni tutorial.
  const [loadFailed, setLoadFailed] = useState(false);
  const [roundsToday, setRoundsToday] = useState(0);
  const [weekMap, setWeekMap] = useState<Record<string, number>>({});
  const [challengeDays, setChallengeDays] = useState(0);

  useFocusEffect(useCallback(() => {
    let alive = true;
    const today = getLocalToday();
    const week = lastNDates(7);
    if (user?.id) {
      fetchNBackState(user.id).then(st => {
        if (!alive) return;
        setLoadFailed(false);
        setState(st);
        if (st.challenge_started_on) {
          fetchRoundsByDate(user.id, st.challenge_started_on).then(map => {
            if (!alive) return;
            setChallengeDays(challengeDay(Object.keys(map).length));
            setWeekMap(map);
          }).catch(() => {});
        } else {
          fetchRoundsByDate(user.id, week[0]).then(map => { if (alive) setWeekMap(map); }).catch(() => {});
        }
      }).catch(() => { if (alive) setLoadFailed(true); });
      countRoundsOnDate(user.id, today).then(c => { if (alive) setRoundsToday(c); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [user?.id]));

  const startSession = useCallback(() => {
    haptic.medium();
    // D-2: con el estado sin leer (loading o fallo) NUNCA mandamos al tutorial
    // — la sesión decide su N con su propia lectura (y avisa si no puede).
    if (state !== null && state.sessions_total === 0) {
      // Primera vez: tutorial obligatorio (decisión #44-1).
      router.push('/mente/nback/como-jugar');
      return;
    }
    router.push('/mente/nback/sesion');
  }, [router, state]);

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
        {/* Header editorial — V1.5.2 (#1): imagen MJ + gradiente (molde MenteHero) */}
        <ImageBackground source={HERO_NBACK} style={s.hero} resizeMode="cover">
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.97)']}
            style={StyleSheet.absoluteFill}
          />
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
        </ImageBackground>

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
              <LinearGradient
                colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.progressFill, { width: `${(dayOfChallenge / NBACK_CONFIG.CHALLENGE_DAYS) * 100}%` }]}
              />
            </View>
            <EliteText style={s.cardSub}>
              Memoria de trabajo entrenada {NBACK_CONFIG.CHALLENGE_DAYS} días: el entrenamiento, no el milagro.
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
              <LinearGradient
                colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.progressFill, { width: `${todayPct}%` }]}
              />
            </View>
            <AnimatedPressable style={s.startBtn} onPress={startSession}>
              <LinearGradient
                colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.startBtnInner}
              >
                <Ionicons name="play" size={18} color="#000" />
                <EliteText style={s.startText}>
                  {(state?.sessions_total ?? 0) === 0 ? 'APRENDER A JUGAR' : 'EMPEZAR SESIÓN'}
                </EliteText>
              </LinearGradient>
            </AnimatedPressable>
            {/* Decisión #44-3: el canal auditivo es obligatorio. */}
            <View style={s.audioHint}>
              <Ionicons name="headset-outline" size={13} color={TEXT.tertiary} />
              <EliteText style={s.audioHintText}>
                Usa auriculares o pon el altavoz claro: necesitas escuchar las letras con precisión.
              </EliteText>
            </View>
          </Animated.View>

          {/* Accesos (V1.5 #C7: los ajustes viven en Personalizar) */}
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
            <AnimatedPressable
              style={s.linkBtn}
              onPress={() => { haptic.light(); router.push('/mente/nback/personalizar'); }}
            >
              <Ionicons name="options-outline" size={16} color={TEXT.primary} />
              <EliteText style={s.linkText}>Personalizar</EliteText>
            </AnimatedPressable>
          </Animated.View>

          {/* Artículo "Saber más" — la ciencia del N-Back sin marketing. */}
          <Animated.View entering={FadeInUp.delay(230).springify()}>
            <AnimatedPressable
              style={s.learnMoreBtn}
              onPress={() => { haptic.light(); router.push('/mente/nback/saber-mas'); }}
            >
              <Ionicons name="book-outline" size={16} color={TEXT.secondary} />
              <EliteText style={s.learnMoreText}>Saber más sobre N-Back</EliteText>
              <Ionicons name="chevron-forward" size={14} color={TEXT.tertiary} />
            </AnimatedPressable>
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
  hero: {
    justifyContent: 'flex-end', minHeight: 216,
    borderBottomWidth: 1, borderBottomColor: withOpacity('#7F77DD', 0.55),
    marginBottom: Spacing.sm,
  },
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
  progressFill: { height: '100%', borderRadius: 3 },

  // V1.5.2 (#1): CTA en gradiente molécula (fuera lime plano full-width)
  startBtn: { borderRadius: Radius.pill, overflow: 'hidden', marginTop: Spacing.md },
  startBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
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

  learnMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, paddingVertical: 12,
  },
  learnMoreText: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
