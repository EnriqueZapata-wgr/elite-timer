/**
 * PerfilCruces (8-oct-2026 (v4)): los cruces de la segunda entrega. Cada
 * tarjeta: el titulo, los origenes que el documento declara (Genética,
 * Laboratorio, Tu vida; si no se pueden derivar, solo el hallazgo), el
 * hallazgo, por que pasa (consecuencia) y que hacer (accion), con su boton a
 * Mi plan.
 */
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { ETIQUETA_ORIGEN, RUTAS_PERFIL, type CruceVista } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { acento, suave, TOQUE_MIN } from './perfil-ui';

interface Props {
  cruces: CruceVista[];
}

export function PerfilCruces({ cruces }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const color = acento(t);
  return (
    <View style={s.caja}>
      {cruces.map((c, i) => (
        <View key={`${i}-${c.titulo}`} style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
          <EliteText style={[s.numero, { color }]}>CRUCE {i + 1}</EliteText>
          <EliteText style={[s.titulo, { color: t.texto }]} accessibilityRole="header">{c.titulo}</EliteText>
          {c.origenes.length > 0 ? (
            <View style={s.origenes}>
              {c.origenes.map((o) => (
                <View key={o} style={[s.origen, { borderColor: t.borde, backgroundColor: t.hundido }]}>
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
          {c.evidencia ? <EliteText style={[s.evidencia, { color: t.textoTenue }]}>Evidencia: {c.evidencia}</EliteText> : null}
          <AnimatedPressable
            onPress={() => { haptic.light(); router.push(RUTAS_PERFIL.plan); }}
            accessibilityRole="button"
            accessibilityLabel={`Ver en mi plan: ${c.titulo}`}
            style={[s.boton, { borderColor: color, backgroundColor: suave(color, 0.1) }]}
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
  numero: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2 },
  titulo: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, lineHeight: 22 },
  origenes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: Spacing.xs },
  origen: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  origenTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1.5, marginTop: Spacing.sm },
  parrafo: { fontSize: FontSizes.sm, lineHeight: 20 },
  evidencia: { fontSize: FontSizes.xs, marginTop: Spacing.xs },
  boton: {
    minHeight: TOQUE_MIN, alignSelf: 'flex-start', marginTop: Spacing.sm, borderWidth: 1, borderRadius: 999,
    paddingHorizontal: Spacing.md, justifyContent: 'center',
  },
  botonTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
