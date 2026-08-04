/**
 * TareaCard (MB-20.1 · Pieza 1) — la card editorial de una tarea pendiente.
 *
 * Piel, no esqueleto: el contrato de gestos es EXACTAMENTE el de TareaRow
 * (useTareaGesto, ajuste MB-20.4): el tap hace la acción principal de la
 * tarea — palomear, navegar o preguntar — y el tap largo es el atajo a la
 * función en palomear/experiencia. La confirmación del palomeo es el viaje
 * de la card al bloque de HECHAS (Pieza 3). Lo único propio de esta card
 * es cómo se ve.
 *
 * Receta visual = el molde editorial de siempre (EditorialCard): foto de
 * fondo + degradado diagonal del COLOR DE SECCIÓN (APP_SECTION_COLORS) +
 * velo oscuro inferior para que el texto lea sobre cualquier imagen,
 * incluidas las claras (si una foto no aguanta, se refuerza el velo, no se
 * atenúa el texto). Sin foto cae al placeholder de degradado con glifo.
 */
import { Pressable, View, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AppIcon, hasAppIcon } from '@/src/components/ui/AppIcon';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';
import { useTareaGesto, LONG_PRESS_MS } from '@/src/components/hoy/useTareaGesto';
import type { Tarea } from '@/src/services/hoy/tareas-core';

interface Props {
  tarea: Tarea;
  /** Color de su sección (APP_SECTION_COLORS via seccionForTarea). */
  sectionColor: string;
  /** Foto editorial (tarea-images). Sin ella: placeholder de degradado. */
  image?: ImageSourcePropType;
  /** El dato vivo de la card (datoForTarea). Sin él, la card va sin dato. */
  dato?: string;
  /** Badge superior (el héroe de AGENDA lleva "AHORA"). */
  badge?: string;
  /** Navegar a la función (tap en navegar/inline; tap largo como atajo en
   * palomear). */
  onNavigate: (t: Tarea) => void;
  /** Tap simple en fila palomeable (toggle on/off). */
  onPalomear: (t: Tarea) => void;
  /** Captura inline de hidratación (deltaMl con signo), el mismo handler
   * de la fila. Decisión de Enrique: la card grande lleva LOS TRES botones
   * (+250 / +500 / −250). */
  onInline?: (t: Tarea, deltaMl: number) => void;
}

export function TareaCard({
  tarea, sectionColor, image, dato, badge,
  onNavigate, onPalomear, onInline,
}: Props) {
  const { handlePress, handlePressIn, handleLongPress } =
    useTareaGesto(tarea, { onNavigate, onPalomear });

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onLongPress={handleLongPress}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole="button"
      accessibilityLabel={tarea.name}
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
    >
      {/* Fondo: tinte de sección SIEMPRE debajo (la card nunca es un hueco
          negro mientras decodifica) + glifo grande si no hay foto. */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: sectionColor, opacity: 0.25 }]} />
        {!image && hasAppIcon(tarea.icon) ? (
          <View style={s.placeholderGlyph}>
            <AppIcon name={tarea.icon} size={64} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      {image ? (
        <Image
          source={image}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      ) : null}
      {/* Degradado diagonal del color de sección: tinte fuerte arriba-izq,
          la foto respira abajo-der (misma receta que EditorialCard). */}
      <LinearGradient
        colors={[`${sectionColor}CC`, `${sectionColor}1A`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Velo inferior: la legibilidad no se negocia con fotos claras. */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.62)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.content}>
        <View style={s.topRow}>
          {/* La pista es la forma (MB-20.5 P3): el círculo es la promesa de
              que un toque lo llena (palomear); el CHEVRON es la forma que
              todo el mundo lee como "esto te lleva a algún lado" (navegar /
              inline). Mismo tamaño, misma posición, mismo peso visual — y
              el slot conserva los badges a la derecha (space-between). */}
          {tarea.gesto === 'palomear' ? (
            <View style={s.check} />
          ) : (
            <View style={s.chevronSlot}>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
          )}
          <View style={s.topRight}>
            {badge ? (
              <View style={s.badge}><EliteText style={s.badgeText}>{badge}</EliteText></View>
            ) : null}
            {tarea.weight != null ? (
              <View style={s.pill}><EliteText style={s.pillText}>+{tarea.weight}</EliteText></View>
            ) : null}
          </View>
        </View>

        <View style={s.bottom}>
          <EliteText style={s.title} numberOfLines={2}>{tarea.name}</EliteText>
          {dato ? <EliteText style={s.dato} numberOfLines={2}>{dato}</EliteText> : null}
          {tarea.kind === 'quant' && tarea.progress != null ? (
            <View style={s.track}>
              <View style={[s.trackFill, { width: `${Math.round(tarea.progress * 100)}%` }]} />
            </View>
          ) : null}
          {/* Decisión de Enrique: la card grande lleva LOS TRES botones,
              no solo el de sumar. La resta corrige el toque de más (el
              servicio clampa en 0) y no celebra al vibrar. */}
          {tarea.gesto === 'inline' && onInline && !tarea.completed ? (
            <View style={s.quickRow}>
              {([[250, '+250 ml'], [500, '+500 ml'], [-250, '-250 ml']] as const).map(([delta, label]) => (
                <Pressable
                  key={label}
                  onPress={() => {
                    if (delta > 0) haptic.success(); else haptic.light();
                    onInline(tarea, delta);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [s.quickBtn, pressed && { opacity: 0.6 }]}
                  accessibilityLabel={delta > 0 ? `Agregar ${delta} mililitros` : `Quitar ${-delta} mililitros`}
                >
                  <EliteText style={s.quickBtnText}>{label}</EliteText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.card,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: '#000',
  },
  cardPressed: { transform: [{ scale: 0.985 }] },
  placeholderGlyph: { position: 'absolute', alignSelf: 'center', top: '30%', opacity: 0.35 },
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  chevronSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: ATP_BRAND.lime,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
  pill: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.18),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  bottom: { gap: 2 },
  title: {
    color: TEXT.primary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dato: { color: 'rgba(255,255,255,0.88)', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 8,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  quickBtnText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xs },
});
