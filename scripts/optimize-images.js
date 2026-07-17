#!/usr/bin/env node
/**
 * Optimiza imágenes PNG/JPG en assets/images/** con sharp.
 *
 * - Resize: máx 2048px ancho (mantiene aspect ratio).
 * - Compresión PNG: palette quantization + compression level 9 (lossy controlado).
 * - Sobreescribe in-place.
 *
 * FOTO → JPEG (Mega-Sprint C, lección #132): las imágenes FOTOGRÁFICAS (mucho
 * detalle, degradados) comprimen PÉSIMO como PNG-palette (256 colores + dithering
 * = alta entropía → 5-10MB). El síntoma: 20 MJ en PNG pesaban 117MB y el script
 * "no ganaba"; en JPEG q85 bajaron a 7.2MB (94% menos) sin pérdida visible.
 * Ahora, para un `.png` que sea (a) de una carpeta declarada FOTOGRÁFICA, o
 * (b) donde el palette-PNG no gana >30%, el script GENERA un `.jpg` hermano q85 y
 * AVISA al dev que recablee el `require()` a `.jpg` y borre el `.png`. NO auto-
 * renombra (rompería los `require('.png')` del código) ni borra el original.
 *
 * Uso: npm run optimize-images
 *
 * Para WebP en futuro: cambiar .png({...}) por .webp({ quality: 80, effort: 6 })
 * y renombrar archivos en código (require('./xxx.webp')).
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const TARGET_DIR = 'assets/images';
const MAX_WIDTH = 2048;       // resize si dimensión > esto
const PNG_QUALITY = 85;       // 0-100 (sharp PNG palette quality)
const JPEG_QUALITY = 85;      // q85 = sweet spot foto (94% menos que PNG-palette)
const SKIP_IF_SMALLER_KB = 200; // skip si ya está bajo este tamaño
const PNG_MIN_GAIN_PCT = 30;  // si el palette-PNG no gana esto → probar JPEG (foto)

// Carpetas cuyas PNG son FOTOGRÁFICAS (MJ, degradados) → siempre proponer JPEG.
// Añade aquí cualquier carpeta de imágenes generadas/fotográficas nuevas.
const PHOTO_FOLDERS = [
  'intervenciones', 'hoy-extra/tu-dia', 'salud-funcional', 'agenda', 'backgrounds',
];

/** ¿El archivo vive en una carpeta declarada fotográfica? */
function isPhotoFolder(file) {
  const norm = file.replace(/\\/g, '/');
  return PHOTO_FOLDERS.some((f) => norm.includes(`/${f}/`) || norm.includes(`${TARGET_DIR}/${f}/`));
}

// ───────────────────────────────────────────────────────────────────

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(0);
}
function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

async function optimizeOne(file) {
  const origBytes = fs.statSync(file).size;
  const origKB = origBytes / 1024;

  // Skip si ya está chico
  if (origKB < SKIP_IF_SMALLER_KB) {
    console.log(`${DIM}⊘ skip${RESET} ${file} (${fmtKB(origBytes)}KB ya optimizada)`);
    return { saved: 0, skipped: true };
  }

  const ext = path.extname(file).toLowerCase();
  const img = sharp(file);
  const metadata = await img.metadata();

  let pipeline = img;
  if (metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  let buffer;
  if (ext === '.png') {
    buffer = await pipeline
      .png({ quality: PNG_QUALITY, palette: true, compressionLevel: 9, effort: 10 })
      .toBuffer();

    // FOTO → JPEG: si es carpeta fotográfica o el PNG no ganó lo suficiente,
    // proponer un `.jpg` hermano (no renombramos: rompería los require('.png')).
    const pngGainPct = ((origBytes - buffer.length) / origBytes) * 100;
    if (isPhotoFolder(file) || pngGainPct < PNG_MIN_GAIN_PCT) {
      const jpgBuffer = await sharp(file)
        .resize(metadata.width > MAX_WIDTH ? { width: MAX_WIDTH, withoutEnlargement: true } : undefined)
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      // Solo si el JPEG mejora claramente contra el mejor PNG posible.
      if (jpgBuffer.length < buffer.length * 0.7) {
        const jpgPath = file.replace(/\.png$/i, '.jpg');
        if (!fs.existsSync(jpgPath)) fs.writeFileSync(jpgPath, jpgBuffer);
        console.log(
          `${YELLOW}⚑ FOTO→JPEG${RESET} ${file}  PNG ${fmtKB(buffer.length)}KB → JPEG ${fmtKB(jpgBuffer.length)}KB\n` +
          `   ${DIM}Generé ${path.basename(jpgPath)}. Recablea el require() a '.jpg' y borra el '.png'.${RESET}`,
        );
        // Optimizamos el PNG in-place igual (por si el dev aún no recablea).
        if (buffer.length < origBytes) fs.writeFileSync(file, buffer);
        return { saved: origBytes - jpgBuffer.length, skipped: false, jpegProposed: true };
      }
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    buffer = await pipeline
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } else {
    console.log(`${YELLOW}⚠ unsupported${RESET} ${file}`);
    return { saved: 0, skipped: true };
  }

  // Solo reemplazar si bajó tamaño
  if (buffer.length >= origBytes) {
    console.log(`${DIM}⊘ no gain${RESET} ${file} (${fmtKB(origBytes)}KB)`);
    return { saved: 0, skipped: true };
  }

  fs.writeFileSync(file, buffer);
  const newBytes = buffer.length;
  const saved = origBytes - newBytes;
  const pct = ((saved / origBytes) * 100).toFixed(0);

  console.log(`${GREEN}✓${RESET} ${file}  ${fmtKB(origBytes)}KB → ${fmtKB(newBytes)}KB  ${GREEN}(-${pct}%)${RESET}`);
  return { saved, skipped: false };
}

async function main() {
  console.log(`\n📸 Optimize images — sharp pipeline\n`);
  console.log(`${DIM}Target:${RESET} ${TARGET_DIR}/**/*.{png,jpg,jpeg}`);
  console.log(`${DIM}Max width:${RESET} ${MAX_WIDTH}px`);
  console.log(`${DIM}PNG quality:${RESET} ${PNG_QUALITY}`);
  console.log(`${DIM}Skip if <${RESET} ${SKIP_IF_SMALLER_KB}KB\n`);

  const files = glob.sync(`${TARGET_DIR}/**/*.{png,jpg,jpeg,PNG,JPG,JPEG}`);
  if (files.length === 0) {
    console.log(`${YELLOW}No images found in ${TARGET_DIR}${RESET}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} images.\n`);

  let totalSaved = 0;
  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const result = await optimizeOne(file);
      totalSaved += result.saved;
      if (result.skipped) skipped++;
      else processed++;
    } catch (e) {
      console.error(`${RED}✗ ERROR${RESET} ${file}: ${e.message}`);
    }
  }

  console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${GREEN}✅ Done${RESET}`);
  console.log(`Processed: ${processed} | Skipped: ${skipped}`);
  console.log(`Total saved: ${GREEN}${fmtMB(totalSaved)}MB${RESET}\n`);
}

main().catch((e) => {
  console.error(`${RED}Fatal:${RESET}`, e);
  process.exit(1);
});
