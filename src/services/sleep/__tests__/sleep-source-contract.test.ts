/**
 * MB-30A P4 — contrato: lo que el código de sueño puede mandar contra lo
 * que la tabla acepta, y la regla "una noche, un registro" EN LA BASE.
 *
 * Lección MB-27 (246): el import de cardio falló siempre porque el CHECK
 * de source nunca aceptó los valores del código (el ALTER vivía en un
 * comentario). Este cruce vive en un test desde el DÍA UNO de la 261.
 *
 * Wearables bloque A (13-oct-2026): la 344 redefine el CHECK de
 * `sleep_nights.source` y de `health_os_daily.source` (marcas y 'mixto') con
 * la forma `check (source = any (array[...]))`. El test ya no mira una
 * migración fija: lee la VIGENTE, la última que define el CHECK de cada
 * tabla en `supabase/migrations/*.sql` por orden de número. Así el día que
 * otra migración lo vuelva a tocar, el contrato la sigue sin que nadie se
 * acuerde de cambiar un nombre de archivo aquí.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SLEEP_SOURCES } from '../sleep-core';
import { HEALTH_SOURCES } from '../../fitness/health-import-core';
import { FUENTES_344_DIAS, FUENTES_344_NOCHES, FUENTES_DE_MARCA } from '../../health/procedencia-core';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

/** SQL/TS ejecutable: fuera comentarios (CRLF-safe — lección del test de 246). */
const exec = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/(?:--|\/\/).*$/, ''))
    .join('\n');

const DIR_MIG = 'supabase/migrations';

/** Las migraciones en el orden en que se aplican: por número, luego por nombre. */
const MIGRACIONES: { archivo: string; sql: string }[] = readdirSync(resolve(process.cwd(), DIR_MIG))
  .filter((f) => /^\d+_.*\.sql$/i.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b))
  .map((archivo) => ({ archivo, sql: exec(read(`${DIR_MIG}/${archivo}`)) }));

const MIG_261 = exec(read(`${DIR_MIG}/261_sleep_nights.sql`));
const MIG_344 = exec(read(`${DIR_MIG}/344_wearables_conexion.sql`));

/**
 * Literales del CHECK de `source` en un pedazo de SQL. Acepta las dos formas
 * que existen en el repo:
 *   CHECK (source IN ('a', 'b'))                 (261, 264)
 *   check (source = any (array['a', 'b']))       (344, puede ir en varias líneas)
 */
function literalesDelCheck(sql: string): string[] | null {
  const m = sql.match(
    /check\s*\(\s*source\s+(?:in\s*\(([^)]*)\)|=\s*any\s*\(\s*array\s*\[([^\]]*)\]\s*(?:::\s*text\s*\[\s*\])?\s*\))/i,
  );
  if (!m) return null;
  return [...(m[1] ?? m[2] ?? '').matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/**
 * Todas las definiciones del CHECK de `<tabla>.source`, en orden de
 * aplicación. Se parte cada migración en sentencias y solo cuentan las que
 * crean o alteran ESA tabla (así el CHECK de otra tabla no se cuela).
 */
function definicionesDelCheck(tabla: string): { archivo: string; fuentes: string[] }[] {
  const destino = new RegExp(
    `^\\s*(?:create\\s+table(?:\\s+if\\s+not\\s+exists)?|alter\\s+table(?:\\s+if\\s+exists)?(?:\\s+only)?)\\s+(?:public\\.)?"?${tabla}"?\\b`,
    'i',
  );
  const out: { archivo: string; fuentes: string[] }[] = [];
  for (const { archivo, sql } of MIGRACIONES) {
    for (const sentencia of sql.split(';')) {
      if (!destino.test(sentencia)) continue;
      const fuentes = literalesDelCheck(sentencia);
      if (fuentes) out.push({ archivo, fuentes });
    }
  }
  return out;
}

/** El CHECK vigente: la última definición. */
function checkVigente(tabla: string): { archivo: string; fuentes: string[] } {
  const defs = definicionesDelCheck(tabla);
  return defs[defs.length - 1] ?? { archivo: '(ninguna)', fuentes: [] };
}

/** Fuente → client_can_write, del insert a health_source_priority (la última migración que lo toca manda). */
function jerarquiaDeFuentes(): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const { sql } of MIGRACIONES) {
    for (const sentencia of sql.split(';')) {
      const m = sentencia.match(
        /insert\s+into\s+(?:public\.)?health_source_priority\s*\(([^)]*)\)\s*values([\s\S]*?)(?:\bon\s+conflict\b|$)/i,
      );
      if (!m) continue;
      const columnas = m[1].split(',').map((c) => c.trim().toLowerCase());
      const iSource = columnas.indexOf('source');
      const iCliente = columnas.indexOf('client_can_write');
      for (const t of m[2].matchAll(/\(([^()]*)\)/g)) {
        const valores = t[1].split(',').map((v) => v.trim());
        const source = valores[iSource]?.replace(/^'|'$/g, '');
        const cliente = valores[iCliente]?.toLowerCase();
        if (source && (cliente === 'true' || cliente === 'false')) out.set(source, cliente === 'true');
      }
    }
  }
  return out;
}

