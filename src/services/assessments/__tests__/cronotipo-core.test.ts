/**
 * CRONOTIPO · el árbol de decisión.
 *
 * Lo que se fija aquí no es "que compile": es que el cronotipo deje de salir de
 * un volado, que quien contestó claro siga saliendo igual que ayer, y que un
 * Delfín NUNCA se comunique sin su cronotipo madre.
 */
import { describe, it, expect } from 'vitest';
import {
  parEnDisputa,
  aplicarDesempate,
  desempateCompleto,
  resolverCronotipo,
  bancoDesempate,
  codigosDesempate,
  UMBRAL_DISPUTA,
} from '../cronotipo-core';

/** Scores del banco base. Lo que no se nombra va en 0. */
const s = (x: Partial<Record<'lion' | 'bear' | 'wolf' | 'dolphin', number>>) => ({
  lion: 0, bear: 0, wolf: 0, dolphin: 0, ...x,
});

/** Contesta la rama completa de un par eligiendo la misma opción en las tres. */
const responder = (par: 'lion_bear' | 'bear_wolf', opcion: string) =>
  Object.fromEntries(bancoDesempate(par).map((q) => [q.id, opcion]));

describe('parEnDisputa · cuándo NO cierra el quiz', () => {
  it('un ganador claro no abre la rama', () => {
    expect(parEnDisputa(s({ lion: 22, bear: 10, wolf: 3 }))).toBeNull();
  });

  it('León y Oso pegados abren la rama de ese par', () => {
    expect(parEnDisputa(s({ lion: 18, bear: 17, wolf: 4 }))).toBe('lion_bear');
  });

  it('Oso y Lobo pegados abren la rama de ese par', () => {
    expect(parEnDisputa(s({ bear: 15, wolf: 16, lion: 5 }))).toBe('bear_wolf');
  });

  it('el umbral es inclusivo: justo en el borde SÍ se rama', () => {
    expect(parEnDisputa(s({ lion: 18, bear: 18 - UMBRAL_DISPUTA, wolf: 2 }))).toBe('lion_bear');
    // Un punto más de ventaja y ya está decidido.
    expect(parEnDisputa(s({ lion: 18, bear: 18 - UMBRAL_DISPUTA - 1, wolf: 2 }))).toBeNull();
  });

  it('León y Lobo pegados NO se raman: son polos, no un par en disputa', () => {
    // Tres preguntas más no arreglan un patrón de respuestas contradictorio.
    expect(parEnDisputa(s({ lion: 14, wolf: 14, bear: 3 }))).toBeNull();
  });

  it('el Delfín no entra en la cuenta de fases', () => {
    // Antes, un Delfín alto se comía un empate León/Oso que sí tenía arreglo.
    expect(parEnDisputa(s({ dolphin: 30, lion: 12, bear: 11, wolf: 2 }))).toBe('lion_bear');
  });

  it('es determinista con un empate exacto', () => {
    expect(parEnDisputa(s({ lion: 12, bear: 12, wolf: 1 }))).toBe('lion_bear');
    expect(parEnDisputa(s({ lion: 12, bear: 12, wolf: 1 }))).toBe('lion_bear');
  });
});

describe('aplicarDesempate · la rama solo mueve a los dos en disputa', () => {
  it('suma los puntos de la opción elegida sin mutar la entrada', () => {
    const base = s({ lion: 10, bear: 10 });
    const out = aplicarDesempate(base, 'lion_bear', responder('lion_bear', 'a'));
    expect(out.lion).toBeGreaterThan(out.bear);
    expect(base.lion).toBe(10); // la entrada no se tocó
  });

  it('la opción de Oso le da el empate al Oso', () => {
    const out = aplicarDesempate(s({ lion: 10, bear: 10 }), 'lion_bear', responder('lion_bear', 'b'));
    expect(out.bear).toBeGreaterThan(out.lion);
  });

  it('ignora respuestas de la OTRA rama (borrador viejo)', () => {
    const out = aplicarDesempate(s({ lion: 10, bear: 10 }), 'lion_bear', responder('bear_wolf', 'b'));
    expect(out).toEqual(s({ lion: 10, bear: 10 }));
  });

  it('ignora un código inventado y una opción que no existe', () => {
    const out = aplicarDesempate(s({ lion: 10, bear: 10 }), 'lion_bear', {
      no_existe: 'a',
      desempate_lion_bear_1: 'zzz',
    });
    expect(out).toEqual(s({ lion: 10, bear: 10 }));
  });

  it('los códigos de las dos ramas son únicos entre sí', () => {
    const codigos = codigosDesempate();
    expect(new Set(codigos).size).toBe(codigos.length);
  });
});

describe('desempateCompleto', () => {
  it('con la rama entera contestada, cierra', () => {
    expect(desempateCompleto('bear_wolf', responder('bear_wolf', 'a'))).toBe(true);
  });

  it('faltando una, no cierra', () => {
    const parcial = responder('bear_wolf', 'a');
    delete parcial[bancoDesempate('bear_wolf')[2].id];
    expect(desempateCompleto('bear_wolf', parcial)).toBe(false);
  });
});

