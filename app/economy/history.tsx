/**
 * Historial de movimientos — filtro E- / H+. Lista las transacciones del usuario.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getElectronHistory } from '@/src/services/economy/electron-service';
import { getProtonHistory } from '@/src/services/economy/proton-service';
import { formatFull } from '@/src/services/economy/format';
// OLA1 R-0: las etiquetas se fueron a un módulo puro — el reporte del dominio
// economía nombra los movimientos igual que esta pantalla.
import { humanizeKey } from '@/src/services/economy/tx-labels';
import { ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type Tab = 'electrons' | 'protons';

export default function HistoryScreen() {
  const { user } = useAuth();
  const { kind, tokens: t } = useAppTheme();
  const [tab, setTab] = useState<Tab>('protons');
  const [rows, setRows] = useState<Array<{ id: string; amount: number; label: string; created_at: string }>>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    if (tab === 'electrons') {
      const tx = await getElectronHistory(user.id);
      setRows(tx.map((t) => ({ id: t.id, amount: t.amount, label: humanizeKey(t.reason), created_at: t.created_at })));
    } else {
      const tx = await getProtonHistory(user.id);
      setRows(tx.map((t) => ({
        id: t.id,
        amount: t.amount,
        label: t.action_key ? `${humanizeKey(t.type)} · ${humanizeKey(t.action_key)}` : humanizeKey(t.type),
        created_at: t.created_at,
      })));
    }
  }, [user?.id, tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unit = tab === 'electrons' ? 'E-' : 'H+';

  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Historial" onBack={() => router.back()} />
      <View style={styles.tabs}>
        {(['protons', 'electrons'] as Tab[]).map((tabKey) => (
          <AnimatedPressable key={tabKey} onPress={() => { haptic.light(); setTab(tabKey); }}
            style={[styles.tab, { backgroundColor: t.card, borderColor: t.bordeMarcado }, tab === tabKey && styles.tabActive]}>
            <EliteText style={[styles.tabText, { color: t.textoSecundario }, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'protons' ? 'H+' : 'E-'}
            </EliteText>
          </AnimatedPressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <EliteText variant="caption" style={[styles.empty, { color: t.textoSecundario }]}>Sin movimientos todavía.</EliteText>
        ) : rows.map((r) => (
          <View key={r.id} style={[styles.row, { backgroundColor: t.card, borderColor: t.borde }]}>
            <View style={{ flex: 1 }}>
              <EliteText style={[styles.rowLabel, { color: t.texto }]} numberOfLines={1}>{r.label}</EliteText>
              <EliteText variant="caption" style={[styles.rowDate, { color: t.textoTenue }]}>{r.created_at?.slice(0, 10)}</EliteText>
            </View>
            <EliteText style={[styles.rowAmt, { color: r.amount >= 0 ? ATP_BRAND.lime : t.error }]}>
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
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.pill, alignItems: 'center', borderWidth: 0.5 },
  tabActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  tabText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  tabTextActive: { color: '#000' },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },
  empty: { textAlign: 'center', marginTop: Spacing.xl },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 0.5,
  },
  rowLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowDate: { marginTop: 2 },
  rowAmt: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
});
