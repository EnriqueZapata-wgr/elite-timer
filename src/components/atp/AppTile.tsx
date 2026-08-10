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
import { AppIcon, type AppIconName } from '@/src/components/ui/AppIcon';
import { APP_SECTION_COLORS, withOpacity } from '@/src/constants/brand';
import type { AppSection } from '@/src/constants/app-registry';
import { Fonts } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

/** El ancho lo pone la celda del contenedor (25% = 4 columnas). */
export const TILE_COLUMNS = 4;

interface Props {
  icon: AppIconName;
  label: string;
  section: AppSection;
  onPress: () => void;
  /** MB-22: tap largo — atajo a desinstalar / a la ficha. */
  onLongPress?: () => void;
}

// MB-22 Pieza 1: murió la palomita de instalada. Si la cuadrícula solo lista
// lo instalado, marcar cuáles lo están es señal sin información.
export function AppTile({ icon, label, section, onPress, onLongPress }: Props) {
  const color = APP_SECTION_COLORS[section];
  // MB-31B: la etiqueta sale del scope (gris del tema); el color de sección
  // en las tres capas del mosaico es identidad y no se tematiza.
  const t = useSurfaceTokens();
  return (
    <AnimatedPressable
      style={s.wrap}
      onPress={() => { haptic.light(); onPress(); }}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <View
        style={[
          s.tile,
          { backgroundColor: withOpacity(color, 0.10), borderColor: withOpacity(color, 0.22) },
        ]}
      >
        <AppIcon name={icon} size={26} color={color} />
      </View>
      <EliteText style={[s.label, { color: t.textoSecundario }]} numberOfLines={1}>{label}</EliteText>
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
    textAlign: 'center',
    maxWidth: 74,
  },
});
