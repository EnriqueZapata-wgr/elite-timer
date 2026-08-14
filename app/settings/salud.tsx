/**
 * AJUSTES › SALUD Y PROTOCOLO (#137) — cronotipo, protocolos, fitness,
 * nutrición, ciclo e historia clínica.
 */
import { View, ScrollView, StyleSheet, Alert, DeviceEventEmitter } from 'react-native';
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
import { loadModoDenso, saveModoDenso, SALUD_DENSO_EVENT } from '@/src/services/salud-denso-store';
import { getFitnessLevel, setFitnessLevel } from '@/src/services/fitness/fitness-profile-service';
import { NIVELES_USUARIO, type NivelUsuario } from '@/src/constants/exercise-matrix';
import { SectionLabel, Divider, SettingRow, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { Fonts, Spacing, Radius } from '@/constants/theme';

const NIVEL_LABELS: Record<NivelUsuario, string> = {
  principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', atleta: 'Atleta',
};

// Color del pilar ciclo (mismo que PillarHeader/habits-portal — no está en CATEGORY_COLORS)
const CYCLE_PINK = '#D4537E';

export default function SettingsSaludScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B: pantalla migrada — chips de nivel y superficies del tema.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
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
  // MB-19: modo denso de SALUD (default OFF — la versión curada recibe a todos).
  const [modoDenso, setModoDenso] = useState(false);
  useEffect(() => { loadModoDenso().then(setModoDenso); }, []);

  function onToggleDenso(v: boolean) {
    haptic.light();
    setModoDenso(v);
    saveModoDenso(v);
    // El hub puede estar montado detrás: que se entere sin remontarse.
    DeviceEventEmitter.emit(SALUD_DENSO_EVENT, v);
  }

  function onToggleComplete(v: boolean) {
    haptic.light();
    if (!v) { setMode('simple'); return; }
    // Opt-in consciente (filosofía "guiado no prisionero"). MB-28A P1: desde
    // este run el modo lo respetan LAS TRES pantallas de registro (foto,
    // texto y guardados), así que el copy vuelve a prometer todo lo que hace.
    Alert.alert(
      'Activar modo completo',
      'Verás calorías y macros al registrar por foto, texto o guardados, con revisión antes de guardar. Se abren todas las secciones del hub (recetas, suplementos, glucosa, escáner) y el score con micros. Puedes volver al modo simple cuando quieras.',
      [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Activar', onPress: () => setMode('complete') },
      ],
    );
  }

  return (
    <ThemeReady>
    <View style={[ui.screenRoot, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
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
              Nivel de entrenamiento: define el volumen y los ejercicios que el generador te prescribe.
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
                  style={[
                    fitnessStyles.nivelChip,
                    !dark && { backgroundColor: tokens.hundido, borderColor: tokens.borde },
                    nivel === n && (dark ? fitnessStyles.nivelChipActivo : { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }),
                  ]}
                >
                  <EliteText
                    style={[
                      fitnessStyles.nivelChipText,
                      { color: tokens.textoSecundario },
                      nivel === n && { color: dark ? ATP_BRAND.lime : tokens.textoSobreLima },
                    ]}
                  >
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
          {/* MB-23 P4.3: UN concepto en toda la app — simple contra completo.
              MB-28A P1: las tres pantallas de registro ya respetan el modo,
              así que el copy vuelve a prometer todo lo que hace. */}
          <EliteToggle
            label="Modo completo"
            description="Simple: registro directo con la proteína como único número. Completo: calorías y macros visibles y ajustables al registrar, todas las secciones del hub y score con micros."
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
            onPress={() => { haptic.medium(); router.push('/salud'); }}
          />
          <Divider />
          {/* MB-19 PIEZA 3: la válvula de escape del rediseño. SALUD se curó a
              cuatro puertas; quien ya sabe lo que busca puede pedir la lista
              completa y saltárselas. Garmin curó su app sin esta salida y sus
              veteranos la rechazaron por costarles más clics.
              MB-23 P4.3: se llamaba "Modo denso" — mismo concepto que
              nutrición, mismo nombre: simple contra completo. */}
          <EliteToggle
            label="Modo completo"
            description="Simple: Salud te recibe con cuatro puertas. Completo: todas sus secciones en una sola lista."
            value={modoDenso}
            onValueChange={onToggleDenso}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </ThemeReady>
  );
}

const fitnessStyles = StyleSheet.create({
  nivelBox: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  nivelHint: { marginBottom: Spacing.sm, lineHeight: 17 },
  nivelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nivelChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  nivelChipActivo: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    borderColor: ATP_BRAND.lime,
  },
  nivelChipText: { fontFamily: Fonts.semiBold, fontSize: 12 },
});
