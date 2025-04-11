import dotenv from 'dotenv';
dotenv.config();

let config;

if (process.env.NODE_ENV === 'dev') {
  config = {
    watchFolder: process.env.WATCH_FOLDER,
    processedFolder: process.env.PROCESSED_FOLDER,
    failedFolder: process.env.FAILED_FOLDER,
    prestashop: {
      apiUrl: process.env.PRESTASHOP_DEV_API_URL,
      apiKey: process.env.PRESTASHOP_DEV_API_KEY
    }
  };
} else {
  config = {
    watchFolder: process.env.WATCH_FOLDER,
    processedFolder: process.env.PROCESSED_FOLDER,
    failedFolder: process.env.FAILED_FOLDER,
    prestashop: {
      apiUrl: process.env.PRESTASHOP_API_URL,
      apiKey: process.env.PRESTASHOP_API_KEY
    }
  };
}

export { config };


