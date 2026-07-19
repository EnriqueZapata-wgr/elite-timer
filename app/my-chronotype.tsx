/**
 * Mi Cronotipo (#8 Batch 2) — la vista de TU cronotipo, no el test crudo.
 *
 * La card CRONOTIPO de YO llegaba directo a /quiz/chronotype aunque el user ya
 * tuviera resultado. Esta pantalla cuenta quién eres: tu animal, qué significa
 * (mecanismo, no autoridad — doctrina #140), tu ventana wake→sleep real, y el
 * CTA para repetir el test si algo cambió. Sin cronotipo guardado, redirige al test.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Screen } from '@/src/components/ui/Screen';
import { BackButton } from '@/src/components/ui/BackButton';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { pickCronotipoImage } from '@/src/utils/yo-image-picker';
import { motherChronotype } from '@/src/services/interventions/intervention-agenda-core';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT_COLORS, SURFACES, withOpacity } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface ChronoInfo {
  emoji: string;
  name: string;
  color: string;
  /** Qué eres, en una frase. */
  headline: string;
  /** Mecanismo: por qué tu cuerpo funciona así (sin citas de autoridad). */
  meaning: string;
  /** Cómo aprovecharlo hoy, con ejemplos concretos. */
  tips: string[];
}

const CHRONO_INFO: Record<string, ChronoInfo> = {
  lion: {
    emoji: '🦁', name: 'León', color: '#EF9F27',
    headline: 'Madrugador natural',
    meaning:
      'Tu cortisol (la hormona que te enciende en la mañana) sube antes que en la mayoría: despiertas con energía sin alarma y tu pico mental llega temprano. A cambio, la energía cae fuerte en la tarde-noche.',
    tips: [
      'Agenda lo más demandante entre 8 y 12 de la mañana — ahí está tu mejor cerebro.',
      'Entrena temprano: tu cuerpo ya está listo al despertar.',
      'Protege tu hora de dormir: trasnochar te cuesta más que a otros cronotipos.',
    ],
  },
  bear: {
    emoji: '🐻', name: 'Oso', color: '#a8e02a',
    headline: 'Ritmo solar',
    meaning:
      'Tu reloj interno sigue al sol: energía estable de media mañana a media tarde, con un bajón natural después de comer. Es el cronotipo más común — el mundo laboral está diseñado para ti.',
    tips: [
      'Tu ventana de foco fuerte es de 10 de la mañana a 2 de la tarde.',
      'El bajón de las 3 pm es fisiológico, no flojera: camina 10 minutos o toma sol en vez de azúcar.',
      'Luz solar al despertar ancla tu ritmo y mejora tu sueño esa misma noche.',
    ],
  },
  wolf: {
    emoji: '🐺', name: 'Lobo', color: '#7F77DD',
    headline: 'Noctámbulo creativo',
    meaning:
      'Tu melatonina (la hormona del sueño) se libera más tarde: arrancas lento en la mañana y tu mejor energía llega en la tarde-noche. No es desorden — es tu biología.',
    tips: [
      'No pelees con tus mañanas: usa esas horas para tareas mecánicas, no creativas.',
      'Tu pico creativo es de 5 pm en adelante — agenda ahí lo importante.',
      'Corta pantallas 1 hora antes de dormir: tu melatonina tardía necesita esa ayuda extra.',
    ],
  },
  dolphin: {
    emoji: '🐬', name: 'Delfín', color: '#5B9BD5',
    headline: 'Estado temporal · sueño ligero',
    meaning:
      'Duermes ligero y tu mente tarda en apagarse — como los delfines, que descansan con medio cerebro alerta. Delfín NO es tu cronotipo de raíz: es un estado transitorio de sueño irregular que se resuelve. Debajo hay un León, un Oso o un Lobo esperando.',
    tips: [
      'Un ritual de cierre (respiración, journal) le da a tu mente la señal de apagado que le falta.',
      'Evita cafeína después de mediodía: tu sueño ligero la resiente doble.',
      'Horarios CONSISTENTES de dormir y despertar son tu palanca #1 — más que cualquier suplemento.',
    ],
  },
};

/** '07:30:00' → '7:30 am' legible (es-MX). */
function fmtHora(t?: string | null): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

