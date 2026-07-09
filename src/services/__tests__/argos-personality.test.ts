import { describe, it, expect } from 'vitest';
import {
  bucketTimeOfDay,
  getMexicoCityHour,
  getTimeOfDay,
  greetingSlot,
  pickVariant,
  VoiceRotator,
  formatVoiceLine,
  buildGreeting,
  buildPersonalityInjection,
  buildTimeContextInjection,
  ARGOS_VOICE,
  type TimeOfDay,
} from '@/src/services/argos-personality';

describe('bucketTimeOfDay — franjas horarias (spec T5)', () => {
  const cases: Array<[number, TimeOfDay]> = [
    [0, 'late_night'],
    [3, 'late_night'],
    [4, 'early_morning'],
    [6, 'early_morning'],
    [7, 'morning'],
    [10, 'morning'],
    [11, 'noon'],
    [13, 'noon'],
    [14, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [19, 'evening'],
    [20, 'night'],
    [22, 'night'],
    [23, 'late_night'],
  ];
  it.each(cases)('hora %i → %s', (hour, expected) => {
    expect(bucketTimeOfDay(hour)).toBe(expected);
  });

  it('cubre las 24 horas sin hueco', () => {
    for (let h = 0; h < 24; h++) {
      expect(bucketTimeOfDay(h)).toBeTruthy();
    }
  });
});

describe('getMexicoCityHour — zona América/Ciudad de México (UTC-6 fijo)', () => {
  it('18:00 UTC → 12:00 CDMX (mediodía)', () => {
    expect(getMexicoCityHour(new Date('2026-07-08T18:00:00Z'))).toBe(12);
  });
  it('05:00 UTC → 23:00 CDMX del día anterior', () => {
    expect(getMexicoCityHour(new Date('2026-07-08T05:00:00Z'))).toBe(23);
  });
  it('06:00 UTC → 00:00 CDMX (medianoche = 0, no 24)', () => {
    expect(getMexicoCityHour(new Date('2026-07-08T06:00:00Z'))).toBe(0);
  });
});

describe('getTimeOfDay — integra hora CDMX + bucket', () => {
  it('18:00 UTC (12:00 CDMX) → noon', () => {
    expect(getTimeOfDay(new Date('2026-07-08T18:00:00Z'))).toBe('noon');
  });
  it('13:00 UTC (07:00 CDMX) → morning', () => {
    expect(getTimeOfDay(new Date('2026-07-08T13:00:00Z'))).toBe('morning');
  });
});

describe('greetingSlot — colapsa 7 franjas en 4 saludos', () => {
  it('early_morning y morning → morning', () => {
    expect(greetingSlot('early_morning')).toBe('morning');
    expect(greetingSlot('morning')).toBe('morning');
  });
  it('noon y afternoon → afternoon', () => {
    expect(greetingSlot('noon')).toBe('afternoon');
    expect(greetingSlot('afternoon')).toBe('afternoon');
  });
  it('night y late_night → night', () => {
    expect(greetingSlot('night')).toBe('night');
    expect(greetingSlot('late_night')).toBe('night');
  });
});

describe('pickVariant — evita frases recientes', () => {
  it('devuelve una frase del pool', () => {
    const pool = ['a', 'b', 'c'];
    expect(pool).toContain(pickVariant(pool));
  });
  it('nunca elige una frase que esté en recent (si hay alternativas)', () => {
    const pool = ['a', 'b', 'c', 'd'];
    const recent = ['a', 'b'];
    for (let i = 0; i < 20; i++) {
      const r = i / 20;
      const choice = pickVariant(pool, recent, () => r);
      expect(recent).not.toContain(choice);
    }
  });
  it('si todas están recientes, cae al pool completo (no crashea)', () => {
    const pool = ['a', 'b'];
    const choice = pickVariant(pool, ['a', 'b'], () => 0.5);
    expect(pool).toContain(choice);
  });
  it('pool vacío → string vacío', () => {
    expect(pickVariant([])).toBe('');
  });
});

describe('VoiceRotator — no repite las últimas 3', () => {
  it('en 4 picks consecutivos, cada uno evita los 3 previos', () => {
    const rotator = new VoiceRotator(3);
    const pool = ['1', '2', '3', '4', '5'];
    let r = 0;
    const picks: string[] = [];
    for (let i = 0; i < 8; i++) {
      r = (r + 0.37) % 1; // secuencia pseudo-variada determinista
      picks.push(rotator.pick('encouragement', pool, () => r));
    }
    for (let i = 3; i < picks.length; i++) {
      const last3 = picks.slice(i - 3, i);
      expect(last3).not.toContain(picks[i]);
    }
  });
  it('mantiene a lo más keepLast frases en memoria', () => {
    const rotator = new VoiceRotator(3);
    const pool = ['1', '2', '3', '4', '5'];
    for (let i = 0; i < 10; i++) rotator.pick('c', pool, () => (i * 0.19) % 1);
    expect(rotator.getRecent('c').length).toBeLessThanOrEqual(3);
  });
});

describe('formatVoiceLine — sustituye {nombre} y limpia vocativos huérfanos', () => {
  it('sustituye el nombre', () => {
    expect(formatVoiceLine('Buenos días, {nombre}. Vamos.', { nombre: 'Enrique' })).toBe(
      'Buenos días, Enrique. Vamos.',
    );
  });
  it('sin nombre: no deja coma huérfana', () => {
    expect(formatVoiceLine('Buenos días, {nombre}. Vamos.', {})).toBe('Buenos días. Vamos.');
  });
  it('sin nombre en pregunta: no deja coma antes de ?', () => {
    expect(formatVoiceLine('{nombre}, ¿cómo amaneciste?', {})).toBe('¿cómo amaneciste?');
  });
  it('nombre con espacios se recorta', () => {
    expect(formatVoiceLine('Hola {nombre}.', { nombre: '  Ana  ' })).toBe('Hola Ana.');
  });
});

describe('buildGreeting — saludo por hora + nombre', () => {
  it('mediodía CDMX usa el pool de afternoon', () => {
    const noon = new Date('2026-07-08T18:00:00Z'); // 12:00 CDMX → afternoon slot
    const g = buildGreeting('Enrique', noon);
    expect(g).toContain('Enrique');
    expect(g.length).toBeGreaterThan(0);
  });
  it('sin nombre no deja coma huérfana', () => {
    const g = buildGreeting(undefined, new Date('2026-07-08T18:00:00Z'));
    expect(g).not.toMatch(/,\s*\./);
    expect(g).not.toMatch(/,\s*$/);
  });
});

describe('ARGOS_VOICE — integridad del contenido', () => {
  it('cada slot de greeting tiene al menos 3 variantes (para no repetir)', () => {
    (['morning', 'afternoon', 'evening', 'night'] as const).forEach((slot) => {
      expect(ARGOS_VOICE.greeting[slot].length).toBeGreaterThanOrEqual(3);
    });
  });
  it('encouragement/concern/celebration no están vacíos', () => {
    expect(ARGOS_VOICE.encouragement.length).toBeGreaterThan(0);
    expect(ARGOS_VOICE.concern.length).toBeGreaterThan(0);
    expect(ARGOS_VOICE.celebration.length).toBeGreaterThan(0);
  });
});

describe('buildPersonalityInjection — sufijo de presencia para el LLM', () => {
  it('incluye el nombre cuando se pasa', () => {
    const s = buildPersonalityInjection({ nombre: 'Enrique' });
    expect(s).toContain('Enrique');
    expect(s).toContain('PRESENCIA');
  });
  it('sin nombre no menciona "se llama"', () => {
    const s = buildPersonalityInjection({});
    expect(s).not.toContain('se llama');
    expect(s).toContain('PRESENCIA');
  });
  it('no incluye contexto temporal (esa capa es de T5)', () => {
    const s = buildPersonalityInjection({ nombre: 'Enrique' });
    expect(s).not.toContain('CONTEXTO TEMPORAL');
  });
});

describe('buildTimeContextInjection — capa temporal T5', () => {
  it('etiqueta la capa y menciona Ciudad de México', () => {
    const s = buildTimeContextInjection(new Date('2026-07-08T18:00:00Z'));
    expect(s).toContain('CONTEXTO TEMPORAL');
    expect(s).toContain('Ciudad de México');
  });
  it('de noche (22:00 CDMX) evita sugerir cardio/cafeína', () => {
    // 04:00 UTC → 22:00 CDMX → night
    const s = buildTimeContextInjection(new Date('2026-07-08T04:00:00Z'));
    expect(s.toLowerCase()).toMatch(/cardio|cafeína|descanso/);
  });
  it('de mañana (08:00 CDMX) habilita entrenar fuerte', () => {
    // 14:00 UTC → 08:00 CDMX → morning
    const s = buildTimeContextInjection(new Date('2026-07-08T14:00:00Z'));
    expect(s.toLowerCase()).toContain('mañana');
  });
});
