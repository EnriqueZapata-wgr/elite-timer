/**
 * Candados del código de activación en el registro (pivote Elite, 8-sep-2026).
 *
 * Lo que estos tests protegen, en una frase: NUNCA acusar de mentiroso a un
 * cliente que pagó. Si no se pudo leer, se dice que no se pudo leer y se deja
 * reintentar; jamás se traduce un fallo de red a "tu código no existe".
 */
import { describe, expect, it } from 'vitest';
import {
  COPY_CONFIRMA_TU_CORREO,
  decidirTrasCanjePendiente,
  estadoDesdeRespuesta,
  llaveCanjePendiente,
  mensajeDeCanjeTrasCuenta,
  mensajeDeCodigo,
  nivelQuedoAplicado,
  normalizarCodigo,
  permiteCrearCuenta,
  tieneFormaDeCodigo,
  type EstadoCanje,
  type EstadoCodigo,
} from '../codigo-registro-core';

describe('normalizarCodigo', () => {
  it('la gente lo escribe con guiones, sin guiones y en minúsculas', () => {
    expect(normalizarCodigo('atp-abcd-2345')).toBe('ATPABCD2345');
    expect(normalizarCodigo('ATPABCD2345')).toBe('ATPABCD2345');
    expect(normalizarCodigo('  atp abcd 2345  ')).toBe('ATPABCD2345');
  });

  it('sin código no revienta', () => {
    expect(normalizarCodigo('')).toBe('');
    expect(normalizarCodigo(null)).toBe('');
    expect(normalizarCodigo(undefined)).toBe('');
  });
});

describe('tieneFormaDeCodigo', () => {
  it('el campo vacío o a medias no se manda al servidor', () => {
    expect(tieneFormaDeCodigo('')).toBe(false);
    expect(tieneFormaDeCodigo('ATP-')).toBe(false);
    expect(tieneFormaDeCodigo('---')).toBe(false);
  });

  it('un código con forma razonable sí se manda', () => {
    expect(tieneFormaDeCodigo('ATP-ABCD-2345')).toBe(true);
  });

  it('no exige el formato ATP-XXXX-XXXX: un formato nuevo no puede dejar fuera a nadie', () => {
    expect(tieneFormaDeCodigo('ELITE2026')).toBe(true);
  });
});

describe('estadoDesdeRespuesta', () => {
  it('cree al servidor cuando el servidor habló', () => {
    expect(estadoDesdeRespuesta({ estado: 'usable' }, false)).toBe('usable');
    expect(estadoDesdeRespuesta({ estado: 'no_encontrado' }, false)).toBe('no_encontrado');
    expect(estadoDesdeRespuesta({ estado: 'vencido' }, false)).toBe('vencido');
    expect(estadoDesdeRespuesta({ estado: 'agotado' }, false)).toBe('agotado');
  });

  it('con error de red NO concluye que el código sea malo', () => {
    // supabase-js no lanza en 4xx ni sin red: devuelve { data: null, error }.
    expect(estadoDesdeRespuesta(null, true)).toBe('no_verificado');
    expect(estadoDesdeRespuesta({ estado: 'usable' }, true)).toBe('no_verificado');
  });

  it('una respuesta con forma rara tampoco condena al código', () => {
    expect(estadoDesdeRespuesta(undefined, false)).toBe('no_verificado');
    expect(estadoDesdeRespuesta('usable', false)).toBe('no_verificado');
    expect(estadoDesdeRespuesta({}, false)).toBe('no_verificado');
    expect(estadoDesdeRespuesta({ estado: 'lo_que_sea' }, false)).toBe('no_verificado');
  });
});

describe('permiteCrearCuenta', () => {
  it('solo un código vivo crea cuenta', () => {
    expect(permiteCrearCuenta('usable')).toBe(true);
  });

  it('la duda nunca crea cuenta: sin código válido no hay cuenta', () => {
    const otros: EstadoCodigo[] = ['no_encontrado', 'vencido', 'agotado', 'no_verificado'];
    for (const estado of otros) expect(permiteCrearCuenta(estado)).toBe(false);
  });
});

describe('mensajeDeCodigo', () => {
  it('el código bueno no dice nada', () => {
    expect(mensajeDeCodigo('usable')).toBeNull();
  });

  it('"no se pudo verificar" y "no existe" dicen cosas DISTINTAS', () => {
    const noVerificado = mensajeDeCodigo('no_verificado') ?? '';
    const noEncontrado = mensajeDeCodigo('no_encontrado') ?? '';
    expect(noVerificado).not.toBe(noEncontrado);
    expect(noVerificado.toLowerCase()).toContain('conexión');
    // Nunca insinúa que el código no exista cuando lo que falló fue leerlo.
    expect(noVerificado.toLowerCase()).not.toContain('no reconocimos');
  });

  it('ningún mensaje presenta el código como una vía de compra (Apple 3.1.1)', () => {
    const prohibidas = ['compra', 'comprar', 'precio', 'pago', 'stripe', 'sitio web', 'tienda'];
    const estados: EstadoCodigo[] = ['no_encontrado', 'vencido', 'agotado', 'no_verificado'];
    for (const estado of estados) {
      const texto = (mensajeDeCodigo(estado) ?? '').toLowerCase();
      for (const palabra of prohibidas) expect(texto).not.toContain(palabra);
    }
  });

  it('ningún mensaje usa palabras de salud prohibidas ni em dash', () => {
    const prohibidas = ['diagnóstico', 'tratamiento', 'terapéutico', 'previene', 'cura', 'receta médica', 'chequeo'];
    const estados: EstadoCodigo[] = ['no_encontrado', 'vencido', 'agotado', 'no_verificado'];
    for (const estado of estados) {
      const texto = (mensajeDeCodigo(estado) ?? '').toLowerCase();
      for (const palabra of prohibidas) expect(texto).not.toContain(palabra);
      expect(texto).not.toContain('—');
    }
  });
});

