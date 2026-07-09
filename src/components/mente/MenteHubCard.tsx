/**
 * MenteHubCard — card editorial del hub MENTE (T1 Sprint MENTE Ecosystem).
 *
 * Estética editorial ATP: B/N, tipografía grande, borde fino, acento lima
 * solo en el CTA y datos vivos. Sensibilidad emocional: calma, sin ruido.
 *
 * `imageBn` queda como placeholder para las imágenes MJ de Enrique — cuando
 * existan se pintan como fondo con overlay oscuro; sin imagen la card es
 * tipográfica pura (se ve terminada igual).
 */
import { View, StyleSheet, ImageBackground, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  /** Línea dinámica (streak, última sesión…). */
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** CTA secundario dentro de la card (ej. "Nueva entrada"). */
  ctaLabel?: string;
  onCta?: () => void;
  /** Chip pequeño a la derecha (ej. "🔥 5 días"). */
  badge?: string;
  /** Placeholder para imagen editorial B/N (MJ pendiente). */
  imageBn?: ImageSourcePropType;
}

export function MenteHubCard({ title, subtitle, icon, onPress, ctaLabel, onCta, badge, imageBn }: Props) {
  const inner = (
    <View style={s.body}>
      <View style={s.topRow}>
        <View style={s.iconCircle}>
          <Ionicons name={icon} size={20} color={TEXT.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <EliteText style={s.title}>{title}</EliteText>
          <EliteText style={s.subtitle}>{subtitle}</EliteText>
        </View>
        {badge ? (
          <View style={s.badge}>
            <EliteText style={s.badgeText}>{badge}</EliteText>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
        )}
      </View>

      {ctaLabel && onCta && (
        <AnimatedPressable
          onPress={() => { haptic.light(); onCta(); }}
          style={s.cta}
        >
          <EliteText style={s.ctaText}>{ctaLabel}</EliteText>
          <Ionicons name="arrow-forward" size={14} color="#000" />
        </AnimatedPressable>
      )}
    </View>
  );

  return (
    <AnimatedPressable onPress={() => { haptic.light(); onPress(); }} style={s.card}>
      {imageBn ? (
        <ImageBackground source={imageBn} style={s.imageBg} imageStyle={s.image}>
          <View style={s.imageOverlay}>{inner}</View>
        </ImageBackground>
      ) : (
        inner
      )}
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  imageBg: { width: '100%' },
  image: { opacity: 0.35 },
  imageOverlay: { backgroundColor: 'rgba(0,0,0,0.35)' },
  body: { padding: Spacing.md, gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.extraBold, fontSize: FontSizes.lg, color: TEXT.primary,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  subtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, marginTop: 2 },
  badge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 10,
  },
  ctaText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: '#000', letterSpacing: 1 },
});

export default MenteHubCard;
