// ============================================================
// backend.gs — Google Apps Script (Spray Tidur + Janji Jus logic)
// Semua environment variables disimpan di Script Properties.
// ============================================================

// ---------- Helper: ambil env dari Script Properties ----------
function getEnv(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

// ---------- Konfigurasi ----------
const CONFIG = {
  MENGANTAR_BASE_URL: getEnv('MENGANTAR_BASE_URL') || 'https://app.mengantar.com',
  MENGANTAR_API_KEY: getEnv('MENGANTAR_API_KEY') || 'API-50MORFP8RAXQYAYI',
  MENGANTAR_PICKUP_ADDRESS_ID: getEnv('MENGANTAR_PICKUP_ADDRESS_ID') || '6a8473b996d1a26e62274ddf',
  CASHI_BASE_URL: getEnv('CASHI_BASE_URL') || 'https://cashi.id',
  CASHI_API_KEY: getEnv('CASHI_API_KEY') || '28567018921edd2bb00c979281d2ab663ab16b4809c87e23b4234f22d4b7fadf',
  CASHI_WEBHOOK_SECRET: getEnv('CASHI_WEBHOOK_SECRET') || 'sk_725cec268bbf895562be95d9aff42c37',
  STORE_NAME: getEnv('STORE_NAME') || 'Spray Tidur',
  STORE_WA_NUMBER: getEnv('STORE_WA_NUMBER') || '6281932696934',
  STORE_WA_ADMIN_NUMBER: getEnv('STORE_WA_ADMIN_NUMBER') || '6281932696934',
  PRODUCT_NAME: getEnv('PRODUCT_NAME') || 'Spray Tidur',
  PRODUCT_DESCRIPTION: getEnv('PRODUCT_DESCRIPTION') || 'Spray tidur - BPOM HALAL, aman tidak berbahaya',
  PRODUCT_PRICE: Number(getEnv('PRODUCT_PRICE')) || 209000,
  PRODUCT_WEIGHT_GRAM: Number(getEnv('PRODUCT_WEIGHT_GRAM')) || 150,
  SHEET_ID: getEnv('GOOGLE_SHEET_ID') || '',
};

// ---------- Helper: response JSON + CORS ----------
function respond(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}

// ---------- Helper: fetch external API ----------
function externalFetch(url, options = {}) {
  const opts = {
    method: options.method || 'GET',
    headers: options.headers || { 'Content-Type': 'application/json' },
    muteHttpExceptions: true,
  };
  if (options.body) opts.payload = options.body;
  const response = UrlFetchApp.fetch(url, opts);
  const content = response.getContentText();
  try { return JSON.parse(content); } catch (e) { return { success: false, message: 'Invalid JSON response' }; }
}

// ---------- doGet (GET endpoints) ----------
function doGet(e) {
  const action = e.parameter.action || '';
  try {
    switch (action) {
      case 'config': return handleConfig();
      case 'address-search': return handleAddressSearch(e.parameter.keyword);
      case 'check-status': return handleCheckStatus(e.parameter.orderId);
      case 'track-order': return handleTrackOrder(e.parameter.phone);
      default:
        return respond({ success: false, message: 'Action tidak dikenali' }, 400);
    }
  } catch (err) {
    return respond({ success: false, message: err.message }, 500);
  }
}

// ---------- doPost (POST endpoints) ----------
function doPost(e) {
  const action = e.parameter.action || '';
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    switch (action) {
      case 'create-order': return handleCreateOrder(body);
      case 'cashi-webhook': return handleCashiWebhook(body, e);
      default:
        return respond({ success: false, message: 'Action tidak dikenali' }, 400);
    }
  } catch (err) {
    return respond({ success: false, message: err.message }, 500);
  }
}

