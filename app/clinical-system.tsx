/**
 * Drill-down de sistema funcional — Historia Clínica (F3 sprint UX blockers V1.3).
 *
 * Ruta: /clinical-system?system=<FunctionalSystemKey>
 * Muestra: síntomas activos con registro rápido de severidad + timeline,
 * correlación con labs del sistema (lab_values canónico) y resueltos.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, DeviceEventEmitter, LayoutAnimation,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import {
  FUNCTIONAL_SYSTEM_BY_KEY,
  SEVERITY_LABELS,
  severityColor,
  type FunctionalSystemKey,
} from '@/src/constants/functional-systems';
import {
  loadSymptoms,
  loadSymptomLogs,
  logSeverity,
  setSymptomResolved,
  type ClinicalSymptom,
  type SymptomLog,
} from '@/src/services/clinical-history-service';
import {
  loadCanonicalLabValues,
  collapseLanguageDuplicates,
  type CanonicalMap,
} from '@/src/services/edad-atp/lab-values-service';

/** parameter_key → nombre legible (fallback: humanizar la key) */
function humanizeLabKey(key: string): string {
  const clean = key.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClinicalSystemScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ system?: string }>();
  const systemKey = (params.system ?? 'energia') as FunctionalSystemKey;
  const sys = FUNCTIONAL_SYSTEM_BY_KEY[systemKey] ?? FUNCTIONAL_SYSTEM_BY_KEY.energia;

  const [symptoms, setSymptoms] = useState<ClinicalSymptom[]>([]);
  const [labs, setLabs] = useState<CanonicalMap>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logsBySymptom, setLogsBySymptom] = useState<Record<string, SymptomLog[]>>({});
  const [pendingSeverity, setPendingSeverity] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const [rows, labMap] = await Promise.all([
      loadSymptoms(user.id),
      loadCanonicalLabValues(user.id),
    ]);
    setSymptoms(rows.filter(r => r.system_key === sys.key));
    setLabs(collapseLanguageDuplicates(labMap));
  }, [user?.id, sys.key]);

  useEffect(() => {
    reload();
    const sub = DeviceEventEmitter.addListener('clinical_history_changed', reload);
    return () => sub.remove();
  }, [reload]);

  const active = symptoms.filter(x => x.status === 'active');
  const resolved = symptoms.filter(x => x.status === 'resolved');
  const relatedLabRows = sys.relatedLabs
    .filter(k => labs[k])
    .map(k => ({ key: k, ...labs[k] }));

  const toggleSymptom = async (sym: ClinicalSymptom) => {
    haptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const opening = expandedId !== sym.id;
    setExpandedId(opening ? sym.id : null);
    setPendingSeverity(opening ? sym.severity : null);
    if (opening && !logsBySymptom[sym.id]) {
      const logs = await loadSymptomLogs(sym.id);
      setLogsBySymptom(prev => ({ ...prev, [sym.id]: logs }));
    }
  };

  const submitSeverity = async (sym: ClinicalSymptom) => {
    if (!user?.id || pendingSeverity == null || busy) return;
    setBusy(true);
    const ok = await logSeverity(user.id, sym.id, pendingSeverity);
    setBusy(false);
    if (ok) {
      haptic.success();
      const logs = await loadSymptomLogs(sym.id);
      setLogsBySymptom(prev => ({ ...prev, [sym.id]: logs }));
    }
  };

  const resolve = async (sym: ClinicalSymptom, value: boolean) => {
    if (busy) return;
    setBusy(true);
    const ok = await setSymptomResolved(sym.id, value);
    setBusy(false);
    if (ok) haptic.success();
  };

  const renderSymptom = (sym: ClinicalSymptom, isResolved: boolean) => {
    const isOpen = expandedId === sym.id;
    const logs = logsBySymptom[sym.id] ?? [];
    return (
      <View key={sym.id} style={{
        backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
        borderRadius: 14, marginBottom: 8, overflow: 'hidden',
      }}>
        <Pressable
          onPress={() => toggleSymptom(sym)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.md }}
        >
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: isResolved ? TEXT.muted : severityColor(sym.severity),
          }} />
          <View style={{ flex: 1 }}>
            <Text style={{
              color: isResolved ? TEXT.secondary : TEXT.primary,
              fontSize: FontSizes.md, fontFamily: Fonts.semiBold,
              textDecorationLine: isResolved ? 'line-through' : 'none',
            }}>
              {sym.name}
            </Text>
            <Text style={{ color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.regular, marginTop: 1 }}>
              {isResolved
                ? `Resuelto ${sym.resolved_at ? formatDate(sym.resolved_at) : ''}`
                : `${SEVERITY_LABELS[sym.severity]} · desde ${sym.first_seen ? formatDate(sym.first_seen) : '—'}`}
            </Text>
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT.tertiary} />
        </Pressable>

        {isOpen && (
          <View style={{
            paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
            borderTopWidth: 1, borderTopColor: '#141414', paddingTop: Spacing.sm,
          }}>
            {!isResolved && (
              <>
                <Text style={{
                  color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold,
                  letterSpacing: 2, marginBottom: 8,
                }}>
                  REGISTRAR SEVERIDAD HOY
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <Pressable
                      key={lvl}
                      onPress={() => { haptic.light(); setPendingSeverity(lvl); }}
                      style={{
                        flex: 1, height: 38, borderRadius: 10, borderWidth: 1,
                        borderColor: pendingSeverity === lvl ? severityColor(lvl) : '#222',
                        backgroundColor: pendingSeverity === lvl ? withOpacity(severityColor(lvl), 0.15) : '#0a0a0a',
                        justifyContent: 'center', alignItems: 'center',
                      }}
                    >
                      <Text style={{
                        color: pendingSeverity === lvl ? severityColor(lvl) : TEXT.secondary,
                        fontSize: 14, fontFamily: Fonts.bold,
                      }}>
                        {lvl}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <AnimatedPressable
                    onPress={() => submitSeverity(sym)}
                    disabled={busy || pendingSeverity === sym.severity}
                    style={{
                      flex: 1, backgroundColor: withOpacity(sys.color, 0.15), borderRadius: 10,
                      paddingVertical: 10, alignItems: 'center',
                      borderWidth: 1, borderColor: withOpacity(sys.color, 0.4),
                    }}
                  >
                    <Text style={{ color: sys.color, fontSize: 12, fontFamily: Fonts.bold }}>REGISTRAR</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => resolve(sym, true)}
                    disabled={busy}
                    style={{
                      flex: 1, backgroundColor: '#0a0a0a', borderRadius: 10,
                      paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#222',
                    }}
                  >
                    <Text style={{ color: TEXT.secondary, fontSize: 12, fontFamily: Fonts.semiBold }}>
                      Marcar resuelto
                    </Text>
                  </AnimatedPressable>
                </View>
              </>
            )}
            {isResolved && (
              <AnimatedPressable
                onPress={() => resolve(sym, false)}
                disabled={busy}
                style={{
                  backgroundColor: '#0a0a0a', borderRadius: 10, paddingVertical: 10,
                  alignItems: 'center', borderWidth: 1, borderColor: '#222',
                }}
              >
                <Text style={{ color: TEXT.secondary, fontSize: 12, fontFamily: Fonts.semiBold }}>Reabrir síntoma</Text>
              </AnimatedPressable>
            )}

            {/* Timeline */}
            {logs.length > 0 && (
              <View style={{ marginTop: Spacing.md }}>
                <Text style={{
                  color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold,
                  letterSpacing: 2, marginBottom: 6,
                }}>
                  HISTORIAL
                </Text>
                {logs.slice(0, 6).map(log => (
                  <View key={log.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <View style={{
                      width: 6, height: 6, borderRadius: 3, backgroundColor: severityColor(log.severity),
                    }} />
                    <Text style={{ color: '#ccc', fontSize: 12, fontFamily: Fonts.regular, flex: 1 }}>
                      {SEVERITY_LABELS[log.severity]}
                      {log.note ? ` — ${log.note}` : ''}
                    </Text>
                    <Text style={{ color: TEXT.muted, fontSize: 11, fontFamily: Fonts.regular }}>
                      {formatDate(log.logged_at)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ELEVATION[0].bg }}
      contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: Spacing.md }}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, marginBottom: Spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()} style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>{sys.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: sys.color, fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2,
              }}>
                SISTEMA FUNCIONAL
              </Text>
              <Text style={{ color: TEXT.primary, fontSize: 24, fontFamily: Fonts.extraBold }}>{sys.name}</Text>
            </View>
          </View>
          <Text style={{ color: TEXT.secondary, fontSize: 13, fontFamily: Fonts.regular, marginTop: 6 }}>
            {sys.scope}
          </Text>
        </Animated.View>
      </View>

      {/* Síntomas activos */}
      <Animated.View entering={FadeInUp.delay(80).springify()}>
        <SectionTitle>Síntomas activos</SectionTitle>
        {active.length === 0 && (
          <Text style={{ color: TEXT.muted, fontSize: 13, fontFamily: Fonts.regular, marginBottom: Spacing.md }}>
            Sin síntomas activos. Regístralos desde Historia Clínica.
          </Text>
        )}
        {active.map(sym => renderSymptom(sym, false))}
      </Animated.View>

      {/* Correlación con labs */}
      <Animated.View entering={FadeInUp.delay(140).springify()} style={{ marginTop: Spacing.lg }}>
        <SectionTitle>Labs del sistema</SectionTitle>
        {relatedLabRows.length === 0 && (
          <Text style={{ color: TEXT.muted, fontSize: 13, fontFamily: Fonts.regular }}>
            Sin labs registrados para este sistema. Sube tus estudios en Laboratorios.
          </Text>
        )}
        {relatedLabRows.map(row => (
          <View key={row.key} style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
            borderRadius: 12, padding: 12, marginBottom: 6,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ccc', fontSize: 13, fontFamily: Fonts.semiBold }}>
                {humanizeLabKey(row.key)}
              </Text>
              <Text style={{ color: TEXT.muted, fontSize: 11, fontFamily: Fonts.regular }}>
                {formatDate(row.measured_at)}
              </Text>
            </View>
            {row.is_stale && (
              <View style={{
                backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 8,
                paddingHorizontal: 8, paddingVertical: 3,
              }}>
                <Text style={{ color: '#fbbf24', fontSize: 10, fontFamily: Fonts.semiBold }}>DESACTUALIZADO</Text>
              </View>
            )}
            <Text style={{ color: sys.color, fontSize: 15, fontFamily: Fonts.bold }}>{row.value}</Text>
          </View>
        ))}
        <Pressable
          onPress={() => router.push('/edad-atp/labs')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 }}
          hitSlop={6}
        >
          <Text style={{ color: sys.color, fontSize: 12, fontFamily: Fonts.semiBold }}>Ver todos los labs</Text>
          <Ionicons name="chevron-forward" size={13} color={sys.color} />
        </Pressable>
      </Animated.View>

      {/* Resueltos */}
      {resolved.length > 0 && (
        <Animated.View entering={FadeInUp.delay(200).springify()} style={{ marginTop: Spacing.lg }}>
          <SectionTitle>Resueltos</SectionTitle>
          {resolved.map(sym => renderSymptom(sym, true))}
        </Animated.View>
      )}

      <MedicalDisclaimer feature="health" />
    </ScrollView>
  );
}
