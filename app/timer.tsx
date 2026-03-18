import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CircularTimer } from '@/components/circular-timer';
import { Controls } from '@/components/controls';
import { IntervalSelector } from '@/components/interval-selector';
import { useTimer } from '@/hooks/use-timer';
import { DEFAULT_INTERVAL, type IntervalOption } from '@/constants/intervals';
import { Colors, FontSizes, Fonts, Spacing } from '@/constants/theme';

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

  // Cuando el usuario toca un chip de intervalo:
  // 1. Actualizamos el chip seleccionado visualmente
  // 2. Cambiamos la duración del timer (que también lo resetea)
  const handleSelectInterval = (interval: IntervalOption) => {
    setSelectedId(interval.id);
    setDuration(interval.seconds);
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Botón para volver al Dashboard */}
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
      </Pressable>

      {/* Título de la app */}
      <Text style={styles.title}>ELITE TIMER</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Pantalla completa, fondo negro, contenido centrado verticalmente
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  // Botón de regreso — esquina superior izquierda, posición absoluta
  backButton: {
    position: 'absolute',
    top: Spacing.xxl,
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.sm,
  },
  // Título: verde neón, grande, tracking amplio para look premium
  title: {
    color: Colors.neonGreen,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.extraBold,
    letterSpacing: 6,
    marginBottom: Spacing.sm,
  },
  // Contenedor del timer — margen vertical para separar de los otros elementos
  timerWrapper: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
});
