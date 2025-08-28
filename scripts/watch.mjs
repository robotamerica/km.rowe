// scripts/watch.mjs
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '..');
const POSTS_DIR  = path.join(repoRoot, 'posts');

let timer = null;
function debouncedBuild() {
  clearTimeout(timer);
  timer = setTimeout(runBuild, 150);
}

function runBuild() {
  const p = spawn(process.execPath, [path.join(repoRoot, 'scripts', 'build.mjs')], {
    stdio: 'inherit',
  });
  p.on('exit', (code) => {
    if (code === 0) {
      console.log('Rebuilt successfully.');
    } else {
      console.error('Build failed with code', code);
    }
  });
}

fs.mkdirSync(POSTS_DIR, { recursive: true });
console.log('Watching for changes in posts/*.md ...');

fs.watch(POSTS_DIR, { persistent: true }, (eventType, filename) => {
  if (!filename || !/\.md$/i.test(filename)) return;
  debouncedBuild();
});

// initial build
runBuild();
