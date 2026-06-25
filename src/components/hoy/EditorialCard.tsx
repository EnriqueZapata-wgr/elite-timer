/**
 * EditorialCard (#hoy-redesign, Parte 2 + 8) — card editorial full-width del HOY.
 * Imagen B/N de fondo (full bleed) + gradient overlay + texto blanco encima. Si NO hay imagen
 * (assets pendientes), cae a un placeholder de gradient sólido con el icono grande centrado.
 *
 * Estados: pending (vivo) · in_window (glow lima + badge "AHORA") · done (overlay + "Hecho hoy ✓")
 * · out_of_hour (mensaje contextual). Tokens canónicos + haptic + PressableScale (AnimatedPressable).
 */
import { View, StyleSheet, Image, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';

export type EditorialCardState = 'pending' | 'in_window' | 'done' | 'out_of_hour';

/** Tamaño de la card: normal (lista), hero (próximo evento), pillar (frente full ~45% pantalla). */
export type EditorialCardSize = 'normal' | 'hero' | 'pillar';

// Aspect ratio por size — coincide con las imágenes Midjourney (16:9 = 1.78) para que NO haya
// zoom/recorte. Antes usábamos minHeight fijo (210/260/340) y las cards quedaban más cuadradas
// que la imagen → cover recortaba mucho horizontal en pillars y se veía solo gradient.
// Ahora la card siempre tiene la forma de la foto: pillar más ancho/dramático, normal 16:9 puro.
// Pillar usa 4:3 (1.33) → un poco más cuadrada para impacto pero aún acomoda casi toda la foto.
const SIZE_ASPECT: Record<EditorialCardSize, number> = {
  normal: 16 / 9,  // 1.78 — exacto a la imagen
  hero: 16 / 9,    // 1.78 — exacto a la imagen
  pillar: 4 / 3,   // 1.33 — más cuadrada para impacto en Mi ATP (recorta ~25% horizontal)
};

export interface EditorialCardProps {
  cardKey: string;
  icon: string;
  title: string;
  subtitle?: string;
  message?: string;
  imageBn?: ImageSourcePropType;
  gradient: [string, string] | [string, string, string];
  state?: EditorialCardState;
  size?: EditorialCardSize;
  badge?: string;
  ctaLabel?: string;
  onTap?: () => void;
}

export function EditorialCard({
  cardKey, icon, title, subtitle, message, imageBn, gradient, state = 'pending', size = 'normal', badge, ctaLabel, onTap,
}: EditorialCardProps) {
  const done = state === 'done';
  const inWindow = state === 'in_window';
  const aspectRatio = SIZE_ASPECT[size];
  const big = size === 'pillar';

  return (
    <AnimatedPressable
      onPress={onTap ? () => { haptic.light(); onTap(); } : undefined}
      style={[styles.card, { aspectRatio }, inWindow && styles.glow]}
    >
      {/* Fondo: imagen B/N si existe, sino placeholder de gradient sólido con icono grande.
          IMPORTANTE: width/height EXPLÍCITOS además de absoluteFill. RN tiene un bug conocido
          donde Image con solo absoluteFill no calcula dimensiones del padre cuando el padre
          usa aspectRatio, y la Image renderiza a su tamaño natural (2048x1146) — solo se ve
          el crop sup-izq porque la card tiene overflow:hidden. Con width/height '100%' fuerza
          la escala correcta y resizeMode='cover' funciona como se espera. */}
      {imageBn ? (
        <Image
          source={imageBn}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
        />
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: gradient[0], opacity: 0.25 }]} />
          <EliteText style={styles.placeholderIcon}>{icon}</EliteText>
        </View>
      )}
      {/* Overlay de gradient de categoría (diagonal).
          - SIN imagen: gradient sólido (placeholder) con opacity 0.9.
          - CON imagen: gradient diagonal de color fuerte (alpha 80% = CC hex) a casi transparente
            (alpha 10% = 1A hex) → la esquina sup-izq tiene tinte de color, la esquina inf-der deja
            ver la imagen casi pura. Esto resuelve cuando el gradient es uniforme/saturado (verde-verde)
            que con opacity 0.45 sólido tintaba TODO y tapaba visualmente la imagen B/N. */}
      <LinearGradient
        colors={imageBn ? [`${gradient[0]}CC`, `${gradient[1]}1A`] : gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, !imageBn && { opacity: 0.9 }]}
      />
      {/* Velo oscuro en la parte inferior para que el texto blanco sea legible sobre cualquier
          imagen (sin esto, fotos claras hacen ilegible el texto). */}
      {imageBn ? (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {/* Velo extra cuando está hecho (apaga la card). */}
      {done ? <View style={[StyleSheet.absoluteFill, styles.doneVeil]} /> : null}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <EliteText style={[styles.icon, big && styles.iconBig]}>{icon}</EliteText>
          {inWindow && badge ? (
            <View style={styles.badge}><EliteText style={styles.badgeText}>{badge}</EliteText></View>
          ) : null}
          {done ? (
            <View style={styles.doneBadge}><EliteText style={styles.doneBadgeText}>Hecho hoy ✓</EliteText></View>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <EliteText style={[styles.title, big && styles.titleBig]} numberOfLines={2}>{title}</EliteText>
          {subtitle ? <EliteText style={[styles.subtitle, big && styles.subtitleBig]} numberOfLines={2}>{subtitle}</EliteText> : null}
          {message ? <EliteText style={styles.message} numberOfLines={2}>{message}</EliteText> : null}
          {ctaLabel ? (
            <View style={styles.cta}><EliteText style={styles.ctaText}>{ctaLabel}</EliteText></View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', borderRadius: Radius.card, overflow: 'hidden',
    marginBottom: Spacing.md, backgroundColor: '#000',
  },
  glow: {
    borderWidth: 1, borderColor: ATP_BRAND.lime,
    shadowColor: ATP_BRAND.lime, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  placeholderIcon: { position: 'absolute', alignSelf: 'center', top: '30%', fontSize: 64, opacity: 0.35 },
  doneVeil: { backgroundColor: 'rgba(0,0,0,0.55)' },
  // flex:1 hace que el content llene la card (cuyo height ya viene de aspectRatio en el padre).
  // SIN minHeight: si lo dejamos, fuerza altura > la del aspectRatio y rompe el ratio.
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { fontSize: 26 },
  iconBig: { fontSize: 40 },
  badge: { backgroundColor: ATP_BRAND.lime, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
  doneBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  doneBadgeText: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  bottom: { gap: 2 },
  title: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl, letterSpacing: 1 },
  titleBig: { fontSize: FontSizes.display, lineHeight: 38 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  subtitleBig: { fontSize: FontSizes.lg },
  message: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.sm, marginTop: 4, lineHeight: 18 },
  cta: { marginTop: Spacing.sm, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999 },
  ctaText: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
