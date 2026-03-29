/**
 * ClientDetailScreen — Ficha de cliente en el panel de coach.
 *
 * Header + stats + 4 tabs: Calendario, Rutinas, Progreso, Historial.
 */
import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, Alert, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS, CATEGORY_COLORS, SEMANTIC } from '@/src/constants/brand';
import {
  getClientDetail,
  getClientSchedule,
  getClientRoutines,
  getClientPRs,
  getClientHistory,
  type ClientStats,
  type ClientScheduleItem,
  type ClientRoutine,
  type ClientPR,
  type ClientSession,
} from '@/src/services/coach-panel-service';
import {
  getConditionFlags, toggleConditionFlag, type ConditionFlag,
  getClientProfile, upsertClientProfile,
  getLatestMeasurements, getMeasurementHistory, addMeasurement,
  getMedications, addMedication, toggleMedication,
  getSupplements, addSupplement, toggleSupplement,
  getFamilyHistory, addFamilyHistory, deleteFamilyHistory,
} from '@/src/services/client-profile-service';
import { CONDITION_ZONES, FLAG_STATUSES, type FlagStatus } from '@/src/data/condition-catalog';
import { askAtpAI, saveAiReport, getAiReports, deleteAiReport, type AiReport } from '@/src/services/atp-ai-service';
import { getClientHabits, addHabit, updateHabit, deleteHabit, type DailyHabit } from '@/src/services/daily-habits-service';
import { calculateAndSaveScore, getLatestScore } from '@/src/services/health-score-service';
import { getLabHistory, approveLabResult, deleteLabResult, deleteLabUpload, getFailedUploads, uploadLabFile, extractLabValues, type LabResult as LabResultType, type LabUpload } from '@/src/services/lab-service';
import { RATING_COLORS, type HealthScore as FHScore } from '@/src/data/functional-health-engine';
import { rateLabValue, rateBodyValue, rateBioValue, type ValueRating } from '@/src/utils/lab-rating';
import type { Sex } from '@/src/data/functional-health-engine';
import { DayCalendar } from '@/src/components/DayCalendar';
import {
  startConsultation, getConsultations, getConsultation, updateConsultation,
  completeConsultation, deleteConsultation, type Consultation,
} from '@/src/services/consultation-service';
import { AssignRoutineModal } from './AssignRoutineModal';
import {
  getStudies, createStudy, deleteStudy, updateStudy, interpretStudy, markAsReviewed,
  addFileToStudy, type ClinicalStudy,
} from '@/src/services/clinical-study-service';
import { STUDY_TYPES, STUDY_CATEGORIES, getStudyType } from '@/src/data/study-types';
import {
  getActivePlan, createPlan, updatePlan, getFoodLogsRange, getHydrationForUser,
  getDailyScoresRange, getFastingLogsRange, updateFoodLog, deleteFoodLog, suggestMealForDeficit,
  type NutritionPlan, type FoodLog, type DailyNutritionScore,
} from '@/src/services/nutrition-service';
import { SectionSaveHeader } from '@/src/components/coach/SectionSaveHeader';
import { SaveableSection } from '@/src/components/coach/SaveableSection';

const TEAL = CATEGORY_COLORS.metrics;
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// Mapeo: PostgreSQL DOW (0=Dom) → columna del grid (0=Lun)
const DOW_TO_COL = [6, 0, 1, 2, 3, 4, 5]; // Dom=6, Lun=0...Sáb=5

type Tab = 'profile' | 'consultations' | 'nutrition' | 'labs' | 'studies' | 'calendar' | 'routines' | 'progress' | 'history';

interface Props {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  connectedAt: string;
}

