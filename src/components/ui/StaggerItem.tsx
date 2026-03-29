/**
 * StaggerItem — Wrapper para entrada staggered de items en listas.
 */
import { type ReactNode } from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  index: number;
  delay?: number;
}

export function StaggerItem({ children, index, delay = 50 }: Props) {
  return (
    <Animated.View entering={FadeInUp.delay(index * delay).duration(300).springify()}>
      {children}
    </Animated.View>
  );
}
