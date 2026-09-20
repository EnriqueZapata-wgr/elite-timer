/**
 * Screen — Wrapper estandar para pantallas hijas (las que no son tabs).
 *
 * Aplica:
 *   - flex 1
 *   - backgroundColor: fondo del tema (oscuro mientras la pantalla no migre)
 *   - SafeAreaView con edges configurables (default: ['top'])
 *
 * Cuando usar:
 *   - Pantallas con <PillarHeader>: <Screen>...</Screen>  (default edges=['top'])
 *   - Pantallas con <ScreenHeader>: <Screen edges={[]}>...</Screen>
 *     (porque ScreenHeader ya hace su propio paddingTop:insets.top)
 *   - Modales bottom-sheet: <Screen edges={['bottom']}>...</Screen>
 *
 * MB-31A: `themed` declara que la pantalla YA migró sus colores a tokens y
 * puede recibir el modo claro — pinta el fondo con el tema global y envuelve
 * a los hijos en <ThemeReady> para que el kit compartido lo siga. Sin el
 * prop, la pantalla recibe el oscuro de siempre (regla de tránsito MB-31B).
 *
 * COLCHÓN DE LA ORBE (20-sep-2026). La orbe de ARGOS flota abajo a la derecha
 * y tapaba el último renglón del scroll en 8 de 12 capturas: ORB_SAFE_BOTTOM
 * era opt-in y solo 17 de 136 pantallas lo sumaban. Ahora <Screen> lo aplica
 * por defecto: a cada scroll vertical que sea hijo directo (ScrollView,
 * FlatList, SectionList, y sus versiones de Reanimated; también dentro de un
 * Fragment) le sube el paddingBottom de su contentContainerStyle hasta el
 * colchón de esta ruta. Gana el MAYOR entre lo que la pantalla ya tenía y el
 * colchón, nunca la suma: las que ya lo hacían a mano no quedan con doble
 * margen. Donde la orbe no se pinta (salas, Mente, chat, onboarding, acción
 * anclada) el colchón es cero y el scroll queda exactamente como estaba.
 * Un scroll horizontal nunca se toca. Si el scroll vive más adentro (dentro de
 * un View o de un componente propio), la pantalla usa `useColchonOrbe`.
 * `colchonOrbe={false}` lo apaga para una pantalla que ancla su propio pie.
 *
 * LLAVES ESTABLES (20-sep-2026, ronda de arreglos). El colchón cambia en
 * caliente: al abrir ARGOS la pantalla de abajo sigue montada y `usePathname`
 * le entrega '/argos-chat' (colchón cero), al volver sube otra vez, y cada
 * burbuja del tutorial lo esconde y lo enseña. Por eso la FORMA del árbol de
 * hijos nunca depende del colchón: `conColchonOrbe` pasa siempre por
 * `Children.map` (mismas llaves con cero y con veinte) y el colchón solo
 * decide si se toca un contentContainerStyle. Ver la nota de la función.
 */
import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, ScrollView, SectionList, StyleSheet,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { ThemeReady, useAppTheme, useSurfaceTokens } from '@/src/contexts/theme-context';
import { useColchonOrbe } from '@/src/components/argos/useColchonOrbe';
import { paddingBottomConColchon } from '@/src/components/argos/argos-floating-core';

/** Los scrolls verticales que <Screen> sabe acolchonar. Identidad de tipo, no nombre. */
const TIPOS_SCROLL: ReadonlySet<unknown> = new Set<unknown>([
  ScrollView, FlatList, SectionList, Animated.ScrollView, Animated.FlatList,
]);

