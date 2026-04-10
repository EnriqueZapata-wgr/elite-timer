/**
 * AnimatedScoreRing — Anillo SVG con progresion animada y numero contando.
 *
 * El stroke del circulo y el numero animan desde 0 hasta el score actual
 * en 1.2s con easing cubic-out. El color depende del score (semantico).
 *
 * Uso:
 *   <AnimatedScoreRing score={overallScore} size={180} label="ATP SCORE" />
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getScoreColor } from '@/src/constants/brand';

interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showLabel?: boolean;
  /** Si false, oculta el número central (para cuando se renderiza contenido custom encima). */
  showScore?: boolean;
}

export function AnimatedScoreRing({
  score,
  size = 160,
  strokeWidth = 3,
  label = 'ATP SCORE',
  showLabel = true,
  showScore = true,
}: Props) {
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  const color = getScoreColor(score);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const progress = Math.max(0, Math.min(1, score / 100));

  useEffect(() => {
    animatedScore.setValue(0);
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    return () => animatedScore.removeListener(listener);
  }, [score, animatedScore]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track de fondo */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progreso */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      {showScore && (
        <View style={styles.center}>
          <Text style={[styles.score, { fontSize: size * 0.28, color }]}>{displayScore}</Text>
          {showLabel && (
            <Text style={[styles.label, { color, fontSize: Math.max(size * 0.055, 8) }]}>{label}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: '700',
    letterSpacing: -1,
  },
  label: {
    letterSpacing: 2,
    fontWeight: '600',
    marginTop: 2,
  },
});
