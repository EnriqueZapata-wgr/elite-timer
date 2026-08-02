/**
 * MB-19 PIEZA 1 — el registro de apps es la fuente única de la sala ATP.
 *
 * Lo que se protege aquí es la propiedad que hace barato el cambio de iconos:
 * cada app declara un nombre de icono, y ese nombre existe en el mapa. Si
 * alguien agrega una app y olvida el icono, se entera aquí y no en el device.
 */
import { describe, it, expect } from 'vitest';
import {
  APP_REGISTRY, APP_BY_KEY, SECTION_ORDER, SECTION_LABELS,
  visibleApps, searchApps, normalizeForSearch,
} from '../app-registry';
import { hasAppIcon, APP_ICON_NAMES } from '@/src/components/ui/app-icon-names';

describe('APP_REGISTRY', () => {
  it('las llaves son únicas', () => {
    const keys = APP_REGISTRY.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('toda app tiene ruta, etiqueta e icono', () => {
    for (const a of APP_REGISTRY) {
      expect(a.label.length, a.key).toBeGreaterThan(0);
      expect(a.icon.length, a.key).toBeGreaterThan(0);
      expect(String(a.route).startsWith('/'), a.key).toBe(true);
    }
  });

  it('toda sección declarada existe en el orden de render', () => {
    for (const a of APP_REGISTRY) {
      expect(SECTION_ORDER, a.key).toContain(a.section);
    }
    for (const s of SECTION_ORDER) expect(SECTION_LABELS[s]).toBeTruthy();
  });

  it('ninguna sección queda vacía', () => {
    for (const s of SECTION_ORDER) {
      expect(APP_REGISTRY.filter((a) => a.section === s).length, s).toBeGreaterThan(0);
    }
  });

  it('las etiquetas caben bajo un icono (cuadrícula de 4 columnas)', () => {
    for (const a of APP_REGISTRY) {
      expect(a.label.length, `${a.key} = "${a.label}"`).toBeLessThanOrEqual(12);
    }
  });

  it('cero em dash en el copy que ve el usuario', () => {
    for (const a of APP_REGISTRY) {
      expect(a.label.includes('—'), a.key).toBe(false);
      expect(a.label.includes('–'), a.key).toBe(false);
    }
  });

  it('APP_BY_KEY indexa todo el registro', () => {
    expect(Object.keys(APP_BY_KEY)).toHaveLength(APP_REGISTRY.length);
  });

  it('el ciclo es la única app con gate de sexo', () => {
    const gated = APP_REGISTRY.filter((a) => a.femaleOnly).map((a) => a.key);
    expect(gated).toEqual(['ciclo']);
  });
});

/**
 * El audit de MB-19 encontró que al absorber /habits-portal se cubrieron OCHO
 * de sus NUEVE cards. La que faltó, el hub del pilar Mente, dejó 495 líneas
 * inalcanzables (el hub y su pantalla de rachas y medallas).
 *
 * Estas son las nueve, copiadas del archivo que se borró (commit c4fe260).
 * No es una lista decorativa: es la deuda que se pagó, escrita para que si
 * alguien vuelve a tocar el registro se entere de qué tiene que seguir ahí.
 */
describe('las nueve cards de habits-portal', () => {
  const NUEVE = [
    { card: 'NUTRICIÓN', route: '/nutrition' },
    { card: 'SUPLEMENTACIÓN', route: '/supplements' },
    { card: 'FITNESS', route: '/fitness-hub' },
    { card: 'AYUNO', route: '/fasting' },
    { card: 'SUEÑO', route: '/sleep' },
    // 19.1: el hub /mente se retiró (sus seis cuartos ya son apps de la sala).
    // La deuda de esta card era lo que SOLO vivía tras el hub: las rachas y
    // medallas de /mente/progreso. Eso es lo que tiene que seguir teniendo
    // puerta, y hoy la tiene como la app Rachas.
    { card: 'MENTE', route: '/mente/progreso' },
    { card: 'CICLO', route: '/cycle' },
    { card: 'HIDRATACIÓN', route: '/hydration' },
    { card: 'ATP SOL', route: '/solar' },
  ];

  it('son nueve, no ocho', () => {
    expect(NUEVE).toHaveLength(9);
  });

  it.each(NUEVE)('$card sigue teniendo su app en el registro', ({ route }) => {
    expect(APP_REGISTRY.some((a) => String(a.route) === route)).toBe(true);
  });
});

describe('cobertura de iconos', () => {
  it('toda app del registro tiene dibujo (si no, sale un signo de interrogación en el device)', () => {
    for (const a of APP_REGISTRY) {
      expect(hasAppIcon(a.icon), `falta el icono "${a.icon}" de ${a.key}`).toBe(true);
    }
  });

  it('el mapa no arrastra iconos de apps que ya no existen', () => {
    const usados = new Set<string>(APP_REGISTRY.map((a) => a.icon));
    // Las puertas de SALUD comparten el mapa sin ser apps de la sala.
    const puertasSalud = APP_ICON_NAMES.filter((k) => k.startsWith('salud-'));
    for (const p of puertasSalud) usados.add(p);
    const huerfanos = APP_ICON_NAMES.filter((k) => !usados.has(k));
    expect(huerfanos).toEqual([]);
  });
});

describe('visibleApps', () => {
  it('esconde el ciclo cuando el gate está cerrado', () => {
    expect(visibleApps(false).some((a) => a.key === 'ciclo')).toBe(false);
    expect(visibleApps(true).some((a) => a.key === 'ciclo')).toBe(true);
  });

  it('no toca ninguna otra app', () => {
    expect(visibleApps(true).length - visibleApps(false).length).toBe(1);
  });
});

describe('searchApps', () => {
  const all = APP_REGISTRY;

  it('con la caja vacía devuelve todo', () => {
    expect(searchApps(all, '')).toHaveLength(all.length);
    expect(searchApps(all, '   ')).toHaveLength(all.length);
  });

  it('encuentra cualquier app en dos letras (punto 5 de la verificación)', () => {
    for (const a of all) {
      const dos = normalizeForSearch(a.label).slice(0, 2);
      const hits = searchApps(all, dos).map((x) => x.key);
      expect(hits, `"${dos}" deberia encontrar ${a.key}`).toContain(a.key);
    }
  });

  it('ignora acentos y mayúsculas', () => {
    expect(searchApps(all, 'HIDRATACION').map((a) => a.key)).toContain('hidratacion');
    expect(searchApps(all, 'sueño').map((a) => a.key)).toContain('sueno');
    expect(searchApps(all, 'nutricion').map((a) => a.key)).toContain('comida');
  });

  it('busca por como lo dice el usuario, no por como lo llamamos', () => {
    expect(searchApps(all, 'agua').map((a) => a.key)).toContain('hidratacion');
    expect(searchApps(all, 'gym').map((a) => a.key)).toContain('entrenar');
    expect(searchApps(all, 'regla').map((a) => a.key)).toContain('ciclo');
    expect(searchApps(all, 'pastillas').map((a) => a.key)).toContain('suplementos');
  });

  it('sin resultados devuelve lista vacía, no todo', () => {
    expect(searchApps(all, 'zzzzz')).toHaveLength(0);
  });
});
