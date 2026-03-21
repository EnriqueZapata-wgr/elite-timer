import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';
import { EliteInput } from '@/components/elite-input';
import { EliteButton } from '@/components/elite-button';
import { usePrograms } from '@/src/contexts/programs-context';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Pantalla Crear Programa — Formulario para crear un nuevo programa.
 * Campos: nombre y descripción. Al guardar, regresa a Mis Programas.
 */
export default function CreateProgramScreen() {
  const router = useRouter();
  const { addProgram } = usePrograms();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    const program = addProgram(name.trim(), description.trim());
    // Navegar a crear rutina para este programa
    router.replace({
      pathname: '/create-routine',
      params: { programId: program.id },
    });
  };

  return (
    <ScreenContainer centered={false}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
        </Pressable>
        <EliteText variant="title">CREAR PROGRAMA</EliteText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.form}
      >
        <EliteInput
          label="Nombre del programa"
          placeholder="Ej: Semana HIIT"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <EliteInput
          label="Descripción"
          placeholder="Ej: 4 rutinas de alta intensidad"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.descriptionInput}
        />
      </KeyboardAvoidingView>

      {/* Botón guardar fijo abajo */}
      <View style={styles.footer}>
        <EliteButton
          label="GUARDAR Y AÑADIR RUTINA"
          onPress={handleSave}
          disabled={!name.trim()}
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
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  form: {
    flex: 1,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
