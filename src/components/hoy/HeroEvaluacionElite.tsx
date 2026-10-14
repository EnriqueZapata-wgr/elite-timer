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
import { ELEVATION, SECTION_TITLE } from '@/src/constants/brand';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { VOZ_ELITE, type VozPrograma } from '@/src/services/elite/voz-programa-core';
import { textosNoSePudoLeer } from '@/src/services/elite/mi-programa-core';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';

/** El nombre del coach vive en un solo sitio (lanzamiento.ts); aqui solo se pone en mayusculas. */
const ETIQUETA = `TU EVALUACIÓN CON ${NOMBRE_COACH_ELITE.toUpperCase()}`;

/**
 * 14-oct-2026 (marca): borde neutro (nunca lima), ícono teal sobre t.hundido
 * y ceja gris. Estas tarjetas planas no llevan lima: no hay CTA ni dato heroico.
 */
function useCard() {
  const { t, dark, teal, borde } = useTintaMarca();
  const card = [s.card, { backgroundColor: t.card, borderColor: borde }];
  return { t, dark, teal, card };
}

function Cabecera({ texto = ETIQUETA }: { texto?: string }) {
  const { t, teal } = useTintaMarca();
  return (
    <View style={s.headerRow}>
      <View style={[s.iconWrap, { backgroundColor: t.hundido }]}>
        <AppIcon name="evaluaciones" size={18} color={teal} />
      </View>
      <EliteText style={[s.label, { color: t.textoSecundario }]}>{texto}</EliteText>
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
  const { t, card } = useCard();
  return (
    <Animated.View entering={FadeInUp.delay(100).springify()} style={card}>
      <Cabecera />
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
 * 8-oct-2026 (nivel 2): `voz` nombra el documento ("tu evaluación" o "tu
 * programa", con su genero; mi-programa-core, textosNoSePudoLeer). Sin ella,
 * la de Elite: el texto de siempre.
 */
export function HeroEliteNoSePudoLeer({ onReintentar, formato = false, tope = false, voz = VOZ_ELITE }: {
  onReintentar: () => void; formato?: boolean; tope?: boolean; voz?: Pick<VozPrograma, 'documento'>;
}) {
  const { t, card } = useCard();
  const x = textosNoSePudoLeer(voz);
  const cuerpo = formato
    ? x.formato
    : tope
      ? 'La lectura tardó más de lo normal. Revisa tu conexión y vuelve a intentar.'
      : `Revisa tu conexión. ${x.sigueGuardado}`;
  return (
    <View style={card}>
      <Cabecera texto={x.etiqueta} />
      <EliteText style={[s.titulo, { color: t.texto }]}>{x.titulo}</EliteText>
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
  const { t, card } = useCard();
  return (
    <View style={card}>
      <Cabecera texto="TU INICIO" />
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
  const { t, teal } = useCard();
  return (
    <View style={[s.nota, { backgroundColor: t.hundido }]}>
      <AppIcon name="evaluaciones" size={14} color={teal} />
      <EliteText style={[s.notaTexto, { color: t.texto }]}>{NOMBRE_COACH_ELITE} está preparando tu evaluación. Aparece aquí cuando la termine.</EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.semiBold, fontSize: SECTION_TITLE.fontSize, letterSpacing: SECTION_TITLE.letterSpacing },
  titulo: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  tituloGrande: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, marginTop: Spacing.sm },
  body: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 6 },
  btnQuiet: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderColor: ELEVATION[2].border, borderRadius: Radius.card,
    paddingVertical: 11, marginTop: Spacing.sm,
  },
  btnQuietText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  nota: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  notaTexto: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, lineHeight: 16 },
});
