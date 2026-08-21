/**
 * TutorialPorPantalla — la burbuja chica que explica la pantalla donde estás.
 *
 * Vive UNA sola vez, en la carcasa raíz, porque el tutorial cubre pantallas
 * que no son tabs (agenda, ajustes, Mi Protocolo). Decide por la ruta: si la
 * ruta tiene pieza y no se ha visto, aparece; si no, no renderiza nada.
 *
 * REGLAS DE CONVIVENCIA
 *  · `pointerEvents="box-none"`: la capa jamás se come un toque. La persona
 *    puede seguir usando la pantalla con la burbuja abierta, que es justo la
 *    gracia de explicar sobre el contenido real y no en un carrusel.
 *  · No secuestra: si te vas de la pantalla, la pieza se cierra sola. Nunca
 *    te regresa. Solo navega cuando TÚ pides una pieza de otra pantalla
 *    desde el centro de ayuda.
 *  · Cerrar cuenta como vista. Repetir es decisión del usuario, desde el
 *    centro de ayuda, no un castigo por haberla cerrado.
 *
 * CLARO Y OSCURO: la burbuja usa tokens de superficie. El lima se queda como
 * relleno del botón y como borde, pero NUNCA como texto en claro (contraste
 * 1.34): ahí el acento es el teal calibrado. Misma regla que el tab de Salud.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { haptic } from '@/src/utils/haptics';
import { ATP_EVENTS, useAnalytics } from '@/src/lib/analytics';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { TUTORIAL_POR_PANTALLA } from '@/src/constants/flags';
import {
  tourPendiente,
  tourPorId,
  TOUR_PANTALLA_ABRIR_EVENT,
  type TourDePantalla,
} from '@/src/components/tour/tours-por-pantalla';
import {
  cargarVistos,
  cargarSilencio,
  marcarVisto,
} from '@/src/services/tour/tours-vistos-store';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';

/** Rutas con barra de tabs abajo: ahí la burbuja sube para no taparla. */
const RUTAS_CON_TABS = new Set(['/', '/kit', '/salud', '/tribu', '/argos']);
const ALTO_TAB_BAR = 60;

/**
 * Respiro antes de aparecer. La pantalla necesita pintar y asentarse: una
 * burbuja que sale junto con el contenido se siente encima, no al lado.
 */
const RESPIRO_MS = 900;

