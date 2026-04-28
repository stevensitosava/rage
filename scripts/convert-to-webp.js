const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const ASSETS = path.join(__dirname, '../site/assets');

// Quality settings
const PHOTO_QUALITY  = 82; // hero/content photos
const FRAME_QUALITY  = 75; // animation frames — prioritise speed over fidelity

async function convertFile(src, quality) {
  const dest = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  if (dest === src) return; // already webp

  const before = fs.statSync(src).size;
  await sharp(src).webp({ quality }).toFile(dest);
  const after = fs.statSync(dest).size;
  const saved = (((before - after) / before) * 100).toFixed(1);
  console.log(`  ${path.basename(src)} → ${path.basename(dest)}  ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB  (-${saved}%)`);
}

async function convertFolder(folder, quality) {
  const files = fs.readdirSync(folder).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  console.log(`\n📁 ${path.relative(path.join(__dirname, '..'), folder)}  (${files.length} files)`);
  for (const f of files) {
    await convertFile(path.join(folder, f), quality);
  }
}

(async () => {
  console.log('Converting images to WebP…\n');

  // Root assets — photos
  const photos = fs.readdirSync(ASSETS)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .map(f => path.join(ASSETS, f));

  console.log(`📁 site/assets  (${photos.length} files)`);
  for (const p of photos) {
    await convertFile(p, PHOTO_QUALITY);
  }

  // Frame folders
  await convertFolder(path.join(ASSETS, 'hero-frames'), FRAME_QUALITY);
  await convertFolder(path.join(ASSETS, 'frames'),      FRAME_QUALITY);

  console.log('\n✅ Done.');
})();
