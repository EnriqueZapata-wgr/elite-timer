/**
 * TabCabecera (14-oct-2026) — la cabecera de una pestaña: ceja gris y
 * titulo de pantalla.
 *
 * POR QUE EXISTE
 * La revisión de marca encontró cabeceras de pestaña "Lima Brutalist": ceja
 * lima con letterSpacing 3 y titulo de 28 px ExtraBold en mayusculas con
 * letterSpacing 2 (Apps, el hub de Salud). La marca (docs/DESIGN_SYSTEM.md;
 * docs/MANUAL_DE_MARCA.md, tipografia) pide:
 *   · ceja = titulo de seccion de la casa (SECTION_TITLE: 11, 600,
 *     letterSpacing 2, mayusculas, gris). Nunca lima.
 *   · titulo = FontSizes.hero en Bold, sin mayusculas forzadas ni
 *     letterSpacing grande (el letterSpacing 3 es solo del logo).
 * Una sola pieza para Apps, Salud y Perfil, asi las tres se leen igual.
 *
 * Sin estado. Va DENTRO del <TabScreen themed> (lee los tokens del scope con
 * useTintaMarca). No pone margen lateral: lo pone quien la monta.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { useTintaMarca } from '@/src/components/marca/useTintaMarca';
import { SECTION_TITLE } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';

export interface TabCabeceraProps {
  /** Ceja arriba del titulo (se pinta en mayusculas, gris). */
  ceja?: string;
  /** El nombre de la pantalla, tal cual se escribe (sin forzar mayusculas). */
  titulo: string;
  /** Algo a la derecha del titulo (un boton de cromo, un avatar). */
  derecha?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function TabCabecera({ ceja, titulo, derecha, style }: TabCabeceraProps) {
  const { t } = useTintaMarca();
  return (
    <View style={[s.fila, style]}>
      <View style={s.textos}>
        {ceja ? <EliteText style={[s.ceja, { color: t.textoSecundario }]}>{ceja}</EliteText> : null}
        <EliteText style={[s.titulo, { color: t.texto }]} accessibilityRole="header" numberOfLines={2}>
          {titulo}
        </EliteText>
      </View>
      {derecha ? <View style={s.derecha}>{derecha}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  fila: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  textos: { flex: 1 },
  ceja: {
    fontFamily: Fonts.semiBold,
    fontSize: SECTION_TITLE.fontSize,
    letterSpacing: SECTION_TITLE.letterSpacing,
    textTransform: SECTION_TITLE.textTransform,
    marginBottom: Spacing.xs,
  },
  titulo: { fontFamily: Fonts.bold, fontSize: FontSizes.hero, lineHeight: FontSizes.hero + Spacing.sm },
  derecha: { alignItems: 'flex-end', justifyContent: 'flex-end' },
});
