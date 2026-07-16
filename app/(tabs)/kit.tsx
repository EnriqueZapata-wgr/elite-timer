/**
 * Mi ATP — portal de navegación con 3 frentes top-level (#tabs-redesign V1.3 + hotfix-ux).
 *
 *   Mi ATP
 *   ├── HISTORIA CLÍNICA → /health-hub (expediente vivo)
 *   ├── HÁBITOS          → /habits-portal (práctica diaria)
 *   └── COMUNIDAD        → /comunidad/ranking (hub social: ranking/amigos/perfiles)
 *
 * Rediseño editorial: cards FULL (EditorialCard size="pillar"). La card "ATP MI SALUD"
 * se retiró (su acceso vive dentro de Historia Clínica / health-hub). La ruta sigue siendo /kit.
 * Sin imágenes B/N aún → EditorialCard cae a placeholder de gradient (assets pendientes).
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

const PILLARS = [
  {
    cardKey: 'kit_historia',
    icon: '📋',
    title: 'SALUD FUNCIONAL',
    subtitle: 'Diagnóstico · datos · evaluaciones · síntomas',
    message: 'Tu expediente vivo',
    gradient: ['#1ABC9C', '#16A085'] as [string, string],
    route: '/health-hub',
    imageBn: require('@/assets/images/pillars/historia-clinica.png'),
  },
  {
    cardKey: 'kit_habitos',
    icon: '🌅',
    title: 'HÁBITOS FUNCIONALES',
    subtitle: 'Nutrición, fitness, sueño, ayuno',
    message: 'Lo que defines a diario',
    gradient: ['#A8E02A', '#1ABC9C'] as [string, string],
    route: '/habits-portal',
    imageBn: require('@/assets/images/pillars/habitos.png'),
  },
  // hotfix-ux FIX 1: entry point del hub COMUNIDAD (bloqueador #3). No existe app/comunidad/index.tsx;
  // el hub de facto es /comunidad/ranking (desde ahí se llega a Amigos por el header y a perfiles por
  // cada fila).
  {
    cardKey: 'kit_comunidad',
    icon: '🤝',
    title: 'COMUNIDAD ATP',
    subtitle: 'Ranking · Amigos · Tribu',
    message: 'Comunidad, no competencia',
    gradient: ['#7F77DD', '#5B9BD5'] as [string, string],
    route: '/comunidad/ranking',
    imageBn: require('@/assets/images/pillars/comunidad.png'),
  },
];

export default function KitScreen() {
  const router = useRouter();

  return (
    <TabScreen>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.header}>
          <Text style={s.subtitleGreen}>TU ECOSISTEMA</Text>
          <Text style={s.title}>Mi ATP</Text>
        </Animated.View>

        {/* 2 frentes FULL */}
        {PILLARS.map((p, idx) => (
          <Animated.View key={p.cardKey} entering={FadeInUp.delay(100 + idx * 60).springify()}>
            <EditorialCard
              cardKey={p.cardKey}
              size="pillar"
              icon={p.icon}
              title={p.title}
              subtitle={p.subtitle}
              message={p.message}
              gradient={p.gradient}
              imageBn={p.imageBn}
              onTap={() => { haptic.medium(); router.push(p.route as any); }}
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
  subtitleGreen: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: '#a8e02a', letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, color: '#fff', letterSpacing: 2, marginTop: 2 },
});
