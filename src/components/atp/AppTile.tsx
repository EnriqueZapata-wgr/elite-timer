/**
 * AppTile — un icono de la sala ATP. Icono en una loseta redondeada + nombre
 * debajo, cuatro por fila.
 *
 * El dibujo SIEMPRE sale de <AppIcon>: esta pantalla no importa iconos.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { ELEVATION, TEXT } from '@/src/constants/brand';
import { Fonts } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';

/** El ancho lo pone la celda del contenedor (25% = 4 columnas). */
export const TILE_COLUMNS = 4;

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
}

export function AppTile({ icon, label, onPress }: Props) {
  return (
    <AnimatedPressable style={s.wrap} onPress={() => { haptic.light(); onPress(); }}>
      <View style={s.tile}>
        <AppIcon name={icon} size={26} color={TEXT.primary} />
      </View>
      <EliteText style={s.label} numberOfLines={1}>{label}</EliteText>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 10 },
  tile: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 7,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: TEXT.secondary,
    textAlign: 'center',
    maxWidth: 74,
  },
});
