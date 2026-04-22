const ffmpeg      = require('fluent-ffmpeg');
const ffmpegPath  = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const path        = require('path');
const fs          = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const INPUT  = path.join(__dirname, 'site/assets/new-animation.mp4');
const OUTPUT = path.join(__dirname, 'site/assets/frames');
const FRAMES = 80;

fs.mkdirSync(OUTPUT, { recursive: true });

// Step 1 — get duration
ffmpeg.ffprobe(INPUT, (err, meta) => {
  if (err) { console.error('ffprobe error:', err); process.exit(1); }

  const duration = meta.format.duration;
  const fps      = FRAMES / duration;          // spread N frames across full duration

  console.log(`Video duration: ${duration.toFixed(2)}s`);
  console.log(`Extracting ${FRAMES} frames at ${fps.toFixed(3)} fps…`);

  ffmpeg(INPUT)
    .outputOptions([
      `-vf fps=${fps}`,   // evenly-spaced frames across full video
      '-q:v 4',           // JPEG quality 1-31 (lower = better; 4 is a good balance)
      '-vframes', FRAMES,
    ])
    .output(path.join(OUTPUT, 'frame_%04d.jpg'))
    .on('progress', p => {
      if (p.frames) process.stdout.write(`\r  ${p.frames}/${FRAMES} frames`);
    })
    .on('end', () => {
      const files = fs.readdirSync(OUTPUT).filter(f => f.endsWith('.jpg'));
      console.log(`\nDone — ${files.length} frames saved to site/assets/frames/`);
    })
    .on('error', e => { console.error('\nffmpeg error:', e.message); process.exit(1); })
    .run();
});
