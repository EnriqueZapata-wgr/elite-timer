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
 *   { p_user: <user_id>, p_payload: { ...elite_v3, resumen_argos,
 *     suplementos_filas, roots_detected, lab_values_filas, lab_values_omitidos } }
 * y sale con codigo 1 si el JSON no valida.
 *
 * 8-sep-2026: `roots_detected` es el tercer derivado. Sin el, la fila de
 * functional_dx entraba con '[]' y el Mapa funcional se quedaba sin raices.
 *
 * 20-sep-2026 (migracion 324): `lab_values_filas` es el cuarto. Los marcadores
 * medidos de la evaluacion entran a `lab_values` con clave canonica, para que
 * el expediente de labs, el comparador y ARGOS los vean. La clave la resuelve
 * `elite-lab-values-core.ts` con los MISMOS mapas que usa la app; lo que no
 * mapea viaja en `lab_values_omitidos` y el RPC lo devuelve como aviso.
 *
 * 21-sep-2026 (migracion 325): los campos nuevos del contrato (cliente.
 * fecha_nacimiento, estatura_cm, peso_kg, nivel_fitness, fc_reposo;
 * alimentacion.metas kcal/grasa/carbohidrato y comidas[]; entrenamiento.
 * rutinas[]) viajan dentro del elite_v3 tal cual (el validador los normaliza:
 * ausente = null o []). No son derivados: los lee la base despues de la carga
 * (elite_sembrar_perfil, elite_cargar_rutinas, elite_cargar_comidas). Aqui
 * solo se cuentan y se avisa lo que falta.
 *
 * 21-sep-2026 (ronda de arreglos): `entrenamiento.rutinas[].bloques[].slug`
 * viaja tal cual (el validador lo normaliza: ausente = null). Es el slug
 * exacto de exercise_matrix, un catalogo en INGLES (MoveKit): sin slug el
 * nombre en espanol casi nunca empareja y el bloque corre como tiempo. Aqui
 * se cuenta cuantos bloques traen slug y se avisa cuantos no.
 *
 * 8-oct-2026 (nivel 2): el mismo script prepara un PROGRAMA, que es el mismo
 * documento con `tipo: "programa"` (evaluacion ligera, mismo plan). Lo que
 * cambia aqui:
 *  - `practicas[].key` se comprueba contra el catalogo de practicas
 *    (src/constants/interventions-catalog.ts). El validador de la app solo
 *    revisa la forma, porque el catalogo pesa mas de diez mil lineas y no se
 *    mete al telefono para esto; aqui si se carga. Una clave que no existe
 *    DETIENE la preparacion y se sugieren las mas parecidas.
 *  - Un programa sin evaluacion no recibe los avisos que solo aplican a una
 *    evaluacion (raices vacias, laboratorios), y recibe los suyos (sin
 *    nombre, sin inicio declarado, sin practicas).
 *  - Sin toma de sangre y sin marcadores con valor, `lab_values_filas` NO
 *    viaja: con el arreglo vacio la base avisaria "fecha de toma invalida"
 *    por unos laboratorios que no existen.
 * Con un documento Elite, el payload solo gana tres llaves normalizadas
 * (`practicas: []`, `inicio.programa_nombre: null`, `inicio.programa_inicio:
 * null`) y la salida en pantalla es la misma de antes.
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
  marcadoresDe, palabrasRojasEn, raicesDetectadas, ELITE_SECCIONES, RESUMEN_ARGOS_MAX,
  tipoDeDocumento, tieneDiagnostico,
} = core;
// 20-sep-2026 (324): marcadores -> lab_values, con los mapas canonicos del cliente.
const { labValuesDeEvaluacion, fechaMedicionDeToma, MOTIVO_OMISION_TEXTO } =
  require(path.join(RAIZ, 'src', 'services', 'elite', 'elite-lab-values-core.ts'));

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

// ---------------------------------------------------------------------------
// 8-oct-2026 (nivel 2): tipo del documento y practicas contra el catalogo.
// ---------------------------------------------------------------------------
const esProg = tipoDeDocumento(eliteV3) === 'programa';
const conEvaluacion = tieneDiagnostico(eliteV3);
const practicas = eliteV3.practicas || [];
/** Clave -> ficha del catalogo, solo para las practicas del documento. */
const fichaDePractica = new Map();

