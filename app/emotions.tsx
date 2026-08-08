/**
 * EMOCIONES — el módulo como módulo (MB-10 · Track H.1).
 *
 * Deja de ser una pantalla suelta colgada de HOY: un solo lugar donde viven
 * las tres partes — hacer check-in, explorar el mapa, y ver tu historia.
 *
 * Doctrina de menú (dura): cards editoriales que llevan a algún lado, CERO
 * datos duros en el hub. Un dato vive en un solo lugar (los números están en
 * Historia; el territorio, en Exploración; el momento, en el check-in).
 */
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { MenteHubCard } from '@/src/components/mente/MenteHubCard';
import { promptForDate } from '@/src/data/checkin-prompts';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Colors, Spacing, FontSizes } from '@/constants/theme';

// F12: portada MJ del check-in (única con arte dedicado hoy; explorar e
// historia van con ícono hasta que lleguen sus portadas).
const CARD_CHECKIN = require('@/assets/images/mente/cards/card_checkin.webp');

export default function EmotionsHubScreen() {
  const router = useRouter();

  return (
    <Screen>
      <StatusBar style="light" />
      <PillarHeader pillar="mind" title="Emociones" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <EliteText variant="caption" style={s.intro}>
          Nombrar lo que sientes ya es la primera parte de la ayuda.
        </EliteText>

        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <MenteHubCard
            title="¿Cómo estás?"
            subtitle={promptForDate(getLocalToday())}
            icon="heart-outline"
            imageBn={CARD_CHECKIN}
            onPress={() => router.push('/checkin')}
            ctaLabel="Hacer check-in"
            onCta={() => router.push('/checkin')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90).springify()}>
          {/* MB-28C P3: las dos puertas SÍ van a lugares distintos (check-in
              registra tu momento; esto recorre el mismo plano sin guardar
              nada) — lo que no lo comunicaba era el copy. Ahora lo dice. */}
          <MenteHubCard
            title="Explorar el territorio"
            subtitle="El mismo mapa, pero sin registrar nada: recorre las 144 palabras, acércate, construye vocabulario para los días buenos."
            icon="map-outline"
            onPress={() => router.push('/emotion-exploration')}
            ctaLabel="Solo explorar"
            onCta={() => router.push('/emotion-exploration')}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <MenteHubCard
            title="Tu historia"
            subtitle="El mosaico de lo que has sentido, tus patrones, y qué movimiento te funciona a ti."
            icon="pulse-outline"
            onPress={() => router.push('/emotion-history')}
            ctaLabel="Ver mi historia"
            onCta={() => router.push('/emotion-history')}
          />
        </Animated.View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md },
  intro: {
    color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 19,
    marginTop: Spacing.xs, marginBottom: Spacing.md, paddingHorizontal: Spacing.xs,
  },
});
