/**
 * Sprint Audio Mente — Player de audio del pilar Mente.
 *
 * Portada full-bleed + título + controles (play/pause, scrubber con seek,
 * ±15s, transcurrido/restante). Reproducción en background + controles en
 * pantalla bloqueada (setActiveForLockScreen — MediaSession/NowPlaying de
 * expo-audio 1.1). Suena aunque el switch de silencio esté activo
 * (playsInSilentMode) y NO se mezcla con otro audio (doNotMix).
 *
 * expo-audio se importa PEREZOSO (doctrina "nativos siempre lazy require"):
 * un binario viejo sin el módulo muestra aviso de actualización, no crashea.
 * Progreso por pieza persistido (retoma donde quedó). Al completar:
 * mind_sessions + electrón (logAudioSession).
 *
 * Piezas Pro con usuario Base: la edge function responde 403 → upsell a
 * /paywall (este sprint no construye pantalla de compra nueva).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, ImageBackground, PanResponder, StyleSheet, View,
  type ImageSourcePropType,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  fetchAudioPieces, getAudioUrl, getSavedPosition, savePosition, clearPosition,
  logAudioSession, type AudioPiece,
} from '@/src/services/mente-audio-service';
import { localCoverFor, resolveCoverSource } from '@/src/components/mente/audio-cover';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';

const MIND_PURPLE = CATEGORY_COLORS.mind;

type ExpoAudio = typeof import('expo-audio');
type AudioPlayer = import('expo-audio').AudioPlayer;

const CATEGORY_LABEL: Record<AudioPiece['categoria'], string> = {
  meditacion: 'MEDITACIÓN',
  respiracion: 'RESPIRACIÓN',
  descanso: 'DESCANSO',
};

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function MenteAudioPlayerScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  useKeepAwake();

  const [piece, setPiece] = useState<AudioPiece | null>(null);
  const [cover, setCover] = useState<ImageSourcePropType | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [completed, setCompleted] = useState(false);

  const playerRef = useRef<AudioPlayer | null>(null);
  const audioModRef = useRef<ExpoAudio | null>(null);
  const pieceRef = useRef<AudioPiece | null>(null);
  const finishedRef = useRef(false);
  const lastSaveRef = useRef(0);
  const positionRef = useRef(0);
  const scrubberWidthRef = useRef(1);
  const scrubbingRef = useRef(false);

  // ── Carga: pieza → URL firmada (gate server-side) → player ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) { router.back(); return; }
      const pieces = await fetchAudioPieces();
      const found = pieces.find(p => p.slug === slug) ?? null;
      if (cancelled) return;
      if (!found) {
        Alert.alert('No disponible', 'Esta pieza no está disponible por ahora.');
        router.back();
        return;
      }
      setPiece(found);
      pieceRef.current = found;
      setDuration(found.duracion_seg);
      setCover(localCoverFor(found));
      resolveCoverSource(found).then(src => { if (!cancelled) setCover(src); });

      const urlResult = await getAudioUrl(found.slug);
      if (cancelled) return;
      if (urlResult.status === 'pro_required') {
        haptic.warning();
        router.replace('/paywall');
        return;
      }
      if (urlResult.status !== 'ok') {
        Alert.alert('Sin conexión', 'No pudimos cargar el audio. Revisa tu internet e intenta de nuevo.');
        router.back();
        return;
      }

      // Lazy require del módulo nativo (binarios viejos: fail-soft).
      let mod: ExpoAudio | null = null;
      try { mod = await import('expo-audio'); } catch { mod = null; }
      if (!mod?.createAudioPlayer) {
        Alert.alert('Actualiza ATP', 'El reproductor requiere la última versión de la app.');
        router.back();
        return;
      }
      audioModRef.current = mod;

      try {
        await mod.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
      } catch { /* modo por default */ }

      const player = mod.createAudioPlayer({ uri: urlResult.url }, { updateInterval: 500 });
      playerRef.current = player;
      player.addListener('playbackStatusUpdate', (st) => {
        if (finishedRef.current) return;
        if (!scrubbingRef.current) setCurrentTime(st.currentTime);
        positionRef.current = st.currentTime;
        if (st.duration > 0) setDuration(st.duration);
        setPlaying(st.playing);
        // Persistir progreso ~cada 5s de reproducción.
        if (st.playing && Date.now() - lastSaveRef.current > 5000) {
          lastSaveRef.current = Date.now();
          savePosition(found.slug, st.currentTime, st.duration || found.duracion_seg);
        }
        if (st.didJustFinish) {
          finishedRef.current = true;
          handleFinished(st.duration || found.duracion_seg);
        }
      });

      // Retomar donde quedó + controles de pantalla bloqueada.
      const saved = await getSavedPosition(found.slug);
      if (saved > 0) {
        try { await player.seekTo(saved); } catch { /* desde 0 */ }
        setCurrentTime(saved);
        positionRef.current = saved;
      }
      try {
        player.setActiveForLockScreen(true, {
          title: found.titulo,
          artist: 'ATP · Mente',
          albumTitle: CATEGORY_LABEL[found.categoria],
        });
      } catch { /* binarios sin NowPlaying: sigue sonando igual */ }

      player.play();
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      const player = playerRef.current;
      const p = pieceRef.current;
      if (player) {
        // Guardar posición de salida (si no terminó) y liberar.
        if (!finishedRef.current && p) {
          savePosition(p.slug, positionRef.current, p.duracion_seg);
        }
        try { player.clearLockScreenControls(); } catch { /* no-op */ }
        try { player.remove(); } catch { /* no-op */ }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const handleFinished = useCallback(async (totalSeconds: number) => {
    haptic.success();
    setPlaying(false);
    setCompleted(true);
    setCurrentTime(totalSeconds);
    const p = pieceRef.current;
    if (!p) return;
    await clearPosition(p.slug);
    if (user?.id) await logAudioSession(user.id, p, totalSeconds);
  }, [user?.id]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    haptic.light();
    if (player.playing) player.pause();
    else {
      if (completed) {
        finishedRef.current = false;
        setCompleted(false);
        player.seekTo(0).catch(() => {});
      }
      player.play();
    }
  }, [completed]);

  const skip = useCallback((delta: number) => {
    const player = playerRef.current;
    if (!player) return;
    haptic.light();
    const target = Math.min(Math.max(0, positionRef.current + delta), duration);
    player.seekTo(target).catch(() => {});
    setCurrentTime(target);
    positionRef.current = target;
  }, [duration]);

  const seekToRatio = useCallback((ratio: number) => {
    const player = playerRef.current;
    const target = Math.min(Math.max(0, ratio), 1) * duration;
    setCurrentTime(target);
    positionRef.current = target;
    if (player) player.seekTo(target).catch(() => {});
  }, [duration]);

  // Scrubber: tap + drag (sin dependencia nativa de slider).
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        scrubbingRef.current = true;
        seekToRatio(evt.nativeEvent.locationX / scrubberWidthRef.current);
      },
      onPanResponderMove: (evt) => {
        seekToRatio(evt.nativeEvent.locationX / scrubberWidthRef.current);
      },
      onPanResponderRelease: () => { scrubbingRef.current = false; },
      onPanResponderTerminate: () => { scrubbingRef.current = false; },
    }),
  ).current;

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const catColor = piece?.categoria === 'respiracion' ? '#60a5fa'
    : piece?.categoria === 'descanso' ? '#818cf8' : MIND_PURPLE;

  return (
    <View style={s.screen}>
      {cover && (
        <ImageBackground source={cover} style={StyleSheet.absoluteFill} resizeMode="cover">
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.92)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      )}

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable style={s.backBtn} onPress={() => { haptic.light(); router.back(); }}>
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </AnimatedPressable>
      </View>

      <View style={{ flex: 1 }} />

      {/* Info + controles */}
      <Animated.View entering={FadeInUp.duration(400)} style={[s.bottom, { paddingBottom: insets.bottom + 28 }]}>
        {piece && (
          <>
            <View style={[s.catPill, { backgroundColor: withOpacity(catColor, 0.18), borderColor: withOpacity(catColor, 0.45) }]}>
              <EliteText style={[s.catPillText, { color: catColor }]}>{CATEGORY_LABEL[piece.categoria]}</EliteText>
            </View>
            <EliteText style={s.title}>{piece.titulo}</EliteText>
            {!!piece.subtitulo && <EliteText style={s.subtitle}>{piece.subtitulo}</EliteText>}
          </>
        )}

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={MIND_PURPLE} />
            <EliteText style={s.loadingText}>Preparando tu sesión…</EliteText>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
            {/* Scrubber */}
            <View
              style={s.scrubberHit}
              onLayout={(e) => { scrubberWidthRef.current = Math.max(1, e.nativeEvent.layout.width); }}
              {...panResponder.panHandlers}
            >
              <View style={s.track}>
                <View style={[s.trackFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={[s.thumb, { left: `${progress * 100}%` }]} />
            </View>
            <View style={s.timeRow}>
              <EliteText style={s.timeText}>{fmt(currentTime)}</EliteText>
              <EliteText style={s.timeText}>-{fmt(Math.max(0, duration - currentTime))}</EliteText>
            </View>

            {/* Controles */}
            <View style={s.controls}>
              <AnimatedPressable style={s.skipBtn} onPress={() => skip(-15)}>
                <Ionicons name="play-back-outline" size={22} color="#ccc" />
                <EliteText style={s.skipText}>15</EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.playBtn} onPress={togglePlay}>
                <Ionicons
                  name={completed ? 'refresh' : playing ? 'pause' : 'play'}
                  size={34}
                  color="#000"
                  style={!playing && !completed ? { marginLeft: 3 } : undefined}
                />
              </AnimatedPressable>
              <AnimatedPressable style={s.skipBtn} onPress={() => skip(15)}>
                <Ionicons name="play-forward-outline" size={22} color="#ccc" />
                <EliteText style={s.skipText}>15</EliteText>
              </AnimatedPressable>
            </View>

            {completed && (
              <EliteText style={s.completedText}>Sesión completada · registrada en tu día ✓</EliteText>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', paddingHorizontal: Spacing.sm },
  backBtn: { padding: 10 },
  bottom: { paddingHorizontal: Spacing.lg },
  catPill: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  catPillText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2 },
  title: { fontSize: 30, fontFamily: Fonts.bold, color: '#fff', lineHeight: 37 },
  subtitle: { fontSize: FontSizes.md, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  loadingText: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#888', marginTop: 12 },
  scrubberHit: { height: 36, justifyContent: 'center', marginTop: Spacing.lg },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: ATP_BRAND.lime, borderRadius: 2 },
  thumb: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#fff', marginLeft: -7, top: 11,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timeText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.6)' },
  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 36, marginTop: Spacing.lg,
  },
  playBtn: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtn: { alignItems: 'center', padding: 8 },
  skipText: { fontSize: 9, fontFamily: Fonts.bold, color: '#999', marginTop: -2 },
  completedText: {
    fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime,
    textAlign: 'center', marginTop: Spacing.md,
  },
});
