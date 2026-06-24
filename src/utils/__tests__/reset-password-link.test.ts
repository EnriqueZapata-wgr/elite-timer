import { describe, it, expect } from 'vitest';
import { parseResetPasswordUrl, isResetPasswordLink } from '@/src/utils/reset-password-link';

/**
 * #auth-sprint D — parser del deep link de reset. Supabase manda los tokens en el FRAGMENT (#),
 * pero algunos flujos usan query (?). El parser cubre ambos y es la base del routing en _layout.
 */
describe('isResetPasswordLink', () => {
  it('detecta el deep link de reset', () => {
    expect(isResetPasswordLink('atp://reset-password#access_token=x')).toBe(true);
    expect(isResetPasswordLink('atp://reset-password?access_token=x')).toBe(true);
  });
  it('rechaza otras URLs / vacío', () => {
    expect(isResetPasswordLink('atp://(tabs)')).toBe(false);
    expect(isResetPasswordLink(null)).toBe(false);
    expect(isResetPasswordLink(undefined)).toBe(false);
  });
});

describe('parseResetPasswordUrl', () => {
  it('extrae tokens del FRAGMENT (#) — formato default de Supabase', () => {
    const url = 'atp://reset-password#access_token=AAA&refresh_token=BBB&type=recovery';
    expect(parseResetPasswordUrl(url)).toEqual({ accessToken: 'AAA', refreshToken: 'BBB', type: 'recovery' });
  });

  it('extrae tokens del QUERY (?)', () => {
    const url = 'atp://reset-password?access_token=AAA&refresh_token=BBB&type=recovery';
    expect(parseResetPasswordUrl(url)).toEqual({ accessToken: 'AAA', refreshToken: 'BBB', type: 'recovery' });
  });

  it('decodifica valores url-encoded', () => {
    const url = 'atp://reset-password#access_token=a%2Bb%3Dc&refresh_token=r';
    const out = parseResetPasswordUrl(url);
    expect(out.accessToken).toBe('a+b=c');
    expect(out.refreshToken).toBe('r');
  });

  it('devuelve nulls si faltan tokens o la URL no tiene params', () => {
    expect(parseResetPasswordUrl('atp://reset-password')).toEqual({ accessToken: null, refreshToken: null, type: null });
    expect(parseResetPasswordUrl(null)).toEqual({ accessToken: null, refreshToken: null, type: null });
  });

  it('extrae access_token aunque falte refresh_token', () => {
    const out = parseResetPasswordUrl('atp://reset-password#access_token=AAA&type=recovery');
    expect(out.accessToken).toBe('AAA');
    expect(out.refreshToken).toBeNull();
  });
});