describe('resolverCronotipo · el árbol completo', () => {
  it('un ganador claro cierra sin rama y sale igual que siempre', () => {
    const r = resolverCronotipo(s({ wolf: 24, bear: 8, lion: 2 }));
    expect(r.cronotipo).toBe('wolf');
    expect(r.requiereDesempate).toBe(false);
    expect(r.par).toBeNull();
    expect(r.esEstadoTemporal).toBe(false);
  });

  it('un empate pide la rama en vez de cerrar de volado', () => {
    const r = resolverCronotipo(s({ lion: 16, bear: 15, wolf: 3 }));
    expect(r.requiereDesempate).toBe(true);
    expect(r.par).toBe('lion_bear');
  });

  it('con la rama contestada hacia León, gana León aunque el Oso iba arriba', () => {
    // Este es el caso que antes resolvía la lista de preferencia: bear ganaba
    // por estar primero en el orden, sin haberle preguntado nada a la persona.
    const base = s({ lion: 15, bear: 16, wolf: 3 });
    expect(resolverCronotipo(base).requiereDesempate).toBe(true);
    const r = resolverCronotipo(base, responder('lion_bear', 'a'));
    expect(r.cronotipo).toBe('lion');
    expect(r.requiereDesempate).toBe(false);
    expect(r.par).toBe('lion_bear');
  });

  it('con la rama contestada hacia Oso, gana Oso aunque el León iba arriba', () => {
    const r = resolverCronotipo(s({ lion: 16, bear: 15, wolf: 3 }), responder('lion_bear', 'b'));
    expect(r.cronotipo).toBe('bear');
  });

  it('la rama Oso/Lobo desempata en las dos direcciones', () => {
    const base = s({ bear: 15, wolf: 15, lion: 4 });
    expect(resolverCronotipo(base, responder('bear_wolf', 'a')).cronotipo).toBe('bear');
    expect(resolverCronotipo(base, responder('bear_wolf', 'b')).cronotipo).toBe('wolf');
  });
});

describe('DOCTRINA · el Delfín es un estado, no una identidad', () => {
  it('un Delfín SIEMPRE trae su cronotipo madre', () => {
    const r = resolverCronotipo(s({ dolphin: 24, wolf: 14, bear: 6, lion: 2 }));
    expect(r.cronotipo).toBe('dolphin');
    expect(r.esEstadoTemporal).toBe(true);
    expect(r.madre).toBe('wolf');
  });

  it('el madre nunca es Delfín: se resuelve entre las tres fases', () => {
    const r = resolverCronotipo(s({ dolphin: 30, lion: 9, bear: 8, wolf: 1 }));
    expect(r.madre).toBe('lion');
    expect(r.madre).not.toBe('dolphin');
  });

  it('sin señal de fase, el madre cae en Oso (el fallback doctrinal de siempre)', () => {
    const r = resolverCronotipo(s({ dolphin: 20 }));
    expect(r.cronotipo).toBe('dolphin');
    expect(r.madre).toBe('bear');
  });

  it('el estado gana antes que la fase: no se rama cuando domina el Delfín', () => {
    const r = resolverCronotipo(s({ dolphin: 25, lion: 12, bear: 11, wolf: 2 }));
    expect(r.cronotipo).toBe('dolphin');
    expect(r.requiereDesempate).toBe(false);
  });

  it('quien NO es Delfín tiene de madre a sí mismo', () => {
    for (const animal of ['lion', 'bear', 'wolf'] as const) {
      const r = resolverCronotipo(s({ [animal]: 25 }));
      expect(r.cronotipo).toBe(animal);
      expect(r.madre).toBe(animal);
      expect(r.esEstadoTemporal).toBe(false);
    }
  });
});

describe('NO ROMPER · quien contestó claro sale igual que antes del árbol', () => {
  // La regla vieja: gana el mayor, empates por el orden bear > lion > wolf > dolphin.
  const reglaVieja = (sc: Record<string, number>) => {
    let best = 'bear';
    let bestValue = -Infinity;
    for (const a of ['bear', 'lion', 'wolf', 'dolphin']) {
      if ((sc[a] ?? 0) > bestValue) { bestValue = sc[a] ?? 0; best = a; }
    }
    return best;
  };

  const claros = [
    s({ lion: 24, bear: 9, wolf: 1, dolphin: 4 }),
    s({ bear: 26, lion: 8, wolf: 6, dolphin: 3 }),
    s({ wolf: 27, bear: 7, lion: 0, dolphin: 5 }),
    s({ dolphin: 22, bear: 12, lion: 5, wolf: 8 }),
    s({ lion: 20, wolf: 19, bear: 4 }), // polos pegados: cae al orden viejo
  ];

  it.each(claros)('mismo resultado que la regla vieja: %j', (sc) => {
    const r = resolverCronotipo(sc);
    expect(r.requiereDesempate).toBe(false);
    expect(r.cronotipo).toBe(reglaVieja(sc));
  });
});
