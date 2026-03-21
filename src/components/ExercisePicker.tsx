/**
 * ExercisePicker — Modal/bottom sheet para seleccionar un ejercicio.
 *
 * Incluye búsqueda por nombre, filtros por grupo muscular,
 * y opción de crear ejercicio custom.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Modal, StyleSheet, Pressable, FlatList,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
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
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <EliteText variant="label" style={styles.title}>SELECCIONAR EJERCICIO</EliteText>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {showCreate ? (
            <CreateExerciseForm
              onCancel={() => setShowCreate(false)}
              onCreate={handleCreate}
            />
          ) : (
            <>
              {/* Búsqueda */}
              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar ejercicio..."
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              {/* Filtros por grupo muscular */}
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[null, ...MUSCLE_GROUPS]}
                keyExtractor={(item) => item ?? 'all'}
                style={styles.filterList}
                contentContainerStyle={styles.filterContent}
                renderItem={({ item }) => {
                  const isSelected = selectedGroup === item;
                  const label = item ? MUSCLE_GROUP_LABELS[item] : 'Todos';
                  const color = item ? MUSCLE_GROUP_COLORS[item] : Colors.neonGreen;

                  return (
                    <Pressable
                      onPress={() => setSelectedGroup(item)}
                      style={[
                        styles.filterPill,
                        isSelected && { borderColor: color, backgroundColor: color + '20' },
                      ]}
                    >
                      <EliteText
                        variant="caption"
                        style={[
                          styles.filterText,
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
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.neonGreen} size="large" />
                </View>
              ) : (
                <FlatList
                  data={exercises}
                  keyExtractor={(item) => item.id}
                  style={styles.exerciseList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <EliteText variant="body" style={styles.emptyText}>
                        No se encontraron ejercicios
                      </EliteText>
                    </View>
                  }
                  ListFooterComponent={
                    <Pressable
                      onPress={() => setShowCreate(true)}
                      style={styles.createButton}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={Colors.neonGreen} />
                      <EliteText variant="body" style={styles.createText}>
                        Crear ejercicio custom
                      </EliteText>
                    </Pressable>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [
                        styles.exerciseRow,
                        pressed && { backgroundColor: Colors.surfaceLight },
                      ]}
                    >
                      <View style={styles.exerciseInfo}>
                        <EliteText variant="body" style={styles.exerciseName} numberOfLines={1}>
                          {item.name}
                        </EliteText>
                        <View style={styles.badges}>
                          {/* Badge de grupo muscular */}
                          <View style={[
                            styles.badge,
                            { backgroundColor: (MUSCLE_GROUP_COLORS[item.muscle_group] ?? '#888') + '25' },
                          ]}>
                            <EliteText variant="caption" style={[
                              styles.badgeText,
                              { color: MUSCLE_GROUP_COLORS[item.muscle_group] ?? '#888' },
                            ]}>
                              {MUSCLE_GROUP_LABELS[item.muscle_group] ?? item.muscle_group}
                            </EliteText>
                          </View>
                          {/* Badge de equipment */}
                          <View style={styles.equipmentBadge}>
                            <EliteText variant="caption" style={styles.equipmentText}>
                              {EQUIPMENT_LABELS[item.equipment] ?? item.equipment}
                            </EliteText>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
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
  onCancel,
  onCreate,
}: {
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
    <View style={styles.createForm}>
      <EliteText variant="label" style={styles.createFormTitle}>NUEVO EJERCICIO</EliteText>

      {/* Nombre */}
      <TextInput
        style={styles.createInput}
        value={name}
        onChangeText={setName}
        placeholder="Nombre del ejercicio"
        placeholderTextColor={Colors.textSecondary}
        autoFocus
        maxLength={60}
      />

      {/* Grupo muscular */}
      <EliteText variant="caption" style={styles.createLabel}>Grupo muscular</EliteText>
      <View style={styles.createOptions}>
        {MUSCLE_GROUPS.map(g => (
          <Pressable
            key={g}
            onPress={() => setMuscleGroup(g)}
            style={[
              styles.createOption,
              muscleGroup === g && {
                borderColor: MUSCLE_GROUP_COLORS[g],
                backgroundColor: MUSCLE_GROUP_COLORS[g] + '20',
              },
            ]}
          >
            <EliteText
              variant="caption"
              style={[
                styles.createOptionText,
                muscleGroup === g && { color: MUSCLE_GROUP_COLORS[g] },
              ]}
            >
              {MUSCLE_GROUP_LABELS[g]}
            </EliteText>
          </Pressable>
        ))}
      </View>

      {/* Equipment */}
      <EliteText variant="caption" style={styles.createLabel}>Equipamiento</EliteText>
      <View style={styles.createOptions}>
        {EQUIPMENT_OPTIONS.map(e => (
          <Pressable
            key={e}
            onPress={() => setEquipment(e)}
            style={[
              styles.createOption,
              equipment === e && {
                borderColor: Colors.neonGreen,
                backgroundColor: Colors.neonGreen + '20',
              },
            ]}
          >
            <EliteText
              variant="caption"
              style={[
                styles.createOptionText,
                equipment === e && { color: Colors.neonGreen },
              ]}
            >
              {EQUIPMENT_LABELS[e]}
            </EliteText>
          </Pressable>
        ))}
      </View>

      {/* Botones */}
      <View style={styles.createButtons}>
        <EliteButton label="Cancelar" variant="ghost" onPress={onCancel} />
        <EliteButton label="Crear" onPress={handleSubmit} />
      </View>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
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
    borderBottomColor: Colors.surfaceLight,
  },
  title: {
    color: Colors.neonGreen,
    letterSpacing: 2,
  },

  // --- Búsqueda ---
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.black,
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
    color: Colors.textPrimary,
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
    borderColor: Colors.surfaceLight,
  },
  filterText: {
    color: Colors.textSecondary,
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
    borderBottomColor: Colors.surfaceLight,
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
    backgroundColor: Colors.surfaceLight,
  },
  equipmentText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
  },

  // --- Empty ---
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
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
    borderTopColor: Colors.surfaceLight,
  },
  createText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },

  // --- Formulario crear ---
  createForm: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  createFormTitle: {
    color: Colors.neonGreen,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  createInput: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.black,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  createLabel: {
    color: Colors.textSecondary,
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
    borderColor: Colors.surfaceLight,
  },
  createOptionText: {
    color: Colors.textSecondary,
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
