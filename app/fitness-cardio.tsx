/**
 * Fitness Cardio — Pantalla dedicada a las 4 disciplinas de cardio.
 *
 * Sale del fitness-hub: 4 disciplinas como puertas a registrar + sus PRs
 * por distancia (MB-3.7 §1.4: el hub es navegación — la última sesión vive
 * en log-cardio como prefill).
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';
import { autoSyncSiActiva } from '@/src/services/fitness/health-import-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SEMANTIC, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import {
  getCardioRecordsByDiscipline,
  formatDuration,
  type CardioDiscipline,
  type CardioRecord,
} from '@/src/services/fitness-service';

const CARDIO_BLUE = SEMANTIC.info; // MB-3.6 §4.2: azul de marca, no un 5º azul
const CARDIO_GRADIENT = { start: withOpacity(SEMANTIC.info, 0.1), end: withOpacity(SEMANTIC.info, 0.02) };

const DISCIPLINES: { key: CardioDiscipline; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'running',  name: 'Correr',   icon: 'walk-outline' },
  { key: 'cycling',  name: 'Ciclismo', icon: 'bicycle-outline' },
  { key: 'swimming', name: 'Natación', icon: 'water-outline' },
  { key: 'rowing',   name: 'Remo',     icon: 'boat-outline' },
];

export default function FitnessCardioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recordsByDiscipline, setRecordsByDiscipline] = useState<Record<CardioDiscipline, CardioRecord[]>>({
    running: [], cycling: [], swimming: [], rowing: [], other: [],
  });

  const cargar = useCallback(() => {
    getCardioRecordsByDiscipline().then(setRecordsByDiscipline);
  }, []);

  useFocusEffect(useCallback(() => {
    cargar();
    // MB-3.6 §3.2: auto-sync SOLO si el usuario activó el opt-in en Importar.
    if (user) {
      autoSyncSiActiva(user.id).then((n) => { if (n > 0) cargar(); }).catch(() => {});
    }
  }, [cargar, user]));

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Cardio" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <SectionTitle>DISCIPLINAS</SectionTitle>

        {DISCIPLINES.map((d, i) => {
          const records = recordsByDiscipline[d.key] ?? [];

          return (
            <Animated.View key={d.key} entering={FadeInUp.delay(50 + i * 40).springify()}>
              <AnimatedPressable
                onPress={() => { haptic.light(); router.push({ pathname: '/log-cardio', params: { discipline: d.key } }); }}
                style={s.cardWrap}
              >
                <GradientCard gradient={CARDIO_GRADIENT} accentColor={CARDIO_BLUE} accentPosition="left">
                  <View style={s.disciplineHeader}>
                    <Ionicons name={d.icon} size={22} color={CARDIO_BLUE} />
                    <EliteText style={s.disciplineName}>{d.name}</EliteText>
                  </View>

                  {/* MB-3.7 §1.4: "Última: …" RETIRADA — el hub es navegación
                      (cero datos); ese dato vive en log-cardio como prefill
                      "la última vez… tocar para repetir", donde SÍ se usa.
                      Los PRs se quedan: no viven en ningún otro lugar. */}
                  {records.length > 0 && (
                    <View style={s.prsRow}>
                      {records.slice(0, 5).map(pr => (
                        <View key={pr.id} style={s.prChip}>
                          <EliteText style={s.prChipLabel}>{pr.distance_label}</EliteText>
                          <EliteText style={s.prChipValue}>{formatDuration(pr.best_time_seconds)}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}
                </GradientCard>
              </AnimatedPressable>
            </Animated.View>
          );
        })}

        {/* MB-5 Bloque 3: CTA héroe a degradado editorial (antes azul plano legacy) */}
        <View style={{ marginTop: Spacing.md }}>
          <GradientCTA
            label="REGISTRAR SESIÓN CARDIO"
            pillar="fitness"
            icon="add-circle-outline"
            onPress={() => router.push('/log-cardio')}
          />
        </View>

        {/* MB-3.6 §3.2: import desde Health Connect / HealthKit (Strava, Garmin,
            Samsung y Google Fit escriben ahí — una integración, todas las fuentes). */}
        <AnimatedPressable
          style={s.ctaButtonGhost}
          onPress={() => { haptic.light(); router.push('/cardio-import'); }}
        >
          <Ionicons name="download-outline" size={18} color={CARDIO_BLUE} />
          <EliteText style={s.ctaTextGhost}>IMPORTAR DE TU APP DE SALUD</EliteText>
        </AnimatedPressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  cardWrap: { marginBottom: Spacing.sm },
  disciplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  disciplineName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
  },
  prsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  prChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: withOpacity(SEMANTIC.info, 0.1),
    alignItems: 'center',
  },
  prChipLabel: {
    fontSize: 9,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  prChipValue: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: CARDIO_BLUE,
  },

  ctaButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: withOpacity(SEMANTIC.info, 0.35),
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  ctaTextGhost: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: CARDIO_BLUE,
    letterSpacing: 1.5,
  },
});
