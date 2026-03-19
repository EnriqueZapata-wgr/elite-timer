import { View, StyleSheet } from 'react-native';
import { BlockColors, Colors, Spacing } from '@/constants/theme';
import type { Block } from '@/types/models';

interface BlockIndicatorProps {
  /** Lista de bloques de la rutina */
  blocks: Block[];
  /** Índice del bloque activo */
  currentIndex: number;
}

/**
 * BlockIndicator — Fila de dots que muestra el progreso por bloques.
 * El bloque activo se muestra en su color tipo, los completados en gris.
 */
export function BlockIndicator({ blocks, currentIndex }: BlockIndicatorProps) {
  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        const color = BlockColors[block.type];
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <View
            key={block.id + index}
            style={[
              styles.dot,
              {
                backgroundColor: isActive
                  ? color
                  : isCompleted
                    ? Colors.textSecondary
                    : Colors.surfaceLight,
              },
              isActive && styles.activeDot,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
