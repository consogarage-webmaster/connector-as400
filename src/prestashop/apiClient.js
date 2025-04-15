import axios from 'axios';
import { Builder as XMLBuilder } from 'xml2js';
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

    // To be implemented: fetch full XML, update it, PUT it back
  } catch (err) {
    console.error(`Error updating stock for SKU ${sku}:`, err.message);
    throw err;
  }
}
export async function createShipment(data) {
  const { orderReference, carrierName, products } = data;
  try {
    // --- 1. Find order ID ---
    const orderRes = await api.get(`/orders?ws_key=config.prestashop.apiKey&filter[reference]=${orderReference}&output_format=JSON`);
    const orderId = orderRes.data.orders?.[0]?.id;
    console.log(`OrderRes : ${JSON.stringify(orderRes.data)}`)
    if (!orderId) throw new Error(`Order with reference ${orderReference} not found`);
    

    // --- 2. Find carrier ID ---
    const carrierRes = await api.get(`/carriers?filter[name]=${encodeURIComponent(carrierName)}&output_format=JSON`);
    console.log(`CarrierRes : ${JSON.stringify(carrierRes.data)}`)
    const carrierId = carrierRes.data.carriers?.[0]?.id;

    if (!carrierId) throw new Error(`Carrier with name ${carrierName} not found`);

    // --- 3. POST to /ec_reliquat ---
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL datetime format

    const builder = new XMLBuilder({ rootName: 'ec_reliquat', headless: true });
    const xml = builder.buildObject({
      ec_reliquat: {
        id_order: orderId,
        id_order_state: 23,
        id_carrier: carrierId,
        date_add: now
      }
    });
// 4. POST as XML
const postRes = await api.post('/ec_reliquat', xml);
console.log(`Shipment created successfully for order ${orderReference}`);
return postRes.data;

} catch (err) {
console.error(`Failed to create shipment for ${orderReference}:`, err.response?.data || err.message);
throw err;
}
}
