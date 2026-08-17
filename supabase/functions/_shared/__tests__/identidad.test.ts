import { describe, expect, it, vi } from 'vitest';

import { extraerJwt, renglonIdentidad, resolverIdentidad } from '../identidad';

const ANON = 'anon.key.firmada';
const UID_REAL = '11111111-1111-1111-1111-111111111111';
const UID_AJENO = '22222222-2222-2222-2222-222222222222';

/** Verificador de mentiras: solo reconoce un token, el del usuario real. */
const verificar = vi.fn(async (jwt: string) => (jwt === 'token.de.enrique' ? UID_REAL : null));

describe('extraerJwt', () => {
  it('quita el Bearer sin importar la caja', () => {
    expect(extraerJwt('Bearer abc')).toBe('abc');
    expect(extraerJwt('bearer abc')).toBe('abc');
    expect(extraerJwt('  Bearer   abc  ')).toBe('abc');
  });

  it('sin header no hay token', () => {
    expect(extraerJwt(undefined)).toBeNull();
    expect(extraerJwt('')).toBeNull();
    expect(extraerJwt('Bearer ')).toBeNull();
  });
});

describe('resolverIdentidad · el JWT gana siempre', () => {
  it('con JWT válido se usa el del token y se ignora el del cuerpo', async () => {
    const id = await resolverIdentidad({
      authorization: 'Bearer token.de.enrique',
      bodyUserId: UID_AJENO,
      verificar,
      anonKey: ANON,
      exigirJwt: false,
    });
    expect(id.userId).toBe(UID_REAL);
    expect(id.fuente).toBe('jwt');
    expect(id.suplantacionIntentada).toBe(true);
    expect(id.rechazar).toBe(false);
  });

  it('cuerpo que coincide con el JWT no es suplantación', async () => {
    const id = await resolverIdentidad({
      authorization: 'Bearer token.de.enrique',
      bodyUserId: UID_REAL,
      verificar,
      anonKey: ANON,
      exigirJwt: false,
    });
    expect(id.suplantacionIntentada).toBe(false);
    expect(renglonIdentidad(id, 'argos-proxy')).toBeNull();
  });
});

describe('resolverIdentidad · la anon key no es identidad', () => {
  it('la anon key se descarta sin ir a Auth', async () => {
    const espia = vi.fn(async () => UID_REAL);
    const id = await resolverIdentidad({
      authorization: `Bearer ${ANON}`,
      bodyUserId: UID_AJENO,
      verificar: espia,
      anonKey: ANON,
      exigirJwt: false,
    });
    expect(espia).not.toHaveBeenCalled();
    expect(id.fuente).toBe('cuerpo');
    expect(id.userId).toBe(UID_AJENO);
  });

  it('un token cualquiera que Auth no reconoce cae al camino de gracia', async () => {
    const id = await resolverIdentidad({
      authorization: 'Bearer token.inventado',
      bodyUserId: UID_AJENO,
      verificar,
      anonKey: ANON,
      exigirJwt: false,
    });
    expect(id.fuente).toBe('cuerpo');
  });
});

describe('resolverIdentidad · tiempo 1, el modo de falla es seguir funcionando', () => {
  it('sin JWT de usuario se acepta el cuerpo y se avisa en el log', async () => {
    const id = await resolverIdentidad({
      authorization: `Bearer ${ANON}`,
      bodyUserId: UID_REAL,
      verificar,
      anonKey: ANON,
      exigirJwt: false,
    });
    expect(id.rechazar).toBe(false);
    expect(id.userId).toBe(UID_REAL);
    expect(renglonIdentidad(id, 'argos-proxy')).toContain('fuente=cuerpo');
  });

  it('sin JWT y sin cuerpo no se rechaza, pero no hay a quién atribuir', async () => {
    const id = await resolverIdentidad({
      authorization: null,
      bodyUserId: undefined,
      verificar,
      anonKey: ANON,
      exigirJwt: false,
    });
    expect(id.rechazar).toBe(false);
    expect(id.userId).toBeNull();
    expect(id.fuente).toBe('ninguna');
  });

  it('un userId que no es string no cuenta como identidad', async () => {
    for (const basura of [42, {}, [], '', null, true]) {
      const id = await resolverIdentidad({
        authorization: null,
        bodyUserId: basura,
        verificar,
        anonKey: ANON,
        exigirJwt: false,
      });
      expect(id.userId).toBeNull();
    }
  });

  it('si Auth truena, no se convierte en 401 para el usuario legítimo', async () => {
    const truena = vi.fn(async () => { throw new Error('auth caído'); });
    const id = await resolverIdentidad({
      authorization: 'Bearer token.de.enrique',
      bodyUserId: UID_REAL,
      verificar: truena,
      anonKey: ANON,
      exigirJwt: false,
    });
    expect(id.rechazar).toBe(false);
    expect(id.userId).toBe(UID_REAL);
    expect(id.fuente).toBe('cuerpo');
  });
});

describe('resolverIdentidad · tiempo 2, el hueco cerrado de verdad', () => {
  it('con exigirJwt, el cuerpo ya no vale nada', async () => {
    const id = await resolverIdentidad({
      authorization: `Bearer ${ANON}`,
      bodyUserId: UID_AJENO,
      verificar,
      anonKey: ANON,
      exigirJwt: true,
    });
    expect(id.rechazar).toBe(true);
    expect(id.userId).toBeNull();
  });

  it('con exigirJwt y JWT bueno, todo sigue igual', async () => {
    const id = await resolverIdentidad({
      authorization: 'Bearer token.de.enrique',
      bodyUserId: UID_AJENO,
      verificar,
      anonKey: ANON,
      exigirJwt: true,
    });
    expect(id.rechazar).toBe(false);
    expect(id.userId).toBe(UID_REAL);
  });

  it('con exigirJwt y Auth caído se rechaza: en tiempo 2 no hay gracia', async () => {
    const truena = vi.fn(async () => { throw new Error('auth caído'); });
    const id = await resolverIdentidad({
      authorization: 'Bearer token.de.enrique',
      bodyUserId: UID_REAL,
      verificar: truena,
      anonKey: ANON,
      exigirJwt: true,
    });
    expect(id.rechazar).toBe(true);
  });
});
