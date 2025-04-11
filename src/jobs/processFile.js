import path from 'path';
import fs from 'fs/promises';
import { parseFile } from '../parser/fileParser.js';
import { updateStock } from '../prestashop/apiClient.js';
import { config } from '../config.js';

async function moveFile(originalPath, targetFolder) {
  const fileName = path.basename(originalPath);
  const targetPath = path.join(targetFolder, fileName);
  await fs.rename(originalPath, targetPath);
}

export async function processFile(filePath) {
  try {
    const data = await parseFile(filePath);

    for (const { sku, quantity } of data) {
      await updateStock(sku, quantity);
    }

    await moveFile(filePath, config.processedFolder);
    console.log(`Processed and moved ${filePath}`);
  } catch (err) {
    console.error(`Failed to process ${filePath}:`, err);
    await moveFile(filePath, config.failedFolder);
  }
}