interface PropsScroll {
  horizontal?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Devuelve los hijos con el colchón aplicado a cada scroll vertical directo.
 *
 * LLAVES ESTABLES (20-sep-2026). Antes, con colchón cero devolvía `children`
 * tal cual y con colchón > 0 pasaba por `Children.map`, que re-clava las
 * llaves (".0", ".1"). Cada cruce de cero (abrir ARGOS, regresar, cada
 * burbuja del tutorial) cambiaba las llaves de TODOS los hijos y React los
 * desmontaba y volvía a montar: scroll al tope, fetches repetidos, estado
 * local perdido (reproducido por el revisor). Ahora el árbol tiene siempre la
 * misma forma: se pasa por `Children.map` con cualquier colchón, los Fragments
 * se recorren siempre (por la misma razón: sus hijos también reciben llave), y
 * el colchón solo decide si se toca el contentContainerStyle del scroll.
 * No hay test en node para esto (Screen monta react-native): el contrato es
 * este comentario y la reproducción del revisor.
 */
export function conColchonOrbe(children: ReactNode, colchon: number): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) {
      const props = child.props as PropsScroll;
      return cloneElement(child, undefined, conColchonOrbe(props.children, colchon));
    }
    if (colchon <= 0 || !TIPOS_SCROLL.has(child.type)) return child;
    const el = child as ReactElement<PropsScroll>;
    if (el.props.horizontal === true) return child;
    const plano = (StyleSheet.flatten(el.props.contentContainerStyle) ?? {}) as ViewStyle;
    const base = typeof plano.paddingBottom === 'number' ? plano.paddingBottom
      : typeof plano.paddingVertical === 'number' ? plano.paddingVertical
      : typeof plano.padding === 'number' ? plano.padding
      : undefined;
    return cloneElement(el, {
      contentContainerStyle: [el.props.contentContainerStyle, { paddingBottom: paddingBottomConColchon(base, colchon) }],
    });
  });
}

interface ScreenProps {
  children: ReactNode;
  edges?: readonly Edge[];
  /**
   * KEY-1 (MB-0): pantallas con inputs en la parte baja — el contenido se
   * desplaza con la curva nativa del teclado en vez de quedar tapado.
   * iOS: behavior 'padding' (animación interrumpible del sistema).
   * Android: no-op — softwareKeyboardLayoutMode 'resize' ya redimensiona.
   * El blindaje definitivo (react-native-keyboard-controller) entra en el
   * build único post-MB-1 (spike e) sin cambiar esta API.
   */
  keyboard?: boolean;
  /** MB-31A: esta pantalla ya migró sus colores y sigue el tema global. */
  themed?: boolean;
  /**
   * ACERO (22-ago-2026): lienzo FIJO, fuera de la rampa y fuera del tema.
   *
   * Es para las superficies inmersivas donde el color de fondo es la función
   * y no el estilo. Hoy la usa una sola: la sesión de sueño, que es un
   * teléfono encendido toda la noche en el buró y tiene su propia paleta
   * (NIGHT). Esa pantalla venía heredando el lienzo global por accidente —
   * coincidía en #000000 y nadie lo notó — así que al aclarar el oscuro se
   * habría vuelto acero en silencio.
   *
   * No es una puerta trasera al ratchet: el valor tiene que venir de una
   * paleta declarada, nunca de un hex escrito aquí.
   */
  fondo?: string;
  /**
   * 20-sep-2026: colchón inferior para la orbe de ARGOS en el scroll hijo
   * (ver la cabecera). Por defecto encendido; false para una pantalla que
   * ancla su propio pie y no quiere que el scroll se alargue.
   */
  colchonOrbe?: boolean;
}

export function Screen({ children, edges = ['top'], keyboard = false, themed = false, fondo: fondoFijo, colchonOrbe = true }: ScreenProps) {
  const global = useAppTheme().tokens;
  const scoped = useSurfaceTokens();
  const fondo = fondoFijo ?? (themed ? global : scoped).fondo;
  // El SafeAreaView ya deja el inset inferior fuera cuando 'bottom' está en
  // edges; entonces el colchón no lo vuelve a sumar.
  const colchon = useColchonOrbe(edges.includes('bottom'));
  const hijos = colchonOrbe ? conColchonOrbe(children, colchon) : children;

  const inner = keyboard ? (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {hijos}
    </KeyboardAvoidingView>
  ) : hijos;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: fondo }]} edges={edges}>
      {themed ? <ThemeReady>{inner}</ThemeReady> : inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
