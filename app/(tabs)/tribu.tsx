/**
 * Tab TRIBU (MB-19 PIEZA 4) — la casa de la comunidad.
 *
 * Antes se llegaba por una card dentro de Mi ATP, que este run convirtió en la
 * sala de apps. La comunidad va a crecer y merece puerta propia.
 *
 * Este run le da la casa, no la amuebla: dos puertas a lo que ya existe.
 * Ánimo y Buscar siguen colgando de Amigos, que es donde ya vivían.
 */
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

const PUERTAS = [
  {
    key: 'ranking',
    icon: '🏅',
    title: 'RANKING',
    subtitle: 'Comunidad, no competencia. Celebramos la constancia.',
    gradient: ['#7F77DD', '#5B9BD5'] as [string, string],
    route: '/comunidad/ranking' as const,
    image: require('@/assets/images/pillars/comunidad.webp'),
  },
  {
    key: 'amigos',
    icon: '🤝',
    title: 'AMIGOS',
    subtitle: 'Tu gente, su ánimo y sus perfiles',
    gradient: ['#5B9BD5', '#1ABC9C'] as [string, string],
    route: '/comunidad/amigos' as const,
    image: require('@/assets/images/pillars/comunidad-tribu.webp'),
  },
];

export default function TribuTab() {
  const router = useRouter();

  return (
    <TabScreen>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.header}>
          <EliteText style={s.eyebrow}>NO ESTÁS SOLO</EliteText>
          <EliteText style={s.title}>TRIBU</EliteText>
        </Animated.View>

        {PUERTAS.map((p, i) => (
          <Animated.View key={p.key} entering={FadeInUp.delay(90 + i * 60).springify()}>
            <EditorialCard
              cardKey={`tribu_${p.key}`}
              icon={p.icon}
              title={p.title}
              subtitle={p.subtitle}
              gradient={p.gradient}
              imageBn={p.image}
              onTap={() => { haptic.medium(); router.push(p.route); }}
            />
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </TabScreen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, color: TEXT.primary, letterSpacing: 2, marginTop: 2 },
});
