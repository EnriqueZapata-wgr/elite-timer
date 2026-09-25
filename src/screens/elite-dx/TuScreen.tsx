/**
 * TuScreen: la sala TÚ de la app Elite DX (25-sep-2026, APP_ELITE_DX).
 * La monta app/(tabs)/tu.tsx.
 *
 * Qué junta: lo que es de la persona y no de su programa. Su servicio, la
 * salida humana (Enrique), las herramientas que su programa usa y la cuenta.
 * Con esto la sala ATP (kit, el lanzador de 35 apps) puede salir del tab bar
 * sin dejar ninguna herramienta sin puerta.
 *
 * Reglas que se respetan aquí sin reescribirlas:
 *  - Candados: `visibleApps` + la misma lectura de nivel que kit.tsx. Con
 *    VENTA_AL_PUBLICO en false, nada de lo que se enseña aquí se vende.
 *  - Ciclo: el mismo gate que kit.tsx (perfil femenino, o modo del ciclo
 *    instalado, o perfil ilegible con Ciclo ya instalado). Nunca se adivina el
 *    sexo: sin perfil leído, Ciclo no aparece y se dice que no se pudo leer.
 *  - Consola: la misma puerta que Ajustes (`isAdmin`). Es solo interfaz; lo
 *    que protege los datos es RLS (coach_clients).
 */
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppTile } from '@/src/components/atp/AppTile';
import { AppIcon, type AppIconName } from '@/src/components/ui/AppIcon';
import { destinoCandado } from '@/src/components/ui/CandadoNivel';
import { EscribirleCoach } from '@/src/components/elite-dx/EscribirleCoach';
import { useColchonOrbe } from '@/src/components/argos/useColchonOrbe';
import { paddingBottomConColchon } from '@/src/components/argos/argos-floating-core';
import { useAuth } from '@/src/contexts/auth-context';
import { useAppTheme } from '@/src/contexts/theme-context';
import { useSubscription } from '@/src/hooks/useSubscription';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { isAdmin } from '@/src/constants/admin-config';
import {
  visibleApps, SECTION_LABELS, SECTION_ORDER, type AppEntry, type AppSection,
} from '@/src/constants/app-registry';
import { getCycleAppMode } from '@/src/services/app-mode-service';
import { getInstallPrefs } from '@/src/services/hoy/install-service';
import type { InstallPrefs } from '@/src/services/hoy/install-core';
import { recordOpen } from '@/src/services/atp-room-store';
import {
  fetchOrigenMembresia, type OrigenMembresiaLectura,
} from '@/src/services/subscription/subscription-service';
import { etiquetaMembresia } from '@/src/services/subscription/tier-logic';
import { herramientasDeTu, lineaServicio } from '@/src/services/elite-dx/progreso-core';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

/** Igual que formatDate de app/settings/subscription.tsx: la fecha que se lee
 * aquí tiene que ser la misma que la persona encuentra al tocar la fila. */
