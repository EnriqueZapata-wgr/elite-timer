/**
 * AddBlockButton — Botón "+" para agregar un bloque nuevo.
 *
 * Muestra un menú con opciones: Grupo, Trabajo, Descanso, Preparación.
 * Al seleccionar, crea un Block con defaults inteligentes.
 */
import { useState } from 'react';
import { View, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import type { Block } from '@/src/engine/types';
import { generateId } from '@/src/utils/routine-storage';

interface AddBlockButtonProps {
  /** ID del bloque padre (null para nivel raíz) */
  parentId: string | null;
  /** Callback con el bloque nuevo creado */
  onAdd: (block: Block) => void;
  /** Texto del botón (default: "Agregar paso") */
  label?: string;
}

/** Opciones de pasos (hojas) */
const STEP_OPTIONS: {
  type: Block['type'];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}[] = [
  {
    type: 'work',
    label: 'Trabajo',
    icon: 'flash-outline',
    color: '#a8e02a',
    description: 'Ejercicio o acción activa',
  },
  {
    type: 'rest',
    label: 'Descanso',
    icon: 'pause-outline',
    color: '#5B9BD5',
    description: 'Pausa entre ejercicios',
  },
  {
    type: 'prep',
    label: 'Preparación',
    icon: 'hourglass-outline',
    color: '#EF9F27',
    description: 'Tiempo de transición',
  },
];

/** Defaults inteligentes para cada tipo de bloque */
function createDefaultBlock(type: Block['type'], parentId: string | null): Block {
  const base = {
    id: generateId(),
    parent_block_id: parentId,
    sort_order: 0, // Se asigna correctamente al insertar
    rounds: 1,
    rest_between_seconds: 0,
    sound_start: 'default',
    sound_end: 'default',
    notes: '',
  };

  switch (type) {
    case 'group':
      return {
        ...base,
        type: 'group',
        label: 'Bloque',
        duration_seconds: null,
        color: '#888888',
        children: [],
      };
    case 'work':
      return {
        ...base,
        type: 'work',
        label: 'Trabajo',
        duration_seconds: 30,
        color: '#a8e02a',
      };
    case 'rest':
      return {
        ...base,
        type: 'rest',
        label: 'Descanso',
        duration_seconds: 15,
        color: '#5B9BD5',
      };
    case 'prep':
      return {
        ...base,
        type: 'prep',
        label: 'Preparación',
        duration_seconds: 10,
        color: '#EF9F27',
      };
  }
}

export function AddBlockButton({ parentId, onAdd, label = 'Agregar paso' }: AddBlockButtonProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleSelect = (type: Block['type']) => {
    const block = createDefaultBlock(type, parentId);
    onAdd(block);
    setMenuVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setMenuVisible(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={16} color={Colors.neonGreen} />
        <EliteText variant="caption" style={styles.buttonText}>{label}</EliteText>
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        {/* Overlay: toque en el fondo cierra el menú */}
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          {/* Pressable interno: bloquea propagación de toques al overlay */}
          <Pressable style={styles.menu}>
            <EliteText variant="label" style={styles.menuTitle}>
              ¿QUÉ TIPO DE BLOQUE?
            </EliteText>

            {/* Opción: Grupo (container con rounds) */}
            <Pressable
              onPress={() => handleSelect('group')}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <View style={[styles.menuDot, { backgroundColor: '#888888' }]} />
              <View style={styles.menuItemContent}>
                <EliteText variant="body" style={styles.menuItemLabel}>
                  Grupo
                </EliteText>
                <EliteText variant="caption">Contiene pasos, se repite N rondas</EliteText>
              </View>
              <Ionicons name="layers-outline" size={20} color="#888888" />
            </Pressable>

            {/* Separador visual */}
            <View style={styles.menuSeparator} />
            <EliteText variant="caption" style={styles.menuSectionLabel}>PASOS</EliteText>

            {/* Opciones: Trabajo, Descanso, Preparación */}
            {STEP_OPTIONS.map(opt => (
              <Pressable
                key={opt.type}
                onPress={() => handleSelect(opt.type)}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              >
                <View style={[styles.menuDot, { backgroundColor: opt.color }]} />
                <View style={styles.menuItemContent}>
                  <EliteText variant="body" style={styles.menuItemLabel}>
                    {opt.label}
                  </EliteText>
                  <EliteText variant="caption">{opt.description}</EliteText>
                </View>
                <Ionicons name={opt.icon} size={20} color={opt.color} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },
  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  menuTitle: {
    letterSpacing: 2,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: Colors.neonGreen,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  menuItemPressed: {
    backgroundColor: Colors.surfaceLight,
  },
  menuDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: Colors.surfaceLight,
    marginVertical: Spacing.sm,
  },
  menuSectionLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: 10,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});
