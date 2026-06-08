/**
 * Edad ATP — Hub de captura de datos (Sprint 2, MVP manual).
 * Muestra la CE actual + 5 cards navegables a las pantallas de captura.
 */
import { useState, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { computeCE, type CEResult } from '@/src/services/edad-atp/ce-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const CALC_THRESHOLD = 30; // % CE mínimo para habilitar "Calcular mi Edad"

type Card = {
  key: keyof CEResult['breakdown'] | 'vitals';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  route: string;
};

const CARDS: Card[] = [
  { key: 'biomarkers', icon: 'water-outline', title: 'Biomarcadores', desc: 'Labs: PhenoAge, metabólico, hormonal', route: '/edad-atp/biomarkers' },
  { key: 'composition', icon: 'barbell-outline', title: 'Composición corporal', desc: 'Peso, % grasa, músculo, FFMI', route: '/edad-atp/composition' },
  { key: 'vitals', icon: 'heart-outline', title: 'Mediciones puntuales', desc: 'Presión arterial, FC reposo, VO2max', route: '/edad-atp/vitals' },
  { key: 'questionnaires', icon: 'list-outline', title: 'Cuestionarios', desc: '10 dominios de salud funcional', route: '/edad-atp/questionnaires' },
  { key: 'cognitive', icon: 'flash-outline', title: 'Test cognitivo', desc: 'Tiempo de reacción (preview)', route: '/edad-atp/cognitive' },
];

export default function EdadAtpHub() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [ce, setCe] = useState<CEResult | null>(null);
  const prevCeRef = useRef<number | null>(null);

  useFocusEffect(useCallback(() => {
    analytics.track(ATP_EVENTS.EDAD_ATP_CAPTURE_SCREEN_VIEWED, { screen: 'hub' });
    if (user?.id) computeCE(user.id).then((r) => {
      setCe(r);
      const prev = prevCeRef.current;
      if (prev != null && prev < CALC_THRESHOLD && r.ce_integral >= CALC_THRESHOLD) {
        analytics.track(ATP_EVENTS.EDAD_ATP_CE_THRESHOLD_CROSSED, { ce: Math.round(r.ce_integral) });
      }
      prevCeRef.current = r.ce_integral;
    });
  }, [user?.id]));

  const ceValue = ce?.ce_integral ?? 0;
  const cardPct = (c: Card): number | null => {
    if (c.key === 'vitals') return null; // las vitals cuentan dentro de biomarcadores
    return ce ? Math.round(ce.breakdown[c.key]) : null;
  };

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Edad ATP" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.subtitle}>Captura de datos — MVP manual</EliteText>

        {/* CE actual */}
        <View style={styles.ceCard}>
          <EliteText variant="caption" style={styles.ceLabel}>Calidad de tu evaluación</EliteText>
          <EliteText style={styles.ceValue}>{Math.round(ceValue)}%</EliteText>
          <View style={styles.ceBarTrack}>
            <View style={[styles.ceBarFill, { width: `${Math.min(100, ceValue)}%` }]} />
          </View>
        </View>

        {CARDS.map((c) => {
          const pct = cardPct(c);
          return (
            <Pressable
              key={c.key}
              onPress={() => { haptic.medium(); router.push(c.route as any); }}
              style={styles.card}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={c.icon} size={22} color={Colors.neonGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.cardTitle}>{c.title}</EliteText>
                <EliteText variant="caption" style={styles.cardDesc}>{c.desc}</EliteText>
              </View>
              {pct != null && (
                <EliteText variant="caption" style={[styles.cardPct, pct >= 100 && { color: Colors.neonGreen }]}>{pct}%</EliteText>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </Pressable>
          );
        })}

        {ceValue >= CALC_THRESHOLD ? (
          <Pressable
            onPress={() => { haptic.success(); router.push('/edad-atp/result-preview' as any); }}
            style={styles.calcBtn}
          >
            <EliteText variant="body" style={styles.calcBtnText}>Calcular mi Edad</EliteText>
          </Pressable>
        ) : (
          <EliteText variant="caption" style={styles.needMore}>
            Necesitas más datos para calcular tu Edad ATP (mínimo {CALC_THRESHOLD}% de evaluación).
          </EliteText>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.xs },
  ceCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.lg, alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  ceLabel: { color: Colors.textSecondary, letterSpacing: 1 },
  ceValue: { color: Colors.neonGreen, fontSize: 40, fontFamily: Fonts.extraBold },
  ceBarTrack: { width: '100%', height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
  ceBarFill: { height: 6, backgroundColor: Colors.neonGreen, borderRadius: 3 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(168,224,42,0.12)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  cardDesc: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  cardPct: { color: Colors.textSecondary, fontFamily: Fonts.bold },
  calcBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  calcBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  needMore: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.md },
});
