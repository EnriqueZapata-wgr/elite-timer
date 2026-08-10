/**
 * settings-ui — kit compartido de las pantallas de Ajustes (#137).
 * Extraído del app/settings.tsx monolítico al partirlo en hub + sub-pantallas.
 *
 * MB-31A: los colores salen del scope (useSurfaceTokens): oscuro de siempre
 * fuera de <ThemeReady>, tema activo dentro. Regla 1 del claro aplicada al
 * chip seleccionado: en oscuro es lima translúcido con TEXTO lima (legible
 * ahí); en claro el lima jamás es texto → relleno lima SÓLIDO con negro
 * encima (13.36), el patrón del manual.
 */
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { ATP_BRAND } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Colors, Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';

export function SectionLabel({ children, color }: { children: string; color?: string }) {
  return (
    <SectionTitle style={color ? { color, marginTop: 16 } : { marginTop: 16 }}>
      {children}
    </SectionTitle>
  );
}

export function Divider() {
  const t = useSurfaceTokens();
  // En oscuro el separador de siempre (#232323 = flotante); en claro, borde.
  const bg = t.kind === 'dark' ? t.flotante : t.borde;
  return <View style={[ui.divider, { backgroundColor: bg }]} />;
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const base = { backgroundColor: t.card, borderColor: dark ? t.flotante : t.borde };
  const sel = dark
    ? { backgroundColor: ATP_BRAND.lime + '15', borderColor: ATP_BRAND.lime }
    : { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime };
  const textColor = selected
    ? (dark ? ATP_BRAND.lime : t.textoSobreLima)
    : t.textoSecundario;
  return (
    <Pressable onPress={onPress} style={[ui.chip, base, selected && sel]}>
      <EliteText
        variant="caption"
        style={[{ color: textColor, fontSize: FontSizes.sm }, selected && { fontFamily: Fonts.semiBold }]}
      >
        {label}
      </EliteText>
    </Pressable>
  );
}

export function TestButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const t = useSurfaceTokens();
  const acento = t.kind === 'dark' ? Colors.neonGreen : t.tealTexto;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [ui.testButton, pressed && { backgroundColor: t.flotante }]}
    >
      <Ionicons name={icon as any} size={22} color={acento} />
      <EliteText variant="caption" style={{ color: acento }}>{label}</EliteText>
    </Pressable>
  );
}

export function ConnectionCard({ name, date, color, onDisconnect }: {
  name: string; date: string; color: string; onDisconnect: () => void;
}) {
  const t = useSurfaceTokens();
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[ui.connectionCard, { backgroundColor: t.card, borderColor: t.borde }]}>
      <View style={[ui.avatar, { backgroundColor: color + '20' }]}>
        <EliteText style={[ui.avatarText, { color }]}>{initials}</EliteText>
      </View>
      <View style={ui.connectionInfo}>
        <EliteText variant="body" style={ui.connectionName}>{name}</EliteText>
        <EliteText variant="caption" style={[ui.connectionDate, { color: t.textoSecundario }]}>Desde {date}</EliteText>
      </View>
      <Pressable onPress={onDisconnect} hitSlop={8} style={ui.disconnectBtn}>
        <Ionicons name="close-circle-outline" size={20} color={t.textoSecundario} />
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
  const t = useSurfaceTokens();
  const content = (
    <>
      <View style={ui.settingRowLeft}>
        <Ionicons name={icon as any} size={20} color={iconColor ?? t.textoSecundario} />
        <View style={{ flex: 1 }}>
          <EliteText variant="body" style={ui.settingRowLabel}>{label}</EliteText>
          {sub ? <EliteText variant="caption" style={[ui.settingRowSub, { color: t.textoSecundario }]}>{sub}</EliteText> : null}
        </View>
      </View>
      {right ?? (onPress
        ? <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />
        : null)}
    </>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={ui.settingRow}>{content}</Pressable>;
  }
  return <View style={ui.settingRow}>{content}</View>;
}

/** Estilos compartidos entre hub y sub-pantallas de Ajustes.
 *  MB-31A: aquí queda SOLO layout + los defaults oscuros que las pantallas
 *  sin migrar siguen usando tal cual; el color vivo lo ponen los
 *  componentes de arriba desde el scope. */
export const ui = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.md,
  },
  divider: {
    height: 1,
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
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 0.5,
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
    fontSize: FontSizes.sm,
    marginTop: 1,
  },
  disconnectBtn: {
    padding: Spacing.xs,
  },
});
