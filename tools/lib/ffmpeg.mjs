// ffmpeg from PATH if installed, otherwise the copy bundled by the ffmpeg-static package.
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

function resolve() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0) return 'ffmpeg';
  try { return createRequire(import.meta.url)('ffmpeg-static'); } catch { return 'ffmpeg'; }
}

export const FFMPEG = resolve();
