/**
 * MenteHero (Mega-Sprint E · #138) — hero editorial de las pantallas de ejecución
 * del pilar Mente (respiración, meditación, journal). Sube esas pantallas al
 * lenguaje visual post-Sprint 2: ImageBackground MJ + overlay gradiente + título,
 * en vez del bloque de color plano. El morado del pilar (CATEGORY_COLORS.mind)
 * queda como ACENTO (kicker + borde inferior), no como fondo dominante.
 *
 * Patrón: mismo tratamiento editorial que la card de Fitzpatrick (Sprint 2) y las
 * cards del hub /mente. `require()` estático del `.jpg` lo pasa el caller.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet, ImageBackground, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { BackButton } from '@/src/components/ui/BackButton';
import { CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

const MIND = CATEGORY_COLORS.mind; // #7F77DD — acento del pilar

interface Props {
  image: ImageSourcePropType;
  /** Kicker corto arriba del título (ej. "TU PILAR · MENTE"). */
  kicker?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Acciones opcionales arriba a la derecha (ej. historial + ayuda del journal). */
  rightContent?: ReactNode;
}

export function MenteHero({ image, kicker, title, subtitle, onBack, rightContent }: Props) {
  return (
    <ImageBackground source={image} style={s.hero} imageStyle={s.heroImg}>
      {/* Overlay fuerte abajo para legibilidad del título (DS §3 · overlay ≥0.45). */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)', 'rgba(10,10,10,0.95)']}
        style={StyleSheet.absoluteFill}
      />
      {onBack ? (
        <View style={s.back}><BackButton onPress={onBack} color="#fff" /></View>
      ) : null}
      {rightContent ? <View style={s.right}>{rightContent}</View> : null}
      <View style={s.content}>
        {kicker ? <EliteText style={s.kicker}>{kicker}</EliteText> : null}
        <EliteText style={s.title}>{title}</EliteText>
        {subtitle ? <EliteText style={s.subtitle}>{subtitle}</EliteText> : null}
      </View>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  hero: {
    width: '100%', height: 180, justifyContent: 'flex-end',
    borderBottomWidth: 2, borderBottomColor: withOpacity(MIND, 0.55),
  },
  heroImg: { resizeMode: 'cover' },
  back: { position: 'absolute', top: Spacing.md, left: Spacing.sm, zIndex: 10 },
  right: { position: 'absolute', top: Spacing.md + 6, right: Spacing.md, zIndex: 10 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  kicker: { color: MIND, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3, marginBottom: 4 },
  title: { color: '#fff', fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 1 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 2 },
});

export default MenteHero;
