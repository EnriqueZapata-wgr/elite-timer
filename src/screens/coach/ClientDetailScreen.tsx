/**
 * ClientDetailScreen — Ficha de cliente en el panel de coach.
 *
 * Header + stats + 4 tabs: Calendario, Rutinas, Progreso, Historial.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
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

const TEAL = '#1D9E75';
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// Mapeo: PostgreSQL DOW (0=Dom) → columna del grid (0=Lun)
const DOW_TO_COL = [6, 0, 1, 2, 3, 4, 5]; // Dom=6, Lun=0...Sáb=5

type Tab = 'profile' | 'consultations' | 'labs' | 'calendar' | 'routines' | 'progress' | 'history';

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

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'profile', label: 'PERFIL', icon: 'person-outline' },
    { key: 'consultations', label: 'CONSULTAS', icon: 'document-text-outline' },
    { key: 'labs', label: 'LABS', icon: 'flask-outline' },
    { key: 'calendar', label: 'CALENDARIO', icon: 'calendar-outline' },
    { key: 'routines', label: 'RUTINAS', icon: 'barbell-outline' },
    { key: 'progress', label: 'PROGRESO', icon: 'trophy-outline' },
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
            <StatCard label="Condiciones" value={stats.conditions_present > 0 || stats.conditions_observation > 0 ? `${stats.conditions_present}🔴 ${stats.conditions_observation}🟡` : '0'} sub="activas" color="#E24B4A" />
            <StatCard label="Consultas" value={String(stats.total_consultations)} sub="totales" color="#5B9BD5" />
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
              <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? TEAL : '#666666'} />
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
            {activeTab === 'labs' && <LabsTab clientId={clientId} />}
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
                  <Ionicons name={aiShowHistory ? 'sparkles-outline' : 'time-outline'} size={20} color="#888" />
                </Pressable>
                <Pressable onPress={() => setAiVisible(false)}>
                  <Ionicons name="close" size={22} color="#666" />
                </Pressable>
              </View>
            </View>

            <EliteText variant="caption" style={{ color: '#888', marginBottom: Spacing.sm }}>
              {aiShowHistory ? 'Historial de análisis' : `Análisis de ${clientName}`}
            </EliteText>

            {/* ── HISTORIAL ── */}
            {aiShowHistory ? (
              <ScrollView style={styles.aiResultScroll} showsVerticalScrollIndicator={false}>
                {aiReports.length === 0 ? (
                  <EliteText variant="caption" style={{ color: '#555', textAlign: 'center', padding: Spacing.lg }}>
                    Sin reportes guardados
                  </EliteText>
                ) : aiReports.map(r => {
                  const isExp = aiExpandedReport === r.id;
                  return (
                    <View key={r.id} style={{ backgroundColor: '#1a1a1a', borderRadius: 8, padding: Spacing.sm, marginBottom: Spacing.sm }}>
                      <Pressable onPress={() => setAiExpandedReport(isExp ? null : r.id)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <EliteText variant="caption" style={{ color: Colors.neonGreen, fontSize: 10, fontFamily: Fonts.bold }}>
                              {new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </EliteText>
                            {r.question && (
                              <EliteText variant="caption" style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
                                Pregunta: {r.question}
                              </EliteText>
                            )}
                            {!isExp && (
                              <EliteText variant="caption" style={{ color: '#777', fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                                {r.report.substring(0, 120)}...
                              </EliteText>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                            <Pressable onPress={() => handleDeleteAiReport(r.id)} style={{ padding: 4 }}>
                              <Ionicons name="trash-outline" size={14} color="#E24B4A" />
                            </Pressable>
                            <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
                          </View>
                        </View>
                      </Pressable>
                      {isExp && (
                        <EliteText variant="body" style={{ color: '#ddd', fontSize: 13, lineHeight: 22, marginTop: Spacing.sm }}>
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
                      placeholderTextColor="#444"
                    />
                    <Pressable onPress={() => handleAskAI(aiQuestion)} style={styles.aiGenerateBtn}>
                      <Ionicons name="sparkles-outline" size={16} color="#000" />
                      <EliteText variant="caption" style={styles.aiGenerateBtnText}>Generar análisis</EliteText>
                    </Pressable>
                  </>
                )}

                {aiLoading && (
                  <View style={styles.aiLoadingBox}>
                    <ActivityIndicator color={Colors.neonGreen} />
                    <EliteText variant="caption" style={{ color: '#888', marginTop: Spacing.sm }}>
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
                        <Ionicons name={aiSaved ? 'checkmark-circle' : 'save-outline'} size={14} color={aiSaved ? '#a8e02a' : TEAL} />
                        <EliteText variant="caption" style={{ color: aiSaved ? '#a8e02a' : TEAL, fontFamily: Fonts.semiBold }}>
                          {aiSaved ? 'Guardado' : 'Guardar reporte'}
                        </EliteText>
                      </Pressable>
                      <Pressable onPress={() => { setAiResult(''); setAiQuestion(''); setAiSaved(false); }} style={styles.aiActionBtn}>
                        <Ionicons name="refresh-outline" size={14} color="#888" />
                        <EliteText variant="caption" style={{ color: '#888' }}>Nueva consulta</EliteText>
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

  const saveProfileField = async (key: string, value: string) => {
    const v = value.trim();
    try {
      await upsertClientProfile(clientId, { [key]: v || null });
      setProfile(prev => ({ ...prev, [key]: v || null }));
    } catch { /* */ }
  };

  const renderZoneCard = (zone: typeof CONDITION_ZONES[0]) => {
    const isExpanded = expandedZones.has(zone.key);
    const redCount = zone.conditions.filter(c => getFlag(c.key) === 'present').length;
    const orangeCount = zone.conditions.filter(c => getFlag(c.key) === 'observation').length;
    const greenCount = zone.conditions.filter(c => getFlag(c.key) === 'normal').length;
    const statusDotColor = redCount > 0 ? '#E24B4A' : orangeCount > 0 ? '#EF9F27' : greenCount > 0 ? '#a8e02a' : '#444';
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
              {redCount > 0 && <View style={[styles.zoneBadge, { backgroundColor: '#E24B4A20' }]}><EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 9, fontFamily: Fonts.bold }}>{redCount}</EliteText></View>}
              {orangeCount > 0 && <View style={[styles.zoneBadge, { backgroundColor: '#EF9F2720' }]}><EliteText variant="caption" style={{ color: '#EF9F27', fontSize: 9, fontFamily: Fonts.bold }}>{orangeCount}</EliteText></View>}
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
          {hiddenCount > 0 && <EliteText variant="caption" style={{ color: '#666', fontSize: 10 }}>+{hiddenCount} más</EliteText>}
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
              const bpColor = sysR.level !== 'no_data' ? sysR.color : diaR.level !== 'no_data' ? diaR.color : '#E24B4A';
              const bpRating = sysR.level !== 'no_data' ? sysR : diaR.level !== 'no_data' ? diaR : null;
              return (
              <View style={styles.bioGrid}>
                <BioField label="F. Agarre" unit="kg" color="#a8e02a"
                  value={profile?.grip_strength_kg?.toString() ?? ''}
                  onSave={v => saveProfileField('grip_strength_kg', v)}
                  rating={rateBioValue('grip_strength_kg', profile?.grip_strength_kg ? Number(profile.grip_strength_kg) : null, sx)} />
                <View style={[styles.bioFieldWide, bpRating && bpRating.level !== 'no_data' ? { backgroundColor: bpRating.bgColor, borderRadius: 6 } : undefined]}>
                  <EliteText variant="caption" style={styles.bioLabel}>
                    {bpRating && bpRating.level !== 'no_data' && <EliteText style={{ fontSize: 12, color: bpRating.color }}>{bpRating.arrow} </EliteText>}
                    Presión arterial
                  </EliteText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TextInput style={[styles.bioInput, { width: 44, color: bpColor }]}
                      defaultValue={profile?.blood_pressure_sys?.toString() ?? ''}
                      onEndEditing={e => saveProfileField('blood_pressure_sys', e.nativeEvent.text)}
                      keyboardType="numeric" placeholder="120" placeholderTextColor="#333" />
                    <EliteText style={{ color: '#666', fontSize: 16 }}>/</EliteText>
                    <TextInput style={[styles.bioInput, { width: 44, color: bpColor }]}
                      defaultValue={profile?.blood_pressure_dia?.toString() ?? ''}
                      onEndEditing={e => saveProfileField('blood_pressure_dia', e.nativeEvent.text)}
                      keyboardType="numeric" placeholder="80" placeholderTextColor="#333" />
                    {bpRating && bpRating.level !== 'no_data' && (
                      <View style={{ backgroundColor: bpRating.bgColor, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, marginLeft: 2 }}>
                        <EliteText variant="caption" style={{ color: bpRating.color, fontSize: 8, fontFamily: Fonts.bold }}>{bpRating.label}</EliteText>
                      </View>
                    )}
                  </View>
                </View>
                <BioField label="VO2 máx" unit="ml/kg/min" color="#5B9BD5"
                  value={profile?.vo2_max?.toString() ?? ''}
                  onSave={v => saveProfileField('vo2_max', v)}
                  rating={rateBioValue('vo2_max', profile?.vo2_max ? Number(profile.vo2_max) : null, sx)} />
                <BioField label="Edad metab." unit="años" color="#EF9F27"
                  value={profile?.metabolic_age_impedance?.toString() ?? ''}
                  onSave={v => saveProfileField('metabolic_age_impedance', v)} />
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
                    <Ionicons name="warning-outline" size={12} color="#E24B4A" />
                    <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 11 }}>{profile.red_flags}</EliteText>
                  </View>
                )}
              </View>
            ) : (
              <EliteText variant="caption" style={{ color: '#666', fontSize: 11 }}>Sin objetivos — definir en consulta</EliteText>
            )}
          </View>
        </View>
      </View>

      {/* ═══ FILA 2: SCORES ═══ */}
      <EliteText variant="caption" style={styles.rowLabel}>SCORES DE SALUD</EliteText>
      <View style={styles.profileCard}>
        <View style={styles.scoresGrid}>
          <ScoreCard
            label="Edad biológica"
            value={healthScore?.biologicalAge ? Math.round(healthScore.biologicalAge).toString() : '—'}
            unit="años"
            color={healthScore?.biologicalAge && profile?.date_of_birth
              ? healthScore.biologicalAge < Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000) ? '#a8e02a' : '#E24B4A'
              : '#7F77DD'}
          />
          <ScoreCard
            label="Edad metabólica"
            value={healthScore?.metabolicAge ? healthScore.metabolicAge.toString() : profile?.metabolic_age_impedance?.toString() ?? '—'}
            unit="años"
            color="#EF9F27"
          />
          <ScoreCard
            label="Envejecimiento"
            value={healthScore?.agingRate ? healthScore.agingRate.toFixed(1) : '—'}
            unit="x"
            color={healthScore?.agingRate ? (healthScore.agingRate < 10 ? '#a8e02a' : healthScore.agingRate < 12 ? '#EF9F27' : '#E24B4A') : '#E24B4A'}
          />
          <ScoreCard
            label="Salud funcional"
            value={healthScore?.functionalHealthScore ? Math.round(healthScore.functionalHealthScore).toString() : '—'}
            unit="/100"
            color={healthScore?.functionalHealthScore ? (healthScore.functionalHealthScore > 80 ? '#a8e02a' : healthScore.functionalHealthScore > 60 ? '#EF9F27' : '#E24B4A') : TEAL}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm }}>
          {healthScore?.evaluationQuality != null && (
            <EliteText variant="caption" style={{ color: '#555', fontSize: 10 }}>
              Calidad evaluación: {Math.round(healthScore.evaluationQuality)}%
            </EliteText>
          )}
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
              <Ionicons name={scoreExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#666" />
              <EliteText variant="caption" style={{ color: '#666', fontSize: 10 }}>
                {scoreExpanded ? 'Ocultar dominios' : 'Ver 10 dominios'}
              </EliteText>
            </Pressable>
            {scoreExpanded && (
              <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
                {healthScore.domains.map(d => {
                  const sf = Math.round(d.functionalScore);
                  const ce = Math.round(d.evaluationQuality * 100);
                  const barColor = sf >= 80 ? '#a8e02a' : sf >= 60 ? '#EF9F27' : '#E24B4A';
                  return (
                    <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <EliteText variant="caption" style={{ color: '#aaa', fontSize: 10, width: 90 }}>{d.name}</EliteText>
                      <View style={{ flex: 1, height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ width: `${sf}%`, height: '100%', backgroundColor: barColor, borderRadius: 3 }} />
                      </View>
                      <EliteText variant="caption" style={{ color: barColor, fontSize: 10, width: 25, textAlign: 'right' }}>{sf}</EliteText>
                      <EliteText variant="caption" style={{ color: '#555', fontSize: 9, width: 30 }}>CE:{ce}%</EliteText>
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
              <EliteText variant="caption" style={{ color: '#666', textAlign: 'center', paddingVertical: Spacing.md }}>
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
      <EliteText variant="caption" style={{ color: '#555', fontSize: 10, marginTop: -12, marginBottom: Spacing.sm }}>
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
  Madre: '#D4537E', Padre: '#5B9BD5', 'Herman@': '#7F77DD',
  'Abuel@': '#888', 'Otro': '#666',
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
          {!alwaysExpanded && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />}
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
                      <View style={[styles.activePill, !m.is_active && { backgroundColor: '#333', borderColor: '#444' }]}>
                        <EliteText variant="caption" style={[styles.activePillText, !m.is_active && { color: '#666' }]}>
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
                      <View style={[styles.activePill, !s.is_active && { backgroundColor: '#333', borderColor: '#444' }]}>
                        <EliteText variant="caption" style={[styles.activePillText, !s.is_active && { color: '#666' }]}>
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
                    <View style={[styles.relationPill, { backgroundColor: (RELATION_COLORS[f.relation] ?? '#666') + '20' }]}>
                      <EliteText variant="caption" style={{ color: RELATION_COLORS[f.relation] ?? '#666', fontSize: 10, fontFamily: Fonts.bold }}>
                        {f.relation}
                      </EliteText>
                    </View>
                    <EliteText variant="body" style={[styles.listItemName, { flex: 1 }]}>{f.condition}</EliteText>
                    <Pressable onPress={() => handleDeleteFamily(f.id)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={16} color="#666" />
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
            keyboardType="numeric" placeholderTextColor="#444" placeholder="0" />
        </View>
      ));
    }
    if (type === 'medications') {
      return ['name', 'dose', 'frequency', 'reason', 'prescriber'].map(k => (
        <View key={k} style={styles.modalField}>
          <EliteText variant="caption" style={styles.modalFieldLabel}>{k === 'name' ? 'Nombre *' : k}</EliteText>
          <TextInput style={styles.modalInput} value={form[k] ?? ''} onChangeText={v => set(k, v)}
            placeholderTextColor="#444" placeholder={k === 'name' ? 'Nombre del medicamento' : ''} />
        </View>
      ));
    }
    if (type === 'supplements') {
      return ['name', 'dose', 'frequency', 'brand', 'reason'].map(k => (
        <View key={k} style={styles.modalField}>
          <EliteText variant="caption" style={styles.modalFieldLabel}>{k === 'name' ? 'Nombre *' : k}</EliteText>
          <TextInput style={styles.modalInput} value={form[k] ?? ''} onChangeText={v => set(k, v)}
            placeholderTextColor="#444" placeholder={k === 'name' ? 'Nombre del suplemento' : ''} />
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
              placeholderTextColor="#444" placeholder="Ej: Diabetes tipo 2" />
          </View>
          <View style={styles.modalField}>
            <EliteText variant="caption" style={styles.modalFieldLabel}>Notas</EliteText>
            <TextInput style={[styles.modalInput, { height: 60 }]} value={form.notes ?? ''} onChangeText={v => set('notes', v)}
              placeholderTextColor="#444" placeholder="Opcional" multiline />
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
            <Pressable onPress={onClose}><EliteText variant="caption" style={{ color: '#666' }}>Cancelar</EliteText></Pressable>
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
  const [localName, setLocalName] = useState(clientName);

  const handleSaveName = async () => {
    if (localName.trim() && localName !== clientName) {
      try {
        const { supabase } = require('@/src/lib/supabase');
        await supabase.from('profiles').update({ full_name: localName.trim() }).eq('id', clientId);
      } catch { /* */ }
    }
  };

  const age = profile?.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000)
    : null;

  return (
    <View style={styles.profileCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <EliteText variant="caption" style={styles.profileCardLabel}>DATOS PERSONALES</EliteText>
        <Pressable onPress={() => setUnlocked(!unlocked)} style={styles.lockBtn}>
          <Ionicons name={unlocked ? 'lock-open-outline' : 'lock-closed-outline'} size={14} color={unlocked ? '#EF9F27' : '#555'} />
          <EliteText variant="caption" style={{ color: unlocked ? '#EF9F27' : '#555', fontSize: 10 }}>
            {unlocked ? 'Editando' : 'Editar'}
          </EliteText>
        </Pressable>
      </View>

      {unlocked ? (
        <View style={{ gap: Spacing.xs }}>
          <View>
            <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>Nombre</EliteText>
            <TextInput style={styles.editableInput} defaultValue={localName}
              onChangeText={setLocalName} onEndEditing={handleSaveName}
              placeholder="Nombre completo" placeholderTextColor="#333" />
          </View>
          <ProfileRow label="Email" value={clientEmail} />
          {profileLoaded && (
            <>
              <View>
                <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>Fecha de nacimiento</EliteText>
                <TextInput style={styles.editableInput}
                  defaultValue={profile?.date_of_birth ?? ''}
                  onEndEditing={e => onSave('date_of_birth', e.nativeEvent.text)}
                  placeholder="AAAA-MM-DD" placeholderTextColor="#333" />
              </View>
              <View>
                <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>Sexo biológico</EliteText>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['male', 'female'].map(s => (
                    <Pressable key={s} onPress={() => onSave('biological_sex', s)}
                      style={[styles.sexPill, profile?.biological_sex === s && styles.sexPillActive]}>
                      <EliteText variant="caption" style={[styles.sexPillText, profile?.biological_sex === s && { color: TEAL }]}>
                        {s === 'male' ? 'Masculino' : 'Femenino'}
                      </EliteText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>Teléfono</EliteText>
                <TextInput style={styles.editableInput} defaultValue={profile?.phone ?? ''}
                  onEndEditing={e => onSave('phone', e.nativeEvent.text)}
                  placeholder="Tel." placeholderTextColor="#333" keyboardType="phone-pad" />
              </View>
              <View>
                <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>Ocupación</EliteText>
                <TextInput style={styles.editableInput} defaultValue={profile?.occupation ?? ''}
                  onEndEditing={e => onSave('occupation', e.nativeEvent.text)}
                  placeholder="Ocupación" placeholderTextColor="#333" />
              </View>
              <View>
                <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>Ciudad</EliteText>
                <TextInput style={styles.editableInput} defaultValue={profile?.city ?? ''}
                  onEndEditing={e => onSave('city', e.nativeEvent.text)}
                  placeholder="Ciudad" placeholderTextColor="#333" />
              </View>
              <View>
                <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>¿Cómo nos conoció?</EliteText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Google', 'Referido', 'Amigo/Familiar', 'Evento', 'ChatGPT/IA', 'Otro'].map(src => (
                    <Pressable key={src} onPress={() => onSave('referral_source', src)}
                      style={[styles.sexPill, profile?.referral_source === src && styles.sexPillActive]}>
                      <EliteText variant="caption" style={[styles.sexPillText, profile?.referral_source === src && { color: TEAL }]}>
                        {src}
                      </EliteText>
                    </Pressable>
                  ))}
                </View>
                {(profile?.referral_source === 'Referido' || profile?.referral_source === 'Amigo/Familiar' || profile?.referral_source === 'Otro') && (
                  <TextInput style={[styles.editableInput, { marginTop: 4 }]}
                    defaultValue={profile?.referral_detail ?? ''}
                    onEndEditing={e => onSave('referral_detail', e.nativeEvent.text)}
                    placeholder={profile?.referral_source === 'Otro' ? 'Especifica' : '¿Quién te refirió?'}
                    placeholderTextColor="#333" />
                )}
              </View>
            </>
          )}
        </View>
      ) : (
        <View>
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
    </View>
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
              <Ionicons name="close-circle" size={16} color="#555" />
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
            placeholderTextColor="#333"
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.goalInput, { flex: 1 }]}
            value={newTarget}
            onChangeText={setNewTarget}
            placeholder="Ej: Hemoglobina 15-18, grasa visceral <9"
            placeholderTextColor="#333"
          />
          <Pressable onPress={handleAdd} style={styles.goalAddBtn}>
            <Ionicons name="add" size={18} color={Colors.neonGreen} />
          </Pressable>
        </View>
      )}
      {goals.length === 0 && !editable && (
        <EliteText variant="caption" style={{ color: '#555', fontSize: 11 }}>Sin metas definidas</EliteText>
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
        <View style={[styles.weightBarPoint, { left: '0%', backgroundColor: '#a8e02a' }]} />
        {current != null && (
          <View style={[styles.weightBarPointLg, { left: `${pct(current)}%` }]} />
        )}
        <View style={[styles.weightBarPoint, { left: '100%', backgroundColor: '#E24B4A' }]} />
        {ideal && (
          <View style={[styles.weightBarPoint, { left: `${pct(ideal)}%`, backgroundColor: TEAL, borderWidth: 2, borderColor: TEAL }]} />
        )}
      </View>
      <View style={styles.weightBarLabels}>
        <EliteText variant="caption" style={{ color: '#a8e02a', fontSize: 10 }}>{lowest}kg</EliteText>
        {current != null && <EliteText variant="caption" style={{ color: '#fff', fontSize: 10 }}>{current}kg</EliteText>}
        {ideal && <EliteText variant="caption" style={{ color: TEAL, fontSize: 10 }}>Meta: {ideal}kg</EliteText>}
        <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 10 }}>{highest}kg</EliteText>
      </View>
    </View>
  );
}

function BioField({ label, unit, color, value, onSave, rating }: {
  label: string; unit: string; color: string; value: string; onSave: (v: string) => void; rating?: ValueRating;
}) {
  const hasRating = rating && rating.level !== 'no_data';
  const displayColor = hasRating ? rating.color : color;
  return (
    <View style={[styles.bioItem, hasRating ? { backgroundColor: rating.bgColor, borderRadius: 6 } : undefined]}>
      <EliteText variant="caption" style={styles.bioLabel}>
        {hasRating && <EliteText style={{ fontSize: 12, color: rating.color }}>{rating.arrow} </EliteText>}
        {label}
      </EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <TextInput
          style={[styles.bioInput, { color: displayColor }]}
          defaultValue={value}
          onEndEditing={e => onSave(e.nativeEvent.text)}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor="#333"
        />
        <EliteText variant="caption" style={{ color: '#666', fontSize: 9 }}>{unit}</EliteText>
        {hasRating && (
          <View style={{ backgroundColor: rating.bgColor, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
            <EliteText variant="caption" style={{ color: rating.color, fontSize: 8, fontFamily: Fonts.bold }}>{rating.label}</EliteText>
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
  return (
    <View>
      <EliteText variant="caption" style={{ color: isRed ? '#E24B4A80' : '#666', fontSize: 10, marginBottom: 2 }}>{label}</EliteText>
      <TextInput
        style={[styles.editableInput, isRed && { borderColor: '#E24B4A30' }]}
        defaultValue={value}
        onEndEditing={e => onSave(e.nativeEvent.text)}
        placeholder={placeholder}
        placeholderTextColor="#333"
        multiline={multiline}
      />
    </View>
  );
}

function ScoreCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.scoreCard}>
      <EliteText variant="caption" style={styles.scoreLabel}>{label}</EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <EliteText style={[styles.scoreValue, { color }]}>{value}</EliteText>
        <EliteText variant="caption" style={{ color: '#666', fontSize: 10 }}>{unit}</EliteText>
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
  draft: { label: 'Borrador', color: '#EF9F27', bg: '#EF9F2715' },
  completed: { label: 'Completada', color: '#a8e02a', bg: '#a8e02a15' },
  signed: { label: 'Firmada', color: '#5B9BD5', bg: '#5B9BD515' },
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
            <Ionicons name="arrow-back" size={20} color="#888" />
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
                <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginBottom: Spacing.sm }}>
                  Toca pill para ciclar estado
                </EliteText>
                <View style={isWide ? styles.condGrid : { gap: Spacing.xs }}>
                  {CONDITION_ZONES.map(zone => {
                    const redC = zone.conditions.filter(co => getConsultFlag(co.key) === 'present').length;
                    const orangeC = zone.conditions.filter(co => getConsultFlag(co.key) === 'observation').length;
                    const statusDot = redC > 0 ? '#E24B4A' : orangeC > 0 ? '#EF9F27' : '#444';
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
                  <Ionicons name={showHabits ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
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
            {/* Objetivos (editables en consulta) */}
            <View style={[styles.profileCard, { marginBottom: Spacing.sm }]}>
              <EliteText variant="caption" style={styles.profileCardLabel}>OBJETIVOS</EliteText>
              {[
                { key: 'primary_goal', label: 'Objetivo principal', ph: 'Ej: Bajar 10kg en 6 meses' },
                { key: 'goal_timeline', label: 'Plazo', ph: 'Ej: 6 meses' },
                { key: 'red_flags', label: 'Banderas rojas', ph: 'Ej: Lesión rodilla' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: Spacing.xs }}>
                  <EliteText variant="caption" style={{ color: f.key === 'red_flags' ? '#E24B4A80' : '#666', fontSize: 10, marginBottom: 2 }}>{f.label}</EliteText>
                  <TextInput
                    style={[styles.editableInput, f.key === 'red_flags' && { borderColor: '#E24B4A30' }]}
                    defaultValue={consultProfile?.[f.key] ?? ''}
                    onEndEditing={e => saveConsultProfileField(f.key, e.nativeEvent.text)}
                    placeholder={f.ph} placeholderTextColor="#333" editable={isDraft}
                  />
                </View>
              ))}
            </View>

            {/* Notas SOAP */}
            <View style={styles.profileCard}>
              <EliteText variant="caption" style={styles.profileCardLabel}>NOTAS CLÍNICAS (SOAP)</EliteText>
              {[
                { key: 'chief_complaint', label: 'Motivo de consulta', ph: '¿Por qué viene hoy?', multi: false },
                { key: 'subjective_notes', label: 'S — Subjetivo', ph: 'Lo que el paciente reporta', multi: true },
                { key: 'objective_notes', label: 'O — Objetivo', ph: 'Lo que observas', multi: true },
                { key: 'assessment', label: 'A — Análisis', ph: 'Tu evaluación', multi: true },
                { key: 'plan', label: 'P — Plan', ph: 'Plan hasta la próxima consulta', multi: true },
                { key: 'general_notes', label: 'Notas generales', ph: 'Notas libres', multi: true },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: Spacing.sm }}>
                  <EliteText variant="caption" style={{ color: Colors.neonGreen + '80', fontSize: 10, marginBottom: 2 }}>{f.label}</EliteText>
                  <TextInput
                    style={[styles.editableInput, f.multi && { minHeight: 60 }]}
                    defaultValue={(c as any)[f.key] ?? ''}
                    onEndEditing={e => handleSaveField(f.key, e.nativeEvent.text)}
                    placeholder={f.ph} placeholderTextColor="#333" multiline={f.multi} editable={isDraft}
                  />
                </View>
              ))}

            </View>

            {/* Descripción del día */}
            <View style={[styles.profileCard, { marginTop: Spacing.sm }]}>
              <EliteText variant="caption" style={styles.profileCardLabel}>DESCRIPCIÓN DEL DÍA</EliteText>
              <EliteText variant="caption" style={{ color: '#555', fontSize: 10, marginBottom: Spacing.xs }}>
                ¿Cómo se ve un día típico de esta persona?
              </EliteText>
              <TextInput
                style={[styles.editableInput, { minHeight: 80 }]}
                defaultValue={(c as any).day_description ?? ''}
                onEndEditing={e => handleSaveField('day_description', e.nativeEvent.text)}
                placeholder="Ej: Se levanta a las 6, desayuna cereal, maneja 1hr al trabajo, come en la calle..."
                placeholderTextColor="#333"
                multiline
                editable={isDraft}
              />
            </View>

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

            {/* Contexto de peso */}
            {isDraft && consultProfile && (
              <View style={[styles.profileCard, { marginTop: Spacing.sm }]}>
                <EliteText variant="caption" style={styles.profileCardLabel}>CONTEXTO DE PESO</EliteText>
                <View style={{ gap: Spacing.sm }}>
                  <View style={styles.weightCtxRow}>
                    <EliteText variant="caption" style={styles.weightCtxLabel}>Más alto</EliteText>
                    <TextInput style={[styles.weightCtxInput, { flex: 1 }]}
                      defaultValue={consultProfile.weight_highest_kg?.toString() ?? ''}
                      onEndEditing={e => saveConsultProfileField('weight_highest_kg', e.nativeEvent.text)}
                      placeholder="kg" placeholderTextColor="#333" keyboardType="numeric" />
                    <TextInput style={[styles.weightCtxInput, { flex: 1 }]}
                      defaultValue={consultProfile.weight_highest_year ?? ''}
                      onEndEditing={e => saveConsultProfileField('weight_highest_year', e.nativeEvent.text)}
                      placeholder="año o edad" placeholderTextColor="#333" />
                  </View>
                  <View style={styles.weightCtxRow}>
                    <EliteText variant="caption" style={styles.weightCtxLabel}>Más bajo</EliteText>
                    <TextInput style={[styles.weightCtxInput, { flex: 1 }]}
                      defaultValue={consultProfile.weight_lowest_kg?.toString() ?? ''}
                      onEndEditing={e => saveConsultProfileField('weight_lowest_kg', e.nativeEvent.text)}
                      placeholder="kg" placeholderTextColor="#333" keyboardType="numeric" />
                    <TextInput style={[styles.weightCtxInput, { flex: 1 }]}
                      defaultValue={consultProfile.weight_lowest_year ?? ''}
                      onEndEditing={e => saveConsultProfileField('weight_lowest_year', e.nativeEvent.text)}
                      placeholder="año o edad" placeholderTextColor="#333" />
                  </View>
                  <View style={styles.weightCtxRow}>
                    <EliteText variant="caption" style={[styles.weightCtxLabel, { color: TEAL }]}>Ideal</EliteText>
                    <TextInput style={[styles.weightCtxInput, { flex: 1 }]}
                      defaultValue={consultProfile.weight_ideal_kg?.toString() ?? ''}
                      onEndEditing={e => saveConsultProfileField('weight_ideal_kg', e.nativeEvent.text)}
                      placeholder="kg" placeholderTextColor="#333" keyboardType="numeric" />
                    <TextInput style={[styles.weightCtxInput, { flex: 2 }]}
                      defaultValue={consultProfile.weight_ideal_notes ?? ''}
                      onEndEditing={e => saveConsultProfileField('weight_ideal_notes', e.nativeEvent.text)}
                      placeholder="notas (frame, estilo vida)" placeholderTextColor="#333" />
                  </View>
                </View>
              </View>
            )}

            {/* Meta: completar / eliminar */}
            <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
              {isDraft && (
                <Pressable onPress={handleComplete} style={styles.completeBtn}>
                  <Ionicons name="checkmark-circle" size={16} color="#000" />
                  <EliteText variant="caption" style={styles.completeBtnText}>Completar consulta</EliteText>
                </Pressable>
              )}
              <Pressable onPress={handleDelete} style={styles.deleteDraftBtn}>
                <Ionicons name={isDraft ? 'trash-outline' : 'warning-outline'} size={14} color="#E24B4A" />
                <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 12 }}>
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
      <Pressable onPress={handleNew} disabled={creating} style={[styles.newConsultBtn, creating && { opacity: 0.5 }, draft && { borderColor: '#EF9F2730', backgroundColor: '#EF9F2708' }]}>
        <Ionicons name={draft ? 'create-outline' : 'add-circle-outline'} size={18} color={draft ? '#EF9F27' : Colors.neonGreen} />
        <EliteText variant="body" style={[styles.newConsultBtnText, draft && { color: '#EF9F27' }]}>
          {creating ? 'Creando...' : draft ? `Continuar consulta #${draft.consultation_number}` : 'Nueva Consulta'}
        </EliteText>
      </Pressable>

      {loadingList ? (
        <ActivityIndicator color={TEAL} style={{ marginTop: Spacing.lg }} />
      ) : consultations.length === 0 ? (
        <EliteText variant="caption" style={{ color: '#666', textAlign: 'center', paddingVertical: Spacing.xl }}>
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
              <EliteText variant="caption" style={{ color: '#888', marginTop: 2 }}>
                {new Date(c.consultation_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </EliteText>
              {c.chief_complaint && (
                <EliteText variant="caption" style={{ color: '#aaa', marginTop: 4 }} numberOfLines={1}>
                  {c.chief_complaint}
                </EliteText>
              )}
              {changes && !changes.is_first && (changes.weight_change != null || changes.fat_change != null) && (
                <EliteText variant="caption" style={{ color: '#666', marginTop: 4, fontSize: 11 }}>
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
          setUploadMsg({ text: `Error: ${result.error}`, color: '#E24B4A' });
        } else {
          setUploadMsg({ text: `¡Listo! ${result.extractedCount} valores extraídos`, color: '#a8e02a' });
          loadLabs();
        }
      } catch (err: any) {
        setUploadMsg({ text: `Error: ${err.message ?? 'Fallo al subir'}`, color: '#E24B4A' });
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
      draft: { label: 'Borrador', color: '#EF9F27', bg: '#EF9F2715' },
      approved: { label: 'Aprobado', color: '#a8e02a', bg: '#a8e02a15' },
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

      <EliteText variant="caption" style={{ color: '#555', fontSize: 10, marginBottom: Spacing.md }}>
        El cliente también puede subir estudios desde su app
      </EliteText>

      {/* Uploads fallidos/pendientes */}
      {failedUploads.length > 0 && (
        <View style={{ marginBottom: Spacing.md }}>
          <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4 }}>
            UPLOADS PENDIENTES / FALLIDOS
          </EliteText>
          {failedUploads.map(u => (
            <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0a0a', borderRadius: 8, padding: Spacing.sm, marginBottom: 4 }}>
              <Ionicons name={u.status === 'failed' ? 'alert-circle' : 'hourglass-outline'} size={14} color={u.status === 'failed' ? '#E24B4A' : '#EF9F27'} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <EliteText variant="caption" style={{ color: '#aaa', fontSize: 11 }}>
                  {u.file_name ?? 'Archivo'} — {u.status === 'failed' ? 'Fallido' : u.status === 'processing' ? 'Procesando' : 'Subido'}
                </EliteText>
                {u.error_message && <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 10 }}>{u.error_message}</EliteText>}
              </View>
              <Pressable
                onPress={async () => {
                  if (typeof window !== 'undefined' && !window.confirm('¿Eliminar este upload?')) return;
                  try { await deleteLabUpload(u.id); loadLabs(); } catch { /* */ }
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="trash-outline" size={16} color="#E24B4A" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {loading ? <ActivityIndicator color={TEAL} /> : labs.length === 0 ? (
        <EliteText variant="caption" style={{ color: '#555', textAlign: 'center', padding: Spacing.xl }}>
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
                <EliteText variant="caption" style={{ color: '#888', marginTop: 2 }}>{valCount} valores</EliteText>
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
                              <EliteText variant="caption" style={{ flex: 1, color: '#fff', fontSize: 12, marginLeft: 4 }}>
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
                      <EliteText variant="caption" style={{ color: '#EF9F27', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4 }}>
                        OTROS VALORES
                      </EliteText>
                      {lab.other_values.map((ov: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#111' }}>
                          <EliteText variant="caption" style={{ flex: 1, color: '#aaa', fontSize: 12 }}>{ov.name}</EliteText>
                          <EliteText variant="body" style={{ color: '#EF9F27', fontFamily: Fonts.bold, fontSize: 14 }}>{ov.value}</EliteText>
                          <EliteText variant="caption" style={{ color: '#666', fontSize: 10, marginLeft: 4 }}>{ov.unit}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                    {lab.status !== 'approved' && (
                      <Pressable onPress={() => handleApprove(lab.id)} style={[styles.completeBtn, { flex: 1 }]}>
                        <Ionicons name="checkmark" size={14} color="#000" />
                        <EliteText variant="caption" style={styles.completeBtnText}>Aprobar</EliteText>
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleDelete(lab.id)} style={[styles.deleteDraftBtn, { flex: 1 }]}>
                      <Ionicons name="trash-outline" size={14} color="#E24B4A" />
                      <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 12 }}>Eliminar</EliteText>
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
                          { borderColor: s.assigned_by ? TEAL : '#222222' },
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
                  <View style={[styles.dot, { backgroundColor: '#5B9BD5' }]} />
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
              backgroundColor: r.mode === 'timer' ? Colors.neonGreen : '#7F77DD',
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
  container: { flex: 1, backgroundColor: '#000000' },
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
  headerSince: { color: '#AAAAAA', marginTop: 2 },
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
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#222222',
  },
  statLabel: { color: '#AAAAAA', fontSize: 10, letterSpacing: 1, fontFamily: Fonts.bold },
  statValue: { fontSize: 28, fontFamily: Fonts.extraBold, marginVertical: 4 },
  statSub: { color: '#666666', fontSize: 10 },

  // Tabs
  tabsRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222222',
    marginBottom: Spacing.md, gap: Spacing.xs,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: TEAL },
  tabLabel: { color: '#666666', fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 1 },
  tabContent: { minHeight: 300 },

  // Shared
  sectionLabel: { color: '#AAAAAA', letterSpacing: 2, fontSize: 10, fontFamily: Fonts.bold, marginBottom: Spacing.sm },
  emptyTab: { color: '#666666', textAlign: 'center', padding: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Calendar grid
  calGrid: { flexDirection: 'row', gap: Spacing.xs },
  calCol: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  calDayLabel: { color: '#AAAAAA', fontSize: 11, fontFamily: Fonts.bold, marginBottom: Spacing.xs },
  calChip: {
    width: '100%', backgroundColor: '#1a1a1a', borderRadius: Radius.sm,
    padding: Spacing.xs, borderWidth: 1, borderColor: '#222222',
  },
  calChipText: { color: '#FFFFFF', fontSize: 10, textAlign: 'center' },
  calEmpty: { width: '100%', height: 30, backgroundColor: '#0a0a0a', borderRadius: Radius.sm },

  // Schedule rows
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#111111',
  },
  scheduleDate: { color: '#AAAAAA', fontSize: 12, width: 90 },
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
    paddingVertical: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: '#111111',
  },
  routineRowName: { fontFamily: Fonts.semiBold, fontSize: 14 },
  routineRowMeta: { color: '#AAAAAA', fontSize: 11 },

  // PRs
  prGroup: {
    backgroundColor: '#1a1a1a', borderRadius: 12, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#222222',
  },
  prGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  prGroupName: { fontFamily: Fonts.bold, fontSize: 15 },
  prGroupMuscle: { color: '#AAAAAA', fontSize: 11, textTransform: 'capitalize' },
  prChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  prChip: {
    backgroundColor: '#111111', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, alignItems: 'center', minWidth: 60,
  },
  prChipLabel: { color: '#666666', fontSize: 10, fontFamily: Fonts.bold },
  prChipValue: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] },

  // History
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: '#111111',
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL },
  historyTitle: { fontFamily: Fonts.semiBold, fontSize: 14 },
  historyMeta: { color: '#AAAAAA', fontSize: 12, marginTop: 2 },

  // Profile tab
  profileCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#222222',
  },
  profileCardLabel: {
    color: '#AAAAAA',
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
    borderBottomColor: '#111111',
  },
  profileRowLabel: { color: '#666666', fontSize: 12 },
  profileRowValue: { color: '#FFFFFF', fontSize: 14, fontFamily: Fonts.semiBold },
  profilePlaceholderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  profilePlaceholderItem: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  profilePlaceholderLabel: { color: '#666666', fontSize: 10, marginBottom: 4 },
  profilePlaceholderValue: { color: '#444444', fontSize: 18, fontFamily: Fonts.bold },
  profileComingSoon: {
    color: '#444444',
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
    backgroundColor: '#222222',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  upcomingPillText: {
    color: '#666666',
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
    marginTop: Spacing.sm, backgroundColor: '#1a1a1a', borderRadius: 8,
    padding: Spacing.sm, borderWidth: 1, borderColor: '#7F77DD30',
  },
  oncoNoteLabel: { color: '#7F77DD', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4 },
  oncoNoteHint: { color: '#666', fontSize: 11, fontStyle: 'italic' },

  // Scores
  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scoreCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#111', borderRadius: 10,
    padding: Spacing.sm, alignItems: 'center',
  },
  scoreLabel: { color: '#888', fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 4, textAlign: 'center' },
  scoreValue: { fontSize: 28, fontFamily: Fonts.extraBold },

  // Grid layouts
  threeColRow: { flexDirection: 'row', gap: 12 },
  threeColItem: { flex: 1 },
  twoColRow: { flexDirection: 'row', gap: 12 },

  // Bio fields
  bioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  bioItem: { width: '45%', minWidth: 80 },
  bioFieldWide: { width: '45%', minWidth: 80 },
  bioLabel: { color: '#888', fontSize: 9, fontFamily: Fonts.bold, letterSpacing: 1, marginBottom: 2 },
  bioInput: {
    fontFamily: Fonts.extraBold, fontSize: 22, paddingVertical: 2, minWidth: 40,
    fontVariant: ['tabular-nums'],
  },

  // Lock button
  lockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: '#333',
  },
  sexPill: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 1, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: '#333',
  },
  sexPillActive: { borderColor: TEAL, backgroundColor: TEAL + '15' },
  sexPillText: { color: '#666', fontSize: 12 },

  // Weight context
  weightCtxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  weightCtxLabel: { color: '#888', fontSize: 11, fontFamily: Fonts.bold, width: 55 },
  weightCtxInput: {
    backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    color: '#fff', fontSize: 13, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  weightBar: { marginTop: Spacing.sm, paddingHorizontal: 4 },
  weightBarTrack: {
    height: 3, backgroundColor: '#222', borderRadius: 2, position: 'relative', marginVertical: Spacing.sm,
  },
  weightBarPoint: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5, top: -3.5,
    marginLeft: -5,
  },
  weightBarPointLg: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7, top: -5.5,
    marginLeft: -7, backgroundColor: '#fff', borderWidth: 2, borderColor: '#fff',
  },
  weightBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
  },

  // DOB
  dobRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: '#111',
  },
  dobInput: {
    backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    color: '#fff', fontSize: 13, fontFamily: Fonts.semiBold, borderWidth: 0.5, borderColor: '#2a2a2a',
    minWidth: 110, textAlign: 'center',
  },
  dobAge: { color: TEAL, fontFamily: Fonts.bold, fontSize: 12 },

  // Editable fields
  editableInput: {
    backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    color: '#fff', fontSize: 13, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  condGridItem: { width: '32%', flexGrow: 1 },
  rowLabel: {
    color: '#666', letterSpacing: 3, fontSize: 10, fontFamily: Fonts.bold, marginBottom: Spacing.sm,
  },

  // Zone card (compact)
  zoneCard: {
    backgroundColor: '#111', borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: '#222', borderLeftWidth: 3,
  },
  condPillSm: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1,
  },

  // Section
  sectionTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: 14, color: '#FFFFFF' },
  emptySection: { color: '#666', textAlign: 'center', paddingVertical: Spacing.md },

  // Measurement grid
  measGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  measItem: { width: '22%', minWidth: 70, backgroundColor: '#111', borderRadius: 8, padding: Spacing.sm, alignItems: 'center' },
  measLabel: { color: '#666', fontSize: 9, marginBottom: 2 },
  measValue: { color: '#fff', fontFamily: Fonts.bold, fontSize: 16, fontVariant: ['tabular-nums'] },

  // List items (meds, supps, family)
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: '#111',
  },
  listItemName: { fontFamily: Fonts.semiBold, fontSize: 13 },
  listItemMeta: { color: '#888', fontSize: 11 },
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
    backgroundColor: '#111', borderRadius: 16, padding: Spacing.md, width: '100%', maxWidth: 420, maxHeight: '70%',
    borderWidth: 1, borderColor: '#222',
  },
  modalTitle: { color: TEAL, letterSpacing: 3, fontSize: 13, marginBottom: Spacing.md },
  modalField: { marginBottom: Spacing.sm },
  modalFieldLabel: { color: '#888', fontSize: 11, marginBottom: 4, textTransform: 'capitalize' },
  modalInput: {
    backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    color: '#fff', fontSize: 14, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  modalPill: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 1, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: '#333',
  },
  modalPillText: { color: '#888', fontSize: 12 },
  modalActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md,
  },
  modalSaveBtn: { backgroundColor: TEAL, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  modalSaveBtnText: { color: '#000', fontFamily: Fonts.bold, fontSize: 13 },

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
    backgroundColor: '#111', borderRadius: 16, padding: Spacing.md, width: '100%', maxWidth: 600, maxHeight: '80%',
    borderWidth: 1, borderColor: Colors.neonGreen + '20',
  },
  aiHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm,
  },
  aiInput: {
    backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    color: '#fff', fontSize: 14, borderWidth: 0.5, borderColor: '#2a2a2a', marginBottom: Spacing.sm,
  },
  aiGenerateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.neonGreen, paddingVertical: Spacing.sm + 2, borderRadius: Radius.pill,
  },
  aiGenerateBtnText: { color: '#000', fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 1 },
  aiLoadingBox: { alignItems: 'center', paddingVertical: Spacing.xl },
  aiResultScroll: { maxHeight: 400, marginVertical: Spacing.sm },
  aiResultText: { color: '#ddd', fontSize: 13, lineHeight: 22 },
  aiActions: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: '#1a1a1a',
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
    backgroundColor: '#111', borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0.5, borderColor: '#222',
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.neonGreen, paddingVertical: Spacing.sm, borderRadius: Radius.pill, marginTop: Spacing.md,
  },
  completeBtnText: { color: '#000', fontFamily: Fonts.bold, fontSize: 13 },
  consultBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: TEAL + '08', borderWidth: 1, borderColor: TEAL + '20',
    borderRadius: 8, padding: Spacing.sm,
  },
  // Timed goals
  goalRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs + 1, borderBottomWidth: 1, borderBottomColor: '#111',
  },
  goalWeeksBadge: {
    backgroundColor: Colors.neonGreen + '15', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.neonGreen + '30', minWidth: 55, alignItems: 'center',
  },
  goalWeeksText: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 11 },
  goalTarget: { flex: 1, fontSize: 13, color: '#ddd' },
  goalAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs,
  },
  goalInput: {
    backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    color: '#fff', fontSize: 13, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  goalAddBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Colors.neonGreen + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  deleteDraftBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, borderWidth: 1, borderColor: '#E24B4A30', borderRadius: Radius.pill,
  },
});
