/**
 * MetodosAtpInfo (MB-3.6 Bloque 1.1) — la teoría de los 3 métodos propietarios,
 * ahora DENTRO de la biblioteca (antes /training-methods, destino suelto).
 *
 * Tokens de brand.ts (antes todo hex crudo), molde de card del sistema,
 * entrada escalonada. El CTA lleva a registrar con ese método (log-exercise);
 * en las rutinas generadas los métodos se asignan solos por slot.
 */
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT, ELEVATION, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

const METODOS = [
  {
    id: 'method_3_5',
    name: 'Método 3-5',
    subtitle: 'Autoregulación por reps',
    color: ATP_BRAND.lime,
    icon: 'trending-up-outline' as const,
    description: 'Elige tu nivel (principiante=6 reps, intermedio=4, avanzado=2). Si logras más reps que tu objetivo, sube peso. Si logras menos, baja peso. El peso se ajusta automáticamente.',
    howItWorks: [
      'Selecciona un ejercicio y tu nivel',
      'Haz tu set con el peso actual',
      'ATP compara tus reps vs el objetivo',
      'Te dice si subir, mantener o bajar peso',
    ],
    idealFor: 'Fuerza máxima y progresión lineal',
  },
  {
    id: 'emom_auto',
    name: 'EMOM Autoajustable',
    subtitle: 'Every Minute On the Minute',
    color: SEMANTIC.info,
    icon: 'timer-outline' as const,
    description: '8×8 (principiante) o 10×10 (intermedio). Si no completas las reps en el minuto, la deuda se acumula y se paga en series adicionales al final.',
    howItWorks: [
      'Selecciona 8×8 o 10×10',
      'Cada minuto haces tus reps',
      'Si no completas, la deuda se registra',
      'Al final, pagas la deuda con series extra',
    ],
    idealFor: 'Hipertrofia + resistencia muscular',
  },
  {
    id: 'myo_reps',
    name: 'Myo Reps',
    subtitle: 'Máxima activación muscular',
    color: ATP_BRAND.teal,
    icon: 'flash-outline' as const,
    description: 'Set de activación de 20 reps + overloads de 5 reps con solo 5 segundos de descanso. Los fallos determinan cuándo ajustar el peso.',
    howItWorks: [
      'Haz 20 reps como set de activación',
      'Descansa solo 5 segundos',
      'Haz 5 reps (overload)',
      'Repite hasta que no completes las 5 reps',
      'ATP registra cuántos overloads lograste',
    ],
    idealFor: 'Hipertrofia eficiente en poco tiempo',
  },
];

export function MetodosAtpInfo() {
  const router = useRouter();

  return (
    <View style={s.wrap}>
      <EliteText style={s.intro}>
        3 métodos propietarios con autoregulación: el peso y el volumen se ajustan a lo que
        realmente hiciste. En tus rutinas generadas se asignan solos según el bloque.
      </EliteText>

      {METODOS.map((m, i) => (
        <Animated.View key={m.id} entering={FadeInUp.delay(60 + i * 50).springify()}>
          <View style={[s.card, { borderColor: withOpacity(m.color, 0.2) }]}>
            <View style={s.header}>
              <View style={[s.iconWrap, { backgroundColor: withOpacity(m.color, 0.12) }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.name, { color: m.color }]}>{m.name}</EliteText>
                <EliteText style={s.subtitle}>{m.subtitle}</EliteText>
              </View>
            </View>

            <EliteText style={s.description}>{m.description}</EliteText>

            <EliteText style={s.stepsLabel}>CÓMO FUNCIONA</EliteText>
            {m.howItWorks.map((step, idx) => (
              <View key={idx} style={s.stepRow}>
                <View style={[s.stepNum, { backgroundColor: withOpacity(m.color, 0.12) }]}>
                  <EliteText style={[s.stepNumText, { color: m.color }]}>{idx + 1}</EliteText>
                </View>
                <EliteText style={s.stepText}>{step}</EliteText>
              </View>
            ))}

            <View style={[s.idealCard, { backgroundColor: withOpacity(m.color, 0.06) }]}>
              <EliteText style={[s.idealText, { color: m.color }]}>Ideal para: {m.idealFor}</EliteText>
            </View>

            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push('/log-strength'); }}
              style={[s.cta, { borderColor: withOpacity(m.color, 0.45) }]}
            >
              <EliteText style={[s.ctaText, { color: m.color }]}>USAR ESTE MÉTODO</EliteText>
              <Ionicons name="arrow-forward" size={14} color={m.color} />
            </AnimatedPressable>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  intro: {
    color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: 13,
    lineHeight: 20, marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, borderWidth: 1,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.sm },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  name: { fontSize: 17, fontFamily: Fonts.extraBold },
  subtitle: { color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.regular, marginTop: 1 },
  description: {
    color: TEXT.primary, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 21,
    marginBottom: Spacing.md, opacity: 0.85,
  },
  stepsLabel: {
    color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 8,
  },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 6, alignItems: 'flex-start' },
  stepNum: {
    width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  stepNumText: { fontSize: 10, fontFamily: Fonts.bold },
  stepText: { color: TEXT.secondary, fontSize: 13, fontFamily: Fonts.regular, flex: 1, lineHeight: 19 },
  idealCard: { borderRadius: Radius.sm, padding: 10, marginTop: Spacing.sm },
  idealText: { fontSize: 11, fontFamily: Fonts.semiBold },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: Radius.md, paddingVertical: 12, marginTop: Spacing.md,
  },
  ctaText: { fontSize: 13, fontFamily: Fonts.extraBold, letterSpacing: 1 },
});
