/**
 * PerfilRangoBarra (8-oct-2026 (v4)): la barra de rango de un marcador. La
 * geometria (posiciones de 0 a 1) la calcula perfil-core (detalleMarcador);
 * aqui solo se dibuja: el tramo del laboratorio (si el documento lo trae),
 * la banda de "donde te queremos" y el punto del valor, con sus etiquetas en
 * texto (en tema claro el color no puede ser la unica senal).
 */
import { StyleSheet, View } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import type { BarraRango } from '@/src/services/perfil/perfil-core';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { suave } from './perfil-ui';

interface Props {
  barra: BarraRango;
  /** Color del punto (el estado del marcador). */
  colorPunto: string;
}

const PUNTO = 14;

export function PerfilRangoBarra({ barra, colorPunto }: Props) {
  const t = useSurfaceTokens();
  const pct = (x: number) => `${x * 100}%` as const;
  return (
    <View style={s.caja}>
      <View style={s.zona}>
        <View style={[s.pista, { backgroundColor: t.hundido }]} />
        {barra.lab ? (
          <View
            style={[s.tramoLab, {
              left: pct(barra.lab.desde), width: pct(Math.max(0, barra.lab.hasta - barra.lab.desde)),
              borderColor: t.textoTenue,
            }]}
          />
        ) : null}
        {barra.objetivo ? (
          <View
            style={[s.tramoObjetivo, {
              left: pct(barra.objetivo.desde), width: pct(Math.max(0, barra.objetivo.hasta - barra.objetivo.desde)),
              backgroundColor: suave(t.tealTexto, 0.5),
            }]}
          />
        ) : null}
        <View
          style={[s.punto, {
            left: pct(barra.punto), backgroundColor: colorPunto, borderColor: t.card,
          }]}
        />
      </View>
      <View style={s.etiquetas}>
        {barra.etiquetaObjetivo ? (
          <View style={s.etiqueta}>
            <View style={[s.muestra, { backgroundColor: suave(t.tealTexto, 0.5) }]} />
            <EliteText style={[s.texto, { color: t.textoSecundario }]}>{barra.etiquetaObjetivo}</EliteText>
          </View>
        ) : null}
        {barra.etiquetaLab ? (
          <View style={s.etiqueta}>
            <View style={[s.muestra, s.muestraLab, { borderColor: t.textoTenue }]} />
            <EliteText style={[s.texto, { color: t.textoSecundario }]}>{barra.etiquetaLab}</EliteText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caja: { marginTop: Spacing.sm },
  zona: { height: 22, justifyContent: 'center', marginHorizontal: PUNTO / 2 },
  pista: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3 },
  tramoLab: { position: 'absolute', height: 14, borderWidth: 1, borderRadius: 4 },
  tramoObjetivo: { position: 'absolute', height: 6, borderRadius: 3 },
  punto: {
    position: 'absolute', width: PUNTO, height: PUNTO, borderRadius: PUNTO / 2, borderWidth: 2,
    marginLeft: -PUNTO / 2,
  },
  etiquetas: { marginTop: Spacing.xs, gap: 4 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muestra: { width: 14, height: 6, borderRadius: 3 },
  muestraLab: { height: 10, borderWidth: 1, backgroundColor: 'transparent' },
  texto: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
});
