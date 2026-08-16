/**
 * MessageActionsMenu — menú propio del long-press en burbuja (MB-21 P4.4).
 * Antes era un Alert nativo; ahora un sheet en el lenguaje de la app
 * (t.flotante = hoja modal / menú emergente del tema).
 */
import { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  visible: boolean;
  /** Editar y reenviar: solo mensajes del usuario y sin turno en vuelo. */
  canEdit: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export function MessageActionsMenu({ visible, canEdit, onCopy, onEdit, onClose }: Props) {
  // MB-31B remate: componente compartido — lee el scope, no el tema global
  // (regla de tránsito: fuera de <ThemeReady> sigue oscuro).
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={s.sheet}>
          <Pressable onPress={onCopy} style={({ pressed }) => [s.row, pressed && s.rowPressed]}>
            <Ionicons name="copy-outline" size={18} color={ATP_BRAND.lime} />
            <Text style={s.rowText}>Copiar</Text>
          </Pressable>
          {canEdit && (
            <Pressable onPress={onEdit} style={({ pressed }) => [s.row, pressed && s.rowPressed]}>
              <Ionicons name="create-outline" size={18} color={ATP_BRAND.lime} />
              <Text style={s.rowText}>Editar y reenviar</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={({ pressed }) => [s.row, s.cancelRow, pressed && s.rowPressed]}>
            <Text style={s.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  backdrop: {
    // Velo del modal. El comentario anterior decía que no había convención de
    // scrim; sí la hay, y son las otras ~40 hojas de la app: en claro el negro
    // se cambia por la tinta del texto (#0F1518) a baja opacidad, para que la
    // pantalla no quede en penumbra detrás de la hoja.
    flex: 1,
    backgroundColor: t.kind === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(15,21,24,0.35)',
    justifyContent: 'flex-end', paddingHorizontal: Spacing.md, paddingBottom: 32,
  },
  sheet: {
    backgroundColor: t.flotante, borderWidth: 1, borderColor: t.bordeMarcado,
    borderRadius: Radius.md, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 15,
  },
  // Feedback de presión: superficie recedida (más oscura que la hoja en los
  // dos modos; t.flotante aquí la haría invisible porque ES el fondo).
  rowPressed: { backgroundColor: t.hundido },
  rowText: { color: t.texto, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  cancelRow: {
    justifyContent: 'center', borderTopWidth: 0.5, borderTopColor: t.bordeMarcado,
  },
  cancelText: { color: t.textoSecundario, fontSize: FontSizes.md, fontFamily: Fonts.regular },
});
