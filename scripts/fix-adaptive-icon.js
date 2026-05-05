/**
 * Genera adaptive-icon.png con safe-zone correcta para Android.
 *
 * Android adaptive icon: lienzo de 1024x1024, pero solo el centro 66%
 * está garantizado de no recortarse. Cualquier máscara (círculo, squircle,
 * cuadrado redondeado) puede comer los bordes.
 *
 * Solución: escalar el icono fuente al 65% y centrarlo sobre fondo negro.
 */
const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'images', 'icon.png');
const OUT = path.join(__dirname, '..', 'assets', 'images', 'adaptive-icon.png');

const CANVAS = 1024;
const SAFE_PCT = 0.65; // 65% del lienzo = ~666px, dentro del 66% safe zone
const INNER = Math.round(CANVAS * SAFE_PCT);

(async () => {
  // Trim transparencia/fondo del source para que la molécula quede centrada
  // Luego escalar al safe size manteniendo aspect ratio
  const inner = await sharp(SRC)
    .trim({ threshold: 10 })
    .resize(INNER, INNER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Componer sobre lienzo 1024x1024 negro, centrado
  const offset = Math.round((CANVAS - INNER) / 2);

  await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: '#000000' },
  })
    .composite([{ input: inner, top: offset, left: offset }])
    .png()
    .toFile(OUT);

  console.log(`✔ adaptive-icon.png regenerado: ${INNER}x${INNER} centrado en ${CANVAS}x${CANVAS}`);
})();
