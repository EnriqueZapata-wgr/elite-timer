/**
 * SeccionColapsable — una sección de SALUD dentro del propio tab.
 *
 * OLA6 PIEZA A. Antes esto era PuertaScreen: una pantalla completa por puerta,
 * montada por tres archivos de 19 líneas que solo pasaban una constante. El
 * usuario pagaba un toque para llegar a una lista que cabía en la pantalla que
 * ya tenía enfrente. Ahora la lista vive donde se decide: el encabezado abre y
 * cierra, y lo que hay detrás se ve sin cambiar de pantalla.
 *
 * Dos modos, y la diferencia importa:
 *   · con `destinos` → el encabezado colapsa. Es un menú de navegación.
 *   · con `route` y sin `destinos` → el encabezado NAVEGA. Es para las
 *     secciones cuyo destino ya es una pantalla de datos y no un cascarón
 *     (MIS DATOS, que es una lista densa de valores, y CICLO). Colapsarlas
 *     para mostrar una sola fila sería el mismo toque de más, disfrazado.
 *
 * Las filas salen de salud-puertas.ts, que es donde se verifica que nada se
 * quedó fuera. `children` es para lo que no es un destino del registro: hoy,
 * la fila roja de la ficha de emergencia.
 */
import { type ReactNode, useMemo } from 'react';
import { View, StyleSheet, type ImageSourcePropType } from 'react-native';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { visibleDestinos, type Destino } from '@/src/constants/salud-puertas';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

interface Props {
  icon: AppIconName;
  title: string;
  subtitle: string;
  /** Color del encabezado (el primero del gradiente de la puerta). */
  acento: string;
  /** Si viene, la sección colapsa y muestra estas filas. */
  destinos?: Destino[];
  /** Si no hay destinos, el encabezado navega aquí. */
  route?: Href;
  /**
   * La tarjeta NO cambia: es la misma EditorialCard de siempre, con su foto,
   * su gradiente y su tamaño. Decisión de Enrique (13-ago-2026): "se quedan
   * como estaban". Lo único que cambió en OLA6 es qué pasa al TOCARLA: antes
   * te sacaba a una pantalla-pasillo que solo listaba destinos; ahora la
   * lista se abre debajo, sin salir de SALUD.
   */
  image?: ImageSourcePropType;
  /** Gradiente de la puerta, tal cual lo declara salud-puertas. */
  gradient: [string, string] | [string, string, string];
  isFemale: boolean;
  abierta: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export function SeccionColapsable({
  icon, title, subtitle, acento, destinos, route, image, gradient, isFemale, abierta, onToggle, children,
}: Props) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();

  const colapsable = !!destinos;
  const rows = destinos ? visibleDestinos(destinos, isFemale) : [];

  const onPressHeader = () => {
    haptic.medium();
    if (colapsable) onToggle();
    else if (route) router.push(route);
  };

  return (
    <View style={s.wrap}>
      {/* LA MISMA TARJETA DE SIEMPRE. Mismo componente, misma foto, mismo
          gradiente, mismo tamaño que antes de OLA6. El único cambio es el
          destino del tap: colapsar en vez de navegar a un pasillo. El badge
          avisa que la lista está abierta, para que el usuario sepa que lo de
          abajo pertenece a esta tarjeta. */}
      <EditorialCard
        cardKey={`salud_${title}`}
        icon={icon}
        iconName={icon}
        title={title}
        subtitle={subtitle}
        gradient={gradient}
        imageBn={image}
        badge={colapsable && abierta ? 'ABIERTO' : undefined}
        onTap={onPressHeader}
      />

      {colapsable && abierta && (
        <View style={s.body}>
          {rows.map((d, i) => (
            <Animated.View key={d.key} entering={FadeInUp.delay(Math.min(i, 8) * 28).springify()}>
              <AnimatedPressable
                style={s.row}
                onPress={() => { haptic.light(); router.push(d.route); }}
              >
                <View style={[s.rowIcon, { backgroundColor: d.color + '1A' }]}>
                  <AppIcon name={d.icon} size={18} color={d.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={s.rowTitle}>{d.title}</EliteText>
                  <EliteText style={s.rowSub} numberOfLines={1}>{d.subtitle}</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={t.sinDatos} />
              </AnimatedPressable>
            </Animated.View>
          ))}
          {children}
        </View>
      )}
    </View>
  );
}

const tenue = (t: AppThemeTokens) => (t.kind === 'dark' ? t.textoTenue : t.textoSecundario);
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  wrap: { marginBottom: Spacing.sm },
  // El encabezado ES la EditorialCard: aquí solo queda el cuerpo que se
  // despliega debajo cuando la sección abre.
  headerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 0.6 },
  headerSub: { color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 2 },
  body: { paddingTop: 8, paddingLeft: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.hundido,
    borderWidth: 0.5, borderColor: t.borde,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowSub: { color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1 },
});
