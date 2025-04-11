import fs from 'fs/promises';

export async function parseFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
    console.log(`content : ${content}`);
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [sku, quantity] = line.split(',');
    //   console.log(`SKU : ${sku} Qty : ${quantity}`)
      return { sku: sku.trim(), quantity: parseInt(quantity, 10) };
    });
}
