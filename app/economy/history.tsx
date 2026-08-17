/**
 * Historial de electrones — qué ganó la persona y cuándo.
 *
 * PREMIUM (16-ago-2026): tenía dos pestañas, E- y H+, y abría en H+. Se quitó
 * el filtro entero: sin moneda no hay dos historiales que comparar, y una
 * pestaña sola no es un filtro, es ruido. El historial de H+ no se borra de la
 * base, sigue disponible en la exportación de datos.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { getElectronHistory } from '@/src/services/economy/electron-service';
import { formatFull } from '@/src/services/economy/format';
// OLA1 R-0: las etiquetas se fueron a un módulo puro — el reporte del dominio
// economía nombra los movimientos igual que esta pantalla.
import { humanizeKey } from '@/src/services/economy/tx-labels';
import { ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function HistoryScreen() {
  const { user } = useAuth();
  const { kind, tokens: t } = useAppTheme();
  const [rows, setRows] = useState<Array<{ id: string; amount: number; label: string; created_at: string }>>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const tx = await getElectronHistory(user.id);
    setRows(tx.map((row) => ({
      id: row.id, amount: row.amount, label: humanizeKey(row.reason), created_at: row.created_at,
    })));
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Historial de electrones" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <EliteText variant="caption" style={[styles.empty, { color: t.textoSecundario }]}>
            Todavía no hay electrones registrados. Se ganan al cumplir tu día.
          </EliteText>
        ) : rows.map((r) => (
          <View key={r.id} style={[styles.row, { backgroundColor: t.card, borderColor: t.borde }]}>
            <View style={{ flex: 1 }}>
              <EliteText style={[styles.rowLabel, { color: t.texto }]} numberOfLines={1}>{r.label}</EliteText>
              <EliteText variant="caption" style={[styles.rowDate, { color: t.textoTenue }]}>{r.created_at?.slice(0, 10)}</EliteText>
            </View>
            <EliteText style={[styles.rowAmt, { color: r.amount >= 0 ? ATP_BRAND.lime : t.error }]}>
              {r.amount >= 0 ? '+' : ''}{formatFull(r.amount)} E-
            </EliteText>
          </View>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: 80 },
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
