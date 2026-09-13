/**
 * Serverless function to fetch TikTok metadata via official oEmbed API.
 * Avoids browser CORS and Cloudflare bot challenge issues.
 */
export default async function handler(req, res) {
  try {
    const url = req.query?.url || (req.url ? new URL(req.url, 'http://localhost').searchParams.get('url') : null);
    if (!url) {
      return res.status(400).json({ error: true, message: 'Missing url parameter' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({ error: true });
    }

    const data = await response.json();
    if (!data || !data.thumbnail_url) {
      return res.status(200).json({ error: true });
    }

    return res.status(200).json({
      title: data.title || 'TikTok Video',
      image: data.thumbnail_url,
      description: data.author_name ? `By @${data.author_name}` : 'TikTok Video',
    });
  } catch (err) {
    console.error('api/tiktok error:', err.message);
    return res.status(200).json({ error: true });
  }
}
