/**
 * EdadAtpShareCard — tarjeta visual para compartir (Stories 9:16 o feed 1:1).
 * Diseñada para capturarse con view-shot (commit 21). Branding ATP discreto.
 *
 * ATP 3.0 (6-sep-2026, ruta 2.4): se amplia con los tres marcadores de mayor
 * impacto en semaforo (props opcionales, vacias por defecto para no romper a
 * quien ya la usa), la marca ATP y un disclaimer corto. Sigue cabiendo en
 * 9:16 y en 1:1: el cuadrado usa el numero heroico compacto.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { edadDeltaYears, classifyEdadDelta } from '@/src/services/edad-atp/edad-delta-core';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';
import { ATP_BRAND, THEME_DARK } from '@/src/constants/brand';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { EDAD_STATUS } from '@/src/components/edad-atp/tokens';
import { ESTADO_LABEL, type EstadoLab } from '@/src/services/edad-atp/labs-premium-core';

/** Los tres estados del semaforo: un marcador sin banda no se pinta en la tarjeta. */
export type EstadoSemaforo = Exclude<EstadoLab, 'sin_banda'>;

/**
 * ATP 3.0 (6-sep-2026, ruta 2.4): un marcador ya resuelto para pintarse en la
 * tarjeta. Quien la usa elige cuales (los tres de mayor impacto, mismo
 * criterio que la ficha de Free: `marcadoresAbiertosFree` en
 * limites-free-core) y formatea el valor con su unidad; la tarjeta solo pinta
 * el semaforo de tres estados con los mismos colores que ATP Labs.
 */
export interface MarcadorTarjeta {
  key: string;
  /** Nombre corto (abreviatura de component-meta): cabe en una columna. */
  etiqueta: string;
  /** Valor ya formateado, con unidad si la hay. */
  valor: string;
  estado: EstadoSemaforo;
}

const COLOR_ESTADO: Record<EstadoSemaforo, string> = {
  optimo: EDAD_STATUS.good,
  aceptable: EDAD_STATUS.neutral,
  atencion: EDAD_STATUS.bad,
};

/** Copy legal corto de la tarjeta (ruta 2.4). Sin palabras rojas del informe legal. */
export const DISCLAIMER_TARJETA = 'Estimación informativa a partir de tus marcadores. No es una conclusión médica.';

const DIMS = [
  { key: 'metabolica', icon: '🩸' },
  { key: 'corporal', icon: '💪' },
  { key: 'cardiovascular', icon: '❤️' },
  { key: 'fitness', icon: '🏃' },
  { key: 'cognitiva', icon: '🧠' },
] as const;

interface Props {
  result: EdadAtpV2Result;
  format?: 'story' | 'square';
  /** Hasta tres marcadores en semaforo. Vacio: la tarjeta se pinta como antes, sin la franja. */
  marcadores?: MarcadorTarjeta[];
}

