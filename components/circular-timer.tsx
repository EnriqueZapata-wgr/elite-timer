import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Fonts } from '@/constants/theme';

// Dimensiones del círculo
const SIZE = 240;
const STROKE_WIDTH = 6;
const HALF_SIZE = SIZE / 2;

interface CircularTimerProps {
  timeLeft: number;
  progress: number;
  color?: string;
}

/**
 * CircularTimer — Cuenta regresiva con anillo de progreso y glow sutil.
 */
export function CircularTimer({ timeLeft, progress, color }: CircularTimerProps) {
  const ringColor = color ?? Colors.neonGreen;

  const rightRotation = progress > 0.5
    ? (1 - progress) * 2 * 180
    : 180;

  const leftRotation = progress > 0.5
    ? 0
    : (0.5 - progress) * 2 * 180;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Glow sutil detrás del anillo */}
      <View style={[styles.glow, { shadowColor: ringColor }]} />

      {/* Pista gris */}
      <View style={styles.track} />

      {/* Semicírculo derecho */}
      <View style={styles.rightMask}>
        <View style={[
          styles.rightHalf,
          { borderColor: ringColor, transform: [{ rotate: `${rightRotation}deg` }] },
        ]} />
      </View>

      {/* Semicírculo izquierdo */}
      <View style={styles.leftMask}>
        <View style={[
          styles.leftHalf,
          { borderColor: ringColor, transform: [{ rotate: `${leftRotation}deg` }] },
        ]} />
      </View>

      {/* Disco interior */}
      <View style={styles.innerCircle} />

      {/* Tiempo */}
      <View style={styles.textContainer}>
        <Text style={[styles.time, { color: ringColor }]}>{display}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: SIZE - 20,
    height: SIZE - 20,
    borderRadius: (SIZE - 20) / 2,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 0,
  },
  track: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
    borderColor: '#1A1A1A',
  },
  rightMask: {
    position: 'absolute',
    width: HALF_SIZE,
    height: SIZE,
    right: 0,
    overflow: 'hidden',
  },
  rightHalf: {
    width: SIZE,
    height: SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
    position: 'absolute',
    right: 0,
    transformOrigin: `${HALF_SIZE}px ${HALF_SIZE}px`,
  },
  leftMask: {
    position: 'absolute',
    width: HALF_SIZE,
    height: SIZE,
    left: 0,
    overflow: 'hidden',
  },
  leftHalf: {
    width: SIZE,
    height: SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
    position: 'absolute',
    left: 0,
    transformOrigin: `${HALF_SIZE}px ${HALF_SIZE}px`,
  },
  innerCircle: {
    position: 'absolute',
    width: SIZE - STROKE_WIDTH * 2,
    height: SIZE - STROKE_WIDTH * 2,
    borderRadius: (SIZE - STROKE_WIDTH * 2) / 2,
    backgroundColor: Colors.black,
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontSize: FontSizes.timer,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
});
