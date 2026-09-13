/**
 * Serverless function for receiving saved links from LinkVault Saver Chrome Extension.
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, title, image, category, source } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'Missing url in payload' });
    }

    return res.status(200).json({
      success: true,
      message: 'Link received successfully',
      data: { url, title, image, category, source: source || 'extension' }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
