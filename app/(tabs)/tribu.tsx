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
import { ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
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
  // MB-31B: migrada — el marco al tema; las cards editoriales quedan oscuras
  // en los dos modos (son la ventana, no el marco) y sus degradados son
  // identidad de sección. En claro el acento de texto es el teal calibrado.
  const { kind, tokens } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : tokens.tealTexto;

  return (
    <TabScreen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.header}>
          <EliteText style={[s.eyebrow, { color: acento }]}>NO ESTÁS SOLO</EliteText>
          <EliteText style={[s.title, { color: tokens.texto }]}>TRIBU</EliteText>
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
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 2 },
});
