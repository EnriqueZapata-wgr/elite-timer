/**
 * Sueño (#15 Batch 2) — pantalla editorial propia del descanso.
 *
 * Antes SUEÑO caía en /reports (hub genérico) o /health-hub. Esta pantalla se ve
 * BIEN vacía sin wearable: muestra tu ventana de sueño real (cronotipo — dato que
 * SÍ tenemos), el estado honesto de conexión y el bloque "Próximamente: ATP Sleep
 * Track" sin inventar datos ni gráficas falsas. Lista para llenarse con #16.
 *
 * 20-sep-2026, el sueño unificado y honesto:
 *  · Las noches salen de leerNochesUnificadas (sleep_nights + health_os_daily):
 *    el cliente que conectó su teléfono desde Ajustes ya no ve "Aún no vemos
 *    tu descanso" con sus noches guardadas en la otra tabla.
 *  · "No pude leer" y "no hay noches" se dicen distinto, siempre con reintentar.
 *  · La card de la plataforma tiene estado "consultando" con límite de tiempo,
 *    dice cuando falta el permiso y lleva a Ajustes › Salud del teléfono.
 *  · Al entrar se corre el import silencioso (si hay permiso, sin diálogos).
 *  · Ronda de arreglos: un permiso que no contestó no se pinta como "sin
 *    permiso" (A1); si la persona apagó la lectura desde Ajustes se dice y
 *    IMPORTAR la vuelve a encender (A2); si solo falló la sync del teléfono
 *    salen las noches guardadas y se dice (A4); ningún estado se queda sin
 *    salida a Ajustes › Salud del teléfono (A7).
 */
import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, ActivityIndicator, DeviceEventEmitter } from 'react-native';
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
import { invalidarSaludDelDia } from '@/src/hooks/useWearableToday';
import {
  hayPendientes,
  sincronizarPendientes,
} from '@/src/services/sleep/sleep-session-service';
import {
  importarNoches,
  leerNochesDeSaludResultado,
  permisosSuenoYaConcedidos,
  solicitarPermisosSueno,
} from '@/src/services/sleep/sleep-import-service';
import {
  etiquetaFuenteNoche,
  leerNochesUnificadas,
  reconciliarSuenoSilencioso,
  type Noche,
} from '@/src/services/sleep/sueno-unificado-service';
import { conLimite } from '@/src/services/sleep/sueno-unificado-core';
import {
  abrirAjustesHealthConnect,
  getHealthPlatform,
  type HealthPlatform,
} from '@/src/services/fitness/health-import-service';
import { desfaseAcostarse, etiquetaDeScore } from '@/src/services/sleep/sleep-core';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, getScoreColor, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { parseLocalDate } from '@/src/utils/date-helpers';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// MB-31B: el tenue del oscuro (#555) no alcanza contraste en claro para
// letra chica (mismo criterio que SaludHub y centro/[appKey]).
const tenue = (t: AppThemeTokens) => (t.kind === 'dark' ? t.textoTenue : t.textoSecundario);

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

/**
 * Cuánto espera la pantalla a que la plataforma conteste antes de decir que
 * no contestó. El servicio ya corta cada llamada nativa; este es el techo de
 * la pantalla para que "consultando" nunca sea eterno.
 */
const LIMITE_PLATAFORMA_MS = 8000;

