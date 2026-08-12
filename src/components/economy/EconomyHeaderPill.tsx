/**
 * EconomyHeaderPill — fila compacta E- · H+ · Rank para el header del HOY.
 * Self-contained: se auto-gatea (LAB_ECONOMY_ENABLED) y carga sus propios balances.
 * Si la feature está OFF o no hay usuario → no renderiza nada (cero impacto en el HOY).
 * Tap → /economy/admin. Refresca en 'balance_changed'.
 *
 * Task #134 fix: cache local en AsyncStorage evita el flash a "⚡0 · 💎0 · Rank 1"
 * al abrir la app. Estrategia:
 *   1. Al montar → intentar hidratar desde cache local (mostrar balance previo instantáneo).
 *   2. En background → fetch remoto. Si devuelve null (RLS hidratando o sin fila) → mantener
 *      cache. Solo actualizar cuando venga data real.
 *   3. Tras cada fetch exitoso → persistir a cache para próxima apertura.
 */
import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// ECO-5: saldos AISLADOS — null = "aún sin dato" por saldo. Antes un user sin
// fila en electron_balance jamás veía sus H+ (el join exigía ambas queries).
type BalanceData = { e: number | null; h: number | null; rank: number | null };
const CACHE_KEY = (userId: string) => `atp:econ:balance:${userId}`;

export function EconomyHeaderPill() {
  const { user } = useAuth();
  const [data, setData] = useState<BalanceData | null>(null);

  // Hidratar desde cache al montar (evita flash a 0). Corre una sola vez por user.
  useEffect(() => {
    if (!LAB_ECONOMY_ENABLED || !user?.id) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY(user.id));
        if (raw) {
          const cached = JSON.parse(raw) as BalanceData;
          setData(cached);
        }
      } catch {} // Silencioso: si falla el cache, seguimos con fetch remoto
    })();
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!LAB_ECONOMY_ENABLED || !user?.id) return;
    const [e, p] = await Promise.all([getElectronBalance(user.id), getProtonBalance(user.id)]);
    // ECO-5: cada saldo se actualiza POR SEPARADO. Si una query devuelve null
    // (cold start con RLS hidratando o sin fila), ese saldo conserva su valor
    // previo — pero el otro SÍ se pinta. Nunca ceros defensivos.
    if (!e && !p) return;
    setData((prev) => {
      const next: BalanceData = {
        e: e ? e.current_electrons : prev?.e ?? null,
        h: p ? p.current_protons : prev?.h ?? null,
        rank: e ? e.current_rank : prev?.rank ?? null,
      };
      // Persistir a cache para próxima apertura (fire-and-forget)
      AsyncStorage.setItem(CACHE_KEY(user.id), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    if (!LAB_ECONOMY_ENABLED) return;
    load();
    const sub = DeviceEventEmitter.addListener('balance_changed', load);
    return () => sub.remove();
  }, [load]));

  // ECO-5: la pill pinta cada saldo que SÍ tiene dato — un user sin fila de
  // electrones ve sus H+ igual (antes el join los ocultaba a ambos).
  if (!LAB_ECONOMY_ENABLED || !data || (data.e === null && data.h === null)) return null;

  return (
    <AnimatedPressable onPress={() => { haptic.light(); router.push('/economy/admin'); }} style={styles.pill}>
      {data.e !== null && <Stat icon="flash" color={ATP_BRAND.lime} text={formatCompact(data.e)} />}
      {data.e !== null && data.h !== null && <View style={styles.sep} />}
      {data.h !== null && <Stat icon="diamond" color="#7fd4ff" text={formatCompact(data.h)} />}
      {data.rank !== null && (
        <>
          <View style={styles.sep} />
          <View style={styles.rank}>
            <EliteText style={styles.rankText}>Rank {data.rank}</EliteText>
          </View>
        </>
      )}
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
