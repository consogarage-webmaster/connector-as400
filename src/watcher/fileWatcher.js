import chokidar from 'chokidar';
import { config } from '../config.js';
import { processFile } from '../jobs/processFile.js';

export function startWatching() {
  const watcher = chokidar.watch(config.watchFolder, {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('add', async (filePath) => {
    console.log(`New file detected: ${filePath}`);
    await processFile(filePath);
  });
}
