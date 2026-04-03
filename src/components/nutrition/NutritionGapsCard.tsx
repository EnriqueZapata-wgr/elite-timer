/**
 * NutritionGapsCard — "Lo que te falta hoy"
 *
 * Muestra barras de progreso comparando macros consumidos vs objetivo,
 * con una sugerencia concreta de alimento para cubrir el mayor déficit.
 */
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { EliteText } from '@/components/elite-text';

// ═══ TIPOS ═══

interface NutritionGapsCardProps {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  /** Peso en kg para calcular objetivo de proteína (default 70kg) */
  weightKg?: number;
}

// ═══ CONSTANTES DE MACROS ═══

/** Colores por macro */
const MACRO_COLORS = {
  protein: '#5B9BD5',
  fat: '#F5A623',
  carbs: '#7BC67E',
  fiber: '#888888',
  calories: '#FFFFFF',
} as const;

/** Etiquetas en español */
const MACRO_LABELS: Record<string, string> = {
  protein: 'Proteína',
  fat: 'Grasa',
  carbs: 'Carbohidratos',
  fiber: 'Fibra',
  calories: 'Calorías',
};

/** Unidades por macro */
const MACRO_UNITS: Record<string, string> = {
  protein: 'g',
  fat: 'g',
  carbs: 'g',
  fiber: 'g',
  calories: 'kcal',
};

// ═══ SUGERENCIAS DE ALIMENTOS ═══

/** Sugerencias concretas según el macro más deficiente */
const FOOD_SUGGESTIONS: Record<string, string> = {
  protein: 'Salmón 200g + 3 huevos → +56g proteína',
  fat: 'Aguacate 1 pieza + nueces 30g → +28g grasa',
  carbs: 'Camote 200g + arroz 100g → +65g carbos',
  fiber: 'Ensalada grande + manzana → +8g fibra',
};

// ═══ CÁLCULO DE OBJETIVOS ═══

/** Calcula los objetivos predeterminados basándose en el peso */
function getDefaultTargets(weightKg: number) {
  return {
    protein: Math.round(1.8 * weightKg),        // 1.8g/kg de peso corporal
    fat: Math.round((2000 * 0.6) / 9),           // 60% de 2000 kcal → ~133g
    carbs: Math.round((2000 * 0.25) / 4),        // 25% de 2000 kcal → ~125g
    fiber: 25,                                    // Recomendación estándar
    calories: 2000,                               // Base calórica estándar
  };
}

// ═══ COMPONENTE DE BARRA DE PROGRESO ═══

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  unit: string;
}

