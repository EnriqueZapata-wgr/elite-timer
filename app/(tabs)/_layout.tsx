/**
 * Tab Layout — la carcasa de la arquitectura V2 (MB-19 PIEZA 4).
 *
 *   ┌──────┬─────┬───────┬───────┬───────┐
 *   │ HOY  │ ATP │ ORBE  │ SALUD │ TRIBU │
 *   └──────┴─────┴───────┴───────┴───────┘
 *
 * La ORBE es ARGOS. Va al centro, SIN palabra, y respira. No es un tab más:
 * es la presencia del coach, siempre a un toque, en cualquier sala. Reacciona
 * pasando a 'alerta' cuando tiene algo que decir (calma con presencia: nunca
 * parpadea rápido ni se pone roja).
 *
 * Los tabs viejos (yo, biblioteca, progreso, perfil) NO se borran: pasan a
 * href: null y siguen siendo rutas válidas para deep links. Su contenido se
 * repartió: lo de YO vive en SALUD y en Ajustes, y lo que era KIT es la sala
 * ATP. `npm run censo` verifica que nada quedó sin puerta.
 *
 * Si el usuario es coach Y la pantalla es ancha (>1024px), muestra el
 * CoachPanelLayout en vez de las tabs normales.
 *
 * 8-oct-2026 (v4): en la presentacion v4 de Elite DX (useEsV4) la barra es
 *
 *   ┌─────┬──────┬───────┬────────┬──────┐
 *   │ Hoy │ Plan │ ARGOS │ Perfil │ Apps │
 *   └─────┴──────┴───────┴────────┴──────┘
 *
 * con ARGOS en un boton redondo elevado al centro (BotonArgosV4). Se reusan
 * rutas: Plan = programa, Perfil = salud, Apps = kit. Ver TabsV4 y
 * "R and D/ATP_V4_PLAN.md". Elite DX clasica y la ATP completa no cambian.
 */
import { useState, useEffect, useRef } from 'react';
import { useWindowDimensions, View, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, Redirect, router, usePathname } from 'expo-router';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import {
  TAB_BAR_ICONS,
  TABS_OCULTAS_POR_VISTA,
  TABS_OCULTAS_V4,
  TABS_V4,
  ARGOS_V4_A11Y,
  vistaDeTabs,
} from '@/src/constants/tab-bar';
import { useCoachStatus } from '@/src/hooks/useCoachStatus';
import { useAuth } from '@/src/contexts/auth-context';
import { isAdmin } from '@/src/constants/admin-config';
import { CoachPanelLayout } from '@/src/screens/coach/CoachPanelLayout';
import { Fonts, Spacing } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { FeedbackButton } from '@/src/components/FeedbackButton';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { useArgosPresence } from '@/src/components/argos/ArgosPresenceContext';
import { OrbTour } from '@/src/components/tour/OrbTour';
import { TUTORIAL_POR_PANTALLA } from '@/src/constants/flags';
import { ORB_TOUR_DONE_KEY, ORB_TOUR_RESTART_EVENT } from '@/src/components/tour/orb-tour-core';
import { countUnreadInbox } from '@/src/services/user-notifications-service';
import { TABS_EXIGEN_CONSENTIMIENTO } from '@/src/constants/flags';
// 26-sep-2026 (una app, dos modos): el tab bar sigue el modo de la cuenta
// (Elite DX o ATP completa), no una constante. Ver src/services/modo-app.
// 8-oct-2026 (v4): y dentro de Elite DX, la presentacion (clasica o v4).
import { useEsEliteDx, useEsV4 } from '@/src/hooks/useModoApp';
import { hayVistoBuenoEnMemoria, leerVistoBueno } from '@/src/services/acceso-consentido';

const COACH_PANEL_MIN_WIDTH = 1024;

/** Veredicto del guard de consentimiento. Ver useAccesoConsentido. */
type Acceso = 'consultando' | 'permitido' | 'al_gate';

