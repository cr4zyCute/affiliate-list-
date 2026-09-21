/**
 * Public Store API — /api/store
 *
 * Returns Amazon affiliate links that are marked visible on the public store.
 * The Turso auth token is read from server-side env vars (no VITE_ prefix),
 * so it is NEVER sent to visitor browsers.
 */
export default async function handler(req, res) {
  // CORS: allow the public store page to call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read server-side env vars, with fallback to VITE_ prefix if configured that way in Vercel
  const dbUrl = process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    return res.status(500).json({ error: 'Store database not configured.' });
  }

  try {
    // Use Turso HTTP API directly — no client library needed in serverless
    const tursoUrl = dbUrl.replace('libsql://', 'https://');
    const response = await fetch(`${tursoUrl}/v2/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql: `SELECT id, url, domain, category, title, description, image, caption, affiliate_url, page_url, created_at
                    FROM links
                    WHERE (category = 'amazon' OR url LIKE '%amazon.%' OR url LIKE '%amzn.%')
                      AND (store_visible IS NULL OR store_visible = 1)
                    ORDER BY created_at DESC`,
              args: [],
            },
          },
          { type: 'close' },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Turso HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const rows = data?.results?.[0]?.response?.result?.rows ?? [];
    const cols = data?.results?.[0]?.response?.result?.cols ?? [];

    // Map column names to values
    const colNames = cols.map((c) => c.name);
    const products = rows.map((row) => {
      const obj = {};
      colNames.forEach((col, i) => {
        obj[col] = row[i]?.value ?? null;
      });
      return {
        id: obj.id,
        title: obj.title || 'Amazon Product',
        description: obj.description || '',
        caption: obj.caption || '',
        image: obj.image || null,
        url: obj.affiliate_url || obj.url,
        pageUrl: obj.page_url || obj.url,
        domain: obj.domain || 'amazon.com',
        createdAt: obj.created_at,
      };
    });

    return res.status(200).json({ products });
  } catch (err) {
    console.error('[/api/store] error:', err);
    return res.status(500).json({ error: 'Failed to load store products.' });
  }
}
