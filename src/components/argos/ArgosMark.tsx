/**
 * ArgosMark — la orbe en reposo, estática (MB-20 4.4).
 *
 * Para burbujas, chips y cards de insight, donde la respiración no se ve y
 * solo gasta batería: un Svg puro, cero Reanimated. La misma esfera del
 * ArgosOrb (gradiente #EAFFC0 → lime → teal + brillo especular), sin halo.
 *
 * En listas se monta N veces (una por mensaje de ARGOS): el id del gradiente
 * es único por instancia para no colisionar defs.
 */
import { useId } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { ORB_LIME, ORB_TEAL } from './argos-orb-core';

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function ArgosMark({ size = 16, style }: Props) {
  const gid = `argosMark-${useId()}`;
  const c = size / 2;
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessibilityLabel="ARGOS"
      accessible={false}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx="38%" cy="34%" r="70%">
            <Stop offset="0%" stopColor="#EAFFC0" stopOpacity={0.95} />
            <Stop offset="45%" stopColor={ORB_LIME} stopOpacity={0.85} />
            <Stop offset="100%" stopColor={ORB_TEAL} stopOpacity={0.75} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill={`url(#${gid})`} />
        <Circle cx={size * 0.38} cy={size * 0.34} r={size * 0.1} fill="#ffffff" opacity={0.4} />
      </Svg>
    </View>
  );
}
