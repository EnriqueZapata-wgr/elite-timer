import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes } from '@/constants/theme';

// Dimensiones del círculo
const SIZE = 280;              // Ancho y alto total del componente
const STROKE_WIDTH = 10;       // Grosor visual del anillo
const HALF_SIZE = SIZE / 2;    // Mitad — usado para centrar y rotar

interface CircularTimerProps {
  timeLeft: number;    // Segundos restantes (para mostrar el texto)
  progress: number;    // De 0 a 1 (viene del hook useTimer)
}

/**
 * CircularTimer — Cuenta regresiva con anillo de progreso circular.
 *
 * Técnica: Dos semicírculos (izquierdo y derecho) dentro de contenedores
 * que actúan como máscaras (overflow: 'hidden'). Rotamos cada semicírculo
 * según el progreso para revelar la porción correcta del anillo verde.
 *
 * - progress 1.0 → 0.5: el semicírculo derecho rota de 0° a 180°
 * - progress 0.5 → 0.0: el semicírculo izquierdo rota de 0° a 180°
 *
 * Esto crea la ilusión de un arco que se consume en sentido horario.
 */
export function CircularTimer({ timeLeft, progress }: CircularTimerProps) {

  // Convertimos progress (0-1) en rotaciones para cada mitad.
  // La mitad derecha cubre el progreso de 1.0 a 0.5
  // La mitad izquierda cubre el progreso de 0.5 a 0.0

  // Rotación de la mitad derecha: cuando progress va de 1→0.5, rota de 0°→180°
  const rightRotation = progress > 0.5
    ? (1 - progress) * 2 * 180    // Mapea 1→0.5 a 0°→180°
    : 180;                         // Ya completó su rotación

  // Rotación de la mitad izquierda: cuando progress va de 0.5→0, rota de 0°→180°
  const leftRotation = progress > 0.5
    ? 0                            // Aún no empieza a rotar
    : (0.5 - progress) * 2 * 180; // Mapea 0.5→0 a 0°→180°

  // Formato MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Capa 1: Anillo de fondo (pista gris oscura, siempre visible) */}
      <View style={styles.track} />

      {/* Capa 2: Anillo de progreso — dos mitades enmascaradas */}

      {/* Mitad derecha: cubre las posiciones de 12:00 a 6:00 */}
      <View style={styles.rightMask}>
        {/* El semicírculo verde que rota dentro de la máscara */}
        <View
          style={[
            styles.rightHalf,
            { transform: [{ rotate: `${rightRotation}deg` }] },
          ]}
        />
      </View>

      {/* Mitad izquierda: cubre las posiciones de 6:00 a 12:00 */}
      <View style={styles.leftMask}>
        <View
          style={[
            styles.leftHalf,
            { transform: [{ rotate: `${leftRotation}deg` }] },
          ]}
        />
      </View>

      {/* Capa 3: Disco interior negro que tapa el centro, dejando solo el anillo */}
      <View style={styles.innerCircle} />

      {/* Capa 4: Texto del tiempo, centrado sobre todo */}
      <View style={styles.textContainer}>
        <Text style={styles.time}>{display}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Contenedor principal — todo se posiciona absoluto dentro de él
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Anillo de fondo: círculo completo gris oscuro
  track: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
    borderColor: Colors.surfaceLight,
  },

  // Máscara derecha: solo muestra la mitad derecha del contenedor.
  // overflow: 'hidden' corta todo lo que sobresale a la izquierda.
  rightMask: {
    position: 'absolute',
    width: HALF_SIZE,
    height: SIZE,
    right: 0,
    overflow: 'hidden',
  },

  // Semicírculo derecho: un círculo completo posicionado para que
  // solo su mitad derecha sea visible dentro de la máscara.
  // transformOrigin en el borde izquierdo para que rote desde el centro del anillo.
  rightHalf: {
    width: SIZE,
    height: SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
    borderColor: Colors.neonGreen,
    position: 'absolute',
    right: 0,
    // Rota desde el centro-izquierdo del semicírculo (= centro del anillo completo)
    transformOrigin: `${HALF_SIZE}px ${HALF_SIZE}px`,
  },

  // Máscara izquierda: solo muestra la mitad izquierda
  leftMask: {
    position: 'absolute',
    width: HALF_SIZE,
    height: SIZE,
    left: 0,
    overflow: 'hidden',
  },

  // Semicírculo izquierdo: mismo principio, lado opuesto
  leftHalf: {
    width: SIZE,
    height: SIZE,
    borderRadius: HALF_SIZE,
    borderWidth: STROKE_WIDTH,
    borderColor: Colors.neonGreen,
    position: 'absolute',
    left: 0,
    transformOrigin: `${HALF_SIZE}px ${HALF_SIZE}px`,
  },

  // Disco interior negro: tapa el centro del círculo para que solo
  // quede visible el anillo exterior (el borde).
  innerCircle: {
    position: 'absolute',
    width: SIZE - STROKE_WIDTH * 2,
    height: SIZE - STROKE_WIDTH * 2,
    borderRadius: (SIZE - STROKE_WIDTH * 2) / 2,
    backgroundColor: Colors.black,
  },

  // Contenedor del texto — centrado sobre todo el componente
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tipografía grande, bold, verde neón — look premium
  time: {
    fontSize: FontSizes.timer,
    fontWeight: '800',
    color: Colors.neonGreen,
    fontVariant: ['tabular-nums'],  // Dígitos de ancho fijo para que no "bailen"
    letterSpacing: 2,
  },
});
