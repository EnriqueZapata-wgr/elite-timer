/**
 * PerfilMarcadores (8-oct-2026 (v4)): los marcadores del documento
 * agrupados por estado (primero los que piden accion). Cada fila: nombre,
 * valor con unidad y la pildora del estado. Al tocarla se abre su detalle
 * ahi mismo (PerfilMarcadorDetalle). Si se llego desde un sistema, arriba va
 * el filtro con su "quitar".
 *
 * 8-oct-2026 (v4, revision en frio): la fila abierta la controla la pantalla
 * (para el enlace `/salud?marcador=<key>`), y cuando hay un marcador que
 * enfocar se reporta su altura dentro de esta pieza (onPosicionFila) para que
 * la pantalla lo traiga a la vista.
 */
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import type { EliteMarcador } from '@/src/services/elite/elite-v3-core';
import type { GrupoMarcadoresVista, InsumosVinculo } from '@/src/services/perfil/perfil-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { colorEstado, suave, TOQUE_MIN } from './perfil-ui';
import { PerfilMarcadorDetalle } from './PerfilMarcadorDetalle';

interface Props {
  grupos: GrupoMarcadoresVista[];
  /** Los marcadores crudos del documento, por llave (para el detalle). */
  porKey: ReadonlyMap<string, EliteMarcador>;
  programa: boolean;
  /** null mientras se lee el plan. */
  insumos: InsumosVinculo | null;
  filtro: { key: string; nombre: string } | null;
  onQuitarFiltro: () => void;
  /** La fila abierta (una a la vez); null = ninguna. */
  abierto: string | null;
  onAbrir: (key: string | null) => void;
  /** Llave a traer a la vista; cuando se conoce su altura se llama onPosicionFila una vez. */
  enfocar?: string | null;
  onPosicionFila?: (y: number) => void;
  onReintentarPlan: () => void;
  reintentandoPlan: boolean;
}

export function PerfilMarcadores({
  grupos, porKey, programa, insumos, filtro, onQuitarFiltro, abierto, onAbrir, enfocar, onPosicionFila,
  onReintentarPlan, reintentandoPlan,
}: Props) {
  const t = useSurfaceTokens();
  const yGrupo = useRef(new Map<string, number>());
  const yCard = useRef(new Map<string, number>());
  const yFila = useRef(new Map<string, number>());
  const reportado = useRef<string | null>(null);
  const intentarReportar = useCallback(() => {
    if (!enfocar || !onPosicionFila || reportado.current === enfocar) return;
    const grupo = grupos.find((g) => g.marcadores.some((m) => m.key === enfocar));
    if (!grupo) return;
    const gk = grupo.estado ?? 'sin';
    const a = yGrupo.current.get(gk);
    const b = yCard.current.get(gk);
    const c = yFila.current.get(enfocar);
    if (a === undefined || b === undefined || c === undefined) return;
    reportado.current = enfocar;
    onPosicionFila(a + b + c);
  }, [enfocar, onPosicionFila, grupos]);
  // Una llave nueva se vuelve a reportar; y si las alturas ya estaban, se reporta ya.
  useEffect(() => {
    if (!enfocar) reportado.current = null;
    intentarReportar();
  }, [enfocar, intentarReportar]);
  return (
    <View style={s.caja}>
      {filtro ? (
        <AnimatedPressable
          onPress={() => { haptic.light(); onQuitarFiltro(); }}
          accessibilityRole="button"
          accessibilityLabel={`Quitar el filtro de ${filtro.nombre}`}
          style={[s.filtro, { borderColor: t.borde, backgroundColor: t.card }]}
        >
          <EliteText style={[s.filtroTexto, { color: t.texto }]} numberOfLines={1}>Sistema: {filtro.nombre}</EliteText>
          <Ionicons name="close" size={16} color={t.textoSecundario} />
        </AnimatedPressable>
      ) : null}
      {grupos.map((g) => {
        const color = colorEstado(t, g.token);
        return (
          <View
            key={g.estado ?? 'sin'}
            style={s.grupo}
            onLayout={(e) => { yGrupo.current.set(g.estado ?? 'sin', e.nativeEvent.layout.y); intentarReportar(); }}
          >
            <View style={s.grupoCabeza}>
              <View style={[s.punto, { backgroundColor: color }]} />
              <EliteText style={[s.grupoTitulo, { color: t.textoSecundario }]} accessibilityRole="header">
                {g.titulo.toUpperCase()} · {g.marcadores.length}
              </EliteText>
            </View>
            <View
              style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}
              onLayout={(e) => { yCard.current.set(g.estado ?? 'sin', e.nativeEvent.layout.y); intentarReportar(); }}
            >
              {g.marcadores.map((m, i) => {
                const abiertoEste = abierto === m.key;
                const crudo = porKey.get(m.key);
                const colorM = colorEstado(t, m.token);
                return (
                  <View
                    key={m.key}
                    style={i > 0 ? [s.separador, { borderTopColor: t.borde }] : null}
                    onLayout={(e) => { yFila.current.set(m.key, e.nativeEvent.layout.y); intentarReportar(); }}
                  >
                    <AnimatedPressable
                      onPress={() => { haptic.light(); onAbrir(abiertoEste ? null : m.key); }}
                      accessibilityRole="button"
                      accessibilityLabel={[m.nombre, m.valorTexto, m.etiqueta].filter(Boolean).join(', ')}
                      accessibilityState={{ expanded: abiertoEste }}
                      style={s.fila}
                    >
                      <EliteText style={[s.nombre, { color: t.texto }]} numberOfLines={2}>{m.nombre}</EliteText>
                      <View style={s.derecha}>
                        <EliteText style={[s.valor, { color: t.texto }]}>{m.valorTexto}</EliteText>
                        {m.etiqueta ? (
                          <View style={[s.pildora, { backgroundColor: suave(colorM, 0.16) }]}>
                            <EliteText style={[s.pildoraTexto, { color: colorM }]} numberOfLines={1}>{m.etiqueta}</EliteText>
                          </View>
                        ) : null}
                      </View>
                      <Ionicons name={abiertoEste ? 'chevron-up' : 'chevron-down'} size={16} color={t.textoTenue} />
                    </AnimatedPressable>
                    {abiertoEste && crudo ? (
                      <PerfilMarcadorDetalle
                        marcador={crudo}
                        programa={programa}
                        insumos={insumos}
                        onReintentarPlan={onReintentarPlan}
                        reintentandoPlan={reintentandoPlan}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  filtro: {
    minHeight: TOQUE_MIN, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.sm,
    borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.md,
  },
  filtroTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, maxWidth: 260 },
  grupo: { gap: Spacing.sm },
  grupoCabeza: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  grupoTitulo: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1.5 },
  card: { borderRadius: Radius.card, borderWidth: 1, paddingHorizontal: Spacing.md },
  separador: { borderTopWidth: StyleSheet.hairlineWidth },
  fila: { minHeight: TOQUE_MIN + 8, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  nombre: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  derecha: { alignItems: 'flex-end', gap: 4, maxWidth: '45%' },
  valor: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  pildora: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pildoraTexto: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
});
