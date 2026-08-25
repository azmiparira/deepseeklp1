// api/config.js
// ENDPOINT: GET /api/config

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.status(200).json({
      success: true,
      productPrice: parseInt(process.env.PRODUCT_PRICE) || 209000,
      productWeight: parseFloat(process.env.PRODUCT_WEIGHT_KG) || 0.15,
      productName: process.env.PRODUCT_NAME || 'Spray Tidur',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load config',
    });
  }
}