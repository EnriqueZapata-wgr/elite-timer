/**
 * ProgramaHeader (25-sep-2026, app Elite DX): "Semana 3 de 12 · Día 17" con su
 * barra. Lo pintan HOY (arriba de todo) y MI PROGRAMA.
 *
 * Estados (regla 13):
 *  - cargando: un hueco con la FORMA de lo que viene, sin spinner (se resuelve
 *    en ms). En HOY lo que viene es la tarjeta editorial, así que el hueco es
 *    16:9 con sus mismos márgenes (8-oct-2026, revisión en frío: medía 96 px
 *    fijos, la tarjeta unos 200, y todo HOY brincaba al llegar el programa).
 *    Si al final toca una tarjeta plana (error, en preparación) o nada, el
 *    contenido sube; el caso de todos los días, el programa leído, no brinca.
 *    Dentro de Mi programa (`soloAvance`) no hay hueco: no se monta nada.
 *  - sin evaluacion: se dice que Enrique la esta preparando. No es un error
 *    ni un candado; es el primer dia de alguien que acaba de activar su codigo.
 *  - error: "no pudimos leer tu programa" + Reintentar. Nunca "no tienes".
 *  - ok: la semana. Si la fecha guardada no se lee, el programa sin semana
 *    (no se inventa una).
 *
 * 7-oct-2026 (Hoy editorial): el dueño pidió que lo primero de HOY sea un
 * resumen con una imagen editorial bonita, y los datos a un toque. En HOY, con
 * el programa leído, este encabezado es ahora la misma tarjeta editorial que
 * usa el modo ATP (HoyResumenCard): la foto del momento del día (8-oct-2026:
 * solo del banco sin persona, nunca un retrato con sexo legible), "SEMANA 3 DE
 * 12", el día, la barra de avance y "VER MI PROGRAMA" hacia /programa. Para
 * el lector de pantalla la tarjeta dice "Semana 3 de 12, día 17" y el avance
 * en palabras (la frase la arma el core).
 *  - Dentro de Mi programa (`soloAvance`) se queda la versión compacta de
 *    siempre, sin imagen ni CTA: un botón a /programa desde /programa no lleva
 *    a ningún lado.
 *  - Los estados que no son felices (no se pudo leer, en preparación, fecha
 *    de inicio ilegible) siguen en su tarjeta plana, tal cual: un fallo no se
 *    viste de tarjeta bonita.
 * Qué vista toca y qué dice la tarjeta lo decide hoy-resumen-core
 * (decidirVistaPrograma, con test); las reglas son las mismas del 25-sep.
 *
 * 8-oct-2026 (nivel 2): el programa puede traer nombre y un día de inicio
 * declarado. Un inicio que todavía no llega NO es "no se pudo leer la fecha":
 * en HOY sale su tarjeta ("Empieza el..."), y aquí, compacto, el nombre (o
 * "Tu programa") con esa fecha. Nada de esto dice "Elite": la ceja es la de
 * siempre, "TU PROGRAMA CON ENRIQUE".
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { HoyResumenCard } from '@/src/components/hoy/HoyResumenCard';
import { useProgramaElite } from '@/src/hooks/useProgramaElite';
import { decidirVistaPrograma } from '@/src/services/hoy/hoy-resumen-core';
import { lineaPorEmpezar } from '@/src/services/elite/programa-elite-core';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { getLocalToday } from '@/src/utils/date-helpers';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { SECTION_TITLE } from '@/src/constants/brand';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';

interface Props {
  userId?: string;
  /**
   * El nivel ya confirmo que existe una evaluacion (HOY lo sabe por
   * `nivel.tieneEvaluacionElite`). Con esto, una lectura que vuelve vacia (RLS,
   * cache) no pinta "en preparacion" a quien ya la tiene: ahi manda el aviso
   * de HOY que dice que no se pudo leer. Revision en frio, 25-sep.
   */
  tieneEvaluacion?: boolean;
  /**
   * Solo la semana. MI PROGRAMA ya dice "en preparacion" y "no se pudo leer"
   * con sus propias palabras; dos tarjetas diciendo lo mismo es ruido.
   * 7-oct-2026 (Hoy editorial): tambien es lo que decide la forma. Con
   * `soloAvance` la semana va compacta (sin imagen, sin CTA a /programa: ya
   * se esta ahi); sin el, en HOY, es la tarjeta editorial.
   */
  soloAvance?: boolean;
  /** Cambia el numero y se relee (el pull-to-refresh de quien lo monta). */
  recarga?: number;
  /**
   * Se puede decir "en preparacion con Enrique" (verificacion en frio, 25-sep):
   * solo a quien es Elite o ya tiene evaluacion, la misma regla A5 de
   * evaluacion-elite. A cualquier otra cuenta, sin evaluacion no se le pinta
   * nada: no se promete lo que nadie prometio. Por defecto true.
   */
  prometerPreparacion?: boolean;
}