export function TutorialPorPantalla() {
  const t = useSurfaceTokens();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { track } = useAnalytics();

  const [vistos, setVistos] = useState<Set<string> | null>(null);
  const [silencio, setSilencio] = useState(false);
  const [pieza, setPieza] = useState<TourDePantalla | null>(null);
  const [paso, setPaso] = useState(0);
  /** Pieza abierta a mano: se muestra aunque ya esté vista. */
  const pedidaRef = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [v, s] = await Promise.all([cargarVistos(), cargarSilencio()]);
      if (!vivo) return;
      setVistos(v);
      setSilencio(s);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const abrir = useCallback(
    (p: TourDePantalla, aMano: boolean) => {
      setPieza(p);
      setPaso(0);
      track(ATP_EVENTS.TOUR_STARTED, { pieza: p.id, aMano });
    },
    [track]
  );

  // Aparición sola: ruta con pieza pendiente. El respiro se cancela si la
  // persona se mueve antes de que salga.
  useEffect(() => {
    if (!TUTORIAL_POR_PANTALLA) return;
    if (!vistos) return;
    if (pedidaRef.current) return;
    const candidata = tourPendiente(pathname, vistos, silencio);
    if (!candidata) {
      setPieza(null);
      return;
    }
    const id = setTimeout(() => abrir(candidata, false), RESPIRO_MS);
    return () => clearTimeout(id);
  }, [pathname, vistos, silencio, abrir]);

  // Si la persona se va de la pantalla, la pieza se va con ella.
  useEffect(() => {
    if (!pieza) return;
    if (pathname === pieza.ruta) {
      pedidaRef.current = null;
      return;
    }
    setPieza(null);
  }, [pathname, pieza]);

  // Abrir a mano: centro de ayuda y ARGOS. Si la pieza vive en otra pantalla,
  // ahí sí navegamos, porque la persona lo pidió.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      TOUR_PANTALLA_ABRIR_EVENT,
      (payload: { id?: string } = {}) => {
        const p = payload.id ? tourPorId(payload.id) : null;
        if (!p) return;
        pedidaRef.current = p.id;
        if (pathname !== p.ruta) {
          try {
            router.navigate(p.ruta as never);
          } catch {
            pedidaRef.current = null;
            return;
          }
        }
        setTimeout(() => abrir(p, true), pathname === p.ruta ? 0 : RESPIRO_MS);
      }
    );
    return () => sub.remove();
  }, [pathname, router, abrir]);

  const cerrar = useCallback(
    (completada: boolean) => {
      if (!pieza) return;
      void marcarVisto(pieza.id);
      setVistos((prev) => new Set([...(prev ?? []), pieza.id]));
      track(completada ? ATP_EVENTS.TOUR_COMPLETED : ATP_EVENTS.TOUR_SKIPPED, {
        pieza: pieza.id,
        paso: pieza.pasos[paso]?.id,
      });
      pedidaRef.current = null;
      setPieza(null);
    },
    [pieza, paso, track]
  );

  const siguiente = useCallback(() => {
    haptic.light();
    if (!pieza) return;
    if (paso >= pieza.pasos.length - 1) {
      cerrar(true);
      return;
    }
    const proximo = paso + 1;
    setPaso(proximo);
    track(ATP_EVENTS.TOUR_STEP_VIEWED, {
      pieza: pieza.id,
      step: pieza.pasos[proximo]?.id,
      index: proximo,
    });
  }, [pieza, paso, cerrar, track]);

  if (!TUTORIAL_POR_PANTALLA && !pedidaRef.current) return null;
  if (!pieza) return null;

  const actual = pieza.pasos[paso];
  if (!actual) return null;

  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const abajo =
    (RUTAS_CON_TABS.has(pathname) ? ALTO_TAB_BAR : 0) + insets.bottom + Spacing.sm;
  const ultimo = paso >= pieza.pasos.length - 1;
  const varios = pieza.pasos.length > 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        key={`${pieza.id}-${actual.id}`}
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOut.duration(140)}
        style={[s.wrap, { bottom: abajo }]}
      >
        <View
          style={[
            s.burbuja,
            {
              backgroundColor: t.flotante,
              borderColor: withOpacity(ATP_BRAND.lime, t.kind === 'dark' ? 0.35 : 0.5),
            },
          ]}
        >
          <View style={s.cabecera}>
            <ArgosOrb size={26} state="hablando" />
            <EliteText style={[s.kicker, { color: acento }]} numberOfLines={1}>
              {actual.kicker}
            </EliteText>
            {varios && (
              <EliteText style={[s.avance, { color: t.textoTenue }]}>
                {paso + 1} de {pieza.pasos.length}
              </EliteText>
            )}
            <Pressable
              onPress={() => {
                haptic.light();
                cerrar(false);
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cerrar explicación"
            >
              <Ionicons name="close" size={16} color={t.textoSecundario} />
            </Pressable>
          </View>

          <EliteText style={[s.copy, { color: t.texto }]}>{actual.copy}</EliteText>

          <View style={s.pie}>
            <EliteText style={[s.titulo, { color: t.textoSecundario }]} numberOfLines={1}>
              {pieza.titulo}
            </EliteText>
            <Pressable
              onPress={siguiente}
              accessibilityRole="button"
              style={({ pressed }) => [
                s.boton,
                { backgroundColor: ATP_BRAND.lime },
                pressed && { opacity: 0.7 },
              ]}
            >
              <EliteText style={[s.botonTexto, { color: t.textoSobreLima }]}>
                {ultimo ? 'LISTO' : 'SIGUIENTE'}
              </EliteText>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.md, right: Spacing.md },
  burbuja: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { flex: 1, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2 },
  avance: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  copy: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    lineHeight: 21,
    marginTop: 8,
  },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  titulo: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  boton: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  botonTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1 },
});