/** Distancia de edicion entre dos claves (para sugerir la mas parecida). */
function distancia(a, b) {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const arriba = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = arriba;
    }
  }
  return fila[b.length];
}

if (practicas.length) {
  let catalogo;
  try {
    catalogo = require(path.join(RAIZ, 'src', 'constants', 'interventions-catalog.ts')).INTERVENTIONS_CATALOG;
  } catch (err) {
    console.error(`No se pudo leer el catalogo de practicas (src/constants/interventions-catalog.ts): ${err.message}`);
    console.error('Sin el catalogo no se puede comprobar que las practicas existan. No se escribio ningun payload.');
    process.exit(1);
  }
  if (!Array.isArray(catalogo) || catalogo.length === 0) {
    console.error('El catalogo de practicas llego vacio. No se escribio ningun payload.');
    process.exit(1);
  }
  const porClave = new Map(catalogo.map((i) => [i.key, i]));
  const desconocidas = [];
  practicas.forEach((p, i) => {
    const ficha = porClave.get(p.key);
    if (ficha) { fichaDePractica.set(p.key, ficha); return; }
    // Las mas parecidas: pesan las palabras en comun y, despues, la distancia de edicion.
    const palabras = new Set(p.key.split('_'));
    const parecidas = catalogo
      .map((c) => ({ c, puntos: distancia(p.key, c.key) - 3 * c.key.split('_').filter((t) => palabras.has(t)).length }))
      .sort((x, y) => x.puntos - y.puntos)
      .slice(0, 3)
      .map(({ c }) => `${c.key} (${c.name})`);
    desconocidas.push(`practicas[${i}].key "${p.key}" no existe en el catalogo. Las mas parecidas: ${parecidas.join('; ')}`);
  });
  if (desconocidas.length) {
    console.error(`El documento asigna ${desconocidas.length} practica(s) que no existen en el catalogo. No se escribio ningun payload.`);
    for (const d of desconocidas) console.error(`  - ${d}`);
    console.error('Las claves validas son el campo "key" de src/constants/interventions-catalog.ts. Copia la clave tal cual y vuelve a correr este comando.');
    process.exit(1);
  }
}

const resumenArgos = resumenParaArgos(eliteV3);
const suplementosFilas = suplementosAFilas(eliteV3, userId);
const raices = raicesDetectadas(eliteV3);
const qualityLevel = nivelCalidadEliteV3(eliteV3);
const labValues = labValuesDeEvaluacion(eliteV3);
// 8-oct-2026 (nivel 2): un programa puede no tener toma de sangre (null).
const fechaMedicion = eliteV3.cliente.fecha_toma ? fechaMedicionDeToma(eliteV3.cliente.fecha_toma) : null;
const marcadoresConValorEnGrupos = eliteV3.marcadores.grupos.reduce((n, g) => n + g.marcadores.filter((m) => typeof m.valor === 'number').length, 0);
// Sin toma, sin filas y sin marcadores con valor no hay laboratorios de que
// hablar: la llave no viaja (ver la cabecera). En cualquier otro caso viaja
// como siempre, tambien vacia.
const sinLaboratorios = eliteV3.cliente.fecha_toma === null && labValues.filas.length === 0 && marcadoresConValorEnGrupos === 0;

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

// 8-oct-2026 (nivel 2, cold review): cada practica viaja con dos llaves
// DERIVADAS del catalogo, `prioridad` (1..3) y `universal` (bool), para que
// la fila que crea elite_cargar_practicas (329) nazca igual que la que crea la
// app (que-hacer-hoy-service: priority e isUniversal del catalogo). El coach
// no las escribe y el documento no cambia: el validador las ignora y la app,
// al normalizar, se queda con {key, hora, nota}. Sin practicas no se agrega
// nada (un documento Elite viaja igual que antes, con `practicas: []`).
const practicasConCatalogo = practicas.map((p) => {
  const ficha = fichaDePractica.get(p.key);
  const prioridad = ficha && [1, 2, 3].includes(ficha.priority) ? ficha.priority : 2;
  return { ...p, prioridad, universal: !!(ficha && ficha.isUniversal) };
});

