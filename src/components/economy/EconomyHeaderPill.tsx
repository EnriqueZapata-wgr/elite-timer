/**
 * EconomyHeaderPill — fila compacta E- · H+ · Rank para el header del HOY.
 * Self-contained: se auto-gatea (LAB_ECONOMY_ENABLED) y carga sus propios balances.
 * Si la feature está OFF o no hay usuario → no renderiza nada (cero impacto en el HOY).
 * Tap → /economy/admin. Refresca en 'balance_changed'.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { LAB_ECONOMY_ENABLED } from '@/src/services/economy/economy-config';
import { getElectronBalance } from '@/src/services/economy/electron-service';
import { getProtonBalance } from '@/src/services/economy/proton-service';
import { formatCompact } from '@/src/services/economy/format';
import { ELEVATION, TEXT, ATP_BRAND } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';

export function EconomyHeaderPill() {
  const { user } = useAuth();
  const [data, setData] = useState<{ e: number; h: number; rank: number } | null>(null);

  const load = useCallback(async () => {
    if (!LAB_ECONOMY_ENABLED || !user?.id) return;
    const [e, p] = await Promise.all([getElectronBalance(user.id), getProtonBalance(user.id)]);
    setData({ e: e.current_electrons, h: p.current_protons, rank: e.current_rank });
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    if (!LAB_ECONOMY_ENABLED) return;
    load();
    const sub = DeviceEventEmitter.addListener('balance_changed', load);
    return () => sub.remove();
  }, [load]));

  if (!LAB_ECONOMY_ENABLED || !data) return null;

  return (
    <AnimatedPressable onPress={() => { haptic.light(); router.push('/economy/admin' as any); }} style={styles.pill}>
      <Stat icon="flash" color={ATP_BRAND.lime} text={formatCompact(data.e)} />
      <View style={styles.sep} />
      <Stat icon="diamond" color="#7fd4ff" text={formatCompact(data.h)} />
      <View style={styles.sep} />
      <View style={styles.rank}>
        <EliteText style={styles.rankText}>Rank {data.rank}</EliteText>
      </View>
      <Ionicons name="chevron-forward" size={14} color={TEXT.secondary} />
    </AnimatedPressable>
  );
}

function Stat({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color={color} />
      <EliteText style={styles.statText}>{text}</EliteText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[2].border,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  sep: { width: 1, height: 12, backgroundColor: ELEVATION[2].border },
  rank: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: `${ATP_BRAND.lime}1A` },
  rankText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xs },
});
