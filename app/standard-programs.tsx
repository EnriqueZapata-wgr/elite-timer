/**
 * Pantalla Programas Estándar — Lista de templates predefinidos.
 *
 * Al tocar uno muestra opciones: Ejecutar o Clonar y editar.
 * Tabata, HIIT, Quick timers y opción personalizada.
 */
import { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteCard } from '@/components/elite-card';
import { STANDARD_PROGRAMS, STANDARD_ROUTINES } from '@/constants/standard-programs';
import { convertLegacyRoutine } from '@/src/engine/convertLegacy';
import { saveRoutine, generateUUID as generateId } from '@/src/services/routine-service';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { Routine as EngineRoutine } from '@/src/engine/types';

export default function StandardProgramsScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const formatDuration = (seconds: number): string => {
    if (seconds >= 60) return `${Math.floor(seconds / 60)}min`;
    return `${seconds}s`;
  };

  /** Ejecutar un programa estándar directamente */
  const handlePlay = (routineId: string) => {
    const routine = STANDARD_ROUTINES[routineId];
    if (!routine) return;
    const engineRoutine = convertLegacyRoutine(routine);
    setSelectedId(null);
    router.push({
      pathname: '/execution',
      params: { routine: JSON.stringify(engineRoutine) },
    });
  };

  /** Clonar un programa estándar y abrir en el builder */
  const handleClone = async (routineId: string) => {
    const routine = STANDARD_ROUTINES[routineId];
    if (!routine) return;
    const engineRoutine = convertLegacyRoutine(routine);

    // Crear copia con nuevo ID
    const cloned: EngineRoutine = {
      ...engineRoutine,
      id: generateId(),
      name: engineRoutine.name + ' (copia)',
    };

    try {
      await saveRoutine(cloned);
      setSelectedId(null);
      router.push({
        pathname: '/builder',
        params: { routineId: cloned.id },
      });
    } catch (err) {
      setSelectedId(null);
      Alert.alert('Error', 'No se pudo clonar la rutina. Verifica tu conexión.');
    }
  };

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">PROGRAMAS ESTÁNDAR</EliteText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {STANDARD_PROGRAMS.map(program => {
          const routine = STANDARD_ROUTINES[program.routineId];
          return (
            <EliteCard
              key={program.id}
              title={program.name}
              subtitle={`${program.description} · ${formatDuration(routine.totalDuration)}`}
              onPress={() => setSelectedId(program.routineId)}
              style={styles.card}
              rightContent={
                <Ionicons name="play-circle" size={36} color={Colors.neonGreen} />
              }
            />
          );
        })}

        {/* Opción personalizada → builder */}
        <EliteCard
          title="Personalizado"
          subtitle="Crea tu propia rutina desde cero"
          onPress={() => router.push('/builder')}
          style={styles.card}
          rightContent={
            <Ionicons name="add-circle" size={36} color={Colors.neonGreen} />
          }
        />
      </ScrollView>

      {/* Modal de acciones */}
      <Modal
        visible={selectedId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedId(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectedId(null)}>
          <View style={styles.actionMenu}>
            <EliteText variant="label" style={styles.actionTitle}>
              ¿QUÉ QUIERES HACER?
            </EliteText>

            <Pressable
              onPress={() => selectedId && handlePlay(selectedId)}
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
            >
              <Ionicons name="play" size={22} color={Colors.neonGreen} />
              <View style={styles.actionContent}>
                <EliteText variant="body">Ejecutar</EliteText>
                <EliteText variant="caption">Iniciar rutina directamente</EliteText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => selectedId && handleClone(selectedId)}
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
            >
              <Ionicons name="copy-outline" size={22} color={Colors.neonGreen} />
              <View style={styles.actionContent}>
                <EliteText variant="body">Clonar y editar</EliteText>
                <EliteText variant="caption">Crear copia editable en Mis Rutinas</EliteText>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.sm,
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  actionMenu: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  actionTitle: {
    letterSpacing: 2,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: Colors.neonGreen,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  actionItemPressed: {
    backgroundColor: Colors.surfaceLight,
  },
  actionContent: {
    flex: 1,
  },
});
