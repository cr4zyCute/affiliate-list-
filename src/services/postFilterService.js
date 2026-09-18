/**
 * Social Media Posting Platforms mapping per category.
 * - Shopee: Shopee, Facebook, Instagram
 * - TikTok: TikTok, Facebook, Instagram
 * - Lazada: Lazada, Facebook, Instagram
 * - Amazon: Pinterest, Facebook, Instagram, YouTube, Quora, X
 * - Other: Facebook, Instagram, X
 */

export const CATEGORY_PLATFORMS = {
  shopee: [
    { id: 'shopee', label: 'Shopee' },
    { id: 'fb', label: 'Facebook' },
    { id: 'ig', label: 'Instagram' },
  ],
  tiktok: [
    { id: 'tiktok', label: 'TikTok' },
    { id: 'fb', label: 'Facebook' },
    { id: 'ig', label: 'Instagram' },
  ],
  lazada: [
    { id: 'lazada', label: 'Lazada' },
    { id: 'fb', label: 'Facebook' },
    { id: 'ig', label: 'Instagram' },
  ],
  amazon: [
    { id: 'pinterest', label: 'Pinterest' },
    { id: 'fb', label: 'Facebook' },
    { id: 'ig', label: 'Instagram' },
    { id: 'yt', label: 'YouTube' },
    { id: 'quora', label: 'Quora' },
    { id: 'x', label: 'X (Twitter)' },
  ],
  other: [
    { id: 'fb', label: 'Facebook' },
    { id: 'ig', label: 'Instagram' },
    { id: 'x', label: 'X (Twitter)' },
  ],
};

/**
 * Returns required platforms for a single link based on its category or url/domain.
 */
export function getRequiredPlatformsForLink(link) {
  const cat = String(link?.category || '').toLowerCase();
  const url = String(link?.url || '').toLowerCase();
  const dom = String(link?.domain || '').toLowerCase();

  if (cat === 'shopee' || url.includes('shopee') || url.includes('shp.ee') || dom.includes('shopee') || dom.includes('shp.ee')) {
    return CATEGORY_PLATFORMS.shopee;
  }
  if (cat === 'tiktok' || url.includes('tiktok') || dom.includes('tiktok')) {
    return CATEGORY_PLATFORMS.tiktok;
  }
  if (cat === 'lazada' || url.includes('lazada') || url.includes('lzd.co') || dom.includes('lazada') || dom.includes('lzd.co')) {
    return CATEGORY_PLATFORMS.lazada;
  }
  if (cat === 'amazon' || url.includes('amazon') || url.includes('amzn.to') || url.includes('amzn.com') || dom.includes('amazon')) {
    return CATEGORY_PLATFORMS.amazon;
  }
  return CATEGORY_PLATFORMS.other;
}

/**
 * Returns the relevant platform list for a category filter tab.
 */
export function getPlatformsForCategoryTab(category) {
  const c = String(category || 'all').toLowerCase();
  if (c === 'shopee') return CATEGORY_PLATFORMS.shopee;
  if (c === 'tiktok') return CATEGORY_PLATFORMS.tiktok;
  if (c === 'lazada') return CATEGORY_PLATFORMS.lazada;
  if (c === 'amazon') return CATEGORY_PLATFORMS.amazon;
  if (c === 'other') return CATEGORY_PLATFORMS.other;

  // For 'all', return union of all known platforms
  return [
    { id: 'shopee', label: 'Shopee' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'lazada', label: 'Lazada' },
    { id: 'pinterest', label: 'Pinterest' },
    { id: 'fb', label: 'Facebook' },
    { id: 'ig', label: 'Instagram' },
    { id: 'yt', label: 'YouTube' },
    { id: 'quora', label: 'Quora' },
    { id: 'x', label: 'X' },
  ];
}

/**
 * Check if a link is completely unposted (0 platforms posted)
 */
export function isLinkNotPosted(link) {
  const posted = Array.isArray(link?.postedPlatforms) ? link.postedPlatforms : [];
  return posted.length === 0;
}

/**
 * Check if a link is fully posted to all platforms required for its category
 */
export function isLinkFullyPosted(link) {
  const required = getRequiredPlatformsForLink(link);
  const posted = Array.isArray(link?.postedPlatforms) ? link.postedPlatforms : [];
  if (required.length === 0) return posted.length > 0;
  return required.every((req) => posted.includes(req.id));
}

/**
 * Check if a link is partially posted (at least 1, but not all)
 */
export function isLinkPartiallyPosted(link) {
  const posted = Array.isArray(link?.postedPlatforms) ? link.postedPlatforms : [];
  if (posted.length === 0) return false;
  return !isLinkFullyPosted(link);
}

/**
 * Check if a link has posted to a specific platform
 */
export function isLinkPostedTo(link, platformId) {
  const posted = Array.isArray(link?.postedPlatforms) ? link.postedPlatforms : [];
  return posted.includes(platformId);
}

/**
 * Filter an array of links based on postFilter
 * @param {Array} links
 * @param {string} postFilter - 'all' | 'not_posted' | 'partially_posted' | 'fully_posted' | 'posted_<platform>' | 'not_posted_<platform>'
 */
export function filterLinksByPostStatus(links, postFilter) {
  if (!postFilter || postFilter === 'all') return links;

  if (postFilter === 'not_posted') {
    return links.filter(isLinkNotPosted);
  }

  if (postFilter === 'partially_posted') {
    return links.filter(isLinkPartiallyPosted);
  }

  if (postFilter === 'fully_posted') {
    return links.filter(isLinkFullyPosted);
  }

  if (postFilter === 'any_posted') {
    return links.filter((l) => {
      const posted = Array.isArray(l?.postedPlatforms) ? l.postedPlatforms : [];
      return posted.length > 0;
    });
  }

  if (postFilter.startsWith('posted_')) {
    const platformId = postFilter.replace('posted_', '');
    return links.filter((l) => isLinkPostedTo(l, platformId));
  }

  if (postFilter.startsWith('not_posted_')) {
    const platformId = postFilter.replace('not_posted_', '');
    return links.filter((l) => !isLinkPostedTo(l, platformId));
  }

  return links;
}

/**
 * Calculate post status summary counts for a given list of links
 */
export function getPostStatusCounts(links) {
  let notPosted = 0;
  let partiallyPosted = 0;
  let fullyPosted = 0;

  for (const l of links) {
    const posted = Array.isArray(l?.postedPlatforms) ? l.postedPlatforms : [];
    if (posted.length === 0) {
      notPosted++;
    } else if (isLinkFullyPosted(l)) {
      fullyPosted++;
    } else {
      partiallyPosted++;
    }
  }

  return {
    all: links.length,
    notPosted,
    partiallyPosted,
    fullyPosted,
  };
}
