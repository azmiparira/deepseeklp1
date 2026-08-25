// api/save-order.js
// ENDPOINT: POST /api/save-order

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const orderData = req.body;
    const gsUrl = process.env.GS_API_URL;

    // Forward ke Google Sheets
    await fetch(gsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    return res.status(200).json({
      success: true,
      message: 'Order saved to Google Sheets',
      orderId: orderData.orderId,
    });
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    return res.status(200).json({
      success: true,
      message: 'Order processed (sheet save failed)',
      orderId: req.body.orderId || 'unknown',
    });
  }
}