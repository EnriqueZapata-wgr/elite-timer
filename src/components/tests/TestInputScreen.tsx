/**
 * TestInputScreen — motor reusable de captura NUMÉRICA para tests (peso, reps, tiempo,
 * distancia). Complementa a <TestQuestionScreen> (cuestionarios) y <StopwatchTestScreen>
 * (cronómetro en vivo): este es el form de UN solo valor con input grande + validación.
 *
 * Doctrina NO-FRANKENSTEIN: design tokens del brand, primitives del kit (AnimatedPressable,
 * EliteText), haptics consistentes, sin números mágicos ni dependencias nuevas.
 *
 * Las funciones puras viven en ./test-input-helpers (sin RN, testeables con vitest).
 */
import { useState } from 'react';
import { View, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION } from '@/src/constants/brand';
import {
  type InputType,
  effectiveDecimals,
  parseInputValue,
  isValueValid,
  formatClock,
} from '@/src/components/tests/test-input-helpers';

export type { InputType } from '@/src/components/tests/test-input-helpers';

export interface TestInputProps {
  title: string;
  subtitle?: string;
  /** Texto que explica cómo hacer el test. */
  instructions: string;
  inputType: InputType;
  /** Unidad mostrada junto al input ('kg', 'segundos', 'reps', 'm', 'lpm'…). */
  unit: string;
  min?: number;
  max?: number;
  /** Decimales permitidos. 0 = entero. 'reps' fuerza 0. Default 0. */
  decimals?: number;
  placeholder?: string;
  onComplete: (value: number) => void | Promise<void>;
  initialValue?: number;
  /** Color de acento (default lime del brand). */
  accent?: string;
}

// ── Componente ─────────────────────────────────────────────────────────────

export function TestInputScreen({
  title,
  subtitle,
  instructions,
  inputType,
  unit,
  min,
  max,
  decimals,
  placeholder,
  onComplete,
  initialValue,
  accent = ATP_BRAND.lime,
}: TestInputProps) {
  const router = useRouter();
  const [text, setText] = useState(initialValue != null ? String(initialValue) : '');
  const [submitting, setSubmitting] = useState(false);

  const decimalsEff = effectiveDecimals(inputType, decimals);
  const value = parseInputValue(text, inputType, decimals);
  const valid = isValueValid(value, min, max);
  const showClock = inputType === 'time' && value != null && value >= 60;

  const onChange = (t: string) => {
    // reps/enteros: descartar separador decimal; decimales: permitir . y ,
    const filtered = decimalsEff === 0 ? t.replace(/[.,]/g, '') : t;
    setText(filtered);
  };

  async function handleSave() {
    if (!valid || value == null || submitting) return;
    setSubmitting(true);
    haptic.medium();
    try {
      await onComplete(value);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header con back-arrow */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => { haptic.light(); router.back(); }} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </AnimatedPressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText variant="subtitle" style={[styles.title, { color: accent }]}>{title}</EliteText>
          {subtitle ? <EliteText variant="caption" style={styles.subtitle}>{subtitle}</EliteText> : null}
        </Animated.View>

        {/* Instrucciones */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.card}>
          <View style={styles.instrHeader}>
            <Ionicons name="clipboard-outline" size={16} color={accent} />
            <EliteText variant="label" style={[styles.instrTitle, { color: accent }]}>Cómo hacer el test</EliteText>
          </View>
          <EliteText variant="body" style={styles.instrBody}>{instructions}</EliteText>
        </Animated.View>

        {/* Input grande + unidad */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={styles.inputCard}>
          <TextInput
            value={text}
            onChangeText={onChange}
            keyboardType={decimalsEff > 0 ? 'decimal-pad' : 'number-pad'}
            placeholder={placeholder ?? '0'}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            maxLength={9}
            accessibilityLabel={`${title} (${unit})`}
          />
          <EliteText variant="subtitle" style={styles.unit}>{unit}</EliteText>
        </Animated.View>

        {showClock ? (
          <EliteText variant="caption" style={styles.clock}>{formatClock(value!)} (min:seg)</EliteText>
        ) : null}

        {(min != null || max != null) ? (
          <EliteText variant="caption" style={styles.range}>
            Rango válido: {min ?? '—'}–{max ?? '—'} {unit}
          </EliteText>
        ) : null}

        {/* Guardar */}
        <AnimatedPressable
          onPress={handleSave}
          disabled={!valid || submitting}
          style={[styles.cta, { backgroundColor: accent }, (!valid || submitting) && styles.ctaDisabled]}
        >
          <EliteText variant="body" style={styles.ctaText}>
            {submitting ? 'Guardando…' : 'Guardar resultado'}
          </EliteText>
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ELEVATION[0].bg },
  header: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 120 },
  title: { fontSize: FontSizes.xl, letterSpacing: 1 },
  subtitle: { color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 0.5, borderColor: ELEVATION[1].border, gap: Spacing.sm,
  },
  instrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  instrTitle: { letterSpacing: 1 },
  instrBody: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 21 },
  inputCard: {
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  input: {
    color: Colors.textPrimary, fontFamily: Fonts.extraBold, fontSize: FontSizes.mega,
    minWidth: 120, textAlign: 'center', padding: 0,
  },
  unit: { color: Colors.textSecondary },
  clock: { color: Colors.textSecondary, textAlign: 'center', marginTop: -Spacing.xs },
  range: { color: Colors.textMuted, textAlign: 'center' },
  cta: { borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
