import { describe, it, expect } from 'vitest';
import { seededIndex, categoryToFolder, sexKey, cronotipoKey, tuDiaImageGroup, agendaCategoryToFolder, interventionImageKey } from '@/src/utils/image-pick-core';

/**
 * #asset-swap — lógica pura de selección de imágenes. (Los pickers con require('.png') no se
 * pueden importar en vitest; aquí validamos su núcleo: hashing determinístico + mapeos.)
 */
describe('seededIndex', () => {
  it('misma seed → mismo índice (determinístico, no salta)', () => {
    expect(seededIndex('u1-evt-2026-06-24', 4)).toBe(seededIndex('u1-evt-2026-06-24', 4));
  });
  it('índice siempre en rango [0, length)', () => {
    for (const s of ['a', 'bb', 'ccc', 'usuario-123-cardio']) {
      const i = seededIndex(s, 3);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(3);
    }
  });
  it('sin seed → 0; length 0 → 0', () => {
    expect(seededIndex(undefined, 4)).toBe(0);
    expect(seededIndex('x', 0)).toBe(0);
  });
  it('seeds distintas pueden dar índices distintos', () => {
    // 'a'(97) vs 'b'(98) en length 4 → 97%4=1, 98%4=2
    expect(seededIndex('a', 4)).toBe(1);
    expect(seededIndex('b', 4)).toBe(2);
  });
});

describe('categoryToFolder', () => {
  it('mapea categorías base', () => {
    expect(categoryToFolder('meal', 'Comida', 13)).toBe('comida');
    expect(categoryToFolder('exercise', 'Fuerza', 10)).toBe('entrenar');
    expect(categoryToFolder('exercise', 'Cardio Z2', 10)).toBe('cardio');
    expect(categoryToFolder('supplement', 'Stack AM', 8)).toBe('suplementos');
    expect(categoryToFolder('mind', 'Meditación', 9)).toBe('meditacion');
    expect(categoryToFolder('recovery', 'Dormir', 22)).toBe('sleep');
  });
  it('rhythm: sol AM vs PM según hora', () => {
    expect(categoryToFolder('rhythm', 'Luz solar', 8)).toBe('sol-am');
    expect(categoryToFolder('rhythm', 'Sol de la tarde', 17)).toBe('sol-pm');
  });
  it('rhythm: despertar / hidratación / off-pantallas / otros', () => {
    expect(categoryToFolder('rhythm', 'Despertar', 6)).toBe('despertar');
    expect(categoryToFolder('rhythm', 'Hidratación', 12)).toBe('hidratacion');
    expect(categoryToFolder('rhythm', 'Off pantallas', 21)).toBe('off-pantallas');
    expect(categoryToFolder('rhythm', 'Algo raro', 12)).toBe('otros');
  });
  it('categoría desconocida → otros', () => {
    expect(categoryToFolder('weird', 'X', 12)).toBe('otros');
  });
});

describe('tuDiaImageGroup', () => {
  it('mapea las 4 franjas por hora', () => {
    expect(tuDiaImageGroup(6)).toBe('despertar');   // 5–12
    expect(tuDiaImageGroup(11)).toBe('despertar');
    expect(tuDiaImageGroup(12)).toBe('medio-dia');  // 12–18
    expect(tuDiaImageGroup(17)).toBe('medio-dia');
    expect(tuDiaImageGroup(18)).toBe('atardecer');  // 18–22
    expect(tuDiaImageGroup(21)).toBe('atardecer');
    expect(tuDiaImageGroup(22)).toBe('noche');      // 22–5
    expect(tuDiaImageGroup(3)).toBe('noche');
    expect(tuDiaImageGroup(5)).toBe('despertar');   // borde inferior
  });
});

describe('agendaCategoryToFolder', () => {
  it('mapea categorías/nombres de agenda a carpetas de imágenes', () => {
    expect(agendaCategoryToFolder('ritmo', 'Despertar')).toBe('despertar');
    expect(agendaCategoryToFolder('sueño', 'Dormir')).toBe('sleep');
    expect(agendaCategoryToFolder('fitness', 'Entreno de fuerza')).toBe('entrenar');
    expect(agendaCategoryToFolder('cardio', 'Correr Z2')).toBe('cardio');
    expect(agendaCategoryToFolder('nutricion', 'Desayuno')).toBe('comida');
    expect(agendaCategoryToFolder('suplementos', 'Stack AM')).toBe('suplementos');
    expect(agendaCategoryToFolder('mente', 'Meditación')).toBe('meditacion');
    expect(agendaCategoryToFolder('hidratacion', 'Agua')).toBe('hidratacion');
    expect(agendaCategoryToFolder('ritmo', 'Luz solar')).toBe('sol-am');
    expect(agendaCategoryToFolder('custom', 'Algo raro')).toBe('otros');
  });
});

