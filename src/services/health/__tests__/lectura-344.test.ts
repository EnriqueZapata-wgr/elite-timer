/**
 * Lectura 344 — la caída al select viejo y su memoria corta.
 *
 * Lo que se cuida: (1) con la base vieja no se gasta una petición fallida en
 * cada lectura mientras la bandera vive; (2) un error que NO es de la 344 se
 * devuelve tal cual, nunca como "no hay datos".
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { _reiniciarBase344, base344ConocidaAusente } from '../base-344-estado';
import type { RespuestaSalud } from '../health-read-core';
import { leerConCaida } from '../lectura-344';

type Fila = { steps: number };

const FALTA_344: RespuestaSalud<Fila> = {
  data: null,
  error: { code: '42703', message: 'column health_os_daily.field_sources does not exist' },
};

function contador(respuesta: RespuestaSalud<Fila>) {
  const f = async () => {
    f.llamadas++;
    return respuesta;
  };
  f.llamadas = 0;
  return f;
}

describe('leerConCaida', () => {
  beforeEach(() => {
    _reiniciarBase344();
  });

  it('con la 344, una sola consulta (la nueva) y su dato', async () => {
    const nueva = contador({ data: { steps: 1 }, error: null });
    const vieja = contador({ data: { steps: 2 }, error: null });
    const r = await leerConCaida(nueva, vieja);
    expect(r.data).toEqual({ steps: 1 });
    expect(nueva.llamadas).toBe(1);
    expect(vieja.llamadas).toBe(0);
    expect(base344ConocidaAusente()).toBe(false);
  });

  it('sin la 344, cae a la vieja y marca la bandera', async () => {
    const nueva = contador(FALTA_344);
    const vieja = contador({ data: { steps: 2 }, error: null });
    const r = await leerConCaida(nueva, vieja);
    expect(r).toEqual({ data: { steps: 2 }, error: null });
    expect(vieja.llamadas).toBe(1);
    expect(base344ConocidaAusente()).toBe(true);
  });

  it('mientras la bandera vive, la segunda lectura NO hace la petición nueva', async () => {
    const nueva = contador(FALTA_344);
    const vieja = contador({ data: { steps: 2 }, error: null });
    await leerConCaida(nueva, vieja);
    await leerConCaida(nueva, vieja);
    await leerConCaida(nueva, vieja);
    expect(nueva.llamadas).toBe(1);
    expect(vieja.llamadas).toBe(3);
  });

  it('cualquier otro error se devuelve tal cual y no marca la bandera', async () => {
    const err = { code: '42501', message: 'permission denied for table health_os_daily' };
    const nueva = contador({ data: null, error: err });
    const vieja = contador({ data: { steps: 2 }, error: null });
    const r = await leerConCaida(nueva, vieja);
    expect(r.error).toEqual(err);
    expect(r.data).toBeNull();
    expect(vieja.llamadas).toBe(0);
    expect(base344ConocidaAusente()).toBe(false);
  });

  it('una tabla faltante tampoco es "base sin la 344"', async () => {
    const err = { code: '42P01', message: 'relation "public.sleep_nights" does not exist' };
    const nueva = contador({ data: null, error: err });
    const vieja = contador({ data: { steps: 2 }, error: null });
    const r = await leerConCaida(nueva, vieja);
    expect(r.error).toEqual(err);
    expect(vieja.llamadas).toBe(0);
  });

  it('si la vieja también falla, ese error llega al llamador (no se inventa un vacío)', async () => {
    const errViejo = { code: '', message: 'Failed to fetch' };
    const nueva = contador(FALTA_344);
    const vieja = contador({ data: null, error: errViejo });
    const r = await leerConCaida(nueva, vieja);
    expect(r.error).toEqual(errViejo);
  });
});
