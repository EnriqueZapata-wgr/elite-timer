/**
 * Shim mínimo de la API de vitest para el runner de emergencia.
 * Ver scripts/run-tests-sin-vitest.js para el porqué.
 *
 * Cubre solo lo que usan los tests de este repo. Si un matcher falta, revienta
 * con nombre y todo: mejor un error ruidoso que un test que pasa por omisión.
 */
let pasados = 0;
const fallas = [];
const pila = [];

function describe(nombre, fn) {
  pila.push(nombre);
  hooks.push({ antes: [], despues: [] });
  try { fn(); } finally { pila.pop(); hooks.pop(); }
}

const pendientes = [];
// Hooks de verdad (2026-09-21). Antes beforeEach corría una sola vez al
// registrarse y afterEach era un no-op: un test que deja un setInterval vivo
// (RoutineEngine.play) colgaba el proceso, y el estado que un beforeEach
// reinicia se filtraba entre tests. Cada hook queda ligado al describe donde
// se declaró y corre para los `it` de ese describe y sus hijos.
const hooks = []; // paralelo a `pila`: [{ antes: [], despues: [] }, ...]
hooks.push({ antes: [], despues: [] }); // raíz (fuera de todo describe)
const beforeEach = (f) => { hooks[hooks.length - 1].antes.push(f); };
const afterEach = (f) => { hooks[hooks.length - 1].despues.push(f); };

// Los tests se ENCOLAN al registrarse y corren uno tras otro en reportar(),
// como en vitest. Antes los async arrancaban todos a la vez y el beforeEach
// del siguiente pisaba el estado del anterior a mitad de un await.
function it(nombre, fn) {
  const ruta = [...pila, nombre].join(' > ');
  const antes = hooks.flatMap((h) => h.antes);
  const despues = hooks.slice().reverse().flatMap((h) => h.despues);
  pendientes.push({ ruta, fn, antes, despues });
}

async function correr({ ruta, fn, antes, despues }) {
  try {
    for (const f of antes) await f();
    await fn();
    pasados++;
  } catch (e) {
    fallas.push({ ruta, error: e });
  } finally {
    for (const f of despues) await f();
  }
}

/** `it.each([...])('nombre %s', fn)` — la forma tabular de vitest. */
it.each = (casos) => (nombre, fn) => {
  for (const caso of casos) {
    const args = Array.isArray(caso) ? caso : [caso];
    it(`${nombre} ${ver(args)}`, () => fn(...args));
  }
};

function igual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => igual(a[k], b[k]));
}

/** Igualdad PARCIAL: `esperado` es un subconjunto de `actual`, recursivo. */
function parcial(actual, esperado) {
  if (esperado === null || typeof esperado !== 'object') return Object.is(actual, esperado);
  if (actual === null || typeof actual !== 'object') return false;
  return Object.keys(esperado).every((k) => parcial(actual[k], esperado[k]));
}

const ver = (v) => {
  try { return JSON.stringify(v); } catch { return String(v); }
};

