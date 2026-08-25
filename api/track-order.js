// api/track-order.js
// ENDPOINT: GET /api/track-order?noHp=xxx

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
    const { noHp } = req.query;
    if (!noHp) {
      return res.status(400).json({ success: false, message: 'No HP required' });
    }

    const gsUrl = process.env.GS_API_URL;
    const response = await fetch(`${gsUrl}?noHp=${encodeURIComponent(noHp)}`);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error tracking order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track order',
      error: error.message,
    });
  }
}