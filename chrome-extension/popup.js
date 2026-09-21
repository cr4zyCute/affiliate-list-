/**
 * LinkVault Saver - Popup Script
 * Extracts real product image and title from page DOM,
 * accepts the user's affiliate short link, and saves it directly to LinkVault.
 */

let extractedData = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const contentSection = document.getElementById('contentSection');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');

const previewImage = document.getElementById('previewImage');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const previewTitle = document.getElementById('previewTitle');
const domainBadge = document.getElementById('domainBadge');

const categorySelect = document.getElementById('categorySelect');
const pageUrlInput = document.getElementById('pageUrlInput');
const affiliateLinkInput = document.getElementById('affiliateLinkInput');
const pasteBtn = document.getElementById('pasteBtn');

const saveBtn = document.getElementById('saveBtn');
const statusToast = document.getElementById('statusToast');

/**
 * Extracts domain name from a raw URL.
 */
function extractDomain(urlStr) {
  try {
    let normalized = urlStr.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return 'link';
  }
}

/**
 * Detects category from URL.
 */
function detectCategory(urlStr) {
  const str = String(urlStr || '').toLowerCase();
  if (str.includes('amazon.') || str.includes('amzn.to') || str.includes('amzn.com') || str.includes('amazon')) return 'amazon';
  if (str.includes('lazada.') || str.includes('lzd.co') || str.includes('lazada')) return 'lazada';
  if (str.includes('shopee.') || str.includes('shp.ee') || str.includes('shope.ee') || str.includes('shopee')) return 'shopee';
  if (str.includes('tiktok.com') || str.includes('vt.tiktok') || str.includes('vm.tiktok') || str.includes('tiktokv.com') || str.includes('tiktok')) return 'tiktok';
  return 'other';
}

/**
 * Normalizes input URL.
 */
function normalizeUrl(input) {
  let trimmed = (input || '').trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Displays status message toast and auto-closes popup.
 */
function showStatus(text, color) {
  statusToast.textContent = text;
  statusToast.className = `status-toast status-${color}`;
  statusToast.style.display = 'block';
  saveBtn.disabled = true;
  saveBtn.textContent = color === 'green' ? 'Saved!' : 'Saved Locally';
  setTimeout(() => {
    window.close();
  }, 1500);
}

/**
 * Saves link to chrome.storage.local as pending.
 */
function saveToPending(link) {
  chrome.storage.local.get(['linkvault_pending'], (result) => {
    const pending = result.linkvault_pending || [];
    const alreadyExists = pending.some((l) => l.url === link.url);
    if (!alreadyExists) pending.unshift(link);
    chrome.storage.local.set({ linkvault_pending: pending }, () => {
      showStatus('✓ Saved — open LinkVault to sync', 'orange');
    });
  });
}

/**
 * Renders the preview and prepares input fields on successful DOM extraction.
 */
function showPreview(data, tabUrl) {
  extractedData = data;

  // Domain badge
  const initialDomain = data.domain || extractDomain(tabUrl || data.url || '');
  domainBadge.textContent = initialDomain;

  // Title
  previewTitle.textContent = data.title || 'Untitled Product';

  // Image handling
  if (data.image) {
    previewImage.src = data.image;
    previewImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';
    previewImage.onerror = () => {
      previewImage.style.display = 'none';
      imagePlaceholder.style.display = 'flex';
    };
  } else {
    previewImage.style.display = 'none';
    imagePlaceholder.style.display = 'flex';
  }

  // Field 2: Auto-fill read-only product page URL
  pageUrlInput.value = tabUrl || data.url || '';

  // Display content section & save button
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  contentSection.style.display = 'flex';
  saveBtn.style.display = 'block';
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save to LinkVault';

  // Focus affiliate link input for optional immediate paste
  setTimeout(() => {
    affiliateLinkInput.focus();
  }, 100);
}

/**
 * Renders failure message.
 */
function showError(msg) {
  loadingState.style.display = 'none';
  contentSection.style.display = 'none';
  saveBtn.style.display = 'none';
  errorState.style.display = 'flex';
  errorMessage.textContent = msg || 'Open a product page (Shopee, TikTok, Lazada, Amazon) to save';
}

/**
 * Quick Paste handler from clipboard.
 */
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      affiliateLinkInput.value = text.trim();
      affiliateLinkInput.classList.remove('has-error');
    }
  } catch {
    affiliateLinkInput.focus();
  }
}

/**
 * Initializes popup on load:
 * 1. Queries active tab to extract product data
 * 2. Queries LinkVault tab to auto-detect the user's active main category (UA, WA, MA)
 */
