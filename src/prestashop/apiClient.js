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
    const { product_reference, physicalQuantity, reservedQuantity, availableQuantity, product_attribute_reference } = product;

    try {
      // 1. Get product ID by reference
      const response = await api.get(`/products?display=full&filter[reference]=[${product_reference}]&output_format=JSON`);
      const productData = response.data.products?.[0];
      const productId = productData?.id;
      if (!productId) throw new Error(`No product found for reference ${product_reference}`);

      // 1b. Get id_product_attribute si déclinaison
      let id_product_attribute = 0;
      if (product_attribute_reference) {
        const combRes = await api.get(`/product_option_values?filter[reference]=[${product_attribute_reference}]&output_format=JSON`);
        const combId = combRes.data.product_option_values?.[0]?.id;
        if (!combId) throw new Error(`No product_attribute found for reference ${product_attribute_reference}`);
        id_product_attribute = combId;
      }

      // 2. Get stock_available ID
      let stockFilter = `/stock_availables?filter[id_product]=[${productId}]`;
      if (id_product_attribute) stockFilter += `&filter[id_product_attribute]=[${id_product_attribute}]`;
      stockFilter += '&output_format=JSON';
      const stockRes = await api.get(stockFilter);
      const stockAvailable = stockRes.data.stock_availables?.[0];
      const stockId = stockAvailable?.id;
      if (!stockId) throw new Error(`No stock_available found for product ID ${productId} (attribute: ${id_product_attribute})`);

      // 3. Get stock_available XML
      const stockXmlRes = await api.get(`/stock_availables/${stockId}`);
      const parsedStock = await parseStringPromise(stockXmlRes.data);
      const stockXml = parsedStock?.prestashop?.stock_available?.[0];
      if (!stockXml) throw new Error(`Malformed stock_available XML for ID ${stockId}`);

      // 4. Get advanced stock (physical_quantity) for this product/warehouse/attribute
      const warehouseId = stockAvailable.id_warehouse || 1;
      let stocksUrl = `/stocks?filter[id_product]=[${productId}]&filter[id_warehouse]=[${warehouseId}]`;
      if (id_product_attribute) stocksUrl += `&filter[id_product_attribute]=[${id_product_attribute}]`;
      stocksUrl += '&output_format=JSON';
      const stocksRes = await api.get(stocksUrl);
      const stockRow = stocksRes.data.stocks?.[0];
      const currentPhysical = stockRow ? parseInt(stockRow.physical_quantity, 10) : 0;

      // 5. Calcul du delta physique et création du mouvement si besoin
      const deltaPhysical = physicalQuantity - currentPhysical;
      if (deltaPhysical !== 0) {
        await createStockMovement({
          id_product: productId,
          id_product_attribute,
          id_warehouse: warehouseId,
          quantity: Math.abs(deltaPhysical),
          sign: deltaPhysical > 0 ? 1 : -1,
          reason: 1 // 1 = manuelle
        });
        console.log(`🟢 Mouvement de stock créé pour ${product_reference} (attr: ${product_attribute_reference || 'aucun'}) : ${deltaPhysical > 0 ? '+' : ''}${deltaPhysical}`);
      }

      // 6. Met à jour la quantité disponible (stock_available)
      stockXml.quantity = [availableQuantity.toString()];
      stockXml.physical_quantity = [physicalQuantity.toString()];
      stockXml.reserved_quantity = [reservedQuantity.toString()];

      const stockBuilder = new XMLBuilder({ headless: false, rootName: 'prestashop' });
      const updatedStockXml = stockBuilder.buildObject({
        $: { 'xmlns:xlink': 'http://www.w3.org/1999/xlink' },
        stock_available: stockXml
      });

      await api.put(`/stock_availables/${stockId}`, updatedStockXml);
      console.log(`✅ Stock_available updated for ${product_reference} (attr: ${product_attribute_reference || 'aucun'}) /n Id stock : ${stockId} Phys: ${physicalQuantity}, Reserved: ${reservedQuantity}, Available: ${availableQuantity}`);

    } catch (err) {
      console.error(`❌ Error updating stock for ${product_reference}:`, err.response?.data || err.message);
    }
  }
}
async function createStockMovement({ id_product, id_product_attribute = 0, id_warehouse, quantity, sign = 1, reason = 1, id_employee = 1 }) {
  const builder = new XMLBuilder({ rootName: 'prestashop', headless: true });
  const xml = builder.buildObject({
    stock_mvt: {
      id_stock: '',
      id_product,
      id_product_attribute,
      id_warehouse,
      id_currency: 1,
      management_type: 'WA',
      price_te: 0,
      sign,
      quantity,
      date_add: new Date().toISOString().slice(0, 19).replace('T', ' '),
      id_stock_mvt_reason: reason,
      id_employee
    }
  });
  await api.post('/stock_movements', xml);
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

