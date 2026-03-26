/**
 * ClientDetailScreen — Ficha de cliente en el panel de coach.
 *
 * Header + stats + 4 tabs: Calendario, Rutinas, Progreso, Historial.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
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
  getLatestMeasurements, getMeasurementHistory, addMeasurement,
  getMedications, addMedication, toggleMedication,
  getSupplements, addSupplement, toggleSupplement,
  getFamilyHistory, addFamilyHistory, deleteFamilyHistory,
} from '@/src/services/client-profile-service';
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

      {/* ══════ SCORES DE SALUD ══════ */}
      <View style={styles.profileCard}>
        <EliteText variant="caption" style={styles.profileCardLabel}>SCORES DE SALUD</EliteText>
        <View style={styles.scoresGrid}>
          <ScoreCard label="Edad biológica" value="—" unit="años" color="#7F77DD" />
          <ScoreCard label="Edad metabólica" value="—" unit="años" color="#EF9F27" />
          <ScoreCard label="Ritmo de envejecimiento" value="—" unit="x" color="#E24B4A" />
          <ScoreCard label="Salud funcional" value="—" unit="/100" color={TEAL} />
        </View>
        <EliteText variant="caption" style={{ color: '#444', fontSize: 10, textAlign: 'center', marginTop: Spacing.sm, fontStyle: 'italic' }}>
          Próximamente: cálculo automático basado en labs, composición y hábitos
        </EliteText>
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
              <View>
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
                {/* Nota para oncológico cuando hay condiciones presentes */}
                {zone.key === 'oncologic' && zone.conditions.some(c => getFlag(c.key) === 'present') && (
                  <View style={styles.oncoNoteBox}>
                    <EliteText variant="caption" style={styles.oncoNoteLabel}>Nota oncológica (tipo de cáncer, estadio, etc.)</EliteText>
                    <EliteText variant="caption" style={styles.oncoNoteHint}>
                      {flags.find(f => f.zone === 'oncologic' && f.notes)?.notes || 'Sin nota — usa long press en la pill para agregar detalles'}
                    </EliteText>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* ══════ COMPOSICIÓN CORPORAL ══════ */}
      <CollapsibleSection title="Composición corporal" clientId={clientId} type="measurements" />

      {/* ══════ FARMACOLOGÍA + SUPLEMENTOS (lado a lado en web) ══════ */}
      <View style={styles.twoColRow}>
        <View style={styles.twoColItem}>
          <CollapsibleSection title="Farmacología" clientId={clientId} type="medications" />
        </View>
        <View style={styles.twoColItem}>
          <CollapsibleSection title="Suplementos" clientId={clientId} type="supplements" />
        </View>
      </View>

      {/* ══════ ANTECEDENTES FAMILIARES ══════ */}
      <CollapsibleSection title="Antecedentes familiares" clientId={clientId} type="family" />
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

function CollapsibleSection({ title, clientId, type }: {
  title: string; clientId: string; type: 'measurements' | 'medications' | 'supplements' | 'family';
}) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (expanded && data.length === 0) loadData(); }, [expanded]);

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
    <View style={styles.profileCard}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.zoneHeader}>
        <EliteText variant="body" style={styles.sectionTitle}>{title}</EliteText>
        {data.length > 0 && (
          <View style={[styles.zoneBadge, { backgroundColor: TEAL + '20' }]}>
            <EliteText variant="caption" style={{ color: TEAL, fontSize: 10, fontFamily: Fonts.bold }}>{data.length}</EliteText>
          </View>
        )}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: Spacing.sm }}>
          {loading ? <ActivityIndicator color={TEAL} size="small" /> : (
            <>
              {/* MEASUREMENTS */}
              {type === 'measurements' && (
                latest ? (
                  <View style={styles.measGrid}>
                    {[
                      { l: 'Peso', v: latest.weight_kg, u: 'kg' },
                      { l: '% Grasa', v: latest.body_fat_pct, u: '%' },
                      { l: '% Músculo', v: latest.muscle_mass_pct, u: '%' },
                      { l: 'G. Visceral', v: latest.visceral_fat, u: '' },
                      { l: 'Cintura', v: latest.waist_cm, u: 'cm' },
                      { l: 'Cadera', v: latest.hip_cm, u: 'cm' },
                      { l: 'Abdomen', v: latest.chest_cm, u: 'cm' },
                      { l: 'Bíceps', v: latest.arm_cm, u: 'cm' },
                      { l: 'Pierna', v: latest.leg_cm, u: 'cm' },
                    ].map(m => (
                      <View key={m.l} style={styles.measItem}>
                        <EliteText variant="caption" style={styles.measLabel}>{m.l}</EliteText>
                        <EliteText style={styles.measValue}>{m.v ?? '—'}{m.v ? m.u : ''}</EliteText>
                      </View>
                    ))}
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
        for (const [k, v] of Object.entries(form)) {
          if (v && !isNaN(Number(v))) nums[k] = Number(v);
        }
        await addMeasurement(clientId, nums);
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
      return ['weight_kg', 'body_fat_pct', 'muscle_mass_pct', 'visceral_fat', 'waist_cm', 'hip_cm', 'chest_cm', 'arm_cm', 'leg_cm'].map(k => (
        <View key={k} style={styles.modalField}>
          <EliteText variant="caption" style={styles.modalFieldLabel}>{k.replace(/_/g, ' ')}</EliteText>
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

  // Two column layout
  twoColRow: { flexDirection: 'row', gap: Spacing.sm },
  twoColItem: { flex: 1 },

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
});
