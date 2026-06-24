/**
 * Parser puro del deep link de reset de contraseña (`atp://reset-password...`).
 *
 * Supabase manda los tokens normalmente en el FRAGMENT (#access_token=...&refresh_token=...&
 * type=recovery), pero algunos flujos los ponen en el query (?). Este parser cubre AMBOS y es
 * testeable sin React Native (no usa expo-linking). El _layout lo usa para enrutar a la pantalla.
 */
export interface ResetTokens {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
}

function getParam(qs: string, key: string): string | null {
  const m = qs.match(new RegExp(`(?:^|&)${key}=([^&]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** ¿La URL es un deep link de reset de contraseña? */
export function isResetPasswordLink(url: string | null | undefined): boolean {
  return !!url && url.includes('reset-password');
}

/** Extrae access_token / refresh_token / type del query o del fragment de la URL. */
export function parseResetPasswordUrl(url: string | null | undefined): ResetTokens {
  if (!url) return { accessToken: null, refreshToken: null, type: null };
  const idx = url.search(/[#?]/);
  // Todo lo que sigue al primer ? o #, con ambos separadores normalizados a '&'.
  const qs = idx >= 0 ? url.slice(idx + 1).replace(/[#?]/g, '&') : '';
  return {
    accessToken: getParam(qs, 'access_token'),
    refreshToken: getParam(qs, 'refresh_token'),
    type: getParam(qs, 'type'),
  };
}
