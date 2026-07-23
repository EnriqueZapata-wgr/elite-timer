/**
 * MENTE — hub del pilar (Overhaul Mente A1: doctrina menú-vs-datos).
 *
 * El hub es SOLO navegación editorial a los destinos del pilar:
 *   Meditación · Respiración · Descanso · Journal · Check-in
 * más el acceso a Progreso (trofeo en el banner). Cero piezas de audio
 * sueltas aquí — el catálogo vive DENTRO de cada destino.
 *
 * A3: banner superior fijo (back + home + electrones) con blur al scrollear
 * (StickyPillarBanner); los flotantes home/ARGOS se auto-ocultan en el pilar.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MenteHubCard } from '@/src/components/mente/MenteHubCard';
import { MenteHero } from '@/src/components/mente/MenteHero';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import {
  ACTIVITY_META,
  formatDuration,
  formatRelativeTime,
  lastActivitySubtitle,
  mergeRecentActivity,
  type MenteActivity,
} from '@/src/components/mente/mente-hub-core';
import { supabase } from '@/src/lib/supabase';
import { fetchJournalDates, computeJournalStreak } from '@/src/services/journal-service';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { promptForDate } from '@/src/data/checkin-prompts';
import { getLocalToday } from '@/src/utils/date-helpers';
import { BREATHING_LIBRARY } from '@/src/data/breathing-library';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface HubState {
  journalStreak: number;
  lastJournalAt: string | null;
  lastBreathingAt: string | null;
  lastMeditationAt: string | null;
  checkinsToday: number;
  recent: MenteActivity[];
}

// Batch 3 (#7): asset editorial del pilar (require estático · Metro).
const HERO_MENTE = require('@/assets/images/health-hub/mente-avanzado.png');

const EMPTY: HubState = {
  journalStreak: 0,
  lastJournalAt: null,
  lastBreathingAt: null,
  lastMeditationAt: null,
  checkinsToday: 0,
  recent: [],
};

export default function MenteHubScreen() {
  const router = useRouter();
  const [hub, setHub] = useState<HubState>(EMPTY);
  const [scrolled, setScrolled] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [journalDates, journalRows, sessions, checkins] = await Promise.all([
        fetchJournalDates(user.id).catch(() => [] as string[]),
        supabase.from('journal_entries')
          .select('journal_type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => data ?? []),
        supabase.from('mind_sessions')
          .select('type, template_name, duration_seconds, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data }) => data ?? []),
        supabase.from('emotional_checkins')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data }) => data ?? []),
      ]);
      if (!alive) return;

      const breathing = sessions.filter((s: any) => s.type === 'breathing');
      const meditation = sessions.filter((s: any) => s.type === 'meditation');

      const recent = mergeRecentActivity([
        ...sessions
          .filter((s: any) => s.type === 'breathing' || s.type === 'meditation')
          .map((s: any): MenteActivity => ({
            kind: s.type,
            label: s.template_name || ACTIVITY_META[s.type as 'breathing' | 'meditation'].label,
            at: s.created_at,
            durationSeconds: s.duration_seconds ?? undefined,
          })),
        ...journalRows.map((j: any): MenteActivity => ({
          kind: 'journal', label: 'Journal', at: j.created_at,
        })),
        ...checkins.map((c: any): MenteActivity => ({
          kind: 'checkin', label: 'Check-in', at: c.created_at,
        })),
      ]);

      setHub({
        journalStreak: computeJournalStreak(journalDates),
        lastJournalAt: (journalRows[0] as any)?.created_at ?? null,
        lastBreathingAt: (breathing[0] as any)?.created_at ?? null,
        lastMeditationAt: (meditation[0] as any)?.created_at ?? null,
        checkinsToday: checkins.filter((c: any) => new Date(c.created_at) >= todayStart).length,
        recent,
      });
    })();
    return () => { alive = false; };
  }, []));

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      {/* A3: banner fijo del pilar (back + home + electrones) con blur al
          scrollear. El trofeo de Progreso viaja aquí como acción extra. */}
      <StickyPillarBanner
        scrolled={scrolled}
        onBack={() => router.back()}
        rightExtra={
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push('/mente/progreso'); }}
            style={s.progressBtn}
          >
            <Ionicons name="trophy-outline" size={18} color={ATP_BRAND.lime} />
          </AnimatedPressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
      >
        {/* Hero editorial full-bleed — pasa por debajo del banner transparente. */}
        <MenteHero
          image={HERO_MENTE}
          kicker="TU PILAR"
          title="Mente"
          subtitle="Meditación · respiración · descanso · journal · check-in"
        />
        <View style={{ paddingHorizontal: Spacing.md, marginVertical: Spacing.sm }}>
          <CommunityPresence pillar="mente" />
        </View>

        <View style={s.content}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <MenteHubCard
            title="Meditación"
            subtitle={lastActivitySubtitle('Guiadas y en silencio', hub.lastMeditationAt)}
            icon="sparkles-outline"
            onPress={() => router.push('/meditation')}
            ctaLabel="Empezar"
            onCta={() => router.push('/meditation')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90).springify()}>
          <MenteHubCard
            title="Respiración"
            subtitle={lastActivitySubtitle(`${BREATHING_LIBRARY.length} técnicas`, hub.lastBreathingAt)}
            icon="leaf-outline"
            onPress={() => router.push('/breathing')}
            ctaLabel="Empezar sesión"
            onCta={() => router.push('/breathing')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <MenteHubCard
            title="Descanso"
            subtitle="NSDR · pausas · sueño profundo"
            icon="moon-outline"
            onPress={() => router.push('/mente/descanso')}
            ctaLabel="Explorar"
            onCta={() => router.push('/mente/descanso')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(190).springify()}>
          <MenteHubCard
            title="Journal"
            subtitle={hub.lastJournalAt
              ? `Última entrada ${formatRelativeTime(hub.lastJournalAt).toLowerCase()}`
              : 'Escribe tu primera entrada'}
            icon="journal-outline"
            badge={hub.journalStreak > 0 ? `🔥 ${hub.journalStreak} ${hub.journalStreak === 1 ? 'día' : 'días'}` : undefined}
            onPress={() => router.push('/journal-history')}
            ctaLabel="Nueva entrada"
            onCta={() => router.push('/journal')}
          />
        </Animated.View>

        {/* Check-in compacto */}
        <Animated.View entering={FadeInUp.delay(240).springify()}>
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push('/checkin'); }}
            style={s.checkinCard}
          >
            <View style={s.checkinLeft}>
              <EliteText style={s.checkinTitle}>¿Cómo estás hoy?</EliteText>
              <EliteText style={s.checkinSub}>
                {hub.checkinsToday > 0
                  ? `${hub.checkinsToday} check-in${hub.checkinsToday > 1 ? 's' : ''} hoy · registra otro momento`
                  : promptForDate(getLocalToday())}
              </EliteText>
            </View>
            <View style={s.checkinDot}>
              <Ionicons name="heart" size={18} color="#000" />
            </View>
          </AnimatedPressable>
        </Animated.View>

        {/* Últimas sesiones */}
        {hub.recent.length > 0 && (
          <Animated.View entering={FadeInUp.delay(290).springify()}>
            <EliteText style={s.sectionLabel}>ÚLTIMAS SESIONES</EliteText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.timeline}>
              {hub.recent.map((a, i) => (
                <View key={`${a.kind}-${a.at}-${i}`} style={s.miniCard}>
                  <Ionicons name={ACTIVITY_META[a.kind].icon as any} size={16} color={ATP_BRAND.lime} />
                  <EliteText style={s.miniKind}>{ACTIVITY_META[a.kind].label}</EliteText>
                  <EliteText style={s.miniMeta} numberOfLines={1}>
                    {[formatRelativeTime(a.at), formatDuration(a.durationSeconds)].filter(Boolean).join(' · ')}
                  </EliteText>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  progressBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: Spacing.md },

  checkinCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg,
    borderColor: withOpacity(ATP_BRAND.lime, 0.25),
    borderWidth: 1, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  checkinLeft: { flex: 1 },
  checkinTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: TEXT.primary },
  checkinSub: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, marginTop: 2 },
  checkinDot: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },

  sectionLabel: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold, color: TEXT.secondary,
    textTransform: 'uppercase', marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  timeline: { gap: Spacing.sm, paddingRight: Spacing.md },
  miniCard: {
    width: 128, backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border,
    borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.sm, gap: 4,
  },
  miniKind: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  miniMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary },
});
