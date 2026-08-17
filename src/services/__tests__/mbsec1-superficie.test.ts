/**
 * MB-SEC-1 · Superficie de datos — tests estáticos sobre las migraciones.
 * Patrón del guard estático de 184/190-193 (leen el SQL y fijan invariantes,
 * node-only, sin DB). Blindan que la superficie no se re-abra en un futuro edit.
 *
 * PREMIUM (16-ago-2026): estos tests SIGUEN VIVOS y no se tocaron a propósito,
 * aunque nombren cosas que la app ya no usa (spend_protons, join_challenge,
 * activate_pro_boost, claim_nback_protons).
 *
 * La razón: no verifican el producto, verifican la BASE. Esas funciones siguen
 * existiendo en el servidor con el saldo y el historial de personas reales, y
 * el día que alguien vuelva a tocar esas migraciones el guard tiene que seguir
 * exigiendo lo mismo: anon revocado y usuario derivado del token, no del
 * parámetro. Borrarlos porque el cliente dejó de llamarlas sería dejar sin
 * candado una superficie que sigue expuesta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readMig(file: string): string {
  return readFileSync(resolve(process.cwd(), 'supabase/migrations', file), 'utf8');
}
/** Quita comentarios `-- ...` para analizar SOLO SQL ejecutable. */
function exec(sql: string): string {
  return sql.split('\n').map((l) => {
    const i = l.indexOf('--');
    return i === -1 ? l : l.slice(0, i);
  }).join('\n');
}

describe('MB-SEC-1 §2 — las 6 RPC de economía NO confían en el parámetro', () => {
  const m207 = exec(readMig('207_economy_rpc_revoke_anon.sql'));
  const m218 = exec(readMig('218_nback_v1.sql'));

  it('las 4 que reciben p_user_id revocan anon + validan contra auth.uid() (207)', () => {
    for (const fn of ['spend_protons', 'convert_electrons_to_protons', 'join_challenge', 'activate_pro_boost']) {
      expect(m207, fn).toContain(fn);
    }
    // El corte del hoyo anon (auth.uid() es NULL con la anon key → el guard de
    // self-use no aplicaba). El guard de "p_user_id <> auth.uid()" vive en las
    // funciones; aquí se fija que anon quedó revocado.
    expect(m207).toMatch(/REVOKE\s+EXECUTE[\s\S]*anon/i);
  });

  it('claim_nback_protons y nback_percentiles DERIVAN de auth.uid() (no reciben p_user_id) y revocan anon (218)', () => {
    // Firmas: claim_nback_protons(p_date date) y nback_percentiles() — sin p_user_id.
    expect(m218).toMatch(/claim_nback_protons\(p_date\s+date\)/i);
    expect(m218).toMatch(/nback_percentiles\(\)/);
    expect(m218).not.toMatch(/claim_nback_protons\([^)]*p_user_id/i);
    expect(m218).not.toMatch(/nback_percentiles\([^)]*p_user_id/i);
    // Ambas derivan el usuario del token, no de un parámetro.
    expect(m218).toMatch(/claim_nback_protons[\s\S]*auth\.uid\(\)/i);
    expect(m218).toMatch(/nback_percentiles[\s\S]*auth\.uid\(\)/i);
    // Y anon revocado.
    expect(m218).toMatch(/REVOKE[\s\S]*claim_nback_protons[\s\S]*anon/i);
    expect(m218).toMatch(/REVOKE[\s\S]*nback_percentiles[\s\S]*anon/i);
  });
});

describe('MB-SEC-1 §1 — revoke anon en RPC SECURITY DEFINER (227)', () => {
  const m227 = exec(readMig('227_sec_revoke_anon_rpc.sql'));

  it('revoca EXECUTE de anon (no toca authenticated/service_role)', () => {
    expect(m227).toMatch(/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+%s\s+FROM\s+anon/i);
    expect(m227).not.toMatch(/FROM\s+authenticated/i);
    expect(m227).not.toMatch(/REVOKE[\s\S]*service_role/i);
  });

  it('incluye las funciones nombradas por el advisor (admin, clínicas, ops, comunidad)', () => {
    for (const fn of [
      'admin_list_reports', 'admin_resolve_report', 'admin_set_discoverable',
      'promote_argos_brain', 'publish_argos_brain',
      'get_dx_memory', 'save_dx_memory', 'elite_intake_guardar',
      'invite_client_by_email', 'search_users', 'get_public_profile',
    ]) {
      expect(m227, fn).toContain(`'${fn}'`);
    }
  });
});

describe('MB-SEC-1 §3 — search_path fijo en las 25 (228)', () => {
  const m228 = exec(readMig('228_sec_search_path.sql'));
  it('fija search_path = public por función', () => {
    expect(m228).toMatch(/ALTER\s+FUNCTION\s+%s\s+SET\s+search_path\s*=\s*public/i);
  });
  it('cubre las 25 funciones del hallazgo', () => {
    const nombres = [
      'generate_coach_code', 'get_today_routines', 'increment_argos_usage', 'create_routine_share',
      'clone_from_share', 'connect_to_coach', 'assign_routine_to_client', 'touch_affiliate_updated_at',
      'affiliate_status_change_wallet_bootstrap', 'generate_affiliate_code', 'get_today_timeline',
      'toggle_protocol_completion', 'touch_user_notification_prefs_updated_at', 'invite_client_by_email',
      'has_active_pro_boost', 'update_updated_at', 'get_current_user_role', 'is_admin', 'get_routine_tree',
      'calc_block_duration', 'calc_routine_duration', 'clone_routine', 'calc_estimated_1rm',
      'update_personal_record', 'touch_user_consent_updated_at',
    ];
    expect(nombres).toHaveLength(25);
    for (const fn of nombres) expect(m228, fn).toContain(`'${fn}'`);
  });
});

describe('MB-SEC-1 §4/§5 — bucket avatars y RLS documentado (229/230)', () => {
  it('§4: quita la policy de listado avatars_public_read', () => {
    const m229 = exec(readMig('229_sec_avatars_drop_list.sql'));
    expect(m229).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"avatars_public_read"/i);
  });
  it('§5: documenta las 7 tablas RLS-sin-policies con guarda de existencia', () => {
    const m230 = exec(readMig('230_sec_rls_documented.sql'));
    expect(m230).toMatch(/COMMENT\s+ON\s+TABLE/i);
    expect(m230).toMatch(/to_regclass/i);
    for (const t of [
      'public.argos_brain', 'public.argos_config', 'public.argos_dx_memory', 'public.push_failure_log',
      'elite_dx.clients', 'elite_dx.intake', 'elite_dx.braverman_results',
    ]) {
      expect(m230, t).toContain(t);
    }
  });
});
