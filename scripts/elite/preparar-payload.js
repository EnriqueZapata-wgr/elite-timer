/**
 * preparar-payload.js: convierte un `elite_v3.json` en el payload que espera el
 * RPC `elite_cargar_evaluacion(p_user uuid, p_payload jsonb)` (migracion 318,
 * ruta 3.2 y 3.7 de ATP 3.0).
 *
 * POR QUE EXISTE (6 de septiembre de 2026): el RPC recibe, ademas del objeto
 * `elite_v3`, dos derivados que ya calcula el core puro del cliente:
 * `resumen_argos` (texto para el system prompt de ARGOS) y `suplementos_filas`
 * (filas listas para `user_supplements`). Calcularlos aqui, con el MISMO codigo
 * que usa la app (`src/services/elite/elite-v3-core.ts`), evita tener dos
 * versiones de la misma logica. El validador corre antes: un JSON que no pasa
 * `validarEliteV3` no sale de esta maquina.
 *
 * Sin dependencias externas: solo el `typescript` que ya esta en node_modules,
 * para transpilar el core en memoria (mismo patron que run-tests-sin-vitest.js,
 * pero con `ts.transpileModule` para no escribir archivos temporales).
 *
 * Uso:
 *   node scripts/elite/preparar-payload.js <elite_v3.json> <user_id> [--salida <ruta>]
 *
 * Escribe `<nombre>.payload.json` junto al JSON de entrada (o en --salida):
 *   { p_user: <user_id>, p_payload: { ...elite_v3, resumen_argos, suplementos_filas } }
 * y sale con codigo 1 si el JSON no valida.
 */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const RAIZ = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let salidaArg = null;
const posicionales = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--salida') { salidaArg = args[i + 1]; i += 1; }
  else posicionales.push(args[i]);
}
const [entrada, userId] = posicionales;

if (!entrada || !userId) {
  console.error('Uso: node scripts/elite/preparar-payload.js <elite_v3.json> <user_id> [--salida <ruta>]');
  process.exit(2);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!UUID.test(userId)) {
  console.error(`user_id no tiene forma de uuid: ${userId}`);
  console.error('Copialo de Supabase (Authentication > Users) o de profiles.id.');
  process.exit(2);
}

