import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CircularTimer } from '@/components/circular-timer';
import { Controls } from '@/components/controls';
import { IntervalSelector } from '@/components/interval-selector';
import { useTimer } from '@/hooks/use-timer';
import { DEFAULT_INTERVAL, type IntervalOption } from '@/constants/intervals';
import { Colors, FontSizes, Fonts, Spacing, Radius } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';

/**
 * Pantalla del Timer — Ensambla todos los componentes del timer.
 *
 * Flujo de datos:
 *   IntervalSelector → setDuration (cambia el tiempo)
 *   useTimer         → timeLeft, progress, status (estado central)
 *   CircularTimer    ← timeLeft, progress (muestra el tiempo)
 *   Controls         ← status, start, pause, reset (controla el timer)
 */
export default function TimerScreen() {
  const router = useRouter();

  // Id del intervalo seleccionado — controla cuál chip se pinta como activo
  const [selectedId, setSelectedId] = useState(DEFAULT_INTERVAL.id);

  // Hook central: toda la lógica del timer vive aquí
  const { timeLeft, progress, status, start, pause, reset, setDuration } =
    useTimer(DEFAULT_INTERVAL.seconds);

  // Modal personalizado
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');

  // Cuando el usuario toca un chip de intervalo:
  const handleSelectInterval = (interval: IntervalOption) => {
    haptic.light();
    if (interval.id === 'custom') {
      // Abrir modal para ingresar tiempo personalizado
      setCustomMinutes('');
      setCustomSeconds('');
      setShowCustom(true);
      return;
    }
    setSelectedId(interval.id);
    setDuration(interval.seconds);
  };

  // Confirmar tiempo personalizado
  const confirmCustom = () => {
    const mins = parseInt(customMinutes, 10) || 0;
    const secs = parseInt(customSeconds, 10) || 0;
    const total = mins * 60 + secs;
    if (total < 5) {
      Alert.alert('Mínimo 5 segundos', 'Ingresa un tiempo mayor.');
      return;
    }
    haptic.medium();
    setSelectedId('custom');
    setDuration(total);
    setShowCustom(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Botón para volver */}
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
      </Pressable>

      {/* Título */}
      <Text style={styles.title}>ATP</Text>

      {/* Selector de intervalos — fila de chips */}
      <IntervalSelector
        selectedId={selectedId}
        onSelect={handleSelectInterval}
      />

      {/* Círculo animado con el tiempo restante */}
      <View style={styles.timerWrapper}>
        <CircularTimer timeLeft={timeLeft} progress={progress} />
      </View>

      {/* Botones de control: Start/Pause/Reset */}
      <Controls
        status={status}
        onStart={start}
        onPause={pause}
        onReset={reset}
      />

      {/* Modal de tiempo personalizado */}
      <Modal visible={showCustom} transparent animationType="slide" onRequestClose={() => setShowCustom(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCustom(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Personalizar timer</Text>

            <Text style={styles.inputLabel}>MINUTOS</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={customMinutes}
              onChangeText={setCustomMinutes}
              placeholder="0"
              placeholderTextColor="#444"
              maxLength={3}
              autoFocus
            />

            <Text style={styles.inputLabel}>SEGUNDOS</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={customSeconds}
              onChangeText={setCustomSeconds}
              placeholder="30"
              placeholderTextColor="#444"
              maxLength={2}
            />

            <AnimatedPressable style={styles.confirmBtn} onPress={confirmCustom}>
              <Text style={styles.confirmBtnText}>CONFIRMAR</Text>
            </AnimatedPressable>

            <AnimatedPressable onPress={() => setShowCustom(false)} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ color: '#888', fontSize: FontSizes.sm, fontFamily: Fonts.regular }}>Cancelar</Text>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  backButton: {
    position: 'absolute',
    top: Spacing.xxl,
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.sm,
  },
  title: {
    color: Colors.neonGreen,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.extraBold,
    letterSpacing: 6,
    marginBottom: Spacing.sm,
  },
  timerWrapper: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },

  // Modal personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#888',
    letterSpacing: 2,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 0.5,
    borderColor: '#333',
    marginBottom: Spacing.md,
  },
  confirmBtn: {
    backgroundColor: Colors.neonGreen,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  confirmBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
});
