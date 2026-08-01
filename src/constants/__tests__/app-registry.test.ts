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
import { hasAppIcon, ICON_MAP } from '@/src/components/ui/app-icon-map';

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

describe('cobertura de iconos', () => {
  it('toda app del registro tiene dibujo (si no, sale un signo de interrogación en el device)', () => {
    for (const a of APP_REGISTRY) {
      expect(hasAppIcon(a.icon), `falta el icono "${a.icon}" de ${a.key}`).toBe(true);
    }
  });

  it('el mapa no arrastra iconos de apps que ya no existen', () => {
    const usados = new Set<string>(APP_REGISTRY.map((a) => a.icon));
    // Las puertas de SALUD comparten el mapa sin ser apps de la sala.
    const puertasSalud = Object.keys(ICON_MAP).filter((k) => k.startsWith('salud-'));
    for (const p of puertasSalud) usados.add(p);
    const huerfanos = Object.keys(ICON_MAP).filter((k) => !usados.has(k));
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