export function ProgramaHeader({ userId, tieneEvaluacion, soloAvance, recarga, prometerPreparacion = true }: Props) {
  // 14-oct-2026 (marca): borde neutro, ceja gris y Reintentar neutro. El
  // lima se queda solo en la barra de avance (el dato del programa).
  const { t, dark, lima, borde } = useTintaMarca();
  const { programa, recargar } = useProgramaElite(userId);
  const primeraRecarga = useRef(recarga);
  useEffect(() => {
    if (recarga === undefined || recarga === primeraRecarga.current) return;
    recargar();
  }, [recarga, recargar]);
  const eyebrow = `TU PROGRAMA CON ${NOMBRE_COACH_ELITE.toUpperCase()}`;
  const tarjeta = [s.card, { backgroundColor: t.card, borderColor: borde }];

  // 7-oct-2026 (Hoy editorial): las reglas de qué se pinta (las del 25-sep, en
  // el mismo orden) viven en hoy-resumen-core para poder probarlas.
  const vista = decidirVistaPrograma(programa, { tieneEvaluacion, soloAvance, prometerPreparacion });

  if (vista.vista === 'nada') return null;
  if (vista.vista === 'hueco') return <View style={s.hueco} />;

  if (vista.vista === 'tarjeta') {
    // La foto la elige la hora; la variante, el día (misma semilla, misma
    // imagen: no parpadea entre renders).
    return <HoyResumenCard tarjeta={vista.tarjeta} semilla={`${userId ?? ''}-${getLocalToday()}`} demora={60} />;
  }

  if (vista.vista === 'error') {
    return (
      <View style={tarjeta}>
        <EliteText style={[s.eyebrow, { color: t.textoSecundario }]}>{eyebrow}</EliteText>
        <EliteText style={[s.texto, { color: t.texto }]}>No pudimos leer tu programa. Revisa tu conexión.</EliteText>
        <AnimatedPressable
          onPress={() => { haptic.light(); recargar(); }}
          style={[s.boton, { backgroundColor: t.hundido }]}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
        >
          <EliteText style={[s.botonTexto, { color: t.texto }]}>Reintentar</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  if (vista.vista === 'sin_evaluacion') {
    return (
      <Animated.View entering={FadeInUp.delay(60).springify()} style={tarjeta}>
        <EliteText style={[s.eyebrow, { color: t.textoSecundario }]}>{eyebrow}</EliteText>
        <EliteText style={[s.titulo, { color: t.texto }]}>Tu evaluación está en preparación</EliteText>
        <EliteText style={[s.texto, { color: t.textoSecundario }]}>
          {`Cuando ${NOMBRE_COACH_ELITE} la cargue, aquí verás en qué semana de tu programa vas.`}
        </EliteText>
      </Animated.View>
    );
  }

  // 8-oct-2026 (nivel 2): por empezar, dentro de Mi programa. Se mira antes
  // que el avance: aquí `avance` es null porque no ha empezado.
  if (vista.vista === 'compacta' && vista.porEmpezar) {
    return (
      <Animated.View entering={FadeInUp.delay(60).springify()} style={tarjeta}>
        <EliteText style={[s.eyebrow, { color: t.textoSecundario }]}>{eyebrow}</EliteText>
        <EliteText style={[s.titulo, { color: t.texto }]}>{vista.nombre ?? 'Tu programa'}</EliteText>
        <EliteText style={[s.texto, { color: t.textoSecundario }]}>{lineaPorEmpezar(vista.porEmpezar)}</EliteText>
      </Animated.View>
    );
  }

  // 'fecha_ilegible' (HOY) y 'compacta' (Mi programa): la tarjeta plana de
  // siempre. En 'fecha_ilegible' no hay avance: se dice, no se inventa.
  const a = vista.vista === 'compacta' ? vista.avance : null;
  return (
    <Animated.View entering={FadeInUp.delay(60).springify()} style={tarjeta}>
      <EliteText style={[s.eyebrow, { color: t.textoSecundario }]}>{eyebrow}</EliteText>
      {a === null ? (
        <EliteText style={[s.texto, { color: t.textoSecundario }]}>
          No se pudo leer la fecha de inicio de tu programa.
        </EliteText>
      ) : a.completado ? (
        <>
          <EliteText style={[s.titulo, { color: t.texto }]}>Programa completado</EliteText>
          <EliteText style={[s.texto, { color: t.textoSecundario }]}>
            {`Terminaste tus ${a.semanasTotales} semanas. Vas en la semana ${a.semana}, de seguimiento.`}
          </EliteText>
        </>
      ) : (
        <>
          <EliteText
            style={[s.titulo, { color: t.texto }]}
            accessibilityLabel={`Semana ${a.semana} de ${a.semanasTotales}, día ${a.dia}`}
          >
            {`Semana ${a.semana} de ${a.semanasTotales}`}
          </EliteText>
          <EliteText style={[s.texto, { color: t.textoSecundario }]}>{`Día ${a.dia}`}</EliteText>
          <View
            style={[s.pista, { backgroundColor: dark ? t.flotante : t.hundido }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: a.pct }}
          >
            <View style={[s.relleno, { width: `${a.pct}%`, backgroundColor: lima }]} />
          </View>
        </>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  // 8-oct-2026 (revisión en frío): la misma caja que la tarjeta editorial que
  // viene: HoyResumenCard deja Spacing.md a los lados y EditorialCard mide
  // 16:9 con Spacing.md abajo. Antes eran 96 px de alto y el contenido brincaba.
  hueco: { aspectRatio: 16 / 9, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  eyebrow: { fontFamily: Fonts.semiBold, fontSize: SECTION_TITLE.fontSize, letterSpacing: SECTION_TITLE.letterSpacing },
  titulo: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, marginTop: 2 },
  texto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.sm },
  relleno: { height: 6, borderRadius: 3 },
  boton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  botonTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
