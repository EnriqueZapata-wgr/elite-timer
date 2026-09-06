/**
 * CandadoBloque (ATP 3.0, 5-sep-2026, ruta 1.11 y 2.9): el candado a bloque
 * completo, para cuando una pantalla entera (la ficha de un marcador) o la
 * acción principal de una pantalla (generar el mapa funcional) está en un
 * nivel que quien mira todavía no tiene.
 *
 * Regla 15 de la casa: lo bloqueado se ve, no desaparece. Aquí se ve: título,
 * una línea que dice qué lo abre, y un botón que lleva al paywall con su
 * contexto. `CandadoNivel` es la píldora chica para filas y mosaicos; este es
 * su hermano grande.
 *
 * Tinta: `t.texto` y `t.textoSecundario`; nunca `sinDatos`. El icono
 * `lock-closed` es cromo, permitido.
 */
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

interface Props {
  titulo: string;
  texto: string;
  /** Etiqueta del botón, por ejemplo "Ver Pro". */
  boton: string;
  /** A dónde lleva el botón (normalmente el paywall con contexto). */
  destino: Href;
}

export function CandadoBloque({ titulo, texto, boton, destino }: Props) {
  const { tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.caja} accessibilityRole="summary">
      <View style={s.icono}>
        <Ionicons name="lock-closed" size={22} color={t.texto} />
      </View>
      <EliteText style={s.titulo}>{titulo}</EliteText>
      <EliteText style={s.texto}>{texto}</EliteText>
      <AnimatedPressable
        onPress={() => { haptic.medium(); router.push(destino); }}
        style={s.boton}
        accessibilityRole="button"
        accessibilityLabel={boton}
      >
        <EliteText style={s.botonTexto}>{boton}</EliteText>
      </AnimatedPressable>
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  caja: {
    alignItems: 'center',
    backgroundColor: t.card,
    borderColor: t.borde,
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  icono: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.flotante,
    borderColor: t.bordeMarcado, borderWidth: 0.5,
  },
  titulo: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: t.texto,
    textAlign: 'center',
  },
  texto: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: t.textoSecundario,
    textAlign: 'center',
    lineHeight: 20,
  },
  boton: {
    marginTop: Spacing.xs,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  botonTexto: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: t.textoSobreLima,
    letterSpacing: 0.5,
  },
});
