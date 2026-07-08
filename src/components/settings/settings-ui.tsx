/**
 * settings-ui — kit compartido de las pantallas de Ajustes (#137).
 * Extraído del app/settings.tsx monolítico al partirlo en hub + sub-pantallas.
 */
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { Colors, Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';

export function SectionLabel({ children, color }: { children: string; color?: string }) {
  return (
    <SectionTitle style={color ? { color, marginTop: 16 } : { marginTop: 16 }}>
      {children}
    </SectionTitle>
  );
}

export function Divider() {
  return <View style={ui.divider} />;
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[ui.chip, selected && ui.chipSelected]}>
      <EliteText variant="caption" style={[ui.chipText, selected && ui.chipTextSelected]}>
        {label}
      </EliteText>
    </Pressable>
  );
}

export function TestButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [ui.testButton, pressed && ui.testButtonPressed]}
    >
      <Ionicons name={icon as any} size={22} color={Colors.neonGreen} />
      <EliteText variant="caption" style={ui.testButtonLabel}>{label}</EliteText>
    </Pressable>
  );
}

export function ConnectionCard({ name, date, color, onDisconnect }: {
  name: string; date: string; color: string; onDisconnect: () => void;
}) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={ui.connectionCard}>
      <View style={[ui.avatar, { backgroundColor: color + '20' }]}>
        <EliteText style={[ui.avatarText, { color }]}>{initials}</EliteText>
      </View>
      <View style={ui.connectionInfo}>
        <EliteText variant="body" style={ui.connectionName}>{name}</EliteText>
        <EliteText variant="caption" style={ui.connectionDate}>Desde {date}</EliteText>
      </View>
      <Pressable onPress={onDisconnect} hitSlop={8} style={ui.disconnectBtn}>
        <Ionicons name="close-circle-outline" size={20} color={Colors.textSecondary} />
      </Pressable>
    </View>
  );
}

/** Row estándar de ajuste: icono + label + sub + acción a la derecha. */
export function SettingRow({ icon, iconColor, label, sub, right, onPress }: {
  icon: string;
  iconColor?: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={ui.settingRowLeft}>
        <Ionicons name={icon as any} size={20} color={iconColor ?? Colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <EliteText variant="body" style={ui.settingRowLabel}>{label}</EliteText>
          {sub ? <EliteText variant="caption" style={ui.settingRowSub}>{sub}</EliteText> : null}
        </View>
      </View>
      {right ?? (onPress
        ? <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        : null)}
    </>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={ui.settingRow}>{content}</Pressable>;
  }
  return <View style={ui.settingRow}>{content}</View>;
}

/** Estilos compartidos entre hub y sub-pantallas de Ajustes. */
export const ui = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceLight,
    marginTop: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingRowLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  settingRowSub: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 1,
  },
  chipLabel: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '15',
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  chipTextSelected: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },
  testButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    minWidth: 70,
  },
  testButtonPressed: {
    backgroundColor: Colors.surfaceLight,
  },
  testButtonLabel: {
    color: Colors.neonGreen,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  connectionDate: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 1,
  },
  disconnectBtn: {
    padding: Spacing.xs,
  },
});
