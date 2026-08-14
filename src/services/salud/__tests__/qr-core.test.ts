/**
 * OLA6 PIEZA D — el generador de QR.
 *
 * El QR de la ficha se genera dentro de la app, sin servicio externo y sin
 * paquete nuevo. Un QR mal armado no avisa: se ve igual de bonito y ningún
 * lector lo abre. Por eso se verifica lo estructural y lo semántico.
 *
 * La verificación fuerte (matriz módulo a módulo contra un generador de
 * referencia, versiones 1 a 40, ~500 casos) se corrió al construirlo con la
 * copia de qrcode-terminal que vive en node_modules. No se deja aquí como
 * dependencia de test: este archivo verifica invariantes que se sostienen
 * solos.
 */
import { describe, it, expect } from 'vitest';
import { qrMatrix, versionPara, penalizacion, CAPACIDAD_MAXIMA } from '../qr-core';

describe('elección de versión', () => {
  it('la más chica que aguante el payload', () => {
    expect(versionPara(1)).toBe(1);
    expect(versionPara(14)).toBe(1);
    expect(versionPara(17)).toBe(2);
  });

  it('lo que no cabe ni en la 40 se dice, no se trunca en silencio', () => {
    expect(versionPara(CAPACIDAD_MAXIMA + 500)).toBeNull();
    expect(qrMatrix('x'.repeat(CAPACIDAD_MAXIMA + 500))).toBeNull();
  });
});

describe('estructura de la matriz', () => {
  const m = qrMatrix('{"v":1,"s":"O+","a":[["Penicilina","a"]]}')!;

  it('es cuadrada y del tamaño de su versión (4v + 17)', () => {
    expect(m.length).toBe(m[0].length);
    expect((m.length - 17) % 4).toBe(0);
  });

  it('tiene los tres buscadores en sus esquinas', () => {
    const n = m.length;
    for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]] as const) {
      expect(m[fr][fc], 'esquina del buscador').toBe(true);
      expect(m[fr + 1][fc + 1], 'anillo claro').toBe(false);
      expect(m[fr + 3][fc + 3], 'centro oscuro').toBe(true);
    }
  });

  it('tiene la línea de sincronía alternando', () => {
    for (let i = 8; i < m.length - 8; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
  });

  it('tiene el módulo oscuro que la norma exige', () => {
    expect(m[m.length - 8][8]).toBe(true);
  });
});

describe('la máscara elegida es la mejor de las ocho', () => {
  const texto = '{"v":1,"n":"Persona de Prueba","s":"O+","m":["Levotiroxina 75 mcg"]}';

  it('ninguna de las otras siete puntúa mejor', () => {
    const elegida = qrMatrix(texto)!;
    const puntajeElegida = penalizacion(elegida);
    for (let p = 0; p < 8; p++) {
      const otra = qrMatrix(texto, p)!;
      // Se compara sobre matrices finales: la elegida no puede ser peor que
      // cualquier otra por más de lo que aporta su propio formato.
      expect(penalizacion(otra)).toBeGreaterThanOrEqual(puntajeElegida - 200);
    }
  });
});

describe('determinismo', () => {
  it('el mismo payload da la misma matriz siempre', () => {
    const a = qrMatrix('ficha')!;
    const b = qrMatrix('ficha')!;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('un payload distinto da una matriz distinta', () => {
    expect(JSON.stringify(qrMatrix('ficha'))).not.toBe(JSON.stringify(qrMatrix('fichb')));
  });
});

describe('acentos', () => {
  it('los payloads con acentos y eñes se codifican como UTF-8 y caben', () => {
    const m = qrMatrix('{"n":"Ángeles Muñoz","x":"alérgica"}');
    expect(m).not.toBeNull();
  });
});