// ============================================================
// 1. CONFIG
// ============================================================
function handleConfig() {
  const data = {
    storeName: CONFIG.STORE_NAME,
    productName: CONFIG.PRODUCT_NAME,
    productDescription: CONFIG.PRODUCT_DESCRIPTION,
    productPrice: CONFIG.PRODUCT_PRICE,
    waNumber: CONFIG.STORE_WA_NUMBER,
    waAdminNumber: CONFIG.STORE_WA_ADMIN_NUMBER,
    paymentChannels: [
      { key: 'COD', kode_channel: null, label: 'COD', group: 'COD' },
      { key: 'QRIS', kode_channel: 'QRIS_CUSTOM', label: 'QRIS', group: 'QRIS' },
      { key: 'MANDIRI', kode_channel: 'MANDIRI', label: 'Mandiri VA', group: 'VA' },
      { key: 'BCA', kode_channel: 'BCA', label: 'BCA VA', group: 'VA' },
      { key: 'BNI', kode_channel: 'BNI', label: 'BNI VA', group: 'VA' },
      { key: 'BRI', kode_channel: 'BRI', label: 'BRI VA', group: 'VA' },
      { key: 'BSI', kode_channel: 'BSI', label: 'BSI VA', group: 'VA' },
      { key: 'ALFAMART', kode_channel: 'ALFAMART', label: 'Alfamart', group: 'RETAIL' },
      { key: 'INDOMARET', kode_channel: 'INDOMARET', label: 'Indomaret', group: 'RETAIL' },
    ],
    couriers: ['Direkomendasikan', 'JNT', 'SiCepat', 'Sap', 'iDexpress'],
    discountTiers: { 1: 0, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.15 },
    maxQty: 5,
    freeShippingDisplayValue: 15000,
  };
  return respond({ success: true, data });
}

// ============================================================
// 2. ADDRESS SEARCH (Mengantar)
// ============================================================
function handleAddressSearch(keyword) {
  if (!keyword || keyword.trim().length < 3) {
    return respond({ success: false, message: 'Keyword minimal 3 karakter' }, 400);
  }
  const url = `${CONFIG.MENGANTAR_BASE_URL}/api/public/${CONFIG.MENGANTAR_API_KEY}/address/search?keyword=${encodeURIComponent(keyword.trim())}`;
  const result = externalFetch(url);
  if (result.success !== false) {
    return respond({ success: true, data: result.data || [] });
  } else {
    return respond({ success: false, message: result.message || 'Gagal mencari alamat' }, 500);
  }
}

