/**
 * bump-app-version.js: sube `expo.version`, `android.versionCode` e
 * `ios.buildNumber` en app.json. Lo llama scripts/release-3.0.ps1; se puede
 * correr solo.
 *
 * Por que un script y no editar a mano: los tres numeros tienen que moverse
 * juntos (regla 11 de CLAUDE.md: cambiar la version obliga a un build nativo
 * inmediato) y `ConvertTo-Json` de PowerShell reescribe el archivo entero
 * (escapa acentos, cambia sangria). Aqui se toca solo lo que cambia y el
 * archivo se escribe igual que estaba (2 espacios, LF, salto final).
 *
 * Uso:
 *   node scripts/release/bump-app-version.js --version 3.0.0            # escribe
 *   node scripts/release/bump-app-version.js --version 3.0.0 --solo-ver # muestra y no toca
 *   node scripts/release/bump-app-version.js --version 3.0.0 --version-code 24 --build-number 6
 * Sin --version-code / --build-number: el siguiente entero de cada uno.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const APP_JSON = path.join(RAIZ, 'app.json');

function arg(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : null;
}
const soloVer = process.argv.includes('--solo-ver');
const versionNueva = arg('version');
if (!versionNueva || !/^\d+\.\d+\.\d+$/.test(versionNueva)) {
  console.error('Uso: node scripts/release/bump-app-version.js --version X.Y.Z [--version-code N] [--build-number N] [--solo-ver]');
  process.exit(2);
}

const partes = (v) => v.split('.').map((n) => parseInt(n, 10));
const mayorQue = (a, b) => {
  const [a1, a2, a3] = partes(a); const [b1, b2, b3] = partes(b);
  return a1 !== b1 ? a1 > b1 : a2 !== b2 ? a2 > b2 : a3 > b3;
};

const crudo = fs.readFileSync(APP_JSON, 'utf8');
const app = JSON.parse(crudo);
const expo = app.expo;
const versionActual = expo.version;
const codeActual = expo.android && expo.android.versionCode;
const buildActual = expo.ios && expo.ios.buildNumber;

if (!mayorQue(versionNueva, versionActual)) {
  console.error(`La version nueva (${versionNueva}) no es mayor que la actual (${versionActual}). No se toca nada.`);
  process.exit(3);
}
if (typeof codeActual !== 'number' || typeof buildActual !== 'string') {
  console.error('app.json no trae android.versionCode (numero) e ios.buildNumber (texto) donde se esperaban. No se toca nada.');
  process.exit(3);
}

const codeNuevo = arg('version-code') ? parseInt(arg('version-code'), 10) : codeActual + 1;
const buildNuevo = arg('build-number') ? String(parseInt(arg('build-number'), 10)) : String(parseInt(buildActual, 10) + 1);
if (!(codeNuevo > codeActual) || !(parseInt(buildNuevo, 10) > parseInt(buildActual, 10))) {
  console.error(`versionCode (${codeActual} -> ${codeNuevo}) y buildNumber (${buildActual} -> ${buildNuevo}) tienen que subir. No se toca nada.`);
  process.exit(3);
}

console.log(`app.json`);
console.log(`  expo.version         ${versionActual} -> ${versionNueva}   (runtimeVersion policy appVersion: el OTA pasa a ${versionNueva})`);
console.log(`  android.versionCode  ${codeActual} -> ${codeNuevo}`);
console.log(`  ios.buildNumber      ${buildActual} -> ${buildNuevo}`);

if (soloVer) { console.log('(--solo-ver: no se escribio nada)'); process.exit(0); }

// Reemplazos quirurgicos sobre el texto: la primera aparicion de cada clave
// dentro de su bloque. Se verifica que cada uno ocurra exactamente una vez.
let s = crudo;
const cambios = [
  [`"version": "${versionActual}"`, `"version": "${versionNueva}"`],
  [`"versionCode": ${codeActual}`, `"versionCode": ${codeNuevo}`],
  [`"buildNumber": "${buildActual}"`, `"buildNumber": "${buildNuevo}"`],
];
for (const [viejo, nuevo] of cambios) {
  const n = s.split(viejo).length - 1;
  if (n !== 1) {
    console.error(`Esperaba exactamente 1 aparicion de ${viejo} en app.json y hay ${n}. No se toca nada.`);
    process.exit(3);
  }
  s = s.replace(viejo, nuevo);
}
const verificado = JSON.parse(s).expo;
if (verificado.version !== versionNueva || verificado.android.versionCode !== codeNuevo || verificado.ios.buildNumber !== buildNuevo) {
  console.error('El resultado no cuadra con lo pedido. No se escribio nada.');
  process.exit(3);
}
fs.writeFileSync(APP_JSON, s, 'utf8');
console.log('app.json escrito. Siguiente paso obligatorio: build nativo (regla 11).');
