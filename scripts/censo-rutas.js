#!/usr/bin/env node
/**
 * CENSO DE RUTAS — el detector de huérfanas.
 *
 * Una huérfana es una pantalla de `app/` a la que ningún lugar del código lleva.
 * Existe, compila, funciona... y nadie puede llegar a ella. Ya nos pasó al
 * remodelar: el cuidado no basta, hace falta un script.
 *
 * Cómo cuenta una puerta:
 *   1. Cualquier string entrecomillado que empiece con `/` en el código fuente.
 *      No basta con mirar `router.push`: las rutas viven en campos `route:` de
 *      arreglos de configuración (hoy-cards.ts, app-registry.ts, salud-puertas.ts).
 *      Un detector que solo mire `router.push` da decenas de falsos positivos.
 *   2. El registro de un tab en su `_layout` (`<Tabs.Screen name="x" />`).
 *      Los `<Stack.Screen>` NO cuentan: ahí solo se configura la animación,
 *      no se abre una puerta.
 *
 * Reglas de resolución:
 *   - Los grupos `(tabs)` se aceptan con y sin paréntesis.
 *   - Las rutas dinámicas `[param]` se resuelven por su padre: una referencia
 *     con la misma forma y cualquier valor en la posición dinámica cuenta,
 *     salvo que ese valor sea una hermana estática.
 *   - `?query` y `#hash` se recortan; `${...}` de plantilla vale como comodín.
 *
 * Salida:
 *   - código 0 si toda huérfana está en la lista blanca con su motivo escrito.
 *   - código 1 si aparece una huérfana NUEVA.
 *
 * Uso:
 *   npm run censo                el reporte y el código de salida
 *   npm run censo -- --json      volcado completo, para analizar
 *   npm run censo -- --recorrido la lista de "ruta → desde dónde se llega",
 *                                que es con lo que se hace el recorrido en
 *                                dispositivo: llegar a TODAS las funciones.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const ALLOWLIST_FILE = path.join(__dirname, 'censo-permitidas.json');

/** Carpetas donde puede vivir una referencia a una ruta. */
const SOURCE_DIRS = ['app', 'src', 'components', 'constants', 'hooks', 'services', 'types', 'plugins', 'supabase/functions'];
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.expo', 'dist', 'build', '__snapshots__']);

/**
 * Un test que menciona una ruta NO es una puerta: nadie navega desde una suite.
 * Contarlos escondía cuatro pantallas de verdad sin acceso.
 */
const isTestFile = (rel) => rel.includes('__tests__/') || /\.(test|spec)\.[jt]sx?$/.test(rel);

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Enumerar las rutas de app/
// ─────────────────────────────────────────────────────────────────────────────

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

/** Normaliza una ruta: colapsa `//`, quita la diagonal final. */
function normalizeRoute(r) {
  const cleaned = r.replace(/\/+/g, '/').replace(/\/$/, '');
  return cleaned === '' ? '/' : cleaned;
}

const isGroup = (seg) => /^\(.+\)$/.test(seg);
const isDynamic = (seg) => /^\[.+\]$/.test(seg);

/**
 * Un archivo de `app/` → su ruta pública, en dos formas: con grupos
 * (`/(tabs)/kit`) y sin ellos (`/kit`). Las dos se aceptan como referencia.
 */
function fileToRoute(abs) {
  const rel = path.relative(APP_DIR, abs).split(path.sep).join('/');
  const noExt = rel.replace(/\.(tsx|ts|jsx|js)$/, '');
  const segs = noExt.split('/');
  if (segs[segs.length - 1] === 'index') segs.pop();
  const withGroups = normalizeRoute('/' + segs.join('/'));
  const noGroups = normalizeRoute('/' + segs.filter((s) => !isGroup(s)).join('/'));
  return {
    file: rel,
    withGroups,
    noGroups,
    // Para el matching por segmentos usamos la forma sin grupos.
    segments: noGroups === '/' ? [] : noGroups.slice(1).split('/'),
    dynamic: segs.some(isDynamic),
  };
}

