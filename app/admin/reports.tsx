/**
 * Admin › Reports (Comunidad V1.1 §2.2) — panel de revisión manual de user_reports.
 *
 * Doble gate:
 *   · Client-side (UX): isCurrentUserAdmin (fila propia en admin_users, RLS
 *     dueño-only). Un no-admin ve "Acceso restringido".
 *   · Server-side (autoritativo): cada RPC admin_* valida admin_users por
 *     dentro — llamar el RPC crudo sin ser admin devuelve vacío/'not_admin'.
 *
 * Anti-fuga: los reports muestran reporter/reported SOLO como identidad pública
 * (username/display de user_profile_public vía admin_list_reports). Cero clínico.
 * UI sobria: cards, filtros por estado, acciones reviewed/actioned/dismissed y
 * toggle discoverable del reportado (revertir/confirmar auto-hides).
 */
import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import {
  isCurrentUserAdmin,
  listReports,
  resolveReport,
  setDiscoverable,
} from '@/src/services/community/admin-service';
import {
  adminDisplayName,
  reportReasonLabel,
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  type AdminReportRow,
  type ReportResolution,
  type ReportStatus,
} from '@/src/services/community/admin-core';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

const RESOLUTION_ACTIONS: { key: ReportResolution; label: string }[] = [
  { key: 'reviewed', label: 'Revisado' },
  { key: 'actioned', label: 'Accionado' },
  { key: 'dismissed', label: 'Descartar' },
];

function ReportCard({
  report,
  onResolve,
  onToggleDiscoverable,
}: {
  report: AdminReportRow;
  onResolve: (id: string, resolution: ReportResolution) => void;
  onToggleDiscoverable: (userId: string, value: boolean) => void;
}) {
  const reporter = adminDisplayName(report.reporter_display_name, report.reporter_username);
  const reported = adminDisplayName(report.reported_display_name, report.reported_username);
  const isOpen = report.report_status === 'open';
  const date = report.report_created_at?.slice(0, 10) ?? '';

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <EliteText style={s.reason}>{reportReasonLabel(report.report_reason)}</EliteText>
        <EliteText style={s.date}>{date}</EliteText>
      </View>

      <EliteText style={s.parties}>
        <EliteText style={s.partyLabel}>Reportó: </EliteText>{reporter}
        {'   →   '}
        <EliteText style={s.partyLabel}>Reportado: </EliteText>{reported}
      </EliteText>

      {report.report_details ? (
        <EliteText style={s.details}>"{report.report_details}"</EliteText>
      ) : null}

      <View style={s.metaRow}>
        <View style={[s.statusBadge, isOpen && s.statusBadgeOpen]}>
          <EliteText style={[s.statusText, isOpen && s.statusTextOpen]}>
            {REPORT_STATUS_LABELS[report.report_status as ReportStatus] ?? report.report_status}
          </EliteText>
        </View>
        <Pressable
          style={s.discToggle}
          onPress={() => onToggleDiscoverable(report.reported_user_id, !report.reported_discoverable)}
        >
          <Ionicons
            name={report.reported_discoverable ? 'eye-outline' : 'eye-off-outline'}
            size={14}
            color={report.reported_discoverable ? ATP_BRAND.lime : TEXT.tertiary}
          />
          <EliteText style={s.discText}>
            {report.reported_discoverable ? 'Visible — ocultar' : 'Oculto — restaurar'}
          </EliteText>
        </Pressable>
      </View>

      {isOpen && (
        <View style={s.actionsRow}>
          {RESOLUTION_ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              style={s.actionBtn}
              onPress={() => onResolve(report.report_id, a.key)}
            >
              <EliteText style={s.actionText}>{a.label}</EliteText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = verificando
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('open');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await listReports(statusFilter);
    setReports(rows);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    (async () => {
      const admin = await isCurrentUserAdmin();
      setIsAdmin(admin);
    })();
  }, []);

  useEffect(() => {
    if (isAdmin) { setLoading(true); load(); }
  }, [isAdmin, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onResolve = useCallback(async (id: string, resolution: ReportResolution) => {
    const code = await resolveReport(id, resolution);
    if (code === 'resolved') {
      await load();
    } else {
      Alert.alert('No se pudo resolver', `Código: ${code}`);
    }
  }, [load]);

  const onToggleDiscoverable = useCallback(async (userId: string, value: boolean) => {
    const code = await setDiscoverable(userId, value);
    if (code === 'updated') {
      await load();
    } else {
      Alert.alert('No se pudo actualizar', `Código: ${code}`);
    }
  }, [load]);

  // Gate client-side (el server-side vive dentro de cada RPC)
  if (isAdmin === false) {
    return (
      <View style={[s.screen, s.center, { paddingTop: insets.top }]}>
        <Ionicons name="lock-closed-outline" size={32} color={TEXT.tertiary} />
        <EliteText style={s.gateTitle}>Acceso restringido</EliteText>
        <EliteText style={s.gateText}>Esta sección es solo para administradores.</EliteText>
        <Pressable style={s.gateBack} onPress={() => router.back()}>
          <EliteText style={s.gateBackText}>Volver</EliteText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ATP_BRAND.lime} />}
    >
      <View style={{ paddingTop: insets.top + 8 }}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </Pressable>
        </View>
        <EliteText style={s.title}>Reports</EliteText>
        <EliteText style={s.subtitle}>Revisión manual de la comunidad. Solo identidad pública — cero datos clínicos.</EliteText>
      </View>

      {/* Filtro por estado */}
      <View style={s.filterRow}>
        {REPORT_STATUSES.map((st) => {
          const active = statusFilter === st;
          return (
            <Pressable
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[s.filterChip, active && s.filterChipActive]}
            >
              <EliteText style={[s.filterText, active && s.filterTextActive]}>
                {REPORT_STATUS_LABELS[st]}
              </EliteText>
            </Pressable>
          );
        })}
      </View>

      {isAdmin === null || loading ? (
        <EliteText style={s.empty}>Cargando…</EliteText>
      ) : reports.length === 0 ? (
        <EliteText style={s.empty}>
          {statusFilter === 'open' ? 'Sin reports abiertos. Comunidad sana.' : 'Nada en este estado.'}
        </EliteText>
      ) : (
        reports.map((r) => (
          <ReportCard
            key={r.report_id}
            report={r}
            onResolve={onResolve}
            onToggleDiscoverable={onToggleDiscoverable}
          />
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.lg, marginBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
  },
  filterChipActive: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
  },
  filterText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: TEXT.secondary },
  filterTextActive: { color: ATP_BRAND.lime },
  card: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reason: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  date: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary },
  parties: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 8 },
  partyLabel: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: TEXT.tertiary },
  details: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary,
    marginTop: 8, fontStyle: 'italic',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    backgroundColor: ELEVATION[2].bg,
  },
  statusBadgeOpen: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12) },
  statusText: { fontSize: 10, fontFamily: Fonts.semiBold, color: TEXT.secondary, letterSpacing: 1 },
  statusTextOpen: { color: ATP_BRAND.lime },
  discToggle: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  discText: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.secondary },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: ELEVATION[1].border, backgroundColor: ELEVATION[0].bg,
  },
  actionText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: TEXT.primary },
  empty: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary,
    textAlign: 'center', paddingVertical: Spacing.lg,
  },
  gateTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: 8 },
  gateText: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary },
  gateBack: {
    marginTop: Spacing.md, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.5),
  },
  gateBackText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime },
});
