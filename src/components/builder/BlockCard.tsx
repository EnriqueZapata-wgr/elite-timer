/**
 * BlockCard — Card colapsable para visualizar/editar un bloque.
 *
 * Grupo: header expandible con rondas, children indentados, config inline.
 * Hoja (work/rest/prep): card compacta con barra de color por grupo muscular.
 *
 * Diseño: barra de color izquierda, drag handle, expand/collapse con chevron.
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
  onUpdate: (updated: Block) => void;
  onDelete: () => void;
  onAddChild: (child: Block) => void;
  onDuplicate: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  depth: number;
  onAssignExercise?: () => void;
  onRequestExercisePicker?: (onSelect: (exercise: { id: string; name: string }) => void) => void;
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
  onAssignExercise,
  onRequestExercisePicker,
}: BlockCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);

  const isGroup = block.type === 'group';
  const blockColor = isGroup ? (block.color ?? '#888888') : TYPE_COLORS[block.type];
  const indent = depth * 12;

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

  // Formato duración legible
  const formatDur = (s: number | null) => {
    if (!s) return '0s';
    if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    return `${s}s`;
  };

  // === RENDER GRUPO ===

  if (isGroup) {
    const childCount = (block.children ?? []).length;

    return (
      <View style={[styles.cardOuter, { marginLeft: indent }, expanded && { borderColor: blockColor + '40' }]}>
        {/* Barra color izquierda */}
        <View style={[styles.accentBar, { backgroundColor: blockColor }]} />

        {/* Header colapsable */}
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.cardHeader}>
          {/* Drag handle (visual) */}
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-two-outline" size={18} color={Colors.textSecondary} />
          </View>

          {/* Label editable */}
          <View style={styles.headerInfo}>
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
              <Pressable onPress={() => setEditing(true)}>
                <EliteText variant="subtitle" style={styles.groupName} numberOfLines={1}>
                  {block.label}
                </EliteText>
              </Pressable>
            )}
            <EliteText variant="caption" style={styles.subtitleText}>
              {childCount} paso{childCount !== 1 ? 's' : ''} · {block.rounds} ronda{block.rounds !== 1 ? 's' : ''}
              {block.rest_between_seconds > 0 ? ` · ${formatDur(block.rest_between_seconds)} descanso` : ''}
            </EliteText>
          </View>

          {/* Badge rounds */}
          <View style={[styles.roundsBadge, { backgroundColor: blockColor + '25' }]}>
            <EliteText variant="caption" style={[styles.roundsBadgeText, { color: blockColor }]}>
              ×{block.rounds}
            </EliteText>
          </View>

          {/* Chevron */}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.textSecondary}
          />
        </Pressable>

        {/* Contenido expandido */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* Config: rondas, descanso, color */}
            <View style={styles.configSection}>
              <View style={styles.configRow}>
                <EliteText variant="caption" style={styles.configLabel}>Rondas</EliteText>
                <NumberStepper
                  value={block.rounds}
                  onChange={v => updateField('rounds', v)}
                  min={1}
                  max={999}
                  accent={blockColor}
                />
              </View>
              <View style={styles.configRow}>
                <EliteText variant="caption" style={styles.configLabel}>Descanso entre</EliteText>
                <NumberStepper
                  value={block.rest_between_seconds}
                  onChange={v => updateField('rest_between_seconds', v)}
                  min={0}
                  max={600}
                  step={5}
                  suffix="s"
                  accent="#5B9BD5"
                />
              </View>
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
            <View style={styles.childrenZone}>
              {(block.children ?? []).map((child, index) => (
                <BlockCard
                  key={child.id}
                  block={child}
                  depth={0}
                  onUpdate={updated => updateChild(index, updated)}
                  onDelete={() => deleteChild(index)}
                  onDuplicate={() => duplicateChild(index)}
                  onAddChild={newChild => {
                    const children = [...(child.children ?? [])];
                    const added = { ...newChild, parent_block_id: child.id, sort_order: children.length };
                    children.push(added);
                    updateChild(index, { ...child, children });
                  }}
                  onMoveUp={index > 0 ? () => moveChild(index, -1) : null}
                  onMoveDown={index < (block.children?.length ?? 0) - 1 ? () => moveChild(index, 1) : null}
                  onRequestExercisePicker={onRequestExercisePicker}
                  onAssignExercise={onRequestExercisePicker ? () => {
                    onRequestExercisePicker((exercise) => {
                      updateChild(index, {
                        ...child,
                        exercise_id: exercise.id,
                        exercise_name: exercise.name,
                      });
                    });
                  } : undefined}
                />
              ))}
              <AddBlockButton parentId={block.id} onAdd={addChild} />
            </View>

            {/* Acciones */}
            <View style={styles.actionsBar}>
              {onMoveUp && (
                <Pressable onPress={onMoveUp} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="arrow-up" size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
              {onMoveDown && (
                <Pressable onPress={onMoveDown} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="arrow-down" size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
              <Pressable onPress={onDuplicate} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="copy-outline" size={16} color={Colors.textSecondary} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  // === RENDER HOJA (work/rest/prep) ===

  return (
    <View style={[styles.cardOuter, { marginLeft: indent }]}>
      {/* Barra color izquierda */}
      <View style={[styles.accentBar, { backgroundColor: blockColor }]} />

      {/* Header colapsable */}
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.cardHeader}>
        {/* Drag handle */}
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-two-outline" size={18} color={Colors.textSecondary} />
        </View>

        <View style={styles.headerInfo}>
          {editing ? (
            <TextInput
              style={[styles.labelInput, { fontSize: 14 }]}
              value={block.label}
              onChangeText={t => updateField('label', t)}
              onBlur={() => setEditing(false)}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Pressable onPress={() => setEditing(true)}>
              <EliteText variant="body" style={styles.leafName} numberOfLines={1}>
                {block.label}
                {block.exercise_name ? ` — ${block.exercise_name}` : ''}
              </EliteText>
            </Pressable>
          )}
          <EliteText variant="caption" style={styles.subtitleText}>
            {TYPE_LABELS[block.type]} · {formatDur(block.duration_seconds)}
          </EliteText>
        </View>

        {/* Badge duración */}
        <View style={[styles.durationBadge, { backgroundColor: blockColor + '20' }]}>
          <EliteText variant="caption" style={[styles.durationBadgeText, { color: blockColor }]}>
            {formatDur(block.duration_seconds)}
          </EliteText>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textSecondary}
        />
      </Pressable>

      {/* Contenido expandido */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Tipo selector */}
          <View style={styles.configRow}>
            <EliteText variant="caption" style={styles.configLabel}>Tipo</EliteText>
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
                    block.type === t && { backgroundColor: TYPE_COLORS[t] + '25', borderColor: TYPE_COLORS[t] + '50' },
                  ]}
                >
                  <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[t] }]} />
                  <EliteText variant="caption" style={[
                    styles.typeText,
                    block.type === t && { color: TYPE_COLORS[t] },
                  ]}>
                    {TYPE_LABELS[t]}
                  </EliteText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Duración */}
          <View style={styles.configRow}>
            <EliteText variant="caption" style={styles.configLabel}>Duración</EliteText>
            <NumberStepper
              value={block.duration_seconds ?? 0}
              onChange={v => updateField('duration_seconds', v)}
              min={1}
              max={3600}
              step={1}
              suffix="s"
              accent={blockColor}
            />
          </View>

          {/* Ejercicio (solo work) */}
          {block.type === 'work' && (
            <View style={styles.exerciseSection}>
              <EliteText variant="caption" style={styles.configLabel}>Ejercicio</EliteText>
              {block.exercise_id && block.exercise_name ? (
                <View style={styles.exerciseAssigned}>
                  <Ionicons name="barbell-outline" size={14} color={Colors.neonGreen} />
                  <EliteText variant="caption" style={styles.exerciseNameText} numberOfLines={1}>
                    {block.exercise_name}
                  </EliteText>
                  <Pressable onPress={onAssignExercise} hitSlop={8} style={styles.changeBtn}>
                    <EliteText variant="caption" style={styles.changeBtnText}>CAMBIAR</EliteText>
                  </Pressable>
                  <Pressable
                    onPress={() => { updateField('exercise_id', null); updateField('exercise_name', null); }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={onAssignExercise} style={styles.assignBtn}>
                  <Ionicons name="add-circle-outline" size={16} color={Colors.neonGreen} />
                  <EliteText variant="caption" style={styles.assignBtnText}>Asignar ejercicio</EliteText>
                </Pressable>
              )}
            </View>
          )}

          {/* Acciones */}
          <View style={styles.actionsBar}>
            {onMoveUp && (
              <Pressable onPress={onMoveUp} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="arrow-up" size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
            {onMoveDown && (
              <Pressable onPress={onMoveDown} hitSlop={8} style={styles.actionBtn}>
                <Ionicons name="arrow-down" size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
            <Pressable onPress={onDuplicate} hitSlop={8} style={styles.actionBtn}>
              <Ionicons name="copy-outline" size={16} color={Colors.textSecondary} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// === NUMBER STEPPER ===

function NumberStepper({
  value, onChange, min = 0, max = 999, step = 1, suffix = '', accent = Colors.neonGreen,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; accent?: string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        style={[styles.stepperBtn, { borderColor: value <= min ? Colors.disabled : accent + '40' }]}
      >
        <Ionicons name="remove" size={14} color={value <= min ? Colors.disabled : accent} />
      </Pressable>
      <EliteText variant="body" style={styles.stepperValue}>
        {value}{suffix}
      </EliteText>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        style={[styles.stepperBtn, { borderColor: value >= max ? Colors.disabled : accent + '40' }]}
      >
        <Ionicons name="add" size={14} color={value >= max ? Colors.disabled : accent} />
      </Pressable>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  // Card exterior (compartida grupo y hoja)
  cardOuter: {
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },

  // Header (colapsable)
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  dragHandle: {
    width: 24,
    alignItems: 'center',
    opacity: 0.5,
  },
  headerInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  leafName: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
  },
  subtitleText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  roundsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  roundsBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  durationBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  durationBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
  },

  // Contenido expandido
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: '#2a2a2a',
  },

  // Config
  configSection: {
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  configLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },

  // Children zone
  childrenZone: {
    paddingTop: Spacing.xs,
  },

  // Actions bar
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: '#2a2a2a',
    marginTop: Spacing.xs,
  },
  actionBtn: {
    padding: 4,
  },

  // Tipo selector (hojas)
  typeSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },

  // Ejercicio
  exerciseSection: {
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  exerciseAssigned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.neonGreen + '10',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.neonGreen + '25',
  },
  exerciseNameText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    flex: 1,
  },
  changeBtn: {
    backgroundColor: Colors.neonGreen + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  changeBtnText: {
    color: Colors.neonGreen,
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  assignBtnText: {
    color: Colors.neonGreen,
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // Label editable
  labelInput: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: '#252525',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },

  // Number stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 44,
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: Colors.textPrimary,
  },
});
