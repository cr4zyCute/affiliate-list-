/**
 * LinkVault Saver - Content Script
 * Injected automatically into all Shopee and TikTok pages.
 * Listens for { action: "extractData" } message from popup and extracts live DOM data.
 *
 * IMPORTANT NOTE:
 * TikTok short links (vt.tiktok.com) frequently redirect to a login barrier for
 * non-logged-in sessions. The extension works on the full, resolved TikTok video page
 * after the video has loaded (e.g. https://www.tiktok.com/@username/video/123456).
 * Similarly, Shopee short links (s.shopee.ph, shp.ee) must land on the full product page.
 */

/**
 * Extracts metadata from Shopee product pages.
 */
function extractShopee() {
  const currentUrl = window.location.href;
  const domain = window.location.hostname.replace(/^www\./, '');

  // Check if still on a short link redirect
  if (window.location.hostname.includes('s.shopee') || window.location.hostname.includes('shp.ee')) {
    return {
      success: false,
      error: 'Shopee short link is still resolving. Please wait for the full product page to load.'
    };
  }

  // 1. Title: try selectors in order
  let title = '';
  const titleSelectors = [
    'h1[class*="product-name"]',
    '[class*="pdp-product-title"]',
    'h1'
  ];

  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText && el.innerText.trim()) {
      title = el.innerText.trim();
      break;
    }
  }

  // Fallbacks for title
  if (!title) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) {
      title = ogTitle.content.trim();
    }
  }
  if (!title) {
    title = document.title ? document.title.replace(/\|\s*Shopee.*$/i, '').trim() : '';
  }

  // 2. Image: find first <img> whose src contains susercontent.com
  // Check div[class*="product-image"] img, div[class*="pdp-"] img, div[class*="image-wrapper"] img in order
  let image = '';
  const imageContainers = [
    'div[class*="product-image"] img',
    'div[class*="pdp-"] img',
    'div[class*="image-wrapper"] img'
  ];

  for (const containerSel of imageContainers) {
    const imgs = document.querySelectorAll(containerSel);
    for (const img of imgs) {
      const src = img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (src && src.includes('susercontent.com') && !src.includes('favicon') && !src.includes('icon_')) {
        image = src;
        break;
      }
    }
    if (image) break;
  }

  // If not found in containers, scan all <img> tags on page for susercontent.com
  if (!image) {
    const allImgs = document.querySelectorAll('img');
    for (const img of allImgs) {
      const src = img.src || img.getAttribute('src') || '';
      if (src && src.includes('susercontent.com') && !src.includes('favicon') && !src.includes('icon_')) {
        image = src;
        break;
      }
    }
  }

  // Fallback to og:image meta tag
  if (!image) {
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.content) {
      image = ogImg.content;
    }
  }

  if (!title && !image) {
    return { success: false, error: 'Could not find product data on this page' };
  }

  return {
    success: true,
    data: {
      url: currentUrl,
      title: title || 'Shopee Product',
      image: image || '',
      category: 'shopee',
      domain: domain || 'shopee.ph'
    }
  };
}

/**
 * Extracts metadata from TikTok video pages.
 */
function extractTikTok() {
  const currentUrl = window.location.href;
  const domain = window.location.hostname.replace(/^www\./, '');

  // Check if on a short link or login redirect page
  if (
    window.location.hostname.includes('vt.tiktok.com') ||
    window.location.pathname.startsWith('/login')
  ) {
    return {
      success: false,
      error: 'TikTok short link detected. Please wait for the full video page to load (tiktok.com/@user/video/...) before saving.'
    };
  }

  // 1. Title: meta[property="og:title"] content → h1[data-e2e="browse-video-desc"] innerText → div[data-e2e="video-desc"] innerText
  let title = '';

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content && ogTitle.content.trim()) {
    title = ogTitle.content.trim();
  }

  if (!title) {
    const h1Desc = document.querySelector('h1[data-e2e="browse-video-desc"]');
    if (h1Desc && h1Desc.innerText && h1Desc.innerText.trim()) {
      title = h1Desc.innerText.trim();
    }
  }

  if (!title) {
    const divDesc = document.querySelector('div[data-e2e="video-desc"]');
    if (divDesc && divDesc.innerText && divDesc.innerText.trim()) {
      title = divDesc.innerText.trim();
    }
  }

  if (!title) {
    title = document.title ? document.title.replace(/\|\s*TikTok.*$/i, '').trim() : '';
  }

  // 2. Image: video element poster attribute → meta[property="og:image"] content
  let image = '';
  const videoEl = document.querySelector('video');
  if (videoEl) {
    const poster = videoEl.getAttribute('poster') || videoEl.poster;
    if (poster && poster.startsWith('http')) {
      image = poster;
    }
  }

  if (!image) {
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.content) {
      image = ogImg.content;
    }
  }

  if (!title && !image) {
    return { success: false, error: 'Could not find product data on this page' };
  }

  return {
    success: true,
    data: {
      url: currentUrl,
      title: title || 'TikTok Video',
      image: image || '',
      category: 'tiktok',
      domain: domain || 'tiktok.com'
    }
  };
}

// Listen for message from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'extractData') {
    try {
      const hostname = window.location.hostname.toLowerCase();
      let result = null;

      if (hostname.includes('shopee') || hostname.includes('shp.ee')) {
        result = extractShopee();
      } else if (hostname.includes('tiktok')) {
        result = extractTikTok();
      } else {
        result = {
          success: false,
          error: 'Open a Shopee product or TikTok video page first'
        };
      }

      sendResponse(result);
    } catch (err) {
      sendResponse({
        success: false,
        error: `Could not find product data on this page: ${err.message}`
      });
    }
    return true; // Keep message channel open for async response
  }
});
