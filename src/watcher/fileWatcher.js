import chokidar from 'chokidar';
import { config } from '../config.js';
import { processFile, moveFile } from '../jobs/processFile.js';
import { logger } from '../jobs/logActions.js';

import path from 'path';

export function startWatching() {
  const watcher = chokidar.watch(config.watchFolder, {
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('add', async (filePath) => {

    // Filter out non .txt files
    if (path.extname(filePath).toLowerCase() !== '.txt') {
      console.log(`Ignoring non-txt file: ${filePath}`);
      return;
    }
    console.log(`New .txt file detected: ${filePath}`);

    // Get required action depending on file name
    let action = '';
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.startsWith('shipment') || fileName.startsWith('stock')) {
      if (fileName.startsWith('shipment')) {
        action = 'recordShipment';
      } else if (fileName.startsWith('stock')) {
        action = 'updateStock';
      }
      await processFile(action, filePath);
    } else {
      const message = `File ${filePath} : Error - no action found according to file name (File names must begin with "shipment" or "stock")`;
      console.log(message);
      await logger.errorLog(message);
      await moveFile(filePath, config.failedFolder);
    }

  });
}
