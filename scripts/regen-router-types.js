#!/usr/bin/env node
/**
 * REGENERA .expo/types/router.d.ts SIN ARRANCAR EXPO (MB-26).
 *
 * El archivo de typed routes solo lo escribía el dev server de expo al
 * arrancar. En un worktree fresco no existe, y desactualizado hace tronar
 * `tsc` en las rutas (nos ha costado tres veces). Este script llama al
 * MISMO generador que usa el dev server (expo-router/build/typed-routes),
 * con el mismo contexto de archivos de app/, y escribe el archivo en
 * frío. Correr antes del typecheck:
 *
 *   npm run tipos:rutas && npx tsc --noEmit
 *
 * Sale con código 1 si no se pudo generar (mejor tronar aquí, con el
 * motivo, que en 40 errores crípticos de tsc).
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const appRoot = path.join(projectRoot, 'app');
const outDir = path.join(projectRoot, '.expo', 'types');

process.env.EXPO_ROUTER_APP_ROOT = appRoot;
process.env.EXPO_ROUTER_ABS_APP_ROOT = appRoot;

try {
  const requireContext = require('expo-router/build/testing-library/require-context-ponyfill').default;
  const { getTypedRoutesDeclarationFile } = require('expo-router/build/typed-routes/generate');
  let ignore;
  try {
    ({ EXPO_ROUTER_CTX_IGNORE: ignore } = require('expo-router/_ctx-shared'));
  } catch {
    // Fallback al default del ponyfill si el entry _ctx-shared cambia.
    ignore = undefined;
  }

  const ctx = requireContext(appRoot, true, ignore);
  const file = getTypedRoutesDeclarationFile(ctx, {});
  if (!file || typeof file !== 'string') {
    throw new Error('el generador devolvió vacío');
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'router.d.ts'), file);
  const rutas = (file.match(/staticRoutes:/) ? '' : '');
  console.log(`router.d.ts regenerado en .expo/types (${file.length} bytes).${rutas}`);
} catch (e) {
  console.error('No se pudo regenerar router.d.ts:', e && e.message ? e.message : e);
  process.exit(1);
}
