/**
 * Onboarding — Pantalla de bienvenida con 3 slides horizontales.
 *
 * Muestra propuesta de valor + botones de registro/login.
 */
import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

const { width } = Dimensions.get('window');

const SLIDES = [
  { icon: 'pulse-outline' as const, title: 'Tu sistema operativo\nde rendimiento', subtitle: 'Protocolos científicos. Una app inteligente.\nUn sistema que funciona.' },
  { icon: 'calendar-outline' as const, title: 'Tu día diseñado por\ninteligencia artificial', subtitle: 'Quiz → Protocolo → Timeline.\nNo piensas, solo sigues.' },
  { icon: 'analytics-outline' as const, title: 'Resultados medibles\nsemana a semana', subtitle: 'Score de salud. Edad biológica.\nLabs con IA. Todo en un lugar.' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = useCallback(({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
    <View style={styles.slide}>
      <Animated.View entering={FadeInUp.delay(index * 100).duration(500)} style={styles.slideContent}>
        <Ionicons name={item.icon} size={64} color={ATP_BRAND.lime} style={styles.icon} />
        <EliteText variant="subtitle" style={styles.title}>{item.title}</EliteText>
        <EliteText variant="body" style={styles.subtitle}>{item.subtitle}</EliteText>
      </Animated.View>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Slides */}
      <FlatList
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.list}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Botones */}
      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.buttons}>
        <AnimatedPressable
          style={styles.btnPrimary}
          onPress={() => { haptic.medium(); router.push('/register'); }}
        >
          <EliteText variant="subtitle" style={styles.btnPrimaryText}>Crear cuenta gratis</EliteText>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.btnLink}
          onPress={() => { haptic.light(); router.push('/login'); }}
        >
          <EliteText variant="body" style={styles.btnLinkText}>Ya tengo cuenta →</EliteText>
        </AnimatedPressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  list: { flex: 1 },
  slide: { width, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  slideContent: { alignItems: 'center' },
  icon: { marginBottom: Spacing.lg },
  title: {
    fontSize: FontSizes.hero,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: TEXT_COLORS.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_COLORS.muted,
  },
  dotActive: { backgroundColor: ATP_BRAND.lime, width: 24 },
  buttons: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.md },
  btnPrimary: {
    backgroundColor: ATP_BRAND.lime,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnPrimaryText: { color: TEXT_COLORS.onAccent, fontSize: FontSizes.lg },
  btnLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  btnLinkText: { color: ATP_BRAND.lime, fontSize: FontSizes.md },
});
