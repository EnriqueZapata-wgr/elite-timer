/**
 * Runner de emergencia para correr los tests puros SIN vitest.
 *
 * POR QUÉ EXISTE: el node_modules de este equipo trae solo los binarios nativos
 * de rollup para win32, y vitest (vía vite) los exige. En un entorno Linux el
 * runner oficial no arranca y `npm install` está prohibido: ya destruyó el
 * entorno de alguien una vez.
 *
 * Qué hace: transpila los `*-core.ts` con el tsc que ya está instalado, reescribe
 * el alias `@/` a rutas relativas, y ejecuta los archivos de test contra un shim
 * mínimo de la API de vitest (describe/it/expect/vi).
 *
 * NO reemplaza a `npm test`. Es un verificador para poder trabajar; la corrida
 * oficial sigue siendo vitest en la máquina del dueño.
 *
 * Uso:  node scripts/run-tests-sin-vitest.js <archivo.test.ts> [...]
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');

const RAIZ = path.resolve(__dirname, '..');
const SALIDA = path.join(os.tmpdir(), 'atp-test-build');
const TSC = path.resolve(RAIZ, '..', '..', 'node_modules', 'typescript', 'bin', 'tsc');

const objetivos = process.argv.slice(2);
if (objetivos.length === 0) {
  console.error('Uso: node scripts/run-tests-sin-vitest.js <archivo.test.ts> [...]');
  process.exit(2);
}

fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA, { recursive: true });
// El emitido es CommonJS. Sin esta marca, Node hereda el `type` del package.json
// más cercano hacia arriba y algunos archivos revientan con "exports is not
// defined in ES module scope".
fs.writeFileSync(path.join(SALIDA, 'package.json'), '{"type":"commonjs"}');

// 1. Transpilar (sin type-check real: de eso ya se encarga `tsc --noEmit -p .`).
//    El tsconfig va aparte porque `paths` no se puede pasar por línea de comandos
//    y sin él el alias '@/' no resuelve.
const CFG = path.join(SALIDA, 'tsconfig.emit.json');
fs.writeFileSync(CFG, JSON.stringify({
  compilerOptions: {
    outDir: SALIDA,
    rootDir: RAIZ,
    module: 'commonjs',
    target: 'es2020',
    moduleResolution: 'node',
    esModuleInterop: true,
    skipLibCheck: true,
    noEmitOnError: false,
    jsx: 'react',
    baseUrl: RAIZ,
    paths: { '@/*': ['./*'] },
    types: [],
  },
  files: objetivos.map((f) => path.resolve(RAIZ, f)),
}, null, 2));

try {
  // Los errores de TIPO no importan aquí (tsc -p . es el juez); solo el JS emitido.
  execFileSync(process.execPath, [TSC, '-p', CFG], { stdio: 'ignore', cwd: RAIZ });
} catch {
  /* noEmitOnError:false ya emitió lo que se pudo. */
}

// 2. El alias '@/...' apunta a la raíz del proyecto. En el build transpilado se
//    resuelve a la raíz del outDir.
const resolveOriginal = Module._resolveFilename;
Module._resolveFilename = function (peticion, ...resto) {
  if (peticion === 'vitest') return path.join(__dirname, 'shim-vitest.js');
  if (peticion.startsWith('@/')) {
    return resolveOriginal.call(this, path.join(SALIDA, peticion.slice(2)), ...resto);
  }
  return resolveOriginal.call(this, peticion, ...resto);
};

// 3. Correr.
const shim = require('./shim-vitest.js');
for (const objetivo of objetivos) {
  const compilado = path.join(SALIDA, objetivo.replace(/\.ts$/, '.js'));
  if (!fs.existsSync(compilado)) {
    console.error(`  no se transpiló: ${objetivo}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`\n=== ${objetivo} ===`);
  require(compilado);
}

shim.reportar().then((ok) => { process.exitCode = ok ? 0 : 1; });