describe('sexKey', () => {
  it('female → female; resto → male', () => {
    expect(sexKey('female')).toBe('female');
    expect(sexKey('male')).toBe('male');
    expect(sexKey(undefined)).toBe('male');
    expect(sexKey('intersex')).toBe('male');
  });
});

describe('cronotipoKey', () => {
  it('acepta inglés (modelo) y español → clave ES', () => {
    expect(cronotipoKey('lion')).toBe('leon');
    expect(cronotipoKey('wolf')).toBe('lobo');
    expect(cronotipoKey('bear')).toBe('oso');
    expect(cronotipoKey('dolphin')).toBe('delfin');
    expect(cronotipoKey('LEON')).toBe('leon');
  });
  it('desconocido / vacío → leon (fallback)', () => {
    expect(cronotipoKey(undefined)).toBe('leon');
    expect(cronotipoKey('xyz')).toBe('leon');
  });
});

// ── Mega-Sprint C (#132): mapeo intervención → imagen ────────────────────────
describe('interventionImageKey (fix #132)', () => {
  it('family gana: grounding→grounding, ducha_fria/wim_hof/bano_frio→frio, sauna→calor', () => {
    expect(interventionImageKey({ family: 'grounding', key: 'grounding_earthing' })).toBe('grounding');
    expect(interventionImageKey({ family: 'ducha_fria', key: 'ducha_fria_nivel1' })).toBe('frio');
    expect(interventionImageKey({ family: 'wim_hof', key: 'wim_hof_basico' })).toBe('frio');
    expect(interventionImageKey({ family: 'bano_frio', key: 'cold_plunge_cns' })).toBe('frio');
    expect(interventionImageKey({ family: 'sauna', key: 'sauna_finlandesa' })).toBe('calor');
  });

  it('respiración: box_breathing/apnea_tables/respiracion_nocturna → respiracion', () => {
    expect(interventionImageKey({ family: 'box_breathing', key: 'box_breathing_4444' })).toBe('respiracion');
    expect(interventionImageKey({ family: 'apnea_tables', key: 'tabla_co2' })).toBe('respiracion');
    expect(interventionImageKey({ family: 'respiracion_nocturna', key: 'respiracion_478' })).toBe('respiracion');
  });

  it('oral: oil_pulling→oral; lentes_azul→lentes; panel_luz_roja→luz-roja; binaurales/nsdr→audio; journal→mente', () => {
    expect(interventionImageKey({ family: 'oil_pulling', key: 'oil_pulling_coco' })).toBe('oral');
    expect(interventionImageKey({ family: 'lentes_azul', key: 'lentes_rojos' })).toBe('lentes');
    expect(interventionImageKey({ family: 'panel_luz_roja', key: 'panel_rojo_cara' })).toBe('luz-roja');
    expect(interventionImageKey({ family: 'binaurales', key: 'binaurales_delta' })).toBe('audio');
    expect(interventionImageKey({ family: 'nsdr_yoga_nidra', key: 'nsdr_10min' })).toBe('audio');
    expect(interventionImageKey({ family: 'journal', key: 'journal_am' })).toBe('mente');
  });

  it('sin family: patrón por key (luz_roja_ojos, n_back, green_time, omt_masticatorios, coherencia)', () => {
    expect(interventionImageKey({ key: 'luz_roja_ojos' })).toBe('luz-roja');
    expect(interventionImageKey({ key: 'n_back_challenge' })).toBe('cognitivo');
    expect(interventionImageKey({ key: 'green_time_30min' })).toBe('naturaleza');
    expect(interventionImageKey({ key: 'omt_masticatorios' })).toBe('oral');
    expect(interventionImageKey({ key: 'coherencia_cardiaca_5_5' })).toBe('respiracion');
    expect(interventionImageKey({ key: 'dive_reflex_cara_hielo' })).toBe('frio');
  });

  it('sin match → undefined (cae limpio al sistema de carpetas)', () => {
    expect(interventionImageKey({ key: 'hidratacion_matutina' })).toBeUndefined();
    expect(interventionImageKey({ key: 'exposicion_solar_matutina' })).toBeUndefined();
    expect(interventionImageKey({ family: 'ayuno', key: 'ayuno_16_8' })).toBeUndefined();
  });
});