/**
 * CONSENT · El guard. Este grupo de rutas NO se renderiza para quien no haya
 * pasado por el gate de consentimientos.
 *
 * POR QUÉ VIVE AQUÍ Y NO EN CADA PANTALLA
 *  `app/index.tsx` era el único gate, y se lo brincaban siete caminos: los deep
 *  links por scheme (expo-router resuelve `atp://kit`, `atp://salud`,
 *  `atp://tribu` y el `atp://fasting` del widget por convención de archivos,
 *  sin montar el index), la cadena MeetArgosGate → /argos/meet → /(tabs), las
 *  rutas que abre una notificación, el rechazo del disclaimer médico, el
 *  `finally` de voice-config y el propio `catch` del gate. Tapar cada uno es
 *  una carrera que se pierde: basta que la pantalla número 143 olvide el
 *  chequeo. Puesto en el layout, todas se cierran a la vez y las que se
 *  inventen mañana nacen cerradas.
 *
 * POR QUÉ NO PREGUNTA A LA RED
 *  Preguntar aquí duplicaría la política de fallo en dos lugares, y eso es
 *  exactamente cómo se llegó a tener dos modos de falla contradictorios. El
 *  guard solo consulta el visto bueno local; si no lo hay, manda a `/`, que es
 *  el gate de verdad, tiene los reintentos y sabe mostrar la pantalla honesta.
 *
 * POR QUÉ NO PARPADEA
 *  En el camino normal el gate ya marcó el visto bueno en memoria de forma
 *  síncrona antes de redirigir, así que el estado inicial ya es 'permitido' y
 *  no hay ni un frame de más. Solo el arranque en frío por deep link paga una
 *  lectura de AsyncStorage, que son milisegundos y no red.
 */
function useAccesoConsentido(userId: string | undefined, cargandoSesion: boolean): Acceso {
  const [acceso, setAcceso] = useState<Acceso>(() =>
    !TABS_EXIGEN_CONSENTIMIENTO || (userId && hayVistoBuenoEnMemoria(userId))
      ? 'permitido'
      : 'consultando',
  );

  useEffect(() => {
    if (!TABS_EXIGEN_CONSENTIMIENTO || acceso === 'permitido') return;
    // Todavía no se sabe si hay sesión: esperar. Mandarla al gate ahora sería
    // rebotar a alguien por el simple hecho de que la app está arrancando.
    if (cargandoSesion) return;
    // Sesión resuelta y no hay usuario: al gate, que la manda a login.
    if (!userId) { setAcceso('al_gate'); return; }
    let vivo = true;
    // Techo duro. Leer AsyncStorage tarda milisegundos, pero "tarda
    // milisegundos" no es lo mismo que "no puede colgarse", y una pantalla
    // colgada ya se pagó dos veces. Si a los 2.5 s no hay respuesta, al gate:
    // ante la duda se pregunta, nunca se abre.
    const techo = setTimeout(() => { if (vivo) setAcceso('al_gate'); }, 2500);
    leerVistoBueno(userId)
      .then((ok) => { if (vivo) setAcceso(ok ? 'permitido' : 'al_gate'); })
      .catch(() => { if (vivo) setAcceso('al_gate'); });
    return () => { vivo = false; clearTimeout(techo); };
  }, [userId, cargandoSesion, acceso]);

  return acceso;
}

/** El tabBarIcon de una sala: reposo o '-fill' según focused, del registro. */
function tabIcon(tab: keyof typeof TAB_BAR_ICONS) {
  const t = TAB_BAR_ICONS[tab];
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <AppIcon name={focused ? t.activo : t.reposo} size={size} color={color} />
  );
}

/**
 * El icono de la ORBE. Vive aquí y no en ArgosOrb porque lo específico del tab
 * bar es el tamaño y el que NO lleve palabra debajo; la esfera es la misma que
 * usa el modo de voz.
 *
 * Un poco más grande que los demás iconos y con el hueco de la etiqueta que no
 * tiene: así queda ópticamente centrada en la fila.
 */
function OrbTabIcon() {
  const { orbState } = useArgosPresence();
  return (
    <View style={styles.orbSlot}>
      <ArgosOrb state={orbState} size={ORB_TAB_SIZE} />
    </View>
  );
}