/** Android: ¿ATP ya tiene el permiso de leer sueño? iOS no lo dice. */
type PermisoSueno = 'si' | 'no' | 'desconocido';

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
  // MB-31B: pantalla migrada — el scope se abre con <Screen themed> y estos
  // tokens alimentan las cards; el hero editorial (foto + gradiente) se queda
  // oscuro en los dos temas por doctrina.
  const { kind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const [noches, setNoches] = useState<Noche[]>([]);
  // "No pude leer" no es "no tienes noches": la card lo dice y ofrece reintentar.
  const [lecturaFallo, setLecturaFallo] = useState(false);
  // A4: sleep_nights contestó pero la sync del teléfono no: se muestran las
  // noches guardadas y se dice que faltan las del teléfono.
  const [lecturaParcial, setLecturaParcial] = useState(false);
  // A2: la persona apagó la lectura desde Ajustes › Salud del teléfono. El
  // import silencioso lo reporta; IMPORTAR la vuelve a encender.
  const [suenoApagado, setSuenoApagado] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [plataforma, setPlataforma] = useState<HealthPlatform | null>(null);
  // Mientras getHealthPlatform corre, la card dice "consultando" (antes decía
  // "En esta plataforma no hay lectura de sueño" con plataforma aún null).
  const [consultandoPlataforma, setConsultandoPlataforma] = useState(true);
  const [plataformaNoContesto, setPlataformaNoContesto] = useState(false);
  const [permisoSueno, setPermisoSueno] = useState<PermisoSueno>('desconocido');
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  // Reintentos: cada uno vuelve a correr el efecto de foco.
  const [intento, setIntento] = useState(0);
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
      // 20-sep-2026: las noches, unificadas (sleep_nights + health_os_daily).
      // ok:false es "no pude leer" y se dice así; ok:true con [] es "no hay".
      const lectura = await leerNochesUnificadas(user.id, 14);
      if (active) {
        setLecturaFallo(!lectura.ok);
        setLecturaParcial(lectura.ok && lectura.parcial === 'telefono');
        if (lectura.ok) setNoches(lectura.noches);
      }
      try {
        const n = await hayPendientes();
        if (active) setPendientes(n);
      } catch { /* sin cola */ }
      // Import silencioso al entrar (sin diálogos; si no hay permiso, no hace
      // nada). Corre DESPUÉS de mostrar lo que ya hay, para no retrasar la
      // pantalla, y si trajo noches nuevas se vuelve a leer.
      try {
        const r = await reconciliarSuenoSilencioso(user.id, { forzar: true });
        if (active) setSuenoApagado(r.motivo === 'apagado_por_usuario');
        if (active && r.importadas > 0) {
          const otra = await leerNochesUnificadas(user.id, 14);
          if (active && otra.ok) {
            setNoches(otra.noches);
            setLecturaFallo(false);
            setLecturaParcial(otra.parcial === 'telefono');
          }
        }
      } catch { /* fail-soft: el botón IMPORTAR sigue ahí */ }
    })();
    // La plataforma se consulta EN PARALELO (antes era la quinta llamada en
    // serie y sin límite: la card mentía mientras tanto). Con límite: si no
    // contesta, se dice "no contestó", no "no hay lectura de sueño".
    (async () => {
      setConsultandoPlataforma(true);
      setPlataformaNoContesto(false);
      try {
        const p = await conLimite<HealthPlatform | null>(getHealthPlatform(), null, LIMITE_PLATAFORMA_MS);
        if (!active) return;
        setPlataforma(p);
        setPlataformaNoContesto(p === null);
        // Android sí dice si el permiso de sueño está concedido (sin diálogo).
        // iOS no lo dice: queda 'desconocido' y el botón IMPORTAR pregunta.
        // A1: si Health Connect no contestó, también queda 'desconocido' (con
        // IMPORTAR, que re-verifica): un timeout no es "sin permiso".
        if (p?.status === 'disponible' && p.os === 'android') {
          const permiso = await permisosSuenoYaConcedidos();
          if (active) setPermisoSueno(permiso === 'no_contesto' ? 'desconocido' : permiso);
        } else if (active) {
          setPermisoSueno('desconocido');
        }
      } catch {
        if (active) { setPlataforma(null); setPlataformaNoContesto(true); }
      } finally {
        if (active) setConsultandoPlataforma(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id, intento]));

  const reintentar = useCallback(() => {
    haptic.light();
    setImportMsg(null);
    setIntento((n) => n + 1);
  }, []);

  const irASaludDelTelefono = useCallback(() => {
    haptic.light();
    router.push('/settings/salud-conexion');
  }, [router]);

  const importarDeSalud = useCallback(async () => {
    if (!user?.id || importando) return;
    haptic.light();
    setImportando(true);
    setImportMsg(null);
    try {
      // Las tres llamadas nativas (initialize, requestPermission, readRecords)
      // ya traen límite de tiempo en el servicio: el botón no se queda en "...".
      const permiso = await solicitarPermisosSueno();
      // A2: pedir el permiso desde aquí ya volvió a encender la lectura que
      // la persona había apagado en Ajustes (acción explícita).
      setSuenoApagado(false);
      if (permiso === 'dialogo_no_disponible') {
        // Binario sin delegate: el diálogo nativo crashearía. Ruta manual.
        abrirAjustesHealthConnect();
        setImportMsg('Concede "Sueño" a ATP en Health Connect y vuelve a intentar.');
        return;
      }
      if (permiso === 'no_contesto') {
        setImportMsg('Tu plataforma de salud no contestó. Intenta de nuevo en un momento.');
        return;
      }
      if (permiso !== 'ok') {
        setPermisoSueno('no');
        setImportMsg('Sin permiso de lectura no podemos ver tu sueño. Puedes concederlo desde Ajustes.');
        return;
      }
      setPermisoSueno(plataforma?.os === 'android' ? 'si' : 'desconocido');
      const lectura = await leerNochesDeSaludResultado(14);
      if (!lectura.ok) {
        // Error de lectura: se dice como error, nunca como "no tienes noches".
        setImportMsg('No pudimos leer tu sueño de la plataforma. Intenta de nuevo.');
        return;
      }
      if (lectura.noches.length === 0) {
        setImportMsg(
          plataforma?.os === 'android'
            ? 'Health Connect no tiene noches en los últimos 14 días. Si mides con un reloj Samsung, revisa que Samsung Health comparta el sueño con Health Connect.'
            : 'Salud de Apple no devolvió noches de los últimos 14 días. Apple no nos dice si es porque no hay datos o porque ATP no tiene permiso: revísalo en Salud (Perfil, Apps, ATP) y confirma que tu reloj o tu app de sueño escriba ahí.',
        );
        return;
      }
      const res = await importarNoches(user.id, lectura.noches);
      if (!res.ok) {
        setImportMsg('Leímos tus noches pero no se pudieron guardar. Intenta de nuevo.');
        return;
      }
      setImportMsg(
        res.importadas === 0
          ? 'Nada nuevo: esas noches ya estaban registradas.'
          : `${res.importadas} ${res.importadas === 1 ? 'noche importada' : 'noches importadas'}.`,
      );
      if (res.importadas > 0) {
        // Cerrar el lazo (lección CIERRE-3): que HOY vea la noche sin reabrir la app.
        invalidarSaludDelDia();
        DeviceEventEmitter.emit('day_changed');
      }
      const otra = await leerNochesUnificadas(user.id, 14);
      if (otra.ok) {
        setNoches(otra.noches);
        setLecturaFallo(false);
        setLecturaParcial(otra.parcial === 'telefono');
      }
    } finally {
      setImportando(false);
    }
  }, [user?.id, importando, plataforma?.os]);

  const sleepLabel = fmtHora(sleep);
  const wakeLabel = fmtHora(wake);
  // La noche más reciente (cualquier fuente: el núcleo garantiza una por fecha).
  const anoche = noches[0] ?? null;
  const desfase = anoche?.bedTimeISO ? desfaseAcostarse(anoche.bedTimeISO, sleep) : null;

  return (
    <Screen edges={[]} themed>
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

          {/* ANOCHE: la noche más reciente, unificada (sesión propia, import o sync del teléfono) */}
          {anoche ? (
            <Animated.View entering={FadeInUp.delay(140).springify()} style={s.dataCard}>
              <EliteText style={s.windowKicker}>ANOCHE</EliteText>
              <EliteText style={s.dataValue}>
                {anoche.durationMinutes != null ? fmtDur(anoche.durationMinutes) : '—'}
              </EliteText>
              {anoche.score != null && (
                <EliteText style={[s.dataScore, { color: getScoreColor(anoche.score) }]}>
                  {etiquetaDeScore(anoche.score)} · score {anoche.score}
                </EliteText>
              )}
              {anoche.snoreMinutes != null && anoche.snoreMinutes > 0 && (
                <EliteText style={s.dataSub}>~{anoche.snoreMinutes} min con sonido de ronquido</EliteText>
              )}
              {anoche.bedTimeISO && (
                <EliteText style={s.dataSub}>
                  Te acostaste a las {fmtHoraISO(anoche.bedTimeISO)}
                  {desfase != null && sleepLabel
                    ? desfase > 15
                      ? ` · ${desfase} min después de tu objetivo (${sleepLabel})`
                      : desfase < -15
                        ? ` · ${Math.abs(desfase)} min antes de tu objetivo`
                        : ' · a tiempo con tu objetivo'
                    : ''}
                </EliteText>
              )}
              <EliteText style={s.dataFuente}>{etiquetaFuenteNoche(anoche.fuente)}</EliteText>
            </Animated.View>
          ) : lecturaFallo ? (
            // "No pude leer" NO es "no tienes noches": se dice, con reintentar.
            <Animated.View entering={FadeInUp.delay(140).springify()} style={s.emptyCard}>
              <AppIcon name="sueno" size={22} color={tenue(t)} />
              <View style={{ flex: 1 }}>
                <EliteText style={s.emptyTitle}>No pudimos leer tus noches</EliteText>
                <EliteText style={s.emptySub}>
                  Tus datos siguen guardados; es la lectura la que no contestó. Revisa tu conexión
                  y vuelve a intentar.
                </EliteText>
              </View>
              <AnimatedPressable style={s.connectBtn} onPress={reintentar}>
                <EliteText style={s.connectBtnText}>REINTENTAR</EliteText>
              </AnimatedPressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.delay(140).springify()} style={s.emptyCard}>
              <AppIcon name="sueno" size={22} color={tenue(t)} />
              <View style={{ flex: 1 }}>
                <EliteText style={s.emptyTitle}>Aún no vemos tu descanso</EliteText>
                <EliteText style={s.emptySub}>
                  Usa el Sleep Cycle esta noche, o importa las horas de sueño que tu teléfono
                  ya mide. Sin datos no te inventamos gráficas.
                </EliteText>
              </View>
            </Animated.View>
          )}

          {/* A4: la sync del teléfono no contestó; lo guardado sí se muestra y se dice */}
          {lecturaParcial && (
            <Animated.View entering={FadeInUp.delay(150).springify()}>
              <EliteText style={s.pendientesTexto}>
                No se pudo leer la sincronización del teléfono; estas son las noches guardadas.
              </EliteText>
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
                  const min = n.durationMinutes ?? 0;
                  const h = Math.max(0.15, Math.min(1, min / 540));
                  return (
                    <View key={n.nightDate} style={s.trendCol}>
                      <EliteText style={s.trendHoras}>{(min / 60).toFixed(1)}</EliteText>
                      <View style={[s.trendBar, { height: Math.round(h * 56) }]} />
                      <EliteText style={s.trendDia}>{diaCorto(n.nightDate)}</EliteText>
                    </View>
                  );
                })}
              </View>
              {noches.some((n) => (n.snoreMinutes ?? 0) > 0) && (
                <EliteText style={s.dataSub}>
                  Ronquido detectado en {noches.filter((n) => (n.snoreMinutes ?? 0) > 0).length} de
                  tus últimas {Math.min(noches.length, 14)} noches (aproximado, por sonido).
                </EliteText>
              )}
            </Animated.View>
          )}

          {/* Importar de la plataforma de salud: estado honesto por plataforma.
              consultando → no contestó → sin módulo / sin app / sin soporte →
              sin permiso (lleva a Ajustes › Salud del teléfono) → listo. */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={s.platCard}>
            <View style={s.platHeader}>
              {consultandoPlataforma
                ? <ActivityIndicator size="small" color={REST} />
                : <Ionicons name="download-outline" size={22} color={REST} />}
              <EliteText style={s.emptyTitle}>
                {plataforma ? plataforma.nombre : 'Tu plataforma de salud'}
              </EliteText>
            </View>
            <EliteText style={s.emptySub}>
              {consultandoPlataforma
                ? 'Consultando si tu teléfono puede compartir tu sueño...'
                : plataformaNoContesto || !plataforma
                  ? 'Tu plataforma de salud no contestó. Puede estar actualizándose; intenta de nuevo en un momento.'
                  : plataforma.status === 'binario_viejo'
                    ? 'Tu versión de la app aún no trae este módulo. Llega con la próxima actualización.'
                    : plataforma.status === 'sin_app'
                      ? 'Instala o actualiza Health Connect para poder leer tu sueño. Desde Ajustes › Salud del teléfono puedes abrirlo.'
                      : plataforma.status === 'no_soportado'
                        ? 'En esta plataforma no hay lectura de sueño. Puedes usar el Sleep Cycle de abajo, o ver el detalle en Ajustes › Salud del teléfono.'
                        : permisoSueno === 'no'
                          ? `${plataforma.nombre} está listo, pero ATP todavía no tiene permiso para leer tu sueño. Se concede desde Ajustes › Salud del teléfono.`
                          : 'Trae las horas de sueño que tu teléfono ya registra. Solo lectura. Con el permiso dado, se actualiza sola cada vez que entras aquí.'}
            </EliteText>
            {!consultandoPlataforma && plataforma?.os === 'android' && plataforma.status === 'disponible' && (
              <EliteText style={s.platNota}>
                Si mides con un reloj Samsung: Samsung Health solo comparte tu sueño con Health
                Connect si lo activas dentro de Samsung Health (Ajustes › Health Connect).
              </EliteText>
            )}
            {suenoApagado && !consultandoPlataforma && plataforma?.status === 'disponible' && (
              <EliteText style={s.platNota}>
                Apagaste la lectura desde Ajustes › Salud del teléfono: por eso no se actualiza sola.
                Volver a conectar, o IMPORTAR, la vuelve a encender.
              </EliteText>
            )}
            {importMsg && <EliteText style={s.importMsg}>{importMsg}</EliteText>}
            <View style={s.platActions}>
              {!consultandoPlataforma && (plataformaNoContesto || !plataforma) && (
                <AnimatedPressable style={s.connectBtn} onPress={reintentar}>
                  <EliteText style={s.connectBtnText}>REINTENTAR</EliteText>
                </AnimatedPressable>
              )}
              {!consultandoPlataforma && plataforma?.status === 'disponible' && permisoSueno === 'no' && (
                <AnimatedPressable style={s.connectBtn} onPress={irASaludDelTelefono}>
                  <EliteText style={s.connectBtnText}>CONECTAR</EliteText>
                </AnimatedPressable>
              )}
              {!consultandoPlataforma && plataforma?.status === 'disponible' && permisoSueno !== 'no' && (
                <AnimatedPressable
                  style={[s.connectBtn, importando && { opacity: 0.5 }]}
                  onPress={() => { void importarDeSalud(); }}
                >
                  <EliteText style={s.connectBtnText}>{importando ? '...' : 'IMPORTAR'}</EliteText>
                </AnimatedPressable>
              )}
              {/* A7: SIEMPRE, también en no_soportado: nadie se queda sin salida. */}
              <AnimatedPressable onPress={irASaludDelTelefono} hitSlop={8}>
                <EliteText style={s.platLink}>Ajustes › Salud del teléfono →</EliteText>
              </AnimatedPressable>
            </View>
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
              <EliteText style={[s.blockKicker, { color: acento }]}>SLEEP CYCLE</EliteText>
              <View style={s.soonPill}><EliteText style={[s.soonPillText, { color: acento }]}>NUEVO</EliteText></View>
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
              <EliteText style={[s.cycleBtnText, { color: acento }]}>PREPARAR MI NOCHE</EliteText>
            </AnimatedPressable>
          </Animated.View>
        </View>
      </ScrollView>
    </Screen>
  );
}

