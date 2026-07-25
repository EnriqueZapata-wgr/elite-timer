/**
 * Sprint Audio Mente — Card editorial de una pieza de audio.
 *
 * Molde "Mis Datos"/EditorialCard: imagen de fondo + gradient overlay +
 * jerarquía (título, duración, badge PRO). La cover remota (imagen_path) se
 * resuelve async con fallback editorial local por categoría.
 */
import { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { localCoverFor, resolveRemoteCoverUrl } from '@/src/components/mente/audio-cover';
import type { AudioPiece } from '@/src/services/mente-audio-service';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, PILLAR_GRADIENTS, withOpacity } from '@/src/constants/brand';

interface Props {
  piece: AudioPiece;
  onPress: (piece: AudioPiece) => void;
}

function fmtMin(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} seg`;
  return `${Math.round(seconds / 60)} min`;
}

export function AudioPieceCard({ piece, onPress }: Props) {
  // V1.5.1 (#7): la remota entra encima con fade solo cuando cargó.
  // V1.5.2 (#3): la BASE ya no es la foto genérica de categoría cuando la pieza
  // TIENE cover remota — es un gradiente del pilar ("cargando→cargado", no
  // "foto vieja→foto nueva"). La foto local queda: (a) piezas sin imagen_path
  // (es SU cover), (b) fallo de red/firma (offline, vía onError).
  const [remoteUri, setRemoteUri] = useState<string | null>(null);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setRemoteUri(null);
    setRemoteFailed(false);
    resolveRemoteCoverUrl(piece).then(url => {
      if (!alive) return;
      if (url) setRemoteUri(url);
      else if (piece.imagen_path) setRemoteFailed(true); // firma falló → foto local
    });
    return () => { alive = false; };
  }, [piece.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const usePhotoBase = !piece.imagen_path || remoteFailed;

  return (
    <AnimatedPressable onPress={() => onPress(piece)} style={s.card}>
      <ImageBackground
        source={usePhotoBase ? localCoverFor(piece) : undefined}
        style={s.image}
        imageStyle={{ borderRadius: Radius.lg }}
      >
        {!usePhotoBase && (
          <LinearGradient
            colors={[PILLAR_GRADIENTS.mind.start, PILLAR_GRADIENTS.mind.end]}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
          />
        )}
        {remoteUri && (
          <ExpoImage
            source={{ uri: remoteUri }}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
            onError={() => { setRemoteUri(null); setRemoteFailed(true); }}
          />
        )}
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
