/**
 * IconEmociones — el plano emocional 12x12 (MB-15), dibujado a mano.
 *
 * Es uno de los dos glifos custom del set (con Icon1Rm) y el caso de prueba del
 * footgun de color: sus trazos usan `stroke="currentColor"` y el cuadrito de
 * posición usa `fill="currentColor"`. El `color` del root resuelve los dos.
 * Si este icono se ve completo, el enchufe pinta fill Y stroke; si solo se ve
 * el cuadrito (o solo la retícula), el enchufe está roto.
 */
import Svg, { Rect, Line } from 'react-native-svg';
import type { AppIconGlyphProps } from '../app-icon-map';

export function IconEmociones({ size, color }: AppIconGlyphProps) {
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
      <Rect x={32} y={32} width={192} height={192} rx={12} />
      <Line x1={96} y1={32} x2={96} y2={224} />
      <Line x1={160} y1={32} x2={160} y2={224} />
      <Line x1={32} y1={96} x2={224} y2={96} />
      <Line x1={32} y1={160} x2={224} y2={160} />
      <Rect x={176} y={48} width={32} height={32} rx={6} fill="currentColor" stroke="none" />
    </Svg>
  );
}
