/**
 * Onboarding — Pantalla de bienvenida con 3 slides horizontales premium.
 *
 * Slide 1: Logo ATP grande
 * Slide 2: Timeline con IA
 * Slide 3: Resultados medibles
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
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS } from '@/src/constants/brand';

const { width } = Dimensions.get('window');

type SlideData = {
  type: 'logo' | 'icon';
  icon?: string;
  title: string;
  subtitle: string;
};

const SLIDES: SlideData[] = [
  {
    type: 'logo',
    title: 'Tu sistema operativo\nde rendimiento',
    subtitle: '142 protocolos científicos. Una app inteligente.\nUn sistema que funciona.',
  },
  {
    type: 'icon',
    icon: 'flash-outline',
    title: 'Tu día diseñado por\ninteligencia artificial',
    subtitle: 'Quiz → Protocolo → Timeline personalizado.\nNo piensas, solo sigues.',
  },
  {
    type: 'icon',
    icon: 'analytics-outline',
    title: 'Resultados medibles\nsemana a semana',
    subtitle: 'Score de salud. Edad biológica. Labs con IA.\nTodo en un lugar.',
  },
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

  const renderSlide = useCallback(({ item, index }: { item: SlideData; index: number }) => (
    <View style={styles.slide}>
      <Animated.View entering={FadeInUp.delay(index * 100).duration(500)} style={styles.slideContent}>
        {/* Slide 1: Logo ATP texto grande */}
        {item.type === 'logo' ? (
          <View style={styles.logoContainer}>
            <EliteText style={styles.logoATP}>ATP</EliteText>
            <EliteText style={styles.logoSub}>ADENOSINE TRIPHOSPHATE</EliteText>
          </View>
        ) : (
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon as any} size={40} color={ATP_BRAND.lime} />
          </View>
        )}
        <EliteText style={styles.slideTitle}>{item.title}</EliteText>
        <EliteText style={styles.slideDesc}>{item.subtitle}</EliteText>
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
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Botones SIEMPRE visibles */}
      <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.buttonsContainer}>
        <AnimatedPressable
          style={styles.primaryBtn}
          onPress={() => { haptic.medium(); router.push('/register'); }}
        >
          <EliteText style={styles.primaryBtnText}>CREAR CUENTA GRATIS</EliteText>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.secondaryBtn}
          onPress={() => { haptic.light(); router.push('/login'); }}
        >
          <EliteText style={styles.secondaryBtnText}>Ya tengo cuenta</EliteText>
        </AnimatedPressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  list: { flex: 1 },
  slide: { width, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  slideContent: { alignItems: 'center' },

  // Logo ATP (slide 1)
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoATP: {
    fontSize: 64,
    fontFamily: Fonts.extraBold,
    color: ATP_BRAND.lime,
    letterSpacing: 8,
  },
  logoSub: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: TEXT_COLORS.muted,
    letterSpacing: 4,
    marginTop: 8,
  },

  // Ícono circular (slides 2-3)
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168,224,42,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },

  // Textos de cada slide
  slideTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
  },
  slideDesc: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  dotActive: { backgroundColor: ATP_BRAND.lime, width: 24 },

  // Botones
  buttonsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#888',
  },
});
