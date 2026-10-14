/**
 * PerfilGenetica (8-oct-2026 (v4)): con hallazgos, la lista por tema; sin
 * ellos, la cara honesta que decide perfil-core: Elite en su primera entrega
 * lee que su genetica llega en la segunda; un programa lee, sin promesa, que
 * no la incluye.
 *
 * 14-oct-2026 (ronda de marca): bordes neutros, cejas con LETTER_SPACING.wide
 * y la evidencia (10 px) en textoSecundario.
 */
import { StyleSheet, View } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';
import { LETTER_SPACING } from '@/src/constants/brand';
import type { GeneticaVista } from '@/src/services/perfil/perfil-core';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { acento } from './perfil-ui';

export function PerfilGenetica({ genetica }: { genetica: GeneticaVista }) {
  const { t, borde } = useTintaMarca();
  const color = acento(t);
  if (genetica.estado !== 'hallazgos') {
    return (
      <View style={s.caja}>
        <View style={[s.card, s.teaser, { backgroundColor: t.card, borderColor: borde }]}>
          <AppIcon name="genetica" size={32} color={genetica.estado === 'por_llegar' ? color : t.textoSecundario} />
          <EliteText style={[s.titulo, { color: t.texto }]}>{genetica.titulo}</EliteText>
          <EliteText style={[s.parrafo, { color: t.textoSecundario }]}>{genetica.texto}</EliteText>
        </View>
      </View>
    );
  }
  return (
    <View style={s.caja}>
      {genetica.intro ? <EliteText style={[s.parrafo, { color: t.textoSecundario }]}>{genetica.intro}</EliteText> : null}
      {genetica.hallazgos.map((h, i) => (
        <View key={`${i}-${h.titulo}`} style={[s.card, { backgroundColor: t.card, borderColor: borde }]}>
          <EliteText style={[s.tema, { color }]}>{h.tema.toUpperCase()}</EliteText>
          <EliteText style={[s.titulo, { color: t.texto }]}>{h.titulo}</EliteText>
          <EliteText style={[s.parrafo, { color: t.texto }]}>{h.hallazgo}</EliteText>
          {h.implicacion ? <EliteText style={[s.parrafo, { color: t.textoSecundario }]}>{h.implicacion}</EliteText> : null}
          {h.queHacer ? (
            <>
              <EliteText style={[s.sub, { color: t.textoSecundario }]}>QUÉ HACER</EliteText>
              <EliteText style={[s.parrafo, { color: t.texto }]}>{h.queHacer}</EliteText>
            </>
          ) : null}
          {h.evidencia ? <EliteText style={[s.evidencia, { color: t.textoSecundario }]}>Evidencia: {h.evidencia}</EliteText> : null}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  card: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.md, gap: Spacing.xs },
  teaser: { alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.lg },
  tema: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: LETTER_SPACING.wide },
  titulo: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, lineHeight: 22 },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: LETTER_SPACING.wide, marginTop: Spacing.sm },
  parrafo: { fontSize: FontSizes.sm, lineHeight: 20 },
  evidencia: { fontSize: FontSizes.xs, marginTop: Spacing.xs },
});
