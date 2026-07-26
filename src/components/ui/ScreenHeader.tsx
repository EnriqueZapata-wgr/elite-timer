/**
 * ScreenHeader — Header estándar para pantallas con BackButton + título centrado.
 * Usa para pantallas de navegación (settings, records, progreso, historial, etc.)
 *
 * V1.5.1 (#8): trae la casita fija (HomeChip, vocabulario del StickyPillarBanner)
 * y registra nav propia — la casita flotante global se auto-oculta aquí.
 */
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { BackButton } from '@/src/components/ui/BackButton';
import { HomeChip } from '@/src/components/ui/HomeChip';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';
import { TEXT_COLORS } from '@/src/constants/brand';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export function ScreenHeader({ title, rightAction, onBack }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  useRegisterOwnNav();

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      <View style={s.side}>
        <BackButton onPress={onBack} />
        <HomeChip />
      </View>
      {/* MB-5 Bloque 4.2: títulos largos ("REGISTRAR CARDIO") se encogen en
          vez de truncarse ("REGISTRAR CARD…") — aplica a todo el pilar. */}
      <EliteText style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {title.toUpperCase()}
      </EliteText>
      <View style={[s.side, s.sideRight]}>{rightAction ?? null}</View>
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
  // Lados espejo (back+casita ≈ 86px) — el título queda centrado de verdad.
  side: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 86 },
  sideRight: { justifyContent: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: TEXT_COLORS.primary,
    letterSpacing: 2,
  },
});
