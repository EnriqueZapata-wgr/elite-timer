/**
 * HeroEvaluacionElite (20-sep-2026): lo primero que ve un cliente Elite en
 * HOY cuando su evaluacion ya esta cargada. La Edad ATP que Enrique le puso
 * (`inicio.edad_atp`) junto a su edad real, la fecha de la toma, sus propias
 * palabras (`inicio.lead`) y los tres marcadores en atencion segun el
 * `estado` que Enrique escribio, no segun la matriz V7 de la app. Todo abre
 * la evaluacion: esta tarjeta es la portada de su producto, no un resumen
 * de la app.
 *
 * Aqui viven tambien las otras dos caras del hero Elite: "Enrique esta
 * preparando tu evaluacion" (cliente Elite sin evaluacion cargada; nunca
 * "sube tu estudio") y "no se pudo leer" con reintentar (regla 7). La
 * decision de cual pintar es de elite-hoy-core (decidirHeroElite); la toma
 * HeroLaboratorios, que sigue siendo el hero de quien no es Elite.
 *
 * Tinta: tokens del scope. Glifos por <AppIcon>; Ionicons solo cromo
 * (refresh). Cero em dashes en copy.
 *
 * 7-oct-2026 (Hoy editorial): la cara con evaluacion cargada deja de ser una
 * ficha con numeros grandes y tres marcadores con su simbolo y su color. El
 * dueno abrio HOY y lo primero que vio fueron puntos rojos; su decision: arriba
 * va un resumen con una imagen editorial y los valores quedan a un toque.
 * Ahora es la misma tarjeta editorial que el resto de HOY (HoyResumenCard):
 * "TU EVALUACION CON ENRIQUE", una linea (la Edad ATP que el puso y su delta,
 * o sus palabras) y "VER MI EVALUACION". Los marcadores en atencion, el "N
 * marcadores piden accion" y la firma con la version no se borraron de la
 * app: viven en /salud/evaluacion-elite, que es a donde lleva la tarjeta. Que
 * dice la tarjeta lo decide hoy-resumen-core (tarjetaEvaluacion, con test).
 * Las otras caras (en camino, no se pudo leer, cargando) NO cambian: un
 * estado que no es feliz no se viste de tarjeta bonita.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { HoyResumenCard } from '@/src/components/hoy/HoyResumenCard';
import type { TarjetaResumen } from '@/src/services/hoy/hoy-resumen-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, withOpacity } from '@/src/constants/brand';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

/** El nombre del coach vive en un solo sitio (lanzamiento.ts); aqui solo se pone en mayusculas. */
const ETIQUETA = `TU EVALUACIÓN CON ${NOMBRE_COACH_ELITE.toUpperCase()}`;

function useCard() {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const card = [s.card, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.35) : t.bordeEditorial }];
  return { t, dark, acento, card };
}

function Cabecera({ acento, texto = ETIQUETA }: { acento: string; texto?: string }) {
  return (
    <View style={s.headerRow}>
      <View style={[s.iconWrap, { backgroundColor: withOpacity(acento, 0.14) }]}>
        <AppIcon name="evaluaciones" size={18} color={acento} />
      </View>
      <EliteText style={[s.label, { color: acento }]}>{texto}</EliteText>
    </View>
  );
}

/**
 * La evaluacion cargada. 7-oct-2026 (Hoy editorial): imagen, una linea y un
 * CTA; sin filas de marcadores ni simbolos de estado (ver el encabezado del
 * archivo). La tarjeta llega armada desde hoy-resumen-core.
 */
export function HeroEvaluacionElite({ tarjeta }: { tarjeta: TarjetaResumen }) {
  return <HoyResumenCard tarjeta={tarjeta} />;
}

