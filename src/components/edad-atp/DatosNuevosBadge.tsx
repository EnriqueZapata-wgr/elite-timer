/**
 * <DatosNuevosBadge> — aviso no intrusivo de que entró data nueva integrada y se puede
 * recalcular la Edad ATP (#16). Se muestra solo si `visible`. Tappable opcional (llevar a
 * recalcular). Se limpia tras recalcular (el padre controla `visible`).
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  visible: boolean;
  onPress?: () => void;
}

export function DatosNuevosBadge({ visible, onPress }: Props) {
  if (!visible) return null;
  return (
    <Pressable onPress={onPress} style={styles.badge} accessibilityRole="button">
      <View style={styles.dot} />
      <EliteText variant="caption" style={styles.text}>
        Datos nuevos — puedes recalcular tu Edad ATP
      </EliteText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: 'rgba(168,224,42,0.10)', borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(168,224,42,0.35)',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.neonGreen },
  text: { color: Colors.neonGreen, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
});
