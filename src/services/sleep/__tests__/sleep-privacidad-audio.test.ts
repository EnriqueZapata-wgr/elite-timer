/**
 * MB-30A P4 — NADA DE AUDIO SE PERSISTE. Es lo primero que revisión de
 * tiendas va a cuestionar de un micrófono activo toda la noche, y es
 * promesa de copy y de aviso de privacidad: solo se procesan niveles en
 * el dispositivo, ningún fragmento se guarda ni se sube.
 *
 * Dos capas:
 *  1. Estructural: en TODO el módulo de sueño no existe un solo camino de
 *     lectura ni subida de audio (readAsStringAsync, storage, base64...),
 *     y el mecanismo de descarte (deleteAsync) EXISTE — la mutación que lo
 *     quite truena aquí.
 *  2. Conductual: la rotación de fragmentos sigue el protocolo
 *     stop → descartar → rearrancar, sin invocar jamás un método de
 *     lectura del grabador.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('@/src/lib/logger', () => ({ warn: () => {}, log: () => {} }));

import { rotarFragmento, terminarYDescartar, CHUNK_MS } from '../mic-privacy';

const ARCHIVOS_DEL_MODULO = [
  'app/sleep-session.tsx',
  ...readdirSync(resolve(process.cwd(), 'src/services/sleep'))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => `src/services/sleep/${f}`),
];

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

/** Un camino de estos en el módulo de sueño = audio saliendo del teléfono. */
const CAMINOS_PROHIBIDOS = [
  'readAsStringAsync', // leer el archivo del grabador
  'readAsync',         // API nueva de expo-file-system
  'uploadAsync',
  'createUploadTask',
  'supabase.storage',
  'storage.from(',
  'FileReader',
  'base64',
  'toBlob',
  'arrayBuffer',
];

describe('estructural: ningún camino guarda ni sube audio', () => {
  for (const rel of ARCHIVOS_DEL_MODULO) {
    it(`${rel} no lee ni sube el audio`, () => {
      const src = read(rel);
      for (const camino of CAMINOS_PROHIBIDOS) {
        expect(src.includes(camino), `"${camino}" apareció en ${rel}`).toBe(false);
      }
    });
  }

  it('el mecanismo de descarte EXISTE: mic-privacy borra con deleteAsync', () => {
    const src = read('src/services/sleep/mic-privacy.ts');
    // La LLAMADA, no la palabra: la primera corrida de mutaciones (M2) quitó
    // el borrado y este test sobrevivió porque la anotación de tipo del
    // require aún decía "deleteAsync". Se exige `deleteAsync(...)` invocado.
    expect(/deleteAsync\(/.test(src), 'el borrado del fragmento desapareció de mic-privacy').toBe(true);
    // La rotación Y el cierre pasan por el descarte (definición + 2 llamadas).
    const llamadas = src.split('descartarFragmento(').length - 1;
    expect(llamadas, 'rotar o terminar dejó de descartar el fragmento').toBeGreaterThanOrEqual(3);
  });

  it('la pantalla nocturna usa el protocolo: rota por intervalo y descarta al cerrar', () => {
    const src = read('app/sleep-session.tsx');
    expect(src).toContain('rotarFragmento');
    expect(src).toContain('terminarYDescartar');
    expect(src).toContain('CHUNK_MS');
  });

  it('ningún fragmento vive más de 10 minutos', () => {
    expect(CHUNK_MS).toBeLessThanOrEqual(10 * 60 * 1000);
  });
});

describe('conductual: el protocolo de rotación no lee jamás', () => {
  function fakeRecorder() {
    const eventos: string[] = [];
    const rec = new Proxy(
      {
        uri: 'file:///cache/fragmento.3gp',
        stop: async () => { eventos.push('stop'); },
        prepareToRecordAsync: async () => { eventos.push('prepare'); },
        record: () => { eventos.push('record'); },
      },
      {
        get(target, prop) {
          if (typeof prop !== 'string') return undefined;
          if (prop in target) return (target as Record<string, unknown>)[prop];
          // Cualquier acceso fuera de la superficie mínima es sospechoso.
          eventos.push(`acceso-inesperado:${prop}`);
          return undefined;
        },
      },
    );
    return { rec: rec as never, eventos };
  }

  it('rotar = stop → (descartar) → prepare → record, sin leer nada', async () => {
    const { rec, eventos } = fakeRecorder();
    await rotarFragmento(rec);
    expect(eventos.filter((e) => !e.startsWith('acceso'))).toEqual(['stop', 'prepare', 'record']);
    expect(eventos.some((e) => e.includes('read') || e.includes('getURI')), 'la rotación intentó LEER').toBe(false);
  });

  it('terminar = stop → (descartar), y nada más', async () => {
    const { rec, eventos } = fakeRecorder();
    await terminarYDescartar(rec);
    expect(eventos.filter((e) => !e.startsWith('acceso'))).toEqual(['stop']);
  });
});
