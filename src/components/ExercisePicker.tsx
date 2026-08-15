/**
 * ExercisePicker — Modal/bottom sheet para seleccionar un ejercicio.
 *
 * Incluye búsqueda por nombre, filtros por grupo muscular,
 * y opción de crear ejercicio custom.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Modal, StyleSheet, Pressable, FlatList,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { getExercises, createExercise } from '@/src/services/exercise-service';
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_COLORS,
} from '@/src/types/exercise';
import type { Exercise } from '@/src/types/exercise';

// === EQUIPMENT LABELS ===

const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuerna',
  bodyweight: 'Corporal',
  machine: 'Máquina',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  band: 'Banda',
  other: 'Otro',
};

// === PROPS ===

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

// === COMPONENTE PRINCIPAL ===

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Cargar ejercicios cuando se abre el modal o cambian filtros
  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      const results = await getExercises({
        search: search.trim() || undefined,
        muscle_group: selectedGroup ?? undefined,
      });
      setExercises(results);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los ejercicios.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup]);

  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible, loadExercises]);

  // Reset al cerrar
  const handleClose = () => {
    setSearch('');
    setSelectedGroup(null);
    setShowCreate(false);
    onClose();
  };

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    handleClose();
  };

  // Crear ejercicio custom
  const handleCreate = async (name: string, muscleGroup: string, equipment: string) => {
    try {
      const exercise = await createExercise({ name, muscle_group: muscleGroup, equipment });
      setShowCreate(false);
      onSelect(exercise);
      handleClose();
    } catch {
      Alert.alert('Error', 'No se pudo crear el ejercicio.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <EliteText variant="label" style={s.title}>SELECCIONAR EJERCICIO</EliteText>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={t.textoSecundario} />
            </Pressable>
          </View>

          {showCreate ? (
            <CreateExerciseForm
              t={t}
              s={s}
              onCancel={() => setShowCreate(false)}
              onCreate={handleCreate}
            />
          ) : (
            <>
              {/* Búsqueda */}
              <View style={s.searchRow}>
                <Ionicons name="search" size={18} color={t.textoSecundario} />
                <TextInput
                  style={s.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar ejercicio..."
                  placeholderTextColor={t.textoSecundario}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={t.textoSecundario} />
                  </Pressable>
                )}
              </View>

              {/* Filtros por grupo muscular */}
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[null, ...MUSCLE_GROUPS]}
                keyExtractor={(item) => item ?? 'all'}
                style={s.filterList}
                contentContainerStyle={s.filterContent}
                renderItem={({ item }) => {
                  const isSelected = selectedGroup === item;
                  const label = item ? MUSCLE_GROUP_LABELS[item] : 'Todos';
                  const color = item ? MUSCLE_GROUP_COLORS[item] : ATP_BRAND.lime;

                  return (
                    <Pressable
                      onPress={() => setSelectedGroup(item)}
                      style={[
                        s.filterPill,
                        isSelected && { borderColor: color, backgroundColor: color + '20' },
                      ]}
                    >
                      <EliteText
                        variant="caption"
                        style={[
                          s.filterText,
                          isSelected && { color },
                        ]}
                      >
                        {label}
                      </EliteText>
                    </Pressable>
                  );
                }}
              />

              {/* Lista de ejercicios */}
              {loading ? (
                <View style={s.loadingContainer}>
                  <ActivityIndicator color={ATP_BRAND.lime} size="large" />
                </View>
              ) : (
                <FlatList
                  data={exercises}
                  keyExtractor={(item) => item.id}
                  style={s.exerciseList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={s.emptyContainer}>
                      <EliteText variant="body" style={s.emptyText}>
                        No se encontraron ejercicios
                      </EliteText>
                    </View>
                  }
                  ListFooterComponent={
                    <Pressable
                      onPress={() => setShowCreate(true)}
                      style={s.createButton}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={ATP_BRAND.lime} />
                      <EliteText variant="body" style={s.createText}>
                        Crear ejercicio custom
                      </EliteText>
                    </Pressable>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [
                        s.exerciseRow,
                        pressed && { backgroundColor: t.flotante },
                      ]}
                    >
                      <View style={s.exerciseInfo}>
                        <EliteText variant="body" style={s.exerciseName} numberOfLines={1}>
                          {item.name}
                        </EliteText>
                        <View style={s.badges}>
                          {/* Badge de grupo muscular */}
                          <View style={[
                            s.badge,
                            { backgroundColor: (MUSCLE_GROUP_COLORS[item.muscle_group] ?? t.sinDatos) + '25' },
                          ]}>
                            <EliteText variant="caption" style={[
                              s.badgeText,
                              { color: MUSCLE_GROUP_COLORS[item.muscle_group] ?? t.sinDatos },
                            ]}>
                              {MUSCLE_GROUP_LABELS[item.muscle_group] ?? item.muscle_group}
                            </EliteText>
                          </View>
                          {/* Badge de equipment */}
                          <View style={s.equipmentBadge}>
                            <EliteText variant="caption" style={s.equipmentText}>
                              {EQUIPMENT_LABELS[item.equipment] ?? item.equipment}
                            </EliteText>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
                    </Pressable>
                  )}
                />
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// === FORMULARIO DE CREAR EJERCICIO ===