const NOCHES = checkVigente('sleep_nights');
const DIAS = checkVigente('health_os_daily');
const JERARQUIA = jerarquiaDeFuentes();
const ESCRIBE_EL_TELEFONO = [...JERARQUIA].filter(([, c]) => c).map(([s]) => s);

const mismoConjunto = (a: readonly string[], b: readonly string[]) => [...new Set(a)].sort().join(',') === [...new Set(b)].sort().join(',');

describe('contrato source: código vs sleep_nights (CHECK vigente)', () => {
  it('el CHECK se extrajo (guard del parser, las dos formas)', () => {
    // La forma vieja (261) y la nueva (344) se leen; si un día el parser deja
    // de entender una, esto se pone rojo antes que el contrato.
    expect(definicionesDelCheck('sleep_nights').length).toBeGreaterThanOrEqual(2);
    expect(literalesDelCheck(MIG_261.split(';').find((s) => /create\s+table[^(]*sleep_nights/i.test(s)) ?? '')?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(NOCHES.fuentes.length).toBeGreaterThanOrEqual(3);
    expect(NOCHES.archivo, 'el CHECK vigente de sleep_nights debería venir de la 344 o una posterior').toMatch(/^\d+_/);
    expect(parseInt(NOCHES.archivo, 10)).toBeGreaterThanOrEqual(344);
  });

  it('todo valor que el código puede mandar está permitido por el CHECK vigente', () => {
    for (const v of SLEEP_SOURCES) {
      expect(NOCHES.fuentes, `'${v}' no está permitido por el CHECK de ${NOCHES.archivo}`).toContain(v);
    }
  });

  it('la base y procedencia-core hablan el mismo vocabulario (en los dos sentidos)', () => {
    for (const v of NOCHES.fuentes) {
      expect([...FUENTES_344_NOCHES], `'${v}' está en el CHECK de ${NOCHES.archivo} y falta en FUENTES_344_NOCHES`).toContain(v);
    }
    for (const v of FUENTES_344_NOCHES) {
      expect(NOCHES.fuentes, `'${v}' está en FUENTES_344_NOCHES y el CHECK de ${NOCHES.archivo} no lo acepta`).toContain(v);
    }
    expect(mismoConjunto(NOCHES.fuentes, FUENTES_344_NOCHES)).toBe(true);
  });

  it('cada CHECK nuevo es superset del anterior (ADD CONSTRAINT valida filas existentes)', () => {
    const defs = definicionesDelCheck('sleep_nights');
    for (let i = 1; i < defs.length; i++) {
      for (const v of defs[i - 1].fuentes) {
        expect(defs[i].fuentes, `${defs[i].archivo} perdió '${v}' de ${defs[i - 1].archivo}: el push rompería`).toContain(v);
      }
    }
  });

  it('la 344 tira el constraint viejo antes de agregar el nuevo', () => {
    expect(MIG_344).toMatch(/drop\s+constraint\s+if\s+exists\s+sleep_nights_source_check/i);
    expect(MIG_344).toMatch(/add\s+constraint\s+sleep_nights_source_check\s+check\s*\(\s*source\s*=\s*any/i);
  });

  it('la tabla nace con RLS y policy (regla 4 de CLAUDE.md)', () => {
    expect(MIG_261).toMatch(/ALTER\s+TABLE\s+sleep_nights\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(MIG_261).toMatch(/CREATE\s+POLICY/i);
  });

  it('una noche, un registro: UNIQUE (user_id, night_date) en la base', () => {
    expect(MIG_261).toMatch(/UNIQUE\s*\(\s*user_id\s*,\s*night_date\s*\)/i);
  });
});

describe('contrato source: código vs health_os_daily (CHECK vigente)', () => {
  it('el CHECK se extrajo (guard del parser)', () => {
    expect(definicionesDelCheck('health_os_daily').length).toBeGreaterThanOrEqual(2);
    expect(DIAS.fuentes.length).toBeGreaterThanOrEqual(2);
    expect(parseInt(DIAS.archivo, 10)).toBeGreaterThanOrEqual(344);
  });

  it('todo valor que el import puede mandar (HEALTH_SOURCES) está permitido', () => {
    for (const v of HEALTH_SOURCES) {
      expect(DIAS.fuentes, `'${v}' no está permitido por el CHECK de ${DIAS.archivo}`).toContain(v);
    }
  });

  it('la base y procedencia-core hablan el mismo vocabulario (en los dos sentidos)', () => {
    for (const v of DIAS.fuentes) {
      expect([...FUENTES_344_DIAS], `'${v}' está en el CHECK de ${DIAS.archivo} y falta en FUENTES_344_DIAS`).toContain(v);
    }
    for (const v of FUENTES_344_DIAS) {
      expect(DIAS.fuentes, `'${v}' está en FUENTES_344_DIAS y el CHECK de ${DIAS.archivo} no lo acepta`).toContain(v);
    }
    expect(mismoConjunto(DIAS.fuentes, FUENTES_344_DIAS)).toBe(true);
  });

  it('cada CHECK nuevo es superset del anterior', () => {
    const defs = definicionesDelCheck('health_os_daily');
    for (let i = 1; i < defs.length; i++) {
      for (const v of defs[i - 1].fuentes) {
        expect(defs[i].fuentes, `${defs[i].archivo} perdió '${v}' de ${defs[i - 1].archivo}`).toContain(v);
      }
    }
  });

  it('la 344 tira el constraint viejo antes de agregar el nuevo', () => {
    expect(MIG_344).toMatch(/drop\s+constraint\s+if\s+exists\s+health_os_daily_source_check/i);
  });
});

describe('quién puede escribir con cada fuente (health_source_priority)', () => {
  it('la jerarquía se extrajo (guard del parser)', () => {
    expect(JERARQUIA.size).toBeGreaterThanOrEqual(7);
  });

  it('el teléfono escribe exactamente con sleep_cycle, health_connect y healthkit', () => {
    expect(mismoConjunto(ESCRIBE_EL_TELEFONO, ['sleep_cycle', 'health_connect', 'healthkit'])).toBe(true);
  });

  it('todo lo que el código de sueño manda es escribible por el teléfono', () => {
    for (const v of SLEEP_SOURCES) {
      expect(ESCRIBE_EL_TELEFONO, `el teléfono manda '${v}' y la base solo lo deja al servidor`).toContain(v);
    }
  });

  it('ninguna marca es escribible por el teléfono (solo el servidor habla por Oura, WHOOP, Garmin y Polar)', () => {
    for (const marca of FUENTES_DE_MARCA) {
      expect(JERARQUIA.has(marca), `'${marca}' no tiene renglón en la jerarquía`).toBe(true);
      expect(JERARQUIA.get(marca), `'${marca}' quedó escribible por el cliente`).toBe(false);
    }
  });

  it("toda fuente del CHECK (menos 'mixto', que es un resumen) tiene renglón en la jerarquía", () => {
    for (const v of [...NOCHES.fuentes, ...DIAS.fuentes]) {
      if (v === 'mixto') continue;
      expect(JERARQUIA.has(v), `'${v}' está en un CHECK y no en health_source_priority`).toBe(true);
    }
  });
});

describe('quién manda cuando hay dos fuentes de la misma noche', () => {
  const sesion = exec(read('src/services/sleep/sleep-session-service.ts'));
  const importSvc = exec(read('src/services/sleep/sleep-import-service.ts'));

  it('la sesión PROPIA pisa: upsert por (user_id, night_date) SIN ignoreDuplicates', () => {
    expect(sesion).toMatch(/\.upsert\(/);
    expect(sesion).toMatch(/onConflict:\s*'user_id,night_date'/);
    expect(sesion, 'la propia dejó de mandar: un ignoreDuplicates la volvería segunda').not.toContain(
      'ignoreDuplicates',
    );
  });

  it('el import NUNCA pisa: upsert con ignoreDuplicates (ON CONFLICT DO NOTHING)', () => {
    expect(importSvc).toMatch(/onConflict:\s*'user_id,night_date'/);
    expect(importSvc).toMatch(/ignoreDuplicates:\s*true/);
  });

  it('el import jamás inventa score ni ronquido (números que no midió)', () => {
    expect(importSvc).toMatch(/score:\s*null/);
    expect(importSvc).toMatch(/snore_minutes:\s*null/);
  });

  it('A5: la actualización de una noche a medias se filtra por source de máquina EN LA BASE (sleep_cycle nunca)', () => {
    // El UPDATE existe (la noche parcial se completa)...
    expect(importSvc).toMatch(/\.update\(/);
    // ...y va acotado a user_id, night_date y source de máquina, para que ni
    // una carrera con la sesión propia la pise.
    expect(importSvc).toMatch(/\.in\('source',\s*\[\.\.\.FUENTES_DE_MAQUINA\]\)/);
    expect(importSvc).toMatch(/FUENTES_DE_MAQUINA\s*=\s*\['health_connect',\s*'healthkit'\]/);
    expect(importSvc).toMatch(/\.eq\('night_date',\s*n\.nightDate\)/);
  });
});
