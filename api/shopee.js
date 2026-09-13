import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

/**
 * Follows HTTP 301/302/303/307/308 redirects manually using Node's https/http module.
 * Follows Location headers up to maxRedirects times.
 */
function followRedirectsManual(initialUrl, maxRedirects = 5) {
  return new Promise((resolve) => {
    let currentUrl = initialUrl;
    let redirectsCount = 0;

    function step(urlStr) {
      if (redirectsCount >= maxRedirects) {
        return resolve(urlStr);
      }

      try {
        const parsed = new URL(urlStr);
        const client = parsed.protocol === 'http:' ? http : https;

        const req = client.get(
          urlStr,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 6000,
          },
          (res) => {
            const statusCode = res.statusCode || 0;
            const location = res.headers.location;

            if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
              redirectsCount++;
              const nextUrl = new URL(location, urlStr).href;
              res.resume();
              return step(nextUrl);
            }

            res.resume();
            return resolve(urlStr);
          }
        );

        req.on('timeout', () => {
          req.destroy();
          resolve(urlStr);
        });

        req.on('error', () => {
          resolve(urlStr);
        });
      } catch {
        resolve(urlStr);
      }
    }

    step(currentUrl);
  });
}

/**
 * Serverless function for Shopee shortlinks and product links.
 * Resolves redirects server-side and queries Microlink with followRedirects=true.
 */
export default async function handler(req, res) {
  try {
    const url = req.query?.url || (req.url ? new URL(req.url, 'http://localhost').searchParams.get('url') : null);
    if (!url) {
      return res.status(400).json({ error: true, message: 'Missing url parameter' });
    }

    // Step 1: Follow redirects on shortlink manually up to 5 times
    const resolvedUrl = await followRedirectsManual(url, 5);

    // Step 2: Call Microlink from server side
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const mlUrl = `https://api.microlink.io?url=${encodeURIComponent(resolvedUrl)}&followRedirects=true&meta=true`;
    const mlRes = await fetch(mlUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!mlRes.ok) {
      return res.status(200).json({ error: true });
    }

    const mlJson = await mlRes.json();
    const imageUrl = mlJson.data?.image?.url || '';

    // Return real product image if it contains susercontent.com
    if (mlJson.status === 'success' && imageUrl && imageUrl.includes('susercontent.com')) {
      return res.status(200).json({
        title: mlJson.data.title || 'Shopee Product',
        image: imageUrl,
        description: mlJson.data.description || resolvedUrl,
      });
    }

    return res.status(200).json({ error: true });
  } catch (err) {
    console.error('api/shopee error:', err.message);
    return res.status(200).json({ error: true });
  }
}
