/**
 * Guía de Laboratorios — template HTML del PDF (Sprint LABS GUÍA T2).
 *
 * Puro (sin react-native): genera el HTML que expo-print convierte a PDF
 * on-device. Editorial ATP: fondo blanco para papel/WhatsApp (un PDF negro
 * quema tóner y se lee mal impreso), tipografía sobria, acento lima solo en
 * kickers y precios. Testeable node-only.
 */
import {
  LABS_GUIDE_META,
  LABS_GUIDE_INTRO,
  LABS_PACKAGES,
  LABS_COMERCIALES,
  LABS_COMERCIALES_NOTE,
  LABS_PREPARACION,
  LABS_DESPUES,
} from '@/src/constants/labs-guide-content';

const LIME = '#7fa81f'; // lima oscurecido para legibilidad sobre blanco
const INK = '#111111';
const MUTED = '#555555';

/** Escapa HTML en contenido dinámico (nombre del usuario). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function packageSection(): string {
  return LABS_PACKAGES.map(p => `
    <div class="pkg">
      <div class="pkg-head">
        <span class="pkg-name">${p.name}</span>
        <span class="pkg-price">${p.priceRange}</span>
      </div>
      <p class="pkg-who">${p.forWho}</p>
      <ul>${p.labs.map(l => `<li>${l}</li>`).join('')}</ul>
      ${p.note ? `<p class="pkg-note">⚠ ${p.note}</p>` : ''}
    </div>`).join('');
}

/**
 * HTML completo de la guía. `firstName` personaliza la portada
 * ("Hola, {nombre}." — degrada con gracia si viene vacío).
 */
export function buildLabsGuideHtml(firstName = ''): string {
  const name = firstName.trim();
  const greeting = name ? `Hola, ${escapeHtml(name)}.` : 'Hola.';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: ${INK}; padding: 36px 42px; font-size: 12px; line-height: 1.55; }
  .kicker { font-size: 10px; letter-spacing: 3px; color: ${LIME}; font-weight: 700; text-transform: uppercase; }
  h1 { font-size: 26px; font-weight: 800; margin: 6px 0 2px; letter-spacing: -0.5px; }
  .subtitle { color: ${MUTED}; font-size: 13px; margin-bottom: 4px; }
  .version { color: #999; font-size: 10px; }
  .greeting { margin: 18px 0 6px; font-size: 14px; font-weight: 700; }
  h2 { font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin: 22px 0 8px; border-bottom: 2px solid ${INK}; padding-bottom: 4px; }
  p { margin-bottom: 6px; }
  ul { margin: 4px 0 6px 16px; }
  li { margin-bottom: 2px; }
  .cost { background: #f4f4f4; border-left: 3px solid ${LIME}; padding: 8px 12px; margin-top: 8px; font-weight: 600; }
  .pkg { border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; page-break-inside: avoid; }
  .pkg-head { display: flex; justify-content: space-between; align-items: baseline; }
  .pkg-name { font-size: 13px; font-weight: 800; }
  .pkg-price { color: ${LIME}; font-weight: 800; font-size: 12px; }
  .pkg-who { color: ${MUTED}; font-size: 11px; margin: 3px 0 4px; }
  .pkg-note { font-size: 10.5px; color: #8a6d00; background: #fdf6e3; border-radius: 6px; padding: 6px 8px; margin-top: 6px; }
  .lab-row { margin-bottom: 4px; }
  .lab-name { font-weight: 700; }
  .lab-note { color: ${MUTED}; }
  .tip { background: #f4f4f4; border-radius: 8px; padding: 8px 12px; margin-top: 8px; font-size: 11px; }
  .closing { margin-top: 10px; font-weight: 700; }
  .disclaimer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #ddd; color: #888; font-size: 9.5px; }
  .footer { margin-top: 14px; color: #aaa; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="kicker">ATP · Sistema operativo de rendimiento humano</div>
  <h1>${LABS_GUIDE_META.title}</h1>
  <div class="subtitle">${LABS_GUIDE_META.subtitle}</div>
  <div class="version">${LABS_GUIDE_META.version}</div>

  <p class="greeting">${greeting}</p>

  <h2>${LABS_GUIDE_INTRO.whyTitle}</h2>
  ${LABS_GUIDE_INTRO.why.map(w => `<p>${w}</p>`).join('')}
  <div class="cost">${LABS_GUIDE_INTRO.costNote}</div>

  <h2>Paquetes recomendados</h2>
  ${packageSection()}

  <h2>Dónde hacértelos (México)</h2>
  ${LABS_COMERCIALES.map(l => `<p class="lab-row"><span class="lab-name">${l.name}</span> — <span class="lab-note">${l.note}</span></p>`).join('')}
  <div class="tip">${LABS_COMERCIALES_NOTE}</div>

  <h2>Cómo prepararte</h2>
  <ul>${LABS_PREPARACION.map(x => `<li>${x}</li>`).join('')}</ul>

  <h2>${LABS_DESPUES.title}</h2>
  <ul>${LABS_DESPUES.steps.map(x => `<li>${x}</li>`).join('')}</ul>
  <p class="closing">${LABS_DESPUES.closing}</p>

  <p class="disclaimer">${LABS_GUIDE_META.disclaimer}</p>
  <div class="footer">Generado desde la app ATP</div>
</body>
</html>`;
}
