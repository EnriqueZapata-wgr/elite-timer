/**
 * Admin config — solo UX gates. RLS server-side es la autoridad real.
 */
export const ADMIN_UID = '90a55e74-0e3d-477a-9ac5-2b339f7c40af';
export const isAdmin = (userId: string | undefined | null): boolean =>
  userId === ADMIN_UID;
