/**
 * ProgramaHeader (25-sep-2026, app Elite DX): "Semana 3 de 12 · Día 17" con su
 * barra. Lo pintan HOY (arriba de todo) y MI PROGRAMA.
 *
 * Estados (regla 13):
 *  - cargando: un hueco del mismo alto, sin spinner (se resuelve en ms).
 *  - sin evaluacion: se dice que Enrique la esta preparando. No es un error
 *    ni un candado; es el primer dia de alguien que acaba de activar su codigo.
 *  - error: "no pudimos leer tu programa" + Reintentar. Nunca "no tienes".
 *  - ok: la semana. Si la fecha guardada no se lee, el programa sin semana
 *    (no se inventa una).
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useProgramaElite } from '@/src/hooks/useProgramaElite';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

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
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const { programa, recargar } = useProgramaElite(userId);
  const primeraRecarga = useRef(recarga);
  useEffect(() => {
    if (recarga === undefined || recarga === primeraRecarga.current) return;
    recargar();
  }, [recarga, recargar]);
  const eyebrow = `TU PROGRAMA CON ${NOMBRE_COACH_ELITE.toUpperCase()}`;
  const tarjeta = [s.card, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.2) : t.bordeEditorial }];

  if (programa.estado === 'cargando') return soloAvance ? null : <View style={s.hueco} />;
  if (soloAvance && programa.estado !== 'ok') return null;
  if (programa.estado === 'sin_evaluacion' && (tieneEvaluacion || !prometerPreparacion)) return null;

  if (programa.estado === 'error') {
    return (
      <View style={tarjeta}>
        <EliteText style={[s.eyebrow, { color: acento }]}>{eyebrow}</EliteText>
        <EliteText style={[s.texto, { color: t.texto }]}>No pudimos leer tu programa. Revisa tu conexión.</EliteText>
        <AnimatedPressable
          onPress={() => { haptic.light(); recargar(); }}
          style={[s.boton, { borderColor: acento }]}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
        >
          <EliteText style={[s.botonTexto, { color: acento }]}>Reintentar</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  if (programa.estado === 'sin_evaluacion') {
    return (
      <Animated.View entering={FadeInUp.delay(60).springify()} style={tarjeta}>
        <EliteText style={[s.eyebrow, { color: acento }]}>{eyebrow}</EliteText>
        <EliteText style={[s.titulo, { color: t.texto }]}>Tu evaluación está en preparación</EliteText>
        <EliteText style={[s.texto, { color: t.textoSecundario }]}>
          {`Cuando ${NOMBRE_COACH_ELITE} la cargue, aquí verás en qué semana de tu programa vas.`}
        </EliteText>
      </Animated.View>
    );
  }

  const a = programa.avance;
  return (
    <Animated.View entering={FadeInUp.delay(60).springify()} style={tarjeta}>
      <EliteText style={[s.eyebrow, { color: acento }]}>{eyebrow}</EliteText>
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
            <View style={[s.relleno, { width: `${a.pct}%`, backgroundColor: acento }]} />
          </View>
        </>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  hueco: { height: 96, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: 14,
    gap: 4,
  },
  eyebrow: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2 },
  titulo: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, marginTop: 2 },
  texto: { fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  relleno: { height: 6, borderRadius: 3 },
  boton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 },
  botonTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
