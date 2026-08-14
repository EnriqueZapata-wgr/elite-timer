/**
 * QrFicha — pinta el QR PÚBLICO de la ficha de emergencia.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SON DOS CÓDIGOS DISTINTOS. No los juntes.
 *
 * 1) QR PÚBLICO (este). Lleva los campos curados de la ficha EMBEBIDOS, no un
 *    link: sin red un link no sirve, y en urgencias no hay red. Se imprime, se
 *    cuelga del cuello, se pega adentro del casco. Se abre sin sesión. Lo que
 *    entra aquí lo decide la regla de admisión de emergency-card-core.
 *
 * 2) QR CLÍNICO. El que se escanea en un hospital para DESCARGAR la historia
 *    clínica. Es otra cosa: cuelga del expediente, exige sesión y se genera
 *    desde dentro de la app con el teléfono desbloqueado. No lleva datos
 *    embebidos, lleva una referencia que hay que autorizar.
 *
 *    HUECO DECLARADO: el QR clínico NO EXISTE todavía. No se construyó en esta
 *    ola a propósito. Cuando se construya, va en su propio componente colgado
 *    del expediente, NO reusando este: el día que los dos códigos compartan
 *    pantalla o componente, alguien va a imprimir el equivocado.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La matriz la calcula qr-core (puro, verificado contra un generador de
 * referencia); aquí solo se dibuja. Un único <Path> con todos los módulos en
 * vez de miles de <Rect>: una versión 20 tiene 9,409 módulos y nueve mil vistas
 * nativas no las quiere nadie.
 *
 * Negro sobre blanco y con margen: el "quiet zone" de cuatro módulos no es
 * decorativo, sin él muchos lectores no enganchan.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { qrMatrix } from '@/src/services/salud/qr-core';
import { Fonts } from '@/constants/theme';

interface Props {
  /** El contenido embebido. No es una URL: sin red un link no sirve. */
  payload: string;
  /** Lado del código en puntos. */
  size?: number;
}

const QUIET = 4;

export function QrFicha({ payload, size = 260 }: Props) {
  const matriz = useMemo(() => qrMatrix(payload), [payload]);

  if (!matriz) {
    return (
      <View style={[s.caja, { width: size, height: size }]}>
        <EliteText style={s.aviso}>
          Tu ficha es muy larga para un código. Acorta la nota y vuelve a intentar.
        </EliteText>
      </View>
    );
  }

  const n = matriz.length;
  const total = n + QUIET * 2;

  // Un solo path: por cada módulo oscuro, un cuadrito de 1x1 en el viewBox.
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matriz[r][c]) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
      <Rect x={0} y={0} width={total} height={total} fill="#FFFFFF" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}

const s = StyleSheet.create({
  caja: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 16 },
  aviso: { color: '#555555', fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
