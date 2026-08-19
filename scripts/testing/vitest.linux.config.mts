/**
 * Config de Vitest para correr la suite desde Linux (sandbox de agentes).
 *
 * POR QUÉ EXISTE
 * El `node_modules/` del repo se instala desde Windows, así que solo trae los
 * binarios nativos de esa plataforma. En Linux faltan dos y vitest no arranca.
 * `scripts/testing/pruebas-linux.sh` los resuelve por NODE_PATH, fuera del repo.
 *
 * LO ÚNICO QUE CAMBIA ESTE ARCHIVO es a dónde se escribe el cache de Vite.
 * Por defecto Vite escribe en `node_modules/.vite`, o sea DENTRO del
 * node_modules del dueño. Ese directorio es intocable: un agente ya lo destruyó
 * una vez y costó horas recuperarlo. Aquí lo mandamos fuera del repo.
 *
 * NO agregues reglas de test aquí. La fuente de verdad sigue siendo
 * `vitest.config.ts` en la raíz, y este archivo lo hereda entero para que
 * Linux y Windows corran exactamente la misma suite.
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import base from '../../vitest.config.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const raizDelRepo = resolve(aqui, '..', '..');

// Fuera del repo por default. Se puede mover con ATP_TEST_CACHE si el sandbox
// no tiene /tmp escribible.
const cacheFueraDelRepo = process.env.ATP_TEST_CACHE || '/tmp/atp-vitest-cache';

export default mergeConfig(
  base,
  defineConfig({
    // El config vive en scripts/testing/, pero la raíz del proyecto sigue
    // siendo el repo: sin esto los globs de `include` no encuentran nada.
    root: raizDelRepo,
    cacheDir: resolve(cacheFueraDelRepo, 'vite'),
  })
);
