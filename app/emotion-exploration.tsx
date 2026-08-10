/**
 * Exploración — recorrer el territorio, FUERA del check-in (MB-10 · Track D,
 * lienzo MB-16).
 *
 * Esto es para días buenos: recorrer el mapa, construir vocabulario, ver que
 * cada emoción vive en un lugar. Desde MB-16 el lienzo es el plano 12x12
 * (MoodPlane): mismo plano y mismo zoom que el check-in, pero sin selección
 * para registrar. Tocar una emoción enseña su palabra, su descripción y en
 * qué zona del plano vive. Si quieres registrarla, el check-in se abre con
 * ella puesta, el mismo aterrizaje que todas las puertas.
 */
import { useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { MoodPlane, type MoodPlaneHandle } from '@/src/components/checkin/MoodPlane';
import type { Emotion } from '@/src/data/emotions-library';
import { emotionCanonColor, quadrantFromCell } from '@/src/services/emotion-plane-core';
import { QUADRANT_FEEL } from '@/src/data/emotion-grid-config';
import { haptic } from '@/src/utils/haptics';
import { StatusBar } from 'expo-status-bar';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

export default function EmotionExplorationScreen() {
  const router = useRouter();
  const planeRef = useRef<MoodPlaneHandle>(null);
  const [selected, setSelected] = useState<Emotion | null>(null);
  const { kind, tokens: t } = useAppTheme();

  const color = selected
    ? emotionCanonColor(selected)
    : t.textoSecundario;

  // Dónde vive la palabra: en el plano, la zona ES el significado.
  const feel = selected ? QUADRANT_FEEL[quadrantFromCell(selected.gridCol, selected.gridRow)] : null;

  const handlePress = (e: Emotion) => {
    if (selected?.id === e.id) {
      setSelected(null);
      return;
    }
    setSelected(e);
    planeRef.current?.focusEmotion(e.id);
  };

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      {selected && (
        <View style={styles.ambient} pointerEvents="none">
          <LinearGradient colors={[withOpacity(color, 0.22), 'transparent']} style={{ flex: 1 }} />
        </View>
      )}
      <PillarHeader pillar="mind" title="Explorar el territorio" onBack={() => router.back()} />

      <View style={styles.headerRow}>
        <EliteText variant="caption" style={[styles.hint, { color: t.textoSecundario }]}>
          144 palabras para lo que sientes. Recorre, acerca, toca una.
        </EliteText>
        <Pressable onPress={() => { haptic.light(); planeRef.current?.zoomOut(); }} style={[styles.tool, { backgroundColor: t.card, borderColor: t.borde }]} hitSlop={8}>
          <Ionicons name="contract-outline" size={18} color={t.textoSecundario} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <MoodPlane
          ref={planeRef}
          selectedIds={selected ? [selected.id] : []}
          onEmotionPress={handlePress}
        />
      </View>

      {/* La palabra, su descripción y dónde vive — vocabulario, no examen. */}
      {selected && (
        <Animated.View
          entering={SlideInDown.duration(260)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { backgroundColor: t.card, borderColor: t.borde }]}
        >
          <View style={styles.sheetHeader}>
            <EliteText style={[styles.name, { color }]}>{selected.label}</EliteText>
            <Pressable onPress={() => setSelected(null)} hitSlop={8}>
              <Ionicons name="close" size={20} color={t.textoSecundario} />
            </Pressable>
          </View>
          {feel && (
            <Animated.View entering={FadeIn.duration(200)}>
              <EliteText variant="caption" style={[styles.home, { color: t.textoSecundario }]}>{feel}</EliteText>
            </Animated.View>
          )}
          <EliteText variant="body" style={[styles.desc, { color: t.texto }]}>{selected.description}</EliteText>
          <View style={styles.actions}>
            <Pressable onPress={() => setSelected(null)} style={styles.stayLink}>
              <EliteText variant="caption" style={[styles.stayText, { color: t.textoSecundario }]}>Seguir explorando</EliteText>
            </Pressable>
            <Pressable
              onPress={() => {
                haptic.medium();
                router.push({ pathname: '/checkin', params: { emotionId: selected.id, gate: 'mapa' } });
              }}
              style={[styles.cta, { backgroundColor: color }]}
            >
              <EliteText style={styles.ctaText}>ES LO QUE SIENTO</EliteText>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320, zIndex: 0 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs,
  },
  hint: { fontSize: FontSizes.sm, flex: 1 },
  tool: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5,
  },

  sheet: {
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 0.5,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  home: { fontSize: FontSizes.xs, letterSpacing: 1, marginTop: 2 },
  desc: { fontSize: FontSizes.md, lineHeight: 22, marginTop: Spacing.xs },
  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.md, marginTop: Spacing.md,
  },
  stayLink: { paddingVertical: Spacing.sm },
  stayText: { fontSize: FontSizes.sm },
  cta: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: Radius.pill },
  ctaText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.sm, letterSpacing: 1.5 },
});