export function ClientDetailScreen({ clientId, clientName, clientEmail, connectedAt }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [schedule, setSchedule] = useState<ClientScheduleItem[]>([]);
  const [routines, setRoutines] = useState<ClientRoutine[]>([]);
  const [prs, setPRs] = useState<ClientPR[]>([]);
  const [history, setHistory] = useState<ClientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignVisible, setAssignVisible] = useState(false);
  const [flags, setFlags] = useState<ConditionFlag[]>([]);
  const [aiVisible, setAiVisible] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [aiReports, setAiReports] = useState<AiReport[]>([]);
  const [aiShowHistory, setAiShowHistory] = useState(false);
  const [aiExpandedReport, setAiExpandedReport] = useState<string | null>(null);

  const loadAiReports = async () => {
    try { setAiReports(await getAiReports(clientId)); } catch { /* */ }
  };

  const handleAskAI = async (question?: string) => {
    setAiLoading(true);
    setAiResult('');
    setAiSaved(false);
    try {
      const result = await askAtpAI(clientId, question?.trim() || undefined);
      setAiResult(result);
    } catch (err: any) {
      setAiResult(`Error: ${err.message ?? 'No se pudo generar el análisis'}`);
    }
    setAiLoading(false);
  };

  const handleSaveAiReport = async () => {
    if (!aiResult || aiSaved) return;
    try {
      await saveAiReport(clientId, aiResult, aiQuestion.trim() || undefined);
      setAiSaved(true);
      loadAiReports();
    } catch { /* */ }
  };

  const handleDeleteAiReport = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('¿Eliminar este reporte?')) return;
    try { await deleteAiReport(id); loadAiReports(); } catch { /* */ }
  };

  useEffect(() => { loadData(); }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, sc, r, p, h, f] = await Promise.all([
        getClientDetail(clientId).catch(() => null),
        getClientSchedule(clientId).catch(() => []),
        getClientRoutines(clientId).catch(() => []),
        getClientPRs(clientId).catch(() => []),
        getClientHistory(clientId).catch(() => []),
        getConditionFlags(clientId).catch(() => []),
      ]);
      setStats(s);
      setSchedule(sc);
      setRoutines(r);
      setPRs(p);
      setHistory(h);
      setFlags(f);
    } finally { setLoading(false); }
  };

  const initials = clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const TABS: { key: Tab; label: string; icon: string; lib?: 'mci' }[] = [
    { key: 'profile', label: 'PERFIL', icon: 'person-outline' },
    { key: 'consultations', label: 'CONSULTAS', icon: 'clipboard-text-outline', lib: 'mci' },
    { key: 'nutrition', label: 'NUTRICIÓN', icon: 'restaurant-outline' },
    { key: 'labs', label: 'LABS', icon: 'flask-outline', lib: 'mci' },
    { key: 'studies', label: 'ESTUDIOS', icon: 'document-text-outline' },
    { key: 'calendar', label: 'CALENDARIO', icon: 'calendar-outline' },
    { key: 'routines', label: 'RUTINAS', icon: 'barbell-outline' },
    { key: 'progress', label: 'PROGRESO', icon: 'trending-up-outline' },
    { key: 'history', label: 'HISTORIAL', icon: 'time-outline' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.avatarLg}>
            <EliteText style={styles.avatarLgText}>{initials}</EliteText>
          </View>
          <View style={styles.headerInfo}>
            <EliteText variant="title" style={styles.headerName}>{clientName}</EliteText>
            <EliteText variant="caption" style={styles.headerSince}>
              Conectado desde {new Date(connectedAt).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </EliteText>
          </View>
          <Pressable onPress={() => setAiVisible(true)} style={styles.aiBtn}>
            <Ionicons name="sparkles" size={14} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.aiBtnText}>ATP AI</EliteText>
          </Pressable>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <EliteText variant="caption" style={styles.activeText}>Activo</EliteText>
          </View>
        </View>

        {/* ── Stats ── */}
        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginVertical: Spacing.lg }} />
        ) : stats && (
          <View style={styles.statsRow}>
            <StatCard label="Sesiones" value={String(stats.sessions_this_month)} sub="este mes" color={TEAL} />
            <StatCard label="Condiciones" value={stats.conditions_present > 0 || stats.conditions_observation > 0 ? `${stats.conditions_present}🔴 ${stats.conditions_observation}🟡` : '0'} sub="activas" color={SEMANTIC.error} />
            <StatCard label="Consultas" value={String(stats.total_consultations)} sub="totales" color={SEMANTIC.info} />
            <StatCard label="Racha" value={String(stats.streak_days)} sub="días" color={Colors.neonGreen} />
          </View>
        )}

        {/* ── Tabs ── */}
        <View style={styles.tabsRow}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
            >
              {t.lib === 'mci'
                ? <MaterialCommunityIcons name={t.icon as any} size={16} color={activeTab === t.key ? TEAL : TEXT_COLORS.muted} />
                : <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? TEAL : TEXT_COLORS.muted} />
              }
              <EliteText variant="caption" style={[styles.tabLabel, activeTab === t.key && { color: TEAL }]}>
                {t.label}
              </EliteText>
            </Pressable>
          ))}
        </View>

        {/* ── Tab Content ── */}
        {!loading && (
          <View style={styles.tabContent}>
            {activeTab === 'profile' && (
              <ProfileTab
                clientId={clientId}
                clientName={clientName}
                clientEmail={clientEmail ?? ''}
                connectedAt={connectedAt}
                flags={flags}
                onFlagToggle={async (key, zone) => {
                  const newStatus = await toggleConditionFlag(clientId, key, zone);
                  setFlags(prev => {
                    const existing = prev.find(f => f.condition_key === key);
                    if (existing) return prev.map(f => f.condition_key === key ? { ...f, status: newStatus } : f);
                    return [...prev, { condition_key: key, zone, status: newStatus, notes: null, diagnosed_date: null, lab_value: null, medication: null }];
                  });
                }}
              />
            )}
            {activeTab === 'consultations' && (
              <ConsultationsTab clientId={clientId} clientName={clientName} flags={flags} onFlagToggle={async (key, zone) => {
                const newStatus = await toggleConditionFlag(clientId, key, zone);
                setFlags(prev => {
                  const existing = prev.find(f => f.condition_key === key);
                  if (existing) return prev.map(f => f.condition_key === key ? { ...f, status: newStatus } : f);
                  return [...prev, { condition_key: key, zone, status: newStatus, notes: null, diagnosed_date: null, lab_value: null, medication: null }];
                });
              }} />
            )}
            {activeTab === 'nutrition' && <NutritionCoachTab clientId={clientId} />}
            {activeTab === 'labs' && <LabsTab clientId={clientId} />}
            {activeTab === 'studies' && <StudiesTab clientId={clientId} />}
            {activeTab === 'calendar' && <CalendarTab schedule={schedule} />}
            {activeTab === 'routines' && (
              <RoutinesTab routines={routines} onAssign={() => setAssignVisible(true)} />
            )}
            {activeTab === 'progress' && <ProgressTab prs={prs} />}
            {activeTab === 'history' && <HistoryTab history={history} />}
          </View>
        )}
      </View>

      {/* ═══ MODAL ATP AI ═══ */}
      <Modal visible={aiVisible} transparent animationType="fade" onRequestClose={() => setAiVisible(false)}>
        <Pressable style={styles.aiOverlay} onPress={() => !aiLoading && setAiVisible(false)}>
          <Pressable style={styles.aiModal} onPress={e => e.stopPropagation()}>
            <View style={styles.aiHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Ionicons name="sparkles" size={18} color={Colors.neonGreen} />
                <EliteText variant="label" style={{ color: Colors.neonGreen, letterSpacing: 2 }}>ATP AI</EliteText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Pressable onPress={() => { setAiShowHistory(!aiShowHistory); if (!aiShowHistory) loadAiReports(); }}>
                  <Ionicons name={aiShowHistory ? 'sparkles-outline' : 'time-outline'} size={20} color={TEXT_COLORS.secondary} />
                </Pressable>
                <Pressable onPress={() => setAiVisible(false)}>
                  <Ionicons name="close" size={22} color={TEXT_COLORS.muted} />
                </Pressable>
              </View>
            </View>

            <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, marginBottom: Spacing.sm }}>
              {aiShowHistory ? 'Historial de análisis' : `Análisis de ${clientName}`}
            </EliteText>

            {/* ── HISTORIAL ── */}
            {aiShowHistory ? (
              <ScrollView style={styles.aiResultScroll} showsVerticalScrollIndicator={false}>
                {aiReports.length === 0 ? (
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, textAlign: 'center', padding: Spacing.lg }}>
                    Sin reportes guardados
                  </EliteText>
                ) : aiReports.map(r => {
                  const isExp = aiExpandedReport === r.id;
                  return (
                    <View key={r.id} style={{ backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm, marginBottom: Spacing.sm }}>
                      <Pressable onPress={() => setAiExpandedReport(isExp ? null : r.id)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <EliteText variant="caption" style={{ color: Colors.neonGreen, fontSize: 10, fontFamily: Fonts.bold }}>
                              {new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </EliteText>
                            {r.question && (
                              <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 11, marginTop: 2 }}>
                                Pregunta: {r.question}
                              </EliteText>
                            )}
                            {!isExp && (
                              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                                {r.report.substring(0, 120)}...
                              </EliteText>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                            <Pressable onPress={() => handleDeleteAiReport(r.id)} style={{ padding: 4 }}>
                              <Ionicons name="trash-outline" size={14} color={SEMANTIC.error} />
                            </Pressable>
                            <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT_COLORS.muted} />
                          </View>
                        </View>
                      </Pressable>
                      {isExp && (
                        <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontSize: 13, lineHeight: 22, marginTop: Spacing.sm }}>
                          {r.report}
                        </EliteText>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <>
                {/* ── GENERAR NUEVO ── */}
                {!aiResult && !aiLoading && (
                  <>
                    <TextInput
                      style={styles.aiInput}
                      value={aiQuestion}
                      onChangeText={setAiQuestion}
                      placeholder="Pregunta específica (opcional)"
                      placeholderTextColor={SEMANTIC.noData}
                    />
                    <Pressable onPress={() => handleAskAI(aiQuestion)} style={styles.aiGenerateBtn}>
                      <Ionicons name="sparkles-outline" size={16} color={ATP_BRAND.black} />
                      <EliteText variant="caption" style={styles.aiGenerateBtnText}>Generar análisis</EliteText>
                    </Pressable>
                  </>
                )}

                {aiLoading && (
                  <View style={styles.aiLoadingBox}>
                    <ActivityIndicator color={Colors.neonGreen} />
                    <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, marginTop: Spacing.sm }}>
                      Analizando expediente...
                    </EliteText>
                  </View>
                )}

                {aiResult && !aiLoading && (
                  <>
                    <ScrollView style={styles.aiResultScroll} showsVerticalScrollIndicator={false}>
                      <EliteText variant="body" style={styles.aiResultText}>{aiResult}</EliteText>
                    </ScrollView>
                    <View style={styles.aiActions}>
                      <Pressable onPress={handleSaveAiReport} style={[styles.aiActionBtn, aiSaved && { opacity: 0.5 }]} disabled={aiSaved}>
                        <Ionicons name={aiSaved ? 'checkmark-circle' : 'save-outline'} size={14} color={aiSaved ? ATP_BRAND.lime : TEAL} />
                        <EliteText variant="caption" style={{ color: aiSaved ? ATP_BRAND.lime : TEAL, fontFamily: Fonts.semiBold }}>
                          {aiSaved ? 'Guardado' : 'Guardar reporte'}
                        </EliteText>
                      </Pressable>
                      <Pressable onPress={() => { setAiResult(''); setAiQuestion(''); setAiSaved(false); }} style={styles.aiActionBtn}>
                        <Ionicons name="refresh-outline" size={14} color={TEXT_COLORS.secondary} />
                        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary }}>Nueva consulta</EliteText>
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <AssignRoutineModal
        visible={assignVisible}
        onClose={() => setAssignVisible(false)}
        clientId={clientId}
        clientName={clientName}
        onAssigned={loadData}
      />
    </ScrollView>
  );
}

// ══════════════════════════
// TAB: PERFIL
// ══════════════════════════

function ProfileTab({ clientId, clientName, clientEmail, connectedAt, flags, onFlagToggle }: {
  clientId: string; clientName: string; clientEmail: string; connectedAt: string;
  flags: ConditionFlag[];
  onFlagToggle: (key: string, zone: string) => Promise<void>;
}) {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(() => {
    // Auto-expandir zonas con flags rojos o naranjas
    const active = new Set<string>();
    for (const f of flags) {
      if (f.status === 'present' || f.status === 'observation') active.add(f.zone);
    }
    return active;
  });

  const toggleZone = (zone: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone); else next.add(zone);
      return next;
    });
  };

  const getFlag = (key: string): FlagStatus => {
    return (flags.find(f => f.condition_key === key)?.status as FlagStatus) ?? 'not_evaluated';
  };

  const { width: screenW } = useWindowDimensions();
  const isWide = screenW >= 1024;

  // Perfil del cliente (objetivos, biomarcadores)
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [healthScore, setHealthScore] = useState<FHScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreExpanded, setScoreExpanded] = useState(false);

  useEffect(() => {
    getClientProfile(clientId).then(p => { setProfile(p); setProfileLoaded(true); }).catch(() => setProfileLoaded(true));
    getLatestScore(clientId).then(setHealthScore).catch(() => {});
  }, [clientId]);

  const handleRecalculate = async () => {
    setScoreLoading(true);
    try {
      const s = await calculateAndSaveScore(clientId);
      setHealthScore(s);
    } catch (err: any) { if (__DEV__) console.error('[calcScore]', err); }
    setScoreLoading(false);
  };

  const BIO_NUMERIC_KEYS = ['grip_strength_kg', 'blood_pressure_sys', 'blood_pressure_dia', 'vo2_max', 'metabolic_age_impedance'];
  const [bioSavedKey, setBioSavedKey] = useState<string | null>(null);

  const saveProfileField = async (key: string, value: string) => {
    const v = value.trim();
    try {
      const numVal = BIO_NUMERIC_KEYS.includes(key) && v ? Number(v) : undefined;
      const val = BIO_NUMERIC_KEYS.includes(key)
        ? (v && !isNaN(numVal!) ? numVal! : null)
        : (v || null);
      await upsertClientProfile(clientId, { [key]: val });
      setProfile(prev => ({ ...prev, [key]: val }));
      if (BIO_NUMERIC_KEYS.includes(key)) {
        setBioSavedKey(key);
        setTimeout(() => setBioSavedKey(prev => prev === key ? null : prev), 1500);
      }
    } catch (err: any) {
      if (__DEV__) console.error('[saveProfileField]', key, err);
    }
  };

  const renderZoneCard = (zone: typeof CONDITION_ZONES[0]) => {
    const isExpanded = expandedZones.has(zone.key);
    const redCount = zone.conditions.filter(c => getFlag(c.key) === 'present').length;
    const orangeCount = zone.conditions.filter(c => getFlag(c.key) === 'observation').length;
    const greenCount = zone.conditions.filter(c => getFlag(c.key) === 'normal').length;
    const statusDotColor = redCount > 0 ? SEMANTIC.error : orangeCount > 0 ? SEMANTIC.warning : greenCount > 0 ? ATP_BRAND.lime : SEMANTIC.noData;
    const visiblePills = isExpanded ? zone.conditions : zone.conditions.slice(0, 8);
    const hiddenCount = isExpanded ? 0 : Math.max(0, zone.conditions.length - 8);

    return (
      <View key={zone.key} style={[styles.zoneCard, { borderLeftColor: zone.color }]}>
        <Pressable onPress={() => toggleZone(zone.key)} style={styles.zoneHeader}>
          <View style={[styles.zoneDot, { backgroundColor: statusDotColor }]} />
          <EliteText variant="caption" style={[styles.zoneTitle, { color: zone.color }]}>
            {zone.label}
          </EliteText>
          {(redCount > 0 || orangeCount > 0) && (
            <View style={styles.zoneBadges}>
              {redCount > 0 && <View style={[styles.zoneBadge, { backgroundColor: SEMANTIC.error + '20' }]}><EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 9, fontFamily: Fonts.bold }}>{redCount}</EliteText></View>}
              {orangeCount > 0 && <View style={[styles.zoneBadge, { backgroundColor: SEMANTIC.warning + '20' }]}><EliteText variant="caption" style={{ color: SEMANTIC.warning, fontSize: 9, fontFamily: Fonts.bold }}>{orangeCount}</EliteText></View>}
            </View>
          )}
        </Pressable>
        <View style={styles.conditionPills}>
          {visiblePills.map(cond => {
            const status = getFlag(cond.key);
            const st = FLAG_STATUSES[status];
            return (
              <Pressable key={cond.key} onPress={() => onFlagToggle(cond.key, zone.key)}
                style={[styles.condPillSm, { backgroundColor: st.bgColor, borderColor: st.color + '40', borderStyle: status === 'not_evaluated' ? 'dashed' : 'solid' }]}>
                <EliteText variant="caption" style={{ color: st.color, fontSize: 10, fontFamily: Fonts.semiBold }}>{cond.label}</EliteText>
              </Pressable>
            );
          })}
          {hiddenCount > 0 && <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>+{hiddenCount} más</EliteText>}
        </View>
        {zone.key === 'oncologic' && zone.conditions.some(c => getFlag(c.key) === 'present') && (
          <View style={styles.oncoNoteBox}>
            <EliteText variant="caption" style={styles.oncoNoteLabel}>Nota oncológica</EliteText>
            <EliteText variant="caption" style={styles.oncoNoteHint}>
              {flags.find(f => f.zone === 'oncologic' && f.notes)?.notes || 'Long press en pill para detalles'}
            </EliteText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: 20 }}>
      {/* Banner: ir a consultas */}
      <Pressable style={styles.consultBanner}>
        <Ionicons name="information-circle-outline" size={16} color={TEAL} />
        <EliteText variant="caption" style={{ color: TEAL, flex: 1, fontSize: 11 }}>
          Los datos clínicos se actualizan desde la tab Consultas
        </EliteText>
      </Pressable>

      {/* ═══ FILA 1a: DATOS BASE ═══ */}
      <EliteText variant="caption" style={styles.rowLabel}>DATOS BASE</EliteText>
      <View style={isWide ? styles.twoColRow : { gap: Spacing.sm }}>
        <View style={isWide ? { flex: 1 } : undefined}>
          <EditableProfileCard
            clientId={clientId}
            clientName={clientName}
            clientEmail={clientEmail}
            connectedAt={connectedAt}
            profile={profile}
            profileLoaded={profileLoaded}
            onSave={saveProfileField}
          />
        </View>
        <View style={isWide ? { flex: 1 } : undefined}>
          <CollapsibleSection title="Composición y biomarcadores" clientId={clientId} type="measurements" alwaysExpanded sex={(profile?.biological_sex as Sex) ?? 'male'} />
          {/* Barra visual de contexto de peso */}
          {profileLoaded && profile?.weight_highest_kg && profile?.weight_lowest_kg && (
            <WeightContextBar
              lowest={Number(profile.weight_lowest_kg)}
              current={null}
              highest={Number(profile.weight_highest_kg)}
              ideal={profile.weight_ideal_kg ? Number(profile.weight_ideal_kg) : undefined}
            />
          )}
        </View>
      </View>

      {/* ═══ FILA 1b: BIOMARCADORES + OBJETIVOS ═══ */}
      <View style={isWide ? styles.twoColRow : { gap: Spacing.sm }}>
        <View style={isWide ? { flex: 1 } : undefined}>
          <View style={styles.profileCard}>
            <EliteText variant="caption" style={styles.profileCardLabel}>BIOMARCADORES FÍSICOS</EliteText>
            {profileLoaded && (() => {
              const sx = (profile?.biological_sex as Sex) ?? 'male';
              const sysR = rateBioValue('blood_pressure_sys', profile?.blood_pressure_sys ? Number(profile.blood_pressure_sys) : null, sx);
              const diaR = rateBioValue('blood_pressure_dia', profile?.blood_pressure_dia ? Number(profile.blood_pressure_dia) : null, sx);
              const bpColor = sysR.level !== 'no_data' ? sysR.color : diaR.level !== 'no_data' ? diaR.color : SEMANTIC.error;
              const bpRating = sysR.level !== 'no_data' ? sysR : diaR.level !== 'no_data' ? diaR : null;
              return (
              <View style={styles.bioGrid}>
                <BioField label="F. Agarre" unit="kg" color={ATP_BRAND.lime}
                  value={profile?.grip_strength_kg?.toString() ?? ''}
                  onSave={v => saveProfileField('grip_strength_kg', v)}
                  saved={bioSavedKey === 'grip_strength_kg'}
                  rating={rateBioValue('grip_strength_kg', profile?.grip_strength_kg ? Number(profile.grip_strength_kg) : null, sx)} />
                <DebouncedBPField
                  sysValue={profile?.blood_pressure_sys?.toString() ?? ''}
                  diaValue={profile?.blood_pressure_dia?.toString() ?? ''}
                  onSaveSys={v => saveProfileField('blood_pressure_sys', v)}
                  onSaveDia={v => saveProfileField('blood_pressure_dia', v)}
                  bpColor={bpColor}
                  bpRating={bpRating}
                  saved={bioSavedKey === 'blood_pressure_sys' || bioSavedKey === 'blood_pressure_dia'}
                />
                <BioField label="VO2 máx" unit="ml/kg/min" color={SEMANTIC.info}
                  value={profile?.vo2_max?.toString() ?? ''}
                  onSave={v => saveProfileField('vo2_max', v)}
                  saved={bioSavedKey === 'vo2_max'}
                  rating={rateBioValue('vo2_max', profile?.vo2_max ? Number(profile.vo2_max) : null, sx)} />
                <BioField label="Edad metab." unit="años" color={SEMANTIC.warning}
                  value={profile?.metabolic_age_impedance?.toString() ?? ''}
                  onSave={v => saveProfileField('metabolic_age_impedance', v)}
                  saved={bioSavedKey === 'metabolic_age_impedance'} />
              </View>
              );
            })()}
          </View>
        </View>
        <View style={isWide ? { flex: 1 } : undefined}>
          <View style={styles.profileCard}>
            <EliteText variant="caption" style={styles.profileCardLabel}>OBJETIVOS</EliteText>
            {profileLoaded ? (
              <View style={{ gap: Spacing.xs }}>
                <ProfileRow label="Objetivo" value={profile?.primary_goal ?? '—'} />
                <ProfileRow label="Plazo" value={profile?.goal_timeline ?? '—'} />
                {profile?.red_flags && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 }}>
                    <Ionicons name="warning-outline" size={12} color={SEMANTIC.error} />
                    <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 11 }}>{profile.red_flags}</EliteText>
                  </View>
                )}
              </View>
            ) : (
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 11 }}>Sin objetivos — definir en consulta</EliteText>
            )}
          </View>
        </View>
      </View>

      {/* ═══ ESTUDIOS RECIENTES ═══ */}
      <RecentStudies clientId={clientId} />

      {/* ═══ FILA 2: SCORES ═══ */}
      <EliteText variant="caption" style={styles.rowLabel}>SCORES DE SALUD</EliteText>
      <View style={styles.profileCard}>
        <View style={styles.scoresGrid}>
          <ScoreCard
            label="Edad biológica"
            value={healthScore?.biologicalAge ? Math.round(healthScore.biologicalAge).toString() : '—'}
            unit="años"
            color={healthScore?.biologicalAge && profile?.date_of_birth
              ? healthScore.biologicalAge < Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000) ? ATP_BRAND.lime : SEMANTIC.error
              : CATEGORY_COLORS.mind}
          />
          <ScoreCard
            label="Calidad evaluación"
            value={healthScore?.evaluationQuality != null ? `${Math.round(healthScore.evaluationQuality)}` : '—'}
            unit="%"
            color={healthScore?.evaluationQuality ? (healthScore.evaluationQuality > 70 ? ATP_BRAND.lime : healthScore.evaluationQuality > 40 ? SEMANTIC.warning : SEMANTIC.error) : TEAL}
          />
          <ScoreCard
            label="Envejecimiento"
            value={healthScore?.agingRate ? healthScore.agingRate.toFixed(2) : '—'}
            unit="x"
            color={healthScore?.agingRate ? (healthScore.agingRate < 1.0 ? ATP_BRAND.lime : healthScore.agingRate < 1.1 ? SEMANTIC.warning : SEMANTIC.error) : SEMANTIC.error}
          />
          <ScoreCard
            label="Salud funcional"
            value={healthScore?.functionalHealthScore ? Math.round(healthScore.functionalHealthScore).toString() : '—'}
            unit="/100"
            color={healthScore?.functionalHealthScore ? (healthScore.functionalHealthScore > 80 ? ATP_BRAND.lime : healthScore.functionalHealthScore > 60 ? SEMANTIC.warning : SEMANTIC.error) : TEAL}
          />
        </View>
        {/* Faltan datos para PhenoAge */}
        {healthScore && !healthScore.biologicalAge && healthScore.phenoAgeMissing && healthScore.phenoAgeMissing.length > 0 && (
          <View style={{ marginTop: Spacing.sm, backgroundColor: SURFACES.cardLight, borderRadius: 6, padding: Spacing.sm }}>
            <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontSize: 10, marginBottom: 2 }}>
              Faltan {healthScore.phenoAgeMissing.length} de 9 biomarcadores para PhenoAge:
            </EliteText>
            <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>
              {healthScore.phenoAgeMissing.join(', ')}
            </EliteText>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: Spacing.sm }}>
          <Pressable onPress={handleRecalculate} disabled={scoreLoading}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
            <Ionicons name={scoreLoading ? 'hourglass-outline' : 'refresh-outline'} size={14} color={TEAL} />
            <EliteText variant="caption" style={{ color: TEAL, fontSize: 10 }}>
              {scoreLoading ? 'Calculando...' : 'Recalcular'}
            </EliteText>
          </Pressable>
        </View>

        {/* Detalle por dominio (expandible) */}
        {healthScore && healthScore.domains.length > 0 && (
          <>
            <Pressable onPress={() => setScoreExpanded(!scoreExpanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm }}>
              <Ionicons name={scoreExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={TEXT_COLORS.muted} />
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>
                {scoreExpanded ? 'Ocultar dominios' : 'Ver 10 dominios'}
              </EliteText>
            </Pressable>
            {scoreExpanded && (
              <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
                {healthScore.domains.map(d => {
                  const sf = Math.round(d.functionalScore);
                  const ce = Math.round(d.evaluationQuality * 100);
                  const barColor = sf >= 80 ? ATP_BRAND.lime : sf >= 60 ? SEMANTIC.warning : SEMANTIC.error;
                  return (
                    <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10, width: 90 }}>{d.name}</EliteText>
                      <View style={{ flex: 1, height: 6, backgroundColor: SURFACES.cardLight, borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ width: `${sf}%`, height: '100%', backgroundColor: barColor, borderRadius: 3 }} />
                      </View>
                      <EliteText variant="caption" style={{ color: barColor, fontSize: 10, width: 25, textAlign: 'right' }}>{sf}</EliteText>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9, width: 30 }}>CE:{ce}%</EliteText>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>

      {/* ═══ FILA 3: CONDICIONES ACTIVAS (solo lectura) ═══ */}
      <EliteText variant="caption" style={styles.rowLabel}>CONDICIONES ACTIVAS</EliteText>
      {(() => {
        const activeFlags = flags.filter(f => f.status === 'observation' || f.status === 'present');
        if (activeFlags.length === 0) {
          return (
            <View style={styles.profileCard}>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, textAlign: 'center', paddingVertical: Spacing.md }}>
                Sin condiciones activas — todo normal o sin evaluar
              </EliteText>
            </View>
          );
        }
        return (
          <View style={styles.profileCard}>
            <View style={styles.conditionPills}>
              {activeFlags.map(f => {
                const st = FLAG_STATUSES[f.status as keyof typeof FLAG_STATUSES];
                return (
                  <View key={f.condition_key} style={[styles.condPillSm, { backgroundColor: st.bgColor, borderColor: st.color + '40' }]}>
                    <EliteText variant="caption" style={{ color: st.color, fontSize: 10, fontFamily: Fonts.semiBold }}>{f.condition_key}</EliteText>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* ═══ FILA 5: TRATAMIENTO (solo lectura) ═══ */}
      <EliteText variant="caption" style={styles.rowLabel}>TRATAMIENTO</EliteText>
      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginTop: -12, marginBottom: Spacing.sm }}>
        Editar desde Consultas
      </EliteText>
      <View style={isWide ? styles.threeColRow : { gap: Spacing.sm }}>
        <View style={isWide ? styles.threeColItem : undefined}>
          <CollapsibleSection title="Farmacología" clientId={clientId} type="medications" />
        </View>
        <View style={isWide ? styles.threeColItem : undefined}>
          <CollapsibleSection title="Suplementos" clientId={clientId} type="supplements" />
        </View>
        <View style={isWide ? styles.threeColItem : undefined}>
          <CollapsibleSection title="Antecedentes familiares" clientId={clientId} type="family" />
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════
// COLLAPSIBLE SECTION (measurements, meds, supps, family)
// ══════════════════════════

const RELATION_COLORS: Record<string, string> = {
  Madre: '#D4537E', Padre: SEMANTIC.info, 'Herman@': CATEGORY_COLORS.mind,
  'Abuel@': TEXT_COLORS.secondary, 'Otro': TEXT_COLORS.muted,
};

function CollapsibleSection({ title, clientId, type, alwaysExpanded, sex }: {
  title: string; clientId: string; type: 'measurements' | 'medications' | 'supplements' | 'family';
  alwaysExpanded?: boolean; sex?: Sex;
}) {
  const [expanded, setExpanded] = useState(alwaysExpanded ?? false);
  const [data, setData] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if ((expanded || alwaysExpanded) && data.length === 0) loadData(); }, [expanded, alwaysExpanded]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (type === 'measurements') {
        const [l, h] = await Promise.all([
          getLatestMeasurements(clientId).catch(() => null),
          getMeasurementHistory(clientId, 10).catch(() => []),
        ]);
        setLatest(l);
        setData(h);
      } else if (type === 'medications') {
        setData(await getMedications(clientId));
      } else if (type === 'supplements') {
        setData(await getSupplements(clientId));
      } else if (type === 'family') {
        setData(await getFamilyHistory(clientId));
      }
    } catch { /* */ }
    setLoading(false);
  };

  const handleToggleMed = async (id: string, active: boolean) => {
    await toggleMedication(id, active);
    loadData();
  };

  const handleToggleSupp = async (id: string, active: boolean) => {
    await toggleSupplement(id, active);
    loadData();
  };

  const handleDeleteFamily = async (id: string) => {
    await deleteFamilyHistory(id);
    loadData();
  };

  return (
    <View style={title ? styles.profileCard : undefined}>
      {title ? (
        <Pressable onPress={alwaysExpanded ? undefined : () => setExpanded(!expanded)} style={styles.zoneHeader}>
          <EliteText variant="body" style={styles.sectionTitle}>{title}</EliteText>
          {data.length > 0 && (
            <View style={[styles.zoneBadge, { backgroundColor: TEAL + '20' }]}>
              <EliteText variant="caption" style={{ color: TEAL, fontSize: 10, fontFamily: Fonts.bold }}>{data.length}</EliteText>
            </View>
          )}
          {!alwaysExpanded && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT_COLORS.muted} />}
        </Pressable>
      ) : null}

      {expanded && (
        <View style={{ marginTop: Spacing.sm }}>
          {loading ? <ActivityIndicator color={TEAL} size="small" /> : (
            <>
              {/* MEASUREMENTS */}
              {type === 'measurements' && (
                latest ? (
                  <View style={styles.measGrid}>
                    {[
                      { l: 'Peso (kg)', v: latest.weight_kg, k: '' },
                      { l: 'Grasa (%)', v: latest.body_fat_pct, k: 'body_fat_pct' },
                      { l: 'Músculo (kg)', v: latest.muscle_mass_kg ?? latest.muscle_mass_pct, k: 'muscle_mass_pct' },
                      { l: 'Agua (%)', v: latest.body_water_pct, k: '' },
                      { l: 'G. Visceral', v: latest.visceral_fat, k: 'visceral_fat' },
                      { l: 'Cintura (cm)', v: latest.waist_cm, k: '' },
                      { l: 'Cadera (cm)', v: latest.hip_cm, k: '' },
                      { l: 'Abdomen (cm)', v: latest.chest_cm, k: '' },
                      { l: 'Bíceps (cm)', v: latest.arm_cm, k: '' },
                      { l: 'Pierna (cm)', v: latest.leg_cm, k: '' },
                      { l: 'F. Agarre (kg)', v: latest.grip_strength_kg, k: 'grip_strength_kg' },
                      { l: 'PA sistólica', v: latest.blood_pressure_sys, k: 'blood_pressure_sys' },
                      { l: 'PA diastólica', v: latest.blood_pressure_dia, k: 'blood_pressure_dia' },
                      { l: 'VO2 máx', v: latest.vo2_max, k: 'vo2_max' },
                      { l: 'Edad metab.', v: latest.metabolic_age_impedance, k: '' },
                    ].filter(m => m.v != null).map(m => {
                      const bioKeys = ['grip_strength_kg', 'blood_pressure_sys', 'blood_pressure_dia', 'vo2_max'];
                      const rating = m.k ? (bioKeys.includes(m.k) ? rateBioValue(m.k, Number(m.v), sex ?? 'male') : rateBodyValue(m.k, Number(m.v), sex ?? 'male')) : null;
                      const hasRating = rating && rating.level !== 'no_data';
                      return (
                        <View key={m.l} style={[styles.measItem, hasRating ? { backgroundColor: rating.bgColor, borderRadius: 6, paddingHorizontal: 4 } : undefined]}>
                          <EliteText variant="caption" style={styles.measLabel}>
                            {hasRating && <EliteText style={{ fontSize: 12, color: rating.color }}>{rating.arrow} </EliteText>}
                            {m.l}
                          </EliteText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <EliteText style={[styles.measValue, hasRating ? { color: rating.color } : undefined]}>
                              {m.v ?? '—'}
                            </EliteText>
                            {hasRating && (
                              <View style={{ backgroundColor: rating.bgColor, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                                <EliteText variant="caption" style={{ color: rating.color, fontSize: 8, fontFamily: Fonts.bold }}>{rating.label}</EliteText>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <EliteText variant="caption" style={styles.emptySection}>Sin mediciones</EliteText>
                )
              )}

              {/* MEDICATIONS */}
              {type === 'medications' && (
                data.length > 0 ? data.map((m: any) => (
                  <View key={m.id} style={styles.listItem}>
                    <View style={{ flex: 1 }}>
                      <EliteText variant="body" style={styles.listItemName}>{m.name}</EliteText>
                      <EliteText variant="caption" style={styles.listItemMeta}>
                        {[m.dose, m.frequency, m.reason].filter(Boolean).join(' · ')}
                      </EliteText>
                    </View>
                    <Pressable onPress={() => handleToggleMed(m.id, m.is_active)}>
                      <View style={[styles.activePill, !m.is_active && { backgroundColor: SURFACES.disabled, borderColor: SEMANTIC.noData }]}>
                        <EliteText variant="caption" style={[styles.activePillText, !m.is_active && { color: TEXT_COLORS.muted }]}>
                          {m.is_active ? 'Activo' : 'Suspendido'}
                        </EliteText>
                      </View>
                    </Pressable>
                  </View>
                )) : (
                  <EliteText variant="caption" style={styles.emptySection}>Sin medicamentos</EliteText>
                )
              )}

              {/* SUPPLEMENTS */}
              {type === 'supplements' && (
                data.length > 0 ? data.map((s: any) => (
                  <View key={s.id} style={styles.listItem}>
                    <View style={{ flex: 1 }}>
                      <EliteText variant="body" style={styles.listItemName}>{s.name}</EliteText>
                      <EliteText variant="caption" style={styles.listItemMeta}>
                        {[s.dose, s.frequency, s.brand].filter(Boolean).join(' · ')}
                      </EliteText>
                    </View>
                    <Pressable onPress={() => handleToggleSupp(s.id, s.is_active)}>
                      <View style={[styles.activePill, !s.is_active && { backgroundColor: SURFACES.disabled, borderColor: SEMANTIC.noData }]}>
                        <EliteText variant="caption" style={[styles.activePillText, !s.is_active && { color: TEXT_COLORS.muted }]}>
                          {s.is_active ? 'Activo' : 'Suspendido'}
                        </EliteText>
                      </View>
                    </Pressable>
                  </View>
                )) : (
                  <EliteText variant="caption" style={styles.emptySection}>Sin suplementos</EliteText>
                )
              )}

              {/* FAMILY HISTORY */}
              {type === 'family' && (
                data.length > 0 ? data.map((f: any) => (
                  <View key={f.id} style={styles.listItem}>
                    <View style={[styles.relationPill, { backgroundColor: (RELATION_COLORS[f.relation] ?? TEXT_COLORS.muted) + '20' }]}>
                      <EliteText variant="caption" style={{ color: RELATION_COLORS[f.relation] ?? TEXT_COLORS.muted, fontSize: 10, fontFamily: Fonts.bold }}>
                        {f.relation}
                      </EliteText>
                    </View>
                    <EliteText variant="body" style={[styles.listItemName, { flex: 1 }]}>{f.condition}</EliteText>
                    <Pressable onPress={() => handleDeleteFamily(f.id)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={16} color={TEXT_COLORS.muted} />
                    </Pressable>
                  </View>
                )) : (
                  <EliteText variant="caption" style={styles.emptySection}>Sin antecedentes</EliteText>
                )
              )}

              {/* Botón agregar */}
              <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
                <Ionicons name="add-circle-outline" size={16} color={TEAL} />
                <EliteText variant="caption" style={styles.addBtnText}>Agregar</EliteText>
              </Pressable>

              {/* Modal agregar */}
              <AddModal
                visible={showAdd}
                type={type}
                clientId={clientId}
                onClose={() => setShowAdd(false)}
                onSaved={() => { setShowAdd(false); loadData(); }}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ══════════════════════════
// ADD MODAL
// ══════════════════════════

function AddModal({ visible, type, clientId, onClose, onSaved }: {
  visible: boolean; type: string; clientId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (type === 'measurements') {
        const nums: Record<string, number | undefined> = {};
        const bioKeys = ['grip_strength_kg', 'blood_pressure_sys', 'blood_pressure_dia', 'vo2_max', 'metabolic_age_impedance'];
        const bioData: Record<string, any> = {};
        for (const [k, v] of Object.entries(form)) {
          if (v && !isNaN(Number(v))) {
            nums[k] = Number(v);
            if (bioKeys.includes(k)) bioData[k] = Number(v);
          }
        }
        await addMeasurement(clientId, nums);
        // Sincronizar biomarcadores al perfil también
        if (Object.keys(bioData).length > 0) {
          await upsertClientProfile(clientId, bioData);
        }
      } else if (type === 'medications') {
        if (!form.name?.trim()) { setSaving(false); return; }
        await addMedication(clientId, form);
      } else if (type === 'supplements') {
        if (!form.name?.trim()) { setSaving(false); return; }
        await addSupplement(clientId, form);
      } else if (type === 'family') {
        if (!form.relation?.trim() || !form.condition?.trim()) { setSaving(false); return; }
        await addFamilyHistory(clientId, { relation: form.relation, condition: form.condition, notes: form.notes });
      }
      setForm({});
      onSaved();
    } catch { /* */ }
    setSaving(false);
  };

  const renderFields = () => {
    if (type === 'measurements') {
      const measLabels: Record<string, string> = {
        weight_kg: 'Peso (kg)', body_fat_pct: 'Grasa corporal (%)',
        muscle_mass_kg: 'Músculo (kg)', muscle_mass_pct: 'Músculo (%)',
        body_water_pct: 'Agua corporal (%)', visceral_fat: 'Grasa visceral',
        waist_cm: 'Cintura (cm)', hip_cm: 'Cadera (cm)', chest_cm: 'Abdomen (cm)',
        arm_cm: 'Bíceps contraído (cm)', leg_cm: 'Pierna (cm)',
        grip_strength_kg: 'F. Agarre (kg)', blood_pressure_sys: 'PA sistólica',
        blood_pressure_dia: 'PA diastólica', vo2_max: 'VO2 máx (ml/kg/min)',
        metabolic_age_impedance: 'Edad metabólica (años)',
      };
      return Object.entries(measLabels).map(([k, label]) => (
        <View key={k} style={styles.modalField}>
          <EliteText variant="caption" style={styles.modalFieldLabel}>{label}</EliteText>
          <TextInput style={styles.modalInput} value={form[k] ?? ''} onChangeText={v => set(k, v)}
            keyboardType="numeric" placeholderTextColor={SEMANTIC.noData} placeholder="0" />
        </View>
      ));
    }
    if (type === 'medications') {
      return ['name', 'dose', 'frequency', 'reason', 'prescriber'].map(k => (
        <View key={k} style={styles.modalField}>
          <EliteText variant="caption" style={styles.modalFieldLabel}>{k === 'name' ? 'Nombre *' : k}</EliteText>
          <TextInput style={styles.modalInput} value={form[k] ?? ''} onChangeText={v => set(k, v)}
            placeholderTextColor={SEMANTIC.noData} placeholder={k === 'name' ? 'Nombre del medicamento' : ''} />
        </View>
      ));
    }
    if (type === 'supplements') {
      return ['name', 'dose', 'frequency', 'brand', 'reason'].map(k => (
        <View key={k} style={styles.modalField}>
          <EliteText variant="caption" style={styles.modalFieldLabel}>{k === 'name' ? 'Nombre *' : k}</EliteText>
          <TextInput style={styles.modalInput} value={form[k] ?? ''} onChangeText={v => set(k, v)}
            placeholderTextColor={SEMANTIC.noData} placeholder={k === 'name' ? 'Nombre del suplemento' : ''} />
        </View>
      ));
    }
    if (type === 'family') {
      return (
        <>
          <View style={styles.modalField}>
            <EliteText variant="caption" style={styles.modalFieldLabel}>Relación *</EliteText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['Madre', 'Padre', 'Herman@', 'Abuel@', 'Otro'].map(r => (
                <Pressable key={r} onPress={() => set('relation', r)}
                  style={[styles.modalPill, form.relation === r && { backgroundColor: TEAL + '20', borderColor: TEAL }]}>
                  <EliteText variant="caption" style={[styles.modalPillText, form.relation === r && { color: TEAL }]}>{r}</EliteText>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.modalField}>
            <EliteText variant="caption" style={styles.modalFieldLabel}>Condición *</EliteText>
            <TextInput style={styles.modalInput} value={form.condition ?? ''} onChangeText={v => set('condition', v)}
              placeholderTextColor={SEMANTIC.noData} placeholder="Ej: Diabetes tipo 2" />
          </View>
          <View style={styles.modalField}>
            <EliteText variant="caption" style={styles.modalFieldLabel}>Notas</EliteText>
            <TextInput style={[styles.modalInput, { height: 60 }]} value={form.notes ?? ''} onChangeText={v => set('notes', v)}
              placeholderTextColor={SEMANTIC.noData} placeholder="Opcional" multiline />
          </View>
        </>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <EliteText variant="label" style={styles.modalTitle}>AGREGAR</EliteText>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderFields()}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose}><EliteText variant="caption" style={{ color: TEXT_COLORS.muted }}>Cancelar</EliteText></Pressable>
            <Pressable onPress={handleSave} disabled={saving} style={[styles.modalSaveBtn, saving && { opacity: 0.5 }]}>
              <EliteText variant="caption" style={styles.modalSaveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</EliteText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Datos personales con candado (locked por default, unlock para editar)
function EditableProfileCard({ clientId, clientName, clientEmail, connectedAt, profile, profileLoaded, onSave }: {
  clientId: string; clientName: string; clientEmail: string; connectedAt: string;
  profile: Record<string, any> | null; profileLoaded: boolean;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [unlocked, setUnlocked] = useState(false);
  // Controlled form state
  const [form, setForm] = useState({
    full_name: clientName,
    date_of_birth: profile?.date_of_birth ?? '',
    biological_sex: profile?.biological_sex ?? '',
    phone: profile?.phone ?? '',
    occupation: profile?.occupation ?? '',
    city: profile?.city ?? '',
    referral_source: profile?.referral_source ?? '',
    referral_detail: profile?.referral_detail ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Sync when profile loads
  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        date_of_birth: profile.date_of_birth ?? prev.date_of_birth,
        biological_sex: profile.biological_sex ?? prev.biological_sex,
        phone: profile.phone ?? prev.phone,
        occupation: profile.occupation ?? prev.occupation,
        city: profile.city ?? prev.city,
        referral_source: profile.referral_source ?? prev.referral_source,
        referral_detail: profile.referral_detail ?? prev.referral_detail,
      }));
    }
  }, [profile]);

  const setF = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      // Save name to profiles table
      if (form.full_name.trim() && form.full_name !== clientName) {
        const { supabase } = require('@/src/lib/supabase');
        await supabase.from('profiles').update({ full_name: form.full_name.trim() }).eq('id', clientId);
      }
      // Save rest to client_profiles
      await upsertClientProfile(clientId, {
        date_of_birth: form.date_of_birth || null,
        biological_sex: form.biological_sex || null,
        phone: form.phone || null,
        occupation: form.occupation || null,
        city: form.city || null,
        referral_source: form.referral_source || null,
        referral_detail: form.referral_detail || null,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      if (__DEV__) console.error('[savePersonal]', err);
    }
    setSaving(false);
  };

  const age = form.date_of_birth
    ? Math.floor((Date.now() - new Date(form.date_of_birth).getTime()) / 31557600000)
    : null;

  return (
    <SaveableSection hasChanges={unlocked && saveStatus === 'idle'}>
      {unlocked ? (
        <View>
          <SectionSaveHeader title="DATOS PERSONALES" hasChanges={true} isSaving={saving}
            saveStatus={saving ? 'saving' : saveStatus === 'saved' ? 'saved' : saveStatus === 'error' ? 'error' : 'idle'}
            onSave={handleSaveAll} />
          <View style={{ gap: Spacing.xs }}>
            <View>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>Nombre</EliteText>
              <TextInput style={styles.editableInput} value={form.full_name}
                onChangeText={v => setF('full_name', v)}
                placeholder="Nombre completo" placeholderTextColor={SURFACES.disabled} />
            </View>
            <ProfileRow label="Email" value={clientEmail} />
            {profileLoaded && (
              <>
                <View>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>Fecha de nacimiento</EliteText>
                  <TextInput style={styles.editableInput} value={form.date_of_birth}
                    onChangeText={v => setF('date_of_birth', v)}
                    placeholder="AAAA-MM-DD" placeholderTextColor={SURFACES.disabled} />
                </View>
                <View>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>Sexo biológico</EliteText>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['male', 'female'].map(s => (
                      <Pressable key={s} onPress={() => setF('biological_sex', s)}
                        style={[styles.sexPill, form.biological_sex === s && styles.sexPillActive]}>
                        <EliteText variant="caption" style={[styles.sexPillText, form.biological_sex === s && { color: TEAL }]}>
                          {s === 'male' ? 'Masculino' : 'Femenino'}
                        </EliteText>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>Teléfono</EliteText>
                  <TextInput style={styles.editableInput} value={form.phone}
                    onChangeText={v => setF('phone', v)}
                    placeholder="Tel." placeholderTextColor={SURFACES.disabled} keyboardType="phone-pad" />
                </View>
                <View>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>Ocupación</EliteText>
                  <TextInput style={styles.editableInput} value={form.occupation}
                    onChangeText={v => setF('occupation', v)}
                    placeholder="Ocupación" placeholderTextColor={SURFACES.disabled} />
                </View>
                <View>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>Ciudad</EliteText>
                  <TextInput style={styles.editableInput} value={form.city}
                    onChangeText={v => setF('city', v)}
                    placeholder="Ciudad" placeholderTextColor={SURFACES.disabled} />
                </View>
                <View>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>¿Cómo nos conoció?</EliteText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Google', 'Referido', 'Amigo/Familiar', 'Evento', 'ChatGPT/IA', 'Otro'].map(src => (
                      <Pressable key={src} onPress={() => setF('referral_source', src)}
                        style={[styles.sexPill, form.referral_source === src && styles.sexPillActive]}>
                        <EliteText variant="caption" style={[styles.sexPillText, form.referral_source === src && { color: TEAL }]}>
                          {src}
                        </EliteText>
                      </Pressable>
                    ))}
                  </View>
                  {(form.referral_source === 'Referido' || form.referral_source === 'Amigo/Familiar' || form.referral_source === 'Otro') && (
                    <TextInput style={[styles.editableInput, { marginTop: 4 }]} value={form.referral_detail}
                      onChangeText={v => setF('referral_detail', v)}
                      placeholder={form.referral_source === 'Otro' ? 'Especifica' : '¿Quién te refirió?'}
                      placeholderTextColor={SURFACES.disabled} />
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <EliteText variant="caption" style={styles.profileCardLabel}>DATOS PERSONALES</EliteText>
            <Pressable onPress={() => setUnlocked(true)} style={styles.lockBtn}>
              <Ionicons name="lock-closed-outline" size={14} color={TEXT_COLORS.muted} />
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>Editar</EliteText>
            </Pressable>
          </View>
          <ProfileRow label="Nombre" value={clientName || '—'} />
          <ProfileRow label="Email" value={clientEmail} />
          {age != null && <ProfileRow label="Edad" value={`${age} años`} />}
          {profile?.biological_sex && <ProfileRow label="Sexo" value={profile.biological_sex === 'male' ? 'Masculino' : 'Femenino'} />}
          {profile?.phone && <ProfileRow label="Tel." value={profile.phone} />}
          {profile?.occupation && <ProfileRow label="Ocupación" value={profile.occupation} />}
          {profile?.city && <ProfileRow label="Ciudad" value={profile.city} />}
          {profile?.referral_source && (
            <ProfileRow label="Vía" value={`${profile.referral_source}${profile.referral_detail ? `: ${profile.referral_detail}` : ''}`} />
          )}
          <ProfileRow label="Conexión" value={new Date(connectedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} />
        </View>
      )}
    </SaveableSection>
  );
}

// Metas con plazo: lista editable de goals con semanas + objetivo
function TimedGoals({ goals, onChange, editable }: {
  goals: { weeks: string; target: string }[];
  onChange: (goals: { weeks: string; target: string }[]) => void;
  editable: boolean;
}) {
  const [newWeeks, setNewWeeks] = useState('');
  const [newTarget, setNewTarget] = useState('');

  const handleAdd = () => {
    if (!newWeeks.trim() || !newTarget.trim()) return;
    onChange([...goals, { weeks: newWeeks.trim(), target: newTarget.trim() }]);
    setNewWeeks('');
    setNewTarget('');
  };

  const handleRemove = (idx: number) => {
    onChange(goals.filter((_, i) => i !== idx));
  };

  return (
    <View style={{ gap: Spacing.xs }}>
      {goals.map((g, i) => (
        <View key={i} style={styles.goalRow}>
          <View style={styles.goalWeeksBadge}>
            <EliteText variant="caption" style={styles.goalWeeksText}>{g.weeks} sem</EliteText>
          </View>
          <EliteText variant="body" style={styles.goalTarget}>{g.target}</EliteText>
          {editable && (
            <Pressable onPress={() => handleRemove(i)} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={TEXT_COLORS.muted} />
            </Pressable>
          )}
        </View>
      ))}
      {editable && (
        <View style={styles.goalAddRow}>
          <TextInput
            style={[styles.goalInput, { width: 50 }]}
            value={newWeeks}
            onChangeText={setNewWeeks}
            placeholder="Sem"
            placeholderTextColor={SURFACES.disabled}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.goalInput, { flex: 1 }]}
            value={newTarget}
            onChangeText={setNewTarget}
            placeholder="Ej: Hemoglobina 15-18, grasa visceral <9"
            placeholderTextColor={SURFACES.disabled}
          />
          <Pressable onPress={handleAdd} style={styles.goalAddBtn}>
            <Ionicons name="add" size={18} color={Colors.neonGreen} />
          </Pressable>
        </View>
      )}
      {goals.length === 0 && !editable && (
        <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 11 }}>Sin metas definidas</EliteText>
      )}
    </View>
  );
}

function WeightContextBar({ lowest, current, highest, ideal }: {
  lowest: number; current: number | null; highest: number; ideal?: number;
}) {
  const range = highest - lowest || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lowest) / range) * 100));

  return (
    <View style={styles.weightBar}>
      <View style={styles.weightBarTrack}>
        {/* Points */}
        <View style={[styles.weightBarPoint, { left: '0%', backgroundColor: ATP_BRAND.lime }]} />
        {current != null && (
          <View style={[styles.weightBarPointLg, { left: `${pct(current)}%` }]} />
        )}
        <View style={[styles.weightBarPoint, { left: '100%', backgroundColor: SEMANTIC.error }]} />
        {ideal && (
          <View style={[styles.weightBarPoint, { left: `${pct(ideal)}%`, backgroundColor: TEAL, borderWidth: 2, borderColor: TEAL }]} />
        )}
      </View>
      <View style={styles.weightBarLabels}>
        <EliteText variant="caption" style={{ color: ATP_BRAND.lime, fontSize: 10 }}>{lowest}kg</EliteText>
        {current != null && <EliteText variant="caption" style={{ color: TEXT_COLORS.primary, fontSize: 10 }}>{current}kg</EliteText>}
        {ideal && <EliteText variant="caption" style={{ color: TEAL, fontSize: 10 }}>Meta: {ideal}kg</EliteText>}
        <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 10 }}>{highest}kg</EliteText>
      </View>
    </View>
  );
}

function BioField({ label, unit, color, value, onSave, rating, saved }: {
  label: string; unit: string; color: string; value: string; onSave: (v: string) => void; rating?: ValueRating; saved?: boolean;
}) {
  const [text, setText] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (newText: string) => {
    setText(newText);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(newText), 500);
  };

  const hasRating = rating && rating.level !== 'no_data';
  const displayColor = hasRating ? rating.color : color;
  return (
    <View style={[styles.bioItem, hasRating ? { backgroundColor: rating.bgColor, borderRadius: 6 } : undefined]}>
      <EliteText variant="caption" style={styles.bioLabel}>
        {saved && <EliteText style={{ fontSize: 10, color: ATP_BRAND.lime }}>{'✓ '}</EliteText>}
        {hasRating && <EliteText style={{ fontSize: 12, color: rating.color }}>{rating.arrow} </EliteText>}
        {label}
      </EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <TextInput
          style={[styles.bioInput, { color: displayColor }]}
          value={text}
          onChangeText={handleChange}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={SURFACES.disabled}
        />
        <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9 }}>{unit}</EliteText>
        {hasRating && (
          <View style={{ backgroundColor: rating.bgColor, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
            <EliteText variant="caption" style={{ color: rating.color, fontSize: 8, fontFamily: Fonts.bold }}>{rating.label}</EliteText>
          </View>
        )}
      </View>
    </View>
  );
}

function DebouncedBPField({ sysValue, diaValue, onSaveSys, onSaveDia, bpColor, bpRating, saved }: {
  sysValue: string; diaValue: string; onSaveSys: (v: string) => void; onSaveDia: (v: string) => void;
  bpColor: string; bpRating: ValueRating | null; saved?: boolean;
}) {
  const [sys, setSys] = useState(sysValue);
  const [dia, setDia] = useState(diaValue);
  const sysTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSys = (v: string) => {
    setSys(v);
    if (sysTimer.current) clearTimeout(sysTimer.current);
    sysTimer.current = setTimeout(() => onSaveSys(v), 500);
  };
  const handleDia = (v: string) => {
    setDia(v);
    if (diaTimer.current) clearTimeout(diaTimer.current);
    diaTimer.current = setTimeout(() => onSaveDia(v), 500);
  };

  const hasRating = bpRating && bpRating.level !== 'no_data';
  return (
    <View style={[styles.bioFieldWide, hasRating ? { backgroundColor: bpRating.bgColor, borderRadius: 6 } : undefined]}>
      <EliteText variant="caption" style={styles.bioLabel}>
        {saved && <EliteText style={{ fontSize: 10, color: ATP_BRAND.lime }}>{'✓ '}</EliteText>}
        {hasRating && <EliteText style={{ fontSize: 12, color: bpRating.color }}>{bpRating.arrow} </EliteText>}
        Presión arterial
      </EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TextInput style={[styles.bioInput, { width: 44, color: bpColor }]}
          value={sys} onChangeText={handleSys}
          keyboardType="numeric" placeholder="120" placeholderTextColor={SURFACES.disabled} />
        <EliteText style={{ color: TEXT_COLORS.muted, fontSize: 16 }}>/</EliteText>
        <TextInput style={[styles.bioInput, { width: 44, color: bpColor }]}
          value={dia} onChangeText={handleDia}
          keyboardType="numeric" placeholder="80" placeholderTextColor={SURFACES.disabled} />
        {hasRating && (
          <View style={{ backgroundColor: bpRating.bgColor, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, marginLeft: 2 }}>
            <EliteText variant="caption" style={{ color: bpRating.color, fontSize: 8, fontFamily: Fonts.bold }}>{bpRating.label}</EliteText>
          </View>
        )}
      </View>
    </View>
  );
}

function EditableField({ label, value, placeholder, onSave, multiline, isRed }: {
  label: string; fieldKey: string; value: string; placeholder: string;
  onSave: (v: string) => void; multiline?: boolean; isRed?: boolean;
}) {
  const [text, setText] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: string) => {
    setText(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(v), 1000);
  };

  return (
    <View>
      <EliteText variant="caption" style={{ color: isRed ? SEMANTIC.error + '80' : TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>{label}</EliteText>
      <TextInput
        style={[styles.editableInput, isRed && { borderColor: SEMANTIC.error + '30' }]}
        value={text}
        onChangeText={handleChange}
        onEndEditing={() => onSave(text)}
        placeholder={placeholder}
        placeholderTextColor={SURFACES.disabled}
        multiline={multiline}
      />
    </View>
  );
}

function RecentStudies({ clientId }: { clientId: string }) {
  const [studies, setStudies] = useState<ClinicalStudy[]>([]);
  useEffect(() => { getStudies(clientId, 5).then(setStudies).catch(() => {}); }, [clientId]);
  if (studies.length === 0) return null;
  const pending = studies.filter(s => s.status === 'uploaded' || s.status === 'processing').length;
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
        <EliteText variant="caption" style={styles.rowLabel}>ESTUDIOS RECIENTES</EliteText>
        {pending > 0 && (
          <View style={{ backgroundColor: SEMANTIC.warning + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontSize: 9, fontFamily: Fonts.bold }}>{pending} pendiente{pending > 1 ? 's' : ''}</EliteText>
          </View>
        )}
      </View>
      {studies.map(s => {
        const st = getStudyType(s.study_type);
        const findings = (s.findings ?? []) as string[];
        return (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 }}>
            <EliteText style={{ fontSize: 16 }}>{st.emoji}</EliteText>
            <View style={{ flex: 1 }}>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.primary, fontSize: 12 }}>
                {s.study_name} — {new Date(s.study_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </EliteText>
              {findings.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                  {findings.slice(0, 3).map((f, i) => (
                    <View key={i} style={{ backgroundColor: CATEGORY_COLORS.metrics + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                      <EliteText variant="caption" style={{ color: CATEGORY_COLORS.metrics, fontSize: 9 }}>{f}</EliteText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ScoreCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.scoreCard}>
      <EliteText variant="caption" style={styles.scoreLabel}>{label}</EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <EliteText style={[styles.scoreValue, { color }]}>{value}</EliteText>
        <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>{unit}</EliteText>
      </View>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <EliteText variant="caption" style={styles.profileRowLabel}>{label}</EliteText>
      <EliteText variant="body" style={styles.profileRowValue}>{value || '—'}</EliteText>
    </View>
  );
}

// ══════════════════════════
// TAB: CALENDARIO (grid 7 columnas Lun-Dom)
// ══════════════════════════
// TAB: CONSULTAS
// ══════════════════════════

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: SEMANTIC.warning, bg: SEMANTIC.warning + '15' },
  completed: { label: 'Completada', color: ATP_BRAND.lime, bg: ATP_BRAND.lime + '15' },
  signed: { label: 'Firmada', color: SEMANTIC.info, bg: SEMANTIC.info + '15' },
};

function ConsultationsTab({ clientId, clientName, flags: parentFlags, onFlagToggle: parentFlagToggle }: {
  clientId: string; clientName: string; flags: ConditionFlag[];
  onFlagToggle: (key: string, zone: string) => Promise<void>;
}) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeConsult, setActiveConsult] = useState<Consultation | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const { width: sw } = useWindowDimensions();
  const isWide = sw >= 1024;

  useEffect(() => { loadList(); }, [clientId]);

  const loadList = async () => {
    setLoadingList(true);
    try { setConsultations(await getConsultations(clientId)); } catch { /* */ }
    setLoadingList(false);
  };

  const draft = consultations.find(c => c.status === 'draft');

  const webConfirm = (msg: string) => typeof window !== 'undefined' ? window.confirm(msg) : true;

  const handleNew = async () => {
    if (draft) {
      const c = await getConsultation(draft.id);
      if (c) setActiveConsult(c);
      return;
    }
    const num = (consultations[0]?.consultation_number ?? 0) + 1;
    if (!webConfirm(`¿Iniciar consulta #${num} para ${clientName}?`)) return;
    setCreating(true);
    try {
      const id = await startConsultation(clientId);
      const c = await getConsultation(id);
      if (c) { setActiveConsult(c); await loadList(); }
    } catch (err: any) {
      if (__DEV__) console.error('[startConsultation]', err);
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!activeConsult) return;
    const num = activeConsult.consultation_number;
    if (!webConfirm(`¿Eliminar Consulta #${num}? Esta acción es permanente.`)) return;
    if (!webConfirm('¿Segurísimo? Los datos NO se pueden recuperar.')) return;
    try { await deleteConsultation(activeConsult.id); } catch { /* */ }
    setActiveConsult(null);
    loadList();
  };

  const handleSaveField = async (field: string, value: string) => {
    if (!activeConsult) return;
    try {
      await updateConsultation(activeConsult.id, { [field]: value.trim() || null } as any);
      setActiveConsult(prev => prev ? { ...prev, [field]: value.trim() || null } : null);
    } catch { /* */ }
  };

  const handleComplete = async () => {
    if (!activeConsult) return;
    try {
      await completeConsultation(activeConsult.id);
      setActiveConsult(prev => prev ? { ...prev, status: 'completed' } : null);
      loadList();
    } catch { /* */ }
  };

  // Estado local para condiciones editables en la consulta
  const [consultFlags, setConsultFlags] = useState<ConditionFlag[]>([]);
  const [consultFlagsLoaded, setConsultFlagsLoaded] = useState(false);
  const [consultProfile, setConsultProfile] = useState<Record<string, any> | null>(null);
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [showHabits, setShowHabits] = useState(false);

  useEffect(() => {
    if (activeConsult) {
      getConditionFlags(clientId).then(f => { setConsultFlags(f); setConsultFlagsLoaded(true); }).catch(() => setConsultFlagsLoaded(true));
      getClientProfile(clientId).then(setConsultProfile).catch(() => {});
      getClientHabits(clientId).then(setHabits).catch(() => {});
    }
  }, [activeConsult?.id]);

  const saveConsultProfileField = async (key: string, value: string) => {
    try {
      await upsertClientProfile(clientId, { [key]: value.trim() || null });
      setConsultProfile(prev => ({ ...prev, [key]: value.trim() || null }));
    } catch { /* */ }
  };

  const handleConsultFlagToggle = async (key: string, zone: string) => {
    if (!activeConsult) return;
    const newStatus = await toggleConditionFlag(clientId, key, zone);
    setConsultFlags(prev => {
      const existing = prev.find(f => f.condition_key === key);
      if (existing) return prev.map(f => f.condition_key === key ? { ...f, status: newStatus } : f);
      return [...prev, { condition_key: key, zone, status: newStatus, notes: null, diagnosed_date: null, lab_value: null, medication: null }];
    });
    // Update snapshot in consultation
    const allFlags = await getConditionFlags(clientId);
    const snapshot = allFlags.filter(f => f.status !== 'not_evaluated');
    await updateConsultation(activeConsult.id, { conditions_snapshot: snapshot } as any);
  };

  const getConsultFlag = (key: string): FlagStatus => {
    return (consultFlags.find(f => f.condition_key === key)?.status as FlagStatus) ?? 'not_evaluated';
  };

  // Vista de consulta individual
  if (activeConsult) {
    const c = activeConsult;
    const isDraft = c.status === 'draft';
    const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.draft;
    const changes = c.changes_summary;

    return (
      <View>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
          <Pressable onPress={() => { setActiveConsult(null); setConsultFlagsLoaded(false); loadList(); }}>
            <Ionicons name="arrow-back" size={20} color={TEXT_COLORS.secondary} />
          </Pressable>
          <EliteText variant="body" style={{ fontFamily: Fonts.bold, flex: 1 }}>
            Consulta #{c.consultation_number} — {new Date(c.consultation_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </EliteText>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <EliteText variant="caption" style={{ color: badge.color, fontSize: 10, fontFamily: Fonts.bold }}>{badge.label}</EliteText>
          </View>
        </View>

        <View style={isWide ? { flexDirection: 'row', gap: 16 } : { gap: Spacing.md }}>
          {/* ═══ COLUMNA IZQUIERDA: Datos clínicos editables ═══ */}
          <View style={isWide ? { flex: 55 } : undefined}>
            {/* Tablero de condiciones (EDITABLE) */}
            {consultFlagsLoaded && isDraft && (
              <View style={[styles.profileCard, { marginTop: Spacing.sm }]}>
                <EliteText variant="caption" style={styles.profileCardLabel}>TABLERO DE CONDICIONES</EliteText>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: Spacing.sm }}>
                  Toca pill para ciclar estado
                </EliteText>
                <View style={isWide ? styles.condGrid : { gap: Spacing.xs }}>
                  {CONDITION_ZONES.map(zone => {
                    const redC = zone.conditions.filter(co => getConsultFlag(co.key) === 'present').length;
                    const orangeC = zone.conditions.filter(co => getConsultFlag(co.key) === 'observation').length;
                    const statusDot = redC > 0 ? SEMANTIC.error : orangeC > 0 ? SEMANTIC.warning : SEMANTIC.noData;
                    return (
                      <View key={zone.key} style={isWide ? styles.condGridItem : undefined}>
                        <View style={[styles.zoneCard, { borderLeftColor: zone.color, marginBottom: Spacing.xs }]}>
                          <View style={styles.zoneHeader}>
                            <View style={[styles.zoneDot, { backgroundColor: statusDot }]} />
                            <EliteText variant="caption" style={[styles.zoneTitle, { color: zone.color }]}>{zone.label}</EliteText>
                          </View>
                          <View style={styles.conditionPills}>
                            {zone.conditions.map(cond => {
                              const st2 = FLAG_STATUSES[getConsultFlag(cond.key)];
                              return (
                                <Pressable key={cond.key} onPress={() => handleConsultFlagToggle(cond.key, zone.key)}
                                  style={[styles.condPillSm, { backgroundColor: st2.bgColor, borderColor: st2.color + '40', borderStyle: getConsultFlag(cond.key) === 'not_evaluated' ? 'dashed' : 'solid' }]}>
                                  <EliteText variant="caption" style={{ color: st2.color, fontSize: 10, fontFamily: Fonts.semiBold }}>{cond.label}</EliteText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Condiciones snapshot (solo lectura si completada) */}
            {!isDraft && c.conditions_snapshot && (c.conditions_snapshot as any[]).length > 0 && (
              <View style={[styles.profileCard, { marginTop: Spacing.sm }]}>
                <EliteText variant="caption" style={styles.profileCardLabel}>CONDICIONES (SNAPSHOT)</EliteText>
                <View style={styles.conditionPills}>
                  {(c.conditions_snapshot as any[]).map((cond: any) => {
                    const st3 = FLAG_STATUSES[cond.status as keyof typeof FLAG_STATUSES] ?? FLAG_STATUSES.not_evaluated;
                    return (
                      <View key={cond.condition_key} style={[styles.condPillSm, { backgroundColor: st3.bgColor, borderColor: st3.color + '40' }]}>
                        <EliteText variant="caption" style={{ color: st3.color, fontSize: 10 }}>{cond.condition_key}</EliteText>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Mapa de hábitos diarios */}
            {isDraft && (
              <View style={[styles.profileCard, { marginTop: Spacing.sm }]}>
                <Pressable onPress={() => setShowHabits(!showHabits)} style={styles.zoneHeader}>
                  <Ionicons name="time-outline" size={16} color={Colors.neonGreen} />
                  <EliteText variant="body" style={[styles.sectionTitle, { color: Colors.neonGreen }]}>
                    Mapear día del paciente
                  </EliteText>
                  <Ionicons name={showHabits ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT_COLORS.muted} />
                </Pressable>
                {showHabits && (
                  <View style={{ marginTop: Spacing.sm }}>
                    <DayCalendar
                      habits={habits}
                      onAdd={async (data) => {
                        try {
                          await addHabit(clientId, { ...data, consultation_id: activeConsult.id });
                          setHabits(await getClientHabits(clientId));
                        } catch (err: any) { if (__DEV__) console.error('[addHabit]', err); }
                      }}
                      onEdit={async (h, data) => {
                        await updateHabit(h.id, data);
                        setHabits(await getClientHabits(clientId));
                      }}
                      onDelete={async (id) => {
                        await deleteHabit(id);
                        setHabits(await getClientHabits(clientId));
                      }}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Medicamentos y suplementos */}
            <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
              <CollapsibleSection title="Farmacología" clientId={clientId} type="medications" />
              <CollapsibleSection title="Suplementos" clientId={clientId} type="supplements" />
              <CollapsibleSection title="Antecedentes familiares" clientId={clientId} type="family" />
            </View>
          </View>

          {/* ═══ COLUMNA DERECHA: Notas + objetivos ═══ */}
          <View style={isWide ? { flex: 45 } : undefined}>
            {/* Objetivos (editables en consulta) — con guardado explícito */}
            <ObjectivesSaveSection
              profile={consultProfile}
              isDraft={isDraft}
              clientId={clientId}
              onSaved={(updates) => setConsultProfile((prev: any) => ({ ...prev, ...updates }))}
            />

            {/* Notas SOAP — con guardado explícito */}
            <SoapNotesSaveSection
              consultation={c}
              isDraft={isDraft}
              onSaved={(updates) => setActiveConsult((prev: any) => prev ? { ...prev, ...updates } : null)}
            />

            {/* Descripción del día — con guardado explícito */}
            <DayDescriptionSaveSection
              consultation={c}
              isDraft={isDraft}
              onSaved={(v) => setActiveConsult((prev: any) => prev ? { ...prev, day_description: v } : null)}
            />

            {/* Metas con plazo */}
            <View style={[styles.profileCard, { marginTop: Spacing.sm }]}>
              <EliteText variant="caption" style={styles.profileCardLabel}>METAS CON PLAZO</EliteText>
              <TimedGoals
                goals={(() => { try { return JSON.parse((c as any).timed_goals || '[]'); } catch { return []; } })()}
                onChange={async (goals: any[]) => {
                  handleSaveField('timed_goals', JSON.stringify(goals));
                }}
                editable={isDraft}
              />
            </View>

            {/* Composición corporal (siempre expandida) */}
            <CollapsibleSection title="Composición y biomarcadores" clientId={clientId} type="measurements" alwaysExpanded sex={(consultProfile?.biological_sex as Sex) ?? 'male'} />

            {/* Contexto de peso — con guardado explícito */}
            {isDraft && consultProfile && (
              <WeightContextSaveSection
                profile={consultProfile}
                clientId={clientId}
                onSaved={(updates) => setConsultProfile((prev: any) => ({ ...prev, ...updates }))}
              />
            )}

            {/* Meta: completar / eliminar */}
            <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
              {isDraft && (
                <Pressable onPress={handleComplete} style={styles.completeBtn}>
                  <Ionicons name="checkmark-circle" size={16} color={ATP_BRAND.black} />
                  <EliteText variant="caption" style={styles.completeBtnText}>Completar consulta</EliteText>
                </Pressable>
              )}
              <Pressable onPress={handleDelete} style={styles.deleteDraftBtn}>
                <Ionicons name={isDraft ? 'trash-outline' : 'warning-outline'} size={14} color={SEMANTIC.error} />
                <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 12 }}>
                  {isDraft ? 'Eliminar borrador' : 'Eliminar consulta'}
                </EliteText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Vista de lista
  return (
    <View>
      <Pressable onPress={handleNew} disabled={creating} style={[styles.newConsultBtn, creating && { opacity: 0.5 }, draft && { borderColor: SEMANTIC.warning + '30', backgroundColor: SEMANTIC.warning + '08' }]}>
        <Ionicons name={draft ? 'create-outline' : 'add-circle-outline'} size={18} color={draft ? SEMANTIC.warning : Colors.neonGreen} />
        <EliteText variant="body" style={[styles.newConsultBtnText, draft && { color: SEMANTIC.warning }]}>
          {creating ? 'Creando...' : draft ? `Continuar consulta #${draft.consultation_number}` : 'Nueva Consulta'}
        </EliteText>
      </Pressable>

      {loadingList ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: Spacing.lg }} />
      ) : consultations.length === 0 ? (
        <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, textAlign: 'center', paddingVertical: Spacing.xl }}>
          Sin consultas registradas. Inicia la primera.
        </EliteText>
      ) : (
        consultations.map(c => {
          const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.draft;
          const changes = c.changes_summary;
          return (
            <Pressable key={c.id} onPress={async () => {
              const full = await getConsultation(c.id);
              if (full) setActiveConsult(full);
            }} style={styles.consultCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <EliteText variant="body" style={{ fontFamily: Fonts.bold, flex: 1 }}>
                  Consulta #{c.consultation_number}
                </EliteText>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <EliteText variant="caption" style={{ color: badge.color, fontSize: 9, fontFamily: Fonts.bold }}>{badge.label}</EliteText>
                </View>
              </View>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, marginTop: 2 }}>
                {new Date(c.consultation_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </EliteText>
              {c.chief_complaint && (
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, marginTop: 4 }} numberOfLines={1}>
                  {c.chief_complaint}
                </EliteText>
              )}
              {changes && !changes.is_first && (changes.weight_change != null || changes.fat_change != null) && (
                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 4, fontSize: 11 }}>
                  {changes.weight_change != null ? `${changes.weight_change > 0 ? '+' : ''}${Number(changes.weight_change).toFixed(1)} kg` : ''}
                  {changes.fat_change != null ? ` · ${changes.fat_change > 0 ? '+' : ''}${Number(changes.fat_change).toFixed(1)}% grasa` : ''}
                </EliteText>
              )}
              {changes?.is_first && (
                <EliteText variant="caption" style={{ color: TEAL, marginTop: 4, fontSize: 11 }}>Primera consulta</EliteText>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

// ══════════════════════════
// TAB: LABS
// ══════════════════════════

const LAB_SECTIONS = [
  { label: 'Metabólico', keys: ['glucose', 'hba1c', 'insulin', 'homa_ir', 'fructosamine', 'c_peptide'] },
  { label: 'Lipídico', keys: ['cholesterol_total', 'hdl', 'ldl', 'triglycerides', 'vldl', 'apo_b', 'non_hdl_cholesterol', 'lp_a'] },
  { label: 'Tiroideo', keys: ['tsh', 't3_free', 't4_free', 'total_t3', 'total_t4'] },
  { label: 'Hormonal', keys: ['testosterone', 'testosterone_free', 'cortisol', 'estradiol', 'dhea', 'progesterone', 'fsh', 'lh', 'prolactin', 'shbg', 'igf1', 'anti_tpo', 'anti_tg'] },
  { label: 'Vitaminas/Minerales', keys: ['vitamin_d', 'vitamin_b12', 'iron', 'ferritin', 'magnesium', 'zinc', 'folate', 'calcium', 'phosphorus', 'iron_binding', 'iron_saturation', 'transferrin'] },
  { label: 'Inflamación', keys: ['pcr', 'homocysteine', 'rheumatoid_factor', 'ldh', 'cpk', 'aso', 'esr', 'fibrinogen', 'complement_c3', 'complement_c4'] },
  { label: 'Hepático', keys: ['alt', 'ast', 'ggt', 'bilirubin', 'bilirubin_direct', 'bilirubin_indirect', 'alp', 'albumin', 'total_protein', 'globulin', 'ag_ratio'] },
  { label: 'Renal', keys: ['creatinine', 'uric_acid', 'bun', 'urea', 'gfr', 'sodium', 'potassium', 'chloride', 'co2'] },
  { label: 'Hematológico', keys: ['hemoglobin', 'hematocrit', 'rbc', 'platelets', 'wbc', 'mcv', 'mch', 'mchc', 'rdw', 'mpv', 'neutrophils_pct', 'lymphocyte_pct', 'monocytes_pct', 'eosinophils_pct', 'basophils_pct'] },
  { label: 'Coagulación', keys: ['pt', 'ptt', 'inr'] },
];

function LabsTab({ clientId }: { clientId: string }) {
  const [labs, setLabs] = useState<LabResultType[]>([]);
  const [failedUploads, setFailedUploads] = useState<LabUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLab, setExpandedLab] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; color: string } | null>(null);
  const [clientSex, setClientSex] = useState<Sex>('male');

  useEffect(() => { loadLabs(); loadSex(); }, [clientId]);
  const loadSex = async () => {
    try {
      const p = await getClientProfile(clientId);
      if (p?.biological_sex) setClientSex(p.biological_sex as Sex);
    } catch { /* */ }
  };
  const loadLabs = async () => {
    setLoading(true);
    try {
      const [labsData, uploadsData] = await Promise.all([
        getLabHistory(clientId),
        getFailedUploads(clientId),
      ]);
      setLabs(labsData);
      setFailedUploads(uploadsData);
    } catch { /* */ }
    setLoading(false);
  };

  const handleUploadWeb = () => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,application/pdf';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const fileType: 'image' | 'pdf' = file.type.includes('pdf') ? 'pdf' : 'image';
      setUploading(true);
      setUploadMsg({ text: 'Subiendo archivo...', color: TEAL });
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const { uploadId } = await uploadLabFile(clientId, base64, fileType, file.name);
        setUploadMsg({ text: 'Analizando con IA...', color: TEAL });
        const result = await extractLabValues(uploadId);
        if ('error' in result) {
          setUploadMsg({ text: `Error: ${result.error}`, color: SEMANTIC.error });
        } else {
          setUploadMsg({ text: `¡Listo! ${result.extractedCount} valores extraídos`, color: ATP_BRAND.lime });
          loadLabs();
        }
      } catch (err: any) {
        setUploadMsg({ text: `Error: ${err.message ?? 'Fallo al subir'}`, color: SEMANTIC.error });
      }
      setUploading(false);
      setTimeout(() => setUploadMsg(null), 5000);
    };
    input.click();
  };

  const handleApprove = async (labId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('¿Aprobar estos resultados?')) return;
    await approveLabResult(labId);
    loadLabs();
  };

  const handleDelete = async (labId: string) => {
    if (typeof window === 'undefined' || !window.confirm('¿Eliminar este resultado?')) return;
    if (!window.confirm('¿Segurísimo? No se puede deshacer.')) return;
    await deleteLabResult(labId);
    loadLabs();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: 'Borrador', color: SEMANTIC.warning, bg: SEMANTIC.warning + '15' },
      approved: { label: 'Aprobado', color: ATP_BRAND.lime, bg: ATP_BRAND.lime + '15' },
    };
    const b = map[s] ?? map.draft;
    return (
      <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
        <EliteText variant="caption" style={{ color: b.color, fontSize: 9, fontFamily: Fonts.bold }}>{b.label}</EliteText>
      </View>
    );
  };

  return (
    <View>
      {/* Botón subir estudio */}
      <Pressable onPress={handleUploadWeb} disabled={uploading} style={[styles.newConsultBtn, uploading && { opacity: 0.5 }]}>
        <Ionicons name={uploading ? 'hourglass-outline' : 'cloud-upload-outline'} size={18} color={TEAL} />
        <EliteText variant="body" style={{ color: TEAL, fontFamily: Fonts.bold }}>
          {uploading ? 'Procesando...' : 'Subir estudio de laboratorio'}
        </EliteText>
      </Pressable>

      {uploadMsg && (
        <View style={{ backgroundColor: uploadMsg.color + '10', borderWidth: 1, borderColor: uploadMsg.color + '30', borderRadius: 8, padding: Spacing.sm, marginBottom: Spacing.sm }}>
          <EliteText variant="caption" style={{ color: uploadMsg.color, fontSize: 12 }}>{uploadMsg.text}</EliteText>
        </View>
      )}

      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: Spacing.md }}>
        El cliente también puede subir estudios desde su app
      </EliteText>

      {/* Uploads fallidos/pendientes */}
      {failedUploads.length > 0 && (
        <View style={{ marginBottom: Spacing.md }}>
          <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4 }}>
            UPLOADS PENDIENTES / FALLIDOS
          </EliteText>
          {failedUploads.map(u => (
            <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0a0a', borderRadius: 8, padding: Spacing.sm, marginBottom: 4 }}>
              <Ionicons name={u.status === 'failed' ? 'alert-circle' : 'hourglass-outline'} size={14} color={u.status === 'failed' ? SEMANTIC.error : SEMANTIC.warning} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 11 }}>
                  {u.file_name ?? 'Archivo'} — {u.status === 'failed' ? 'Fallido' : u.status === 'processing' ? 'Procesando' : 'Subido'}
                </EliteText>
                {u.error_message && <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 10 }}>{u.error_message}</EliteText>}
              </View>
              <Pressable
                onPress={async () => {
                  if (typeof window !== 'undefined' && !window.confirm('¿Eliminar este upload?')) return;
                  try { await deleteLabUpload(u.id); loadLabs(); } catch { /* */ }
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="trash-outline" size={16} color={SEMANTIC.error} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {loading ? <ActivityIndicator color={TEAL} /> : labs.length === 0 ? (
        <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, textAlign: 'center', padding: Spacing.xl }}>
          Sin resultados de laboratorio
        </EliteText>
      ) : (
        labs.map(lab => {
          const isExpanded = expandedLab === lab.id;
          const valCount = LAB_SECTIONS.reduce((acc, s) => acc + s.keys.filter(k => lab[k] != null).length, 0);
          return (
            <View key={lab.id} style={styles.consultCard}>
              <Pressable onPress={() => setExpandedLab(isExpanded ? null : lab.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="flask-outline" size={16} color={TEAL} />
                  <EliteText variant="body" style={{ fontFamily: Fonts.bold, flex: 1 }}>
                    {lab.lab_name ?? 'Laboratorio'} — {new Date(lab.lab_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </EliteText>
                  {statusBadge(lab.status ?? 'draft')}
                </View>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, marginTop: 2 }}>{valCount} valores</EliteText>
              </Pressable>

              {isExpanded && (
                <View style={{ marginTop: Spacing.sm }}>
                  {LAB_SECTIONS.map(section => {
                    const vals = section.keys.filter(k => lab[k] != null);
                    if (vals.length === 0) return null;
                    return (
                      <View key={section.label} style={{ marginBottom: Spacing.sm }}>
                        <EliteText variant="caption" style={{ color: TEAL, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4 }}>
                          {section.label.toUpperCase()}
                        </EliteText>
                        {vals.map(key => {
                          const val = lab[key];
                          const rating = rateLabValue(key, Number(val), clientSex);
                          return (
                            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2, borderRadius: 6, backgroundColor: rating.level !== 'no_data' ? rating.bgColor : 'transparent' }}>
                              <EliteText style={{ fontSize: 16, color: rating.color, width: 20, textAlign: 'center' }}>
                                {rating.arrow}
                              </EliteText>
                              <EliteText variant="caption" style={{ flex: 1, color: TEXT_COLORS.primary, fontSize: 12, marginLeft: 4 }}>
                                {key.replace(/_/g, ' ')}
                              </EliteText>
                              <EliteText variant="body" style={{ color: rating.color, fontFamily: Fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] }}>
                                {val}
                              </EliteText>
                              {rating.level !== 'no_data' && (
                                <View style={{ backgroundColor: rating.bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 }}>
                                  <EliteText variant="caption" style={{ color: rating.color, fontSize: 10, fontFamily: Fonts.bold }}>
                                    {rating.label}
                                  </EliteText>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}

                  {/* Otros valores (no mapeados) */}
                  {lab.other_values && Array.isArray(lab.other_values) && lab.other_values.length > 0 && (
                    <View style={{ marginBottom: Spacing.sm }}>
                      <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4 }}>
                        OTROS VALORES
                      </EliteText>
                      {lab.other_values.map((ov: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: SURFACES.card }}>
                          <EliteText variant="caption" style={{ flex: 1, color: TEXT_COLORS.secondary, fontSize: 12 }}>{ov.name}</EliteText>
                          <EliteText variant="body" style={{ color: SEMANTIC.warning, fontFamily: Fonts.bold, fontSize: 14 }}>{ov.value}</EliteText>
                          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginLeft: 4 }}>{ov.unit}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                    {lab.status !== 'approved' && (
                      <Pressable onPress={() => handleApprove(lab.id)} style={[styles.completeBtn, { flex: 1 }]}>
                        <Ionicons name="checkmark" size={14} color={ATP_BRAND.black} />
                        <EliteText variant="caption" style={styles.completeBtnText}>Aprobar</EliteText>
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleDelete(lab.id)} style={[styles.deleteDraftBtn, { flex: 1 }]}>
                      <Ionicons name="trash-outline" size={14} color={SEMANTIC.error} />
                      <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 12 }}>Eliminar</EliteText>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

// ══════════════════════════
// ══════════════════════════
// SAVEABLE SECTIONS (consulta)
// ══════════════════════════

function DayDescriptionSaveSection({ consultation, isDraft, onSaved }: {
  consultation: Consultation; isDraft: boolean; onSaved: (v: string) => void;
}) {
  const [text, setText] = useState((consultation as any).day_description ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const original = (consultation as any).day_description ?? '';

  useEffect(() => { setText((consultation as any).day_description ?? ''); }, [consultation.id]);

  const hasChanges = text !== original;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConsultation(consultation.id, { day_description: text.trim() || null } as any);
      onSaved(text.trim());
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch { setStatus('error'); }
    setSaving(false);
  };

  return (
    <SaveableSection hasChanges={hasChanges}>
      <SectionSaveHeader title="DESCRIPCIÓN DEL DÍA" hasChanges={hasChanges} isSaving={saving}
        saveStatus={saving ? 'saving' : status} onSave={handleSave} />
      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10, marginBottom: Spacing.xs }}>
        ¿Cómo se ve un día típico de esta persona?
      </EliteText>
      <TextInput
        style={[styles.editableInput, { minHeight: 80 }]}
        value={text}
        onChangeText={v => { setText(v); setStatus('idle'); }}
        placeholder="Ej: Se levanta a las 6, desayuna cereal, maneja 1hr al trabajo..."
        placeholderTextColor={SURFACES.disabled}
        multiline editable={isDraft}
      />
    </SaveableSection>
  );
}

function WeightContextSaveSection({ profile, clientId, onSaved }: {
  profile: Record<string, any>; clientId: string;
  onSaved: (updates: Record<string, any>) => void;
}) {
  const [form, setForm] = useState({
    weight_highest_kg: profile.weight_highest_kg?.toString() ?? '',
    weight_highest_year: profile.weight_highest_year ?? '',
    weight_lowest_kg: profile.weight_lowest_kg?.toString() ?? '',
    weight_lowest_year: profile.weight_lowest_year ?? '',
    weight_ideal_kg: profile.weight_ideal_kg?.toString() ?? '',
    weight_ideal_notes: profile.weight_ideal_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setForm({
      weight_highest_kg: profile.weight_highest_kg?.toString() ?? '',
      weight_highest_year: profile.weight_highest_year ?? '',
      weight_lowest_kg: profile.weight_lowest_kg?.toString() ?? '',
      weight_lowest_year: profile.weight_lowest_year ?? '',
      weight_ideal_kg: profile.weight_ideal_kg?.toString() ?? '',
      weight_ideal_notes: profile.weight_ideal_notes ?? '',
    });
  }, [profile]);

  const hasChanges = Object.keys(form).some(k => form[k as keyof typeof form] !== (profile[k]?.toString() ?? ''));

  const setF = (key: string, value: string) => { setForm(prev => ({ ...prev, [key]: value })); setStatus('idle'); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        data[k] = k.includes('_kg') && v ? Number(v) : (v || null);
      }
      await upsertClientProfile(clientId, data);
      onSaved(data);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch { setStatus('error'); }
    setSaving(false);
  };

  return (
    <SaveableSection hasChanges={hasChanges}>
      <SectionSaveHeader title="CONTEXTO DE PESO" hasChanges={hasChanges} isSaving={saving}
        saveStatus={saving ? 'saving' : status} onSave={handleSave} />
      <View style={{ gap: Spacing.sm }}>
        <View style={styles.weightCtxRow}>
          <EliteText variant="caption" style={styles.weightCtxLabel}>Más alto</EliteText>
          <TextInput style={[styles.weightCtxInput, { flex: 1 }]} value={form.weight_highest_kg}
            onChangeText={v => setF('weight_highest_kg', v)} placeholder="kg" placeholderTextColor={SURFACES.disabled} keyboardType="numeric" />
          <TextInput style={[styles.weightCtxInput, { flex: 1 }]} value={form.weight_highest_year}
            onChangeText={v => setF('weight_highest_year', v)} placeholder="año o edad" placeholderTextColor={SURFACES.disabled} />
        </View>
        <View style={styles.weightCtxRow}>
          <EliteText variant="caption" style={styles.weightCtxLabel}>Más bajo</EliteText>
          <TextInput style={[styles.weightCtxInput, { flex: 1 }]} value={form.weight_lowest_kg}
            onChangeText={v => setF('weight_lowest_kg', v)} placeholder="kg" placeholderTextColor={SURFACES.disabled} keyboardType="numeric" />
          <TextInput style={[styles.weightCtxInput, { flex: 1 }]} value={form.weight_lowest_year}
            onChangeText={v => setF('weight_lowest_year', v)} placeholder="año o edad" placeholderTextColor={SURFACES.disabled} />
        </View>
        <View style={styles.weightCtxRow}>
          <EliteText variant="caption" style={[styles.weightCtxLabel, { color: TEAL }]}>Ideal</EliteText>
          <TextInput style={[styles.weightCtxInput, { flex: 1 }]} value={form.weight_ideal_kg}
            onChangeText={v => setF('weight_ideal_kg', v)} placeholder="kg" placeholderTextColor={SURFACES.disabled} keyboardType="numeric" />
          <TextInput style={[styles.weightCtxInput, { flex: 2 }]} value={form.weight_ideal_notes}
            onChangeText={v => setF('weight_ideal_notes', v)} placeholder="notas (frame, estilo vida)" placeholderTextColor={SURFACES.disabled} />
        </View>
      </View>
    </SaveableSection>
  );
}

function ObjectivesSaveSection({ profile, isDraft, clientId, onSaved }: {
  profile: Record<string, any> | null; isDraft: boolean; clientId: string;
  onSaved: (updates: Record<string, any>) => void;
}) {
  const [form, setForm] = useState({
    primary_goal: profile?.primary_goal ?? '',
    goal_timeline: profile?.goal_timeline ?? '',
    red_flags: profile?.red_flags ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (profile) {
      setForm({
        primary_goal: profile.primary_goal ?? '',
        goal_timeline: profile.goal_timeline ?? '',
        red_flags: profile.red_flags ?? '',
      });
    }
  }, [profile]);

  const hasChanges = form.primary_goal !== (profile?.primary_goal ?? '') ||
    form.goal_timeline !== (profile?.goal_timeline ?? '') ||
    form.red_flags !== (profile?.red_flags ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertClientProfile(clientId, {
        primary_goal: form.primary_goal || null,
        goal_timeline: form.goal_timeline || null,
        red_flags: form.red_flags || null,
      });
      onSaved(form);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    }
    setSaving(false);
  };

  return (
    <SaveableSection hasChanges={hasChanges}>
      <SectionSaveHeader title="OBJETIVOS" hasChanges={hasChanges} isSaving={saving}
        saveStatus={saving ? 'saving' : status} onSave={handleSave} />
      {[
        { key: 'primary_goal', label: 'Objetivo principal', ph: 'Ej: Bajar 10kg en 6 meses' },
        { key: 'goal_timeline', label: 'Plazo', ph: 'Ej: 6 meses' },
        { key: 'red_flags', label: 'Banderas rojas', ph: 'Ej: Lesión rodilla' },
      ].map(f => (
        <View key={f.key} style={{ marginBottom: Spacing.xs }}>
          <EliteText variant="caption" style={{ color: f.key === 'red_flags' ? SEMANTIC.error + '80' : TEXT_COLORS.muted, fontSize: 10, marginBottom: 2 }}>{f.label}</EliteText>
          <TextInput
            style={[styles.editableInput, f.key === 'red_flags' && { borderColor: SEMANTIC.error + '30' }]}
            value={form[f.key as keyof typeof form]}
            onChangeText={v => { setForm(prev => ({ ...prev, [f.key]: v })); setStatus('idle'); }}
            placeholder={f.ph} placeholderTextColor={SURFACES.disabled} editable={isDraft}
          />
        </View>
      ))}
    </SaveableSection>
  );
}

function SoapNotesSaveSection({ consultation, isDraft, onSaved }: {
  consultation: Consultation; isDraft: boolean;
  onSaved: (updates: Record<string, any>) => void;
}) {
  const fields = [
    { key: 'chief_complaint', label: 'Motivo de consulta', ph: '¿Por qué viene hoy?', multi: false },
    { key: 'subjective_notes', label: 'S — Subjetivo', ph: 'Lo que el paciente reporta', multi: true },
    { key: 'objective_notes', label: 'O — Objetivo', ph: 'Lo que observas', multi: true },
    { key: 'assessment', label: 'A — Análisis', ph: 'Tu evaluación', multi: true },
    { key: 'plan', label: 'P — Plan', ph: 'Plan hasta la próxima consulta', multi: true },
    { key: 'general_notes', label: 'Notas generales', ph: 'Notas libres', multi: true },
  ] as const;

  const [form, setForm] = useState(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) initial[f.key] = (consultation as any)[f.key] ?? '';
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const updated: Record<string, string> = {};
    for (const f of fields) updated[f.key] = (consultation as any)[f.key] ?? '';
    setForm(updated);
  }, [consultation.id]);

  const hasChanges = fields.some(f => form[f.key] !== ((consultation as any)[f.key] ?? ''));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {};
      for (const f of fields) updates[f.key] = form[f.key]?.trim() || null;
      await updateConsultation(consultation.id, updates as any);
      onSaved(updates);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    }
    setSaving(false);
  };

  return (
    <SaveableSection hasChanges={hasChanges}>
      <SectionSaveHeader title="NOTAS CLÍNICAS (SOAP)" hasChanges={hasChanges} isSaving={saving}
        saveStatus={saving ? 'saving' : status} onSave={handleSave} titleColor={Colors.neonGreen} />
      {fields.map(f => (
        <View key={f.key} style={{ marginBottom: Spacing.sm }}>
          <EliteText variant="caption" style={{ color: Colors.neonGreen + '80', fontSize: 10, marginBottom: 2 }}>{f.label}</EliteText>
          <TextInput
            style={[styles.editableInput, f.multi && { minHeight: 60 }]}
            value={form[f.key]}
            onChangeText={v => { setForm(prev => ({ ...prev, [f.key]: v })); setStatus('idle'); }}
            placeholder={f.ph} placeholderTextColor={SURFACES.disabled} multiline={f.multi} editable={isDraft}
          />
        </View>
      ))}
    </SaveableSection>
  );
}

// ══════════════════════════
// TAB: NUTRICIÓN (coach)
// ══════════════════════════

function NutritionCoachTab({ clientId }: { clientId: string }) {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [foods, setFoods] = useState<FoodLog[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today());
  const [viewMode, setViewMode] = useState<'today' | 'yesterday' | 'week'>('today');
  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Plan form
  const [planForm, setPlanForm] = useState({
    name: '', diet_type: '', calorie_target: '', protein_target: '', carb_target: '', fat_target: '',
    fiber_target: '', water_target: '', fasting_hours: '', feeding_window_start: '', feeding_window_end: '',
    meals_per_day: '3', foods_to_avoid: '', foods_to_prioritize: '', allergies: '', notes: '',
  });
  const [planSaving, setPlanSaving] = useState(false);
  const [planStatus, setPlanStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => { loadData(); }, [clientId, viewMode, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    const start = viewMode === 'week' ? fourteenDaysAgo() : selectedDate;
    const end = selectedDate;
    const [p, f, sc] = await Promise.all([
      getActivePlan(clientId).catch(() => null),
      getFoodLogsRange(clientId, start, end).catch(() => []),
      getDailyScoresRange(clientId, start, end).catch(() => []),
    ]);
    setPlan(p);
    setFoods(f);
    setScores(sc);
    if (p) {
      setPlanForm({
        name: p.name ?? '', diet_type: p.diet_type ?? '', calorie_target: p.calorie_target?.toString() ?? '',
        protein_target: p.protein_target?.toString() ?? '', carb_target: p.carb_target?.toString() ?? '',
        fat_target: p.fat_target?.toString() ?? '', fiber_target: p.fiber_target?.toString() ?? '',
        water_target: p.water_target?.toString() ?? '', fasting_hours: p.fasting_hours?.toString() ?? '',
        feeding_window_start: p.feeding_window_start ?? '', feeding_window_end: p.feeding_window_end ?? '',
        meals_per_day: p.meals_per_day?.toString() ?? '3',
        foods_to_avoid: (p.foods_to_avoid ?? []).join(', '),
        foods_to_prioritize: (p.foods_to_prioritize ?? []).join(', '),
        allergies: (p.allergies ?? []).join(', '),
        notes: p.notes ?? '',
      });
    }
    setLoading(false);
  };

  const handleSavePlan = async () => {
    setPlanSaving(true);
    try {
      const data: any = {
        name: planForm.name || 'Plan nutricional',
        diet_type: planForm.diet_type || null,
        calorie_target: planForm.calorie_target ? Number(planForm.calorie_target) : null,
        protein_target: planForm.protein_target ? Number(planForm.protein_target) : null,
        carb_target: planForm.carb_target ? Number(planForm.carb_target) : null,
        fat_target: planForm.fat_target ? Number(planForm.fat_target) : null,
        fiber_target: planForm.fiber_target ? Number(planForm.fiber_target) : null,
        water_target: planForm.water_target ? Number(planForm.water_target) : null,
        fasting_hours: planForm.fasting_hours ? Number(planForm.fasting_hours) : null,
        feeding_window_start: planForm.feeding_window_start || null,
        feeding_window_end: planForm.feeding_window_end || null,
        meals_per_day: planForm.meals_per_day ? Number(planForm.meals_per_day) : 3,
        foods_to_avoid: planForm.foods_to_avoid ? planForm.foods_to_avoid.split(',').map(s => s.trim()).filter(Boolean) : [],
        foods_to_prioritize: planForm.foods_to_prioritize ? planForm.foods_to_prioritize.split(',').map(s => s.trim()).filter(Boolean) : [],
        allergies: planForm.allergies ? planForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        notes: planForm.notes || null,
      };
      if (plan) {
        await updatePlan(plan.id, data);
      } else {
        await createPlan({ ...data, user_id: clientId });
      }
      setPlanStatus('saved');
      setTimeout(() => setPlanStatus('idle'), 3000);
      loadData();
    } catch { setPlanStatus('error'); }
    setPlanSaving(false);
  };

  const setF = (key: string, value: string) => { setPlanForm(prev => ({ ...prev, [key]: value })); setPlanStatus('idle'); };

  // Macros del día seleccionado
  const dayFoods = foods.filter(f => f.date === selectedDate)
    .sort((a, b) => (a.meal_time ?? '').localeCompare(b.meal_time ?? ''));
  const dayTotals = {
    calories: dayFoods.reduce((s, f) => s + (f.ai_analysis?.totals?.calories ?? f.ai_analysis?.estimated_calories ?? f.calories ?? 0), 0),
    protein: dayFoods.reduce((s, f) => s + (f.ai_analysis?.totals?.protein ?? f.ai_analysis?.estimated_protein ?? f.protein_g ?? 0), 0),
    carbs: dayFoods.reduce((s, f) => s + (f.ai_analysis?.totals?.carbs ?? f.ai_analysis?.estimated_carbs ?? f.carbs_g ?? 0), 0),
    fat: dayFoods.reduce((s, f) => s + (f.ai_analysis?.totals?.fat ?? f.ai_analysis?.estimated_fat ?? f.fat_g ?? 0), 0),
  };
  const dayScore = scores.find(s => s.date === selectedDate);

  // Últimos 7 días para grid semanal
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return { date: dateStr, label: dayNames[d.getDay()] };
  });

  // Patrones de 14 días
  const computePatterns = () => {
    const patterns: { text: string; type: 'success' | 'warning' | 'error' }[] = [];
    const last14Foods = foods;
    const last14Scores = scores;

    // Proteína baja sostenida
    if (plan?.protein_target && last14Scores.length >= 5) {
      const lowProtDays = last14Scores.filter(s => s.total_protein != null && s.total_protein < (plan.protein_target ?? 80) * 0.7);
      if (lowProtDays.length >= 5) {
        patterns.push({ text: `Proteina baja en ${lowProtDays.length} de ${last14Scores.length} dias (< 70% del objetivo)`, type: 'error' });
      }
    }

    // Comidas perdidas
    const last7Scores = last14Scores.filter(s => {
      const d = new Date(s.date); const diff = (Date.now() - d.getTime()) / 86400000;
      return diff <= 7;
    });
    const missedMeals = last7Scores.filter(s => (s.meals_logged ?? 0) < (plan?.meals_per_day ?? 3) * 0.5);
    if (missedMeals.length >= 3) {
      patterns.push({ text: `Comidas insuficientes en ${missedMeals.length} de los ultimos 7 dias`, type: 'warning' });
    }

    // Hidratación baja
    const lowWaterDays = last14Scores.filter(s => s.hydration_score != null && s.hydration_score < 50);
    if (lowWaterDays.length >= 3) {
      patterns.push({ text: `Hidratacion baja en ${lowWaterDays.length} dias`, type: 'warning' });
    }

    // Red flags recurrentes
    const flagCounts: Record<string, number> = {};
    last14Scores.forEach(s => {
      (s.red_flags ?? []).forEach((f: string) => { flagCounts[f] = (flagCounts[f] ?? 0) + 1; });
    });
    Object.entries(flagCounts).forEach(([flag, count]) => {
      if (count >= 3) {
        patterns.push({ text: `"${flag}" detectado ${count} veces en 14 dias`, type: 'error' });
      }
    });

    // Highlights positivos
    const goodDays = last14Scores.filter(s => (s.overall_score ?? 0) >= 75);
    if (goodDays.length >= 5) {
      patterns.push({ text: `${goodDays.length} dias con score >= 75 — buena adherencia`, type: 'success' });
    }

    return patterns;
  };

  // Sugerencia IA
  const handleSuggest = async () => {
    setLoadingSuggestion(true);
    setSuggestion(null);
    try {
      const result = await suggestMealForDeficit(clientId, dayTotals);
      setSuggestion(result);
    } catch {
      setSuggestion('Error al generar sugerencia.');
    }
    setLoadingSuggestion(false);
  };

  // Color de tag
  const getTagColor = (tag: string) => {
    const positive = ['alta_proteina', 'grasas_saludables', 'ingredientes_naturales', 'fibra', 'omega3', 'antioxidantes', 'comida_real'];
    const negative = ['ultra_procesado', 'alto_azucar', 'grasa_trans', 'harinas_refinadas', 'exceso_sodio'];
    if (positive.some(p => tag.includes(p))) return SEMANTIC.success;
    if (negative.some(n => tag.includes(n))) return SEMANTIC.error;
    return CATEGORY_COLORS.nutrition;
  };

  if (loading) return <ActivityIndicator color={CATEGORY_COLORS.nutrition} style={{ marginVertical: Spacing.lg }} />;

  const NI = ({ label, field, placeholder, kb }: { label: string; field: string; placeholder: string; kb?: string }) => (
    <View style={{ flex: 1 }}>
      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9, marginBottom: 2 }}>{label}</EliteText>
      <TextInput style={styles.editableInput} value={planForm[field as keyof typeof planForm]}
        onChangeText={v => setF(field, v)} placeholder={placeholder} placeholderTextColor={SURFACES.disabled}
        keyboardType={kb as any ?? 'default'} />
    </View>
  );

  const pillStyle = {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: SURFACES.border, backgroundColor: SURFACES.card,
  };
  const activePillStyle = {
    borderColor: CATEGORY_COLORS.nutrition, backgroundColor: CATEGORY_COLORS.nutrition + '15',
  };
  const sectionLabelStyle = {
    color: CATEGORY_COLORS.nutrition, letterSpacing: 2, marginTop: Spacing.md, marginBottom: Spacing.sm,
  };
  const weekDayCellStyle = {
    alignItems: 'center' as const, padding: Spacing.xs, borderRadius: 8,
    borderWidth: 1, borderColor: SURFACES.border, backgroundColor: SURFACES.card,
    minWidth: 42,
  };

  const patterns = computePatterns();

  // Déficit respecto al plan
  const deficit = plan ? {
    calories: Math.max(0, (plan.calorie_target ?? 0) - dayTotals.calories),
    protein: Math.max(0, (plan.protein_target ?? 0) - dayTotals.protein),
    carbs: Math.max(0, (plan.carb_target ?? 0) - dayTotals.carbs),
    fat: Math.max(0, (plan.fat_target ?? 0) - dayTotals.fat),
  } : null;

  return (
    <View>
      {/* ═══ Row 1: Plan nutricional ═══ */}
      <SaveableSection hasChanges={planStatus === 'idle' && plan != null}>
        <SectionSaveHeader title="PLAN NUTRICIONAL" hasChanges={true} isSaving={planSaving}
          saveStatus={planSaving ? 'saving' : planStatus} onSave={handleSavePlan} titleColor={CATEGORY_COLORS.nutrition} />

        <NI label="Nombre del plan" field="name" placeholder="Ej: Plan anti-inflamatorio" />
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <NI label="Tipo dieta" field="diet_type" placeholder="mediterranean" />
          <NI label="Comidas/día" field="meals_per_day" placeholder="3" kb="numeric" />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <NI label="Calorías" field="calorie_target" placeholder="kcal" kb="numeric" />
          <NI label="Proteína (g)" field="protein_target" placeholder="g" kb="numeric" />
          <NI label="Carbos (g)" field="carb_target" placeholder="g" kb="numeric" />
          <NI label="Grasa (g)" field="fat_target" placeholder="g" kb="numeric" />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <NI label="Agua (L)" field="water_target" placeholder="2.5" kb="numeric" />
          <NI label="Ayuno (h)" field="fasting_hours" placeholder="16" kb="numeric" />
          <NI label="Ventana inicio" field="feeding_window_start" placeholder="12:00" />
          <NI label="Ventana fin" field="feeding_window_end" placeholder="20:00" />
        </View>
        <View style={{ marginTop: Spacing.sm }}>
          <NI label="Alimentos a evitar (separados por coma)" field="foods_to_avoid" placeholder="gluten, lácteos, azúcar" />
        </View>
        <View style={{ marginTop: Spacing.sm }}>
          <NI label="Alimentos a priorizar (separados por coma)" field="foods_to_prioritize" placeholder="verduras, omega 3, proteína magra" />
        </View>
        <View style={{ marginTop: Spacing.sm }}>
          <NI label="Alergias (separadas por coma)" field="allergies" placeholder="nueces, mariscos" />
        </View>
        <View style={{ marginTop: Spacing.sm }}>
          <NI label="Notas" field="notes" placeholder="Notas adicionales del plan" />
        </View>
      </SaveableSection>

      {/* ═══ Row 2: Resumen del día ═══ */}
      <EliteText variant="caption" style={sectionLabelStyle}>RESUMEN DEL DIA</EliteText>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['today', 'yesterday', 'week'] as const).map(v => (
          <Pressable key={v} onPress={() => { setViewMode(v); setSelectedDate(v === 'yesterday' ? yesterday() : today()); }}
            style={[pillStyle, viewMode === v && activePillStyle]}>
            <EliteText variant="caption" style={{ color: viewMode === v ? CATEGORY_COLORS.nutrition : TEXT_COLORS.muted, fontSize: 11 }}>
              {v === 'today' ? 'Hoy' : v === 'yesterday' ? 'Ayer' : 'Semana'}
            </EliteText>
          </Pressable>
        ))}
      </View>

      {/* Score + macros */}
      <View style={{ backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border, padding: Spacing.sm, marginBottom: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs }}>
          <View style={{
            width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
            backgroundColor: (dayScore?.overall_score >= 75 ? SEMANTIC.success : dayScore?.overall_score >= 50 ? SEMANTIC.warning : dayScore?.overall_score ? SEMANTIC.error : TEXT_COLORS.muted) + '20',
          }}>
            <EliteText style={{
              fontFamily: Fonts.bold, fontSize: 16,
              color: dayScore?.overall_score >= 75 ? SEMANTIC.success : dayScore?.overall_score >= 50 ? SEMANTIC.warning : dayScore?.overall_score ? SEMANTIC.error : TEXT_COLORS.muted,
            }}>
              {dayScore?.overall_score ?? '--'}
            </EliteText>
          </View>
          <View style={{ flex: 1 }}>
            <EliteText variant="caption" style={{ color: TEXT_COLORS.primary, fontSize: 12, fontFamily: Fonts.semiBold }}>
              Score del {selectedDate === today() ? 'hoy' : selectedDate}
            </EliteText>
            <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 10 }}>
              {dayFoods.length} comidas registradas
            </EliteText>
          </View>
        </View>

        {/* Macros row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
          {[
            { label: 'Cal', value: Math.round(dayTotals.calories), target: plan?.calorie_target, unit: '' },
            { label: 'Prot', value: Math.round(dayTotals.protein), target: plan?.protein_target, unit: 'g' },
            { label: 'Carb', value: Math.round(dayTotals.carbs), target: plan?.carb_target, unit: 'g' },
            { label: 'Grasa', value: Math.round(dayTotals.fat), target: plan?.fat_target, unit: 'g' },
          ].map(m => {
            const pct = m.target ? Math.round((m.value / m.target) * 100) : null;
            const col = pct != null ? (pct >= 80 ? SEMANTIC.success : pct >= 50 ? SEMANTIC.warning : SEMANTIC.error) : TEXT_COLORS.secondary;
            return (
              <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9 }}>{m.label}</EliteText>
                <EliteText style={{ color: col, fontFamily: Fonts.bold, fontSize: 14 }}>
                  {m.value}{m.unit}
                </EliteText>
                {m.target != null && (
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 8 }}>
                    / {m.target}{m.unit}
                  </EliteText>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ═══ Row 3: Timeline de comidas ═══ */}
      <EliteText variant="caption" style={sectionLabelStyle}>COMIDAS</EliteText>
      {dayFoods.length === 0 ? (
        <View style={{ alignItems: 'center', padding: Spacing.lg }}>
          <Ionicons name="restaurant-outline" size={28} color={TEXT_COLORS.muted} />
          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: Spacing.sm }}>
            Sin registros de comida para {selectedDate === today() ? 'hoy' : selectedDate}
          </EliteText>
        </View>
      ) : (
        dayFoods.map(food => {
          const ai = food.ai_analysis;
          const sc = ai?.score;
          const scoreCol = sc >= 80 ? SEMANTIC.success : sc >= 60 ? SEMANTIC.warning : sc ? SEMANTIC.error : TEXT_COLORS.muted;
          const isExpanded = expandedFoodId === food.id;
          return (
            <Pressable key={food.id} onPress={() => setExpandedFoodId(isExpanded ? null : food.id)}
              style={{
                backgroundColor: SURFACES.card, borderRadius: 10, borderWidth: 0.5,
                borderColor: isExpanded ? CATEGORY_COLORS.nutrition + '60' : SURFACES.border,
                borderLeftWidth: 3, borderLeftColor: CATEGORY_COLORS.nutrition,
                padding: Spacing.sm, marginBottom: Spacing.xs,
              }}>
              {/* Header: descripción + score */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.primary, fontSize: 12 }}>{food.description}</EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9 }}>
                    {food.meal_type}{food.meal_time ? ` · ${food.meal_time}` : ''} · {food.date}
                  </EliteText>
                </View>
                {sc != null && (
                  <View style={{ backgroundColor: scoreCol + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <EliteText variant="caption" style={{ color: scoreCol, fontFamily: Fonts.bold, fontSize: 11 }}>{sc}</EliteText>
                  </View>
                )}
              </View>

              {/* Inline macros */}
              <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10, marginTop: 4 }}>
                {ai?.totals?.calories ?? ai?.estimated_calories ?? food.calories ?? 0} cal
                {' · '}{ai?.totals?.protein ?? ai?.estimated_protein ?? food.protein_g ?? 0}g prot
                {' · '}{ai?.totals?.carbs ?? ai?.estimated_carbs ?? food.carbs_g ?? 0}g carb
                {' · '}{ai?.totals?.fat ?? ai?.estimated_fat ?? food.fat_g ?? 0}g fat
              </EliteText>

              {/* Tags */}
              {ai?.tags && ai.tags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {(ai.tags as string[]).map((tag: string, i: number) => (
                    <View key={i} style={{ backgroundColor: getTagColor(tag) + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                      <EliteText variant="caption" style={{ color: getTagColor(tag), fontSize: 8 }}>
                        {tag.replace(/_/g, ' ')}
                      </EliteText>
                    </View>
                  ))}
                </View>
              )}

              {/* Feedback (colapsable) */}
              {ai?.feedback && isExpanded && (
                <View style={{ marginTop: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: 0.5, borderTopColor: SURFACES.border }}>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10 }}>{ai.feedback}</EliteText>
                </View>
              )}

              {/* Ingredientes expandidos */}
              {ai?.ingredients && isExpanded && (
                <View style={{ marginTop: Spacing.xs }}>
                  <EliteText variant="caption" style={{ color: CATEGORY_COLORS.nutrition, fontSize: 9, fontFamily: Fonts.bold, marginBottom: 2 }}>
                    INGREDIENTES
                  </EliteText>
                  {(ai.ingredients as any[]).map((ing: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 }}>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 9, flex: 1 }}>
                        {ing.name} ({ing.portion})
                      </EliteText>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9 }}>
                        {ing.calories ?? 0}cal · {ing.protein ?? 0}p
                      </EliteText>
                    </View>
                  ))}
                </View>
              )}

              {/* Red flags */}
              {ai?.red_flags && ai.red_flags.length > 0 && isExpanded && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {(ai.red_flags as string[]).map((flag: string, i: number) => (
                    <View key={i} style={{ backgroundColor: SEMANTIC.error + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                      <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 8 }}>{flag}</EliteText>
                    </View>
                  ))}
                </View>
              )}

              {/* Expand hint */}
              {!isExpanded && ai?.feedback && (
                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 8, marginTop: 2 }}>
                  Toca para ver detalles
                </EliteText>
              )}
            </Pressable>
          );
        })
      )}

      {/* ═══ Row 4: Lo que falta + sugerencia IA ═══ */}
      {plan && dayFoods.length > 0 && deficit && (
        <View>
          <EliteText variant="caption" style={sectionLabelStyle}>LO QUE FALTA HOY</EliteText>
          <View style={{ backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border, padding: Spacing.sm, marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: 'Cal', value: deficit.calories, unit: '' },
                { label: 'Prot', value: Math.round(deficit.protein), unit: 'g' },
                { label: 'Carb', value: Math.round(deficit.carbs), unit: 'g' },
                { label: 'Grasa', value: Math.round(deficit.fat), unit: 'g' },
              ].map(m => (
                <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9 }}>{m.label}</EliteText>
                  <EliteText style={{ color: m.value > 0 ? SEMANTIC.warning : SEMANTIC.success, fontFamily: Fonts.bold, fontSize: 14 }}>
                    {m.value > 0 ? `-${Math.round(m.value)}` : '0'}{m.unit}
                  </EliteText>
                </View>
              ))}
            </View>

            {/* Botón sugerir comida */}
            <Pressable onPress={handleSuggest} disabled={loadingSuggestion}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
                backgroundColor: CATEGORY_COLORS.nutrition + '15', borderWidth: 1, borderColor: CATEGORY_COLORS.nutrition + '30',
                borderRadius: 10, paddingVertical: Spacing.sm, marginTop: Spacing.sm,
              }}>
              {loadingSuggestion ? (
                <ActivityIndicator color={CATEGORY_COLORS.nutrition} size="small" />
              ) : (
                <Ionicons name="sparkles-outline" size={14} color={CATEGORY_COLORS.nutrition} />
              )}
              <EliteText variant="caption" style={{ color: CATEGORY_COLORS.nutrition, fontFamily: Fonts.bold, fontSize: 11 }}>
                {loadingSuggestion ? 'Generando...' : 'Sugerir comida con IA'}
              </EliteText>
            </Pressable>

            {/* Sugerencia IA */}
            {suggestion && (
              <View style={{ marginTop: Spacing.sm, backgroundColor: CATEGORY_COLORS.nutrition + '08', borderRadius: 8, padding: Spacing.sm, borderLeftWidth: 2, borderLeftColor: CATEGORY_COLORS.nutrition }}>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.primary, fontSize: 11, lineHeight: 16 }}>
                  {suggestion}
                </EliteText>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ═══ Row 5: Vista semanal (7-day grid) ═══ */}
      <EliteText variant="caption" style={sectionLabelStyle}>ULTIMA SEMANA</EliteText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        {last7Days.map(day => {
          const ds = scores.find(s => s.date === day.date);
          const df = foods.filter(f => f.date === day.date);
          const scVal = ds?.overall_score;
          const color = scVal >= 75 ? SEMANTIC.success : scVal >= 50 ? SEMANTIC.warning : scVal ? SEMANTIC.error : TEXT_COLORS.muted;
          const isToday = day.date === today();
          const isSelected = day.date === selectedDate;
          return (
            <Pressable key={day.date} onPress={() => { setSelectedDate(day.date); setViewMode('today'); }}
              style={[weekDayCellStyle, isToday && { borderColor: CATEGORY_COLORS.nutrition }, isSelected && { backgroundColor: CATEGORY_COLORS.nutrition + '10' }]}>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9 }}>{day.label}</EliteText>
              <EliteText style={{ color, fontFamily: Fonts.bold, fontSize: 14 }}>{scVal ?? '--'}</EliteText>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 8 }}>{df.length} com</EliteText>
            </Pressable>
          );
        })}
      </View>

      {/* ═══ Row 6: Patrones detectados (14 días) ═══ */}
      {patterns.length > 0 && (
        <View>
          <EliteText variant="caption" style={sectionLabelStyle}>PATRONES DETECTADOS</EliteText>
          {patterns.map((p, i) => {
            const bg = p.type === 'success' ? SEMANTIC.success : p.type === 'warning' ? SEMANTIC.warning : SEMANTIC.error;
            return (
              <View key={i} style={{
                backgroundColor: bg + '10', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: bg,
                padding: Spacing.sm, marginBottom: Spacing.xs, borderWidth: 0.5, borderColor: bg + '20',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons
                    name={p.type === 'success' ? 'checkmark-circle' : p.type === 'warning' ? 'alert-circle' : 'warning'}
                    size={14} color={bg} />
                  <EliteText variant="caption" style={{ color: bg, fontSize: 11, flex: 1 }}>
                    {p.text}
                  </EliteText>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function today() { return new Date().toISOString().split('T')[0]; }
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; }
function sevenDaysAgo() { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; }
function fourteenDaysAgo() { const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0]; }

// TAB: ESTUDIOS CLÍNICOS
// ══════════════════════════

function StudySummaryField({ studyId, initial, onSave }: { studyId: string; initial: string; onSave: (id: string, v: string) => void }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: string) => {
    setText(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(studyId, v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
  };

  return (
    <View style={{ backgroundColor: '#0a1a15', borderRadius: 8, padding: Spacing.sm, borderLeftWidth: 2, borderLeftColor: CATEGORY_COLORS.metrics }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Ionicons name="eye-outline" size={12} color={CATEGORY_COLORS.metrics} />
        <EliteText variant="caption" style={{ color: CATEGORY_COLORS.metrics, fontSize: 10, fontFamily: Fonts.bold }}>RESUMEN PARA PACIENTE</EliteText>
        {saved && <EliteText variant="caption" style={{ color: ATP_BRAND.lime, fontSize: 9 }}>✓ Guardado</EliteText>}
      </View>
      <TextInput
        style={{ color: TEXT_COLORS.primary, fontSize: 12, lineHeight: 18, minHeight: 40 }}
        value={text}
        onChangeText={handleChange}
        placeholder="El resumen aparecerá aquí después de interpretar..."
        placeholderTextColor={TEXT_COLORS.muted}
        multiline
      />
    </View>
  );
}

function StudyNotesField({ studyId, initial, onSave }: { studyId: string; initial: string; onSave: (id: string, v: string) => void }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: string) => {
    setText(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave(studyId, v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10 }}>Notas del coach</EliteText>
        {saved && <EliteText variant="caption" style={{ color: ATP_BRAND.lime, fontSize: 9 }}>✓ Guardado</EliteText>}
      </View>
      <TextInput
        style={{ backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm, color: TEXT_COLORS.primary, fontSize: 12, minHeight: 40 }}
        value={text}
        onChangeText={handleChange}
        placeholder="Notas privadas..."
        placeholderTextColor={TEXT_COLORS.muted}
        multiline
      />
    </View>
  );
}

function StudiesTab({ clientId }: { clientId: string }) {
  const [studies, setStudies] = useState<ClinicalStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [interpreting, setInterpreting] = useState<string | null>(null);

  // Create form
  const [newType, setNewType] = useState('ultrasound');
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPhysician, setNewPhysician] = useState('');
  const [newLab, setNewLab] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadStudies(); }, [clientId]);

  const loadStudies = async () => {
    setLoading(true);
    try { setStudies(await getStudies(clientId)); } catch { /* */ }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createStudy({
        user_id: clientId,
        study_type: newType,
        study_name: newName.trim(),
        study_date: newDate,
        ordering_physician: newPhysician.trim() || undefined,
        performing_lab: newLab.trim() || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewPhysician('');
      setNewLab('');
      loadStudies();
    } catch (err: any) {
      if (__DEV__) console.error('[createStudy]', err);
    }
    setCreating(false);
  };

  const handleInterpret = async (studyId: string) => {
    setInterpreting(studyId);
    try {
      await interpretStudy(studyId);
      loadStudies();
    } catch (err: any) {
      if (__DEV__) console.error('[interpretStudy]', err);
    }
    setInterpreting(null);
  };

  const handleDelete = async (studyId: string) => {
    if (typeof window !== 'undefined') {
      if (!window.confirm('¿Eliminar este estudio?')) return;
    }
    try { await deleteStudy(studyId); loadStudies(); } catch { /* */ }
  };

  const handleReview = async (studyId: string) => {
    try { await markAsReviewed(studyId); loadStudies(); } catch { /* */ }
  };

  const handleSaveNotes = async (studyId: string, notes: string) => {
    try { await updateStudy(studyId, { coach_notes: notes } as any); } catch { /* */ }
  };

  const handleSaveSummary = async (studyId: string, summary: string) => {
    try { await updateStudy(studyId, { patient_summary: summary } as any); } catch { /* */ }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      uploaded: { label: 'Pendiente', color: TEXT_COLORS.muted },
      processing: { label: 'Procesando...', color: SEMANTIC.warning },
      interpreted: { label: 'Interpretado', color: SEMANTIC.info },
      reviewed: { label: 'Revisado ✓', color: SEMANTIC.success },
    };
    const s = map[status] ?? map.uploaded;
    return (
      <View style={{ backgroundColor: s.color + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
        <EliteText variant="caption" style={{ color: s.color, fontSize: 10, fontFamily: Fonts.bold }}>{s.label}</EliteText>
      </View>
    );
  };

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
        <EliteText variant="label" style={{ color: CATEGORY_COLORS.metrics, letterSpacing: 2 }}>ESTUDIOS CLÍNICOS</EliteText>
        <Pressable onPress={() => setShowCreate(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="add-circle-outline" size={16} color={CATEGORY_COLORS.metrics} />
          <EliteText variant="caption" style={{ color: CATEGORY_COLORS.metrics, fontFamily: Fonts.semiBold }}>Subir estudio</EliteText>
        </Pressable>
      </View>

      {/* Create modal */}
      {showCreate && (
        <View style={{ backgroundColor: SURFACES.card, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 0.5, borderColor: SURFACES.border }}>
          <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10, marginBottom: 4 }}>Tipo de estudio</EliteText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {STUDY_TYPES.map(st => (
                <Pressable key={st.key} onPress={() => { setNewType(st.key); if (!newName) setNewName(st.label); }}
                  style={{ backgroundColor: newType === st.key ? CATEGORY_COLORS.metrics + '20' : SURFACES.cardLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: newType === st.key ? 1 : 0, borderColor: CATEGORY_COLORS.metrics + '50' }}>
                  <EliteText variant="caption" style={{ color: newType === st.key ? CATEGORY_COLORS.metrics : TEXT_COLORS.secondary, fontSize: 11 }}>{st.emoji} {st.label}</EliteText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput style={{ backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm, color: TEXT_COLORS.primary, fontSize: 14, marginBottom: Spacing.sm }}
            value={newName} onChangeText={setNewName} placeholder="Nombre del estudio" placeholderTextColor={TEXT_COLORS.muted} />
          <TextInput style={{ backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm, color: TEXT_COLORS.primary, fontSize: 14, marginBottom: Spacing.sm }}
            value={newDate} onChangeText={setNewDate} placeholder="Fecha (YYYY-MM-DD)" placeholderTextColor={TEXT_COLORS.muted} />
          <TextInput style={{ backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm, color: TEXT_COLORS.primary, fontSize: 14, marginBottom: Spacing.sm }}
            value={newPhysician} onChangeText={setNewPhysician} placeholder="Médico (opcional)" placeholderTextColor={TEXT_COLORS.muted} />
          <TextInput style={{ backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm, color: TEXT_COLORS.primary, fontSize: 14, marginBottom: Spacing.sm }}
            value={newLab} onChangeText={setNewLab} placeholder="Laboratorio/Clínica (opcional)" placeholderTextColor={TEXT_COLORS.muted} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
            <Pressable onPress={() => setShowCreate(false)}>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted }}>Cancelar</EliteText>
            </Pressable>
            <Pressable onPress={handleCreate} disabled={creating}
              style={{ backgroundColor: CATEGORY_COLORS.metrics, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: 8 }}>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold }}>
                {creating ? 'Guardando...' : 'Guardar'}
              </EliteText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Loading */}
      {loading && <ActivityIndicator color={CATEGORY_COLORS.metrics} style={{ marginVertical: Spacing.lg }} />}

      {/* Empty */}
      {!loading && studies.length === 0 && (
        <View style={{ alignItems: 'center', padding: Spacing.xl }}>
          <Ionicons name="document-text-outline" size={40} color={TEXT_COLORS.muted} />
          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: Spacing.sm }}>Sin estudios clínicos</EliteText>
        </View>
      )}

      {/* List */}
      {studies.map(study => {
        const st = getStudyType(study.study_type);
        const isExpanded = expandedId === study.id;
        const isInterpreting = interpreting === study.id;
        const findings = (study.findings ?? []) as string[];

        return (
          <View key={study.id} style={{ backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border, borderLeftWidth: 3, borderLeftColor: CATEGORY_COLORS.metrics, marginBottom: Spacing.sm, overflow: 'hidden' }}>
            {/* Header */}
            <Pressable onPress={() => setExpandedId(isExpanded ? null : study.id)} style={{ padding: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <EliteText style={{ fontSize: 20 }}>{st.emoji}</EliteText>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: 14 }}>{study.study_name}</EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 11 }}>
                    {new Date(study.study_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {study.ordering_physician ? ` · Dr. ${study.ordering_physician}` : ''}
                  </EliteText>
                </View>
                {statusBadge(study.status)}
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={TEXT_COLORS.muted} />
              </View>

              {/* Findings pills */}
              {findings.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.sm }}>
                  {findings.map((f, i) => (
                    <View key={i} style={{ backgroundColor: CATEGORY_COLORS.metrics + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <EliteText variant="caption" style={{ color: CATEGORY_COLORS.metrics, fontSize: 10 }}>{f}</EliteText>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>

            {/* Expanded content */}
            {isExpanded && (
              <View style={{ padding: Spacing.md, paddingTop: 0, gap: Spacing.md }}>
                {/* Interpretación clínica */}
                {study.original_interpretation ? (
                  <View style={{ backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm }}>
                    <EliteText variant="caption" style={{ color: CATEGORY_COLORS.metrics, fontSize: 10, fontFamily: Fonts.bold, marginBottom: 4 }}>INTERPRETACIÓN CLÍNICA</EliteText>
                    <EliteText variant="caption" style={{ color: TEXT_COLORS.primary, fontSize: 12, lineHeight: 18 }}>{study.original_interpretation}</EliteText>
                  </View>
                ) : null}

                {/* Resumen para paciente */}
                <StudySummaryField studyId={study.id} initial={study.patient_summary ?? ''} onSave={handleSaveSummary} />

                {/* Notas del coach */}
                <StudyNotesField studyId={study.id} initial={study.coach_notes ?? ''} onSave={handleSaveNotes} />

                {/* Botones */}
                <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
                  {study.status !== 'interpreted' && study.status !== 'reviewed' && (
                    <Pressable onPress={() => handleInterpret(study.id)} disabled={isInterpreting}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CATEGORY_COLORS.metrics + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Ionicons name="sparkles" size={14} color={CATEGORY_COLORS.metrics} />
                      <EliteText variant="caption" style={{ color: CATEGORY_COLORS.metrics, fontSize: 11 }}>
                        {isInterpreting ? 'Interpretando...' : 'Interpretar con IA'}
                      </EliteText>
                    </Pressable>
                  )}
                  {study.status === 'interpreted' && (
                    <>
                      <Pressable onPress={() => handleReview(study.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: SEMANTIC.success + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={SEMANTIC.success} />
                        <EliteText variant="caption" style={{ color: SEMANTIC.success, fontSize: 11 }}>Marcar revisado</EliteText>
                      </Pressable>
                      <Pressable onPress={() => handleInterpret(study.id)} disabled={isInterpreting}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Ionicons name="refresh-outline" size={14} color={TEXT_COLORS.secondary} />
                        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 11 }}>Reintepretar</EliteText>
                      </Pressable>
                    </>
                  )}
                  <Pressable onPress={() => handleDelete(study.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ionicons name="trash-outline" size={14} color={SEMANTIC.error} />
                    <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 11 }}>Eliminar</EliteText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ══════════════════════════
// TAB: CALENDARIO
// ══════════════════════════

function CalendarTab({ schedule }: { schedule: ClientScheduleItem[] }) {
  const weekly = schedule.filter(s => s.schedule_type === 'weekly_cycle');
  const specific = schedule.filter(s => s.schedule_type === 'specific_date');

  // Agrupar weekly por columna (Lun=0 ... Dom=6)
  const byCol: ClientScheduleItem[][] = Array.from({ length: 7 }, () => []);
  for (const s of weekly) {
    if (s.day_of_week !== null) {
      const col = DOW_TO_COL[s.day_of_week];
      byCol[col].push(s);
    }
  }

  return (
    <View>
      {schedule.length === 0 ? (
        <EliteText variant="caption" style={styles.emptyTab}>Sin rutinas programadas</EliteText>
      ) : (
        <>
          {/* Grid semanal */}
          {weekly.length > 0 && (
            <>
              <EliteText variant="caption" style={styles.sectionLabel}>CICLO SEMANAL</EliteText>
              <View style={styles.calGrid}>
                {DAY_LABELS_SHORT.map((day, col) => (
                  <View key={day} style={styles.calCol}>
                    <EliteText variant="caption" style={styles.calDayLabel}>{day}</EliteText>
                    {byCol[col].length > 0 ? (
                      byCol[col].map(s => (
                        <View key={s.id} style={[
                          styles.calChip,
                          { borderColor: s.assigned_by ? TEAL : SURFACES.border },
                        ]}>
                          <EliteText variant="caption" style={styles.calChipText} numberOfLines={2}>
                            {s.routine_name}
                          </EliteText>
                        </View>
                      ))
                    ) : (
                      <View style={styles.calEmpty} />
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Fechas específicas */}
          {specific.length > 0 && (
            <>
              <EliteText variant="caption" style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
                FECHAS ESPECÍFICAS
              </EliteText>
              {specific.map(s => (
                <View key={s.id} style={styles.scheduleRow}>
                  <View style={[styles.dot, { backgroundColor: SEMANTIC.info }]} />
                  <EliteText variant="caption" style={styles.scheduleDate}>{s.specific_date}</EliteText>
                  <EliteText variant="body" style={styles.scheduleName}>{s.routine_name}</EliteText>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

// ══════════════════════════
// TAB: RUTINAS
// ══════════════════════════

function RoutinesTab({ routines, onAssign }: { routines: ClientRoutine[]; onAssign: () => void }) {
  return (
    <View>
      {/* Botón asignar */}
      <Pressable onPress={onAssign} style={styles.assignBtn}>
        <Ionicons name="add-circle-outline" size={18} color={TEAL} />
        <EliteText variant="body" style={styles.assignBtnText}>Asignar rutina</EliteText>
      </Pressable>

      {routines.length === 0 ? (
        <EliteText variant="caption" style={styles.emptyTab}>El cliente no tiene rutinas</EliteText>
      ) : (
        routines.map(r => (
          <View key={r.id} style={styles.routineRow}>
            <View style={[styles.dot, {
              backgroundColor: r.mode === 'timer' ? Colors.neonGreen : CATEGORY_COLORS.mind,
            }]} />
            <View style={{ flex: 1 }}>
              <EliteText variant="body" style={styles.routineRowName}>{r.name}</EliteText>
              <EliteText variant="caption" style={styles.routineRowMeta}>
                {r.mode === 'timer' ? 'Timer' : 'Rutina'}
                {r.original_creator_id ? ' · Asignada por ti' : ''}
              </EliteText>
            </View>
            {r.original_creator_id && (
              <Ionicons name="person-outline" size={14} color={TEAL} />
            )}
          </View>
        ))
      )}
    </View>
  );
}

// ══════════════════════════
// TAB: PROGRESO (PRs agrupados por ejercicio)
// ══════════════════════════

function ProgressTab({ prs }: { prs: ClientPR[] }) {
  // Agrupar por ejercicio
  const byExercise = new Map<string, ClientPR[]>();
  for (const pr of prs) {
    const key = pr.exercise_id;
    if (!byExercise.has(key)) byExercise.set(key, []);
    byExercise.get(key)!.push(pr);
  }

  const groups = Array.from(byExercise.entries()).map(([id, records]) => ({
    exercise_id: id,
    exercise_name: records[0].exercise_name,
    muscle_group: records[0].muscle_group,
    records: records.sort((a, b) => a.rep_range - b.rep_range),
    latest: records.reduce((max, r) => r.achieved_at > max ? r.achieved_at : max, ''),
  })).sort((a, b) => b.latest.localeCompare(a.latest));

  return (
    <View>
      {groups.length === 0 ? (
        <EliteText variant="caption" style={styles.emptyTab}>Sin personal records</EliteText>
      ) : (
        groups.map(g => (
          <View key={g.exercise_id} style={styles.prGroup}>
            <View style={styles.prGroupHeader}>
              <EliteText variant="body" style={styles.prGroupName}>{g.exercise_name}</EliteText>
              <EliteText variant="caption" style={styles.prGroupMuscle}>{g.muscle_group}</EliteText>
            </View>
            <View style={styles.prChips}>
              {g.records.map((pr, i) => (
                <View key={i} style={styles.prChip}>
                  <EliteText variant="caption" style={styles.prChipLabel}>
                    {pr.rep_range === 1 ? '1RM' : `${pr.rep_range}RM`}
                  </EliteText>
                  <EliteText variant="body" style={styles.prChipValue}>{pr.weight_kg}kg</EliteText>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ══════════════════════════
// TAB: HISTORIAL
// ══════════════════════════

function HistoryTab({ history }: { history: ClientSession[] }) {
  return (
    <View>
      {history.length === 0 ? (
        <EliteText variant="caption" style={styles.emptyTab}>Sin historial de sesiones</EliteText>
      ) : (
        history.map(s => (
          <View key={s.date} style={styles.historyRow}>
            <View style={styles.historyDot} />
            <View style={{ flex: 1 }}>
              <EliteText variant="body" style={styles.historyTitle}>
                {s.exercises} ejercicio{s.exercises !== 1 ? 's' : ''} · {s.sets} sets
              </EliteText>
              <EliteText variant="caption" style={styles.historyMeta}>
                {new Date(s.date + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
                {s.volume_kg > 0 ? ` · ${s.volume_kg > 999 ? `${Math.round(s.volume_kg / 1000)}k` : `${s.volume_kg}kg`} vol` : ''}
              </EliteText>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ══════════════════════════
// STAT CARD
// ══════════════════════════

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <View style={styles.statCard}>
      <EliteText variant="caption" style={styles.statLabel}>{label}</EliteText>
      <EliteText style={[styles.statValue, { color }]}>{value}</EliteText>
      <EliteText variant="caption" style={styles.statSub}>{sub}</EliteText>
    </View>
  );
}

// ══════════════════════════
// ESTILOS
// ══════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ATP_BRAND.black },
  content: { maxWidth: 1000, padding: Spacing.lg, alignSelf: 'center', width: '100%' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  avatarLg: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: TEAL + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLgText: { color: TEAL, fontFamily: Fonts.bold, fontSize: 24 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 24, letterSpacing: 1 },
  headerSince: { color: TEXT_COLORS.secondary, marginTop: 2 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.neonGreen + '15', paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, borderRadius: Radius.pill,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.neonGreen },
  activeText: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 11 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: SURFACES.cardLight, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: SURFACES.border,
  },
  statLabel: { color: TEXT_COLORS.secondary, fontSize: 10, letterSpacing: 1, fontFamily: Fonts.bold },
  statValue: { fontSize: 28, fontFamily: Fonts.extraBold, marginVertical: 4 },
  statSub: { color: TEXT_COLORS.muted, fontSize: 10 },

  // Tabs
  tabsRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: SURFACES.border,
    marginBottom: Spacing.md, gap: Spacing.xs,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: TEAL },
  tabLabel: { color: TEXT_COLORS.muted, fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1 },
  tabContent: { minHeight: 300 },

  // Shared
  sectionLabel: { color: TEXT_COLORS.secondary, letterSpacing: 2, fontSize: 10, fontFamily: Fonts.bold, marginBottom: Spacing.sm },
  emptyTab: { color: TEXT_COLORS.muted, textAlign: 'center', padding: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Calendar grid
  calGrid: { flexDirection: 'row', gap: Spacing.xs },
  calCol: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  calDayLabel: { color: TEXT_COLORS.secondary, fontSize: 11, fontFamily: Fonts.bold, marginBottom: Spacing.xs },
  calChip: {
    width: '100%', backgroundColor: SURFACES.cardLight, borderRadius: Radius.sm,
    padding: Spacing.xs, borderWidth: 1, borderColor: SURFACES.border,
  },
  calChipText: { color: TEXT_COLORS.primary, fontSize: 10, textAlign: 'center' },
  calEmpty: { width: '100%', height: 30, backgroundColor: SURFACES.base, borderRadius: Radius.sm },

  // Schedule rows
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: SURFACES.card,
  },
  scheduleDate: { color: TEXT_COLORS.secondary, fontSize: 12, width: 90 },
  scheduleName: { flex: 1, fontSize: 14 },

  // Routines
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: TEAL + '10', borderRadius: Radius.md, borderWidth: 1,
    borderColor: TEAL + '30', padding: Spacing.md, marginBottom: Spacing.md,
  },
  assignBtnText: { color: TEAL, fontFamily: Fonts.semiBold },
  routineRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: SURFACES.card,
  },
  routineRowName: { fontFamily: Fonts.semiBold, fontSize: 14 },
  routineRowMeta: { color: TEXT_COLORS.secondary, fontSize: 11 },

  // PRs
  prGroup: {
    backgroundColor: SURFACES.cardLight, borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: SURFACES.border,
  },
  prGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  prGroupName: { fontFamily: Fonts.bold, fontSize: 15 },
  prGroupMuscle: { color: TEXT_COLORS.secondary, fontSize: 11, textTransform: 'capitalize' },
  prChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  prChip: {
    backgroundColor: SURFACES.card, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, alignItems: 'center', minWidth: 60,
  },
  prChipLabel: { color: TEXT_COLORS.muted, fontSize: 10, fontFamily: Fonts.bold },
  prChipValue: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] },

  // History
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: SURFACES.card,
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL },
  historyTitle: { fontFamily: Fonts.semiBold, fontSize: 14 },
  historyMeta: { color: TEXT_COLORS.secondary, fontSize: 12, marginTop: 2 },

  // Profile tab
  profileCard: {
    backgroundColor: SURFACES.cardLight,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SURFACES.border,
  },
  profileCardLabel: {
    color: TEXT_COLORS.secondary,
    letterSpacing: 2,
    fontSize: 10,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.card,
  },
  profileRowLabel: { color: TEXT_COLORS.muted, fontSize: 12 },
  profileRowValue: { color: TEXT_COLORS.primary, fontSize: 14, fontFamily: Fonts.semiBold },
  profilePlaceholderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  profilePlaceholderItem: {
    flex: 1,
    backgroundColor: SURFACES.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  profilePlaceholderLabel: { color: TEXT_COLORS.muted, fontSize: 10, marginBottom: 4 },
  profilePlaceholderValue: { color: SEMANTIC.noData, fontSize: 18, fontFamily: Fonts.bold },
  profileComingSoon: {
    color: SEMANTIC.noData,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  profileNotesPlaceholder: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  upcomingPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  upcomingPill: {
    backgroundColor: SURFACES.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  upcomingPillText: {
    color: TEXT_COLORS.muted,
    fontSize: 11,
    fontFamily: Fonts.semiBold,
  },

  // Condition board
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: 14 },
  zoneBadges: { flexDirection: 'row', gap: 4 },
  zoneBadge: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.pill,
  },
  conditionPills: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm,
  },
  condPill: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  condPillText: { fontSize: 11, fontFamily: Fonts.semiBold },

  // Oncologic note
  oncoNoteBox: {
    marginTop: Spacing.sm, backgroundColor: SURFACES.cardLight, borderRadius: 8,
    padding: Spacing.sm, borderWidth: 1, borderColor: CATEGORY_COLORS.mind + '30',
  },
  oncoNoteLabel: { color: CATEGORY_COLORS.mind, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4 },
  oncoNoteHint: { color: TEXT_COLORS.muted, fontSize: 11, fontStyle: 'italic' },

  // Scores
  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scoreCard: {
    flex: 1, minWidth: '45%', backgroundColor: SURFACES.card, borderRadius: 10,
    padding: Spacing.sm, alignItems: 'center',
  },
  scoreLabel: { color: TEXT_COLORS.secondary, fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4, textAlign: 'center' },
  scoreValue: { fontSize: 28, fontFamily: Fonts.extraBold },

  // Grid layouts
  threeColRow: { flexDirection: 'row', gap: 12 },
  threeColItem: { flex: 1 },
  twoColRow: { flexDirection: 'row', gap: 12 },

  // Bio fields
  bioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  bioItem: { width: '45%', minWidth: 80 },
  bioFieldWide: { width: '45%', minWidth: 80 },
  bioLabel: { color: TEXT_COLORS.secondary, fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 2 },
  bioInput: {
    fontFamily: Fonts.extraBold, fontSize: 22, paddingVertical: 2, minWidth: 40,
    fontVariant: ['tabular-nums'],
  },

  // Lock button
  lockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: SURFACES.disabled,
  },
  sexPill: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 1, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: SURFACES.disabled,
  },
  sexPillActive: { borderColor: TEAL, backgroundColor: TEAL + '15' },
  sexPillText: { color: TEXT_COLORS.muted, fontSize: 12 },

  // Weight context
  weightCtxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  weightCtxLabel: { color: TEXT_COLORS.secondary, fontSize: 11, fontFamily: Fonts.bold, width: 55 },
  weightCtxInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    color: TEXT_COLORS.primary, fontSize: 13, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  weightBar: { marginTop: Spacing.sm, paddingHorizontal: 4 },
  weightBarTrack: {
    height: 3, backgroundColor: SURFACES.border, borderRadius: 2, position: 'relative', marginVertical: Spacing.sm,
  },
  weightBarPoint: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5, top: -3.5,
    marginLeft: -5,
  },
  weightBarPointLg: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7, top: -5.5,
    marginLeft: -7, backgroundColor: ATP_BRAND.white, borderWidth: 2, borderColor: ATP_BRAND.white,
  },
  weightBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
  },

  // DOB
  dobRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: SURFACES.card,
  },
  dobInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    color: TEXT_COLORS.primary, fontSize: 13, fontFamily: Fonts.semiBold, borderWidth: 0.5, borderColor: '#2a2a2a',
    minWidth: 110, textAlign: 'center',
  },
  dobAge: { color: TEAL, fontFamily: Fonts.bold, fontSize: 12 },

  // Editable fields
  editableInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    color: TEXT_COLORS.primary, fontSize: 13, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  condGridItem: { width: '32%', flexGrow: 1 },
  rowLabel: {
    color: TEXT_COLORS.muted, letterSpacing: 3, fontSize: 10, fontFamily: Fonts.bold, marginBottom: Spacing.sm,
  },

  // Zone card (compact)
  zoneCard: {
    backgroundColor: SURFACES.card, borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: SURFACES.border, borderLeftWidth: 3,
  },
  condPillSm: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1,
  },

  // Section
  sectionTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: 14, color: TEXT_COLORS.primary },
  emptySection: { color: TEXT_COLORS.muted, textAlign: 'center', paddingVertical: Spacing.md },

  // Measurement grid
  measGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  measItem: { width: '22%', minWidth: 70, backgroundColor: SURFACES.card, borderRadius: 8, padding: Spacing.sm, alignItems: 'center' },
  measLabel: { color: TEXT_COLORS.muted, fontSize: 9, marginBottom: 2 },
  measValue: { color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: 16, fontVariant: ['tabular-nums'] },

  // List items (meds, supps, family)
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: SURFACES.card,
  },
  listItemName: { fontFamily: Fonts.semiBold, fontSize: 13 },
  listItemMeta: { color: TEXT_COLORS.secondary, fontSize: 11 },
  activePill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill,
    backgroundColor: 'rgba(168,224,42,0.1)', borderWidth: 1, borderColor: 'rgba(168,224,42,0.3)',
  },
  activePillText: { color: Colors.neonGreen, fontSize: 10, fontFamily: Fonts.bold },
  relationPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },

  // Add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, justifyContent: 'center',
    paddingVertical: Spacing.sm, marginTop: Spacing.sm,
    borderWidth: 1, borderColor: TEAL + '30', borderRadius: Radius.sm, borderStyle: 'dashed',
  },
  addBtnText: { color: TEAL, fontFamily: Fonts.semiBold, fontSize: 12 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: SURFACES.card, borderRadius: 16, padding: Spacing.md, width: '100%', maxWidth: 420, maxHeight: '70%',
    borderWidth: 1, borderColor: SURFACES.border,
  },
  modalTitle: { color: TEAL, letterSpacing: 3, fontSize: 13, marginBottom: Spacing.md },
  modalField: { marginBottom: Spacing.sm },
  modalFieldLabel: { color: TEXT_COLORS.secondary, fontSize: 11, marginBottom: 4, textTransform: 'capitalize' },
  modalInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    color: TEXT_COLORS.primary, fontSize: 14, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  modalPill: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 1, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: SURFACES.disabled,
  },
  modalPillText: { color: TEXT_COLORS.secondary, fontSize: 12 },
  modalActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md,
  },
  modalSaveBtn: { backgroundColor: TEAL, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  modalSaveBtnText: { color: ATP_BRAND.black, fontFamily: Fonts.bold, fontSize: 13 },

  // AI
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.neonGreen + '10', borderWidth: 1, borderColor: Colors.neonGreen + '30',
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: 8,
  },
  aiBtnText: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1 },
  aiOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  aiModal: {
    backgroundColor: SURFACES.card, borderRadius: 16, padding: Spacing.md, width: '100%', maxWidth: 600, maxHeight: '80%',
    borderWidth: 1, borderColor: Colors.neonGreen + '20',
  },
  aiHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm,
  },
  aiInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    color: TEXT_COLORS.primary, fontSize: 14, borderWidth: 0.5, borderColor: '#2a2a2a', marginBottom: Spacing.sm,
  },
  aiGenerateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.neonGreen, paddingVertical: Spacing.sm + 2, borderRadius: Radius.pill,
  },
  aiGenerateBtnText: { color: ATP_BRAND.black, fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 1 },
  aiLoadingBox: { alignItems: 'center', paddingVertical: Spacing.xl },
  aiResultScroll: { maxHeight: 400, marginVertical: Spacing.sm },
  aiResultText: { color: TEXT_COLORS.primary, fontSize: 13, lineHeight: 22 },
  aiActions: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: SURFACES.cardLight,
  },
  aiActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: Spacing.xs },

  // Consultations
  newConsultBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.neonGreen + '10', borderWidth: 1, borderColor: Colors.neonGreen + '30',
    borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md,
  },
  newConsultBtnText: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  consultCard: {
    backgroundColor: SURFACES.card, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0.5, borderColor: SURFACES.border,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.neonGreen, paddingVertical: Spacing.sm, borderRadius: Radius.pill, marginTop: Spacing.md,
  },
  completeBtnText: { color: ATP_BRAND.black, fontFamily: Fonts.bold, fontSize: 13 },
  consultBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: TEAL + '08', borderWidth: 1, borderColor: TEAL + '20',
    borderRadius: 8, padding: Spacing.sm,
  },
  // Timed goals
  goalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs + 1, borderBottomWidth: 1, borderBottomColor: SURFACES.card,
  },
  goalWeeksBadge: {
    backgroundColor: Colors.neonGreen + '15', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.neonGreen + '30', minWidth: 55, alignItems: 'center',
  },
  goalWeeksText: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 11 },
  goalTarget: { flex: 1, fontSize: 13, color: TEXT_COLORS.primary },
  goalAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs,
  },
  goalInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    color: TEXT_COLORS.primary, fontSize: 13, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  goalAddBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Colors.neonGreen + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  deleteDraftBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, borderWidth: 1, borderColor: SEMANTIC.error + '30', borderRadius: Radius.pill,
  },
});