export function EdadAtpShareCard({ result, format = 'story', marcadores = [] }: Props) {
  // El cuadrado tiene la mitad de alto que la story: el numero heroico baja de
  // tamano y el padding se recorta para que la franja de marcadores y el
  // disclaimer sigan cabiendo sin recortar la captura.
  const compacto = format === 'square';
  const tres = marcadores.slice(0, 3);
  // P1.6: signo desde edad-delta-core (aquí el delta local estaba con la
  // convención OPUESTA al motor — correcto de chiripa). El copy celebratorio
  // del share se conserva; solo la clasificación viene del core.
  const delta = edadDeltaYears(result.chronological_age, result.edad_integral);
  const cls = classifyEdadDelta(delta);
  const highlight = cls === 'younger'
    ? `${Math.abs(delta)} años más joven que tu edad real`
    : cls === 'older' ? `Trabajemos: ${Math.abs(delta)} años por mejorar` : 'En línea con tu edad real';

  return (
    <View style={[styles.card, compacto ? styles.square : styles.story]}>
      {/* Marca ATP: la pastilla lima con el logotipo en texto es la firma de la
          tarjeta cuando circula fuera de la app. */}
      <View style={styles.brandRow}>
        <View style={styles.brandBadge}>
          <EliteText style={styles.brandBadgeText}>ATP</EliteText>
        </View>
        <EliteText style={styles.brandTop}>MI EDAD ATP</EliteText>
      </View>

      <View style={styles.center}>
        <EliteText style={styles.label}>EDAD BIOLÓGICA INTEGRAL</EliteText>
        <EliteText style={[styles.value, compacto && styles.valueCompacto]}>{result.edad_integral.toFixed(1)}</EliteText>
        <EliteText style={styles.chrono}>cronológica {result.chronological_age}</EliteText>
        <EliteText style={[styles.highlight, compacto && styles.highlightCompacto]}>{highlight}</EliteText>
      </View>

      <View style={styles.subsRow}>
        {DIMS.map((d) => {
          const sub = (result.sub_edades as any)[d.key]?.age_years ?? result.chronological_age;
          return (
            <View key={d.key} style={styles.subItem}>
              <EliteText style={styles.subIcon}>{d.icon}</EliteText>
              <EliteText style={styles.subAge}>{Math.round(sub)}</EliteText>
            </View>
          );
        })}
      </View>

      {tres.length > 0 ? (
        <View style={[styles.marcadoresBox, compacto && styles.marcadoresBoxCompacto]}>
          <EliteText style={styles.marcadoresTitulo}>
            {tres.length === 1 ? 'MI MARCADOR DE MAYOR IMPACTO' : 'MIS MARCADORES DE MAYOR IMPACTO'}
          </EliteText>
          <View style={styles.marcadoresRow}>
            {tres.map((m) => (
              <View key={m.key} style={styles.marcadorCol}>
                <View style={styles.marcadorLinea}>
                  <View style={[styles.semaforo, { backgroundColor: COLOR_ESTADO[m.estado] }]} />
                  <EliteText style={styles.marcadorNombre} numberOfLines={1}>{m.etiqueta}</EliteText>
                </View>
                <EliteText style={styles.marcadorValor} numberOfLines={1}>{m.valor}</EliteText>
                <EliteText style={[styles.marcadorEstado, { color: COLOR_ESTADO[m.estado] }]} numberOfLines={1}>
                  {ESTADO_LABEL[m.estado]}
                </EliteText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.pie}>
        <EliteText style={styles.disclaimer} numberOfLines={2}>{DISCLAIMER_TARJETA}</EliteText>
        <EliteText style={styles.footer}>ATP · Sistema operativo de rendimiento humano</EliteText>
      </View>
    </View>
  );
}

// MB-31B remate: la share card es un ASSET de marca que se captura como imagen
// (view-shot): queda oscura y constante en los dos modos, como la card
// editorial. Sus valores se anclan a THEME_DARK para no dejar hex neutros.
const styles = StyleSheet.create({
  card: { backgroundColor: THEME_DARK.fondo, justifyContent: 'space-between', alignItems: 'center' },
  story: { width: 360, aspectRatio: 9 / 16, padding: Spacing.xl },
  square: { width: 360, aspectRatio: 1, padding: Spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  // Negro sobre lima: 13.4:1. La pastilla es forma de marca, no boton.
  brandBadge: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  brandBadgeText: { color: THEME_DARK.textoSobreLima, fontFamily: Fonts.extraBold, fontSize: FontSizes.xs, letterSpacing: 1 },
  brandTop: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, letterSpacing: 3, fontSize: FontSizes.sm },
  center: { alignItems: 'center', gap: 4 },
  label: { color: THEME_DARK.textoSecundario, fontSize: FontSizes.xs, letterSpacing: 2, fontFamily: Fonts.bold },
  value: { color: ATP_BRAND.lime, fontSize: 96, fontFamily: Fonts.extraBold, lineHeight: 104 },
  // 1:1 tiene 312 px utiles de alto: 56/62 deja aire para la franja y el pie.
  valueCompacto: { fontSize: 56, lineHeight: 62 },
  chrono: { color: THEME_DARK.textoSecundario, fontSize: FontSizes.sm },
  highlight: { color: THEME_DARK.texto, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, textAlign: 'center', marginTop: Spacing.sm },
  highlightCompacto: { marginTop: 2 },
  subsRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  subItem: { alignItems: 'center', gap: 2 },
  subIcon: { fontSize: 20 },
  subAge: { color: THEME_DARK.texto, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  // Franja de marcadores sobre THEME_DARK.card: texto secundario 4.77:1, los
  // tres colores de semaforo 4.76:1 o mas como letra y sobrados como forma.
  marcadoresBox: {
    alignSelf: 'stretch', backgroundColor: THEME_DARK.card, borderRadius: Radius.card,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, gap: 6,
  },
  marcadoresBoxCompacto: { paddingVertical: 6 },
  marcadoresTitulo: { color: THEME_DARK.textoSecundario, fontSize: 9, letterSpacing: 1.5, fontFamily: Fonts.bold, textAlign: 'center' },
  marcadoresRow: { flexDirection: 'row', gap: Spacing.xs },
  marcadorCol: { flex: 1, alignItems: 'center', gap: 1 },
  marcadorLinea: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  semaforo: { width: 8, height: 8, borderRadius: 4 },
  marcadorNombre: { color: THEME_DARK.texto, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  marcadorValor: { color: THEME_DARK.texto, fontSize: FontSizes.sm },
  marcadorEstado: { fontSize: 9, fontFamily: Fonts.semiBold, textAlign: 'center' },
  pie: { alignItems: 'center', gap: 4 },
  disclaimer: { color: THEME_DARK.textoSecundario, fontSize: 9, lineHeight: 12, textAlign: 'center' },
  footer: { color: THEME_DARK.textoSecundario, fontSize: FontSizes.xs, textAlign: 'center' },
});
