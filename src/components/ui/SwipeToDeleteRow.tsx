/**
 * SwipeToDeleteRow — Affordance visible de eliminación.
 *
 * Wrappea contenido y revela un botón rojo de "Eliminar" al deslizar a la
 * izquierda. Pensado para los 4 contextos donde Paty/Mariana reportaron
 * "no sabía que se podía eliminar" (food-register, supplements, my-recipes,
 * journal). El long-press queda disponible como fallback (sigue funcionando
 * en el componente que envuelve, no se desactiva).
 *
 * UX:
 *   - Swipe ← revela botón "Eliminar" con icono.
 *   - Tap en el botón → dispara onConfirmDelete (caller muestra Alert).
 *   - Swipe rápido al borde → mismo resultado.
 *   - El row se vuelve a cerrar si el caller no elimina.
 */
import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

interface Props {
  /** Disparado cuando el usuario toca el botón "Eliminar" o completa swipe full. */
  onConfirmDelete: () => void;
  /** Contenido del row (la celda completa). */
  children: React.ReactNode;
  /** Texto del botón (default: "Eliminar"). */
  deleteLabel?: string;
}

export function SwipeToDeleteRow({ onConfirmDelete, children, deleteLabel = 'Eliminar' }: Props) {
  const swipeRef = useRef<Swipeable | null>(null);

  function handleDelete() {
    // Cerrar el swipe antes de disparar, así si el caller cancela el Alert
    // la fila queda en estado limpio.
    swipeRef.current?.close();
    onConfirmDelete();
  }

  function renderRightActions() {
    return (
      <Pressable onPress={handleDelete} style={s.action} hitSlop={4}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={s.actionText}>{deleteLabel}</Text>
      </Pressable>
    );
  }

  return (
    <Swipeable
      ref={(r) => { swipeRef.current = r; }}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={48}
    >
      {children}
    </Swipeable>
  );
}

const s = StyleSheet.create({
  action: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: '100%',
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    marginVertical: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
