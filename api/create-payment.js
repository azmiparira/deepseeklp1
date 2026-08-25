// api/create-order.js
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
    const apiKey = process.env.MENGANTAR_API_KEY;
    const baseUrl = process.env.MENGANTAR_BASE_URL;

    // Pastikan weight menggunakan dari env
    if (orderData.orders && orderData.orders.length > 0) {
      // Weight sudah dikirim dari frontend, tapi kita bisa override jika perlu
      // Biarkan frontend mengirim weight
    }

    const response = await fetch(`${baseUrl}/${apiKey}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
}