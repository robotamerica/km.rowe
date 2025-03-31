// scripts/watch.mjs
import chokidar from 'chokidar';
import { exec } from 'child_process';

console.log('👁️ Watching for changes in /posts/...');

const watcher = chokidar.watch('./posts/*.md', {
  ignoreInitial: true
});

watcher.on('add', rebuild);
watcher.on('change', rebuild);
watcher.on('unlink', rebuild);

function rebuild(filePath) {
  console.log(`🔄 Rebuilding due to change in: ${filePath}`);
  exec('node scripts/build.mjs', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ stderr: ${stderr}`);
      return;
    }
    console.log(`✅ Build complete.\n`);
  });
}
