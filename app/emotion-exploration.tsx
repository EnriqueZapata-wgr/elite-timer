/**
 * Exploración — el mapa espiral, FUERA del check-in (MB-10 · Track D).
 *
 * El espiral de MB-9 no se tira: cambia de lugar y de propósito. Esto es para
 * días buenos: recorrer el territorio, construir vocabulario, ver la
 * navegación como geometría. Como puerta de entrada era un examen (device
 * test); como territorio para explorar, brilla.
 *
 * Tocar una emoción enseña su palabra, su descripción y dónde vive
 * (núcleo › familia). Si quieres registrarla, el check-in se abre con ella
 * puesta — mismo aterrizaje que todas las puertas, cero flujos paralelos.
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
import { EmotionMap2D, type EmotionMapHandle } from '@/src/components/checkin/EmotionMap2D';
import type { Emotion } from '@/src/data/emotions-library';
import { colorAtPoint, normX, normY } from '@/src/services/emotion-map-core';
import { getWheelLayout, findEmotionSector } from '@/src/services/emotion-wheel-core';
import { WHEEL_CORES, FAMILY_LABELS } from '@/src/data/emotion-wheel-config';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, withOpacity } from '@/src/constants/brand';

export default function EmotionExplorationScreen() {
  const router = useRouter();
  const mapRef = useRef<EmotionMapHandle>(null);
  const [selected, setSelected] = useState<Emotion | null>(null);

  const color = selected
    ? colorAtPoint(normX(selected.quadrant, selected.intensity), normY(selected.energy))
    : TEXT_COLORS.secondary;

  // Vocabulario del módulo: dónde vive la palabra (núcleo › familia).
  const home = selected ? findEmotionSector(getWheelLayout(), selected.id) : null;
  const coreLabel = home ? WHEEL_CORES.find((c) => c.key === home.core)?.label : null;
  const familyLabel = home?.family ? FAMILY_LABELS[home.family] : null;

  const handlePress = (e: Emotion) => {
    setSelected((prev) => (prev?.id === e.id ? null : e));
    mapRef.current?.centerOnEmotion(e.id, { zoom: 0.9 });
  };

  return (
    <Screen>
      {selected && (
        <View style={styles.ambient} pointerEvents="none">
          <LinearGradient colors={[withOpacity(color, 0.22), 'transparent']} style={{ flex: 1 }} />
        </View>
      )}
      <PillarHeader pillar="mind" title="Explorar el territorio" onBack={() => router.back()} />

      <View style={styles.headerRow}>
        <EliteText variant="caption" style={styles.hint}>
          144 palabras para lo que sientes. Recorre, acerca, toca una.
        </EliteText>
        <Pressable onPress={() => { haptic.light(); mapRef.current?.zoomOut(); }} style={styles.tool} hitSlop={8}>
          <Ionicons name="contract-outline" size={18} color={TEXT_COLORS.secondary} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <EmotionMap2D
          ref={mapRef}
          selectedIds={selected ? [selected.id] : []}
          onEmotionPress={handlePress}
        />
      </View>

      {/* La palabra, su descripción y dónde vive — vocabulario, no examen. */}
      {selected && (
        <Animated.View
          entering={SlideInDown.duration(260)}
          exiting={SlideOutDown.duration(200)}
          style={styles.sheet}
        >
          <View style={styles.sheetHeader}>
            <EliteText style={[styles.name, { color }]}>{selected.label}</EliteText>
            <Pressable onPress={() => setSelected(null)} hitSlop={8}>
              <Ionicons name="close" size={20} color={TEXT_COLORS.secondary} />
            </Pressable>
          </View>
          {coreLabel && familyLabel && (
            <Animated.View entering={FadeIn.duration(200)}>
              <EliteText variant="caption" style={styles.home}>
                Vive en {coreLabel} › {familyLabel}
              </EliteText>
            </Animated.View>
          )}
          <EliteText variant="body" style={styles.desc}>{selected.description}</EliteText>
          <View style={styles.actions}>
            <Pressable onPress={() => setSelected(null)} style={styles.stayLink}>
              <EliteText variant="caption" style={styles.stayText}>Seguir explorando</EliteText>
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
  hint: { color: Colors.textSecondary, fontSize: FontSizes.sm, flex: 1 },
  tool: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACES.card, borderWidth: 0.5, borderColor: SURFACES.border,
  },

  sheet: {
    backgroundColor: SURFACES.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 0.5, borderColor: SURFACES.border,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  home: { color: Colors.textSecondary, fontSize: FontSizes.xs, letterSpacing: 1, marginTop: 2 },
  desc: { color: Colors.textPrimary, fontSize: FontSizes.md, lineHeight: 22, marginTop: Spacing.xs },
  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.md, marginTop: Spacing.md,
  },
  stayLink: { paddingVertical: Spacing.sm },
  stayText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  cta: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: Radius.pill },
  ctaText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.sm, letterSpacing: 1.5 },
});
