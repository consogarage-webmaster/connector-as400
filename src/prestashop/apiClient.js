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

// import { parseStringPromise, Builder as XMLBuilder } from 'xml2js';

export async function updateStock(products) {
  for (const product of products) {
    const { product_reference, physicalQuantity, reservedQuantity, availableQuantity } = product;

    try {
      // 1. Get product ID by reference
      const response = await api.get(`/products?display=full&filter[reference]=[${product_reference}]&output_format=JSON`);
      const productData = response.data.products?.[0];
      const productId = productData?.id;
      if (!productId) throw new Error(`No product found for reference ${product_reference}`);

      // 2. Get stock_available ID
      const stockRes = await api.get(`/stock_availables?filter[id_product]=[${productId}]&output_format=JSON`);
      const stockId = stockRes.data.stock_availables?.[0]?.id;
      if (!stockId) throw new Error(`No stock_available found for product ID ${productId}`);

      // 3. Get stock_available XML
      const stockXmlRes = await api.get(`/stock_availables/${stockId}`);
      const parsedStock = await parseStringPromise(stockXmlRes.data);
      const stockXml = parsedStock?.prestashop?.stock_available?.[0];
      if (!stockXml) throw new Error(`Malformed stock_available XML for ID ${stockId}`);

      // 4. Set new quantities
      stockXml.quantity = [availableQuantity.toString()];
      stockXml.physical_quantity = [physicalQuantity.toString()];
      stockXml.reserved_quantity = [reservedQuantity.toString()];

      // 5. Build and PUT updated stock_available XML
      const stockBuilder = new XMLBuilder({ headless: false, rootName: 'prestashop' });
      const updatedStockXml = stockBuilder.buildObject({
        $: { 'xmlns:xlink': 'http://www.w3.org/1999/xlink' },
        stock_available: stockXml
      });

      await api.put(`/stock_availables/${stockId}`, updatedStockXml);
      console.log(`✅ Stock_available updated for ${product_reference}`);

    } catch (err) {
      console.error(`❌ Error updating stock for ${product_reference}:`, err.response?.data || err.message);
    }
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