async function init() {
  // Step A: Auto-detect active category from open LinkVault tab
  try {
    chrome.tabs.query({}, (allTabs) => {
      const linkvaultTab = allTabs.find((t) => {
        const url = (t.url || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        return (
          url.includes('localhost') ||
          url.includes('127.0.0.1') ||
          url.includes('vercel.app') ||
          url.includes('my-affiliates') ||
          title.includes('linkvault') ||
          title.includes('affiliate')
        );
      });

      if (linkvaultTab && linkvaultTab.id) {
        chrome.scripting.executeScript(
          {
            target: { tabId: linkvaultTab.id },
            func: () => {
              return localStorage.getItem('linkvault_main_category') || 'UA';
            }
          },
          (results) => {
            if (results && results[0]?.result) {
              const activeCat = results[0].result;
              if (categorySelect) {
                categorySelect.value = activeCat;
              }
            }
          }
        );
      }
    });
  } catch {
    // ignore
  }

  // Step B: Extract product details from the current active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showError('Open a product page (Shopee, TikTok, Lazada, Amazon) to save');
      return;
    }

    const tabUrl = tab.url || '';

    // Send extractData message to the content script
    chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        // Inject content script if not yet present
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });

          // Retry extraction after injection
          chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (retryResponse) => {
            if (retryResponse && retryResponse.success && retryResponse.data) {
              showPreview(retryResponse.data, tabUrl);
            } else {
              showError(retryResponse?.error || 'Could not read product details from this page.');
            }
          });
        } catch {
          showError('Open a product page (Shopee, TikTok, Lazada, Amazon) to save');
        }
      } else if (response.success && response.data) {
        showPreview(response.data, tabUrl);
      } else {
        showError(response.error || 'Could not read product details from this page.');
      }
    });
  } catch {
    showError('Open a product page (Shopee, TikTok, Lazada, Amazon) to save');
  }
}

const TURSO_CONFIG = {
  dbUrl: 'https://links-crzycute.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkzMzI1NjgsImlkIjoiMDFhMDljMjQtNzkwMS03M2Q3LWEwYjktYmY4NDM1MjVmNDhlIiwia2lkIjoiVHBhNm1RSTNYTE9RS0l0aGY0eHFwUzZqWlpiWFdIZkdlbVJJNmN3YkhLZyIsInJpZCI6IjA3YzBkMjgyLTExNWEtNDBkZi1iM2I5LTRlMGI5YzQ3ZWYzYiJ9.jxT2wYGdthfk_7Ks8-ZW_1upBjsznlG9RMN9p8Z2LPvfaB5Z52f6bh8Y59NCABBMD5eqMz7d9Vkef0QTQuXRBw'
};

/**
 * Direct HTTP save to Turso Database from the Extension.
 * Ensures the link is 100% permanently saved even if the LinkVault website tab is closed!
 */
async function saveLinkDirectToTurso(link) {
  try {
    const url = `${TURSO_CONFIG.dbUrl}/v2/pipeline`;
    const sql = `INSERT INTO links (id, url, domain, category, title, description, image, favicon, created_at, status, completed_at, main_category, caption, affiliate_url, page_url, rating, reviews_count, bought_count, color_name, color_variants)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        url = excluded.url,
        domain = excluded.domain,
        category = excluded.category,
        title = excluded.title,
        description = excluded.description,
        image = excluded.image,
        favicon = excluded.favicon,
        created_at = excluded.created_at,
        status = excluded.status,
        completed_at = excluded.completed_at,
        main_category = excluded.main_category,
        caption = excluded.caption,
        affiliate_url = excluded.affiliate_url,
        page_url = excluded.page_url,
        rating = COALESCE(excluded.rating, links.rating),
        reviews_count = COALESCE(excluded.reviews_count, links.reviews_count),
        bought_count = COALESCE(excluded.bought_count, links.bought_count),
        color_name = COALESCE(excluded.color_name, links.color_name),
        color_variants = CASE WHEN excluded.color_variants != '[]' THEN excluded.color_variants ELSE links.color_variants END`;

    const args = [
      { type: 'text', value: link.id },
      { type: 'text', value: link.url },
      { type: 'text', value: link.domain || '' },
      { type: 'text', value: link.category || 'other' },
      { type: 'text', value: link.title || '' },
      { type: 'text', value: link.description || '' },
      link.image ? { type: 'text', value: link.image } : { type: 'null' },
      { type: 'text', value: link.favicon || '' },
      { type: 'text', value: link.createdAt || new Date().toISOString() },
      { type: 'text', value: link.status || 'active' },
      link.completedAt ? { type: 'text', value: link.completedAt } : { type: 'null' },
      { type: 'text', value: link.mainCategory || 'UA' },
      link.caption ? { type: 'text', value: link.caption } : { type: 'null' },
      link.affiliateUrl ? { type: 'text', value: link.affiliateUrl } : { type: 'null' },
      link.pageUrl ? { type: 'text', value: link.pageUrl } : { type: 'null' },
      link.rating != null ? { type: 'float', value: Number(link.rating) } : { type: 'null' },
      link.reviewsCount ? { type: 'text', value: String(link.reviewsCount) } : { type: 'null' },
      link.boughtCount ? { type: 'text', value: String(link.boughtCount) } : { type: 'null' },
      link.colorName ? { type: 'text', value: String(link.colorName) } : { type: 'null' },
      { type: 'text', value: JSON.stringify(link.colorVariants || []) }
    ];

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_CONFIG.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql, args } },
          { type: 'close' }
        ]
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Turso direct HTTP save notice:', err);
    return false;
  }
}

