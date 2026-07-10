import { describe, it, expect } from 'vitest';
import {
  applyVisibility,
  projectionIsClean,
  validateUsername,
  type PublicProfileRow,
} from '../public-profile-core';
import { DEFAULT_VISIBILITY } from '@/src/constants/community';

function row(p: Partial<PublicProfileRow> = {}): PublicProfileRow {
  return {
    ...DEFAULT_VISIBILITY,
    user_id: 'u1',
    username: 'enrique',
    display_name: null,
    avatar_url: 'https://cdn/a.png',
    country: 'MX',
    chronotype: 'lion',
    streak_days: 12,
    lifetime_electrons: 8400,
    current_rank: 27,
    friend_count: 5,
    ...p,
  };
}

describe('applyVisibility', () => {
  it('defaults: streak/electrones/rank visibles; país/cronotipo ocultos', () => {
    const v = applyVisibility(row());
    expect(v.streak_days).toBe(12);
    expect(v.lifetime_electrons).toBe(8400);
    expect(v.current_rank).toBe(27);
    expect(v.country).toBeNull();       // show_country default false
    expect(v.chronotype).toBeNull();    // show_chronotype default false
  });

  it('display_name cae a username cuando es null', () => {
    expect(applyVisibility(row({ display_name: null })).display_name).toBe('enrique');
    expect(applyVisibility(row({ display_name: 'EZ' })).display_name).toBe('EZ');
  });

  it('flags off anulan cada campo', () => {
    const v = applyVisibility(row({
      show_streak: false, show_electrons: false, show_badges: false, show_photo: false,
    }));
    expect(v.streak_days).toBeNull();
    expect(v.lifetime_electrons).toBeNull();
    expect(v.current_rank).toBeNull();
    expect(v.avatar_url).toBeNull();
  });

  it('flags on muestran país y cronotipo', () => {
    const v = applyVisibility(row({ show_country: true, show_chronotype: true }));
    expect(v.country).toBe('MX');
    expect(v.chronotype).toBe('lion');
  });

  it('friend_count y user_id siempre presentes', () => {
    const v = applyVisibility(row({ show_streak: false, show_electrons: false }));
    expect(v.user_id).toBe('u1');
    expect(v.friend_count).toBe(5);
  });
});

describe('validateUsername', () => {
  it('válido normaliza a minúsculas', () => {
    expect(validateUsername('  Enrique_ZP  ')).toEqual({ ok: true, normalized: 'enrique_zp' });
  });
  it('muy corto / muy largo', () => {
    expect(validateUsername('ab').ok).toBe(false);
    expect(validateUsername('a'.repeat(21)).ok).toBe(false);
  });
  it('charset y guion bajo en bordes', () => {
    expect(validateUsername('mal usuario').ok).toBe(false); // espacio
    expect(validateUsername('_leading').ok).toBe(false);
    expect(validateUsername('trailing_').ok).toBe(false);
    expect(validateUsername('conACENTOó').ok).toBe(false);
    expect(validateUsername('ok_name9').ok).toBe(true);
  });
});
