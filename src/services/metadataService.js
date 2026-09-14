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
  const d = String(domain || '').toLowerCase();
  if (d.includes('shopee') || d.includes('shp.ee')) {
    return '/shopee-logo.png';
  }
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

  if (category === 'shopee') {
    const slugTitle = parseShopeeSlugTitle(url);
    initialTitle = slugTitle || 'Shopee Link';
  } else if (category === 'tiktok') {
    initialTitle = 'TikTok Link';
  } else if (category === 'lazada') {
    initialTitle = 'Lazada Link';
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
    description: '',
    image: nativeYtImage || null,
    favicon,
    fallbackGradient: getDomainGradient(domain),
    isLoading: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fetches Open Graph / Rich metadata for a given URL.
 * Skips scraping for platforms like Shopee and TikTok.
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
    fallbackTitle = parseShopeeSlugTitle(url) || 'Shopee Link';
  } else if (category === 'tiktok') {
    fallbackTitle = 'TikTok Link';
  } else if (category === 'lazada') {
    fallbackTitle = 'Lazada Link';
  } else if (domain.includes('youtube.com') || domain === 'youtu.be') {
    fallbackTitle = 'YouTube Video';
  }

  // Check for native YouTube high-res thumbnail
  const ytId = getYouTubeVideoId(url);
  const nativeYtImage = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

  // Instant response for Shopee, TikTok, and Lazada (no useless scraping or slow API calls)
  if (category === 'shopee' || category === 'tiktok' || category === 'lazada') {
    return {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      url,
      domain,
      category,
      title: fallbackTitle,
      description: '',
      image: null,
      favicon,
      fallbackGradient: getDomainGradient(domain),
      isLoading: false,
      createdAt: new Date().toISOString(),
    };
  }

  // Default fallback data structure
  const fallbackData = {
    id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url,
    domain,
    category,
    title: fallbackTitle,
    description: '',
    image: nativeYtImage || null,
    favicon,
    fallbackGradient: getDomainGradient(domain),
    isLoading: false,
    createdAt: new Date().toISOString(),
  };

  // If YouTube URL, prioritize real high-resolution YouTube thumbnail directly without network scraping
  if (nativeYtImage) {
    return {
      ...fallbackData,
      image: nativeYtImage,
    };
  }

  return fallbackData;
}

