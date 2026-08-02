/**
 * AppTile — un icono de la sala ATP. Icono en una loseta redondeada + nombre
 * debajo, cuatro por fila.
 *
 * El dibujo SIEMPRE sale de <AppIcon>: esta pantalla no importa iconos.
 *
 * 19.1 · Pieza 4: el color entra por sección, no por app (cinco bloques se
 * leen como sistema; veinticinco serían confeti). Tres capas desde
 * APP_SECTION_COLORS (brand.ts, nunca un hex a mano): fondo al 10%, borde al
 * 22%, icono al 100%. La etiqueta se queda gris: si icono y texto van los dos
 * en color, la cuadrícula vibra. Ningún mosaico lleva degradado — el
 * degradado es territorio de la molécula y de la orbe.
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { APP_SECTION_COLORS, TEXT, withOpacity } from '@/src/constants/brand';
import type { AppSection } from '@/src/constants/app-registry';
import { Fonts } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';

/** El ancho lo pone la celda del contenedor (25% = 4 columnas). */
export const TILE_COLUMNS = 4;

interface Props {
  icon: string;
  label: string;
  section: AppSection;
  onPress: () => void;
}

export function AppTile({ icon, label, section, onPress }: Props) {
  const color = APP_SECTION_COLORS[section];
  return (
    <AnimatedPressable style={s.wrap} onPress={() => { haptic.light(); onPress(); }}>
      <View
        style={[
          s.tile,
          { backgroundColor: withOpacity(color, 0.10), borderColor: withOpacity(color, 0.22) },
        ]}
      >
        <AppIcon name={icon} size={26} color={color} />
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
    borderWidth: 0.5,
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