/** Cliente Elite sin evaluacion cargada todavia. No se le pide subir nada. */
export function HeroEliteEnCamino({ onActualizar }: { onActualizar: () => void }) {
  const { t, acento, card } = useCard();
  return (
    <Animated.View entering={FadeInUp.delay(100).springify()} style={card}>
      <Cabecera acento={acento} />
      <EliteText style={[s.tituloGrande, { color: t.texto }]}>{NOMBRE_COACH_ELITE} está preparando tu evaluación</EliteText>
      {/* 8-oct-2026 (revisión en frío): decía "tu Edad ATP, tus marcadores y
          tu plan". Desde el Hoy editorial los marcadores ya no salen aquí
          (están un toque más adentro, en la evaluación): no se promete en
          HOY lo que HOY ya no enseña. */}
      <EliteText style={[s.body, { color: t.textoSecundario }]}>
        Cuando la termine, aquí vas a ver tu evaluación y tu plan. No necesitas subir nada.
      </EliteText>
      <AnimatedPressable
        style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
        onPress={() => { haptic.light(); onActualizar(); }}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={14} color={t.texto} />
        <EliteText style={[s.btnQuietText, { color: t.texto }]}>Actualizar</EliteText>
      </AnimatedPressable>
    </Animated.View>
  );
}

/**
 * Sabemos que hay algo Elite y no se pudo leer. Nunca "no tienes evaluacion".
 * `formato`: la fila existe y esta version de la app no la entiende; ahi lo
 * honesto es pedir actualizar la app, no revisar la conexion.
 * `tope` (A8): no fallo nada todavia, se paso el tiempo de espera; no se
 * afirma que la evaluacion "sigue guardada" porque no se llego a leer.
 */
export function HeroEliteNoSePudoLeer({ onReintentar, formato = false, tope = false }: { onReintentar: () => void; formato?: boolean; tope?: boolean }) {
  const { t, acento, card } = useCard();
  const cuerpo = formato
    ? 'Tu evaluación está guardada, pero esta versión de la app no la entiende. Actualiza la app y vuelve a intentar.'
    : tope
      ? 'La lectura tardó más de lo normal. Revisa tu conexión y vuelve a intentar.'
      : 'Revisa tu conexión. Tu evaluación sigue guardada.';
  return (
    <View style={card}>
      <Cabecera acento={acento} />
      <EliteText style={[s.titulo, { color: t.texto }]}>No pudimos leer tu evaluación</EliteText>
      <EliteText style={[s.body, { color: t.textoSecundario }]}>{cuerpo}</EliteText>
      <AnimatedPressable
        style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
        onPress={() => { haptic.light(); onReintentar(); }}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={14} color={t.texto} />
        <EliteText style={[s.btnQuietText, { color: t.texto }]}>Reintentar</EliteText>
      </AnimatedPressable>
    </View>
  );
}

/** Mientras se lee: cabecera neutra, porque todavia no se sabe si es Elite. */
export function HeroEliteCargando() {
  const { t, acento, card } = useCard();
  return (
    <View style={card}>
      <Cabecera acento={acento} texto="TU INICIO" />
      <EliteText style={[s.body, { color: t.textoSecundario }]}>Leyendo tus datos...</EliteText>
    </View>
  );
}

/**
 * Renglon para el hero viejo cuando el cliente es Elite, ya tiene labs
 * propios y su evaluacion todavia no esta cargada: conserva lo suyo y sabe
 * que lo de Enrique viene.
 */
export function NotaEvaluacionEnCamino() {
  const { t, acento } = useCard();
  return (
    <View style={[s.nota, { backgroundColor: withOpacity(acento, 0.1) }]}>
      <AppIcon name="evaluaciones" size={14} color={acento} />
      <EliteText style={[s.notaTexto, { color: t.texto }]}>{NOMBRE_COACH_ELITE} está preparando tu evaluación. Aparece aquí cuando la termine.</EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2 },
  titulo: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: 10 },
  tituloGrande: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, marginTop: 10 },
  body: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 6 },
  btnQuiet: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderColor: ELEVATION[2].border, borderRadius: 12,
    paddingVertical: 11, marginTop: Spacing.sm,
  },
  btnQuietText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  nota: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginTop: 10 },
  notaTexto: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, lineHeight: 16 },
});
