/**
 * Service for URL validation, normalization, and Open Graph metadata extraction.
 * Includes anti-bot/captcha detection, YouTube thumbnail resolution, and multi-link extraction.
 */

// Basic domain-to-brand color mapping for vibrant card fallbacks
const BRAND_COLORS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
];

// Keywords commonly found when an external site's bot protection blocks the scraper
const BOT_CHALLENGE_KEYWORDS = [
  'security check',
  'verify to continue',
  'just a moment',
  'attention required',
  'robot check',
  'human verification',
  'cloudflare',
  'please wait',
  'are you human',
  'cf-browser-verification',
  'access denied',
];

/**
 * Normalizes input URL by trimming, removing extraneous whitespace,
 * stripping trailing punctuation, and adding https:// if protocol is omitted.
 */
export function normalizeUrl(input) {
  if (!input) return '';
  let trimmed = input.trim();

  // If input contains multiple space-separated parts, take the first URL
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    trimmed = parts[0] || trimmed;
  }
  
  // Clean off common trailing punctuation like commas, periods, quotes, brackets
  trimmed = trimmed.replace(/^[<([{"'`]+/, '').replace(/[.,;:)\]}>"'`]+$/, '').trim();

  // If user pasted without protocol (e.g., "shopee.ph" or "vt.tiktok.com/123")
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  
  return trimmed;
}

/**
 * Extracts all valid URLs from a raw text string, cleanly stripping out surrounding
 * words, whitespace, newlines, and trailing punctuation.
 */
export function extractUrlsFromText(text) {
  if (!text) return [];

  // Match standard URLs (http/https) and bare domains with paths
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+|[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,}(?:\/[^\s<>"'{}|\\^`]*)?)/gi;
  const matches = text.match(urlRegex) || [];
  const validUrls = [];

  for (let match of matches) {
    // Strip trailing punctuation often caught from text sentences
    const cleanMatch = match.replace(/[.,;:)\]}>"'`]+$/, '').trim();
    if (isValidUrl(cleanMatch)) {
      validUrls.push(normalizeUrl(cleanMatch));
    }
  }

  // Deduplicate
  return [...new Set(validUrls)];
}

/**
 * Validates whether string is a well-formed HTTP/HTTPS URL.
 */
export function isValidUrl(input) {
  if (!input) return false;
  try {
    const normalized = normalizeUrl(input);
    const parsed = new URL(normalized);
    // Ensure protocol is http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Ensure hostname has at least a dot or is localhost
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return false;
    }
    // Basic domain validation
    return parsed.hostname.length > 3;
  } catch {
    return false;
  }
}

/**
 * Extracts clean domain name from URL (e.g., 'youtube.com' from 'https://www.youtube.com/watch?v=123').
 */
export function extractDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return urlStr;
  }
}

/**
 * Generates a consistent gradient background for domain fallback visuals.
 */
export function getDomainGradient(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BRAND_COLORS.length;
  return BRAND_COLORS[index];
}

/**
 * Gets high-resolution favicon for domain via Google's reliable favicon service.
 */
export function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

/**
 * Extracts YouTube video ID if URL is a YouTube watch or short link.
 */
function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1]?.split(/[?#/]/)[0];
      }
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split(/[?#/]/)[0];
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Automatically detects whether a URL belongs to Shopee, TikTok, Lazada, or other platforms.
 */
export function detectCategory(urlStr) {
  if (!urlStr) return 'other';
  const str = String(urlStr).toLowerCase();

  // Lazada detection
  if (
    str.includes('lazada.') ||
    str.includes('lzd.co') ||
    str.includes('lazada')
  ) {
    return 'lazada';
  }

  // Shopee detection (shopee.ph, shopee.com, shp.ee, ph.shp.ee, shope.ee, affiliate links, etc.)
  if (
    str.includes('shopee.') ||
    str.includes('shp.ee') ||
    str.includes('shope.ee') ||
    str.includes('shopee')
  ) {
    return 'shopee';
  }

  // TikTok detection (tiktok.com, vt.tiktok.com, vm.tiktok.com, tiktok shortlinks, etc.)
  if (
    str.includes('tiktok.com') ||
    str.includes('vt.tiktok') ||
    str.includes('vm.tiktok') ||
    str.includes('tiktokv.com') ||
    str.includes('tiktok')
  ) {
    return 'tiktok';
  }

  return 'other';
}

/**
 * Checks if the scraped title/description is an anti-bot challenge (e.g. TikTok/Cloudflare captcha).
 */
function isBotChallenge(title, description) {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  return BOT_CHALLENGE_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * Helper to check if a Shopee title is generic (e.g. homepage or regional slogan).
 */
function isGenericShopeeTitle(title) {
  if (!title || typeof title !== 'string') return true;
  const t = title.trim().toLowerCase();
  return (
    t === 'shopee' ||
    t === 'shopee ph' ||
    t === 'shopee philippines' ||
    t === 'shopee product' ||
    t.includes('shop online with promos') ||
    t.includes('online shopping | shopee') ||
    t.startsWith('shopee philippines |') ||
    t.startsWith('shopee ph |')
  );
}

/**
 * Parses product slug from a Shopee URL (e.g. /Portable-Blender-Mini-USB-i.12345.67890),
 * converts hyphens to spaces, and title-cases it.
 */
function parseShopeeSlugTitle(urlStr) {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr);
    const pathname = decodeURIComponent(parsed.pathname);

    let slug = '';
    if (pathname.includes('-i.')) {
      slug = pathname.split('-i.')[0];
    } else if (pathname.includes('-cat.')) {
      slug = pathname.split('-cat.')[0];
    } else if (pathname.includes('/product/')) {
      slug = pathname.split('/product/')[1]?.split('/')[0] || '';
    }

    if (slug) {
      slug = slug.replace(/^\/+/, '');
      const words = slug.replace(/[-_+]+/g, ' ').trim().split(/\s+/).filter(Boolean);
      return words
        .map((w) => {
          if (w.length <= 3 && w === w.toUpperCase()) return w;
          return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(' ');
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Creates an instantaneous link item for optimistic UI updates in the list.
 */
export function createOptimisticLink(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const domain = extractDomain(url);
  const favicon = getFaviconUrl(domain);
  const category = detectCategory(url);

  let initialTitle = domain
    .split('.')[0]
    .replace(/^./, (c) => c.toUpperCase());

  let initialDesc = 'Fetching website preview...';

  if (category === 'shopee') {
    const slugTitle = parseShopeeSlugTitle(url);
    initialTitle = slugTitle || 'Shopee Product';
    initialDesc = 'Fetching Shopee details...';
  } else if (category === 'tiktok') {
    initialTitle = 'TikTok Video';
    initialDesc = 'Fetching TikTok preview...';
  } else if (category === 'lazada') {
    initialTitle = 'Lazada Product';
    initialDesc = 'Fetching Lazada details...';
  } else if (domain.includes('youtube.com') || domain === 'youtu.be') {
    initialTitle = 'YouTube Video';
  }

  const ytId = getYouTubeVideoId(url);
  const nativeYtImage = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  return {
    id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url,
    domain,
    category,
    title: initialTitle,
    description: initialDesc,
    image: nativeYtImage || null,
    favicon,
    fallbackGradient: getDomainGradient(domain),
    isLoading: !nativeYtImage,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fetches Open Graph / Rich metadata for a given URL.
 */
export async function fetchLinkMetadata(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const domain = extractDomain(url);
  const favicon = getFaviconUrl(domain);
  const category = detectCategory(url);
  
  // Clean default title based on domain & category
  let fallbackTitle = domain
    .split('.')[0]
    .replace(/^./, (c) => c.toUpperCase());

  if (category === 'shopee') {
    fallbackTitle = 'Shopee Product';
  } else if (category === 'tiktok') {
    fallbackTitle = 'TikTok Video';
  } else if (category === 'lazada') {
    fallbackTitle = 'Lazada Product';
  } else if (domain.includes('youtube.com') || domain === 'youtu.be') {
    fallbackTitle = 'YouTube Video';
  }

  // Check for native YouTube high-res thumbnail
  const ytId = getYouTubeVideoId(url);
  const nativeYtImage = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  // Default fallback data structure
  const fallbackData = {
    id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url,
    domain,
    category,
    title: fallbackTitle,
    description: category === 'shopee' ? url : `Link saved from ${domain}`,
    image: nativeYtImage || (category === 'shopee' ? 'https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_32.png' : category === 'tiktok' ? 'https://sf-static.tiktokcdn.com/obj/eden-sg/uhtyvueh7nulogpoguhm/tiktok-icon2.png' : null),
    favicon,
    fallbackGradient: getDomainGradient(domain),
    createdAt: new Date().toISOString(),
  };

  // If YouTube URL, prioritize real high-resolution YouTube thumbnail directly
  if (nativeYtImage) {
    return {
      ...fallbackData,
      image: nativeYtImage,
    };
  }

  // 1. TikTok Handler (first tries serverless /api/tiktok, then oEmbed)
  if (category === 'tiktok' || domain.includes('tiktok.com')) {
    // Try serverless API first
    try {
      const apiRes = await fetch(`/api/tiktok?url=${encodeURIComponent(url)}`);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (!apiData.error && apiData.title) {
          return {
            ...fallbackData,
            title: apiData.title,
            description: apiData.description || fallbackData.description,
            image: apiData.image || fallbackData.image,
          };
        }
      }
    } catch {
      // ignore
    }

    // Direct oEmbed fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data) {
          const cardTitle = data.title && data.title.trim() ? data.title.trim() : 'TikTok Video';
          const cardDesc = data.author_name ? `By @${data.author_name}` : fallbackData.description;
          const cardImage = data.thumbnail_url || fallbackData.image;

          return {
            ...fallbackData,
            title: cardTitle,
            description: cardDesc,
            image: cardImage,
            favicon: fallbackData.favicon,
          };
        }
      }
    } catch (err) {
      console.warn(`TikTok oEmbed fetch failed for ${url}:`, err.message);
    }

    return {
      ...fallbackData,
      title: 'TikTok Video',
    };
  }

  // 2. Shopee Handler (first tries serverless /api/shopee, then Microlink + slug parser)
  if (category === 'shopee' || domain.includes('shopee.') || domain.includes('shp.ee')) {
    const directSlugTitle = parseShopeeSlugTitle(url);

    // Try serverless API first
    try {
      const apiRes = await fetch(`/api/shopee?url=${encodeURIComponent(url)}`);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (!apiData.error && (apiData.image || apiData.title)) {
          return {
            ...fallbackData,
            title: apiData.title || directSlugTitle || 'Shopee Product',
            description: apiData.description || url,
            image: apiData.image || fallbackData.image,
          };
        }
      }
    } catch {
      // ignore
    }

    // Direct Microlink fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&followRedirects=true&screenshot=false&meta=true&video=false`;
      const response = await fetch(microlinkUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.status === 'success' && json.data) {
          const resolvedUrl = json.data.url || url;
          const rawTitle = json.data.title || '';
          const imageUrl = json.data.image?.url || '';

          let productTitle = '';
          if (rawTitle && !isGenericShopeeTitle(rawTitle)) {
            productTitle = rawTitle;
          } else {
            const slugTitle = parseShopeeSlugTitle(resolvedUrl) || directSlugTitle;
            if (slugTitle) {
              productTitle = slugTitle;
            }
          }

          const productImage = (imageUrl && imageUrl.includes('susercontent.com'))
            ? imageUrl
            : fallbackData.image;

          return {
            ...fallbackData,
            title: productTitle || directSlugTitle || 'Shopee Product',
            description: json.data.description || resolvedUrl,
            image: productImage,
            favicon: json.data.logo?.url || fallbackData.favicon,
          };
        }
      }
    } catch (err) {
      console.warn(`Shopee metadata fetch failed for ${url}:`, err.message);
    }

    return {
      ...fallbackData,
      title: directSlugTitle || 'Shopee Product',
      description: url,
      image: fallbackData.image,
    };
  }

  // CHANGED: General fallback flow using Microlink with an updated 8 second timeout.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false&meta=true`;
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return fallbackData;
    }

    const json = await response.json();
    if (json.status === 'success' && json.data) {
      let { title, description, image, logo, publisher } = json.data;

      // Anti-Bot Challenge / Captcha Interception Filter:
      if (isBotChallenge(title, description)) {
        console.warn(`Detected anti-bot security challenge from ${domain}. Using clean platform fallback.`);
        title = `${fallbackTitle} (Protected Link)`;
        description = `Direct link to ${domain}`;
        image = null;
      }

      const finalImage = nativeYtImage || image?.url || null;

      return {
        id: fallbackData.id,
        url,
        domain: publisher || domain,
        category: category,
        title: title || fallbackTitle,
        description: description || `Bookmarks on ${domain}`,
        image: finalImage,
        favicon: logo?.url || favicon,
        fallbackGradient: getDomainGradient(domain),
        createdAt: fallbackData.createdAt,
      };
    }
  } catch (err) {
    console.warn(`Error retrieving Open Graph metadata for ${url}:`, err.message);
  }

  return fallbackData;
}
