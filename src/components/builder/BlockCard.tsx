/**
 * BlockCard — Card recursiva para visualizar/editar un bloque.
 *
 * Si el bloque es grupo: muestra header expandible + children indentados.
 * Si es hoja (work/rest/prep): muestra card compacta con edición inline.
 */
import { useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import type { Block } from '@/src/engine/types';
import { deepCopyBlock } from '@/src/utils/routine-storage';
import { AddBlockButton } from './AddBlockButton';

// === PALETA DE COLORES PARA GRUPOS ===

const COLOR_PALETTE = [
  '#888888', '#a8e02a', '#5B9BD5', '#EF9F27',
  '#E24B4A', '#9B59B6', '#1ABC9C', '#F39C12',
];

// === COLORES POR TIPO DE BLOQUE ===

const TYPE_COLORS: Record<string, string> = {
  work: '#a8e02a',
  rest: '#5B9BD5',
  prep: '#EF9F27',
};

const TYPE_LABELS: Record<string, string> = {
  work: 'Trabajo',
  rest: 'Descanso',
  prep: 'Preparación',
};

// === PROPS ===

interface BlockCardProps {
  block: Block;
  /** Callback para actualizar el bloque */
  onUpdate: (updated: Block) => void;
  /** Callback para eliminar el bloque */
  onDelete: () => void;
  /** Callback para agregar un child (solo grupos) */
  onAddChild: (child: Block) => void;
  /** Callback para duplicar este bloque como hermano */
  onDuplicate: () => void;
  /** Mover arriba entre hermanos */
  onMoveUp: (() => void) | null;
  /** Mover abajo entre hermanos */
  onMoveDown: (() => void) | null;
  /** Profundidad en el árbol (para indentación) */
  depth: number;
}

// === COMPONENTE PRINCIPAL ===

export function BlockCard({
  block,
  onUpdate,
  onDelete,
  onAddChild,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  depth,
}: BlockCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);

  const isGroup = block.type === 'group';
  const blockColor = isGroup ? (block.color ?? '#888888') : TYPE_COLORS[block.type];
  const indent = depth * 16;

  // --- Helpers para actualizar campos ---

  const updateField = <K extends keyof Block>(key: K, value: Block[K]) => {
    onUpdate({ ...block, [key]: value });
  };

  const updateChild = (index: number, updatedChild: Block) => {
    const children = [...(block.children ?? [])];
    children[index] = updatedChild;
    onUpdate({ ...block, children });
  };

  const deleteChild = (index: number) => {
    const children = (block.children ?? []).filter((_, i) => i !== index);
    // Recalcular sort_order
    const reindexed = children.map((c, i) => ({ ...c, sort_order: i }));
    onUpdate({ ...block, children: reindexed });
  };

  const moveChild = (index: number, direction: -1 | 1) => {
    const children = [...(block.children ?? [])];
    const target = index + direction;
    if (target < 0 || target >= children.length) return;
    [children[index], children[target]] = [children[target], children[index]];
    const reindexed = children.map((c, i) => ({ ...c, sort_order: i }));
    onUpdate({ ...block, children: reindexed });
  };

  const addChild = (child: Block) => {
    const children = [...(block.children ?? [])];
    const newChild = { ...child, parent_block_id: block.id, sort_order: children.length };
    children.push(newChild);
    onUpdate({ ...block, children });
  };

  const duplicateChild = (index: number) => {
    const children = [...(block.children ?? [])];
    const original = children[index];
    const copy = deepCopyBlock(original, block.id);
    children.splice(index + 1, 0, copy);
    const reindexed = children.map((c, i) => ({ ...c, sort_order: i }));
    onUpdate({ ...block, children: reindexed });
  };

  // === RENDER GRUPO ===

  if (isGroup) {
    return (
      <View style={[styles.groupContainer, { marginLeft: indent }]}>
        {/* Borde de color izquierdo */}
        <View style={[styles.groupBorder, { backgroundColor: blockColor }]} />

        <View style={styles.groupContent}>
          {/* Header del grupo */}
          <Pressable
            onPress={() => setExpanded(!expanded)}
            style={styles.groupHeader}
          >
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={Colors.textSecondary}
            />

            {/* Label editable */}
            {editing ? (
              <TextInput
                style={styles.labelInput}
                value={block.label}
                onChangeText={t => updateField('label', t)}
                onBlur={() => setEditing(false)}
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <Pressable onPress={() => setEditing(true)} style={styles.labelPress}>
                <EliteText variant="subtitle" style={styles.groupLabel} numberOfLines={1}>
                  {block.label}
                </EliteText>
              </Pressable>
            )}

            {/* Badge de rounds */}
            <View style={[styles.roundsBadge, { backgroundColor: blockColor + '30' }]}>
              <EliteText variant="caption" style={[styles.roundsText, { color: blockColor }]}>
                ×{block.rounds}
              </EliteText>
            </View>

            {/* Acciones */}
            <View style={styles.actions}>
              {onMoveUp && (
                <Pressable onPress={onMoveUp} hitSlop={8}>
                  <Ionicons name="arrow-up" size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
              {onMoveDown && (
                <Pressable onPress={onMoveDown} hitSlop={8}>
                  <Ionicons name="arrow-down" size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
              <Pressable onPress={onDuplicate} hitSlop={8}>
                <Ionicons name="copy-outline" size={16} color={Colors.textSecondary} />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </Pressable>
            </View>
          </Pressable>

          {/* Configuración inline del grupo (siempre visible bajo header) */}
          {expanded && (
            <>
              <View style={styles.groupConfig}>
                {/* Rounds */}
                <View style={styles.configRow}>
                  <EliteText variant="caption" style={styles.configLabel}>Rondas</EliteText>
                  <NumberStepper
                    value={block.rounds}
                    onChange={v => updateField('rounds', v)}
                    min={1}
                    max={999}
                  />
                </View>

                {/* Descanso entre rounds */}
                <View style={styles.configRow}>
                  <EliteText variant="caption" style={styles.configLabel}>Descanso entre</EliteText>
                  <NumberStepper
                    value={block.rest_between_seconds}
                    onChange={v => updateField('rest_between_seconds', v)}
                    min={0}
                    max={600}
                    step={5}
                    suffix="s"
                  />
                </View>

                {/* Color */}
                <View style={styles.configRow}>
                  <EliteText variant="caption" style={styles.configLabel}>Color</EliteText>
                  <View style={styles.colorRow}>
                    {COLOR_PALETTE.map(c => (
                      <Pressable
                        key={c}
                        onPress={() => updateField('color', c)}
                        style={[
                          styles.colorDot,
                          { backgroundColor: c },
                          block.color === c && styles.colorDotSelected,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              {/* Children */}
              {(block.children ?? []).map((child, index) => (
                <BlockCard
                  key={child.id}
                  block={child}
                  depth={0}
                  onUpdate={updated => updateChild(index, updated)}
                  onDelete={() => deleteChild(index)}
                  onDuplicate={() => duplicateChild(index)}
                  onAddChild={newChild => {
                    // Agregar child al child (si es grupo)
                    const children = [...(child.children ?? [])];
                    const added = { ...newChild, parent_block_id: child.id, sort_order: children.length };
                    children.push(added);
                    updateChild(index, { ...child, children });
                  }}
                  onMoveUp={index > 0 ? () => moveChild(index, -1) : null}
                  onMoveDown={index < (block.children?.length ?? 0) - 1 ? () => moveChild(index, 1) : null}
                />
              ))}

              {/* Botón agregar child */}
              <AddBlockButton parentId={block.id} onAdd={addChild} />
            </>
          )}
        </View>
      </View>
    );
  }

  // === RENDER HOJA (work/rest/prep) ===

  return (
    <View style={[styles.leafContainer, { marginLeft: indent }]}>
      {/* Dot de color */}
      <View style={[styles.leafDot, { backgroundColor: blockColor }]} />

      <View style={styles.leafContent}>
        {/* Primera fila: label + tipo + acciones */}
        <View style={styles.leafHeader}>
          {editing ? (
            <TextInput
              style={[styles.labelInput, { flex: 1 }]}
              value={block.label}
              onChangeText={t => updateField('label', t)}
              onBlur={() => setEditing(false)}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Pressable onPress={() => setEditing(true)} style={styles.labelPress}>
              <EliteText variant="body" numberOfLines={1} style={styles.leafLabel}>
                {block.label}
              </EliteText>
            </Pressable>
          )}

          {/* Tipo selector */}
          <View style={styles.typeSelector}>
            {(['work', 'rest', 'prep'] as const).map(t => (
              <Pressable
                key={t}
                onPress={() => {
                  updateField('type', t);
                  updateField('color', TYPE_COLORS[t]);
                }}
                style={[
                  styles.typePill,
                  block.type === t && { backgroundColor: TYPE_COLORS[t] + '30' },
                ]}
              >
                <EliteText
                  variant="caption"
                  style={[
                    styles.typeText,
                    block.type === t && { color: TYPE_COLORS[t] },
                  ]}
                >
                  {TYPE_LABELS[t][0]}
                </EliteText>
              </Pressable>
            ))}
          </View>

          {/* Acciones */}
          <View style={styles.actions}>
            {onMoveUp && (
              <Pressable onPress={onMoveUp} hitSlop={8}>
                <Ionicons name="arrow-up" size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
            {onMoveDown && (
              <Pressable onPress={onMoveDown} hitSlop={8}>
                <Ionicons name="arrow-down" size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
            <Pressable onPress={onDuplicate} hitSlop={8}>
              <Ionicons name="copy-outline" size={16} color={Colors.textSecondary} />
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Segunda fila: duración */}
        <View style={styles.leafDurationRow}>
          <EliteText variant="caption" style={styles.configLabel}>Duración</EliteText>
          <NumberStepper
            value={block.duration_seconds ?? 0}
            onChange={v => updateField('duration_seconds', v)}
            min={1}
            max={3600}
            step={1}
            suffix="s"
          />
        </View>
      </View>
    </View>
  );
}

// === NUMBER STEPPER (subcomponente inline) ===

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <View style={styles.stepperRow}>
      <Pressable
        onPress={decrement}
        disabled={value <= min}
        style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.5 }]}
      >
        <Ionicons
          name="remove"
          size={14}
          color={value <= min ? Colors.disabled : Colors.neonGreen}
        />
      </Pressable>
      <EliteText variant="body" style={styles.stepperValue}>
        {value}{suffix}
      </EliteText>
      <Pressable
        onPress={increment}
        disabled={value >= max}
        style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.5 }]}
      >
        <Ionicons
          name="add"
          size={14}
          color={value >= max ? Colors.disabled : Colors.neonGreen}
        />
      </Pressable>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  // --- Grupo ---
  groupContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  groupBorder: {
    width: 3,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  groupContent: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
  },
  groupLabel: {
    fontSize: 15,
  },
  roundsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  roundsText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  groupConfig: {
    paddingTop: Spacing.xs,
    gap: Spacing.xs,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  configLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },

  // --- Hoja ---
  leafContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  leafDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 14,
    marginRight: Spacing.sm,
  },
  leafContent: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  leafHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  leafLabel: {
    fontSize: 14,
  },
  leafDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },

  // --- Type selector ---
  typeSelector: {
    flexDirection: 'row',
    gap: 2,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  typeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
  },

  // --- Label editable ---
  labelInput: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    minWidth: 80,
  },
  labelPress: {
    flex: 1,
  },

  // --- Acciones ---
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },

  // --- Number stepper ---
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 40,
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
