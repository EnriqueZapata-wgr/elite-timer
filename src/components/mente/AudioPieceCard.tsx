/**
 * Sprint Audio Mente — Card editorial de una pieza de audio.
 *
 * Molde "Mis Datos"/EditorialCard: imagen de fondo + gradient overlay +
 * jerarquía (título, duración, badge PRO). La cover remota (imagen_path) se
 * resuelve async con fallback editorial local por categoría.
 */
import { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { localCoverFor, resolveCoverSource } from '@/src/components/mente/audio-cover';
import type { AudioPiece } from '@/src/services/mente-audio-service';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';

interface Props {
  piece: AudioPiece;
  onPress: (piece: AudioPiece) => void;
}

function fmtMin(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} seg`;
  return `${Math.round(seconds / 60)} min`;
}

export function AudioPieceCard({ piece, onPress }: Props) {
  const [cover, setCover] = useState<ImageSourcePropType>(() => localCoverFor(piece));

  useEffect(() => {
    let alive = true;
    resolveCoverSource(piece).then(src => { if (alive) setCover(src); });
    return () => { alive = false; };
  }, [piece.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatedPressable onPress={() => onPress(piece)} style={s.card}>
      <ImageBackground source={cover} style={s.image} imageStyle={{ borderRadius: Radius.lg }}>
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.78)']}
          locations={[0.35, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
        />
        {piece.tier === 'pro' && (
          <View style={s.proBadge}>
            <Ionicons name="diamond-outline" size={9} color="#000" />
            <EliteText style={s.proBadgeText}>PRO</EliteText>
          </View>
        )}
        <View style={s.info}>
          <EliteText style={s.title} numberOfLines={2}>{piece.titulo}</EliteText>
          <View style={s.metaRow}>
            <Ionicons name="headset-outline" size={11} color="rgba(255,255,255,0.7)" />
            <EliteText style={s.meta}>{fmtMin(piece.duracion_seg)}</EliteText>
          </View>
        </View>
      </ImageBackground>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  card: { width: 168, marginRight: Spacing.sm },
  image: { width: 168, height: 200, justifyContent: 'flex-end' },
  proBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: ATP_BRAND.amber, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  proBadgeText: { fontSize: 9, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  info: { padding: Spacing.sm },
  title: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#fff', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: withOpacity('#ffffff', 0.7) },
});