const EQUIPMENT_OPTIONS = [
  'barbell', 'dumbbell', 'bodyweight', 'machine', 'cable', 'kettlebell', 'band', 'other',
];

function CreateExerciseForm({
  t,
  s,
  onCancel,
  onCreate,
}: {
  t: AppThemeTokens;
  s: ReturnType<typeof makeStyles>;
  onCancel: () => void;
  onCreate: (name: string, muscleGroup: string, equipment: string) => void;
}) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('chest');
  const [equipment, setEquipment] = useState('barbell');

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido.');
      return;
    }
    onCreate(name, muscleGroup, equipment);
  };

  return (
    <View style={s.createForm}>
      <EliteText variant="label" style={s.createFormTitle}>NUEVO EJERCICIO</EliteText>

      {/* Nombre */}
      <TextInput
        style={s.createInput}
        value={name}
        onChangeText={setName}
        placeholder="Nombre del ejercicio"
        placeholderTextColor={t.textoSecundario}
        autoFocus
        maxLength={60}
      />

      {/* Grupo muscular */}
      <EliteText variant="caption" style={s.createLabel}>Grupo muscular</EliteText>
      <View style={s.createOptions}>
        {MUSCLE_GROUPS.map(g => (
          <Pressable
            key={g}
            onPress={() => setMuscleGroup(g)}
            style={[
              s.createOption,
              muscleGroup === g && {
                borderColor: MUSCLE_GROUP_COLORS[g],
                backgroundColor: MUSCLE_GROUP_COLORS[g] + '20',
              },
            ]}
          >
            <EliteText
              variant="caption"
              style={[
                s.createOptionText,
                muscleGroup === g && { color: MUSCLE_GROUP_COLORS[g] },
              ]}
            >
              {MUSCLE_GROUP_LABELS[g]}
            </EliteText>
          </Pressable>
        ))}
      </View>

      {/* Equipment */}
      <EliteText variant="caption" style={s.createLabel}>Equipamiento</EliteText>
      <View style={s.createOptions}>
        {EQUIPMENT_OPTIONS.map(e => (
          <Pressable
            key={e}
            onPress={() => setEquipment(e)}
            style={[
              s.createOption,
              equipment === e && {
                borderColor: ATP_BRAND.lime,
                backgroundColor: ATP_BRAND.lime + '20',
              },
            ]}
          >
            <EliteText
              variant="caption"
              style={[
                s.createOptionText,
                equipment === e && { color: ATP_BRAND.lime },
              ]}
            >
              {EQUIPMENT_LABELS[e]}
            </EliteText>
          </Pressable>
        ))}
      </View>

      {/* Botones */}
      <View style={s.createButtons}>
        <EliteButton label="Cancelar" variant="ghost" onPress={onCancel} />
        <EliteButton label="Crear" onPress={handleSubmit} />
      </View>
    </View>
  );
}

// === ESTILOS ===

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: t.kind === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(15,21,24,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: t.card,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    maxHeight: '85%',
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.flotante,
  },
  title: {
    color: ATP_BRAND.lime,
    letterSpacing: 2,
  },

  // --- Búsqueda ---
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.fondo,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: t.texto,
    paddingVertical: Spacing.sm,
  },

  // --- Filtros ---
  filterList: {
    maxHeight: 40,
    marginTop: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: t.flotante,
  },
  filterText: {
    color: t.textoSecundario,
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },

  // --- Lista ---
  exerciseList: {
    marginTop: Spacing.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.flotante,
  },
  exerciseInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  exerciseName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
  },
  equipmentBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: t.flotante,
  },
  equipmentText: {
    fontSize: 10,
    color: t.textoSecundario,
    fontFamily: Fonts.semiBold,
  },

  // --- Empty ---
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: t.textoSecundario,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },

  // --- Botón crear ---
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.flotante,
  },
  createText: {
    color: ATP_BRAND.lime,
    fontFamily: Fonts.semiBold,
  },

  // --- Formulario crear ---
  createForm: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  createFormTitle: {
    color: ATP_BRAND.lime,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  createInput: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: t.texto,
    backgroundColor: t.fondo,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  createLabel: {
    color: t.textoSecundario,
    marginTop: Spacing.xs,
  },
  createOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  createOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: t.flotante,
  },
  createOptionText: {
    color: t.textoSecundario,
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },
  createButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