/**
 * On "Save to LinkVault" button click:
 * Saves with or without affiliate link, capturing DOM extracted title & image into the target category.
 */
async function handleSave() {
  if (!extractedData) return;

  const rawAffiliateUrl = affiliateLinkInput.value.trim();
  const rawPageUrl = pageUrlInput.value.trim() || extractedData.url;
  const selectedCategory = categorySelect ? categorySelect.value : 'UA';

  let primaryUrl = '';
  let affiliateUrl = null;
  let finalDomain = '';
  let finalCategory = 'other';

  if (rawAffiliateUrl) {
    affiliateUrl = normalizeUrl(rawAffiliateUrl);
    primaryUrl = affiliateUrl;
    finalDomain = extractDomain(affiliateUrl);
    finalCategory = detectCategory(affiliateUrl) !== 'other' 
      ? detectCategory(affiliateUrl) 
      : (extractedData.category || detectCategory(rawPageUrl));
  } else {
    affiliateUrl = null;
    primaryUrl = normalizeUrl(rawPageUrl);
    finalDomain = extractedData.domain || extractDomain(primaryUrl);
    finalCategory = extractedData.category || detectCategory(primaryUrl);
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  statusToast.style.display = 'none';

  // Build the link object:
  const newLink = {
    id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url: primaryUrl,
    pageUrl: normalizeUrl(rawPageUrl),
    affiliateUrl: affiliateUrl,
    domain: finalDomain,
    category: finalCategory,
    title: extractedData.title || (finalCategory === 'shopee' ? 'Shopee Product' : finalCategory === 'amazon' ? 'Amazon Product' : finalCategory === 'lazada' ? 'Lazada Product' : finalCategory === 'tiktok' ? 'TikTok Video' : 'Saved Product'),
    description: '',
    image: extractedData.image || null,
    favicon: `https://www.google.com/s2/favicons?domain=${finalDomain}&sz=128`,
    fallbackGradient: null,
    mainCategory: selectedCategory,
    status: 'active',
    completedAt: null,
    isLoading: false,
    createdAt: new Date().toISOString(),
    rating: extractedData.rating != null ? extractedData.rating : null,
    reviewsCount: extractedData.reviewsCount || null,
    boughtCount: extractedData.boughtCount || null,
    colorName: extractedData.colorName || null,
    colorVariants: extractedData.colorVariants || [],
  };

  // 1. Direct HTTP save to Turso Database
  await saveLinkDirectToTurso(newLink);

  // 2. Also persist to Chrome storage as backup queue
  saveToPending(newLink);

  // 3. Find any open LinkVault tab to update UI in real time
  chrome.tabs.query({}, (tabs) => {
    const linkvaultTab = tabs.find((t) => {
      const url = (t.url || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      return (
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('vercel.app') ||
        url.includes('my-affiliates') ||
        title.includes('linkvault') ||
        title.includes('affiliate')
      );
    });

    if (linkvaultTab && linkvaultTab.id) {
      // App is open — inject a script directly into the app tab to update state in real time
      chrome.scripting.executeScript(
        {
          target: { tabId: linkvaultTab.id },
          func: (item) => {
            try {
              // 1. Dispatch custom events to React app
              window.dispatchEvent(
                new CustomEvent('linkvault_extension_save', { detail: item })
              );
              window.dispatchEvent(
                new CustomEvent('linkvault_sync_links', { detail: item })
              );

              // 2. Update local storage cache
              const rawCache = localStorage.getItem('linkvault_cache_v3');
              const cache = rawCache ? JSON.parse(rawCache) : [];
              const exists = cache.some((l) => (l.mainCategory || 'UA') === item.mainCategory && l.url.toLowerCase() === item.url.toLowerCase());
              if (!exists) {
                cache.unshift(item);
                localStorage.setItem('linkvault_cache_v3', JSON.stringify(cache));
              }

              return true;
            } catch (e) {
              return false;
            }
          },
          args: [newLink]
        },
        (results) => {
          showStatus(`✓ Saved to ${selectedCategory}!`, 'green');
        }
      );
    } else {
      showStatus(`✓ Saved to ${selectedCategory}!`, 'green');
    }
  });
}

// Event Listeners
saveBtn.addEventListener('click', handleSave);
pasteBtn.addEventListener('click', handlePaste);

affiliateLinkInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSave();
  }
});

document.addEventListener('DOMContentLoaded', init);
