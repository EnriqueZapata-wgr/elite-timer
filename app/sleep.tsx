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
import { AppIcon } from '@/src/components/ui/AppIcon';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Screen } from '@/src/components/ui/Screen';
import { BackButton } from '@/src/components/ui/BackButton';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import {
  fetchNoches,
  hayPendientes,
  sincronizarPendientes,
  type SleepNightRow,
} from '@/src/services/sleep/sleep-session-service';
import {
  importarNoches,
  leerNochesDeSalud,
  solicitarPermisosSueno,
} from '@/src/services/sleep/sleep-import-service';
import {
  abrirAjustesHealthConnect,
  getHealthPlatform,
  type HealthPlatform,
} from '@/src/services/fitness/health-import-service';
import { desfaseAcostarse, etiquetaDeScore } from '@/src/services/sleep/sleep-core';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT_COLORS, SURFACES, getScoreColor, withOpacity } from '@/src/constants/brand';
import { parseLocalDate } from '@/src/utils/date-helpers';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// Asset editorial del pilar (require estático · Metro).
const HERO_SUENO = require('@/assets/images/habits-portal/sueno.webp');

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

/** ISO timestamptz → '11:42 pm' en hora local. */
function fmtHoraISO(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const h = d.getHours();
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
}

/** 465 → '7 h 45 min'. */
function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

/** De dónde salió la noche — siempre visible, nunca dos verdades. */
function fuenteLabel(source: string): string {
  if (source === 'sleep_cycle') return 'Medida con tu Sleep Cycle';
  if (source === 'health_connect') return 'Importada de Health Connect';
  if (source === 'healthkit') return 'Importada de Salud de Apple';
  return source;
}

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
function diaCorto(nightDate: string): string {
  try {
    return DIAS[parseLocalDate(nightDate).getDay()] ?? '';
  } catch {
    return '';
  }
}

