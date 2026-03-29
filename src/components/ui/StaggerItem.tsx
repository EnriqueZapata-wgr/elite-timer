/**
 * StaggerItem — Wrapper para entrada staggered de items en listas.
 */
import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  index: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function StaggerItem({ children, index, delay = 50, style }: Props) {
  return (
    <Animated.View entering={FadeInUp.delay(index * delay).duration(300).springify()} style={style}>
      {children}
    </Animated.View>
  );
}
