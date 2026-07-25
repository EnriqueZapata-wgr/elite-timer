/**
 * ExerciseClip (MB-3.5 #1 · MB-3.6 §4.5) — el clip del ejercicio como
 * PROTAGONISTA, con tratamiento de "placa anatómica".
 *
 * mp4 del bucket público fitness-clips: grande, loop infinito, autoplay, mudo,
 * cover. El fondo crema del clip MoveKit se integra deliberado al dark: el
 * contenedor lleva marco propio (borde hairline cálido + viñeta sutil en los
 * bordes) para que lea como lámina de anatomía montada, no como rectángulo
 * claro flotando. Poster → clip con fade real (220 ms ease-out), sin parpadeo.
 *
 * ⚠️ expo-video es DEP NATIVA (SDK 54; expo-av deprecado): en binarios viejos
 * el require truena → lazy require con fail-soft al poster. El swap real de
 * video llega con BUILD nativo, no por OTA.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { ELEVATION, PILLAR_GRADIENTS } from '@/src/constants/brand';

// Lazy require: si el binario no trae expo-video (OTA sobre build viejo),
// degradamos al poster sin crashear.
let videoModule: typeof import('expo-video') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  videoModule = require('expo-video');
} catch {
  videoModule = null;
}

interface Props {
  /** URL del clip mp4 (null → solo poster/fallback). */
  clipUrl: string | null;
  /** Poster estático: placeholder mientras carga y fallback sin video. */
  posterUrl: string | null;
  style?: StyleProp<ViewStyle>;
}

/** Reproductor interno — solo se monta si expo-video existe en el binario. */
function ClipPlayer({ url, onReady }: { url: string; onReady: () => void }) {
  const mod = videoModule!;
  const player = mod.useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (player.status === 'readyToPlay') onReady();
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') onReady();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  const VideoView = mod.VideoView;
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      // textureView respeta opacity en Android (SurfaceView pinta negro antes
      // del primer frame y taparía el poster placeholder).
      surfaceType="textureView"
    />
  );
}

export function ExerciseClip({ clipUrl, posterUrl, style }: Props) {
  const [clipListo, setClipListo] = useState(false);
  const puedeVideo = videoModule != null && !!clipUrl;

  // §4.5: poster → clip con fade REAL (220 ms ease-out), no un switch seco.
  const clipOpacity = useSharedValue(0);
  useEffect(() => {
    if (clipListo) {
      clipOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipListo]);
  const clipStyle = useAnimatedStyle(() => ({ opacity: clipOpacity.value }));

  return (
    <View style={[s.base, style]}>
      {/* Fallback editorial sin media (dead-hang/broad-jump): gradiente, no hueco negro. */}
      {!posterUrl && !puedeVideo && (
        <LinearGradient
          colors={[PILLAR_GRADIENTS.fitness.start, ELEVATION[1].bg]}
          style={[StyleSheet.absoluteFill, s.centro]}
        >
          <Ionicons name="barbell-outline" size={44} color="rgba(255,255,255,0.25)" />
        </LinearGradient>
      )}

      {/* Poster placeholder (queda debajo; el clip aparece encima al estar listo). */}
      {posterUrl && (
        <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      )}

      {/* El clip protagonista: loop, autoplay, mudo, cover — fade sobre el poster. */}
      {puedeVideo && (
        <Animated.View style={[StyleSheet.absoluteFill, clipStyle]}>
          <ClipPlayer url={clipUrl!} onReady={() => setClipListo(true)} />
        </Animated.View>
      )}

      {/* §4.5 Placa anatómica: viñeta sutil en los 4 bordes — el crema del clip
          queda "montado" en el dark de forma deliberada, no flotando. */}
      {(posterUrl || puedeVideo) && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
            style={s.vignetteTop}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']}
            style={s.vignetteBottom}
          />
          <View style={s.marco} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: ELEVATION[1].bg },
  centro: { alignItems: 'center', justifyContent: 'center' },
  // Placa anatómica: marco hairline cálido sobre el clip (bordes redondeados
  // los pone el contenedor padre vía overflow hidden).
  marco: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  vignetteTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 44 },
  vignetteBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 44 },
});
