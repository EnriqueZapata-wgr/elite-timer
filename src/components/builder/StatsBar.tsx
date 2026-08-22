/**
 * StatsBar — Bento grid de estadísticas: TOTAL | TRABAJO | DESCANSO.
 *
 * Cada card lleva borde izquierdo de color y superficie por token.
 *
 * Barrido D (22-ago): vivía en oscuro duro (#1f1f1f, #2a2a2a) dentro del
 * Constructor, así que en modo claro salían tres cajas negras sobre acero.
 * Dos cosas más se arreglaron de paso:
 *  · El acento del valor se decidía comparando colores (`accentColor ===
 *    Colors.textSecondary`). Comparar por valor es un candado que se abre
 *    solo el día que dos tokens coinciden. Ahora la card recibe una bandera.
 *  · El lima como TEXTO no se puede en claro (contraste 1.34). El valor de
 *    TRABAJO usa el teal calibrado cuando el tema es claro; el filito de
 *    color de la izquierda sí se queda lima, porque ahí es relleno.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Spacing, Radius, Fonts } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import type { RoutineCalcStats } from '@/src/engine/helpers';

interface StatsBarProps {
  stats: RoutineCalcStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const t = useSurfaceTokens();
  const limaTexto = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  return (
    <View style={styles.row}>
      <StatCard label="TOTAL" value={stats.formattedTotal} filo={t.textoSecundario} textoValor={t.texto} />
      <StatCard label="TRABAJO" value={stats.formattedWork} filo={ATP_BRAND.lime} textoValor={limaTexto} />
      <StatCard label="DESCANSO" value={stats.formattedRest} filo={t.info} textoValor={t.info} />
    </View>
  );
}

function StatCard({ label, value, filo, textoValor }: {
  /** Color del filo izquierdo: es relleno, aguanta el lima en los dos modos. */
  filo: string;
  /** Color del número: pasa por el calibre de contraste del tema. */
  textoValor: string;
  label: string; value: string;
}) {
  const t = useSurfaceTokens();
  return (
    {/* 4EP MEDIO-4: con t.card la stat quedaba en #121212, más oscura que
        las BlockCard de abajo (#232323), cuando antes casi coincidían
        (#1f1f1f). flotante y bordeMarcado dejan el oscuro donde estaba. */}
    <View style={[styles.card, { backgroundColor: t.flotante, borderColor: t.bordeMarcado }]}>
      <View style={[styles.cardAccent, { backgroundColor: filo }]} />
      <EliteText variant="caption" style={[styles.label, { color: t.textoSecundario }]}>{label}</EliteText>
      <EliteText variant="body" style={[styles.value, { color: textoValor }]}>
        {value}
      </EliteText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    paddingLeft: Spacing.sm + 6,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.sm,
    borderBottomLeftRadius: Radius.sm,
  },
  label: {
    letterSpacing: 2,
    fontSize: 9,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  value: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
});
