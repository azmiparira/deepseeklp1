// api/search-address.js
// ENDPOINT: GET /api/search-address?keyword=xxx

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
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) {
      return res.status(400).json({ success: false, message: 'Keyword minimal 2 karakter' });
    }

    const apiKey = process.env.MENGANTAR_API_KEY;
    const baseUrl = process.env.MENGANTAR_BASE_URL;

    const response = await fetch(`${baseUrl}/${apiKey}/address/search?keyword=${encodeURIComponent(keyword)}`);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error searching address:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search address',
      error: error.message,
    });
  }
}