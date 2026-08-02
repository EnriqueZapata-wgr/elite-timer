/**
 * Icon1Rm — kettlebell con flecha de progresión, dibujado a mano.
 *
 * Glifo custom 100% de trazo (`stroke="currentColor"`, `fill="none"`): si el
 * enchufe solo pintara `fill`, este icono saldría invisible sobre negro. Es la
 * mitad del caso de prueba del footgun de color (la otra es IconEmociones).
 */
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { AppIconGlyphProps } from '../app-icon-map';

export function Icon1Rm({ size, color }: AppIconGlyphProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      color={color}
      fill="none"
      stroke="currentColor"
      strokeWidth={16}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={100} cy={156} r={60} />
      <Circle cx={100} cy={156} r={18} />
      <Line x1={200} y1={128} x2={200} y2={48} />
      <Polyline points="172,76 200,48 228,76" />
    </Svg>
  );
}
