/**
 * CandadoNivel (ATP 3.0, 5-sep-2026, ruta 1.10): el candado de una función que
 * exige un nivel que quien mira todavía no tiene.
 *
 * Regla 15 de la casa: lo bloqueado se ve, no desaparece. Este componente es
 * esa "se ve": un badge pequeño (o una esquina sobre un mosaico) con el icono
 * de candado y el nombre del nivel que lo abre, "Pro" o "Elite". Al tocarlo,
 * Pro lleva al paywall con `contexto=candado:<key>` para que el paywall diga
 * qué función lo trajo; Elite lleva a la página de Elite (nunca al paywall:
 * Elite no se compra dentro de la app, Apple 3.1.3).
 *
 * Quien lo usa decide si es tocable: dentro de una fila que ya navega al
 * candado, va decorativo (`tocable={false}`) para no anidar Pressables.
 *
 * Tinta: `tokens.texto` y `tokens.tealTexto` (4.5:1 verificados en el test de
 * tokens). Nunca `sinDatos`. El icono `lock-closed` es cromo, permitido.
 */
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/src/contexts/theme-context';
import type { MinTier } from '@/src/constants/app-registry';
import { RUTA_ELITE, contextoCandado } from '@/src/constants/rutas-3-0';
import { VENTA_AL_PUBLICO } from '@/src/constants/flags';
import { haptic } from '@/src/utils/haptics';

/** Cómo se llama cada nivel en el candado. Corto: cabe en una esquina. */
export const ETIQUETA_NIVEL: Record<MinTier, string> = {
  premium: 'Pro',
  elite: 'Elite',
};

/**
 * A dónde lleva el candado. Pura, para que las pantallas que no pintan el
 * badge (por ejemplo una fila que navega sola) manden al mismo lugar.
 */
export function destinoCandado(appKey: string, nivel: MinTier): Href {
  if (nivel === 'elite') return RUTA_ELITE as Href;
  return { pathname: '/paywall', params: { contexto: contextoCandado(appKey) } } as Href;
}

interface Props {
  /** Llave de la app en app-registry: viaja en el contexto del paywall. */
  appKey: string;
  /** Nivel que abre la función. */
  nivel: MinTier;
  /**
   * `badge`: píldora en línea (filas, tarjetas de Hoy).
   * `esquina`: posición absoluta arriba a la derecha, para un mosaico.
   */
  variante?: 'badge' | 'esquina';
  /** Si navega al tocarse. false cuando el padre ya navega (evita Pressables anidados). */
  tocable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CandadoNivel({ appKey, nivel, variante = 'badge', tocable = true, style }: Props) {
  const router = useRouter();
  // 7-sep-2026 (VENTA_AL_PUBLICO): la píldora "Pro" es señalización de venta.
  // Con la venta al público apagada no se pinta, y con ella se va su toque al
  // paywall. La píldora "Elite" se queda: esa dice que el contenido es de un
  // cliente Elite, no que haya algo que comprar. Red de seguridad además de
  // los candados que ya no se calculan río arriba (nivelAlcanza).
  const esCandadoDeVenta = nivel !== 'elite';
  const { tokens } = useAppTheme();
  const tinta = nivel === 'elite' ? tokens.tealTexto : tokens.texto;
  const etiqueta = ETIQUETA_NIVEL[nivel];
  // El return va DESPUÉS de los dos hooks para no romper su orden entre renders.
  if (esCandadoDeVenta && VENTA_AL_PUBLICO !== true) return null;
  // La posición de esquina la lleva el elemento MÁS EXTERNO (el Pressable si
  // es tocable, la píldora si no): dos absolutos anidados dejarían el área de
  // toque en cero.
  const posicion = variante === 'esquina' ? s.esquina : undefined;
  const cuerpo = (
    <View
      style={[
        s.pildora,
        { backgroundColor: tokens.flotante, borderColor: tokens.bordeMarcado },
        !tocable && posicion,
        style,
      ]}
      accessibilityRole={tocable ? undefined : 'text'}
      accessibilityLabel={`Disponible en ATP ${etiqueta}`}
    >
      <Ionicons name="lock-closed" size={10} color={tinta} />
      <EliteText style={[s.texto, { color: tinta }]}>{etiqueta}</EliteText>
    </View>
  );
  if (!tocable) return cuerpo;
  return (
    <Pressable
      onPress={() => { haptic.light(); router.push(destinoCandado(appKey, nivel)); }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Disponible en ATP ${etiqueta}. Ver cómo abrirlo`}
      style={posicion}
    >
      {cuerpo}
    </Pressable>
  );
}

const s = StyleSheet.create({
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  texto: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  esquina: {
    position: 'absolute',
    top: -4,
    right: -6,
  },
});
