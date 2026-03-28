/**
 * Genera favicon.png optimizado (32x32) desde icon.png.
 * Uso: node scripts/generate-favicon.js
 */
const sharp = require('sharp');
const path = require('path');

const INPUT = path.resolve(__dirname, '../assets/images/icon.png');
const OUTPUT = path.resolve(__dirname, '../assets/images/favicon.png');

async function main() {
  // Generar PNG 32x32 con fondo transparente, bien recortado
  await sharp(INPUT)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(OUTPUT);

  console.log(`✓ favicon.png generado (32x32) → ${OUTPUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
