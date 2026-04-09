/**
 * Fitness Cardio — Pantalla dedicada a las 4 disciplinas de cardio.
 *
 * Sale del fitness-hub: muestra correr, ciclismo, natacion y remo
 * con la ultima sesion y los PRs por distancia.
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
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  getLastCardioSessions,
  getCardioRecordsByDiscipline,
  formatDuration,
  formatPace,
  type CardioDiscipline,
  type CardioSession,
  type CardioRecord,
} from '@/src/services/fitness-service';

const CARDIO_BLUE = '#38bdf8';
const CARDIO_GRADIENT = { start: 'rgba(56,189,248,0.10)', end: 'rgba(56,189,248,0.02)' };

const DISCIPLINES: { key: CardioDiscipline; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'running',  name: 'Correr',   icon: 'walk-outline' },
  { key: 'cycling',  name: 'Ciclismo', icon: 'bicycle-outline' },
  { key: 'swimming', name: 'Natación', icon: 'water-outline' },
  { key: 'rowing',   name: 'Remo',     icon: 'boat-outline' },
];

export default function FitnessCardioScreen() {
  const router = useRouter();
  const [lastByDiscipline, setLastByDiscipline] = useState<Record<CardioDiscipline, CardioSession | null>>({
    running: null, cycling: null, swimming: null, rowing: null, other: null,
  });
  const [recordsByDiscipline, setRecordsByDiscipline] = useState<Record<CardioDiscipline, CardioRecord[]>>({
    running: [], cycling: [], swimming: [], rowing: [], other: [],
  });

  useFocusEffect(useCallback(() => {
    Promise.all([getLastCardioSessions(), getCardioRecordsByDiscipline()])
      .then(([last, recs]) => {
        setLastByDiscipline(last);
        setRecordsByDiscipline(recs);
      });
  }, []));

  return (
    <Screen>
      <PillarHeader pillar="fitness" title="Cardio" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <SectionTitle>DISCIPLINAS</SectionTitle>

        {DISCIPLINES.map((d, i) => {
          const last = lastByDiscipline[d.key];
          const records = recordsByDiscipline[d.key] ?? [];

          return (
            <Animated.View key={d.key} entering={FadeInUp.delay(50 + i * 40).springify()}>
              <AnimatedPressable
                onPress={() => { haptic.light(); router.push({ pathname: '/log-cardio', params: { discipline: d.key } } as any); }}
                style={s.cardWrap}
              >
                <GradientCard gradient={CARDIO_GRADIENT} accentColor={CARDIO_BLUE} accentPosition="left">
                  <View style={s.disciplineHeader}>
                    <Ionicons name={d.icon} size={22} color={CARDIO_BLUE} />
                    <EliteText style={s.disciplineName}>{d.name}</EliteText>
                  </View>

                  {last && last.distance_meters && last.duration_seconds ? (
                    <EliteText style={s.disciplineLast}>
                      Última: {(last.distance_meters / 1000).toFixed(2)} km en {formatDuration(last.duration_seconds)}
                      {last.avg_pace_seconds_per_km ? ` · ${formatPace(last.avg_pace_seconds_per_km)}` : ''}
                    </EliteText>
                  ) : (
                    <EliteText style={s.disciplineEmpty}>Sin sesiones registradas</EliteText>
                  )}

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

        <AnimatedPressable
          style={s.ctaButton}
          onPress={() => { haptic.medium(); router.push('/log-cardio' as any); }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#000" />
          <EliteText style={s.ctaText}>REGISTRAR SESIÓN CARDIO</EliteText>
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
    color: '#fff',
  },
  disciplineLast: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#bbb',
  },
  disciplineEmpty: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(56,189,248,0.10)',
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

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: CARDIO_BLUE,
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  ctaText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1.5,
  },
});