// 19.1: 42 y no 46 — la orbe ahora respira al doble de amplitud y el hueco
// útil de la barra es 48 px: 42 × 1.12 (alerta en su punto más ancho) = 47.
const ORB_TAB_SIZE = 42;

/**
 * 26-sep-2026 (una app, dos modos): las salas que cada modo saca del tab bar.
 * Si el modo cambia con la persona parada en una de ellas (la cuenta se
 * resolvio distinto a lo recordado, o el admin cambio el modo), se la manda a
 * HOY. Desde el 26-sep (Elite DX no pierde funciones) ATP, SALUD y TRIBU son
 * destinos validos de Elite DX (se abren desde TU), y ademas el <Tabs> se
 * vuelve a montar al cambiar de modo (key), asi que esta red es de respaldo.
 *
 * 8-oct-2026 (v4): las listas viven en TABS_OCULTAS_POR_VISTA (tab-bar.ts),
 * con una tercera vista, la v4, que esconde PROGRESO, TU y TRIBU.
 */

/**
 * 8-oct-2026 (v4): el boton de ARGOS de la v4. Un circulo elevado al centro
 * de la barra, con la orbe mas grande. Sube con margen negativo; la barra no
 * recorta (overflow visible en tabBarStyle de TabsV4, y el item de la barra
 * en variante uikit tampoco recorta). En Android el toque solo entra dentro
 * de la barra, por eso el circulo sube poco: casi todo queda adentro.
 */
const ORB_V4_SIZE = 50;
const BOTON_ARGOS_V4 = 62;
const ELEVACION_ARGOS_V4 = 16;

function BotonArgosV4({ onPress, onLongPress, testID, 'aria-selected': seleccionado }: BottomTabBarButtonProps) {
  const { orbState } = useArgosPresence();
  const { kind, tokens } = useAppTheme();
  const activo = kind === 'dark' ? ATP_BRAND.lime : tokens.tealTexto;
  return (
    <View style={styles.argosV4Slot} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={ARGOS_V4_A11Y}
        accessibilityState={{ selected: !!seleccionado }}
        hitSlop={6}
        style={[
          styles.argosV4Boton,
          { backgroundColor: tokens.fondo, borderColor: seleccionado ? activo : tokens.borde },
        ]}
      >
        <ArgosOrb state={orbState} size={ORB_V4_SIZE} />
      </Pressable>
    </View>
  );
}

/**
 * 8-oct-2026 (v4): la barra de la v4. Es otro <Tabs> (key propia) para que
 * el de Elite DX clasica y el de la ATP completa queden intactos, y para que
 * al cambiar de presentacion el navegador se monte desde cero con su orden y
 * su backBehavior. 'history': Perfil abre Progreso, Tu y Tribu, que no tienen
 * boton en la barra, y el atras de Android regresa a donde estaba.
 * Toda ruta de (tabs) se declara (visible u oculta): una sin declarar
 * apareceria sola en la barra.
 */
/**
 * 8-oct-2026 (v4): /salud con `?seccion=X` pinta el hub clasico y con
 * `?marcador=<key>` abre un marcador del Perfil. El tab de abajo recuerda los
 * params de la ultima visita: sin esto, tocar Perfil despues de abrir el hub
 * desde Ajustes volveria a pintar el hub. Al tocarlo con params, se navega a
 * la ruta limpia (navigate en v7 reemplaza los params, no los mezcla).
 */
const limpiarParamsAlTocar = ({ navigation, route }: {
  navigation: { navigate: (name: string, params?: object) => void };
  route: { name: string; params?: object };
}) => ({
  tabPress: (e: { preventDefault: () => void }) => {
    const p = route.params as { seccion?: unknown; marcador?: unknown } | undefined;
    if (p && (p.seccion != null || p.marcador != null)) {
      e.preventDefault();
      navigation.navigate(route.name, {});
    }
  },
});

