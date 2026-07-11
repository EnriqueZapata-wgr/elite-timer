/**
 * Panel admin de user_reports — I/O sobre los RPCs de la migración 191.
 * La lógica pura (estados, labels, validación) vive en admin-core.ts.
 *
 * Doble gate:
 *   · Client-side (UX): isCurrentUserAdmin lee la PROPIA fila de admin_users
 *     (RLS dueño-only — un no-admin recibe cero filas).
 *   · Server-side (autoritativo): cada RPC valida admin_users por dentro; un
 *     no-admin recibe lista vacía / código 'not_admin' aunque llame el RPC crudo.
 */
import { supabase } from '@/src/lib/supabase';
import {
  isValidResolution,
  type AdminReportRow,
  type ReportResolution,
  type ReportStatus,
} from './admin-core';

export type AdminRpcCode =
  | 'resolved' | 'updated'
  | 'invalid_resolution' | 'not_found' | 'not_admin' | 'no_auth' | 'error';

/** ¿El usuario autenticado es admin? (lee su propia fila; RLS filtra el resto). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[admin] isCurrentUserAdmin:', error.message);
    return false;
  }
  return data != null;
}

/** Reports por estado (null = todos). Server-side el RPC exige admin. */
export async function listReports(status: ReportStatus | null = 'open'): Promise<AdminReportRow[]> {
  const { data, error } = await supabase.rpc('admin_list_reports', { p_status: status });
  if (error) {
    console.warn('[admin] listReports:', error.message);
    return [];
  }
  return (data ?? []) as AdminReportRow[];
}

async function adminRpc(fn: string, args: Record<string, unknown>): Promise<AdminRpcCode> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.warn(`[admin] ${fn}:`, error.message);
    return 'error';
  }
  return (typeof data === 'string' ? data : 'error') as AdminRpcCode;
}

export async function resolveReport(
  reportId: string,
  resolution: ReportResolution,
): Promise<AdminRpcCode> {
  if (!isValidResolution(resolution)) return 'invalid_resolution';
  return adminRpc('admin_resolve_report', { p_report_id: reportId, p_resolution: resolution });
}

/** Revertir (true) o confirmar (false) el auto-hide de un perfil reportado. */
export async function setDiscoverable(userId: string, value: boolean): Promise<AdminRpcCode> {
  return adminRpc('admin_set_discoverable', { p_user_id: userId, p_value: value });
}
