import fs from 'fs/promises';
import path from 'path';

export async function parseFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
    console.log(`content : ${content}`);
    const fileName = path.basename(filePath);
    if (fileName.startsWith('shipment_')) {
      return parseShipment(content);
    }
  // return content
  //   .split('\n')
  //   .filter(line => line.trim())
  //   .map(line => {
  //     const [sku, quantity] = line.split(',');
  //   //   console.log(`SKU : ${sku} Qty : ${quantity}`)
  //     return { sku: sku.trim(), quantity: parseInt(quantity, 10) };
  //   });
}

function parseShipment(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  let orderReference = '';
  let carrierName = '';
  const products = [];

  for (const line of lines) {
    const parts = line.split(';');

    switch (parts[0]) {
      case 'E':
        orderReference = parts[1];
        break;
      case 'T':
        carrierName = parts[1];
        break;
      case 'L':
        const reference = parts[1];
        const quantity = parseInt(parts[2], 10);
        products.push({ reference, quantity });
        break;
    }
  }

  return {action : 'recordShipment', orderReference, carrierName, products };
}