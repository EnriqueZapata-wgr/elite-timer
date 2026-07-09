/**
 * AJUSTES › SALUD Y PROTOCOLO (#137) — cronotipo, protocolos, nutrición,
 * ciclo e historia clínica.
 */
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteToggle } from '@/components/elite-toggle';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { getInsightsEnabled, setInsightsEnabled } from '@/src/services/argos-nutrition-insights';
import { SectionLabel, Divider, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { CATEGORY_COLORS } from '@/src/constants/brand';

// Color del pilar ciclo (mismo que PillarHeader/habits-portal — no está en CATEGORY_COLORS)
const CYCLE_PINK = '#D4537E';

export default function SettingsSaludScreen() {
  const router = useRouter();
  // T2 NUTRICIÓN (#52): nutrition_mode reemplaza al toggle "Modo Macro" —
  // el service sincroniza macro_mode por debajo (UIs legacy siguen coherentes).
  const { isComplete, setMode } = useNutritionMode();
  // T6 NUTRICIÓN: insights post-comida de ARGOS (opt-in, default OFF)
  const [insights, setInsights] = useState(false);
  useEffect(() => { getInsightsEnabled().then(setInsights); }, []);

  function onToggleComplete(v: boolean) {
    haptic.light();
    if (!v) { setMode('simple'); return; }
    // Opt-in consciente (filosofía "guiado no prisionero")
    Alert.alert(
      'Activar modo completo',
      'Más data, más ruido: macros completos, micros, timing y calidad. Puedes volver al modo simple cuando quieras.',
      [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Activar', onPress: () => setMode('complete') },
      ],
    );
  }

  return (
    <View style={ui.screenRoot}>
      <StatusBar style="light" />
      <ScreenHeader title="Salud y protocolo" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>

        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <SectionLabel>MI PROTOCOLO</SectionLabel>
          <SettingRow
            icon="sunny-outline"
            iconColor={CATEGORY_COLORS.optimization}
            label="Mi cronotipo"
            sub="Toca para cambiar"
            onPress={() => { haptic.medium(); router.push('/quiz/chronotype' as any); }}
          />
          <SettingRow
            icon="flask-outline"
            iconColor={CATEGORY_COLORS.metrics}
            label="Protocolos activos"
            sub="Explorar y gestionar"
            onPress={() => { haptic.medium(); router.push('/protocol-explorer' as any); }}
          />
          <Divider />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <SectionLabel>NUTRICIÓN</SectionLabel>
          <EliteToggle
            label="Modo completo"
            description="Modo simple: solo score y proteína. Modo completo: todo el detalle de macros, micros, timing y calidad."
            value={isComplete}
            onValueChange={onToggleComplete}
          />
          <EliteToggle
            label="Insights de ARGOS al comer"
            description="Tras registrar una comida, ARGOS te da un insight breve en el hub de Nutrición"
            value={insights}
            onValueChange={v => { haptic.light(); setInsights(v); setInsightsEnabled(v); }}
          />
          <Divider />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).springify()}>
          <SectionLabel>CICLO</SectionLabel>
          <SettingRow
            icon="calendar-outline"
            iconColor={CYCLE_PINK}
            label="Modalidad de ciclo"
            sub="Regular, irregular o sin seguimiento"
            onPress={() => { haptic.medium(); router.push('/cycle-settings' as any); }}
          />
          <Divider />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).springify()}>
          <SectionLabel>EXPEDIENTE</SectionLabel>
          <SettingRow
            icon="medkit-outline"
            iconColor={CATEGORY_COLORS.metrics}
            label="Historia clínica"
            sub="Tu expediente de salud funcional"
            onPress={() => { haptic.medium(); router.push('/clinical-system' as any); }}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
