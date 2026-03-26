/**
 * ClientDetailScreen — Ficha de cliente en el panel de coach.
 *
 * Header + stats + 4 tabs: Calendario, Rutinas, Progreso, Historial.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
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
import { getConditionFlags, toggleConditionFlag, type ConditionFlag } from '@/src/services/client-profile-service';
import { CONDITION_ZONES, FLAG_STATUSES, type FlagStatus } from '@/src/data/condition-catalog';
import { AssignRoutineModal } from './AssignRoutineModal';

const TEAL = '#1D9E75';
const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// Mapeo: PostgreSQL DOW (0=Dom) → columna del grid (0=Lun)
const DOW_TO_COL = [6, 0, 1, 2, 3, 4, 5]; // Dom=6, Lun=0...Sáb=5

type Tab = 'profile' | 'calendar' | 'routines' | 'progress' | 'history';

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
            <StatCard
              label="Volumen"
              value={stats.volume_kg > 999 ? `${Math.round(stats.volume_kg / 1000)}k` : `${stats.volume_kg}kg`}
              sub="este mes"
              color="#5B9BD5"
            />
            <StatCard label="PRs" value={String(stats.total_prs)} sub="totales" color="#EF9F27" />
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
            {activeTab === 'calendar' && <CalendarTab schedule={schedule} />}
            {activeTab === 'routines' && (
              <RoutinesTab routines={routines} onAssign={() => setAssignVisible(true)} />
            )}
            {activeTab === 'progress' && <ProgressTab prs={prs} />}
            {activeTab === 'history' && <HistoryTab history={history} />}
          </View>
        )}
      </View>

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

  return (
    <View style={{ gap: Spacing.md }}>
      {/* Datos base */}
      <View style={styles.profileCard}>
        <EliteText variant="caption" style={styles.profileCardLabel}>INFORMACIÓN PERSONAL</EliteText>
        <ProfileRow label="Nombre" value={clientName} />
        <ProfileRow label="Email" value={clientEmail} />
        <ProfileRow label="Conectado desde" value={new Date(connectedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </View>

      {/* ══════ TABLERO DE CONDICIONES ══════ */}
      <EliteText variant="caption" style={[styles.profileCardLabel, { marginBottom: 0 }]}>
        TABLERO DE CONDICIONES
      </EliteText>
      <EliteText variant="caption" style={{ color: '#666', fontSize: 11, marginBottom: Spacing.sm }}>
        Toca una pill para ciclar: no evaluado → normal → observación → presente
      </EliteText>

      {CONDITION_ZONES.map(zone => {
        const isExpanded = expandedZones.has(zone.key);
        const redCount = zone.conditions.filter(c => getFlag(c.key) === 'present').length;
        const orangeCount = zone.conditions.filter(c => getFlag(c.key) === 'observation').length;

        return (
          <View key={zone.key} style={styles.profileCard}>
            <Pressable onPress={() => toggleZone(zone.key)} style={styles.zoneHeader}>
              <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
              <EliteText variant="body" style={[styles.zoneTitle, { color: zone.color }]}>
                {zone.label}
              </EliteText>
              {(redCount > 0 || orangeCount > 0) && (
                <View style={styles.zoneBadges}>
                  {redCount > 0 && (
                    <View style={[styles.zoneBadge, { backgroundColor: '#E24B4A20' }]}>
                      <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 10, fontFamily: Fonts.bold }}>{redCount}</EliteText>
                    </View>
                  )}
                  {orangeCount > 0 && (
                    <View style={[styles.zoneBadge, { backgroundColor: '#EF9F2720' }]}>
                      <EliteText variant="caption" style={{ color: '#EF9F27', fontSize: 10, fontFamily: Fonts.bold }}>{orangeCount}</EliteText>
                    </View>
                  )}
                </View>
              )}
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
            </Pressable>

            {isExpanded && (
              <View style={styles.conditionPills}>
                {zone.conditions.map(cond => {
                  const status = getFlag(cond.key);
                  const st = FLAG_STATUSES[status];
                  return (
                    <Pressable
                      key={cond.key}
                      onPress={() => onFlagToggle(cond.key, zone.key)}
                      style={[styles.condPill, {
                        backgroundColor: st.bgColor,
                        borderColor: st.color + '40',
                        borderStyle: status === 'not_evaluated' ? 'dashed' : 'solid',
                      }]}
                    >
                      <EliteText variant="caption" style={[styles.condPillText, { color: st.color }]}>
                        {cond.label}
                      </EliteText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {/* Placeholders futuros */}
      <View style={[styles.profileCard, { opacity: 0.4 }]}>
        <EliteText variant="caption" style={styles.profileCardLabel}>PRÓXIMAMENTE</EliteText>
        <View style={styles.upcomingPills}>
          {['Composición corporal', 'Laboratorios', 'Medicamentos', 'Suplementos', 'Antecedentes familiares'].map(f => (
            <View key={f} style={styles.upcomingPill}>
              <EliteText variant="caption" style={styles.upcomingPillText}>{f}</EliteText>
            </View>
          ))}
        </View>
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
});
