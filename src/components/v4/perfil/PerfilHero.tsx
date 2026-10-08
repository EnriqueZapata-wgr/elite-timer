/**
 * PerfilHero (8-oct-2026 (v4)): la tarjeta editorial de arriba del Perfil.
 * Foto en blanco y negro de un banco SIN persona (perfil-core,
 * IMAGENES_PERFIL_SIN_PERSONA), velo oscuro, "TU EDAD ATP", el numero grande
 * en lima (el dato heroico de la vista), la linea contra la edad real y la
 * fila "Sangre · Vida · Ritmo" con lo que exista.
 *
 * Como la EditorialCard de la casa, la tarjeta se queda OSCURA en los dos
 * temas (es la ventana, no el marco): texto blanco sobre foto. Lo unico que
 * lee el tema es su borde en claro. EditorialCard no se usa directo porque
 * su molde (titulo + subtitulo) no tiene lugar para el numero heroico.
 */
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { imagenPerfilKey, type HeroPerfil, type ImagenPerfilKey } from '@/src/services/perfil/perfil-core';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

/** Los archivos del banco, uno por llave del core (el tipo obliga a que esten todos y ni uno de mas). */
const IMAGEN: Record<ImagenPerfilKey, ImageSourcePropType> = {
  'noche-01': require('@/assets/images/hoy-extra/tu-dia/noche-01.webp'),
  'noche-02': require('@/assets/images/hoy-extra/tu-dia/noche-02.webp'),
  'noche-03': require('@/assets/images/hoy-extra/tu-dia/noche-03.webp'),
  'atardecer-01': require('@/assets/images/hoy-extra/tu-dia/atardecer-01.webp'),
  'atardecer-03': require('@/assets/images/hoy-extra/tu-dia/atardecer-03.webp'),
  'medio-dia-02': require('@/assets/images/hoy-extra/tu-dia/medio-dia-02.webp'),
};

interface Props {
  hero: HeroPerfil;
  /** Semilla de la foto (por ejemplo `${userId}-${hoy}`). */
  semilla?: string;
}

export function PerfilHero({ hero, semilla }: Props) {
  const t = useSurfaceTokens();
  const borde = t.kind === 'light' ? { borderWidth: 1, borderColor: t.bordeEditorial } : null;
  return (
    <View style={[s.card, borde]} accessible accessibilityLabel={hero.accesible}>
      <Image
        source={IMAGEN[imagenPerfilKey(semilla)]}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        contentFit="cover"
        transition={180}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.contenido}>
        <EliteText style={s.ceja}>TU EDAD ATP</EliteText>
        <EliteText style={s.numero}>{hero.edad}</EliteText>
        <EliteText style={s.delta}>{hero.delta}</EliteText>
        {hero.linea ? <EliteText style={s.linea}>{hero.linea}</EliteText> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.card, overflow: 'hidden',
    aspectRatio: 16 / 10, backgroundColor: ATP_BRAND.black,
  },
  contenido: { flex: 1, padding: Spacing.lg, justifyContent: 'flex-end' },
  ceja: { color: 'rgba(255,255,255,0.8)', fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 3 },
  numero: { color: ATP_BRAND.lime, fontFamily: Fonts.extraBold, fontSize: 64, lineHeight: 72, marginTop: 2 },
  delta: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  linea: { color: 'rgba(255,255,255,0.75)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: Spacing.xs },
});
