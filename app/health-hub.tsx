/**
 * Historia Clínica — frente clínico top-level (#v13c 2.3). Rediseño editorial: 8 EditorialCards en
 * columna (16:9). Imágenes pendientes de generar → placeholder gradient (con emoji) hasta tener los
 * assets en `assets/images/health-hub/` (TODO mini-sprint posterior). Rutas/subtítulos sin cambios.
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS } from '@/src/constants/brand';

type Card = { key: string; title: string; subtitle: string; icon: string; gradient: [string, string]; route: string };

const CARDS: Card[] = [
  { key: 'mi_salud', title: 'ATP MI SALUD', subtitle: 'Tu panel funcional: corazón, glucosa, biomarcadores', icon: '🫀', gradient: ['#38BDF8', '#3B82F6'], route: '/my-health' },
  { key: 'protocolos', title: 'PROTOCOLOS', subtitle: 'Configura electrones, metas y horarios', icon: '⚙️', gradient: ['#A8E02A', '#1ABC9C'], route: '/protocol-config' },
  { key: 'glucosa', title: 'GLUCOSA', subtitle: 'Registro y rangos funcionales', icon: '🩸', gradient: ['#FB923C', '#EF4444'], route: '/glucose-log' },
  { key: 'cetonas', title: 'CETONAS EN SANGRE', subtitle: 'Monitoreo de cetosis (mmol/L)', icon: '💧', gradient: ['#C084FC', '#A855F7'], route: '/ketones-log' },
  { key: 'labs', title: 'LABORATORIOS', subtitle: 'Sube y consulta tus estudios', icon: '🧪', gradient: ['#60A5FA', '#3B82F6'], route: '/edad-atp/labs' },
  { key: 'biomarcadores', title: 'BIOMARCADORES', subtitle: 'Peso, composición, fuerza de agarre, medidas', icon: '📊', gradient: ['#22C55E', '#16A34A'], route: '/health-input' },
  { key: 'tests', title: 'TESTS Y EVALUACIONES', subtitle: 'Braverman · Evaluaciones funcionales', icon: '🧠', gradient: ['#C084FC', '#8B5CF6'], route: '/quizzes' },
  { key: 'cinematicas', title: 'PRUEBAS CINEMÁTICAS', subtitle: 'Plank · BOLT · Old Man · Recovery HR', icon: '🏃', gradient: ['#22D3EE', '#0EA5E9'], route: '/edad-atp/cinematic-tests-index' },
];

export default function HealthHubScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Historia Clínica" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>Tu ecosistema de salud funcional</EliteText>
        </Animated.View>

        {CARDS.map((c, idx) => (
          <Animated.View key={c.key} entering={FadeInUp.delay(80 + idx * 40).springify()}>
            <EditorialCard
              cardKey={`hh_${c.key}`} icon={c.icon} title={c.title} subtitle={c.subtitle}
              gradient={c.gradient}
              onTap={() => router.push(c.route as any)}
            />
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.sm,
    marginBottom: Spacing.lg, marginTop: Spacing.xs, fontFamily: Fonts.regular,
  },
});