export default function MyChronotypeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chrono, setChrono] = useState<string | null>(null);
  const [wake, setWake] = useState<string | null>(null);
  const [sleep, setSleep] = useState<string | null>(null);
  // P2.11 triple-audit: peak windows — las columnas YA existían en
  // user_chronotype, la pantalla simplemente no las leía.
  const [focusStart, setFocusStart] = useState<string | null>(null);
  const [focusEnd, setFocusEnd] = useState<string | null>(null);
  const [physicalStart, setPhysicalStart] = useState<string | null>(null);
  // MB-6: raw_scores del quiz → cronotipo MADRE real del Delfín (no Oso fijo).
  const [rawScores, setRawScores] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const { data } = await supabase
          .from('user_chronotype')
          .select('chronotype, wake_time, sleep_time, peak_focus_start, peak_focus_end, peak_physical_start, raw_scores')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!active) return;
        setChrono((data as any)?.chronotype ?? null);
        setWake((data as any)?.wake_time ?? null);
        setSleep((data as any)?.sleep_time ?? null);
        setFocusStart((data as any)?.peak_focus_start ?? null);
        setFocusEnd((data as any)?.peak_focus_end ?? null);
        setPhysicalStart((data as any)?.peak_physical_start ?? null);
        setRawScores((data as any)?.raw_scores ?? null);
      } catch { /* sin dato → CTA al test */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [user?.id]));

  const info = chrono ? CHRONO_INFO[chrono] : null;
  const wakeLabel = fmtHora(wake);
  const sleepLabel = fmtHora(sleep);

  if (loading) {
    return (
      <Screen>
        <View style={{ padding: Spacing.md, gap: 14 }}>
          <SkeletonLoader variant="card" height={220} />
          <SkeletonLoader variant="card" height={120} />
          <SkeletonLoader variant="card" height={160} />
        </View>
      </Screen>
    );
  }

  // Sin cronotipo guardado → esta pantalla no tiene nada que contar: al test.
  if (!info) {
    return (
      <Screen>
        <View style={s.emptyWrap}>
          <BackButton />
          <View style={s.emptyBody}>
            <EliteText style={s.emptyEmoji}>🌙</EliteText>
            <EliteText style={s.emptyTitle}>Aún no conocemos tu cronotipo</EliteText>
            <EliteText style={s.emptySub}>
              Un test de 5 minutos nos dice si eres León, Oso, Lobo o Delfín — y con eso
              ajustamos tu agenda a tu ritmo biológico real.
            </EliteText>
            <AnimatedPressable
              style={s.ctaBtn}
              onPress={() => { haptic.light(); router.push('/quiz/chronotype'); }}
            >
              <EliteText style={s.ctaBtnText}>HACER EL TEST</EliteText>
            </AnimatedPressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* Hero editorial: imagen del animal + overlay (patrón MenteHero) */}
        <ImageBackground source={pickCronotipoImage(chrono)} style={s.hero} imageStyle={{ resizeMode: 'cover' }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroBack}><BackButton color="#fff" /></View>
          <View style={s.heroContent}>
            <EliteText style={[s.heroKicker, { color: info.color }]}>TU CRONOTIPO</EliteText>
            <EliteText style={s.heroTitle}>{info.emoji} {info.name.toUpperCase()}</EliteText>
            <EliteText style={s.heroSub}>{info.headline}</EliteText>
          </View>
        </ImageBackground>

        <View style={{ paddingHorizontal: Spacing.md }}>
          {/* Tu ventana real (dato del user, no genérico) */}
          {(wakeLabel || sleepLabel) && (
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.scheduleCard}>
              <View style={s.scheduleCol}>
                <Ionicons name="sunny-outline" size={18} color={info.color} />
                <EliteText style={s.scheduleLabel}>DESPIERTAS</EliteText>
                <EliteText style={s.scheduleValue}>{wakeLabel ?? '—'}</EliteText>
              </View>
              <View style={s.scheduleDivider} />
              <View style={s.scheduleCol}>
                <Ionicons name="moon-outline" size={18} color={info.color} />
                <EliteText style={s.scheduleLabel}>DUERMES</EliteText>
                <EliteText style={s.scheduleValue}>{sleepLabel ?? '—'}</EliteText>
              </View>
            </Animated.View>
          )}

          {/* P2.11: TUS VENTANAS — dato real del user (peak_focus/physical de
              user_chronotype), no genérico. Solo se pinta si hay dato. */}
          {(focusStart || physicalStart) && (
            <Animated.View entering={FadeInUp.delay(110).springify()} style={s.blockCard}>
              <EliteText style={[s.blockKicker, { color: info.color }]}>TUS VENTANAS</EliteText>
              {focusStart && (
                <View style={s.tipRow}>
                  <View style={[s.tipDot, { backgroundColor: info.color }]} />
                  <EliteText style={s.tipText}>
                    Foco profundo: {fmtHora(focusStart)}{focusEnd ? ` – ${fmtHora(focusEnd)}` : ''} — agenda ahí lo importante.
                  </EliteText>
                </View>
              )}
              {physicalStart && (
                <View style={s.tipRow}>
                  <View style={[s.tipDot, { backgroundColor: info.color }]} />
                  <EliteText style={s.tipText}>
                    Pico físico: {fmtHora(physicalStart)} — tu mejor hora para entrenar.
                  </EliteText>
                </View>
              )}
            </Animated.View>
          )}

          {/* Qué significa (mecanismo) */}
          <Animated.View entering={FadeInUp.delay(140).springify()} style={s.blockCard}>
            <EliteText style={[s.blockKicker, { color: info.color }]}>QUÉ SIGNIFICA</EliteText>
            <EliteText style={s.blockBody}>{info.meaning}</EliteText>
          </Animated.View>

          {/* Doctrina #12 (MB-1) + MB-6: Delfín = estado TEMPORAL. No se esconde —
              se nombra, y el ancla es el cronotipo MADRE real (raw_scores del
              quiz — la misma que ahora usa el motor del plan y la agenda). */}
          {chrono === 'dolphin' && (() => {
            const mother = CHRONO_INFO[motherChronotype(rawScores)];
            return (
              <Animated.View entering={FadeInUp.delay(170).springify()} style={s.blockCard}>
                <EliteText style={[s.blockKicker, { color: '#EF9F27' }]}>TU CRONOTIPO DE BASE</EliteText>
                <EliteText style={s.blockBody}>
                  Hoy estás en patrón Delfín — es un estado, no lo que eres. Tu cronotipo
                  de base es {mother.name} {mother.emoji}. Vamos hacia allá: tu plan ya usa
                  el ancla del {mother.name} — horarios estables de sueño, luz solar temprano
                  y rutina de cierre. Cuando lleves 2-3 semanas durmiendo mejor, repite el
                  test para confirmarlo.
                </EliteText>
              </Animated.View>
            );
          })()}

          {/* Cómo aprovecharlo (ejemplos concretos) */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={s.blockCard}>
            <EliteText style={[s.blockKicker, { color: info.color }]}>CÓMO APROVECHARLO</EliteText>
            {info.tips.map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <View style={[s.tipDot, { backgroundColor: info.color }]} />
                <EliteText style={s.tipText}>{tip}</EliteText>
              </View>
            ))}
          </Animated.View>

          {/* La agenda ya usa esto */}
          <Animated.View entering={FadeInUp.delay(260).springify()} style={s.noteCard}>
            <Ionicons name="calendar-outline" size={16} color={ATP_BRAND.lime} />
            <EliteText style={s.noteText}>
              Tu agenda del HOY ya usa este cronotipo para acomodar tus horarios
              (luz solar, suplementos, hora de dormir).
            </EliteText>
          </Animated.View>

          {/* Repetir test */}
          <AnimatedPressable
            style={s.retakeBtn}
            onPress={() => { haptic.light(); router.push('/quiz/chronotype'); }}
          >
            <Ionicons name="refresh-outline" size={16} color={TEXT_COLORS.secondary} />
            <EliteText style={s.retakeText}>Repetir el test (5 min)</EliteText>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { width: '100%', height: 220, justifyContent: 'flex-end' },
  heroBack: { position: 'absolute', top: Spacing.xl + Spacing.md, left: Spacing.sm, zIndex: 10 },
  heroContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  heroKicker: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 1 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSizes.sm, marginTop: 2 },

  scheduleCard: {
    flexDirection: 'row', backgroundColor: SURFACES.card, borderRadius: Radius.card,
    paddingVertical: Spacing.md, marginTop: Spacing.md,
  },
  scheduleCol: { flex: 1, alignItems: 'center', gap: 4 },
  scheduleDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  scheduleLabel: { fontSize: 10, fontFamily: Fonts.bold, color: TEXT_COLORS.muted, letterSpacing: 1.5 },
  scheduleValue: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, color: '#fff' },

  blockCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, gap: 8,
  },
  blockKicker: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2 },
  blockBody: { fontSize: FontSizes.sm, color: TEXT_COLORS.secondary, lineHeight: 21 },
  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  tipText: { flex: 1, fontSize: FontSizes.sm, color: TEXT_COLORS.secondary, lineHeight: 21 },

  noteCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.25),
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  noteText: { flex: 1, fontSize: FontSizes.xs, color: TEXT_COLORS.secondary, lineHeight: 18 },

  retakeBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, marginTop: Spacing.sm,
  },
  retakeText: { fontSize: FontSizes.sm, color: TEXT_COLORS.secondary, fontFamily: Fonts.semiBold },

  emptyWrap: { flex: 1, padding: Spacing.md },
  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: Spacing.lg },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, color: '#fff', textAlign: 'center' },
  emptySub: { fontSize: FontSizes.sm, color: TEXT_COLORS.secondary, textAlign: 'center', lineHeight: 21 },
  ctaBtn: {
    marginTop: Spacing.md, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
  },
  ctaBtnText: { color: '#0A0A0A', fontFamily: Fonts.extraBold, fontSize: FontSizes.sm, letterSpacing: 2 },
});
