import axios from 'axios';
import { Builder as XMLBuilder, parseStringPromise } from 'xml2js';
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
    const orderRes = await api.get(`/orders?filter[reference]=${orderReference}&output_format=JSON`);
    const orderId = orderRes.data.orders?.[0]?.id;
    console.log(`OrderRes : ${JSON.stringify(orderRes.data)}`);
    if (!orderId) throw new Error(`Order with reference ${orderReference} not found`);

    // --- 2. Find carrier ID ---
    const carrierRes = await api.get(`/carriers?filter[name]=${encodeURIComponent(carrierName)}&output_format=JSON`);
    console.log(`CarrierRes : ${JSON.stringify(carrierRes.data)}`);
    const carrierId = carrierRes.data.carriers?.[0]?.id;

    if (!carrierId) throw new Error(`Carrier with name ${carrierName} not found`);

    // --- 3. POST to /ec_reliquat ---
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL datetime format

    const builder = new XMLBuilder({ rootName: 'prestashop', headless: true });
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

    const parsed = await parseStringPromise(postRes.data);
    const reliquatId = parsed?.prestashop?.ec_reliquat?.[0]?.id?.[0];
    console.log('reliquat ID : ' + reliquatId);

    await createReliquatProducts(reliquatId, orderId, products);

    return postRes.data;

  } catch (err) {
    console.error(`Failed to create shipment for ${orderReference}:`, err.response?.data || err.message);
    throw err;
  }
}

export async function createReliquatProducts(reliquatId, orderId, products) {
  try {
    const listRes = await api.get(`/order_details?filter[id_order]=[${orderId}]&output_format=JSON`);
    const orderDetailIds = listRes.data.order_details.map(od => od.id);

    for (const { reference, quantity } of products) {
      let matchingDetail = null;

      for (const detailId of orderDetailIds) {
        const fullDetailRes = await api.get(`/order_details/${detailId}?output_format=JSON`);
        const detail = fullDetailRes.data.order_detail;

        if (detail.product_reference === reference) {
          matchingDetail = detail;
          break;
        }
      }

      if (!matchingDetail) {
        console.warn(`No order_detail found for product ${reference}`);
        continue;
      }

      const id_order_detail = matchingDetail.id;

      // Build XML
      const builder = new XMLBuilder({ headless: true, rootName: 'prestashop' });
      const xml = builder.buildObject({
        ec_reliquat_product: {
          id_reliquat: reliquatId,
          id_order_detail,
          quantity
        }
      });

      await api.post('/ec_reliquat_product', xml);
      console.log(`→ reliquat_product created for ${reference} (qty: ${quantity})`);
    }
  } catch (err) {
    console.error(`Error while processing reliquat products:`, err.response?.data || err.message);
  }
}

