/**
 * BackButton — Botón de retroceso reutilizable con haptic y touch target 44px.
 *
 * 19.1: registra nav propia. Dibujar este botón ES declarar "esta pantalla ya
 * tiene con qué regresar", así que la casita flotante global se retira sola —
 * el registro viene gratis con la flecha, sin que nadie tenga que acordarse.
 */
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { haptic } from '@/src/utils/haptics';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';
import { TEXT_COLORS } from '@/src/constants/brand';

interface Props {
  onPress?: () => void;
  color?: string;
  icon?: 'chevron-back' | 'close' | 'arrow-back';
}

export function BackButton({ onPress, color = TEXT_COLORS.secondary, icon = 'chevron-back' }: Props) {
  const router = useRouter();
  useRegisterOwnNav();

  return (
    <Pressable
      onPress={() => { haptic.light(); onPress ? onPress() : router.back(); }}
      style={styles.btn}
      hitSlop={8}
    >
      <Ionicons name={icon} size={24} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
