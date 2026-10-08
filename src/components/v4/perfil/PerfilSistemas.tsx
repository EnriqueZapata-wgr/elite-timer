/**
 * PerfilSistemas (8-oct-2026 (v4)): "Tus diez sistemas". Una fila por
 * sistema, de peor a mejor (ordenarSistemas): nombre, barra cuyo largo es el
 * score (0 a 100) y cuyo color es el estado que firmo quien interpreta, y el
 * numero. Debajo, la leyenda de los estados presentes.
 *
 * Al tocar un sistema la fila se abre y muestra su porque (lo que escribio
 * quien interpreta va primero). 8-oct-2026 (v4, revision en frio): si hay
 * marcadores del documento que caen en el (la matriz lo dice), debajo del
 * porque va "Ver sus N marcadores", que abre Marcadores filtrados a ese
 * sistema. Antes el toque saltaba directo al filtro y el porque no se veia.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { TITULO_TUS_SISTEMAS, type LeyendaEstado, type SistemaVista } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { acento, colorEstado, suave, TOQUE_MIN } from './perfil-ui';

interface Props {
  sistemas: SistemaVista[];
  leyenda: LeyendaEstado[];
  onFiltrar: (sistemaKey: string) => void;
}

export function PerfilSistemas({ sistemas, leyenda, onFiltrar }: Props) {
  const t = useSurfaceTokens();
  const [abierto, setAbierto] = useState<string | null>(null);
  const colorAcento = acento(t);
  const titulo = sistemas.length === 10 ? TITULO_TUS_SISTEMAS : 'Tus sistemas';
  return (
    <View style={s.caja}>
      <EliteText style={[s.titulo, { color: t.texto }]} accessibilityRole="header">{titulo}</EliteText>
      <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
        {sistemas.map((sis, i) => {
          const color = colorEstado(t, sis.token);
          const abiertoEste = abierto === sis.key;
          const tienePorQue = sis.porQue.trim().length > 0;
          const tocable = sis.filtraMarcadores || tienePorQue;
          const verMarcadores = sis.nMarcadores === 1 ? 'Ver su marcador' : `Ver sus ${sis.nMarcadores} marcadores`;
          const etiqueta = [sis.nombre, sis.score !== null ? `${Math.round(sis.score)} de 100` : null, sis.etiqueta]
            .filter(Boolean).join(', ');
          return (
            <View key={sis.key} style={i > 0 ? [s.separador, { borderTopColor: t.borde }] : null}>
              <AnimatedPressable
                disabled={!tocable}
                onPress={() => { haptic.light(); setAbierto(abiertoEste ? null : sis.key); }}
                accessibilityRole="button"
                accessibilityLabel={tocable ? `${etiqueta}. Ver por qué` : etiqueta}
                accessibilityState={tocable ? { expanded: abiertoEste } : undefined}
                style={s.fila}
              >
                <View style={s.cabeza}>
                  <EliteText style={[s.nombre, { color: t.texto }]} numberOfLines={1}>{sis.nombre}</EliteText>
                  <EliteText style={[s.score, { color }]}>{sis.score !== null ? Math.round(sis.score) : '-'}</EliteText>
                  {tocable ? (
                    <Ionicons
                      name={abiertoEste ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={t.textoTenue}
                    />
                  ) : null}
                </View>
                <View style={[s.pista, { backgroundColor: t.hundido }]}>
                  {sis.fraccion !== null ? (
                    <View style={[s.relleno, { width: `${Math.max(2, sis.fraccion * 100)}%`, backgroundColor: color }]} />
                  ) : null}
                </View>
                {sis.etiqueta ? <EliteText style={[s.estado, { color }]}>{sis.etiqueta}</EliteText> : null}
              </AnimatedPressable>
              {abiertoEste ? (
                <View style={s.abierto}>
                  {tienePorQue ? (
                    <EliteText style={[s.porQue, { color: t.textoSecundario }]}>{sis.porQue}</EliteText>
                  ) : null}
                  {sis.filtraMarcadores ? (
                    <AnimatedPressable
                      onPress={() => { haptic.light(); onFiltrar(sis.key); }}
                      accessibilityRole="button"
                      accessibilityLabel={`${verMarcadores} de ${sis.nombre}`}
                      style={[s.ver, { borderColor: colorAcento, backgroundColor: suave(colorAcento, 0.1) }]}
                    >
                      <EliteText style={[s.verTexto, { color: t.texto }]}>{verMarcadores}</EliteText>
                      <Ionicons name="chevron-forward" size={14} color={t.textoSecundario} />
                    </AnimatedPressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      {leyenda.length > 0 ? (
        <View style={s.leyenda}>
          {leyenda.map((l) => (
            <View key={l.estado} style={s.leyendaItem}>
              <View style={[s.punto, { backgroundColor: colorEstado(t, l.token) }]} />
              <EliteText style={[s.leyendaTexto, { color: t.textoSecundario }]}>{l.texto}</EliteText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { paddingHorizontal: Spacing.md },
  titulo: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, marginBottom: Spacing.sm },
  card: { borderRadius: Radius.card, borderWidth: 1, paddingHorizontal: Spacing.md },
  separador: { borderTopWidth: StyleSheet.hairlineWidth },
  fila: { minHeight: TOQUE_MIN, paddingVertical: Spacing.sm + 2, justifyContent: 'center' },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nombre: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  score: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, minWidth: 28, textAlign: 'right' },
  pista: { height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 3 },
  estado: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: 4 },
  abierto: { paddingBottom: Spacing.md, gap: Spacing.sm },
  porQue: { fontSize: FontSizes.sm, lineHeight: 19 },
  ver: {
    minHeight: TOQUE_MIN, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.md,
  },
  verTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
});