/** Barra horizontal de progreso individual para cada macro */
function MacroBar({ label, consumed, target, color, unit }: MacroBarProps) {
  const progress = Math.min(consumed / target, 1);
  const isExcess = consumed > target;
  // Color rojo si hay exceso, color normal si no
  const barColor = isExcess ? SEMANTIC.error : color;

  return (
    <View style={styles.macroRow}>
      {/* Etiqueta del macro */}
      <EliteText
        variant="label"
        style={[styles.macroLabel, { color: TEXT_COLORS.secondary }]}
        numberOfLines={1}
      >
        {label}
      </EliteText>

      {/* Contenedor de la barra */}
      <View style={styles.barContainer}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.min(progress * 100, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      {/* Valor numérico consumido/objetivo */}
      <View style={styles.macroValueContainer}>
        <EliteText variant="caption" style={styles.macroValue}>
          {Math.round(consumed)}/{target}{unit}
        </EliteText>
        {isExcess && (
          <EliteText variant="caption" style={styles.excessLabel}>
            (exceso)
          </EliteText>
        )}
      </View>
    </View>
  );
}

// ═══ COMPONENTE PRINCIPAL ═══

export function NutritionGapsCard({ consumed, weightKg = 70 }: NutritionGapsCardProps) {
  const targets = getDefaultTargets(weightKg);

  // Determinar cuál macro tiene el mayor déficit porcentual
  const gaps = [
    { key: 'protein', remaining: Math.max(0, (targets.protein - consumed.protein) / targets.protein) },
    { key: 'fat', remaining: Math.max(0, (targets.fat - consumed.fat) / targets.fat) },
    { key: 'carbs', remaining: Math.max(0, (targets.carbs - consumed.carbs) / targets.carbs) },
    { key: 'fiber', remaining: Math.max(0, (targets.fiber - (consumed.fiber ?? 0)) / targets.fiber) },
    { key: 'calories', remaining: Math.max(0, (targets.calories - consumed.calories) / targets.calories) },
  ];

  // Ordenar por mayor porcentaje restante (mayor déficit primero)
  gaps.sort((a, b) => b.remaining - a.remaining);
  const biggestGap = gaps[0];

  // Generar la sugerencia según el mayor déficit
  const getSuggestion = (): string => {
    if (biggestGap.remaining <= 0) {
      return '¡Todos tus macros están cubiertos hoy!';
    }
    if (biggestGap.key === 'calories') {
      const remaining = Math.round(targets.calories - consumed.calories);
      return `Necesitas ~${remaining} kcal más hoy`;
    }
    return FOOD_SUGGESTIONS[biggestGap.key] ?? '';
  };

  // Lista de macros para renderizar las barras
  const macros = [
    { key: 'calories', consumed: consumed.calories, target: targets.calories },
    { key: 'protein', consumed: consumed.protein, target: targets.protein },
    { key: 'carbs', consumed: consumed.carbs, target: targets.carbs },
    { key: 'fat', consumed: consumed.fat, target: targets.fat },
    { key: 'fiber', consumed: consumed.fiber ?? 0, target: targets.fiber },
  ];

  return (
    <Animated.View entering={FadeInUp} style={styles.container}>
      {/* Encabezado de sección */}
      <EliteText variant="label" style={styles.sectionHeader}>
        LO QUE TE FALTA HOY
      </EliteText>

      {/* Barras de progreso para cada macro */}
      <View style={styles.barsSection}>
        {macros.map(({ key, consumed: val, target }) => (
          <MacroBar
            key={key}
            label={MACRO_LABELS[key]}
            consumed={val}
            target={target}
            color={MACRO_COLORS[key as keyof typeof MACRO_COLORS]}
            unit={MACRO_UNITS[key]}
          />
        ))}
      </View>

      {/* Sugerencia de alimento basada en el mayor déficit */}
      {biggestGap.remaining > 0 && (
        <View style={styles.suggestionCard}>
          <Ionicons
            name="bulb-outline"
            size={18}
            color={SEMANTIC.warning}
            style={styles.suggestionIcon}
          />
          <EliteText variant="caption" style={styles.suggestionText}>
            {getSuggestion()}
          </EliteText>
        </View>
      )}
    </Animated.View>
  );
}

// ═══ ESTILOS ═══

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  sectionHeader: {
    color: CATEGORY_COLORS.nutrition,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  barsSection: {
    gap: Spacing.sm,
  },

  // Fila individual de macro
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroLabel: {
    width: 90,
    fontSize: FontSizes.xs,
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: withOpacity(SURFACES.cardLight, 0.5),
    borderRadius: Radius.xs,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.xs,
  },
  macroValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 75,
    justifyContent: 'flex-end',
  },
  macroValue: {
    fontSize: FontSizes.xs,
    color: TEXT_COLORS.secondary,
    fontVariant: ['tabular-nums'],
  },
  excessLabel: {
    fontSize: FontSizes.xs,
    color: SEMANTIC.error,
    marginLeft: 2,
  },

  // Tarjeta de sugerencia
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: withOpacity(SEMANTIC.warning, 0.08),
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionIcon: {
    marginTop: 1,
  },
  suggestionText: {
    flex: 1,
    color: TEXT_COLORS.primary,
    fontSize: FontSizes.xs,
    lineHeight: 16,
  },
});