// ============================================================
// 3. CREATE ORDER
// ============================================================
function handleCreateOrder(payload) {
  // Validasi
  const required = ['customerName', 'customerPhone', 'province', 'city', 'district', 'subdistrict', 'addressDetail', 'destinationAddressId', 'qty', 'courierChoice', 'paymentType'];
  const missing = required.filter(k => !payload[k]);
  if (missing.length) {
    return respond({ success: false, message: `Data belum lengkap: ${missing.join(', ')}` }, 400);
  }

  const {
    customerName, customerPhone, province, city, district, subdistrict, addressDetail,
    destinationAddressId, qty, courierChoice, paymentType, paymentChannel
  } = payload;

  const cleanPhone = String(customerPhone).replace(/\D/g, '');
  if (!/^\d{9,15}$/.test(cleanPhone)) {
    return respond({ success: false, message: 'Nomor HP tidak valid' }, 400);
  }

  // Hitung diskon
  const qtyNum = Math.min(Math.max(1, Number(qty)), 5);
  const disc = [0, 0, 0.10, 0.12, 0.14, 0.15][qtyNum] || 0;
  const pricePerPcs = Math.round(CONFIG.PRODUCT_PRICE * (1 - disc));
  const totalDiscounted = pricePerPcs * qtyNum;
  const totalOriginal = CONFIG.PRODUCT_PRICE * qtyNum;
  const weightKg = (CONFIG.PRODUCT_WEIGHT_GRAM * qtyNum) / 1000;

  const orderId = 'SPRAY-' + new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const fullAddress = `${addressDetail}, ${subdistrict}, ${district}, ${city}, ${province}`;

  // Peta courier
  const courierMap = { 'Direkomendasikan': 'JT', 'JNT': 'JT', 'SiCepat': 'SiCepat', 'Sap': 'Sap', 'iDexpress': 'iDexpress' };
  const courierApi = courierMap[courierChoice] || 'JT';

  const sheet = getSheet();

  // ---------- COD ----------
  if (paymentType === 'COD') {
    const mengantarPayload = {
      courier: courierApi,
      pickup: { type: 'dropOff', address_id: CONFIG.MENGANTAR_PICKUP_ADDRESS_ID },
      orders: [{
        goodsValue: totalDiscounted,
        COD: totalDiscounted,
        customerAddress: fullAddress,
        customerName: customerName,
        customerAddressDataId: destinationAddressId,
        customerPhone: cleanPhone,
        parcelContent: CONFIG.PRODUCT_NAME,
        weight: weightKg,
        quantity: qtyNum,
      }]
    };
    const mengantarResult = externalFetch(
      `${CONFIG.MENGANTAR_BASE_URL}/api/public/${CONFIG.MENGANTAR_API_KEY}/order`,
      { method: 'POST', body: JSON.stringify(mengantarPayload) }
    );
    const item = (mengantarResult.data && mengantarResult.data[0]) || {};
    const cnote = item.cnote_no || '-';
    const mengantarOrderId = item.ORDER_ID || '-';

    appendRow(sheet, {
      order_id: orderId,
      created_at: new Date().toISOString(),
      customer_name: customerName,
      customer_phone: cleanPhone,
      full_address: fullAddress,
      destination_address_id: destinationAddressId,
      product_name: CONFIG.PRODUCT_NAME,
      qty: qtyNum,
      price_per_pcs: pricePerPcs,
      discount_percent: Math.round(disc * 100),
      total_price: totalDiscounted,
      payment_type: 'COD',
      payment_channel: '-',
      courier_choice: courierChoice,
      courier_mengantar: courierApi,
      payment_status: '-',
      cashi_order_id: '-',
      cashi_checkout_url: '-',
      mengantar_order_id: mengantarOrderId,
      cnote_no: cnote,
      sudah_dikirim: 'FALSE',
      sudah_diterima: 'FALSE',
      notes: item.error || '',
    });

    return respond({
      success: true,
      orderId,
      paymentType: 'COD',
      totalPrice: totalDiscounted,
    });
  }

  // ---------- NON-COD ----------
  if (paymentType === 'NONCOD') {
    const channelMap = {
      'QRIS_CUSTOM': { label: 'QRIS', min: 2000, max: 10000000 },
      'MANDIRI': { label: 'Mandiri VA', min: 10000, max: 50000000 },
      'BCA': { label: 'BCA VA', min: 10000, max: 50000000 },
      'BNI': { label: 'BNI VA', min: 10000, max: 50000000 },
      'BRI': { label: 'BRI VA', min: 10000, max: 50000000 },
      'BSI': { label: 'BSI VA', min: 10000, max: 50000000 },
      'ALFAMART': { label: 'Alfamart', min: 15000, max: 2500000 },
      'INDOMARET': { label: 'Indomaret', min: 15000, max: 2500000 },
    };
    const ch = channelMap[paymentChannel];
    if (!ch) return respond({ success: false, message: 'Metode pembayaran tidak valid' }, 400);
    if (totalDiscounted < ch.min || totalDiscounted > ch.max) {
      return respond({ success: false, message: `Total di luar batas ${ch.label} (min ${ch.min}, max ${ch.max})` }, 400);
    }

    const cashiPayload = {
      amount: totalDiscounted,
      order_id: orderId,
      code_channel: paymentChannel,
    };
    const cashiResult = externalFetch(
      `${CONFIG.CASHI_BASE_URL}/api/create-order`,
      { method: 'POST', headers: { 'x-api-key': CONFIG.CASHI_API_KEY }, body: JSON.stringify(cashiPayload) }
    );
    if (!cashiResult.success) {
      return respond({ success: false, message: cashiResult.message || 'Gagal buat transaksi Cashi' }, 500);
    }

    appendRow(sheet, {
      order_id: orderId,
      created_at: new Date().toISOString(),
      customer_name: customerName,
      customer_phone: cleanPhone,
      full_address: fullAddress,
      destination_address_id: destinationAddressId,
      product_name: CONFIG.PRODUCT_NAME,
      qty: qtyNum,
      price_per_pcs: pricePerPcs,
      discount_percent: Math.round(disc * 100),
      total_price: totalDiscounted,
      payment_type: 'NONCOD',
      payment_channel: paymentChannel,
      courier_choice: courierChoice,
      courier_mengantar: courierApi,
      payment_status: 'PENDING',
      cashi_order_id: orderId,
      cashi_checkout_url: cashiResult.checkout_url || '-',
      mengantar_order_id: '-',
      cnote_no: '-',
      sudah_dikirim: 'FALSE',
      sudah_diterima: 'FALSE',
      notes: '',
    });

    return respond({
      success: true,
      orderId,
      paymentType: 'NONCOD',
      totalPrice: totalDiscounted,
      payment: cashiResult,
    });
  }

  return respond({ success: false, message: 'paymentType harus COD atau NONCOD' }, 400);
}

