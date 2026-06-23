/**
 * GlobalTopBar (#75) — header persistente para TODAS las pantallas.
 *
 *   | ATP DAILY            ⚡25 · 💎9.7K · Rank1   (🔔) |   ← HOY (raíz, sin back, campana)
 *   | ← ATP LABS           ⚡25 · 💎9.7K · Rank1   (🏠) |   ← otras (back + casita → '/')
 *
 * - Pill: <EconomyHeaderPill/> existente, self-gated por LAB_ECONOMY_ENABLED (desaparece si OFF).
 * - Botón derecho: campana en la raíz (abre notificaciones vía onBellPress); casita en el resto
 *   (router.replace('/')). El "back" (←) es independiente del "home": atrás retrocede un nivel.
 * - Safe-area top + fondo semitransparente que no rompe los backgrounds de las pantallas.
 *
 * Tokens canónicos (brand.ts) + haptic + AnimatedPressable. Cero strings de color sueltos.
 */
import { View, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { BackButton } from '@/src/components/ui/BackButton';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EconomyHeaderPill } from '@/src/components/economy/EconomyHeaderPill';
import { haptic } from '@/src/utils/haptics';
import { BG, BORDER, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { isHomePath } from '@/src/components/ui/global-topbar-utils';

export { isHomePath } from '@/src/components/ui/global-topbar-utils';

export interface GlobalTopBarProps {
  /** Título de la pantalla (se muestra en MAYÚSCULAS). */
  title: string;
  /** Mostrar flecha de atrás. Default: true salvo en la raíz (HOY). */
  showBack?: boolean;
  /** Callback de la campana (solo en la raíz). Si no se pasa, no se muestra campana. */
  onBellPress?: () => void;
  /** Override del back (default router.back()). */
  onBack?: () => void;
}

export function GlobalTopBar({ title, showBack, onBellPress, onBack }: GlobalTopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const home = isHomePath(pathname);
  const backVisible = showBack ?? !home;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.left}>
        {backVisible ? <BackButton onPress={onBack} /> : <View style={styles.leftSpacer} />}
        <EliteText style={styles.title} numberOfLines={1}>{title.toUpperCase()}</EliteText>
      </View>

      <View style={styles.right}>
        {/* La pill ya trae marginTop:8 — lo neutralizamos para alinear en la barra. */}
        <View style={styles.pillWrap}><EconomyHeaderPill /></View>
        {home ? (
          onBellPress ? (
            <AnimatedPressable onPress={() => { haptic.light(); onBellPress(); }} style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color={TEXT.primary} />
            </AnimatedPressable>
          ) : null
        ) : (
          <AnimatedPressable
            onPress={() => { haptic.light(); router.replace('/'); }}
            style={styles.iconBtn}
          >
            <Ionicons name="home-outline" size={22} color={TEXT.primary} />
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    backgroundColor: `${BG.screen}D9`, // negro ~85% — semitransparente, no tapa el fondo
    borderBottomWidth: 0.5, borderBottomColor: BORDER.subtle,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 2 },
  leftSpacer: { width: Spacing.xs },
  title: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.lg, letterSpacing: 0.5, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pillWrap: { marginTop: -8 },
  iconBtn: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
});