function construir(actual, negado) {
  const falla = (msg) => { throw new Error(msg); };
  const chk = (cond, msg) => {
    if (negado ? cond : !cond) falla(`${msg} (recibido: ${ver(actual)}${negado ? ', esperaba lo contrario' : ''})`);
  };
  return {
    toBe: (e) => chk(Object.is(actual, e), `esperaba ${ver(e)}`),
    toEqual: (e) => chk(igual(actual, e), `esperaba (profundo) ${ver(e)}`),
    toStrictEqual: (e) => chk(igual(actual, e), `esperaba (estricto) ${ver(e)}`),
    // Parcial y recursivo: solo se exigen las claves que el esperado menciona.
    toMatchObject: (e) => chk(parcial(actual, e), `esperaba que incluyera ${ver(e)}`),
    toContain: (e) => chk(
      typeof actual === 'string' ? actual.includes(e) : Array.isArray(actual) && actual.some((x) => igual(x, e)),
      `esperaba que contuviera ${ver(e)}`,
    ),
    toHaveLength: (e) => chk(actual != null && actual.length === e, `esperaba longitud ${e}`),
    toBeGreaterThan: (e) => chk(actual > e, `esperaba > ${e}`),
    toBeGreaterThanOrEqual: (e) => chk(actual >= e, `esperaba >= ${e}`),
    toBeLessThan: (e) => chk(actual < e, `esperaba < ${e}`),
    toBeLessThanOrEqual: (e) => chk(actual <= e, `esperaba <= ${e}`),
    // Igual que vitest: |a-b| < 10^-d / 2, d = 2 por defecto.
    toBeCloseTo: (e, d = 2) => chk(Math.abs(actual - e) < Math.pow(10, -d) / 2, `esperaba ≈ ${e} (${d} decimales)`),
    toBeNull: () => chk(actual === null, 'esperaba null'),
    toBeUndefined: () => chk(actual === undefined, 'esperaba undefined'),
    toBeDefined: () => chk(actual !== undefined, 'esperaba definido'),
    toBeTruthy: () => chk(Boolean(actual), 'esperaba truthy'),
    toBeFalsy: () => chk(!actual, 'esperaba falsy'),
    toMatch: (re) => chk(typeof re === 'string' ? actual.includes(re) : re.test(actual), `esperaba que calzara ${re}`),
    toThrow: (msg) => {
      let lanzo = false, err = null;
      try { actual(); } catch (e) { lanzo = true; err = e; }
      chk(lanzo && (msg == null || String(err && err.message).includes(msg)), `esperaba que lanzara ${msg ?? ''}`);
    },
    toHaveBeenCalled: () => chk(actual.mock.calls.length > 0, 'esperaba que se llamara'),
    toHaveBeenCalledTimes: (n) => chk(actual.mock.calls.length === n, `esperaba ${n} llamadas, hubo ${actual.mock ? actual.mock.calls.length : '?'}`),
    toHaveBeenCalledWith: (...args) => chk(
      actual.mock.calls.some((c) => igual(c, args)),
      `esperaba llamada con ${ver(args)}`,
    ),
  };
}

function expect(actual) {
  const base = construir(actual, false);
  base.not = construir(actual, true);
  return base;
}
expect.any = () => ({ __any: true });

const vi = {
  fn: (impl) => {
    const f = (...args) => { f.mock.calls.push(args); return impl ? impl(...args) : undefined; };
    f.mock = { calls: [] };
    f.mockClear = () => { f.mock.calls = []; };
    return f;
  },
  /**
   * vi.mock(ruta, factory) (2026-09-21): siembra el módulo en require.cache
   * ANTES de que el test importe lo que lo usa. Funciona porque tsc emite los
   * require en el orden del archivo: el test debe escribir los vi.mock antes
   * de los import del módulo bajo prueba (así están los cuatro que lo usan).
   * `archivoActual` lo fija el runner para resolver rutas relativas.
   */
  mock: (ruta, factory) => {
    const Module = require('module');
    const path = require('path');
    const desde = vi.archivoActual ? path.dirname(vi.archivoActual) : process.cwd();
    const resuelto = require.resolve(ruta, { paths: [desde] });
    const m = new Module(resuelto, null);
    m.filename = resuelto;
    m.loaded = true;
    m.exports = factory ? factory() : {};
    require.cache[resuelto] = m;
  },
  /** vi.hoisted(fn): en vitest sube `fn` por encima de los import; aquí los vi.mock ya van antes, así que basta con evaluarla. */
  hoisted: (fn) => fn(),
  archivoActual: null,
};

async function reportar() {
  for (const t of pendientes) await correr(t);
  console.log(`\n${pasados} pasaron, ${fallas.length} fallaron`);
  for (const f of fallas) {
    console.log(`\n  FALLA: ${f.ruta}\n    ${f.error && f.error.message}`);
  }
  return fallas.length === 0;
}

module.exports = { describe, it, test: it, expect, vi, reportar, beforeEach, afterEach };
