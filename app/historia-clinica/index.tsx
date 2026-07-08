/**
 * Historia Clínica — índice de cuestionarios funcionales (T3/HC5).
 * Una card por cuestionario; muestra ✓ cuando ya fue respondido. Tap → /historia-clinica/[category].
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Screen } from '@/src/components/ui/Screen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { HC_QUESTIONNAIRES } from '@/src/constants/historia-clinica-questionnaires';
import { loadHistoriaClinica, completedCategories } from '@/src/services/historia-clinica-service';

export default function HistoriaClinicaIndex() {
  const router = useRouter();
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    loadHistoriaClinica(user.id).then(d => setDone(completedCategories(d)));
  }, [user?.id]));

  const total = HC_QUESTIONNAIRES.length;
  const completed = done.size;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <PillarHeader pillar="health" title="Historia Clínica" />

        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText variant="caption" style={s.subtitle}>
            {completed} de {total} cuestionarios completados · tu base para personalizar ARGOS
          </EliteText>
        </Animated.View>

        {HC_QUESTIONNAIRES.map((q, idx) => {
          const isDone = done.has(q.id);
          return (
            <Animated.View key={q.id} entering={FadeInUp.delay(100 + idx * 50).springify()}>
              <AnimatedPressable onPress={() => { haptic.medium(); router.push(`/historia-clinica/${q.id}` as any); }}>
                <GradientCard color={q.color} style={s.card}>
                  <View style={s.cardContent}>
                    <View style={[s.iconWrap, { backgroundColor: withOpacity(q.color, 0.15) }]}>
                      <Ionicons name={q.icon as any} size={22} color={q.color} />
                    </View>
                    <View style={s.cardInfo}>
                      <EliteText style={s.cardName}>{q.title}</EliteText>
                      <EliteText variant="caption" style={s.cardSub}>{q.blurb}</EliteText>
                    </View>
                    {isDone
                      ? <Ionicons name="checkmark-circle" size={22} color={q.color} />
                      : <Ionicons name="chevron-forward" size={18} color={TEXT_COLORS.secondary} />}
                  </View>
                </GradientCard>
              </AnimatedPressable>
            </Animated.View>
          );
        })}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.lg, marginTop: Spacing.xs },
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT_COLORS.primary, marginBottom: 2 },
  cardSub: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs },
});
