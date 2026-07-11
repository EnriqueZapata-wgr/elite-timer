/**
 * MyProtocolCard — Card B "Mi Protocolo" (dx-f3).
 *
 * Resumen compacto de intervenciones activas: semáforo por prioridad + check de
 * completadas hoy. Empty state invita a ver las sugeridas del motor. Tap →
 * /salud/intervenciones. Vive junto a la Card A de diagnóstico (health-hub).
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { PrioritySemaphore, type SemaphorePriority } from './PrioritySemaphore';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  getMyProtocol,
  getTodayCompletions,
  INTERVENTIONS_CHANGED_EVENT,
} from '@/src/services/interventions/intervention-service';
import type { ResolvedUserIntervention } from '@/src/services/interventions/intervention-service-core';
import { ATP_BRAND, ELEVATION, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const MAX_VISIBLE = 4;

export function MyProtocolCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<ResolvedUserIntervention[]>([]);
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [protocol, done] = await Promise.all([
      getMyProtocol(user.id),
      getTodayCompletions(user.id),
    ]);
    setItems(protocol);
    setDoneToday(done);
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    load().catch(() => setLoaded(true));
    const sub = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => {
      load().catch(() => {});
    });
    return () => sub.remove();
  }, [load]);

  const open = () => {
    haptic.light();
    router.push('/salud/intervenciones' as any);
  };

  if (!loaded) return null;

  const doneCount = items.filter((i) => doneToday.has(i.row.id)).length;
  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - visible.length;

  return (
    <AnimatedPressable onPress={open} style={styles.card}>
      <View style={styles.headerRow}>
        <EliteText style={styles.label}>MI PROTOCOLO</EliteText>
        {items.length > 0 && (
          <EliteText style={styles.counter}>
            {doneCount}/{items.length} hoy
          </EliteText>
        )}
      </View>

      {items.length === 0 ? (
        <>
          <EliteText style={styles.emptyTitle}>Aún no tienes intervenciones activas</EliteText>
          <EliteText style={styles.emptyText}>
            El motor ya tiene sugerencias base para ti. Actívalas y arma tu protocolo.
          </EliteText>
          <View style={styles.emptyCta}>
            <EliteText style={styles.emptyCtaText}>Ver sugeridas</EliteText>
            <Ionicons name="chevron-forward" size={14} color={ATP_BRAND.lime} />
          </View>
        </>
      ) : (
        <>
          {visible.map((item) => {
            const done = doneToday.has(item.row.id);
            return (
              <View key={item.row.id} style={styles.itemRow}>
                <PrioritySemaphore priority={item.row.priority as SemaphorePriority} size={8} />
                <EliteText style={[styles.itemName, done && styles.itemNameDone]} numberOfLines={1}>
                  {item.def.name}
                </EliteText>
                {done && <Ionicons name="checkmark-circle" size={16} color={ATP_BRAND.lime} />}
              </View>
            );
          })}
          <View style={styles.footerRow}>
            <EliteText style={styles.footerText}>
              {overflow > 0 ? `+${overflow} más · ` : ''}Ver protocolo completo
            </EliteText>
            <Ionicons name="chevron-forward" size={13} color={TEXT.tertiary} />
          </View>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: Fonts.bold, fontSize: 10, color: TEXT.tertiary, letterSpacing: 2 },
  counter: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  itemName: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  itemNameDone: { color: TEXT.tertiary },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: Spacing.sm },
  footerText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary },
  emptyTitle: {
    fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary, marginTop: 8,
  },
  emptyText: {
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary,
    lineHeight: 17, marginTop: 4,
  },
  emptyCta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10 },
  emptyCtaText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
});
