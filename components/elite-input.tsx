import { useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps, type ViewStyle } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { ATP_BRAND } from '@/src/constants/brand';

interface EliteInputProps extends TextInputProps {
  /** Etiqueta superior del campo */
  label?: string;
  /** Estilos adicionales del contenedor */
  containerStyle?: ViewStyle;
  /** Color de acento opcional (borde en focus + label). Default: verde lima del kit. */
  accentColor?: string;
}

/**
 * EliteInput — Campo de texto con estilo ELITE.
 * Borde de acento en focus, tipografía Poppins.
 * Ancho 100% por default (consistencia entre campos); `accentColor` tiñe focus+label.
 *
 * BLOQ-3: pasó de constantes oscuras a tokens de scope. Fuera de <ThemeReady>
 * `useSurfaceTokens` devuelve THEME_DARK, así que en cualquier pantalla sin
 * migrar (y con la bandera de auth apagada) rinde EXACTAMENTE lo de antes:
 * card #121212, texto #FFFFFF, placeholder #888888.
 */
export function EliteInput({ label, containerStyle, style, accentColor, ...props }: EliteInputProps) {
  const [focused, setFocused] = useState(false);
  const t = useSurfaceTokens();
  const claro = t.kind === 'light';

  // El borde en reposo valía `SURFACES.cardLight` (#232323), que en tokens es
  // `flotante`. En claro `flotante` es casi blanco y el campo desaparecería
  // sobre el fondo acero, así que ahí el rol correcto es `bordeMarcado`.
  const bordeReposo = claro ? t.bordeMarcado : t.flotante;
  // El lima como RELLENO/borde es identidad y se queda; como letra no aplica
  // aquí. En claro el foco va a teal calibrado (regla 1 del manual 3.6).
  const bordeFoco = accentColor ?? (claro ? t.tealTexto : ATP_BRAND.lime);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <EliteText variant="label" style={[styles.label, { color: accentColor ?? t.textoSecundario }]}>
          {label}
        </EliteText>
      )}
      <TextInput
        style={[
          styles.input,
          { backgroundColor: t.card, borderColor: bordeReposo, color: t.texto },
          focused && { borderColor: bordeFoco },
          style,
        ]}
        placeholderTextColor={t.textoSecundario}
        onFocus={e => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    width: '100%', // consistencia: todos los campos al mismo ancho (fix bug login email vs password)
  },
  label: {
    marginBottom: Spacing.xs,
  },
  // BLOQ-3: los colores viajan inline porque dependen del scope de tema.
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
  },
});