// MB-31B: el hero (foto + gradiente) es superficie EDITORIAL — se queda
// oscura en los dos temas por doctrina (blanco anclado, no se tematiza). Las
// cards de abajo sí migran a tokens (makeStyles(t)).
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  hero: { width: '100%', height: 200, justifyContent: 'flex-end' },
  heroBack: { position: 'absolute', top: Spacing.xl + Spacing.md, left: Spacing.sm, zIndex: 10 },
  heroContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  heroKicker: { color: REST, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 1 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSizes.sm, marginTop: 2, lineHeight: 19 },

  windowCard: {
    backgroundColor: t.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.md, gap: 10,
  },
  windowKicker: { fontSize: 10, fontFamily: Fonts.bold, color: tenue(t), letterSpacing: 1.5 },
  windowRow: { flexDirection: 'row' },
  windowCol: { flex: 1, alignItems: 'center', gap: 4 },
  windowDivider: { width: 1, backgroundColor: t.borde },
  windowLabel: { fontSize: 10, fontFamily: Fonts.bold, color: tenue(t), letterSpacing: 1.5 },
  windowValue: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, color: t.texto },
  windowLink: { fontSize: FontSizes.xs, color: REST, fontFamily: Fonts.semiBold, textAlign: 'center' },

  dataCard: {
    backgroundColor: t.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, alignItems: 'center', gap: 4,
  },
  dataValue: { fontSize: 34, fontFamily: Fonts.extraBold, color: t.texto },
  dataSub: { fontSize: FontSizes.xs, color: tenue(t), textAlign: 'center' },
  dataScore: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  dataFuente: { fontSize: 10, fontFamily: Fonts.bold, color: tenue(t), letterSpacing: 1.5, marginTop: 2 },

  pendientesTexto: {
    fontSize: FontSizes.xs, color: tenue(t), marginTop: Spacing.xs,
    textAlign: 'center', fontStyle: 'italic',
  },

  trendCard: {
    backgroundColor: t.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, gap: 10,
  },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  trendCol: { alignItems: 'center', gap: 4 },
  trendHoras: { fontSize: 10, fontFamily: Fonts.semiBold, color: t.textoSecundario },
  trendBar: { width: 14, borderRadius: 4, backgroundColor: withOpacity(REST, 0.55) },
  trendDia: { fontSize: 9, fontFamily: Fonts.bold, color: tenue(t), letterSpacing: 1 },

  importMsg: { fontSize: FontSizes.xs, color: REST, marginTop: 4 },

  // Card de la plataforma (20-sep-2026): columna, porque ahora trae estado,
  // nota, mensaje y hasta dos acciones; la fila de antes no cabía honesta.
  platCard: {
    backgroundColor: t.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, gap: 8,
  },
  platHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  platNota: { fontSize: FontSizes.xs, color: t.textoSecundario, lineHeight: 17 },
  platActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 2 },
  platLink: { fontSize: FontSizes.xs, color: REST, fontFamily: Fonts.semiBold },

  emptyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.texto },
  emptySub: { fontSize: FontSizes.xs, color: tenue(t), marginTop: 2, lineHeight: 17 },
  connectBtn: {
    backgroundColor: withOpacity(REST, 0.15), borderWidth: 0.5, borderColor: withOpacity(REST, 0.4),
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8,
  },
  connectBtnText: { fontSize: 10, fontFamily: Fonts.bold, color: REST, letterSpacing: 1.5 },

  blockCard: {
    backgroundColor: t.card, borderRadius: Radius.card,
    padding: Spacing.md, marginTop: Spacing.sm, gap: 8,
  },
  blockKicker: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2 },
  blockBody: { fontSize: FontSizes.sm, color: t.textoSecundario, lineHeight: 21 },

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
  // El lima como TEXTO no pasa contraste en claro (regla 1) — el color va
  // inline con `acento` (lima en oscuro, tealTexto en claro).
  cycleBtnText: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2 },
  soonPill: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  soonPillText: { fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1.5 },
  soonTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.extraBold, color: t.texto },
});
