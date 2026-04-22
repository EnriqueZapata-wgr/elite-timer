/**
 * PillarHeader — Header estándar para pantallas de herramientas con identidad de pilar.
 * Formato: [←] ATP TÍTULO
 */
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { BackButton } from '@/src/components/ui/BackButton';
import { CATEGORY_COLORS } from '@/src/constants/brand';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

const PILLAR_COLORS: Record<string, string> = {
  nutrition: CATEGORY_COLORS.nutrition,
  fitness: CATEGORY_COLORS.fitness,
  mind: CATEGORY_COLORS.mind,
  optimization: CATEGORY_COLORS.optimization,
  metrics: CATEGORY_COLORS.metrics,
  rest: CATEGORY_COLORS.rest,
  cycle: '#D4537E',
};

interface Props {
  pillar: keyof typeof PILLAR_COLORS;
  title: string;
  rightContent?: React.ReactNode;
}

export function PillarHeader({ pillar, title, rightContent }: Props) {
  const color = PILLAR_COLORS[pillar] || CATEGORY_COLORS.fitness;
  return (
    <View style={s.header}>
      <BackButton color={color} />
      <EliteText style={[s.atp, { color }]}>ATP</EliteText>
      <EliteText style={s.title}>{title.toUpperCase()}</EliteText>
      {rightContent ? <View style={{ marginLeft: 'auto' }}>{rightContent}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
  atp: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, letterSpacing: 2 },
  title: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: '#fff', letterSpacing: 2 },
});
