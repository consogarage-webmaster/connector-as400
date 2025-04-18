import axios from 'axios';
import { config } from '../config.js';

const api = axios.create({
  baseURL: config.prestashop.apiUrl,
  auth: {
    username: config.prestashop.apiKey,
    password: ''
  },
  headers: { 'Content-Type': 'application/xml' }
});

export async function updateStock(sku, quantity) {
  try {
    const response = await api.get(`/products?filter[reference]=[${sku}]`);
    const id = response.data.products?.product?.[0]?.id;

    if (!id) throw new Error(`No product found for SKU ${sku}`);
    console.log(`Would update stock for SKU ${sku} to ${quantity}`);

    // TODO call webservice
  } catch (err) {
    console.error(`Error updating stock for SKU ${sku}:`, err.message);
    throw err;
  }
}
