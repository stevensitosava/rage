// Swap hero animation frames between two sets.
// Usage:
//   node scripts/swap-hero-frames.js original   → restore the first animation
//   node scripts/swap-hero-frames.js new         → use the test-hero-animation frames

const fs   = require('fs');
const path = require('path');

const FRAMES     = path.join(__dirname, '../site/assets/frames');
const ORIGINAL   = path.join(__dirname, '../site/assets/frames-original');
const NEW_FRAMES = path.join(__dirname, '../site/assets/frames-new');

const target = process.argv[2];
if (target !== 'original' && target !== 'new') {
  console.log('Usage: node scripts/swap-hero-frames.js [original|new]');
  process.exit(1);
}

// Back up current active frames to the non-active folder
const backup = target === 'original' ? NEW_FRAMES : ORIGINAL;
if (!fs.existsSync(backup)) fs.mkdirSync(backup, { recursive: true });

fs.readdirSync(FRAMES).forEach(f => {
  fs.copyFileSync(path.join(FRAMES, f), path.join(backup, f));
});
console.log(`Current frames backed up to ${path.basename(backup)}/`);

// Copy target frames into active folder
const source = target === 'original' ? ORIGINAL : NEW_FRAMES;
fs.readdirSync(FRAMES).forEach(f => fs.unlinkSync(path.join(FRAMES, f)));
fs.readdirSync(source).forEach(f => {
  fs.copyFileSync(path.join(source, f), path.join(FRAMES, f));
});
console.log(`✓ Active frames now set to: ${target}`);
console.log('Run git add site/assets/frames/ && git push to deploy.');
