import dotenv from 'dotenv';
dotenv.config();

export const config = {
  watchFolder: process.env.WATCH_FOLDER,
  processedFolder: process.env.PROCESSED_FOLDER,
  failedFolder: process.env.FAILED_FOLDER,
  prestashop: {
    apiUrl: process.env.PRESTASHOP_API_URL,
    apiKey: process.env.PRESTASHOP_API_KEY
  }
};