describe('nivelQuedoAplicado', () => {
  it('el canje bueno aplica el nivel', () => {
    expect(nivelQuedoAplicado('ok')).toBe(true);
  });

  it('el doble toque de la MISMA persona no es un fallo', () => {
    // Carrera real: la persona toca dos veces, o el primer intento sí llegó y
    // la respuesta se perdió. El grant ya existe: no se le castiga por eso.
    expect(nivelQuedoAplicado('already_redeemed')).toBe(true);
  });

  it('lo demás no aplicó nivel', () => {
    const malos: EstadoCanje[] = ['not_found', 'expired', 'exhausted', 'not_authenticated', 'network_error'];
    for (const estado of malos) expect(nivelQuedoAplicado(estado)).toBe(false);
  });
});

describe('mensajeDeCanjeTrasCuenta', () => {
  it('si el nivel quedó puesto no hay nada que avisar', () => {
    expect(mensajeDeCanjeTrasCuenta('ok')).toBeNull();
    expect(mensajeDeCanjeTrasCuenta('already_redeemed')).toBeNull();
  });

  it('siempre dice que la cuenta SÍ quedó creada', () => {
    const malos: EstadoCanje[] = ['not_found', 'expired', 'exhausted', 'not_authenticated', 'network_error'];
    for (const estado of malos) {
      const texto = (mensajeDeCanjeTrasCuenta(estado) ?? '').toLowerCase();
      expect(texto).toContain('cuenta ya quedó creada');
    }
  });

  it('sin red promete que el nivel se aplica solo, y NO manda a buscar Ajustes', () => {
    // 8-sep-2026: este test decía que el mensaje debía mencionar Ajustes.
    // La revisión en frío mostró por qué estaba mal: mandar a alguien a una
    // pantalla que no sabe que existe es dejarlo solo. Ahora el código queda
    // guardado y se canjea al entrar, así que el candado es el contrario.
    const texto = (mensajeDeCanjeTrasCuenta('network_error') ?? '').toLowerCase();
    expect(texto).not.toContain('ajustes');
    expect(texto).toContain('se activa solo');
  });
});

describe('COPY_CONFIRMA_TU_CORREO', () => {
  it('dice las TRES cosas: cuenta creada, abre el correo, el código sigue vivo', () => {
    const texto = COPY_CONFIRMA_TU_CORREO.texto.toLowerCase();
    expect(texto).toContain('cuenta ya quedó creada');
    expect(texto).toContain('correo');
    expect(texto).toContain('código ya quedó guardado');
    expect(COPY_CONFIRMA_TU_CORREO.titulo.length).toBeGreaterThan(0);
  });

  it('no manda a buscar ninguna pantalla ni habla de compra', () => {
    const texto = COPY_CONFIRMA_TU_CORREO.texto.toLowerCase();
    for (const palabra of ['ajustes', 'compra', 'precio', 'tienda', '—']) {
      expect(texto).not.toContain(palabra);
    }
  });
});

describe('llaveCanjePendiente', () => {
  it('la llave lleva el correo: el código de una persona no puede caer en otra cuenta', () => {
    // El bug de la llave global ya pasó con la cola de consentimientos.
    expect(llaveCanjePendiente('ana@ejemplo.com')).not.toBe(llaveCanjePendiente('luis@ejemplo.com'));
    expect(llaveCanjePendiente('ana@ejemplo.com')).toContain('ana@ejemplo.com');
  });

  it('el mismo correo escrito distinto es la misma llave', () => {
    expect(llaveCanjePendiente('  ANA@Ejemplo.com ')).toBe(llaveCanjePendiente('ana@ejemplo.com'));
  });

  it('sin correo no hay llave: sin identidad no se guarda nada', () => {
    expect(llaveCanjePendiente('')).toBe('');
    expect(llaveCanjePendiente('   ')).toBe('');
    expect(llaveCanjePendiente(null)).toBe('');
    expect(llaveCanjePendiente(undefined)).toBe('');
  });
});

describe('decidirTrasCanjePendiente', () => {
  it('lo que no probó nada se conserva para el próximo intento', () => {
    expect(decidirTrasCanjePendiente('network_error')).toBe('conservar');
    expect(decidirTrasCanjePendiente('not_authenticated')).toBe('conservar');
  });

  it('aplicado se borra: no hay nada que reintentar', () => {
    expect(decidirTrasCanjePendiente('ok')).toBe('borrar');
    expect(decidirTrasCanjePendiente('already_redeemed')).toBe('borrar');
  });

  it('un código que el servidor rechazó de verdad se borra y no se insiste', () => {
    const muertos: EstadoCanje[] = ['not_found', 'expired', 'exhausted'];
    for (const estado of muertos) expect(decidirTrasCanjePendiente(estado)).toBe('borrar');
  });
});
