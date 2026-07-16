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
  partitionSuggested,
  orderProtocolForDisplay,
  protocolLoadHint,
  type ResolvedUserIntervention,
} from '@/src/services/interventions/intervention-service-core';
import { personalizeInterventionHow } from '@/src/services/dx/fitzpatrick-core';
import { fetchSkinType } from '@/src/services/dx/fitzpatrick-service';
import { getCurrentDX, type FunctionalDxRow } from '@/src/services/dx/dx-service';
// Motor Fase B: prescripción personalizada (top 5 "por qué a TI").
import { PrescriptionCard } from '@/src/components/interventions/PrescriptionCard';
import { getCurrentPrescription, generatePrescription } from '@/src/services/interventions/prescription-service';
import type { PrescribedIntervention } from '@/src/services/interventions/personalize-types';
import { ROOT_LABELS, type InterventionRoot } from '@/src/constants/intervention-vocab';
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
  // A.3 megahotfix 3ra pasada: motor saturado → top 10-15 visible, resto colapsado.
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  // Sprint 1.5 B (ninguna pantalla aislada): breadcrumb al DX que originó esto.
  const [dx, setDx] = useState<FunctionalDxRow | null>(null);
  // Motor Fase B: top 5 prescrito + estado del botón "Recalcular".
  const [prescriptions, setPrescriptions] = useState<PrescribedIntervention[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [prot, sugg, done, skin, currentDx, rx] = await Promise.all([
      getMyProtocol(user.id),
      getSuggestedInterventions(user.id),
      getTodayCompletions(user.id),
      fetchSkinType(user.id).catch(() => null),
      getCurrentDX(user.id).catch(() => null),
      getCurrentPrescription(user.id).catch(() => [] as PrescribedIntervention[]),
    ]);
    setProtocol(prot);
    setSuggested(sugg);
    setDoneToday(done);
    setSkinType(skin);
    setDx(currentDx);
    setPrescriptions(rx);
    setLoading(false);
  }, [user?.id]);

  // Motor Fase B: "Recalcular mi protocolo" — corre el motor con los datos más
  // recientes y refresca las 5 cards. NO se dispara solo en cada apertura
  // (arquitectura §9.1: recalcular por trigger explícito, no por consistencia).
  const onRecalculate = useCallback(async () => {
    if (!user?.id || recalculating) return;
    haptic.medium();
    setRecalculating(true);
    try {
      const rx = await generatePrescription(user.id);
      setPrescriptions(rx);
    } catch { /* fail-soft: se queda la prescripción previa */ }
    setRecalculating(false);
  }, [user?.id, recalculating]);

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

  // Motor Fase B: activar una prescrita (misma vía que activar una sugerida —
  // el motor SUGIERE, el user DECIDE · doctrina guiado no prisionero §9.2).
  const onActivatePrescription = useCallback(async (key: string) => {
    if (!user?.id || busyKey) return;
    haptic.medium();
    setBusyKey(key);
    await activateIntervention(user.id, key).catch(() => {});
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
            {/* Sprint 1.5 B (ninguna pantalla aislada): origen visible — estas
                intervenciones no salen de la nada, vienen del DX. */}
            {dx && (
              <Animated.View entering={FadeInUp.delay(20).springify()}>
                <AnimatedPressable
                  onPress={() => { haptic.light(); router.push('/salud/diagnostico' as any); }}
                  style={styles.dxBreadcrumb}
                >
                  <EliteText style={styles.dxBreadcrumbText} numberOfLines={2}>
                    Estas intervenciones vienen de tu Diagnóstico Funcional (Nivel {dx.quality_level})
                    {(() => {
                      const top = [...(dx.roots_detected ?? [])].sort((a: any, b: any) => (b.severity ?? 0) - (a.severity ?? 0))[0] as any;
                      const label = top ? (ROOT_LABELS[top.root_key as InterventionRoot] ?? top.root_key) : null;
                      return label ? ` — raíz principal: ${label}` : '';
                    })()}
                  </EliteText>
                  <EliteText style={styles.dxBreadcrumbLink}>Ver mi DX ↗</EliteText>
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* ── TUS PRESCRITAS POR ATP · motor de personalización (Fase B) ── */}
            {(() => {
              const activeKeys = new Set(protocol.map((p) => p.row.intervention_key));
              const contextNote = prescriptions.find((p) => p.contextNote)?.contextNote;
              return (
                <Animated.View entering={FadeInUp.delay(30).springify()}>
                  <View style={styles.rxHeaderRow}>
                    <SectionTitle containerStyle={{ marginBottom: 0 }}>
                      {`TUS PRESCRITAS POR ATP${prescriptions.length ? ` · ${prescriptions.length}` : ''}`}
                    </SectionTitle>
                    <AnimatedPressable
                      onPress={onRecalculate}
                      disabled={recalculating}
                      style={styles.recalcBtn}
                      hitSlop={6}
                    >
                      {recalculating
                        ? <ActivityIndicator size="small" color={ATP_BRAND.lime} />
                        : <Ionicons name="refresh" size={13} color={ATP_BRAND.lime} />}
                      <EliteText style={styles.recalcText}>
                        {recalculating ? 'Calculando…' : 'Recalcular'}
                      </EliteText>
                    </AnimatedPressable>
                  </View>

                  {prescriptions.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <EliteText style={styles.emptyText}>
                        ATP aún no ha calculado tu prescripción. Toca “Recalcular” para que
                        el motor lea tu fenotipo (DX, Braverman, labs, ciclo) y elija las 5
                        que más mueven la aguja para ti.
                      </EliteText>
                    </View>
                  ) : (
                    <>
                      {prescriptions.map((rx, idx) => (
                        <PrescriptionCard
                          key={`${rx.intervention.key}-${rx.rank}`}
                          prescription={rx}
                          index={idx}
                          isActive={activeKeys.has(rx.intervention.key)}
                          busy={busyKey === rx.intervention.key}
                          onActivate={onActivatePrescription}
                          onOpenDetail={(key) => { haptic.light(); router.push(`/salud/intervenciones/${key}` as any); }}
                        />
                      ))}
                      {/* B.5 · warning del motor (doctrina Humby 9+ activas) */}
                      {contextNote && (
                        <View style={styles.contextNote}>
                          <Ionicons name="alert-circle-outline" size={15} color="#F59E0B" />
                          <EliteText style={styles.contextNoteText}>{contextNote}</EliteText>
                        </View>
                      )}
                      {/* B.4 · copy de cierre "las otras 83 existen pero no mueven la aguja" */}
                      <EliteText style={styles.rxClosing}>
                        Estas son las {prescriptions.length} que ATP prioriza para tu perfil hoy.
                        Las demás del catálogo existen y son válidas, pero para tu fenotipo actual
                        no mueven la aguja tanto. Cuando subas de nivel o cambien tus datos, ATP recalcula.
                      </EliteText>
                    </>
                  )}
                </Animated.View>
              );
            })()}

            {/* ── MI PROTOCOLO (activas) ── */}
            <Animated.View entering={FadeInUp.delay(40).springify()}>
              <SectionTitle containerStyle={{ marginTop: Spacing.xl }}>MI PROTOCOLO</SectionTitle>
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
              {/* 1.5-D: universales P1 SIEMPRE arriba (base no negociable). */}
              {orderProtocolForDisplay(protocol).map((item, idx) => {
                const done = doneToday.has(item.row.id);
                const time = effectiveTime(item.row);
                return (
                  <Animated.View key={item.row.id} entering={FadeInUp.delay(60 + Math.min(idx, 10) * 40).springify()}>
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

            {/* 1.5-D UX progresiva (sin límite duro): cuenta el TOTAL de activas. */}
            {(() => {
              const load = protocolLoadHint(protocol);
              if (load.hint === 'soft') {
                return (
                  <EliteText style={styles.humbyHint}>
                    Trabajas {load.activeCount} · ATP recomienda enfocarte
                    en 5-7 para lograr consistencia.
                  </EliteText>
                );
              }
              if (load.hint === 'strong') {
                return (
                  <EliteText style={[styles.humbyHint, styles.humbyWarn]}>
                    Cargas {load.activeCount} intervenciones · considera
                    pausar algunas para lograr consistencia. Menos, mejor.
                  </EliteText>
                );
              }
              return null;
            })()}

            {/* ── EXPLORAR CATÁLOGO COMPLETO (colapsable) — el resto de sugeridas ── */}
            <Animated.View entering={FadeInUp.delay(140).springify()}>
              <AnimatedPressable
                onPress={() => { haptic.light(); setShowCatalog((v) => !v); }}
                style={styles.catalogToggle}
              >
                <Ionicons name="library-outline" size={15} color={TEXT.secondary} />
                <EliteText style={styles.catalogToggleText}>
                  Explorar catálogo completo{suggested.length ? ` (${suggested.length} sugeridas)` : ''}
                </EliteText>
                <Ionicons name={showCatalog ? 'chevron-up' : 'chevron-down'} size={15} color={TEXT.secondary} />
              </AnimatedPressable>
              {showCatalog && suggested.length === 0 && (
                <View style={styles.emptyBox}>
                  <EliteText style={styles.emptyText}>
                    No hay sugerencias pendientes. Genera o actualiza tu Diagnóstico
                    Funcional para que el motor detecte nuevas raíces.
                  </EliteText>
                </View>
              )}
              {showCatalog && (() => {
                const { top, rest } = partitionSuggested(suggested);
                const visible = showAllSuggested ? [...top, ...rest] : top;
                return (
                  <>
                    {visible.map((item, idx) => (
                      <Animated.View key={item.row.id} entering={FadeInUp.delay(160 + Math.min(idx, 12) * 40).springify()}>
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
                    {rest.length > 0 && (
                      <AnimatedPressable
                        onPress={() => { haptic.light(); setShowAllSuggested(v => !v); }}
                        style={styles.showAllBtn}
                      >
                        <EliteText style={styles.showAllText}>
                          {showAllSuggested ? 'Ver menos' : `Ver todas las sugerencias (${rest.length} más)`}
                        </EliteText>
                        <Ionicons
                          name={showAllSuggested ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={TEXT.secondary}
                        />
                      </AnimatedPressable>
                    )}
                  </>
                );
              })()}
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
  dxBreadcrumb: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  dxBreadcrumbText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, lineHeight: 16 },
  dxBreadcrumbLink: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  humbyHint: {
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary,
    lineHeight: 17, marginTop: Spacing.sm, paddingHorizontal: 2,
  },
  humbyWarn: { color: '#F59E0B', fontFamily: Fonts.semiBold },
  // Motor Fase B
  rxHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  recalcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  recalcText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: ATP_BRAND.lime },
  rxClosing: {
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary,
    lineHeight: 17, marginTop: Spacing.sm, marginBottom: Spacing.xs, fontStyle: 'italic',
  },
  contextNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: withOpacity('#F59E0B', 0.08), borderWidth: 0.5, borderColor: withOpacity('#F59E0B', 0.3),
    borderRadius: Radius.md, padding: Spacing.sm, marginTop: 4,
  },
  contextNoteText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: '#F5C77E', lineHeight: 16 },
  catalogToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.xl, marginBottom: Spacing.sm,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  catalogToggleText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
  showAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, paddingVertical: 10, marginTop: 4,
  },
  showAllText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: TEXT.secondary },
});
