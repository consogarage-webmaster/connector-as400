import chokidar from 'chokidar';
import { config } from '../config.js';
import { processFile } from '../jobs/processFile.js';
import path from 'path';

export function startWatching() {
  const watcher = chokidar.watch(config.watchFolder, {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('add', async (filePath) => {
    if (path.extname(filePath).toLowerCase() !== '.txt') {
      console.log(`Ignoring non-txt file: ${filePath}`);
      return;
    }
  
    console.log(`New .txt file detected: ${filePath}`);
    await processFile(filePath);
  });
}
