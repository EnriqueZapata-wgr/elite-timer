/**
 * ScreenHeader — Header estándar para pantallas con BackButton + título centrado.
 * Usa para pantallas de navegación (settings, records, progreso, historial, etc.)
 */
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { BackButton } from '@/src/components/ui/BackButton';
import { TEXT_COLORS } from '@/src/constants/brand';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export function ScreenHeader({ title, rightAction, onBack }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <BackButton onPress={onBack} />
      <EliteText style={s.title}>{title.toUpperCase()}</EliteText>
      {rightAction || <View style={{ width: 44 }} />}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
    letterSpacing: 2,
  },
});
