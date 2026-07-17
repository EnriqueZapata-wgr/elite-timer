#!/usr/bin/env node
/**
 * upload-ota-sourcemaps.mjs — sube los sourcemaps de un OTA (eas update) a Sentry.
 *
 * POR QUÉ: los builds NATIVOS ya suben sourcemaps solos (config plugin
 * @sentry/react-native/expo durante `eas build`, requiere SENTRY_AUTH_TOKEN).
 * Pero un `eas update` reempaqueta el bundle JS/Hermes → sus sourcemaps NO se
 * suben automáticamente. Sin este paso, los stacktraces de errores que ocurran
 * SOBRE un OTA salen ofuscados (minified) en Sentry.
 *
 * FLUJO (idempotente, seguro de re-correr):
 *   1) `expo export` produce dist/ con bundles + .map (con Debug IDs embebidos
 *      por el metro serializer de Sentry que instala el config plugin).
 *   2) `eas update --input-dir ./dist` publica ESE export exacto (mismo hash).
 *   3) `sentry-cli sourcemaps upload` sube los .map casando por Debug ID.
 *
 * USO:
 *   SENTRY_AUTH_TOKEN=xxxx node scripts/upload-ota-sourcemaps.mjs --branch preview --message "hotfix X"
 *   (o vía npm:  npm run sourcemaps:ota -- --branch preview --message "…")
 *
 * El token se crea en Sentry → Settings → Auth Tokens (scopes: project:releases,
 * org:read). NO lo commitees: pásalo por env en el momento de correr.
 *
 * VALIDAR ANTES DE CONFIAR: tras el primer OTA, forzar un error de prueba en el
 * device y confirmar en Sentry que el stacktrace sale des-ofuscado. Ver
 * Business development/Beta_Launch_Kit/10_SENTRY_SOURCEMAPS_SETUP.md
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const ORG = 'atp-v5';
const PROJECT = 'atp-mobile';
const DIST = 'dist';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const branch = arg('branch', 'preview');
const message = arg('message', 'OTA update');

if (!process.env.SENTRY_AUTH_TOKEN) {
  console.error('✗ Falta SENTRY_AUTH_TOKEN. Córrelo así:');
  console.error('  SENTRY_AUTH_TOKEN=xxxx node scripts/upload-ota-sourcemaps.mjs --branch preview --message "…"');
  process.exit(1);
}

function run(cmd, args) {
  console.log(`\n▶ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`✗ Falló: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

// Export limpio (borra dist previo para no mezclar maps viejos).
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
run('npx', ['expo', 'export', '--platform', 'all', '--output-dir', DIST]);

// Publica EXACTAMENTE ese export (el hash del bundle debe coincidir con los maps).
run('npx', ['eas', 'update', '--branch', branch, '--message', message, '--input-dir', `./${DIST}`, '--non-interactive']);

// Sube los sourcemaps casando por Debug ID (universal en sentry-cli 2.x).
run('npx', [
  'sentry-cli', 'sourcemaps', 'upload',
  '--org', ORG, '--project', PROJECT,
  '--strip-prefix', DIST,
  DIST,
]);

console.log('\n✓ OTA publicado + sourcemaps subidos. VALIDA con un error de prueba en device.');
