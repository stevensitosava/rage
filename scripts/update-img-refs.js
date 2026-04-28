const fs   = require('fs');
const path = require('path');

// Rules: [pattern, replacement] applied line-by-line.
// OG/Twitter meta + JSON-LD image/logo + favicon links stay as-is (social scrapers need jpg/png).
const RULES = [
  // img src — photos
  [/(<img[^>]+src=["'])assets\/(icecreams[^"']+)\.jpg(["'])/g, '$1assets/$2.webp$3'],
  // img src — icons
  [/(<img[^>]+src=["'])assets\/(google_map_location-icon)\.png(["'])/g,  '$1assets/$2.webp$3'],
  [/(<img[^>]+src=["'])assets\/(calendar_clock-icon-)\.png(["'])/g,      '$1assets/$2.webp$3'],
  [/(<img[^>]+src=["'])assets\/(phone-icon)\.png(["'])/g,                '$1assets/$2.webp$3'],
  [/(<img[^>]+src=["'])assets\/(email-cion)\.png(["'])/g,                '$1assets/$2.webp$3'],
  [/(<img[^>]+src=["'])assets\/(social-media-icon)\.png(["'])/g,         '$1assets/$2.webp$3'],
  [/(<img[^>]+src=["'])assets\/(helado-empty)\.png(["'])/g,              '$1assets/$2.webp$3'],
  [/(<img[^>]+src=["'])assets\/(helado-full)\.png(["'])/g,               '$1assets/$2.webp$3'],
  // logo in img tags only (not favicon links)
  [/(<img[^>]+src=["'])assets\/logo\.png(["'])/g,                        '$1assets/logo.webp$2'],
  // frame src in JS template literals
  [/assets\/frames\/frame_\$\{[^}]+\}\.jpg/g, m => m.replace('.jpg', '.webp')],
  // seed.html imageUrl strings
  [/(imageUrl:\s*['"])assets\/(icecreams[^"']+)\.jpg(['"])/g, '$1assets/$2.webp$3'],
];

const FILES = [
  'site/index.html',
  'site/about.html',
  'site/contact.html',
  'site/menu.html',
  'site/js/components.js',
  'site/js/main.js',
  'site/admin/seed.html',
];

const ROOT = path.join(__dirname, '..');

FILES.forEach(rel => {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`  SKIP (not found): ${rel}`); return; }

  let src = fs.readFileSync(file, 'utf8');
  let out = src;
  RULES.forEach(([pat, rep]) => { out = out.replace(pat, rep); });

  if (out === src) {
    console.log(`  unchanged : ${rel}`);
  } else {
    fs.writeFileSync(file, out, 'utf8');
    console.log(`  updated   : ${rel}`);
  }
});

console.log('\nDone.');
