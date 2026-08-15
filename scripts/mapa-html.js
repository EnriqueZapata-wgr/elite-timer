#!/usr/bin/env node
/**
 * mapa-html — el visor del mapa de la app.
 *
 * Hermano del Excel: el Excel es para CONFIGURAR (ahi va el criterio de
 * Enrique), esto es para VER. Un archivo, sin dependencias, con las capturas
 * de oscuro y claro lado a lado por pantalla.
 *
 * Vive en .maestro/ a proposito: las rutas de las imagenes son relativas a
 * .maestro/capturas/, asi que el HTML tiene que quedar junto a esa carpeta.
 *
 * USO
 *   node scripts/mapa-html.js
 *   luego abre .maestro/mapa-app.html
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, '.maestro', 'mapa-app.json'), 'utf8'));

const filas = datos.filas;
const secciones = [...new Set(filas.map((f) => f.seccion))].sort();
const someras = filas.filter((f) => f.profundidad !== null && f.profundidad <= 2).length;
const planas = filas.filter((f) => f.seccion === '(raiz plana)').length;
const colores = filas.reduce((s, f) => s + f.coloresCriticos, 0);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mapa de la app ATP</title>
<style>
  :root {
    --fondo: #0A0C0B; --card: #141816; --borde: #232926;
    --texto: #F2F5F3; --tenue: #8A9490; --lima: #A8E02A; --alerta: #E0602A;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--fondo); color: var(--texto);
    font: 14px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  header { padding: 28px 32px 20px; border-bottom: 1px solid var(--borde); }
  h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: 0.02em; }
  .sub { color: var(--tenue); font-size: 13px; }
  .kpis { display: flex; gap: 32px; margin-top: 20px; flex-wrap: wrap; }
  .kpi b { display: block; font-size: 26px; color: var(--lima); font-variant-numeric: tabular-nums; }
  .kpi span { font-size: 12px; color: var(--tenue); text-transform: uppercase; letter-spacing: 0.08em; }
  .kpi.alerta b { color: var(--alerta); }

  .barra {
    position: sticky; top: 0; z-index: 10; background: rgba(10,12,11,0.96);
    backdrop-filter: blur(8px); padding: 14px 32px; border-bottom: 1px solid var(--borde);
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  }
  input, select {
    background: var(--card); color: var(--texto); border: 1px solid var(--borde);
    border-radius: 8px; padding: 8px 11px; font: inherit; font-size: 13px;
  }
  input { min-width: 210px; }
  label.chk { display: flex; align-items: center; gap: 6px; color: var(--tenue); font-size: 13px; cursor: pointer; }
  #cuenta { margin-left: auto; color: var(--tenue); font-size: 13px; font-variant-numeric: tabular-nums; }

  main { padding: 24px 32px 80px; display: grid; gap: 16px;
         grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }
  .pant { background: var(--card); border: 1px solid var(--borde); border-radius: 12px;
          overflow: hidden; display: flex; flex-direction: column; }
  .pant h2 { margin: 0; padding: 13px 14px 9px; font-size: 14px; font-weight: 600;
             font-family: ui-monospace, "Cascadia Code", monospace; word-break: break-all; }
  .badges { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 14px 11px; }
  .b { font-size: 11px; padding: 3px 8px; border-radius: 20px; border: 1px solid var(--borde);
       color: var(--tenue); white-space: nowrap; }
  .b.ok { color: var(--lima); border-color: rgba(168,224,42,0.4); }
  .b.mal { color: var(--alerta); border-color: rgba(224,96,42,0.45); }
  .caps { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--borde); }
  .cap { position: relative; background: #000; aspect-ratio: 9/19.5; overflow: hidden; cursor: zoom-in; }
  .cap img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
  .cap .et { position: absolute; top: 6px; left: 6px; font-size: 10px; letter-spacing: 0.1em;
             text-transform: uppercase; background: rgba(0,0,0,0.65); padding: 2px 6px;
             border-radius: 4px; color: #fff; }
  .cap.falta { display: flex; align-items: center; justify-content: center;
               color: var(--tenue); font-size: 12px; cursor: default; }
  .desc { padding: 11px 14px 14px; font-size: 12px; color: var(--tenue); border-top: 1px solid var(--borde); }

  #lupa { position: fixed; inset: 0; background: rgba(0,0,0,0.94); display: none;
          align-items: center; justify-content: center; z-index: 100; cursor: zoom-out; padding: 20px; }
  #lupa img { max-width: 100%; max-height: 100%; object-fit: contain; }
  #lupa.on { display: flex; }
</style>
</head>
<body>
<header>
  <h1>Mapa de la app ATP</h1>
  <div class="sub">${filas.length} pantallas &middot; generado el ${datos.generado.slice(0, 10)} &middot; el criterio se llena en MAPA_APP_ATP.xlsx</div>
  <div class="kpis">
    <div class="kpi"><b>${filas.length}</b><span>pantallas</span></div>
    <div class="kpi"><b>${someras}</b><span>a 2 toques o menos</span></div>
    <div class="kpi alerta"><b>${planas}</b><span>planas en la raiz</span></div>
    <div class="kpi alerta"><b>${colores}</b><span>colores clavados</span></div>
    <div class="kpi"><b>${secciones.length}</b><span>secciones reales</span></div>
  </div>
</header>

<div class="barra">
  <input id="q" placeholder="Buscar ruta...">
  <select id="sec"><option value="">Todas las secciones</option>${
    secciones.map((s) => `<option>${s}</option>`).join('')
  }</select>
  <select id="prof">
    <option value="">Cualquier profundidad</option>
    <option value="somera">A 2 toques o menos</option>
    <option value="honda">A 3 toques o mas</option>
    <option value="sin">Sin camino trazable</option>
  </select>
  <label class="chk"><input type="checkbox" id="soloColor"> Solo con colores clavados</label>
  <label class="chk"><input type="checkbox" id="soloDif"> Solo si claro y oscuro difieren mucho</label>
  <span id="cuenta"></span>
</div>

<main id="grid"></main>
<div id="lupa"><img alt=""></div>

<script>
const FILAS = ${JSON.stringify(filas.map((f) => ({
  r: f.ruta, s: f.seccion, p: f.profundidad, c: f.coloresCriticos, l: f.lineas,
  e: f.enlazadaDesde.length, a: f.enlazaA.length,
  o: f.capturas.oscuro && f.capturas.oscuro.existe ? f.capturas.oscuro : null,
  k: f.capturas.claro && f.capturas.claro.existe ? f.capturas.claro : null,
})))};

const grid = document.getElementById('grid');
const lupa = document.getElementById('lupa');

function cap(c, etiqueta) {
  if (!c) return '<div class="cap falta">sin captura</div>';
  return '<div class="cap" data-src="' + c.rel + '"><span class="et">' + etiqueta +
         '</span><img loading="lazy" src="' + c.rel + '" alt=""></div>';
}

function pintar() {
  const q = document.getElementById('q').value.toLowerCase();
  const sec = document.getElementById('sec').value;
  const prof = document.getElementById('prof').value;
  const soloColor = document.getElementById('soloColor').checked;
  const soloDif = document.getElementById('soloDif').checked;

  const vis = FILAS.filter(f => {
    if (q && !f.r.toLowerCase().includes(q)) return false;
    if (sec && f.s !== sec) return false;
    if (prof === 'somera' && !(f.p !== null && f.p <= 2)) return false;
    if (prof === 'honda' && !(f.p !== null && f.p >= 3)) return false;
    if (prof === 'sin' && f.p !== null) return false;
    if (soloColor && f.c === 0) return false;
    // "Difieren mucho": una de las dos capturas pesa menos de la mitad que la
    // otra. Proxy burdo de "una de las dos no pinto lo mismo".
    if (soloDif) {
      if (!f.o || !f.k) return false;
      const min = Math.min(f.o.kb, f.k.kb), max = Math.max(f.o.kb, f.k.kb);
      if (min > max * 0.5) return false;
    }
    return true;
  });

  document.getElementById('cuenta').textContent = vis.length + ' de ' + FILAS.length;
  grid.innerHTML = vis.map(f => {
    const prof = f.p === null ? '<span class="b mal">sin camino</span>'
      : '<span class="b ' + (f.p <= 2 ? 'ok' : f.p >= 4 ? 'mal' : '') + '">' +
        (f.p === 0 ? 'es un tab' : f.p + ' toque' + (f.p > 1 ? 's' : '')) + '</span>';
    const col = f.c > 0 ? '<span class="b ' + (f.c >= 15 ? 'mal' : '') + '">' + f.c + ' colores</span>' : '';
    return '<article class="pant"><h2>' + f.r + '</h2>' +
      '<div class="badges">' + prof + col +
        '<span class="b">' + f.s + '</span>' +
        '<span class="b">' + f.l + ' lineas</span>' +
      '</div>' +
      '<div class="caps">' + cap(f.o, 'oscuro') + cap(f.k, 'claro') + '</div>' +
      '<div class="desc">' + f.e + ' entran &middot; ' + f.a + ' salen</div>' +
      '</article>';
  }).join('');
}

grid.addEventListener('click', e => {
  const c = e.target.closest('.cap[data-src]');
  if (!c) return;
  lupa.querySelector('img').src = c.dataset.src;
  lupa.classList.add('on');
});
lupa.addEventListener('click', () => lupa.classList.remove('on'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') lupa.classList.remove('on'); });

['q', 'sec', 'prof', 'soloColor', 'soloDif'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', pintar);
  el.addEventListener('change', pintar);
});
pintar();
</script>
</body>
</html>`;

const destino = path.join(RAIZ, '.maestro', 'mapa-app.html');
fs.writeFileSync(destino, html, 'utf8');
console.log(`  escrito: .maestro/mapa-app.html  (${Math.round(html.length / 1024)} KB)`);
console.log(`  abrelo con:  start .maestro\\mapa-app.html`);