function collectRoutes() {
  return walk(APP_DIR)
    .filter((f) => SOURCE_EXT.has(path.extname(f)))
    .filter((f) => {
      const base = path.basename(f);
      // `_layout`, `+not-found`, `+html` y demás archivos especiales no son destinos.
      return !base.startsWith('_') && !base.startsWith('+');
    })
    .map(fileToRoute)
    .sort((a, b) => a.noGroups.localeCompare(b.noGroups));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Extraer los strings del código (tokenizador, no regex)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recorre el archivo carácter por carácter distinguiendo código, comentarios y
 * los tres tipos de string. Un regex ingenuo confundiría `https://` con un
 * comentario y capturaría rutas mencionadas en la documentación de cabecera,
 * que no son puertas.
 *
 * En las plantillas, `${...}` se sustituye por `[param]`: `/perfil/${id}`
 * queda como `/perfil/[param]`, que es exactamente lo que resuelve la
 * ruta dinámica.
 *
 * Devuelve cada string con la línea donde empieza: la línea es lo que después
 * se mira para decidir si el string se está NAVEGANDO o solo mencionando.
 */
function extractStrings(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  let line = 1;

  while (i < n) {
    const c = src[i];

    if (c === '\n') { line++; i++; continue; }

    // Comentario de línea
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    // Comentario de bloque
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      i += 2;
      continue;
    }
    // String simple o doble
    if (c === "'" || c === '"') {
      const quote = c;
      const startLine = line;
      let buf = '';
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') { buf += src[i + 1] ?? ''; i += 2; continue; }
        if (src[i] === '\n') break; // string sin cerrar: abortar
        buf += src[i];
        i++;
      }
      i++;
      out.push({ value: buf, line: startLine });
      continue;
    }
    // Plantilla
    if (c === '`') {
      const startLine = line;
      let buf = '';
      i++;
      while (i < n && src[i] !== '`') {
        if (src[i] === '\\') { buf += src[i + 1] ?? ''; i += 2; continue; }
        if (src[i] === '\n') { line++; buf += src[i]; i++; continue; }
        if (src[i] === '$' && src[i + 1] === '{') {
          // Saltar la interpolación completa contando llaves.
          let depth = 1;
          i += 2;
          while (i < n && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            else if (src[i] === '\n') line++;
            i++;
          }
          buf += '[param]';
          continue;
        }
        buf += src[i];
        i++;
      }
      i++;
      out.push({ value: buf, line: startLine });
      continue;
    }
    i++;
  }
  return out;
}

