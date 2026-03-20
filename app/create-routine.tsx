import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { BlockBadge } from '@/components/block-badge';
import { DurationPicker } from '@/components/duration-picker';
import { usePrograms } from '@/contexts/programs-context';
import { convertLegacyRoutine } from '@/src/engine/convertLegacy';
import { generateId, type Block, type BlockType, type Routine } from '@/types/models';
import { Colors, BlockColors, BlockTypeLabels, Spacing, Radius } from '@/constants/theme';

// Tipos de bloque disponibles
const BLOCK_TYPES: BlockType[] = ['exercise', 'rest', 'transition', 'final'];

/**
 * Pantalla Crear Rutina — Constructor de bloques para una rutina.
 * Permite agregar bloques (ejercicio, descanso, transición, final),
 * configurar duración de cada uno, y seleccionar rondas.
 */
export default function CreateRoutineScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId?: string }>();
  const { addRoutine } = usePrograms();

  const [name, setName] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([
    { id: generateId(), type: 'exercise', label: 'Ejercicio', durationSeconds: 30 },
    { id: generateId(), type: 'rest', label: 'Descanso', durationSeconds: 15 },
  ]);
  const [rounds, setRounds] = useState(1);

  // Agregar un nuevo bloque
  const addBlock = (type: BlockType) => {
    setBlocks(prev => [
      ...prev,
      {
        id: generateId(),
        type,
        label: BlockTypeLabels[type],
        durationSeconds: type === 'rest' ? 15 : 30,
      },
    ]);
  };

  // Actualizar duración de un bloque
  const updateBlockDuration = (id: string, seconds: number) => {
    setBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, durationSeconds: seconds } : b))
    );
  };

  // Eliminar un bloque
  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  // Calcular duración total
  const totalDuration = blocks.reduce((sum, b) => sum + b.durationSeconds, 0) * rounds;
  const totalMinutes = Math.floor(totalDuration / 60);
  const totalSeconds = totalDuration % 60;

  // Guardar rutina
  const handleSave = () => {
    if (blocks.length === 0) return;

    const routine: Routine = {
      id: generateId(),
      name: name.trim() || 'Mi Rutina',
      blocks,
      totalDuration,
      rounds,
    };

    // Siempre persistir la rutina en el store (con o sin programa)
    addRoutine(routine, programId);

    if (programId) {
      router.dismiss(2); // Volver a Mis Programas
    } else {
      // Sin programa — ir directo al engine de ejecución
      const engineRoutine = convertLegacyRoutine(routine);
      router.replace({
        pathname: '/execution',
        params: { routine: JSON.stringify(engineRoutine) },
      });
    }
  };

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">CREAR RUTINA</EliteText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
          {/* Nombre de la rutina */}
          <EliteInput
            label="Nombre de la rutina"
            placeholder="Ej: Circuito HIIT"
            value={name}
            onChangeText={setName}
          />

          {/* Lista de bloques */}
          <EliteText variant="label" style={styles.sectionLabel}>
            BLOQUES
          </EliteText>

          {blocks.map((block, index) => (
            <View key={block.id} style={styles.blockRow}>
              {/* Número + badge */}
              <View style={styles.blockHeader}>
                <EliteText variant="caption" style={styles.blockNumber}>
                  {index + 1}
                </EliteText>
                <BlockBadge type={block.type} size="md" />
                <View style={styles.spacer} />
                <Pressable onPress={() => removeBlock(block.id)}>
                  <Ionicons name="close-circle" size={22} color={Colors.textSecondary} />
                </Pressable>
              </View>

              {/* Duration picker */}
              <View style={styles.blockDuration}>
                <DurationPicker
                  value={block.durationSeconds}
                  onChange={seconds => updateBlockDuration(block.id, seconds)}
                />
              </View>
            </View>
          ))}

          {/* Botones para agregar bloque */}
          <EliteText variant="label" style={styles.sectionLabel}>
            AGREGAR BLOQUE
          </EliteText>
          <View style={styles.addBlockRow}>
            {BLOCK_TYPES.map(type => (
              <Pressable
                key={type}
                onPress={() => addBlock(type)}
                style={[styles.addBlockChip, { borderColor: BlockColors[type] }]}
              >
                <Ionicons name="add" size={16} color={BlockColors[type]} />
                <EliteText variant="caption" style={{ color: BlockColors[type], fontSize: 11 }}>
                  {BlockTypeLabels[type]}
                </EliteText>
              </Pressable>
            ))}
          </View>

          {/* Selector de rondas */}
          <EliteText variant="label" style={styles.sectionLabel}>
            RONDAS
          </EliteText>
          <View style={styles.roundsRow}>
            <Pressable
              onPress={() => setRounds(r => Math.max(1, r - 1))}
              style={styles.roundButton}
            >
              <Ionicons name="remove" size={20} color={Colors.neonGreen} />
            </Pressable>
            <EliteText variant="subtitle" style={styles.roundsDisplay}>
              {rounds}
            </EliteText>
            <Pressable
              onPress={() => setRounds(r => Math.min(50, r + 1))}
              style={styles.roundButton}
            >
              <Ionicons name="add" size={20} color={Colors.neonGreen} />
            </Pressable>
          </View>

          {/* Resumen de duración total */}
          <View style={styles.totalRow}>
            <EliteText variant="label">DURACIÓN TOTAL</EliteText>
            <EliteText variant="subtitle" style={styles.totalTime}>
              {totalMinutes > 0 ? `${totalMinutes}m ` : ''}{totalSeconds}s
            </EliteText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Botón guardar */}
      <View style={styles.footer}>
        <EliteButton
          label="GUARDAR"
          onPress={handleSave}
          disabled={blocks.length === 0}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  flex: {
    flex: 1,
  },
  sectionLabel: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    letterSpacing: 2,
  },
  // Bloque individual
  blockRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  blockNumber: {
    color: Colors.textSecondary,
    fontSize: 14,
    width: 20,
  },
  spacer: {
    flex: 1,
  },
  blockDuration: {
    alignItems: 'center',
  },
  // Agregar bloque
  addBlockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  addBlockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  // Rondas
  roundsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundsDisplay: {
    fontSize: 28,
    color: Colors.neonGreen,
    minWidth: 50,
    textAlign: 'center',
  },
  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  totalTime: {
    color: Colors.neonGreen,
  },
  // Footer
  footer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
