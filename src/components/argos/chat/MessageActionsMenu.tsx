/**
 * MessageActionsMenu — menú propio del long-press en burbuja (MB-21 P4.4).
 * Antes era un Alert nativo; ahora un sheet en el lenguaje de la app
 * (ELEVATION[3] = popover flotante).
 */
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ATP_BRAND, ELEVATION, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  /** Editar y reenviar: solo mensajes del usuario y sin turno en vuelo. */
  canEdit: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export function MessageActionsMenu({ visible, canEdit, onCopy, onEdit, onClose }: Props) {
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

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end', paddingHorizontal: Spacing.md, paddingBottom: 32,
  },
  sheet: {
    backgroundColor: ELEVATION[3].bg, borderWidth: 1, borderColor: ELEVATION[3].border,
    borderRadius: Radius.md, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 15,
  },
  rowPressed: { backgroundColor: ELEVATION[2].bg },
  rowText: { color: TEXT.primary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  cancelRow: {
    justifyContent: 'center', borderTopWidth: 0.5, borderTopColor: ELEVATION[3].border,
  },
  cancelText: { color: TEXT.secondary, fontSize: FontSizes.md, fontFamily: Fonts.regular },
});
