/**
 * Historial de movimientos — filtro E- / H+. Lista las transacciones del usuario.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getElectronHistory } from '@/src/services/economy/electron-service';
import { getProtonHistory } from '@/src/services/economy/proton-service';
import { formatFull } from '@/src/services/economy/format';
import { ELEVATION, TEXT, ATP_BRAND, SEMANTIC } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type Tab = 'electrons' | 'protons';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('protons');
  const [rows, setRows] = useState<Array<{ id: string; amount: number; label: string; created_at: string }>>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    if (tab === 'electrons') {
      const tx = await getElectronHistory(user.id);
      setRows(tx.map((t) => ({ id: t.id, amount: t.amount, label: t.reason, created_at: t.created_at })));
    } else {
      const tx = await getProtonHistory(user.id);
      setRows(tx.map((t) => ({ id: t.id, amount: t.amount, label: t.action_key ? `${t.type} · ${t.action_key}` : t.type, created_at: t.created_at })));
    }
  }, [user?.id, tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unit = tab === 'electrons' ? 'E-' : 'H+';

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Historial" onBack={() => router.back()} />
      <View style={styles.tabs}>
        {(['protons', 'electrons'] as Tab[]).map((t) => (
          <AnimatedPressable key={t} onPress={() => { haptic.light(); setTab(t); }}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <EliteText style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'protons' ? 'H+' : 'E-'}
            </EliteText>
          </AnimatedPressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <EliteText variant="caption" style={styles.empty}>Sin movimientos todavía.</EliteText>
        ) : rows.map((r) => (
          <View key={r.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <EliteText style={styles.rowLabel} numberOfLines={1}>{r.label}</EliteText>
              <EliteText variant="caption" style={styles.rowDate}>{r.created_at?.slice(0, 10)}</EliteText>
            </View>
            <EliteText style={[styles.rowAmt, { color: r.amount >= 0 ? ATP_BRAND.lime : SEMANTIC.error }]}>
              {r.amount >= 0 ? '+' : ''}{formatFull(r.amount)} {unit}
            </EliteText>
          </View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.pill, alignItems: 'center', backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[2].border },
  tabActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  tabText: { color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  tabTextActive: { color: '#000' },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },
  empty: { color: TEXT.secondary, textAlign: 'center', marginTop: Spacing.xl },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 0.5, borderColor: ELEVATION[1].border,
  },
  rowLabel: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowDate: { color: TEXT.tertiary, marginTop: 2 },
  rowAmt: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
});
