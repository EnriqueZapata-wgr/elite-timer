import { useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps, type ViewStyle } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface EliteInputProps extends TextInputProps {
  /** Etiqueta superior del campo */
  label?: string;
  /** Estilos adicionales del contenedor */
  containerStyle?: ViewStyle;
}

/**
 * EliteInput — Campo de texto con estilo ELITE.
 * Fondo oscuro, borde verde en focus, tipografía Poppins.
 */
export function EliteInput({ label, containerStyle, style, ...props }: EliteInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <EliteText variant="label" style={styles.label}>
          {label}
        </EliteText>
      )}
      <TextInput
        style={[styles.input, focused && styles.focused, style]}
        placeholderTextColor={Colors.textSecondary}
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
  },
  label: {
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    color: Colors.textPrimary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
  },
  focused: {
    borderColor: Colors.neonGreen,
  },
});