function TabsV4() {
  const insets = useSafeAreaInsets();
  const { kind, tokens } = useAppTheme();
  return (
    <Tabs
      key="tabs-v4"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: kind === 'dark' ? ATP_BRAND.lime : tokens.tealTexto,
        tabBarInactiveTintColor: tokens.textoTenue,
        tabBarStyle: {
          backgroundColor: tokens.fondo,
          borderTopWidth: kind === 'light' ? 0.5 : 0,
          borderTopColor: tokens.borde,
          elevation: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 4,
          // El boton de ARGOS sale por arriba: la barra no lo recorta.
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          fontSize: 11,
        },
      }}>
      {TABS_V4.map((t) => (t.icon === null ? (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarLabel: () => null,
            tabBarAccessibilityLabel: ARGOS_V4_A11Y,
            tabBarButton: (props) => <BotonArgosV4 {...props} />,
          }}
        />
      ) : (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: tabIcon(t.icon) }}
          listeners={t.name === 'salud' ? limpiarParamsAlTocar : undefined}
        />
      )))}
      {TABS_OCULTAS_V4.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

/**
 * 26-sep-2026 (una app, dos modos; revision en frio M2): sin UI. Vive aparte
 * porque usePathname re-pinta a quien lo llama en CADA navegacion; en
 * TabLayout eso re-pintaba el navegador de tabs entero. Aqui solo se re-pinta
 * este componente vacio.
 *
 * Actua solo en un cambio REAL de modo, nunca al montar (abrir la app en /kit
 * por deep link no es un cambio). La ruta se lee por ref para que navegar no
 * vuelva a disparar el efecto.
 */
function RedirectPorModo() {
  // 8-oct-2026 (v4): actua en un cambio de VISTA (ATP, Elite DX clasica o v4),
  // no solo de modo: pasar de clasica a v4 parado en /tu tambien manda a HOY.
  const vista = vistaDeTabs(useEsEliteDx(), useEsV4());
  const pathname = usePathname();
  const vistaPrevia = useRef(vista);
  const rutaActual = useRef(pathname);
  rutaActual.current = pathname;
  useEffect(() => {
    if (vistaPrevia.current === vista) return;
    vistaPrevia.current = vista;
    if (TABS_OCULTAS_POR_VISTA[vista].has(rutaActual.current)) router.replace('/');
  }, [vista]);
  return null;
}

export default function TabLayout() {
  // 26-sep-2026 (una app, dos modos): arriba de todo, antes de cualquier return.
  const eliteDx = useEsEliteDx();
  // 8-oct-2026 (v4): solo puede ser true en Elite DX.
  const v4 = useEsV4();
  const { width } = useWindowDimensions();
  const { isCoach } = useCoachStatus();
  const { user, loading: cargandoSesion } = useAuth();
  const acceso = useAccesoConsentido(user?.id, cargandoSesion);
  const insets = useSafeAreaInsets();
  // MB-31A: la barra de pestañas ES el marco — posee su superficie completa
  // y sigue el tema global aunque las pantallas de arriba sigan sin migrar.
  // En claro el tinte activo es el teal calibrado: el lima sobre acero da
  // 1.34 (regla 1 del manual 3.6) y la etiqueta del tab es texto.
  const { kind, tokens } = useAppTheme();
  const [forceAthleteView, setForceAthleteView] = useState(false);
  // N3: la burbuja de feedback solo en DEV (no en build de producción ni para admins).
  const showFeedback = __DEV__;
  const { setOrbState } = useArgosPresence();
  const [showTour, setShowTour] = useState(false);

  // MB-20 Pieza 4: el tour de la orbe. Llave nueva a propósito (los usuarios
  // del carrusel viejo también ven esta arquitectura por primera vez). El
  // delay secuencia con la celebración de onboarding (~2.3 s en HOY).
  useEffect(() => {
    let alive = true;
    // 21-ago-2026: con TUTORIAL_POR_PANTALLA encendida, el tour de 12 pasos
    // ya no sale solo. Su contenido vive ahora en piezas por pantalla, y dos
    // tutoriales encima del mismo usuario es peor que ninguno. Apagar la
    // bandera devuelve este tour tal como estaba, sin tocar nada mas.
    // Relanzarlo a mano (Ajustes) sigue funcionando en los dos casos.
    if (!TUTORIAL_POR_PANTALLA) {
      AsyncStorage.getItem(ORB_TOUR_DONE_KEY).then((v) => {
        if (!alive || v === 'true') return;
        setTimeout(() => { if (alive) setShowTour(true); }, 3000);
      });
    }
    const sub = DeviceEventEmitter.addListener(ORB_TOUR_RESTART_EVENT, () => setShowTour(true));
    return () => { alive = false; sub.remove(); };
  }, []);

  // MB-20 4.3: el disparador de 'alerta' que MB-19 dejó pendiente. Algo sin
  // leer en el inbox (insight nuevo, notificación) → la orbe respira distinto.
  // Nunca pisa los estados vivos de voz (esos son locales del modo voz).
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const check = async () => {
      const unread = await countUnreadInbox(user.id);
      if (alive) setOrbState(unread > 0 ? 'alerta' : 'idle');
    };
    check();
    const sub = DeviceEventEmitter.addListener('notifications_changed', check);
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => { alive = false; sub.remove(); clearInterval(interval); };
  }, [user?.id, setOrbState]);

  // CONSENT · El guard, después de todos los hooks (las reglas de hooks no se
  // negocian ni por cumplimiento). `/` es el gate: lee el perfil, reintenta y
  // decide si la persona va al onboarding, entra, o ve la pantalla honesta de
  // fallo. Aquí no se toma ninguna de esas decisiones, solo se delega.
  if (acceso === 'al_gate') return <Redirect href="/" />;
  // Fondo del tema, sin spinner: se resuelve en milisegundos y un spinner que
  // aparece y desaparece se siente peor que nada. Este estado tiene techo de
  // 2.5 s por diseño, así que no puede quedarse puesto.
  if (acceso === 'consultando') return <View style={{ flex: 1, backgroundColor: tokens.fondo }} />;

  const showCoachPanel = width >= COACH_PANEL_MIN_WIDTH && isCoach && !forceAthleteView;

  if (showCoachPanel) {
    return (
      <CoachPanelLayout onSwitchToAthlete={() => setForceAthleteView(true)} />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {forceAthleteView && width >= COACH_PANEL_MIN_WIDTH && isCoach && (
        <Pressable
          onPress={() => setForceAthleteView(false)}
          style={styles.coachBanner}
        >
          <Ionicons name="desktop-outline" size={14} color={CATEGORY_COLORS.metrics} />
          <EliteText variant="caption" style={styles.coachBannerText}>
            Volver al Panel Coach
          </EliteText>
        </Pressable>
      )}

      {/* 8-oct-2026 (v4): la v4 tiene su propia barra; la de abajo queda
          tal cual para Elite DX clasica y la ATP completa. */}
      {v4 ? <TabsV4 /> : (
      <Tabs
        // 26-sep-2026 (Elite DX no pierde funciones): en Elite DX, TU abre la
        // sala de apps, SALUD y TRIBU, que no tienen boton en la barra. Con
        // 'history' el boton atras de Android regresa a donde estaba (TU) en
        // vez de saltar a HOY. En ATP completa se queda el de siempre.
        backBehavior={eliteDx ? 'history' : 'firstRoute'}
        // Revision en frio (26-sep): el router de tabs lee backBehavior UNA vez
        // al montar. La key lo vuelve a montar cuando cambia el modo, para que
        // cada modo tenga el suyo (y sus tabs visibles) desde cero.
        key={eliteDx ? 'tabs-elite-dx' : 'tabs-atp'}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: kind === 'dark' ? ATP_BRAND.lime : tokens.tealTexto,
          tabBarInactiveTintColor: tokens.textoTenue,
          // N4: respetar el safe-area inferior. En Android con botones de navegación del SO
          // (o iPhone con home bar) insets.bottom > 0 → el tab bar queda por encima. En gesture
          // nav (insets.bottom = 0) no agrega padding de más.
          tabBarStyle: {
            backgroundColor: tokens.fondo,
            // En claro, un borde sutil despega la barra; en oscuro, como hoy.
            borderTopWidth: kind === 'light' ? 0.5 : 0,
            borderTopColor: tokens.borde,
            elevation: 0,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontFamily: Fonts.semiBold,
            fontSize: 11,
          },
        }}>
        {/* ── Los cinco ──
            Iconos del set SVG vía AppIcon: línea en reposo, '-fill' al estar
            parado en la sala. Los nombres viven en TAB_BAR_ICONS (registro).

            25-sep-2026 (flags.APP_ELITE_DX): en Elite DX los cinco son
            HOY · MI PROGRAMA · ARGOS · PROGRESO · TÚ, y ATP, SALUD y TRIBU
            salen del tab bar con href: null (siguen siendo rutas válidas).
            En la ATP completa, exactamente como antes. 26-sep-2026 (una app,
            dos modos): el modo es de la cuenta (useEsEliteDx). El orden
            de declaración es el orden en la barra, por eso las ocultas se
            intercalan: lo visible queda igual en los dos modos. */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Hoy',
            tabBarIcon: tabIcon('hoy'),
          }}
        />
        <Tabs.Screen
          name="programa"
          options={eliteDx
            ? { title: 'Mi programa', tabBarIcon: tabIcon('programa') }
            : { href: null }}
        />
        <Tabs.Screen
          name="kit"
          options={eliteDx
            ? { href: null }
            : { title: 'ATP', tabBarIcon: tabIcon('atp') }}
        />
        {/* La ORBE. Sin etiqueta a propósito: no se nombra lo que se reconoce.
            El icono lo dibuja ArgosOrb, que respira solo. */}
        <Tabs.Screen
          name="argos"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarAccessibilityLabel: 'ARGOS',
            tabBarIcon: () => <OrbTabIcon />,
          }}
        />
        <Tabs.Screen
          name="progreso"
          options={eliteDx
            ? { title: 'Progreso', tabBarIcon: tabIcon('progreso') }
            : { href: null }}
        />
        <Tabs.Screen
          name="salud"
          options={eliteDx
            ? { href: null }
            : { title: 'Salud', tabBarIcon: tabIcon('salud') }}
        />
        <Tabs.Screen
          name="tribu"
          options={eliteDx
            ? { href: null }
            : { title: 'Tribu', tabBarIcon: tabIcon('tribu') }}
        />
        <Tabs.Screen
          name="tu"
          options={eliteDx
            ? { title: 'Tú', tabBarIcon: tabIcon('tu') }
            : { href: null }}
        />

        {/* ── Retiradas del tab bar, vivas como rutas ──
            Su contenido se repartió; los archivos se quedan para no romper
            deep links. Ver el encabezado de este archivo. */}
        <Tabs.Screen
          name="biblioteca"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="perfil"
          options={{ href: null }}
        />
      </Tabs>
      )}

      {/* 26-sep-2026 (una app, dos modos): saca a HOY a quien queda parado en
          una sala que el cambio de modo acaba de esconder. Sin UI. */}
      <RedirectPorModo />

      {showFeedback && <FeedbackButton />}

      {/* MB-20 Pieza 4: el tour vive AQUÍ (sobre las tabs) para sobrevivir la
          navegación entre pantallas sin secuestrar el toque (box-none). */}
      {showTour && (
        <OrbTour
          bottomOffset={60 + insets.bottom}
          onDone={() => setShowTour(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 19.1: sin marginTop — con tabBarLabel: () => null no hay hueco de etiqueta
  // que compensar, y esos 6 px eran justo lo que sacaba a la orbe de la barra
  // al respirar con más amplitud.
  orbSlot: {
    width: ORB_TAB_SIZE,
    height: ORB_TAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 8-oct-2026 (v4): el hueco del centro y el boton elevado de ARGOS.
  argosV4Slot: {
    flex: 1,
    alignItems: 'center',
    overflow: 'visible',
  },
  argosV4Boton: {
    width: BOTON_ARGOS_V4,
    height: BOTON_ARGOS_V4,
    borderRadius: BOTON_ARGOS_V4 / 2,
    marginTop: -ELEVACION_ARGOS_V4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: CATEGORY_COLORS.metrics + '15',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: CATEGORY_COLORS.metrics + '30',
  },
  coachBannerText: {
    color: CATEGORY_COLORS.metrics,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
});