const rutaEntrada = path.resolve(process.cwd(), entrada);
if (!fs.existsSync(rutaEntrada)) {
  console.error(`No existe el archivo: ${rutaEntrada}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Cargar el core TypeScript sin compilador: transpilacion en memoria por archivo.
// El alias '@/' apunta a la raiz del repo (igual que tsconfig paths).
// ---------------------------------------------------------------------------
let ts;
try {
  ts = require(path.join(RAIZ, 'node_modules', 'typescript'));
} catch {
  console.error('No encontre node_modules/typescript en la raiz del repo. Corre desde el repo clonado.');
  process.exit(2);
}

const resolveOriginal = Module._resolveFilename;
Module._resolveFilename = function (peticion, ...resto) {
  if (peticion.startsWith('@/')) {
    return resolveOriginal.call(this, path.join(RAIZ, peticion.slice(2)), ...resto);
  }
  return resolveOriginal.call(this, peticion, ...resto);
};

// Registrar '.ts' hace que `require('./x')` tambien encuentre `x.ts`.
require.extensions['.ts'] = function (module, filename) {
  const fuente = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(fuente, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const core = require(path.join(RAIZ, 'src', 'services', 'elite', 'elite-v3-core.ts'));
const {
  validarEliteV3, resumenParaArgos, suplementosAFilas, nivelCalidadEliteV3,
  marcadoresDe, palabrasRojasEn, ELITE_SECCIONES, RESUMEN_ARGOS_MAX,
} = core;

// ---------------------------------------------------------------------------
// Leer, validar, derivar
// ---------------------------------------------------------------------------
let crudo;
try {
  crudo = JSON.parse(fs.readFileSync(rutaEntrada, 'utf8'));
} catch (err) {
  console.error(`El archivo no es JSON valido: ${err.message}`);
  process.exit(1);
}

const validacion = validarEliteV3(crudo);
if (!validacion.ok) {
  console.error(`El elite_v3 NO valida (${validacion.errores.length} errores). No se escribio ningun payload.`);
  for (const e of validacion.errores) console.error(`  - ${e}`);
  process.exit(1);
}
const eliteV3 = validacion.valor;

const resumenArgos = resumenParaArgos(eliteV3);
const suplementosFilas = suplementosAFilas(eliteV3, userId);
const qualityLevel = nivelCalidadEliteV3(eliteV3);

// Candado extra sobre lo derivado: el resumen va al system prompt de ARGOS y
// no puede llevar palabras rojas ni em dashes (el core solo reordena texto ya
// validado, pero aqui se comprueba de todas formas).
const EM_DASH = '\u2014'; // U+2014 escapado para no disparar el candado de verifica.js
const problemasDerivados = [];
if (resumenArgos.includes(EM_DASH)) problemasDerivados.push('resumen_argos: em dash');
const rojas = palabrasRojasEn(resumenArgos);
if (rojas.length) problemasDerivados.push(`resumen_argos: palabra roja (${rojas.join(', ')})`);
if (resumenArgos.length > RESUMEN_ARGOS_MAX) problemasDerivados.push(`resumen_argos: ${resumenArgos.length} > ${RESUMEN_ARGOS_MAX}`);
if (problemasDerivados.length) {
  console.error('Los derivados no pasan el candado. No se escribio ningun payload.');
  for (const p of problemasDerivados) console.error(`  - ${p}`);
  process.exit(1);
}

const payload = {
  p_user: userId,
  p_payload: { ...eliteV3, resumen_argos: resumenArgos, suplementos_filas: suplementosFilas },
};

// Comprobacion de ida y vuelta: quitando los dos derivados, el objeto que va
// dentro de p_payload debe seguir validando tal cual.
const { resumen_argos: _r, suplementos_filas: _s, ...deVuelta } = payload.p_payload;
const revalida = validarEliteV3(deVuelta);
if (!revalida.ok) {
  console.error('El payload armado ya no valida (esto es un bug del script, no del JSON):');
  for (const e of revalida.errores) console.error(`  - ${e}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Escribir y resumir
// ---------------------------------------------------------------------------
const rutaSalida = salidaArg
  ? path.resolve(process.cwd(), salidaArg)
  : path.join(path.dirname(rutaEntrada), `${path.basename(rutaEntrada).replace(/\.json$/i, '')}.payload.json`);
fs.writeFileSync(rutaSalida, JSON.stringify(payload, null, 2) + '\n', 'utf8');

const marcadores = marcadoresDe(eliteV3);
const att = marcadores.filter((m) => m.estado === 'att').length;
const seccionesPresentes = ELITE_SECCIONES.filter((s) => eliteV3[s] !== undefined && eliteV3[s] !== null).length;
const tamano = fs.statSync(rutaSalida).size;

console.log('Payload listo para elite_cargar_evaluacion');
console.log(`  cliente:              ${eliteV3.cliente.nombre_preferido} (${eliteV3.cliente.sexo}, ${eliteV3.cliente.edad} anios, toma ${eliteV3.cliente.fecha_toma})`);
console.log(`  user_id destino:      ${userId}`);
console.log(`  version elite_v3:     ${eliteV3.version}  (debe ser: evaluaciones Elite previas del usuario + 1; la primera es 1)`);
console.log(`  secciones:            ${seccionesPresentes} de ${ELITE_SECCIONES.length}`);
console.log(`  marcadores:           ${marcadores.length} (${att} piden accion)`);
console.log(`  hallazgos geneticos:  ${eliteV3.genetica.hallazgos.length}`);
console.log(`  suplementos (filas):  ${suplementosFilas.length}`);
console.log(`  resumen_argos:        ${resumenArgos.length} caracteres (tope ${RESUMEN_ARGOS_MAX})`);
console.log(`  quality_level:        ${qualityLevel} (${qualityLevel === 5 ? 'con genetica' : 'sin genetica'})`);
console.log(`  html incluido:        ${typeof eliteV3.html === 'string' ? `si (${eliteV3.html.length} caracteres)` : 'no'}`);
console.log(`  archivo:              ${rutaSalida} (${(tamano / 1024).toFixed(1)} KB)`);
console.log('');
console.log('Siguiente paso: bash scripts/elite/curl-elite.sh cargar "' + rutaSalida + '"');
