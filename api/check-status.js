// api/check-status.js
// ENDPOINT: GET /api/check-status?orderId=xxx

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId required' });
    }

    const apiKey = process.env.CASHI_API_KEY;
    const baseUrl = process.env.CASHI_BASE_URL;

    const response = await fetch(`${baseUrl}/check-status/${orderId}`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error checking status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check status',
      error: error.message,
    });
  }
}