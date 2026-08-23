/**
 * BlockCard — Card colapsable para visualizar/editar un bloque.
 *
 * Grupo: header expandible con rondas, children indentados, config inline.
 * Hoja (work/rest/prep): card compacta con barra de color por grupo muscular.
 *
 * Diseño: barra de color izquierda, drag handle, expand/collapse con chevron.
 */
import { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import type { Block } from '@/src/engine/types';
import { deepCopyBlock } from '@/src/utils/routine-storage';
import { AddBlockButton } from './AddBlockButton';

// === PALETA DE COLORES PARA GRUPOS ===
// MB-31B: estos valores se GUARDAN en block.color (dato persistido, no
// display). Quedan fijos a propósito: si dependieran del tema, el mismo
// bloque se vería con un color distinto según el tema de quien lo edita.

const COLOR_PALETTE = [
  Colors.textSecondary, Colors.neonGreen, Colors.info, Colors.warning,
  Colors.error, '#9B59B6', ATP_BRAND.teal2, ATP_BRAND.amber,
];

// === COLORES POR TIPO DE BLOQUE ===

const TYPE_COLORS: Record<string, string> = {
  work: Colors.neonGreen,
  rest: Colors.info,
  prep: Colors.warning,
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
  onRequestExercisePicker?: (onSelect: (exercise: { id: string | null; name: string; matrix_slug?: string | null }) => void) => void;
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
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);

  const isGroup = block.type === 'group';
  const blockColor = isGroup ? (block.color ?? t.textoSecundario) : TYPE_COLORS[block.type];
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
      <View style={[s.cardOuter, { marginLeft: indent }, expanded && { borderColor: blockColor + '40' }]}>
        {/* Barra color izquierda */}
        <View style={[s.accentBar, { backgroundColor: blockColor }]} />

        {/* Header colapsable */}
        <Pressable onPress={() => setExpanded(!expanded)} style={s.cardHeader}>
          {/* Drag handle (visual) */}
          <View style={s.dragHandle}>
            <Ionicons name="reorder-two-outline" size={18} color={t.textoSecundario} />
          </View>

          {/* Label editable */}
          <View style={s.headerInfo}>
            {editing ? (
              <TextInput
                style={s.labelInput}
                value={block.label}
                onChangeText={t => updateField('label', t)}
                onBlur={() => setEditing(false)}
                autoFocus
                selectTextOnFocus
              />
            ) : (
              <Pressable onPress={() => setEditing(true)}>
                <EliteText variant="subtitle" style={s.groupName} numberOfLines={1}>
                  {block.label}
                </EliteText>
              </Pressable>
            )}
            <EliteText variant="caption" style={s.subtitleText}>
              {childCount} paso{childCount !== 1 ? 's' : ''} · {block.rounds} ronda{block.rounds !== 1 ? 's' : ''}
              {block.rest_between_seconds > 0 ? ` · ${formatDur(block.rest_between_seconds)} descanso` : ''}
            </EliteText>
          </View>

          {/* Badge rounds */}
          <View style={[s.roundsBadge, { backgroundColor: blockColor + '25' }]}>
            <EliteText variant="caption" style={[s.roundsBadgeText, { color: blockColor }]}>
              ×{block.rounds}
            </EliteText>
          </View>

          {/* Chevron */}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={t.textoSecundario}
          />
        </Pressable>

        {/* Contenido expandido */}
        {expanded && (
          <View style={s.expandedContent}>
            {/* Config: rondas, descanso, color */}
            <View style={s.configSection}>
              <View style={s.configRow}>
                <EliteText variant="caption" style={s.configLabel}>Rondas</EliteText>
                <NumberStepper
                  t={t}
                  value={block.rounds}
                  onChange={v => updateField('rounds', v)}
                  min={1}
                  max={999}
                  accent={blockColor}
                />
              </View>
              <View style={s.configRow}>
                <EliteText variant="caption" style={s.configLabel}>Descanso entre</EliteText>
                <NumberStepper
                  t={t}
                  value={block.rest_between_seconds}
                  onChange={v => updateField('rest_between_seconds', v)}
                  min={0}
                  max={600}
                  step={5}
                  suffix="s"
                  accent={t.info}
                />
              </View>
              <View style={s.configRow}>
                <EliteText variant="caption" style={s.configLabel}>Color</EliteText>
                <View style={s.colorRow}>
                  {COLOR_PALETTE.map(c => (
                    <Pressable
                      key={c}
                      onPress={() => updateField('color', c)}
                      style={[
                        s.colorDot,
                        { backgroundColor: c },
                        block.color === c && s.colorDotSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Children */}
            <View style={s.childrenZone}>
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
                        matrix_slug: exercise.matrix_slug ?? null,
                      });
                    });
                  } : undefined}
                />
              ))}
              <AddBlockButton parentId={block.id} onAdd={addChild} />
            </View>

            {/* Acciones */}
            <View style={s.actionsBar}>
              {onMoveUp && (
                <Pressable onPress={onMoveUp} hitSlop={8} style={s.actionBtn}>
                  <Ionicons name="arrow-up" size={16} color={t.textoSecundario} />
                </Pressable>
              )}
              {onMoveDown && (
                <Pressable onPress={onMoveDown} hitSlop={8} style={s.actionBtn}>
                  <Ionicons name="arrow-down" size={16} color={t.textoSecundario} />
                </Pressable>
              )}
              <Pressable onPress={onDuplicate} hitSlop={8} style={s.actionBtn}>
                <Ionicons name="copy-outline" size={16} color={t.textoSecundario} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={onDelete} hitSlop={8} style={s.actionBtn}>
                <Ionicons name="trash-outline" size={16} color={t.error} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  // === RENDER HOJA (work/rest/prep) ===

  return (
    <View style={[s.cardOuter, { marginLeft: indent }]}>
      {/* Barra color izquierda */}
      <View style={[s.accentBar, { backgroundColor: blockColor }]} />

      {/* Header colapsable */}
      <Pressable onPress={() => setExpanded(!expanded)} style={s.cardHeader}>
        {/* Drag handle */}
        <View style={s.dragHandle}>
          <Ionicons name="reorder-two-outline" size={18} color={t.textoSecundario} />
        </View>

        <View style={s.headerInfo}>
          {editing ? (
            <TextInput
              style={[s.labelInput, { fontSize: 14 }]}
              value={block.label}
              onChangeText={t => updateField('label', t)}
              onBlur={() => setEditing(false)}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Pressable onPress={() => setEditing(true)}>
              <EliteText variant="body" style={s.leafName} numberOfLines={1}>
                {block.label}
                {block.exercise_name ? ` — ${block.exercise_name}` : ''}
              </EliteText>
            </Pressable>
          )}
          <EliteText variant="caption" style={s.subtitleText}>
            {TYPE_LABELS[block.type]} · {formatDur(block.duration_seconds)}
          </EliteText>
        </View>

        {/* Badge duración */}
        <View style={[s.durationBadge, { backgroundColor: blockColor + '20' }]}>
          <EliteText variant="caption" style={[s.durationBadgeText, { color: blockColor }]}>
            {formatDur(block.duration_seconds)}
          </EliteText>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={t.textoSecundario}
        />
      </Pressable>

      {/* Contenido expandido */}
      {expanded && (
        <View style={s.expandedContent}>
          {/* Tipo selector */}
          <View style={s.configRow}>
            <EliteText variant="caption" style={s.configLabel}>Tipo</EliteText>
            <View style={s.typeSelector}>
              {(['work', 'rest', 'prep'] as const).map(t => (
                <Pressable
                  key={t}
                  onPress={() => {
                    updateField('type', t);
                    updateField('color', TYPE_COLORS[t]);
                  }}
                  style={[
                    s.typePill,
                    block.type === t && { backgroundColor: TYPE_COLORS[t] + '25', borderColor: TYPE_COLORS[t] + '50' },
                  ]}
                >
                  <View style={[s.typeDot, { backgroundColor: TYPE_COLORS[t] }]} />
                  <EliteText variant="caption" style={[
                    s.typeText,
                    block.type === t && { color: TYPE_COLORS[t] },
                  ]}>
                    {TYPE_LABELS[t]}
                  </EliteText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Duración */}
          <View style={s.configRow}>
            <EliteText variant="caption" style={s.configLabel}>Duración</EliteText>
            <NumberStepper
              t={t}
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
            <View style={s.exerciseSection}>
              <EliteText variant="caption" style={s.configLabel}>Ejercicio</EliteText>
              {block.exercise_id && block.exercise_name ? (
                <View style={s.exerciseAssigned}>
                  <Ionicons name="barbell-outline" size={14} color={t.kind === 'dark' ? Colors.neonGreen : t.tealTexto} />
                  <EliteText variant="caption" style={s.exerciseNameText} numberOfLines={1}>
                    {block.exercise_name}
                  </EliteText>
                  <Pressable onPress={onAssignExercise} hitSlop={8} style={s.changeBtn}>
                    <EliteText variant="caption" style={s.changeBtnText}>CAMBIAR</EliteText>
                  </Pressable>
                  <Pressable
                    onPress={() => { updateField('exercise_id', null); updateField('exercise_name', null); updateField('matrix_slug', null); }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={16} color={t.textoSecundario} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={onAssignExercise} style={s.assignBtn}>
                  <Ionicons name="add-circle-outline" size={16} color={t.kind === 'dark' ? Colors.neonGreen : t.tealTexto} />
                  <EliteText variant="caption" style={s.assignBtnText}>Asignar ejercicio</EliteText>
                </Pressable>
              )}
            </View>
          )}

          {/* Acciones */}
          <View style={s.actionsBar}>
            {onMoveUp && (
              <Pressable onPress={onMoveUp} hitSlop={8} style={s.actionBtn}>
                <Ionicons name="arrow-up" size={16} color={t.textoSecundario} />
              </Pressable>
            )}
            {onMoveDown && (
              <Pressable onPress={onMoveDown} hitSlop={8} style={s.actionBtn}>
                <Ionicons name="arrow-down" size={16} color={t.textoSecundario} />
              </Pressable>
            )}
            <Pressable onPress={onDuplicate} hitSlop={8} style={s.actionBtn}>
              <Ionicons name="copy-outline" size={16} color={t.textoSecundario} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onDelete} hitSlop={8} style={s.actionBtn}>
              <Ionicons name="trash-outline" size={16} color={t.error} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// === NUMBER STEPPER ===

function NumberStepper({
  t, value, onChange, min = 0, max = 999, step = 1, suffix = '', accent = Colors.neonGreen,
}: {
  t: AppThemeTokens; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; accent?: string;
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  const glifo = t.kind === 'dark' ? accent : t.texto;
  return (
    <View style={s.stepperRow}>
      {/* 4EP: el color de TIPO se queda en el filo y en el punto, que es
          relleno. Como glifo sobre acero claro el lima da 1.44, así que el
          +/- se pinta con el texto del tema. La identidad del bloque sigue
          viviendo en el borde, que sí es relleno. */}
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        style={[s.stepperBtn, { borderColor: value <= min ? t.bordeMarcado : accent + '40' }]}
      >
        <Ionicons name="remove" size={14} color={value <= min ? t.bordeMarcado : glifo} />
      </Pressable>
      <EliteText variant="body" style={s.stepperValue}>
        {value}{suffix}
      </EliteText>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        style={[s.stepperBtn, { borderColor: value >= max ? t.bordeMarcado : accent + '40' }]}
      >
        <Ionicons name="add" size={14} color={value >= max ? t.bordeMarcado : glifo} />
      </Pressable>
    </View>
  );
}

// === ESTILOS ===

// 4EP GRAVE-1 (22-ago): hasta hoy este archivo pintaba el chip de ejercicio
// con lima duro. Era inofensivo porque el Constructor no tenía <ThemeReady>
// encima y useSurfaceTokens devolvía siempre el oscuro. Al migrar builder,
// el claro llegó aquí y esos tres textos quedaron en contraste 1.44: el
// nombre del ejercicio, CAMBIAR y "Asignar ejercicio" desaparecían.
//
// El lima se queda como RELLENO (el punto de color, el filo). Como TEXTO
// pasa por el calibre: teal en claro, lima en oscuro.
const limaTexto = (t: AppThemeTokens) => (t.kind === 'dark' ? Colors.neonGreen : t.tealTexto);

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  // Card exterior (compartida grupo y hoja)
  cardOuter: {
    backgroundColor: t.flotante,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: t.borde,
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
    color: t.texto,
  },
  leafName: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: t.texto,
  },
  subtitleText: {
    color: t.textoSecundario,
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
    borderTopColor: t.borde,
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
    color: t.textoSecundario,
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
    borderColor: t.texto,
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
    borderTopColor: t.borde,
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
    borderColor: t.borde,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: t.textoSecundario,
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
    // El velo de lima al 6% no se ve sobre acero claro: ahí el chip se
    // apoya en la superficie hundida, que es la que ya usa el resto.
    backgroundColor: t.kind === 'dark' ? Colors.neonGreen + '10' : t.hundido,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: t.kind === 'dark' ? Colors.neonGreen + '25' : t.borde,
  },
  exerciseNameText: {
    color: limaTexto(t),
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    flex: 1,
  },
  changeBtn: {
    backgroundColor: t.kind === 'dark' ? Colors.neonGreen + '20' : t.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  changeBtnText: {
    color: limaTexto(t),
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
    color: limaTexto(t),
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // Label editable
  labelInput: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: t.texto,
    backgroundColor: t.flotante,
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
    backgroundColor: t.flotante,
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
    color: t.texto,
  },
});
