/**
 * Sueño (#15 Batch 2) — pantalla editorial propia del descanso.
 *
 * Antes SUEÑO caía en /reports (hub genérico) o /health-hub. Esta pantalla se ve
 * BIEN vacía sin wearable: muestra tu ventana de sueño real (cronotipo — dato que
 * SÍ tenemos), el estado honesto de conexión y el bloque "Próximamente: ATP Sleep
 * Track" sin inventar datos ni gráficas falsas. Lista para llenarse con #16.
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
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { isWearableAvailable, getWearableDataForDate, type WearableData } from '@/src/services/wearable-service';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT_COLORS, SURFACES, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// Asset editorial del pilar (require estático · Metro).
const HERO_SUENO = require('@/assets/images/habits-portal/sueno.jpg');

const REST = '#5B9BD5'; // acento descanso (azul suave, no punitivo)

/** '23:00:00' → '11:00 pm' legible. */
function fmtHora(t?: string | null): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

export default function SleepScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [wearable, setWearable] = useState<WearableData | null>(null);
  const [wake, setWake] = useState<string | null>(null);
  const [sleep, setSleep] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      // Ventana de sueño del cronotipo — dato real que ya tenemos sin wearable.
      try {
        const { data } = await supabase
          .from('user_chronotype')
          .select('wake_time, sleep_time')
          .eq('user_id', user.id)
          .maybeSingle();
        if (active && data) {
          setWake((data as any).wake_time ?? null);
          setSleep((data as any).sleep_time ?? null);
        }
      } catch { /* sin cronotipo → solo estado de conexión */ }
      // Wearable: si hay datos de hoy, mostrarlos (fail-soft).
      try {
        if (await isWearableAvailable()) {
          const data = await getWearableDataForDate(getLocalToday());
          if (active && data) setWearable(data);
        }
      } catch { /* sin wearable — estado vacío honesto */ }
    })();
    return () => { active = false; };
  }, [user?.id]));

  const sleepLabel = fmtHora(sleep);
  const wakeLabel = fmtHora(wake);
  const sleepHours = wearable?.sleep?.totalHours ?? null;

  return (
    <Screen edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {/* Hero editorial (patrón MenteHero: imagen + overlay + acento del pilar) */}
        <ImageBackground source={HERO_SUENO} style={s.hero} imageStyle={{ resizeMode: 'cover' }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroBack}><BackButton color="#fff" /></View>
          <View style={s.heroContent}>
            <EliteText style={s.heroKicker}>DESCANSO Y RECUPERACIÓN</EliteText>
            <EliteText style={s.heroTitle}>Sueño</EliteText>
            <EliteText style={s.heroSub}>
              Dormir bien no es tiempo perdido: es cuando tu cuerpo repara y tu cerebro consolida.
            </EliteText>
          </View>
        </ImageBackground>

        <View style={{ paddingHorizontal: Spacing.md }}>
          {/* Tu ventana de sueño (cronotipo) — dato real sin wearable */}
          {(sleepLabel || wakeLabel) && (
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.windowCard}>
              <EliteText style={s.windowKicker}>TU VENTANA DE SUEÑO · SEGÚN TU CRONOTIPO</EliteText>
              <View style={s.windowRow}>
                <View style={s.windowCol}>
                  <Ionicons name="moon-outline" size={18} color={REST} />
                  <EliteText style={s.windowLabel}>A DORMIR</EliteText>
                  <EliteText style={s.windowValue}>{sleepLabel ?? '—'}</EliteText>
                </View>
                <View style={s.windowDivider} />
                <View style={s.windowCol}>
                  <Ionicons name="sunny-outline" size={18} color="#EF9F27" />
                  <EliteText style={s.windowLabel}>DESPERTAR</EliteText>
                  <EliteText style={s.windowValue}>{wakeLabel ?? '—'}</EliteText>
                </View>
              </View>
              <AnimatedPressable onPress={() => { haptic.light(); router.push('/my-chronotype'); }}>
                <EliteText style={s.windowLink}>Ver mi cronotipo →</EliteText>
              </AnimatedPressable>
            </Animated.View>
          )}

          {/* Estado de conexión: dato real si hay wearable, estado vacío honesto si no */}
          {sleepHours != null ? (
            <Animated.View entering={FadeInUp.delay(140).springify()} style={s.dataCard}>
              <EliteText style={s.windowKicker}>ANOCHE</EliteText>
              <EliteText style={s.dataValue}>{Number(sleepHours).toFixed(1)} h</EliteText>
              <EliteText style={s.dataSub}>Registradas por {wearable?.source ?? 'tu wearable'}</EliteText>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.delay(140).springify()} style={s.emptyCard}>
              <Ionicons name="watch-outline" size={22} color={TEXT_COLORS.muted} />
              <View style={{ flex: 1 }}>
                <EliteText style={s.emptyTitle}>Aún no vemos tu descanso</EliteText>
                <EliteText style={s.emptySub}>
                  Conecta tu Apple Watch o Health Connect para ver tus horas y fases de sueño aquí.
                </EliteText>
              </View>
              <AnimatedPressable
                style={s.connectBtn}
                onPress={() => { haptic.light(); router.push('/settings'); }}
              >
                <EliteText style={s.connectBtnText}>CONECTAR</EliteText>
              </AnimatedPressable>
            </Animated.View>
          )}

          {/* Por qué importa (mecanismo, sin autoridad) */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={s.blockCard}>
            <EliteText style={[s.blockKicker, { color: REST }]}>MIENTRAS DUERMES</EliteText>
            <EliteText style={s.blockBody}>
              Cada noche tu cuerpo recorre 4-5 ciclos de ~90 minutos: el sueño profundo repara
              músculo y tejido, y el sueño REM (la fase de los sueños) ordena lo que aprendiste
              en el día. Cortar un ciclo a la mitad — dormir 6 horas en vez de 7.5 — es despertar
              a media reparación.
            </EliteText>
          </Animated.View>

          {/* Próximamente — honesto, sin prometer lo que no hay */}
          <Animated.View entering={FadeInUp.delay(260).springify()} style={s.soonCard}>
            <View style={s.soonHeader}>
              <EliteText style={[s.blockKicker, { color: ATP_BRAND.lime }]}>PRÓXIMAMENTE</EliteText>
              <View style={s.soonPill}><EliteText style={s.soonPillText}>EN DESARROLLO</EliteText></View>
            </View>
            <EliteText style={s.soonTitle}>ATP Sleep Track</EliteText>
            <EliteText style={s.blockBody}>
              Tu arquitectura de sueño ciclo por ciclo, cruzada con tu cronotipo: a qué hora
              dormirte para despertar al final de un ciclo (no a la mitad), y cómo tu descanso
              mueve tu energía del día siguiente.
            </EliteText>
          </Animated.View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { width: '100%', height: 200, justifyContent: 'flex-end' },
  heroBack: { position: 'absolute', top: Spacing.xl + Spacing.md, left: Spacing.sm, zIndex: 10 },
  heroContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  heroKicker: { color: REST, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 1 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSizes.sm, marginTop: 2, lineHeight: 19 },

  windowCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.md, gap: 10,
  },
  windowKicker: { fontSize: 10, fontFamily: Fonts.bold, color: TEXT_COLORS.muted, letterSpacing: 1.5 },
  windowRow: { flexDirection: 'row' },
  windowCol: { flex: 1, alignItems: 'center', gap: 4 },
  windowDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  windowLabel: { fontSize: 10, fontFamily: Fonts.bold, color: TEXT_COLORS.muted, letterSpacing: 1.5 },
  windowValue: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, color: '#fff' },
  windowLink: { fontSize: FontSizes.xs, color: REST, fontFamily: Fonts.semiBold, textAlign: 'center' },

  dataCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, alignItems: 'center', gap: 4,
  },
  dataValue: { fontSize: 34, fontFamily: Fonts.extraBold, color: '#fff' },
  dataSub: { fontSize: FontSizes.xs, color: TEXT_COLORS.muted },

  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#fff' },
  emptySub: { fontSize: FontSizes.xs, color: TEXT_COLORS.muted, marginTop: 2, lineHeight: 17 },
  connectBtn: {
    backgroundColor: withOpacity(REST, 0.15), borderWidth: 0.5, borderColor: withOpacity(REST, 0.4),
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8,
  },
  connectBtnText: { fontSize: 10, fontFamily: Fonts.bold, color: REST, letterSpacing: 1.5 },

  blockCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, gap: 8,
  },
  blockKicker: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2 },
  blockBody: { fontSize: FontSizes.sm, color: TEXT_COLORS.secondary, lineHeight: 21 },

  soonCard: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.05), borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.2),
    padding: Spacing.md, marginTop: Spacing.sm, gap: 8,
  },
  soonHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soonPill: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  soonPillText: { fontSize: 9, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 1.5 },
  soonTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.extraBold, color: '#fff' },
});