const payload = {
  p_user: userId,
  p_payload: {
    ...eliteV3,
    ...(practicas.length ? { practicas: practicasConCatalogo } : {}),
    resumen_argos: resumenArgos,
    suplementos_filas: suplementosFilas,
    roots_detected: raices,
    ...(sinLaboratorios ? {} : { lab_values_filas: labValues.filas }),
    lab_values_omitidos: labValues.omitidos,
  },
};

// Comprobacion de ida y vuelta: quitando los derivados, el objeto que va
// dentro de p_payload debe seguir validando tal cual.
const {
  resumen_argos: _r, suplementos_filas: _s, roots_detected: _t,
  lab_values_filas: _l, lab_values_omitidos: _o, ...deVuelta
} = payload.p_payload;
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
if (esProg) {
  // 8-oct-2026 (nivel 2): la cabecera de un programa. La funcion de la base
  // es la misma (elite_cargar_evaluacion); lo que cambia es lo que se cuenta.
  const ini = eliteV3.inicio;
  console.log(`  tipo:                 programa (nivel 2)${ini.programa_nombre ? `: "${ini.programa_nombre}"` : ', sin nombre'}`);
  console.log(`  cliente:              ${eliteV3.cliente.nombre_preferido} (${eliteV3.cliente.sexo}, ${eliteV3.cliente.edad} anios, ${eliteV3.cliente.fecha_toma ? `toma ${eliteV3.cliente.fecha_toma}` : 'sin toma de sangre'})`);
  console.log(`  user_id destino:      ${userId}`);
  console.log(`  version elite_v3:     ${eliteV3.version}  (debe ser: documentos previos de este cliente, programa o Elite, + 1; el primero es 1)`);
  console.log(`  duracion e inicio:    ${ini.programa_semanas !== null ? `${ini.programa_semanas} semanas` : 'sin duracion (la app usa 52 semanas)'}, ${ini.programa_inicio ? `empieza el ${ini.programa_inicio}` : 'sin inicio declarado (cuenta desde la primera carga)'}`);
  console.log(`  secciones:            ${seccionesPresentes} de ${ELITE_SECCIONES.length}`);
  if (conEvaluacion) {
    console.log(`  evaluacion:           ligera, con contenido (el cliente la lee como "tu evaluacion")`);
    console.log(`  marcadores:           ${marcadores.length} (${att} piden accion)`);
    console.log(`  hallazgos geneticos:  ${eliteV3.genetica.hallazgos.length}`);
    console.log(`  raices detectadas:    ${raices.length}${raices.length ? ` (${raices.map((r) => r.root_key).join(', ')})` : ''}`);
    console.log(`  labs a lab_values:    ${labValues.filas.length} filas (${labValues.omitidos.length} marcadores fuera; fecha ${fechaMedicion ? fechaMedicion.measured_at + (fechaMedicion.diaAsumido ? ', dia 1 asumido' : '') : 'sin fecha'})`);
  } else {
    console.log('  evaluacion:           sin contenido (lo esperado en un programa: el cliente no ve secciones vacias)');
  }
  console.log(`  suplementos (filas):  ${suplementosFilas.length}`);
  console.log(`  practicas asignadas:  ${practicas.length}${practicas.length ? ` (${practicas.map((p) => `${p.key}${p.hora ? ` ${p.hora}` : ''}`).join(', ')})` : ''}`);
  console.log(`  resumen_argos:        ${resumenArgos.length} caracteres (tope ${RESUMEN_ARGOS_MAX})`);
  console.log(`  quality_level:        ${qualityLevel} (${qualityLevel === 5 ? 'con genetica' : 'sin genetica'})`);
} else {
  console.log(`  cliente:              ${eliteV3.cliente.nombre_preferido} (${eliteV3.cliente.sexo}, ${eliteV3.cliente.edad} anios, toma ${eliteV3.cliente.fecha_toma})`);
  console.log(`  user_id destino:      ${userId}`);
  console.log(`  version elite_v3:     ${eliteV3.version}  (debe ser: evaluaciones Elite previas del usuario + 1; la primera es 1)`);
  console.log(`  secciones:            ${seccionesPresentes} de ${ELITE_SECCIONES.length}`);
  console.log(`  marcadores:           ${marcadores.length} (${att} piden accion)`);
  console.log(`  hallazgos geneticos:  ${eliteV3.genetica.hallazgos.length}`);
  console.log(`  suplementos (filas):  ${suplementosFilas.length}`);
  console.log(`  raices detectadas:    ${raices.length}${raices.length ? ` (${raices.map((r) => r.root_key).join(', ')})` : ''}`);
  console.log(`  labs a lab_values:    ${labValues.filas.length} filas (${labValues.omitidos.length} marcadores fuera; fecha ${fechaMedicion ? fechaMedicion.measured_at + (fechaMedicion.diaAsumido ? ', dia 1 asumido' : '') : 'sin fecha'})`);
  console.log(`  resumen_argos:        ${resumenArgos.length} caracteres (tope ${RESUMEN_ARGOS_MAX})`);
  console.log(`  quality_level:        ${qualityLevel} (${qualityLevel === 5 ? 'con genetica' : 'sin genetica'})`);
  // En Elite la linea de practicas solo sale si el documento trae alguna: sin
  // practicas, la salida es la misma de antes del nivel 2.
  if (practicas.length) console.log(`  practicas asignadas:  ${practicas.length} (${practicas.map((p) => `${p.key}${p.hora ? ` ${p.hora}` : ''}`).join(', ')})`);
}
// 21-sep-2026 (325): lo que siembra el perfil y lo que se convierte.
const cli = eliteV3.cliente;
const perfilFaltan = ['fecha_nacimiento', 'estatura_cm', 'peso_kg', 'fc_reposo', 'nivel_fitness'].filter((k) => cli[k] === null || cli[k] === undefined);
const rutinas = eliteV3.entrenamiento.rutinas || [];
const comidas = eliteV3.alimentacion.comidas || [];
const ejercicios = rutinas.reduce((n, r) => n + r.bloques.length, 0);
const conDias = rutinas.filter((r) => Array.isArray(r.dias_semana) && r.dias_semana.length > 0).length;
const conSlug = rutinas.reduce((n, r) => n + r.bloques.filter((b) => typeof b.slug === 'string' && b.slug.length > 0).length, 0);
// reps "limpio" = el que la carga convierte en tiempo para un bloque sin clip
// (misma regla que elite_cargar_rutinas): "8", "8-10", "30 s", "45 min".
const REPS_LIMPIO = /^(\d+(-\d+)?|\d+ ?(s|seg)|\d+ ?min)$/i;
const sinSlugConProsa = rutinas.reduce((n, r) => n + r.bloques.filter((b) => !(typeof b.slug === 'string' && b.slug.length > 0) && !(typeof b.reps === 'string' && REPS_LIMPIO.test(b.reps.trim()))).length, 0);
console.log(`  perfil (325):         ${perfilFaltan.length === 0 ? 'completo (fecha de nacimiento, estatura, peso, FC en reposo, nivel)' : `faltan ${perfilFaltan.join(', ')}`}`);
console.log(`  rutinas (325):        ${rutinas.length}${rutinas.length ? ` (${ejercicios} ejercicios, ${conSlug} con slug del catalogo; ${conDias} con dias de la semana)` : ''}`);
console.log(`  comidas (325):        ${comidas.length}`);
console.log(`  html incluido:        ${typeof eliteV3.html === 'string' ? `si (${eliteV3.html.length} caracteres)` : 'no'}`);
console.log(`  archivo:              ${rutaSalida} (${(tamano / 1024).toFixed(1)} KB)`);
// Avisos (8-sep-2026): lo que se carga incompleto y el cliente va a notar. No
// detienen la carga (el documento es de Enrique, no de este script), pero se
// dicen aqui para que se arreglen ANTES de entregar.
const sinDosis = suplementosFilas.filter((f) => f.dosage === null).length;
const sinMomento = suplementosFilas.filter((f) => f.timing === null).length;
const sinUnidad = marcadores.filter((m) => m.valor !== null && !m.unidad).length;
const sinRangoLab = marcadores.filter((m) => m.rango_lab === null).length;
const sinEvidencia = marcadores.filter((m) => m.evidencia === null).length
  + eliteV3.genetica.hallazgos.filter((h) => h.evidencia === null).length
  + eliteV3.cruces.lista.filter((c) => c.evidencia === null).length;
