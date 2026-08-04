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
 * MODO WEBP (NOCTURNO A5): `node scripts/optimize-images.js --webp`
 * Convierte TODO png/jpg de las SUBCARPETAS de assets/images a .webp q82,
 * resize máx 1200px, y BORRA el original (git lo conserva). La raíz de
 * assets/images no se toca: ahí viven los PNG RGBA de marca y los cinco
 * assets que app.json exige como PNG (icon, splash, adaptive-icon, favicon).
 * Después de correrlo hay que recablear los require() a '.webp' — el test
 * assets-references verifica que ninguna referencia quede rota.
 *
 * GUARD GENERACIONAL (MB-20.3 P5.1): el skip por tamaño no frena una
 * re-corrida — 7 de los 11 JPEG quedaron arriba de 200KB y cada corrida los
 * re-encodeaba q85 sobre q85 (pérdida acumulada que el guard de "solo si
 * bajó" no detiene, porque cada re-encode baja unos KB). Ahora hay marca de
 * "ya optimizado": scripts/optimized-images-manifest.json guarda el sha1 del
 * archivo tal como quedó; si el archivo no cambió desde entonces, se salta
 * SIN re-encodear. Un asset nuevo o re-exportado (hash distinto) sí entra.
 * El manifest se commitea junto con las imágenes optimizadas.
 *
 * FORMATO DECLARADO (MB-20.3 P5.4): los JPEG salen PROGRESIVOS — es el
 * default de mozjpeg y quedó así desde Mega-Sprint C. expo-image los
 * decodifica bien; si un consumidor futuro necesita baseline, hay que
 * apagar mozjpeg o pasar progressive:false explícito.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const crypto = require('crypto');

const TARGET_DIR = 'assets/images';
// MB-20.2 (nota del audit): assets/backgrounds no lo cubría ningún guard y
// llegó a 35 MB. El modo normal ahora también lo barre (in-place, mismas
// rutas .jpg: los require() de brand.ts y MomentoBanda no cambian). El modo
// WebP NO lo toca: renombraría archivos que el código requiere por extensión.
const EXTRA_DIRS = ['assets/backgrounds'];
const MAX_WIDTH = 2048;       // resize si dimensión > esto
const PNG_QUALITY = 85;       // 0-100 (sharp PNG palette quality)
const JPEG_QUALITY = 85;      // q85 = sweet spot foto (94% menos que PNG-palette)
const SKIP_IF_SMALLER_KB = 200; // skip si ya está bajo este tamaño
const PNG_MIN_GAIN_PCT = 30;  // si el palette-PNG no gana esto → probar JPEG (foto)

// Modo WebP: subcarpetas completas, sin umbral de skip (extensiones uniformes
// por carpeta = recableado mecánico de require()).
const WEBP_MODE = process.argv.includes('--webp');
const WEBP_QUALITY = 82;      // 82-85 indistinguible en foto; 82 = mejor peso
const WEBP_MAX_WIDTH = 1200;  // ninguna card necesita más de 1200px de ancho

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

// ─── Guard generacional (MB-20.3 P5.1) ───
// sha1 del archivo tal como quedó tras la última corrida. Coincide → el
// archivo no ha cambiado desde que se optimizó → skip sin re-encodear.
const MANIFEST_PATH = 'scripts/optimized-images-manifest.json';
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const manifestKey = (file) => file.replace(/\\/g, '/');

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

/** Poda entradas de archivos que ya no existen y guarda ordenado (diff estable). */
function saveManifest(manifest) {
  const vivo = {};
  for (const key of Object.keys(manifest).sort()) {
    if (fs.existsSync(key)) vivo[key] = manifest[key];
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(vivo, null, 2) + '\n');
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

async function optimizeOne(file, manifest) {
  const origBytes = fs.statSync(file).size;
  const origKB = origBytes / 1024;

  // Skip si ya está chico
  if (origKB < SKIP_IF_SMALLER_KB) {
    console.log(`${DIM}⊘ skip${RESET} ${file} (${fmtKB(origBytes)}KB ya optimizada)`);
    return { saved: 0, skipped: true };
  }

  const ext = path.extname(file).toLowerCase();
  // Buffer primero: en Windows, sharp(ruta) mantiene el archivo abierto y el
  // writeFileSync in-place truena con UNKNOWN -4094 (reproducido en MB-20.2).
  const input = fs.readFileSync(file);

  // Guard generacional: mismo contenido que dejó la última corrida → no
  // re-encodear (q85 sobre q85 acumula pérdida y el guard de tamaño no la ve).
  const key = manifestKey(file);
  if (manifest[key] === sha1(input)) {
    console.log(`${DIM}⊘ skip${RESET} ${file} (sin cambios desde la última corrida — manifest)`);
    return { saved: 0, skipped: true };
  }

  const img = sharp(input);
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
      const jpgBuffer = await sharp(input)
        .resize(metadata.width > MAX_WIDTH ? { width: MAX_WIDTH, withoutEnlargement: true } : undefined)
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      // Solo si el JPEG mejora claramente contra el mejor PNG posible.
      if (jpgBuffer.length < buffer.length * 0.7) {
        const jpgPath = file.replace(/\.png$/i, '.jpg');
        if (!fs.existsSync(jpgPath)) {
          fs.writeFileSync(jpgPath, jpgBuffer);
          manifest[manifestKey(jpgPath)] = sha1(jpgBuffer);
        }
        console.log(
          `${YELLOW}⚑ FOTO→JPEG${RESET} ${file}  PNG ${fmtKB(buffer.length)}KB → JPEG ${fmtKB(jpgBuffer.length)}KB\n` +
          `   ${DIM}Generé ${path.basename(jpgPath)}. Recablea el require() a '.jpg' y borra el '.png'.${RESET}`,
        );
        // Optimizamos el PNG in-place igual (por si el dev aún no recablea).
        if (buffer.length < origBytes) {
          fs.writeFileSync(file, buffer);
          manifest[key] = sha1(buffer);
        } else {
          manifest[key] = sha1(input);
        }
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
    // El archivo no cambió: marcarlo evaluado para no re-encodear cada corrida.
    manifest[key] = sha1(input);
    return { saved: 0, skipped: true };
  }

  fs.writeFileSync(file, buffer);
  manifest[key] = sha1(buffer);
  const newBytes = buffer.length;
  const saved = origBytes - newBytes;
  const pct = ((saved / origBytes) * 100).toFixed(0);

  console.log(`${GREEN}✓${RESET} ${file}  ${fmtKB(origBytes)}KB → ${fmtKB(newBytes)}KB  ${GREEN}(-${pct}%)${RESET}`);
  return { saved, skipped: false };
}

/** Modo WebP: convierte a .webp q82 máx 1200px y borra el original. */
async function webpOne(file) {
  // Mismo buffer-primero que optimizeOne: el unlink del original también
  // truena en Windows si sharp aún tiene el archivo abierto.
  const input = fs.readFileSync(file);
  const origBytes = input.length;
  const img = sharp(input);
  const metadata = await img.metadata();

  let pipeline = img;
  if (metadata.width > WEBP_MAX_WIDTH) {
    pipeline = pipeline.resize({ width: WEBP_MAX_WIDTH, withoutEnlargement: true });
  }

  const buffer = await pipeline.webp({ quality: WEBP_QUALITY, effort: 6 }).toBuffer();
  const webpPath = file.replace(/\.(png|jpe?g)$/i, '.webp');
  fs.writeFileSync(webpPath, buffer);
  fs.unlinkSync(file);

  const pct = (((origBytes - buffer.length) / origBytes) * 100).toFixed(0);
  console.log(`${GREEN}✓${RESET} ${file} → ${path.basename(webpPath)}  ${fmtKB(origBytes)}KB → ${fmtKB(buffer.length)}KB  ${GREEN}(-${pct}%)${RESET}`);
  return { saved: origBytes - buffer.length, skipped: false };
}

async function mainWebp() {
  console.log(`\n📸 Optimize images — modo WebP (subcarpetas)\n`);
  console.log(`${DIM}Target:${RESET} ${TARGET_DIR}/*/**/*.{png,jpg,jpeg}`);
  console.log(`${DIM}Max width:${RESET} ${WEBP_MAX_WIDTH}px | ${DIM}quality:${RESET} ${WEBP_QUALITY}\n`);

  // Solo subcarpetas: la raíz (marca + app.json) no se toca.
  const files = glob.sync(`${TARGET_DIR}/*/**/*.{png,jpg,jpeg,PNG,JPG,JPEG}`);
  if (files.length === 0) {
    console.log(`${YELLOW}No images found in ${TARGET_DIR} subfolders${RESET}`);
    process.exit(0);
  }
  console.log(`Found ${files.length} images.\n`);

  let totalSaved = 0;
  let processed = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const result = await webpOne(file);
      totalSaved += result.saved;
      processed++;
    } catch (e) {
      failed++;
      console.error(`${RED}✗ ERROR${RESET} ${file}: ${e.message}`);
    }
  }

  console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${GREEN}✅ Done${RESET}`);
  console.log(`Converted: ${processed} | Errors: ${failed}`);
  console.log(`Total saved: ${GREEN}${fmtMB(totalSaved)}MB${RESET}`);
  console.log(`${YELLOW}Recablea los require() a '.webp' (el test assets-references lo vigila).${RESET}\n`);
  if (failed > 0) process.exit(1);
}

async function main() {
  if (WEBP_MODE) return mainWebp();
  const roots = [TARGET_DIR, ...EXTRA_DIRS];
  console.log(`\n📸 Optimize images — sharp pipeline\n`);
  console.log(`${DIM}Target:${RESET} {${roots.join(',')}}/**/*.{png,jpg,jpeg}`);
  console.log(`${DIM}Max width:${RESET} ${MAX_WIDTH}px`);
  console.log(`${DIM}PNG quality:${RESET} ${PNG_QUALITY}`);
  console.log(`${DIM}Skip if <${RESET} ${SKIP_IF_SMALLER_KB}KB\n`);

  const files = roots.flatMap((dir) => glob.sync(`${dir}/**/*.{png,jpg,jpeg,PNG,JPG,JPEG}`));
  if (files.length === 0) {
    console.log(`${YELLOW}No images found in ${roots.join(', ')}${RESET}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} images.\n`);

  const manifest = loadManifest();
  let totalSaved = 0;
  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const result = await optimizeOne(file, manifest);
      totalSaved += result.saved;
      if (result.skipped) skipped++;
      else processed++;
    } catch (e) {
      console.error(`${RED}✗ ERROR${RESET} ${file}: ${e.message}`);
    }
  }

  saveManifest(manifest);

  console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${GREEN}✅ Done${RESET}`);
  console.log(`Processed: ${processed} | Skipped: ${skipped}`);
  console.log(`Total saved: ${GREEN}${fmtMB(totalSaved)}MB${RESET}`);
  console.log(`${DIM}Manifest actualizado (${MANIFEST_PATH}) — commitéalo con las imágenes.${RESET}\n`);
}

main().catch((e) => {
  console.error(`${RED}Fatal:${RESET}`, e);
  process.exit(1);
});
