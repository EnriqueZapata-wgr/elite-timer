/**
 * PerfilCruces (8-oct-2026 (v4)): los cruces de la segunda entrega. Cada
 * tarjeta: el titulo, los origenes que el documento declara (Genética,
 * Laboratorio, Tu vida; si no se pueden derivar, solo el hallazgo), el
 * hallazgo, por que pasa (consecuencia) y que hacer (accion), con su boton a
 * Mi plan.
 *
 * 14-oct-2026 (ronda de marca): el boton teal baja su tinte a 6% (texto de
 * color sobre su propio tinte), la evidencia (10 px) deja textoTenue.
 */
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';
import { LETTER_SPACING } from '@/src/constants/brand';
import { ETIQUETA_ORIGEN, RUTAS_PERFIL, type CruceVista } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { acento, suave, TINTE_MAX, TOQUE_MIN } from './perfil-ui';

interface Props {
  cruces: CruceVista[];
}

export function PerfilCruces({ cruces }: Props) {
  const { t, borde } = useTintaMarca();
  const router = useRouter();
  const color = acento(t);
  return (
    <View style={s.caja}>
      {cruces.map((c, i) => (
        <View key={`${i}-${c.titulo}`} style={[s.card, { backgroundColor: t.card, borderColor: borde }]}>
          <EliteText style={[s.numero, { color }]}>CRUCE {i + 1}</EliteText>
          <EliteText style={[s.titulo, { color: t.texto }]} accessibilityRole="header">{c.titulo}</EliteText>
          {c.origenes.length > 0 ? (
            <View style={s.origenes}>
              {c.origenes.map((o) => (
                <View key={o} style={[s.origen, { borderColor: borde, backgroundColor: t.hundido }]}>
                  <EliteText style={[s.origenTexto, { color: t.textoSecundario }]}>{ETIQUETA_ORIGEN[o]}</EliteText>
                </View>
              ))}
            </View>
          ) : null}
          <EliteText style={[s.parrafo, { color: t.texto }]}>{c.hallazgo}</EliteText>
          {c.consecuencia ? (
            <>
              <EliteText style={[s.sub, { color: t.textoSecundario }]}>POR QUÉ PASA</EliteText>
              <EliteText style={[s.parrafo, { color: t.texto }]}>{c.consecuencia}</EliteText>
            </>
          ) : null}
          {c.accion ? (
            <>
              <EliteText style={[s.sub, { color: t.textoSecundario }]}>QUÉ HACEMOS</EliteText>
              <EliteText style={[s.parrafo, { color: t.texto }]}>{c.accion}</EliteText>
            </>
          ) : null}
          {c.evidencia ? <EliteText style={[s.evidencia, { color: t.textoSecundario }]}>Evidencia: {c.evidencia}</EliteText> : null}
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push(RUTAS_PERFIL.plan); }}
            accessibilityRole="button"
            accessibilityLabel={`Ver en mi plan: ${c.titulo}`}
            style={[s.boton, { borderColor: color, backgroundColor: suave(color, TINTE_MAX) }]}
          >
            <EliteText style={[s.botonTexto, { color }]}>Ver en mi plan</EliteText>
          </AnimatedPressable>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  card: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.md, gap: Spacing.xs },
  numero: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: LETTER_SPACING.wide },
  titulo: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, lineHeight: 22 },
  origenes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginVertical: Spacing.xs },
  origen: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  origenTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: LETTER_SPACING.wide, marginTop: Spacing.sm },
  parrafo: { fontSize: FontSizes.sm, lineHeight: 20 },
  evidencia: { fontSize: FontSizes.xs, marginTop: Spacing.xs },
  boton: {
    minHeight: TOQUE_MIN, alignSelf: 'flex-start', marginTop: Spacing.sm, borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md, justifyContent: 'center',
  },
  botonTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
