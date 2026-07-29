/**
 * MENTE — hub del pilar (Overhaul A1 + Ajuste post-overhaul).
 *
 * Doctrina DURA menú-vs-datos: el hub es SOLO navegación editorial a
 *   Meditación · Respiración · Journal · Check-in
 * más el acceso a Progreso (trofeo en el banner). Cero datos sueltos: las
 * piezas viven en cada destino y las "últimas sesiones" también (bloque
 * MenteRecentSessions dentro de Meditación/Respiración). Descanso no es
 * destino: sus piezas son una sección dentro de Meditación (Ajuste 2).
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
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MenteHubCard } from '@/src/components/mente/MenteHubCard';
import { MenteHero } from '@/src/components/mente/MenteHero';
import { CommunityPresence } from '@/src/components/community/CommunityPresence';
import {
  formatRelativeTime,
  lastActivitySubtitle,
} from '@/src/components/mente/mente-hub-core';
import { supabase } from '@/src/lib/supabase';
import { fetchJournalDates, computeJournalStreak } from '@/src/services/journal-service';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { promptForDate } from '@/src/data/checkin-prompts';
import { getLocalToday } from '@/src/utils/date-helpers';
import { BREATHING_LIBRARY } from '@/src/data/breathing-library';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { Spacing } from '@/constants/theme';

interface HubState {
  journalStreak: number;
  lastJournalAt: string | null;
  lastBreathingAt: string | null;
  lastMeditationAt: string | null;
  checkinsToday: number;
}

// Batch 3 (#7): asset editorial del pilar (require estático · Metro).
const HERO_MENTE = require('@/assets/images/health-hub/mente-avanzado.png');

// F12 (V1.5): imageBn de MenteHubCard con las portadas MJ dedicadas del pilar
// (assets/images/mente/cards — reemplazan los placeholders de intervenciones).
const CARD_ART = {
  meditacion: require('@/assets/images/mente/cards/card_meditacion.jpg'),
  respiracion: require('@/assets/images/mente/cards/card_respiracion.jpg'),
  nback: require('@/assets/images/mente/cards/card_nback.jpg'),
  journal: require('@/assets/images/mente/cards/card_journal.jpg'),
  checkin: require('@/assets/images/mente/cards/card_checkin.jpg'),
} as const;

const EMPTY: HubState = {
  journalStreak: 0,
  lastJournalAt: null,
  lastBreathingAt: null,
  lastMeditationAt: null,
  checkinsToday: 0,
};

export default function MenteHubScreen() {
  const router = useRouter();
  const [hub, setHub] = useState<HubState>(EMPTY);
  // D-2 (MB-12): falló ≠ "no tienes datos" — con error de red no se pintan
  // ceros ni "escribe tu primera entrada".
  const [hubFailed, setHubFailed] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [journalDates, journalRes, sessionsRes, checkinsRes] = await Promise.all([
        fetchJournalDates(user.id).catch(() => null),
        supabase.from('journal_entries')
          .select('journal_type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('mind_sessions')
          .select('type, template_name, duration_seconds, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('emotional_checkins')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      if (!alive) return;
      if (journalDates === null || journalRes.error || sessionsRes.error || checkinsRes.error) {
        setHubFailed(true);
        return;
      }
      setHubFailed(false);
      const journalRows = journalRes.data ?? [];
      const sessions = sessionsRes.data ?? [];
      const checkins = checkinsRes.data ?? [];

      // Ajuste 1: el hub solo necesita el "último" por tipo para los subtítulos
      // de las cards — el historial vive dentro de cada sección.
      const breathing = sessions.filter((s: any) => s.type === 'breathing');
      const meditation = sessions.filter((s: any) => s.type === 'meditation');

      setHub({
        journalStreak: computeJournalStreak(journalDates),
        lastJournalAt: (journalRows[0] as any)?.created_at ?? null,
        lastBreathingAt: (breathing[0] as any)?.created_at ?? null,
        lastMeditationAt: (meditation[0] as any)?.created_at ?? null,
        checkinsToday: checkins.filter((c: any) => new Date(c.created_at) >= todayStart).length,
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
          subtitle="Meditación · respiración · journal · emociones"
        />
        <View style={{ paddingHorizontal: Spacing.md, marginVertical: Spacing.sm }}>
          <CommunityPresence pillar="mente" />
        </View>

        <View style={s.content}>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <MenteHubCard
            title="Meditación"
            subtitle={lastActivitySubtitle('Guiadas · mantras · descanso', hub.lastMeditationAt)}
            icon="sparkles-outline"
            imageBn={CARD_ART.meditacion}
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
            imageBn={CARD_ART.respiracion}
            onPress={() => router.push('/breathing')}
            ctaLabel="Empezar sesión"
            onCta={() => router.push('/breathing')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <MenteHubCard
            title="N-Back"
            subtitle="Entrena tu memoria de trabajo · reto 20 días"
            icon="grid-outline"
            imageBn={CARD_ART.nback}
            onPress={() => router.push('/mente/nback')}
            ctaLabel="Entrenar"
            onCta={() => router.push('/mente/nback')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(190).springify()}>
          <MenteHubCard
            title="Journal"
            subtitle={hubFailed
              ? 'Tu actividad no se pudo leer. Revisa tu conexión.'
              : hub.lastJournalAt
                ? `Última entrada ${formatRelativeTime(hub.lastJournalAt).toLowerCase()}`
                : 'Escribe tu primera entrada'}
            icon="journal-outline"
            imageBn={CARD_ART.journal}
            badge={hub.journalStreak > 0 ? `🔥 ${hub.journalStreak} ${hub.journalStreak === 1 ? 'día' : 'días'}` : undefined}
            onPress={() => router.push('/journal-history')}
            ctaLabel="Nueva entrada"
            onCta={() => router.push('/journal')}
          />
        </Animated.View>

        {/* MB-10 · Track H: el check-in creció a MÓDULO (Emociones): check-in
            por la rueda + explorar el mapa + tu historia, en su propio hub. */}
        <Animated.View entering={FadeInUp.delay(240).springify()}>
          <MenteHubCard
            title="Emociones"
            subtitle={hub.checkinsToday > 0
              ? `${hub.checkinsToday} check-in${hub.checkinsToday > 1 ? 's' : ''} hoy · vuelve a escucharte`
              : promptForDate(getLocalToday())}
            icon="heart-outline"
            imageBn={CARD_ART.checkin}
            badge={hub.checkinsToday > 0 ? `${hub.checkinsToday} hoy` : undefined}
            onPress={() => router.push('/emotions')}
            ctaLabel="¿Cómo estás hoy?"
            onCta={() => router.push('/checkin')}
          />
        </Animated.View>

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
});