export default function SleepScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [noches, setNoches] = useState<SleepNightRow[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [plataforma, setPlataforma] = useState<HealthPlatform | null>(null);
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [wake, setWake] = useState<string | null>(null);
  const [sleep, setSleep] = useState<string | null>(null);
  // D-2 (MB-12): fallo de red ≠ "no tienes cronotipo" — la card lo dice.
  const [chronoFailed, setChronoFailed] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      // MB-30A: noches que quedaron encoladas sin red (modo avión) se suben
      // al entrar aquí — la sesión nocturna nunca depende del internet.
      try { await sincronizarPendientes(user.id); } catch { /* fail-soft */ }
      // Ventana de sueño del cronotipo — dato real que ya tenemos sin wearable.
      try {
        const { data, error } = await supabase
          .from('user_chronotype')
          .select('wake_time, sleep_time')
          .eq('user_id', user.id)
          .maybeSingle();
        if (active) {
          if (error) {
            setChronoFailed(true);
          } else if (data) {
            setChronoFailed(false);
            setWake((data as any).wake_time ?? null);
            setSleep((data as any).sleep_time ?? null);
          }
        }
      } catch { /* sin cronotipo → solo estado de conexión */ }
      // MB-30A: las noches propias e importadas (fuente única: sleep_nights).
      try {
        const data = await fetchNoches(user.id, 14);
        if (active) setNoches(data);
      } catch { /* sin datos — estado vacío honesto */ }
      try {
        const n = await hayPendientes();
        if (active) setPendientes(n);
      } catch { /* sin cola */ }
      try {
        const p = await getHealthPlatform();
        if (active) setPlataforma(p);
      } catch { /* plataforma desconocida: la card lo dice */ }
    })();
    return () => { active = false; };
  }, [user?.id]));

  const importarDeSalud = useCallback(async () => {
    if (!user?.id || importando) return;
    haptic.light();
    setImportando(true);
    setImportMsg(null);
    try {
      const permiso = await solicitarPermisosSueno();
      if (permiso === 'dialogo_no_disponible') {
        // Binario sin delegate: el diálogo nativo crashearía — ruta manual.
        abrirAjustesHealthConnect();
        setImportMsg('Concede "Sueño" en Health Connect y vuelve a intentar.');
        return;
      }
      if (permiso !== 'ok') {
        setImportMsg('Sin permiso de lectura no podemos ver tu sueño.');
        return;
      }
      const leidas = await leerNochesDeSalud(14);
      if (leidas.length === 0) {
        setImportMsg('Tu plataforma de salud no tiene noches en los últimos 14 días.');
        return;
      }
      const res = await importarNoches(user.id, leidas);
      if (!res.ok) {
        setImportMsg('No se pudo importar. Intenta de nuevo.');
        return;
      }
      setImportMsg(
        res.importadas === 0
          ? 'Nada nuevo: esas noches ya estaban registradas.'
          : `${res.importadas} ${res.importadas === 1 ? 'noche importada' : 'noches importadas'}.`,
      );
      const data = await fetchNoches(user.id, 14);
      setNoches(data);
    } finally {
      setImportando(false);
    }
  }, [user?.id, importando]);

  const sleepLabel = fmtHora(sleep);
  const wakeLabel = fmtHora(wake);
  // La noche más reciente (cualquier fuente — la base garantiza una por fecha).
  const anoche = noches[0] ?? null;
  const desfase = anoche?.bed_time ? desfaseAcostarse(anoche.bed_time, sleep) : null;

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

          {/* D-2 (MB-12): la ventana no se pudo leer — se dice, no se omite */}
          {chronoFailed && !sleepLabel && !wakeLabel && (
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.windowCard}>
              <EliteText style={s.windowKicker}>TU VENTANA DE SUEÑO</EliteText>
              <EliteText style={s.emptySub}>
                No se pudo leer tu cronotipo. Revisa tu conexión y vuelve a entrar.
              </EliteText>
            </Animated.View>
          )}

          {/* ANOCHE — el dato propio (sleep_nights: sesión propia o import) */}
          {anoche ? (
            <Animated.View entering={FadeInUp.delay(140).springify()} style={s.dataCard}>
              <EliteText style={s.windowKicker}>ANOCHE</EliteText>
              <EliteText style={s.dataValue}>
                {anoche.duration_minutes != null ? fmtDur(anoche.duration_minutes) : '—'}
              </EliteText>
              {anoche.score != null && (
                <EliteText style={[s.dataScore, { color: getScoreColor(anoche.score) }]}>
                  {etiquetaDeScore(anoche.score)} · score {anoche.score}
                </EliteText>
              )}
              {anoche.snore_minutes != null && anoche.snore_minutes > 0 && (
                <EliteText style={s.dataSub}>~{anoche.snore_minutes} min con sonido de ronquido</EliteText>
              )}
              {anoche.bed_time && (
                <EliteText style={s.dataSub}>
                  Te acostaste a las {fmtHoraISO(anoche.bed_time)}
                  {desfase != null && sleepLabel
                    ? desfase > 15
                      ? ` · ${desfase} min después de tu objetivo (${sleepLabel})`
                      : desfase < -15
                        ? ` · ${Math.abs(desfase)} min antes de tu objetivo`
                        : ' · a tiempo con tu objetivo'
                    : ''}
                </EliteText>
              )}
              <EliteText style={s.dataFuente}>{fuenteLabel(anoche.source)}</EliteText>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.delay(140).springify()} style={s.emptyCard}>
              <AppIcon name="sueno" size={22} color={TEXT_COLORS.muted} />
              <View style={{ flex: 1 }}>
                <EliteText style={s.emptyTitle}>Aún no vemos tu descanso</EliteText>
                <EliteText style={s.emptySub}>
                  Usa el Sleep Cycle esta noche, o importa las horas de sueño que tu teléfono
                  ya mide. Sin datos no te inventamos gráficas.
                </EliteText>
              </View>
            </Animated.View>
          )}

          {/* Noches esperando conexión (modo avión): se dice, no se esconde */}
          {pendientes > 0 && (
            <Animated.View entering={FadeInUp.delay(160).springify()}>
              <EliteText style={s.pendientesTexto}>
                {pendientes === 1
                  ? '1 noche guardada en tu teléfono, esperando conexión para subirse.'
                  : `${pendientes} noches guardadas en tu teléfono, esperando conexión para subirse.`}
              </EliteText>
            </Animated.View>
          )}

          {/* EN EL TIEMPO — tendencia simple, solo con 2+ noches reales */}
          {noches.length >= 2 && (
            <Animated.View entering={FadeInUp.delay(180).springify()} style={s.trendCard}>
              <EliteText style={s.windowKicker}>TUS ÚLTIMAS NOCHES</EliteText>
              <View style={s.trendRow}>
                {[...noches].reverse().slice(-7).map((n) => {
                  const min = n.duration_minutes ?? 0;
                  const h = Math.max(0.15, Math.min(1, min / 540));
                  return (
                    <View key={n.night_date} style={s.trendCol}>
                      <EliteText style={s.trendHoras}>{(min / 60).toFixed(1)}</EliteText>
                      <View style={[s.trendBar, { height: Math.round(h * 56) }]} />
                      <EliteText style={s.trendDia}>{diaCorto(n.night_date)}</EliteText>
                    </View>
                  );
                })}
              </View>
              {noches.some((n) => (n.snore_minutes ?? 0) > 0) && (
                <EliteText style={s.dataSub}>
                  Ronquido detectado en {noches.filter((n) => (n.snore_minutes ?? 0) > 0).length} de
                  tus últimas {Math.min(noches.length, 14)} noches (aproximado, por sonido).
                </EliteText>
              )}
            </Animated.View>
          )}

          {/* Importar de la plataforma de salud — estado honesto por plataforma */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={s.emptyCard}>
            <Ionicons name="download-outline" size={22} color={REST} />
            <View style={{ flex: 1 }}>
              <EliteText style={s.emptyTitle}>
                {plataforma ? plataforma.nombre : 'Tu plataforma de salud'}
              </EliteText>
              <EliteText style={s.emptySub}>
                {plataforma?.status === 'disponible'
                  ? 'Trae las horas de sueño que tu teléfono ya registra. Solo lectura.'
                  : plataforma?.status === 'binario_viejo'
                    ? 'Tu versión de la app aún no trae este módulo. Llega con la próxima actualización.'
                    : plataforma?.status === 'sin_app'
                      ? 'Instala o actualiza Health Connect para poder leer tu sueño.'
                      : 'En esta plataforma no hay lectura de sueño.'}
              </EliteText>
              {importMsg && <EliteText style={s.importMsg}>{importMsg}</EliteText>}
            </View>
            {plataforma?.status === 'disponible' && (
              <AnimatedPressable
                style={[s.connectBtn, importando && { opacity: 0.5 }]}
                onPress={() => { void importarDeSalud(); }}
              >
                <EliteText style={s.connectBtnText}>{importando ? '...' : 'IMPORTAR'}</EliteText>
              </AnimatedPressable>
            )}
          </Animated.View>

          {/* Por qué importa (mecanismo, sin autoridad — y sin prometer lo que
              no medimos: aquí no se habla de arquitectura de la noche) */}
          <Animated.View entering={FadeInUp.delay(240).springify()} style={s.blockCard}>
            <EliteText style={[s.blockKicker, { color: REST }]}>MIENTRAS DUERMES</EliteText>
            <EliteText style={s.blockBody}>
              Dormir no es tiempo perdido: mientras duermes tu cuerpo repara músculo y tejido,
              tu cerebro archiva lo que aprendiste y tus hormonas se reajustan para el día
              siguiente. Recortarle una hora a la noche es recortarle a esa reparación.
            </EliteText>
          </Animated.View>

          {/* Sleep Cycle propio (MB-30A): el hueco que era "Próximamente" ya vive */}
          <Animated.View entering={FadeInUp.delay(260).springify()} style={s.soonCard}>
            <View style={s.soonHeader}>
              <EliteText style={[s.blockKicker, { color: ATP_BRAND.lime }]}>SLEEP CYCLE</EliteText>
              <View style={s.soonPill}><EliteText style={s.soonPillText}>NUEVO</EliteText></View>
            </View>
            <EliteText style={s.soonTitle}>Mide tu noche desde el buró</EliteText>
            <EliteText style={s.blockBody}>
              Deja el teléfono cargando junto a tu cama con la app abierta: cuenta tus horas,
              te da un score de qué tan movida estuvo la noche y te despierta dentro de tu
              ventana con una alarma que empieza bajito. Todo se procesa en tu teléfono y
              nada se graba.
            </EliteText>
            <AnimatedPressable
              style={s.cycleBtn}
              onPress={() => { haptic.light(); router.push('/sleep-session'); }}
            >
              <EliteText style={s.cycleBtnText}>PREPARAR MI NOCHE</EliteText>
            </AnimatedPressable>
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
  dataSub: { fontSize: FontSizes.xs, color: TEXT_COLORS.muted, textAlign: 'center' },
  dataScore: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  dataFuente: { fontSize: 10, fontFamily: Fonts.bold, color: TEXT_COLORS.muted, letterSpacing: 1.5, marginTop: 2 },

  pendientesTexto: {
    fontSize: FontSizes.xs, color: TEXT_COLORS.muted, marginTop: Spacing.xs,
    textAlign: 'center', fontStyle: 'italic',
  },

  trendCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, gap: 10,
  },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  trendCol: { alignItems: 'center', gap: 4 },
  trendHoras: { fontSize: 10, fontFamily: Fonts.semiBold, color: TEXT_COLORS.secondary },
  trendBar: { width: 14, borderRadius: 4, backgroundColor: withOpacity(REST, 0.55) },
  trendDia: { fontSize: 9, fontFamily: Fonts.bold, color: TEXT_COLORS.muted, letterSpacing: 1 },

  importMsg: { fontSize: FontSizes.xs, color: REST, marginTop: 4 },

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
  cycleBtn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.4), borderRadius: Radius.pill,
    paddingVertical: 10, alignItems: 'center', marginTop: 4,
  },
  cycleBtnText: { fontSize: 11, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 2 },
  soonPill: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  soonPillText: { fontSize: 9, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 1.5 },
  soonTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.extraBold, color: '#fff' },
});