/** `<Tabs.Screen name="x" />` → el nombre. Los `<Stack.Screen>` se ignoran. */
function extractTabNames(src) {
  const names = [];
  const re = /<Tabs\.Screen[^>]*?\bname\s*=\s*["']([^"']+)["']/gs;
  let m;
  while ((m = re.exec(src)) !== null) names.push(m[1]);
  return names;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b · Las dos reglas que separan NAVEGAR de MENCIONAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * REGLA 1 · Forma de navegación.
 *
 * Que un string se parezca a una ruta no significa que alguien la abra. El
 * audit de MB-19 lo demostró con dos ejemplos que el censo estaba aceptando:
 *
 *   p.startsWith('/mente')          predicado para ESCONDER el botón flotante
 *   console.log('/admin/reports')   una traza
 *
 * Ese falso positivo dejó pasar el bloqueador del run: el pilar Mente se quedó
 * sin puerta y el censo dijo verde. Ahora la línea donde vive el string tiene
 * que contener, además, una forma de navegar.
 *
 * Cubre las formas reales del proyecto: router.push/replace/navigate/dismissTo,
 * <Redirect>, <Link>, href=, pathname:, y el campo `route:` de los arreglos de
 * configuración (hoy-cards, app-registry, salud-puertas), que es como se
 * declaran la mayoría de las puertas.
 */
const NAV_FORMS = [
  /\brouter\s*\.\s*(push|replace|navigate|dismissTo|prefetch)\b/,
  /\bnavigation\s*\.\s*(push|replace|navigate)\b/,
  /<\s*Redirect\b/,
  /<\s*Link\b/,
  // Las que llevan valor EXIGEN el valor. `pathname:` a secas también casaba
  // con la firma `isMentePillarPath(pathname: string)`, y por ESE hueco pasó el
  // bloqueador del run: un predicado que esconde un botón acreditaba una puerta.
  /\bhref\s*[=:]\s*[{'"`]/i,
  /\bpathname\s*:\s*['"`]/,
  /\broute\s*:\s*['"`]/,
  /\bdeepLink\s*[=:]\s*['"`]/i,
  // El tipo `Href` de expo-router en posición de anotación. Cubre las tres
  // formas reales del proyecto: la tabla tipada
  // (`const DATA_CAPTURE_ROUTES: Record<string, Href> = {`), la envuelta en
  // otro genérico (`Partial<Record<DxMissingKey, Href>>`) y la función que
  // fabrica la ruta (`function v2Route(step): Href { return \`/…\` }`), que es
  // por donde pasa el onboarding entero. Las líneas de import ya se filtraron,
  // así que un `import type { Href }` no acredita nada.
  /:\s*[^=;{]*\bHref\b/,
  // Un identificador que ES una ruta: `setOnboardingRoute('/…')`,
  // `redirectTo = '/…'`. Se navega guardando la ruta en una variable y
  // empujándola después, y eso sigue siendo una puerta. Deliberadamente en
  // inglés (route/href/redirect/navigate, el vocabulario de expo-router): un
  // `const rutas = [...]` en español NO es navegar.
  /\b\w*(?:[Rr]oute|[Hh]ref|[Rr]edirect|[Nn]avigate)\w*\s*[=(]\s*[[{'"`]/,
];

/**
 * La ventana de líneas que se mira. La forma de navegar casi siempre está en
 * la misma línea; se miran unas pocas hacia arriba para no castigar a las
 * llamadas partidas en varias líneas ni a las tablas tipadas, donde el `Href`
 * está en la línea de la declaración y las rutas debajo.
 */
const NAV_WINDOW = 6;

function hasNavForm(lines, lineNumber, aliases = []) {
  const from = Math.max(0, lineNumber - NAV_WINDOW);
  const chunk = lines
    .slice(from, lineNumber)
    // Las líneas de import se descartan: `import type { Href } from 'expo-router'`
    // no navega a ningún lado, solo trae el tipo.
    .filter((l) => !/^\s*(?:import|export)\b[\s\S]*\bfrom\s*['"]/.test(l))
    .join('\n');
  if (NAV_FORMS.some((re) => re.test(chunk))) return true;
  // Atajo local del archivo: `const go = (route: Href) => router.push(route)`
  // y luego `go('/reports')`. Sin esto, un helper de tres letras convierte una
  // puerta real en una huérfana falsa, y una alarma que miente se deja de leer.
  return aliases.length > 0 && new RegExp(`\\b(?:${aliases.join('|')})\\s*\\(`).test(chunk);
}

/**
 * Los alias de navegación declarados EN ESTE archivo: nombres que envuelven a
 * `router.push` y compañía. Se buscan por archivo porque son locales.
 */
const ALIAS_RES = [
  /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*(?:\{[\s\S]{0,200}?)?router\s*\.\s*(?:push|replace|navigate|dismissTo)/g,
  /\bfunction\s+(\w+)\s*\([^)]*\)\s*(?::[^{]*)?\{[\s\S]{0,300}?router\s*\.\s*(?:push|replace|navigate|dismissTo)/g,
];

function navAliases(src) {
  const found = new Set();
  for (const re of ALIAS_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) found.add(m[1]);
  }
  return [...found];
}

/**
 * REGLA 2 · Solo cuentan los archivos que alguien importa.
 *
 * El audit creó `src/_zz/muerto.ts`, un archivo que nadie importa, con tres
 * rutas dentro de un arreglo: las huérfanas bajaron de 8 a 5. Un archivo
 * muerto no puede abrir una puerta.
 *
 * Las raíces son las pantallas de `app/` (con expo-router, cada archivo de
 * ahí es un punto de entrada por sí mismo) y las edge functions. Desde ahí se
 * sigue el grafo de imports.
 */
function resolveImport(fromAbs, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromAbs), spec);
  else return null; // paquete de node_modules

  const candidates = [base];
  for (const ext of SOURCE_EXT) candidates.push(base + ext);
  for (const ext of SOURCE_EXT) candidates.push(path.join(base, 'index' + ext));
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch { /* siguiente candidato */ }
  }
  return null;
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]{0,300}?from\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function importedFiles(abs, src) {
  const out = [];
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const spec = m[1] || m[2] || m[3];
    if (!spec) continue;
    const resolved = resolveImport(abs, spec);
    if (resolved && SOURCE_EXT.has(path.extname(resolved))) out.push(resolved);
  }
  return out;
}

/** Los archivos alcanzables desde una pantalla o una edge function. */
function reachableFiles(allFiles, sources) {
  const isRoot = (abs) => {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    return rel.startsWith('app/') || rel.startsWith('supabase/functions/');
  };
  const seen = new Set();
  const queue = allFiles.filter(isRoot);
  for (const f of queue) seen.add(f);
  while (queue.length > 0) {
    const abs = queue.shift();
    const src = sources.get(abs);
    if (src === undefined) continue;
    for (const dep of importedFiles(abs, src)) {
      if (!seen.has(dep)) { seen.add(dep); queue.push(dep); }
    }
  }
  return seen;
}

function collectReferences() {
  const refs = new Map(); // ruta normalizada → Set de archivos que la citan
  const tabRegistrations = new Set();

  const files = SOURCE_DIRS.flatMap((d) => walk(path.join(ROOT, d))).filter((f) =>
    SOURCE_EXT.has(path.extname(f))
  );

  const sources = new Map();
  for (const abs of files) {
    try { sources.set(abs, fs.readFileSync(abs, 'utf8')); } catch { /* ilegible */ }
  }

  const vivos = reachableFiles(files, sources);
  const muertos = [];

  for (const abs of files) {
    const src = sources.get(abs);
    if (src === undefined) continue;
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (isTestFile(rel)) continue;

    // REGLA 2: un archivo que nadie importa no abre puertas.
    if (!vivos.has(abs)) {
      if (extractStrings(src).some((s) => s.value.startsWith('/'))) muertos.push(rel);
      continue;
    }

    const lines = src.split('\n');
    const aliases = navAliases(src);
    for (const raw of extractStrings(src)) {
      if (!raw.value.startsWith('/')) continue;
      // REGLA 1: mencionar no es navegar.
      if (!hasNavForm(lines, raw.line, aliases)) continue;
      // Recortar query y hash: `/onboarding/voice-config?mode=backfill` → la ruta.
      const clean = normalizeRoute(raw.value.split('?')[0].split('#')[0]);
      if (!clean.startsWith('/')) continue;
      if (!refs.has(clean)) refs.set(clean, new Set());
      refs.get(clean).add(rel);
    }

    // Registro de tabs: `app/(tabs)/_layout.tsx` + name="kit" → `/(tabs)/kit`.
    if (path.basename(abs).startsWith('_layout')) {
      const dirRel = path.relative(APP_DIR, path.dirname(abs)).split(path.sep).join('/');
      for (const name of extractTabNames(src)) {
        const joined = normalizeRoute('/' + [dirRel, name].filter(Boolean).join('/'));
        const segs = joined.slice(1).split('/').filter(Boolean);
        if (segs[segs.length - 1] === 'index') segs.pop();
        tabRegistrations.add(normalizeRoute('/' + segs.filter((s) => !isGroup(s)).join('/')));
      }
    }
  }

  return { refs, tabRegistrations, muertos };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Cruzar rutas contra referencias
// ─────────────────────────────────────────────────────────────────────────────

function audit() {
  const routes = collectRoutes();
  const { refs, tabRegistrations, muertos } = collectReferences();

  const staticRouteSet = new Set();
  for (const r of routes) {
    if (r.dynamic) continue;
    staticRouteSet.add(r.noGroups);
    staticRouteSet.add(r.withGroups);
  }

  const result = [];

  for (const r of routes) {
    const sources = new Set();

    // (a) Referencia literal, con o sin el grupo.
    for (const form of [r.noGroups, r.withGroups]) {
      if (refs.has(form)) for (const f of refs.get(form)) sources.add(f);
    }

    // (b) Matching por forma, en las dos direcciones:
    //
    //     · La ruta es dinámica (`/comunidad/perfil/[userId]`) → la resuelve su
    //       padre: cualquier referencia con la misma forma sirve, salvo que en
    //       la posición dinámica traiga el nombre de una hermana estática
    //       (`/salud/intervenciones/rationale` es su propia pantalla, no un `[key]`).
    //
    //     · La referencia es dinámica (`v2Route()` devuelve `/onboarding/v2/${step}`
    //       → se captura como `/onboarding/v2/[param]`) → abre TODAS las pantallas
    //       estáticas de esa forma. Es una puerta de verdad: por ahí pasa el
    //       onboarding entero. Se exige al menos un segmento literal, para que
    //       un `/${a}/${b}` no declare cubierta media app.
    if (sources.size === 0) {
      for (const [ref, files] of refs) {
        const refSegs = ref === '/' ? [] : ref.slice(1).split('/');
        if (refSegs.length !== r.segments.length || refSegs.length === 0) continue;
        const refIsDynamic = refSegs.some(isDynamic);
        if (!r.dynamic && !refIsDynamic) continue;          // caso (a), ya resuelto
        if (refIsDynamic && refSegs.every(isDynamic)) continue; // comodín total: no cuenta
        if (r.dynamic && !refIsDynamic && staticRouteSet.has(ref)) continue;
        const same = r.segments.every((seg, idx) =>
          isDynamic(seg) || isDynamic(refSegs[idx]) ? refSegs[idx].length > 0 : refSegs[idx] === seg
        );
        if (same) for (const f of files) sources.add(f);
      }
    }

    // (c) Registro como tab en su `_layout`.
    const isTab = tabRegistrations.has(r.noGroups);
    if (isTab) sources.add('(tab en _layout)');

    result.push({ ...r, sources: [...sources], reached: sources.size > 0 });
  }

  result.muertos = muertos;
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Aviso secundario: puertas que cuelgan de una huérfana
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una referencia que sale de una pantalla huérfana no es una puerta de verdad:
 * nadie llega a esa pantalla para tocarla. No tumba el censo (la regla acordada
 * es la de arriba) pero se avisa, porque es exactamente el agujero por donde se
 * cuela una feature en un rediseño.
 */
function danglingDoors(routes) {
  const orphanFiles = new Set(routes.filter((r) => !r.reached).map((r) => 'app/' + r.file));
  const dangling = [];
  for (const r of routes) {
    if (!r.reached || r.sources.length === 0) continue;
    const real = r.sources.filter((f) => !orphanFiles.has(f));
    if (real.length === 0) dangling.push({ route: r.noGroups, via: r.sources });
  }
  return dangling;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Reporte
// ─────────────────────────────────────────────────────────────────────────────

function loadAllowlist() {
  try {
    const json = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf8'));
    return json.permitidas || {};
  } catch {
    return {};
  }
}

/**
 * Las cinco salas del tab bar. Nombrarlas hace legible el recorrido: lo que
 * importa al caminar la app no es qué archivo abre una ruta, sino desde cuál
 * de las cinco puertas de entrada se llega.
 */
const SALAS = {
  'app/(tabs)/index.tsx': 'HOY',
  'app/(tabs)/kit.tsx': 'ATP',
  'app/(tabs)/salud.tsx': 'SALUD',
  'app/(tabs)/tribu.tsx': 'TRIBU',
  'app/(tabs)/argos.tsx': 'ORBE',
};

/** El recorrido en Markdown: una fila por ruta con sus puertas. */
function printRecorrido(routes, allowed) {
  const orphans = routes.filter((r) => !r.reached);
  console.log(`# Recorrido de las ${routes.length} rutas de ATP`);
  console.log('');
  console.log('Generado con `npm run censo -- --recorrido`. Cada renglón dice desde dónde');
  console.log('se llega. Es la lista con la que se camina la app para comprobar que ninguna');
  console.log('función quedó sin acceso.');
  console.log('');
  console.log('| Ruta | Se llega desde |');
  console.log('|---|---|');
  for (const r of routes) {
    if (!r.reached) continue;
    const via = r.sources
      .map((sc) => (SALAS[sc] ? `**${SALAS[sc]}**` : sc.replace(/^app\//, '').replace(/\.tsx?$/, '')))
      .slice(0, 4)
      .join(' · ');
    // Se imprime la forma CON grupo: `/` y `/(tabs)` son dos archivos distintos
    // (el redirect de arranque y el HOY) y en la lista sin grupos se ven igual.
    console.log(`| \`${r.withGroups}\` | ${via}${r.sources.length > 4 ? ' y más' : ''} |`);
  }
  console.log('');
  console.log(`## Sin puerta, a propósito (${orphans.length})`);
  console.log('');
  for (const o of orphans) console.log(`- \`${o.noGroups}\` — ${allowed[o.noGroups] ?? 'SIN MOTIVO ESCRITO'}`);
}

function main() {
  const wantJson = process.argv.includes('--json');
  const wantRecorrido = process.argv.includes('--recorrido');
  const routes = audit();
  const allowed = loadAllowlist();

  if (wantRecorrido) {
    printRecorrido(routes, allowed);
    process.exit(0);
  }

  const orphans = routes.filter((r) => !r.reached);
  const nuevas = orphans.filter((r) => !allowed[r.noGroups]);
  const resueltas = Object.keys(allowed).filter((k) => !orphans.some((o) => o.noGroups === k));
  const dangling = danglingDoors(routes);

  if (wantJson) {
    console.log(JSON.stringify({ total: routes.length, orphans: orphans.map((o) => o.noGroups), nuevas: nuevas.map((o) => o.noGroups), resueltas, dangling, routes }, null, 2));
    process.exit(nuevas.length > 0 ? 1 : 0);
  }

  console.log('');
  console.log('  CENSO DE RUTAS');
  console.log('  ' + '─'.repeat(56));
  console.log(`  Rutas en app/          ${routes.length}`);
  console.log(`  Con puerta             ${routes.length - orphans.length}`);
  console.log(`  Sin puerta             ${orphans.length}`);
  console.log(`  En la lista blanca     ${orphans.length - nuevas.length}`);
  console.log('');

  if (orphans.length > 0) {
    console.log('  SIN PUERTA');
    for (const o of orphans) {
      const motivo = allowed[o.noGroups];
      console.log(`    ${motivo ? '·' : '✗'} ${o.noGroups}`);
      if (motivo) console.log(`        ${motivo}`);
    }
    console.log('');
  }

  if (resueltas.length > 0) {
    console.log('  YA TIENEN PUERTA (sobran en la lista blanca)');
    for (const r of resueltas) console.log(`    · ${r}`);
    console.log('');
  }

  if (dangling.length > 0) {
    console.log('  AVISO · puertas que cuelgan de una pantalla sin puerta');
    for (const d of dangling) console.log(`    ! ${d.route}  ←  ${d.via.join(', ')}`);
    console.log('');
  }

  if (routes.muertos.length > 0) {
    console.log('  AVISO · archivos con rutas dentro que NADIE importa');
    console.log('  (no cuentan como puerta; o se cablean o se borran)');
    for (const m of routes.muertos) console.log(`    ! ${m}`);
    console.log('');
  }

  if (nuevas.length > 0) {
    console.log(`  HUÉRFANAS NUEVAS: ${nuevas.length}`);
    for (const o of nuevas) console.log(`    ✗ ${o.noGroups}   (app/${o.file})`);
    console.log('');
    console.log('  Dale una puerta, o agrégala a scripts/censo-permitidas.json con su motivo.');
    console.log('');
    process.exit(1);
  }

  console.log('  CENSO EN VERDE. Ninguna huérfana nueva.');
  console.log('');
  process.exit(0);
}

// Solo corre si se invoca directo. Al importarlo (los tests) se exponen las
// piezas sin ejecutar nada: el audit encontró que el guardián no tenía quien
// lo guardara, y las dos reglas de abajo son las que dejaron pasar el
// bloqueador de MB-19.
module.exports = {
  hasNavForm, navAliases, NAV_FORMS, NAV_WINDOW,
  extractStrings, normalizeRoute, fileToRoute,
  resolveImport, importedFiles,
  audit, collectRoutes, collectReferences,
};

if (require.main === module) main();