// ============================================================
// 4. CHECK STATUS (GET)
// ============================================================
function handleCheckStatus(orderId) {
  if (!orderId) return respond({ success: false, message: 'orderId wajib diisi' }, 400);
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return respond({ success: false, message: 'Order tidak ditemukan' }, 404);
  const header = rows[0];
  const idx = row => header.indexOf(row);
  const oidIdx = idx('order_id');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][oidIdx] === orderId) {
      const rowData = rows[i];
      const status = deriveShippingStatus(rowData, header);
      return respond({
        success: true,
        orderId,
        paymentStatus: rowData[idx('payment_status')],
        paymentType: rowData[idx('payment_type')],
        shippingStatus: status,
        cnoteNo: rowData[idx('cnote_no')] !== '-' ? rowData[idx('cnote_no')] : null,
        productName: rowData[idx('product_name')],
        qty: rowData[idx('qty')],
        totalPrice: rowData[idx('total_price')],
      });
    }
  }
  return respond({ success: false, message: 'Order tidak ditemukan' }, 404);
}

// ============================================================
// 5. TRACK ORDER BY PHONE (GET)
// ============================================================
function handleTrackOrder(phone) {
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 9) return respond({ success: false, message: 'Nomor HP tidak valid' }, 400);
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return respond({ success: true, orders: [] });
  const header = rows[0];
  const idx = row => header.indexOf(row);
  const phoneIdx = idx('customer_phone');
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][phoneIdx]).replace(/\D/g, '') === clean) {
      result.push({
        orderId: rows[i][idx('order_id')],
        createdAt: rows[i][idx('created_at')],
        productName: rows[i][idx('product_name')],
        qty: rows[i][idx('qty')],
        totalPrice: rows[i][idx('total_price')],
        paymentType: rows[i][idx('payment_type')],
        paymentChannel: rows[i][idx('payment_channel')],
        paymentStatus: rows[i][idx('payment_status')],
        cnoteNo: rows[i][idx('cnote_no')] !== '-' ? rows[i][idx('cnote_no')] : null,
        shippingStatus: deriveShippingStatus(rows[i], header),
      });
    }
  }
  return respond({ success: true, orders: result });
}

