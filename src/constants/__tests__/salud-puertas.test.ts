/**
 * MB-19 PIEZA 3 — SALUD por horizontes.
 *
 * La regla dura que se protege aquí: **nada se elimina**. Toda ruta que vivía
 * en los hubs de salud de antes del rediseño sigue alcanzable desde una de las
 * cuatro puertas. Si alguien reorganiza y se le cae una, este test lo dice
 * antes de que el usuario descubra que su historia clínica ya no existe.
 *
 * `npm run censo` lo verifica desde el otro lado (por el árbol de rutas real);
 * esto lo verifica por el contenido declarado.
 */
import { describe, it, expect } from 'vitest';
import {
  PUERTAS, visiblePuertas, visibleDestinos,
  DESTINOS_HOY, DESTINOS_EVOLUCION, DESTINOS_EXPEDIENTE, DESTINOS_TODOS,
  DESTINOS_POR_PUERTA,
} from '../salud-puertas';
import { hasAppIcon } from '@/src/components/ui/app-icon-names';

/**
 * Los ocho destinos del hub viejo (health-hub antes de MB-19) más lo que
 * colgaba del tab YO, que este run retira del tab bar. Ninguno puede perderse.
 */
const RUTAS_QUE_NO_SE_PUEDEN_PERDER = [
  // health-hub, los 8 destinos de Mega-Sprint B
  '/salud/diagnostico',
  '/salud/intervenciones',
  '/salud/mis-datos',
  '/salud/mis-evaluaciones',
  '/salud/mis-sintomas',
  '/salud/padecimientos',
  '/labs-guide',
  '/salud/mi-expediente',
  // lo que vivía en YO y ahora es de SALUD
  '/reports',
  '/my-chronotype',
  '/edad-atp/result-preview',
  // capturas del día y expediente profundo
  '/glucose-log',
  '/ketones-log',
  '/historia-clinica',
  '/salud/cuestionario-maestro',
  '/cycle',
];

const rutasAlcanzables = new Set<string>([
  ...PUERTAS.map((p) => String(p.route)),
  ...DESTINOS_TODOS.map((d) => String(d.route)),
]);

describe('las cuatro puertas', () => {
  it('el hub muestra hero y CUATRO puertas, más el ciclo con gate', () => {
    expect(visiblePuertas(false)).toHaveLength(4);
    expect(visiblePuertas(true)).toHaveLength(5);
  });

  it('el ciclo es la quinta y solo con el gate abierto', () => {
    expect(visiblePuertas(false).some((p) => p.key === 'ciclo')).toBe(false);
    expect(visiblePuertas(true)[4].key).toBe('ciclo');
  });

  it('los títulos son las preguntas del usuario, no los módulos', () => {
    expect(visiblePuertas(false).map((p) => p.title)).toEqual([
      'HOY EN TU CUERPO', 'MIS DATOS', 'TU EVOLUCIÓN', 'MI EXPEDIENTE',
    ]);
  });

  it('cada puerta tiene su icono en el registro', () => {
    for (const p of PUERTAS) expect(hasAppIcon(p.icon), p.key).toBe(true);
  });

  it('cero em dash en el copy que ve el usuario', () => {
    for (const p of PUERTAS) {
      expect(p.title.includes('—'), p.key).toBe(false);
      expect(p.subtitle.includes('—'), p.key).toBe(false);
    }
    for (const d of DESTINOS_TODOS) {
      expect(d.title.includes('—'), d.key).toBe(false);
      expect(d.subtitle.includes('—'), d.key).toBe(false);
    }
  });
});

describe('nada se elimina', () => {
  it.each(RUTAS_QUE_NO_SE_PUEDEN_PERDER)('%s sigue alcanzable desde SALUD', (ruta) => {
    expect(rutasAlcanzables.has(ruta)).toBe(true);
  });

  it('cada destino cuelga de una puerta que existe', () => {
    const puertasConLista = new Set(Object.keys(DESTINOS_POR_PUERTA));
    for (const k of puertasConLista) expect(PUERTAS.some((p) => p.key === k), k).toBe(true);
  });

  it('el modo denso no esconde nada que sí estuviera en las puertas', () => {
    const enPuertas = [...DESTINOS_HOY, ...DESTINOS_EVOLUCION, ...DESTINOS_EXPEDIENTE];
    for (const d of enPuertas) {
      expect(DESTINOS_TODOS.some((x) => String(x.route) === String(d.route)), d.key).toBe(true);
    }
  });

  it('el modo denso también incluye Mis Datos, que no tiene lista propia', () => {
    expect(DESTINOS_TODOS.some((d) => String(d.route) === '/salud/mis-datos')).toBe(true);
  });
});

describe('un dato = un lugar', () => {
  it('ningún destino se repite dentro de una misma puerta', () => {
    for (const [k, lista] of Object.entries(DESTINOS_POR_PUERTA)) {
      const rutas = lista.map((d) => String(d.route));
      expect(new Set(rutas).size, k).toBe(rutas.length);
    }
  });

  it('las llaves del modo denso son únicas (si no, React duplica keys)', () => {
    const keys = DESTINOS_TODOS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('gate del ciclo', () => {
  it('sin gate no aparece el ciclo en ninguna lista', () => {
    for (const lista of [DESTINOS_HOY, DESTINOS_EVOLUCION, DESTINOS_EXPEDIENTE, DESTINOS_TODOS]) {
      for (const d of visibleDestinos(lista, false)) {
        expect(String(d.route)).not.toBe('/cycle');
      }
    }
  });

  it('con gate abierto el ciclo de hoy sí aparece', () => {
    expect(visibleDestinos(DESTINOS_HOY, true).some((d) => String(d.route) === '/cycle')).toBe(true);
  });
});
