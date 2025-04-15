import fs from 'fs/promises';
import path from 'path';

const logDir = './logs';

export const logger = {
    async shipmentProcessed(data = 'Shipment processed.'){
        const today = new Date().toISOString().slice(0, 10);
        const fileName = `shipments_${today}.log`;
        const filePath = path.join(logDir, fileName);

        try {
            // Ensure the log directory exists
            await fs.mkdir(logDir, { recursive: true });
        
            let entry = `[${new Date().toISOString()}]`;
            entry += `Order : ${data.orderReference};`;
            entry += `Carrier : ${data.carrierName};`;
            for (const product of data.products){
               entry += `Product ${product.reference} x${product.quantity}`
            }
            // data.products.foreach(product=>{
            //   entry += `Product ${product.reference} x${product.quantity}`
            // })
            entry += `\n`;
        
            // Try to append; if file doesn't exist, it will be created
            await fs.appendFile(filePath, entry, 'utf8');
        
            console.log(`Log written to ${filePath}`);
          } catch (err) {
            console.error('Failed to write log:', err);
          }
    },
    async errorLog(message = 'no error message provided'){
      const today = new Date().toISOString().slice(0, 10);
        const fileName = `errors_${today}.log`;
        const filePath = path.join(logDir, fileName);
        const entry = `[${new Date().toISOString()}] ${message}\n`;
    }
}