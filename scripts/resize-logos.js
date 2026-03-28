const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS = path.join(__dirname, '..', 'assets', 'images');

const logos = [
  {
    src: 'logo-horizontal-dark.png',
    sizes: [
      { w: 600, h: 600, suffix: '' },
      { w: 300, h: 300, suffix: '-sm' },
      { w: 150, h: 150, suffix: '-xs' },
    ],
  },
  {
    src: 'logo-horizontal-light.png',
    sizes: [
      { w: 600, h: 600, suffix: '' },
      { w: 300, h: 300, suffix: '-sm' },
    ],
  },
  {
    src: 'logo-vertical-dark.png',
    sizes: [
      { w: 600, h: 600, suffix: '' },
      { w: 300, h: 300, suffix: '-sm' },
    ],
  },
  {
    src: 'logo-veertical-light.png',
    sizes: [
      { w: 600, h: 600, suffix: '' },
      { w: 300, h: 300, suffix: '-sm' },
    ],
  },
  {
    src: 'icon-lima.png',
    sizes: [
      { w: 200, h: 200, suffix: '' },
      { w: 100, h: 100, suffix: '-sm' },
    ],
  },
  {
    src: 'icon-white.png',
    sizes: [
      { w: 200, h: 200, suffix: '' },
      { w: 100, h: 100, suffix: '-sm' },
    ],
  },
  {
    src: 'icon-black.png',
    sizes: [
      { w: 200, h: 200, suffix: '' },
      { w: 100, h: 100, suffix: '-sm' },
    ],
  },
];

async function run() {
  for (const logo of logos) {
    const srcPath = path.join(ASSETS, logo.src);
    if (!fs.existsSync(srcPath)) {
      console.log(`SKIP (not found): ${logo.src}`);
      continue;
    }

    const ext = path.extname(logo.src);
    const base = path.basename(logo.src, ext);

    for (const size of logo.sizes) {
      const outName = size.suffix ? `${base}${size.suffix}${ext}` : `${base}${ext}`;
      const outPath = path.join(ASSETS, outName);

      await sharp(srcPath)
        .resize(size.w, size.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outPath + '.tmp');

      // Move tmp over original (sharp can't write to same file it reads)
      fs.renameSync(outPath + '.tmp', outPath);
      console.log(`OK: ${outName} (${size.w}x${size.h})`);
    }
  }
  console.log('Done!');
}

run().catch(console.error);
