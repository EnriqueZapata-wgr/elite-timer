/**
 * Descanso — destino propio del pilar Mente (Overhaul Mente A1/A2).
 *
 * Lista el catálogo `audio_pieces` categoría `descanso` (NSDR, pausas, sueño)
 * — cero hardcode, mismas reglas que Meditación: pieza Pro visible para todos,
 * Base → upsell (/paywall), espejo del 403 de mente-audio-url.
 *
 * A3: banner fijo del pilar (StickyPillarBanner) con blur al scrollear.
 */
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { MenteHero } from '@/src/components/mente/MenteHero';
import { AudioPieceCard } from '@/src/components/mente/AudioPieceCard';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { fetchAudioPieces, type AudioPiece } from '@/src/services/mente-audio-service';
import { useSubscription } from '@/src/hooks/useSubscription';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';

// Asset editorial ya en el bundle (mismo fallback que las covers de descanso).
const HERO_DESCANSO = require('@/assets/images/agenda/sleep/sleep-01.png');

export default function DescansoScreen() {
  const router = useRouter();
  const [pieces, setPieces] = useState<AudioPiece[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isPro } = useSubscription();

  useEffect(() => {
    let alive = true;
    fetchAudioPieces().then(all => {
      if (!alive) return;
      setPieces(all.filter(p => p.categoria === 'descanso'));
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const openPiece = useCallback((piece: AudioPiece) => {
    haptic.light();
    if (piece.tier === 'pro' && !isPro) {
      router.push('/paywall');
      return;
    }
    router.push({ pathname: '/mente/player', params: { slug: piece.slug } });
  }, [isPro, router]);

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <StickyPillarBanner scrolled={scrolled} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={s.scroll}
      >
        <MenteHero
          image={HERO_DESCANSO}
          kicker="PILAR MENTE"
          title="Descanso"
          subtitle="NSDR · pausas · sueño profundo"
        />
        <View style={s.body}>
          {pieces.length > 0 ? (
            <View style={s.grid}>
              {pieces.map(piece => (
                <AudioPieceCard key={piece.slug} piece={piece} onPress={openPiece} />
              ))}
            </View>
          ) : (
            <EliteText style={s.empty}>
              {loaded
                ? 'El catálogo no cargó — revisa tu conexión e intenta de nuevo.'
                : 'Cargando catálogo…'}
            </EliteText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: Spacing.xxl },
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.sm },
  empty: { color: 'rgba(255,255,255,0.6)', fontSize: FontSizes.sm, fontFamily: Fonts.regular },
});
