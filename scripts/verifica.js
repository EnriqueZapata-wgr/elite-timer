// verifica.js: verificador de sintaxis y candados de ATP. Uso: node /tmp/verifica.js <archivos>
// Corre desde la raiz del repo. Sin compilador: parser de TypeScript + candados de la casa.
const path = require('path'), fs = require('fs');
const ts = require(path.join(process.cwd(), 'node_modules', 'typescript'));
let fallas = 0, avisos = 0;
const PROSA = /\p{L}{2}[^'"`]{0,120}—[^'"`]{0,120}\p{L}{2}/u;
const CADENAS = /(['"`])((?:(?!\1).)*)\1/g;
const REGISTROS = ['app-registry.ts', 'hoy-cards.ts', 'salud-puertas.ts', 'app-icon-names.ts', 'argos-hub.ts'];
for (const f of process.argv.slice(2)) {
  if (!fs.existsSync(f)) { console.log(`FALLA ${f}: no existe`); fallas++; continue; }
  const src = fs.readFileSync(f, 'utf8');
  const esTs = /\.(ts|tsx)$/.test(f);
  if (esTs) {
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ES2020, true, f.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const d = sf.parseDiagnostics || [];
    for (const x of d) {
      const { line, character } = sf.getLineAndCharacterOfPosition(x.start);
      console.log(`FALLA ${f}:${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(x.messageText, ' ')}`);
      fallas++;
    }
  }
  const lineas = src.split(/\r?\n/);
  lineas.forEach((linea, i) => {
    const t = linea.trim();
    const comentario = t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('--');
    if (linea.includes('—') && !comentario) {
      for (const m of linea.matchAll(CADENAS)) {
        if (m[2].includes('—') && PROSA.test(m[2])) { console.log(`FALLA ${f}:${i + 1} em dash en copy: ${m[2].trim().slice(0, 80)}`); fallas++; break; }
      }
    }
    if (/\bcolor:\s*(t|tokens)\.sinDatos\b/.test(linea) || /placeholderTextColor=\{(t|tokens)\.sinDatos\}/.test(linea)) {
      console.log(`FALLA ${f}:${i + 1} sinDatos como tinta`); fallas++;
    }
    if (esTs && /\bas any\b/.test(linea) && !comentario) { console.log(`AVISO ${f}:${i + 1} as any`); avisos++; }
    if (esTs && /console\.log\(/.test(linea) && !comentario && !f.includes('scripts/')) { console.log(`AVISO ${f}:${i + 1} console.log`); avisos++; }
  });
  if (REGISTROS.some((r) => f.endsWith(r)) && /-outline'/.test(src)) { console.log(`FALLA ${f}: nombre -outline en archivo de registro`); fallas++; }
  if (f.endsWith('.sql') && /^\s*(BEGIN|COMMIT)\s*;/mi.test(src) === false && /ALTER|CREATE|UPDATE|INSERT|DELETE/i.test(src)) { console.log(`AVISO ${f}: sin BEGIN/COMMIT propio (el CLI corre en autocommit)`); avisos++; }
  if (!fallas) console.log(`ok    ${f}`);
}
console.log(fallas ? `${fallas} fallas, ${avisos} avisos` : `limpio (${avisos} avisos)`);
process.exit(fallas ? 1 : 0);
