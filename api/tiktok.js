/**
 * Serverless function to fetch TikTok metadata via official oEmbed API.
 * Avoids browser CORS and Cloudflare bot challenge issues.
 *
 * CHANGED: Added short URL resolution for vm.tiktok.com / vt.tiktok.com links
 * shared from the TikTok mobile app — these must be followed to their final
 * canonical URL before the oEmbed API can resolve them.
 */

/**
 * Follows HTTP redirects for a URL and returns the final resolved URL.
 * Used to expand TikTok short links (vm.tiktok.com, vt.tiktok.com) before
 * passing to the oEmbed API.
 */
async function resolveRedirects(url, maxHops = 5) {
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    try {
      const res = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        },
      });
      // 3xx = redirect — follow the Location header
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) break;
        // Handle relative redirects
        current = location.startsWith('http') ? location : new URL(location, current).href;
      } else {
        break; // final destination reached
      }
    } catch {
      break; // network error, use current URL
    }
  }
  return current;
}

/**
 * Returns true if this URL is a TikTok short link that needs redirect resolution.
 */
function isShortTikTokUrl(url) {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'vm.tiktok.com' ||
      hostname === 'vt.tiktok.com' ||
      hostname === 'm.tiktok.com'
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    const rawUrl = req.query?.url || (req.url ? new URL(req.url, 'http://localhost').searchParams.get('url') : null);
    if (!rawUrl) {
      return res.status(400).json({ error: true, message: 'Missing url parameter' });
    }

    // CHANGED: Resolve short TikTok links to their canonical URL before oEmbed
    let url = rawUrl;
    if (isShortTikTokUrl(rawUrl)) {
      try {
        url = await resolveRedirects(rawUrl);
      } catch {
        url = rawUrl; // fallback to original if resolution fails
      }
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
