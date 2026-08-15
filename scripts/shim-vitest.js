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
  try { fn(); } finally { pila.pop(); }
}

function it(nombre, fn) {
  const ruta = [...pila, nombre].join(' > ');
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      throw new Error('test async: el shim solo corre tests síncronos');
    }
    pasados++;
  } catch (e) {
    fallas.push({ ruta, error: e });
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
    toContain: (e) => chk(
      typeof actual === 'string' ? actual.includes(e) : Array.isArray(actual) && actual.some((x) => igual(x, e)),
      `esperaba que contuviera ${ver(e)}`,
    ),
    toHaveLength: (e) => chk(actual != null && actual.length === e, `esperaba longitud ${e}`),
    toBeGreaterThan: (e) => chk(actual > e, `esperaba > ${e}`),
    toBeGreaterThanOrEqual: (e) => chk(actual >= e, `esperaba >= ${e}`),
    toBeLessThan: (e) => chk(actual < e, `esperaba < ${e}`),
    toBeLessThanOrEqual: (e) => chk(actual <= e, `esperaba <= ${e}`),
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
};

function reportar() {
  console.log(`\n${pasados} pasaron, ${fallas.length} fallaron`);
  for (const f of fallas) {
    console.log(`\n  FALLA: ${f.ruta}\n    ${f.error && f.error.message}`);
  }
  return fallas.length === 0;
}

module.exports = { describe, it, test: it, expect, vi, reportar, beforeEach: (f) => f(), afterEach: () => {} };
