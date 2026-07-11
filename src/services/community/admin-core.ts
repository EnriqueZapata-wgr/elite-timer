/**
 * Panel admin de user_reports — núcleo PURO (Comunidad V1.1 §2.2).
 * El I/O (RPCs admin_* de la migración 191) vive en admin-service.ts.
 *
 * El gate autoritativo es SERVER-SIDE (dentro de cada RPC: admin_users).
 * Aquí solo validaciones/formateo para la pantalla app/admin/reports.tsx.
 */
import { REPORT_REASONS } from '@/src/constants/community';

/** Estados del report — espejo EXACTO del CHECK de la migración 191. */
export const REPORT_STATUSES = ['open', 'reviewed', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Resoluciones aplicables desde el panel (todo menos volver a 'open'). */
export const REPORT_RESOLUTIONS = ['reviewed', 'actioned', 'dismissed'] as const;
export type ReportResolution = (typeof REPORT_RESOLUTIONS)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Abierto',
  reviewed: 'Revisado',
  actioned: 'Accionado',
  dismissed: 'Descartado',
};

export function isValidReportStatus(s: string): s is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(s);
}

export function isValidResolution(s: string): s is ReportResolution {
  return (REPORT_RESOLUTIONS as readonly string[]).includes(s);
}

/** Label en español de la razón (espejo de REPORT_REASONS; fail-soft). */
export function reportReasonLabel(key: string): string {
  return REPORT_REASONS.find((r) => r.key === key)?.label ?? key;
}

/** Fila que devuelve admin_list_reports (identidad pública, mig 191). */
export interface AdminReportRow {
  report_id: string;
  reporter_user_id: string;
  reporter_username: string | null;
  reporter_display_name: string | null;
  reported_user_id: string;
  reported_username: string | null;
  reported_display_name: string | null;
  reported_discoverable: boolean;
  report_reason: string;
  report_details: string | null;
  report_status: string;
  report_created_at: string;
}

/** Nombre visible fail-soft (mismo criterio que friends-core). */
export function adminDisplayName(
  displayName: string | null,
  username: string | null,
): string {
  return displayName || username || 'Atleta ATP';
}