function fechaServicio(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TuScreen() {
  const t = useAppTheme().tokens;
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const colchon = useColchonOrbe();

  // Nombre como lo arma Ajustes (full_name de user_metadata). Sin nombre no
  // se inventa uno: queda solo el correo.
  const fullName: unknown = user?.user_metadata?.full_name;
  const nombreCompleto = typeof fullName === 'string' ? fullName.trim() : '';

  // ── Nivel y servicio ──
  const {
    tier, tieneEvaluacionElite, evaluacionEliteNoSePudoLeer,
    isLoading: nivelCargando, nivelNoSePudoLeer,
  } = useSubscription();
  const [origen, setOrigen] = useState<OrigenMembresiaLectura | null>(null);
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let vivo = true;
    fetchOrigenMembresia(userId).then((o) => { if (vivo) setOrigen(o); });
    return () => { vivo = false; };
  }, [userId, tier]));

  const linea = lineaServicio({
    cargando: nivelCargando || (Boolean(userId) && origen === null),
    ilegible: nivelNoSePudoLeer,
    etiqueta: etiquetaMembresia(tier),
    pagado: tier !== 'free',
    hastaTexto: origen && !origen.noSePudoLeer && origen.expiresAt ? fechaServicio(origen.expiresAt) : null,
  });

  // ── Gate del ciclo: la misma lectura y la misma regla que kit.tsx ──
  // Diferencia a propósito: aquí NO se llama seedInitialApps. Sembrar es una
  // escritura one-shot y le toca a la sala que la inventó, no a esta.
  const [isFemale, setIsFemale] = useState(false);
  const [cycleModeSet, setCycleModeSet] = useState(false);
  const [perfilFallo, setPerfilFallo] = useState(false);
  const [perfilIntento, setPerfilIntento] = useState(0);
  // 25-sep-2026 (revisión en frío): lo instalado se lee APARTE del perfil y en
  // cada foco, como `refresh` de kit.tsx. Antes solo se leía después de que el
  // perfil fallara, y el aviso parpadeaba mientras llegaba. null = aún sin leer
  // o lectura fallida: igual que kit, eso cuenta como "Ciclo no instalado".
  const [installPrefs, setInstallPrefs] = useState<InstallPrefs | null>(null);
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let vivo = true;
    getInstallPrefs(userId)
      .then((p) => { if (vivo) setInstallPrefs(p); })
      .catch((e) => { logWarn('[tu] prefs lanzó', e); });
    return () => { vivo = false; };
  }, [userId]));
  const cicloInstalado = installPrefs?.installedApps.includes('ciclo') ?? false;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const [{ data, error }, mode] = await Promise.all([
          supabase.from('client_profiles').select('biological_sex').eq('user_id', userId).maybeSingle(),
          getCycleAppMode(userId),
        ]);
        if (!alive) return;
        setCycleModeSet(mode != null);
        if (error) {
          logWarn('[tu] perfil no se pudo leer', error);
          setPerfilFallo(true);
        } else {
          setPerfilFallo(false);
          // Sin fila no se sabe el sexo: queda en false (Ciclo fuera), igual que kit.
          setIsFemale((data as { biological_sex?: string | null } | null)?.biological_sex === 'female');
        }
      } catch (e) {
        if (!alive) return;
        logWarn('[tu] perfil lanzó', e);
        setPerfilFallo(true);
      }
    })();
    return () => { alive = false; };
  }, [userId, perfilIntento]);

  // Mientras el nivel carga o no se pudo leer, no hay candados (doctrina de
  // kit.tsx: ante la duda se abre, para no cerrarle nada a quien pagó).
  const nivelIncierto = nivelCargando || nivelNoSePudoLeer;
  const apps = useMemo(
    () => visibleApps(
      isFemale || cycleModeSet || (perfilFallo && cicloInstalado),
      nivelIncierto ? 'elite' : tier,
      tieneEvaluacionElite || evaluacionEliteNoSePudoLeer,
    ),
    [isFemale, cycleModeSet, perfilFallo, cicloInstalado, nivelIncierto, tier, tieneEvaluacionElite, evaluacionEliteNoSePudoLeer],
  );
  const herramientas = useMemo(() => herramientasDeTu(apps), [apps]);
  const grupos = useMemo(() => {
    const out: { section: AppSection; apps: typeof herramientas }[] = [];
    for (const sec of SECTION_ORDER) {
      const deSec = herramientas.filter((a) => a.section === sec);
      if (deSec.length > 0) out.push({ section: sec, apps: deSec });
    }
    return out;
  }, [herramientas]);

  const candadoDe = (app: AppEntry & { bloqueada: boolean }) =>
    (app.minTier && app.bloqueada ? { appKey: app.key, nivel: app.minTier } : null);

  const abrir = (app: AppEntry & { bloqueada: boolean }) => {
    // Igual que kit.tsx: bloqueada va al candado y no cuenta como uso.
    const candado = candadoDe(app);
    if (candado) { router.push(destinoCandado(candado.appKey, candado.nivel)); return; }
    void recordOpen(app.key);
    router.push(app.route);
  };

  const ir = (ruta: Href) => { haptic.light(); router.push(ruta); };

  return (
    <TabScreen themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: paddingBottomConColchon(120, colchon) }]}
      >
        <View style={s.header}>
          <EliteText style={[s.eyebrow, { color: acento }]}>TU CUENTA</EliteText>
          <EliteText style={[s.title, { color: t.texto }]}>TÚ</EliteText>
          {nombreCompleto ? <EliteText style={s.nombre}>{nombreCompleto}</EliteText> : null}
          {user?.email ? <EliteText style={s.correo}>{user.email}</EliteText> : null}
        </View>

        {/* ── 1. TU SERVICIO ── */}
        <EliteText style={s.seccion}>TU SERVICIO</EliteText>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <Fila
            icono="shield-checkmark-outline"
            titulo="Tu servicio"
            linea={linea ?? 'Servicio contratado, vigencia y contacto'}
            onPress={() => ir('/settings/subscription')}
            t={t} s={s} acento={acento}
          />
        </Animated.View>

        {/* ── 2. Escríbele a Enrique ── */}
        <View style={s.coach}>
          <EscribirleCoach nombre={nombreCompleto || null} />
        </View>

        {/* ── 3. HERRAMIENTAS ── */}
        <EliteText style={s.seccion}>HERRAMIENTAS</EliteText>
        {grupos.map((g) => (
          <View key={g.section}>
            <EliteText style={s.grupo}>{SECTION_LABELS[g.section]}</EliteText>
            <View style={s.grid}>
              {g.apps.map((app) => (
                <View key={app.key} style={s.tileSlot}>
                  <AppTile
                    icon={app.icon}
                    label={app.label}
                    section={app.section}
                    onPress={() => abrir(app)}
                    candado={candadoDe(app)}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        {/* 25-sep-2026 (revisión en frío): el aviso es el de kit.tsx, palabra por
            palabra y con sus dos ramas. No le dice a nadie "Ciclo no aparece":
            con el perfil caído no se sabe si Ciclo le toca, y a un hombre no
            se le habla de un Ciclo que nunca iba a ver. Reintentar siempre. */}
        {perfilFallo && (
          <View style={s.aviso}>
            <EliteText style={[s.avisoTexto, s.avisoTitulo]}>No pudimos leer tu perfil</EliteText>
            <EliteText style={s.avisoTexto}>
              {cicloInstalado
                ? 'Tus funciones siguen aquí. Revisa tu conexión.'
                : 'Alguna función (como Ciclo) puede faltar hasta que se vuelva a leer.'}
            </EliteText>
            <AnimatedPressable
              onPress={() => { haptic.light(); setPerfilIntento((n) => n + 1); }}
              style={[s.boton, { borderColor: t.borde }]}
              accessibilityRole="button"
              accessibilityLabel="Reintentar la lectura de tu perfil"
            >
              <EliteText style={[s.botonTexto, { color: t.texto }]}>Reintentar</EliteText>
            </AnimatedPressable>
          </View>
        )}

        {/* ── 4. CUENTA ── */}
        <EliteText style={s.seccion}>CUENTA</EliteText>
        <Fila
          appIcon="ajustes"
          titulo="Ajustes"
          linea="Tu perfil y las preferencias de la app"
          onPress={() => ir('/settings')}
          t={t} s={s} acento={acento}
        />
        {/* La misma puerta que Ajustes (app/settings.tsx): isAdmin, síncrono. */}
        {isAdmin(userId) && (
          <Fila
            icono="people-outline"
            titulo="Consola"
            linea="Tus clientes: señal, adherencia y pendientes"
            onPress={() => ir('/consola')}
            t={t} s={s} acento={acento}
          />
        )}
      </ScrollView>
    </TabScreen>
  );
}

type Estilos = ReturnType<typeof makeStyles>;

// Ajustes lleva su glifo del sistema de iconos (AppIcon 'ajustes', el mismo
// que en el registro); las filas sin app propia usan Ionicons, como Ajustes.
function Fila({ icono, appIcon, titulo, linea, onPress, t, s, acento }: {
  icono?: ComponentProps<typeof Ionicons>['name'];
  appIcon?: AppIconName;
  titulo: string; linea: string; onPress: () => void; t: AppThemeTokens; s: Estilos; acento: string;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={s.fila} accessibilityRole="button" accessibilityLabel={titulo}>
      <View style={[s.filaIcono, { backgroundColor: withOpacity(acento, 0.12) }]}>
        {appIcon
          ? <AppIcon name={appIcon} size={18} color={acento} />
          : <Ionicons name={icono ?? 'ellipse-outline'} size={18} color={acento} />}
      </View>
      <View style={{ flex: 1 }}>
        <EliteText style={s.filaTitulo}>{titulo}</EliteText>
        <EliteText style={s.filaLinea} numberOfLines={1}>{linea}</EliteText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
    </AnimatedPressable>
  );
}

const tenue = (t: AppThemeTokens) => (t.kind === 'dark' ? t.textoTenue : t.textoSecundario);

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 2 },
  nombre: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  correo: { color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 2 },
  seccion: {
    color: tenue(t), fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  // EscribirleCoach trae su propio margen horizontal (Spacing.md) pensado para
  // montarse a sangre; aquí el scroll ya pone el suyo, así que se compensa.
  coach: { marginTop: Spacing.sm, marginHorizontal: -Spacing.md },
  grupo: { color: tenue(t), fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, marginTop: Spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tileSlot: { width: '25%' },
  aviso: {
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: Radius.md, padding: 12, marginTop: Spacing.sm,
  },
  avisoTexto: { color: t.texto, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  avisoTitulo: { fontFamily: Fonts.semiBold, marginBottom: 2 },
  boton: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 6, marginTop: Spacing.sm,
  },
  botonTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
  },
  filaIcono: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  filaLinea: { color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 1 },
});
