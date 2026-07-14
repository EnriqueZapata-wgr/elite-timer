/**
 * Intervenciones (dx-f3) — "Mi Protocolo" completo + "Sugeridas para ti".
 *
 * Mi Protocolo = activas (completar hoy + pausar). Sugeridas = output del motor
 * determinístico (score/orden del match; universales marcadas como BASE).
 * Pull-to-refresh corre syncSuggestedInterventions. Patrón visual de
 * app/salud/diagnostico/index.tsx (header, safe area, tokens).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, DeviceEventEmitter, RefreshControl, ScrollView, StyleSheet, View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { PrioritySemaphore, type SemaphorePriority } from '@/src/components/interventions/PrioritySemaphore';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  activateIntervention,
  deactivateIntervention,
  getMyProtocol,
  getSuggestedInterventions,
  getTodayCompletions,
  logCompletion,
  syncSuggestedInterventions,
  INTERVENTIONS_CHANGED_EVENT,
} from '@/src/services/interventions/intervention-service';
import {
  effectiveTime,
  type ResolvedUserIntervention,
} from '@/src/services/interventions/intervention-service-core';
import { personalizeInterventionHow } from '@/src/services/dx/fitzpatrick-core';
import { fetchSkinType } from '@/src/services/dx/fitzpatrick-service';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

export default function IntervencionesScreen() {
  const { user } = useAuth();
  const [protocol, setProtocol] = useState<ResolvedUserIntervention[]>([]);
  const [suggested, setSuggested] = useState<ResolvedUserIntervention[]>([]);
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<number | null>(null);
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [prot, sugg, done, skin] = await Promise.all([
      getMyProtocol(user.id),
      getSuggestedInterventions(user.id),
      getTodayCompletions(user.id),
      fetchSkinType(user.id).catch(() => null),
    ]);
    setProtocol(prot);
    setSuggested(sugg);
    setDoneToday(done);
    setSkinType(skin);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (startedRef.current || !user?.id) return;
    startedRef.current = true;
    // Primer entry: sync (idempotente) y luego carga.
    syncSuggestedInterventions(user.id)
      .catch(() => {})
      .finally(() => load().catch(() => setLoading(false)));
    const sub = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => {
      load().catch(() => {});
    });
    return () => sub.remove();
  }, [user?.id, load]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await syncSuggestedInterventions(user.id).catch(() => {});
    await load().catch(() => {});
    setRefreshing(false);
  }, [user?.id, load]);

  const onComplete = useCallback(async (item: ResolvedUserIntervention) => {
    if (!user?.id || doneToday.has(item.row.id)) return;
    haptic.success();
    setDoneToday(prev => new Set(prev).add(item.row.id)); // optimista
    const ok = await logCompletion(user.id, item.row.id);
    if (!ok) {
      setDoneToday(prev => {
        const next = new Set(prev);
        next.delete(item.row.id);
        return next;
      });
    }
  }, [user?.id, doneToday]);

  const onPause = useCallback(async (item: ResolvedUserIntervention) => {
    if (!user?.id) return;
    haptic.light();
    await deactivateIntervention(user.id, item.row.intervention_key);
  }, [user?.id]);

  const onActivate = useCallback(async (item: ResolvedUserIntervention) => {
    if (!user?.id || busyKey) return;
    haptic.medium();
    setBusyKey(item.row.intervention_key);
    await activateIntervention(user.id, item.row.intervention_key);
    setBusyKey(null);
  }, [user?.id, busyKey]);

  const openDetail = (item: ResolvedUserIntervention) => {
    haptic.light();
    router.push(`/salud/intervenciones/${item.row.intervention_key}` as any);
  };

  return (
    <MedicalDisclaimerGate>
      <Screen edges={[]}>
        <ScreenHeader title="Mi Protocolo" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />
            }
          >
            {/* ── MI PROTOCOLO (activas) ── */}
            <Animated.View entering={FadeInUp.delay(40).springify()}>
              <SectionTitle>MI PROTOCOLO</SectionTitle>
              {protocol.length === 0 && (
                <View style={styles.emptyBox}>
                  <EliteText style={styles.emptyText}>
                    Aún no tienes intervenciones activas. Activa las sugeridas de abajo
                    para armar tu protocolo — sin límite.
                  </EliteText>
                </View>
              )}
              {/* B.4 — narrativa ARGOS del porqué (cobro server-side, cache por set) */}
              {protocol.length > 0 && (
                <AnimatedPressable
                  onPress={() => { haptic.light(); router.push('/salud/intervenciones/rationale' as any); }}
                  style={styles.rationaleBtn}
                >
                  <Ionicons name="sparkles-outline" size={14} color={ATP_BRAND.lime} />
                  <EliteText style={styles.rationaleBtnText}>¿Por qué estas intervenciones?</EliteText>
                  <Ionicons name="chevron-forward" size={13} color={ATP_BRAND.lime} />
                </AnimatedPressable>
              )}
              {protocol.map((item, idx) => {
                const done = doneToday.has(item.row.id);
                const time = effectiveTime(item.row);
                return (
                  <Animated.View key={item.row.id} entering={FadeInUp.delay(60 + idx * 40).springify()}>
                    <AnimatedPressable onPress={() => openDetail(item)} style={styles.rowCard}>
                      <PrioritySemaphore priority={item.row.priority as SemaphorePriority} />
                      <View style={{ flex: 1 }}>
                        <EliteText style={styles.rowName} numberOfLines={1}>{item.def.name}</EliteText>
                        <EliteText style={styles.rowMeta} numberOfLines={1}>
                          {time ? `⏰ ${time} · ` : ''}{personalizeInterventionHow(item.row.intervention_key, item.def.how, skinType)}
                        </EliteText>
                      </View>
                      <AnimatedPressable
                        onPress={() => onPause(item)}
                        style={styles.iconBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="pause" size={16} color={TEXT.tertiary} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => onComplete(item)}
                        disabled={done}
                        style={[styles.checkBtn, done && styles.checkBtnDone]}
                        hitSlop={6}
                      >
                        <Ionicons name="checkmark" size={18} color={done ? '#000' : TEXT.secondary} />
                      </AnimatedPressable>
                    </AnimatedPressable>
                  </Animated.View>
                );
              })}
            </Animated.View>

            {/* ── SUGERIDAS PARA TI (motor) ── */}
            <Animated.View entering={FadeInUp.delay(140).springify()}>
              <SectionTitle containerStyle={{ marginTop: Spacing.xl }}>SUGERIDAS PARA TI</SectionTitle>
              {suggested.length === 0 && (
                <View style={styles.emptyBox}>
                  <EliteText style={styles.emptyText}>
                    No hay sugerencias pendientes. Genera o actualiza tu Diagnóstico
                    Funcional para que el motor detecte nuevas raíces.
                  </EliteText>
                </View>
              )}
              {suggested.map((item, idx) => (
                <Animated.View key={item.row.id} entering={FadeInUp.delay(160 + idx * 40).springify()}>
                  <AnimatedPressable onPress={() => openDetail(item)} style={styles.rowCard}>
                    <PrioritySemaphore priority={item.row.priority as SemaphorePriority} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <EliteText style={styles.rowName} numberOfLines={1}>{item.def.name}</EliteText>
                        {item.row.is_universal && (
                          <View style={styles.baseBadge}>
                            <EliteText style={styles.baseBadgeText}>BASE</EliteText>
                          </View>
                        )}
                      </View>
                      <EliteText style={styles.rowMeta} numberOfLines={2}>{item.def.benefit}</EliteText>
                    </View>
                    <AnimatedPressable
                      onPress={() => onActivate(item)}
                      disabled={busyKey === item.row.intervention_key}
                      style={styles.activateBtn}
                      hitSlop={4}
                    >
                      <EliteText style={styles.activateText}>Activar</EliteText>
                    </AnimatedPressable>
                  </AnimatedPressable>
                </Animated.View>
              ))}
            </Animated.View>

            <EliteText style={styles.footHint}>
              Desliza hacia abajo para actualizar las sugerencias del motor.
            </EliteText>
          </ScrollView>
        )}
      </Screen>
    </MedicalDisclaimerGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingBottom: 60 },
  emptyBox: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  emptyText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.tertiary, lineHeight: 19 },
  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary, flexShrink: 1 },
  rowMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, marginTop: 2, lineHeight: 16 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ELEVATION[2].bg, borderWidth: 0.5, borderColor: ELEVATION[2].border,
  },
  checkBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ELEVATION[2].bg, borderWidth: 0.5, borderColor: ELEVATION[2].border,
  },
  checkBtnDone: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  baseBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  baseBadgeText: { fontFamily: Fonts.bold, fontSize: 9, color: ATP_BRAND.lime, letterSpacing: 1 },
  activateBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  activateText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: '#000' },
  footHint: {
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.muted,
    textAlign: 'center', marginTop: Spacing.lg,
  },
  rationaleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.08),
    borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.3),
    borderRadius: Radius.md, paddingVertical: 10, marginBottom: 8,
  },
  rationaleBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
});