const avisos = [];
// 8-oct-2026 (nivel 2): en un programa sin evaluacion no hay de donde sacar
// raices; avisarlo seria pedirle al coach algo que ese nivel no lleva. La
// base si lo va a decir (aviso `sin_raices` de la carga): es lo esperado.
if (raices.length === 0 && !(esProg && !conEvaluacion)) avisos.push('roots_detected sale vacio: el Mapa funcional no va a mostrar raices y la agenda no recibe nada. Declaralas en el campo "raices" del elite_v3.');
if (sinDosis) avisos.push(`${sinDosis} suplementos sin dosis: entran como "Sin dosis fijada".`);
if (sinMomento) avisos.push(`${sinMomento} suplementos sin momento: entran sin hora y el cliente los ve en "Sin hora fijada".`);
if (sinUnidad) avisos.push(`${sinUnidad} marcadores con valor y sin unidad: el cliente lee el numero pelon.`);
if (sinRangoLab) avisos.push(`${sinRangoLab} marcadores sin rango del laboratorio: esa columna sale con raya.`);
if (sinEvidencia) avisos.push(`${sinEvidencia} tarjetas sin nivel de evidencia: la escalera no se pinta en ninguna de ellas.`);
// 20-sep-2026 (324): lo que no entra a lab_values se dice aqui, por nombre y
// motivo, ANTES de cargar. Un estimado o una composicion corporal fuera es lo
// esperado; una clave sin equivalente canonico es un marcador que el cliente
// no va a ver en su expediente de labs hasta que se le ponga clave.
const sinClave = labValues.omitidos.filter((m) => m.motivo === 'sin_clave_canonica');
if (sinClave.length) avisos.push(`${sinClave.length} marcadores con valor y sin clave canonica no van a lab_values: ${sinClave.map((m) => `${m.nombre} (${m.key})`).join(', ')}. Se leen en la evaluacion, no en el expediente de labs.`);
const fueraPorTipo = labValues.omitidos.filter((m) => m.motivo !== 'sin_clave_canonica' && m.motivo !== 'sin_valor');
if (fueraPorTipo.length) avisos.push(`${fueraPorTipo.length} marcadores fuera de lab_values por tipo: ${fueraPorTipo.map((m) => `${m.nombre} (${MOTIVO_OMISION_TEXTO[m.motivo]})`).join('; ')}.`);
if (fechaMedicion && fechaMedicion.diaAsumido) avisos.push(`cliente.fecha_toma trae solo el mes: los laboratorios entran con fecha ${fechaMedicion.measured_at} (dia 1 asumido, anotado en metadata). Si tienes el dia exacto, ponlo en el JSON.`);
if (labValues.filas.length && (!eliteV3.alimentacion.metas || (eliteV3.alimentacion.metas.proteina_g_dia === null && eliteV3.alimentacion.metas.agua_ml_dia === null))) avisos.push('alimentacion.metas no trae proteina ni agua con numero: las metas del dia del cliente se quedan como estan.');
// 21-sep-2026 (325): sin estos datos el cliente del dia uno ve "falta tu
// fecha de nacimiento", "sin FC maxima ni reposo no hay estimacion" y nivel
// sin declarar; sin rutinas y comidas el plan se queda como prosa.
if (perfilFaltan.length) avisos.push(`cliente sin ${perfilFaltan.join(', ')}: la carga no los siembra y cardio o fitness se los van a pedir al cliente. Si Enrique los tiene, van en cliente.* del JSON.`);
if (!rutinas.length) avisos.push('entrenamiento.rutinas vacio: no se crea ninguna rutina en Mis rutinas ni agenda semanal; el plan de entrenamiento se lee como prosa en la evaluacion.');
// 21-sep-2026 (ronda de arreglos): el catalogo esta en ingles; sin slug el
// bloque corre como tiempo, y si ademas las reps son prosa el tiempo queda en
// 40 s fijos. Se dice ANTES de cargar para que Enrique ponga el slug o reps
// limpio donde importe.
if (ejercicios && ejercicios - conSlug > 0) avisos.push(`${ejercicios - conSlug} de ${ejercicios} ejercicios sin slug del catalogo: corren como bloque de tiempo, sin clip ni registro de series (exercise_matrix esta en ingles, MoveKit: el nombre en espanol no empareja). Pon "slug" en el bloque con el slug exacto del catalogo (barbell-bench-press, machine-leg-press) donde quieras clip.`);
if (sinSlugConProsa) avisos.push(`${sinSlugConProsa} ejercicios sin slug y con reps en prosa ("10 por lado", "6 reps"): quedan con 40 s fijos por serie. Para que el tiempo salga de las reps escribe reps limpio ("8", "8-10", "30 s", "45 min").`);
if (!comidas.length) avisos.push('alimentacion.comidas vacio: Comida muestra el plan sin comidas por momento.');
// 8-oct-2026 (nivel 2): lo que el cliente de un programa va a notar.
if (esProg) {
  const ini = eliteV3.inicio;
  if (!ini.programa_nombre) avisos.push('inicio.programa_nombre vacio: el cliente lee "Mi programa completo" y "TU PROGRAMA" en vez del nombre de su programa.');
  if (!ini.programa_inicio) avisos.push('inicio.programa_inicio vacio: la semana 1 empieza el dia de la PRIMERA carga de este cliente. Si el programa arranca otro dia (por ejemplo el lunes), ponlo como YYYY-MM-DD.');
  if (ini.programa_semanas === null) avisos.push('inicio.programa_semanas vacio: la app cuenta 52 semanas.');
  if (ini.programa_inicio) {
    // Un anio mal tecleado pasa el validador (es una fecha real) y el cliente
    // amaneceria en la semana 40 o "por empezar" dentro de un anio.
    const dias = Math.round((Date.parse(`${ini.programa_inicio}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000);
    if (dias > 90) avisos.push(`inicio.programa_inicio (${ini.programa_inicio}) cae dentro de ${dias} dias: el cliente va a leer que su programa esta por empezar hasta entonces. Revisa el anio y el mes.`);
    if (dias < -60) avisos.push(`inicio.programa_inicio (${ini.programa_inicio}) fue hace ${-dias} dias: el cliente abre la app ya avanzado en su programa. Revisa el anio y el mes.`);
  }
  if (!practicas.length) avisos.push('practicas vacio: no se asigna ninguna practica; el cliente solo ve las que el mismo elija.');
  if (eliteV3.cliente.fecha_toma === null && marcadoresConValorEnGrupos > 0) avisos.push(`${marcadoresConValorEnGrupos} marcadores con valor y sin cliente.fecha_toma: se leen en el documento, pero NO entran al expediente de laboratorios (la fecha de la muestra no se inventa). Si hubo toma, pon su fecha.`);
  // "Elite" en cualquier texto del documento: el cliente de un programa no
  // debe leer el nombre del otro nivel. El nombre del programa ya lo rechaza
  // el validador; lo demas se avisa con su ruta para corregirlo a mano.
  const conMarca = [];
  const buscar = (v, ruta) => {
    if (typeof v === 'string') { if (/elite/i.test(v)) conMarca.push(ruta); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => buscar(x, `${ruta}[${i}]`)); return; }
    if (v && typeof v === 'object') for (const k of Object.keys(v)) buscar(v[k], ruta ? `${ruta}.${k}` : k);
  };
  const { schema: _sc, html: _ht, ...textosDelDocumento } = eliteV3;
  buscar(textosDelDocumento, '');
  if (conMarca.length) avisos.push(`La palabra "Elite" aparece en ${conMarca.length} texto(s) de este programa: ${conMarca.slice(0, 8).join(', ')}${conMarca.length > 8 ? ' ...' : ''}. El cliente de un programa no debe leerla: cambiala en el documento.`);
  if (typeof eliteV3.html === 'string' && /elite/i.test(eliteV3.html)) avisos.push('El campo html (el PDF) dice "Elite": el cliente lo lee al descargar su PDF. Quita el html o corrigelo.');
}
// Las practicas que el propio catalogo marca como pendientes de validacion:
// el coach puede asignarlas, pero que lo sepa antes de cargar.
const porValidar = practicas.filter((p) => fichaDePractica.get(p.key) && fichaDePractica.get(p.key).requiresClinicalValidation);
if (porValidar.length) avisos.push(`${porValidar.length} practica(s) que el catalogo marca como pendientes de validacion del equipo de ATP: ${porValidar.map((p) => p.key).join(', ')}. Se cargan igual; confirma que si las quieres asignar.`);
if (avisos.length) {
  console.log('');
  console.log('Avisos (el payload se escribio igual; esto se arregla en el documento):');
  for (const a of avisos) console.log(`  - ${a}`);
}
console.log('');
console.log('Siguiente paso: bash scripts/elite/curl-elite.sh cargar "' + rutaSalida + '"');