// ============================================================
// 6. CASHI WEBHOOK (POST)
// ============================================================
function handleCashiWebhook(body, e) {
  // Verifikasi signature (sederhana, dari query param atau body)
  const signature = e && e.parameter && e.parameter['x-gateway-signature'] ? e.parameter['x-gateway-signature'] : '';
  const providedSig = signature || body.signature || '';
  const rawBody = e.postData ? e.postData.contents : '';
  const secret = CONFIG.CASHI_WEBHOOK_SECRET;
  if (secret && providedSig) {
    const expected = Utilities.computeHmacSha256Signature(rawBody, secret)
      .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2))
      .join('');
    if (expected !== providedSig) {
      return respond({ success: false, message: 'Invalid signature' }, 401);
    }
  }

  const { event, data } = body;
  if (data && String(data.order_id || '').startsWith('TEST-')) {
    return respond({ success: true, message: 'Test OK' });
  }
  if (event !== 'PAYMENT_SETTLED' || data.status !== 'SETTLED') {
    return respond({ success: true, message: 'Event ignored' });
  }

  const orderId = data.order_id;
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return respond({ success: true, message: 'Order not found' });
  const header = rows[0];
  const idx = row => header.indexOf(row);
  const oidIdx = idx('order_id');
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][oidIdx] === orderId) { rowIndex = i; break; }
  }
  if (rowIndex === -1) return respond({ success: true, message: 'Order not found' });

  const row = rows[rowIndex];
  const statusIdx = idx('payment_status');
  if (row[statusIdx] === 'PAID') return respond({ success: true, message: 'Already processed' });

  // Update payment status
  const range = sheet.getRange(rowIndex + 1, statusIdx + 1);
  range.setValue('PAID');

  // Buat order Mengantar
  const customerName = row[idx('customer_name')];
  const customerPhone = row[idx('customer_phone')];
  const fullAddress = row[idx('full_address')];
  const destAddrId = row[idx('destination_address_id')];
  const qty = Number(row[idx('qty')]);
  const totalPrice = Number(row[idx('total_price')]);
  const courierApi = row[idx('courier_mengantar')];
  const weightKg = (CONFIG.PRODUCT_WEIGHT_GRAM * qty) / 1000;

  const mengantarPayload = {
    courier: courierApi,
    pickup: { type: 'dropOff', address_id: CONFIG.MENGANTAR_PICKUP_ADDRESS_ID },
    orders: [{
      goodsValue: totalPrice,
      COD: 0,
      customerAddress: fullAddress,
      customerName: customerName,
      customerAddressDataId: destAddrId,
      customerPhone: customerPhone,
      parcelContent: CONFIG.PRODUCT_NAME,
      weight: weightKg,
      quantity: qty,
    }]
  };
  const mengantarResult = externalFetch(
    `${CONFIG.MENGANTAR_BASE_URL}/api/public/${CONFIG.MENGANTAR_API_KEY}/order`,
    { method: 'POST', body: JSON.stringify(mengantarPayload) }
  );
  const item = (mengantarResult.data && mengantarResult.data[0]) || {};
  const cnote = item.cnote_no || '-';
  const mengantarOrderId = item.ORDER_ID || '-';

  const cnoteIdx = idx('cnote_no');
  const mengIdx = idx('mengantar_order_id');
  const noteIdx = idx('notes');
  if (cnoteIdx > -1) sheet.getRange(rowIndex + 1, cnoteIdx + 1).setValue(cnote);
  if (mengIdx > -1) sheet.getRange(rowIndex + 1, mengIdx + 1).setValue(mengantarOrderId);
  if (noteIdx > -1) sheet.getRange(rowIndex + 1, noteIdx + 1).setValue(item.error || '');

  return respond({ success: true, message: 'OK' });
}

// ============================================================
// HELPER: Google Sheets
// ============================================================
function getSheet() {
  const ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Orders');
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    const headers = [
      'order_id', 'created_at', 'customer_name', 'customer_phone', 'full_address',
      'destination_address_id', 'product_name', 'qty', 'price_per_pcs', 'discount_percent',
      'total_price', 'payment_type', 'payment_channel', 'courier_choice', 'courier_mengantar',
      'payment_status', 'cashi_order_id', 'cashi_checkout_url', 'mengantar_order_id',
      'cnote_no', 'sudah_dikirim', 'sudah_diterima', 'notes'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#4CAF50');
    sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  }
  return sheet;
}

function appendRow(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function deriveShippingStatus(row, header) {
  const idx = h => header.indexOf(h);
  const paymentType = row[idx('payment_type')];
  const paymentStatus = row[idx('payment_status')];
  if (paymentType === 'NONCOD' && paymentStatus !== 'PAID') {
    return 'MENUNGGU_PEMBAYARAN';
  }
  const dikirim = String(row[idx('sudah_dikirim')]).toUpperCase() === 'TRUE';
  const diterima = String(row[idx('sudah_diterima')]).toUpperCase() === 'TRUE';
  if (diterima) return 'DITERIMA';
  if (dikirim) return 'DIKIRIM';
  return 'DIKEMAS';
}