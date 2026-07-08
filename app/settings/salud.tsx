/**
 * AJUSTES › SALUD Y PROTOCOLO (#137) — cronotipo, protocolos, nutrición,
 * ciclo e historia clínica.
 */
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteToggle } from '@/components/elite-toggle';
import { useMacroMode } from '@/src/hooks/useMacroMode';
import { SectionLabel, Divider, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { CATEGORY_COLORS } from '@/src/constants/brand';

// Color del pilar ciclo (mismo que PillarHeader/habits-portal — no está en CATEGORY_COLORS)
const CYCLE_PINK = '#D4537E';

export default function SettingsSaludScreen() {
  const router = useRouter();
  const { macroMode, setMacroMode } = useMacroMode();

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
            label="Modo Macro"
            description="Muestra calorías, carbohidratos y grasa además del score"
            value={macroMode}
            onValueChange={v => { haptic.light(); setMacroMode(v); }}
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
