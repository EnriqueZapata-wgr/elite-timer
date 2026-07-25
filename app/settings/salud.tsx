/**
 * AJUSTES › SALUD Y PROTOCOLO (#137) — cronotipo, protocolos, fitness,
 * nutrición, ciclo e historia clínica.
 */
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { useEffect, useState } from 'react';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { EliteToggle } from '@/components/elite-toggle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { getInsightsEnabled, setInsightsEnabled } from '@/src/services/argos-nutrition-insights';
import { getFitnessLevel, setFitnessLevel } from '@/src/services/fitness/fitness-profile-service';
import { NIVELES_USUARIO, type NivelUsuario } from '@/src/constants/exercise-matrix';
import { SectionLabel, Divider, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT, ELEVATION, CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';
import { Fonts, Spacing, Radius } from '@/constants/theme';

const NIVEL_LABELS: Record<NivelUsuario, string> = {
  principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', atleta: 'Atleta',
};

// Color del pilar ciclo (mismo que PillarHeader/habits-portal — no está en CATEGORY_COLORS)
const CYCLE_PINK = '#D4537E';

export default function SettingsSaludScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-3.6 §1.3: nivel de fitness editable desde Ajustes (vive en profiles.fitness_level).
  const [nivel, setNivel] = useState<NivelUsuario | null>(null);
  useEffect(() => {
    if (user) getFitnessLevel(user.id).then(setNivel);
  }, [user]);
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
            onPress={() => { haptic.medium(); router.push('/quiz/chronotype'); }}
          />
          <SettingRow
            icon="flask-outline"
            iconColor={CATEGORY_COLORS.metrics}
            label="Protocolos activos"
            sub="Explorar y gestionar"
            onPress={() => { haptic.medium(); router.push('/protocol-explorer'); }}
          />
          <Divider />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(110).springify()}>
          <SectionLabel>FITNESS</SectionLabel>
          <View style={fitnessStyles.nivelBox}>
            <EliteText variant="caption" style={fitnessStyles.nivelHint}>
              Nivel de entrenamiento — define el volumen y los ejercicios que el generador te prescribe.
            </EliteText>
            <View style={fitnessStyles.nivelRow}>
              {NIVELES_USUARIO.map((n) => (
                <AnimatedPressable
                  key={n}
                  onPress={() => {
                    if (!user) return;
                    haptic.light();
                    setNivel(n);
                    setFitnessLevel(user.id, n);
                  }}
                  style={[fitnessStyles.nivelChip, nivel === n && fitnessStyles.nivelChipActivo]}
                >
                  <EliteText style={[fitnessStyles.nivelChipText, nivel === n && fitnessStyles.nivelChipTextActivo]}>
                    {NIVEL_LABELS[n]}
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
          </View>
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
            onPress={() => { haptic.medium(); router.push('/cycle-settings'); }}
          />
          <Divider />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).springify()}>
          <SectionLabel>EXPEDIENTE</SectionLabel>
          {/* Mega-Sprint B B6: /clinical-system absorbida por Salud Funcional. */}
          <SettingRow
            icon="medkit-outline"
            iconColor={CATEGORY_COLORS.metrics}
            label="Salud Funcional"
            sub="Mapa funcional, datos, síntomas y expediente"
            onPress={() => { haptic.medium(); router.push('/health-hub'); }}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const fitnessStyles = StyleSheet.create({
  nivelBox: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  nivelHint: { color: TEXT.secondary, marginBottom: Spacing.sm, lineHeight: 17 },
  nivelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nivelChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  nivelChipActivo: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    borderColor: ATP_BRAND.lime,
  },
  nivelChipText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: 12 },
  nivelChipTextActivo: { color: ATP_BRAND.lime },
});
