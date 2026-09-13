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

const pageUrlInput = document.getElementById('pageUrlInput');
const affiliateLinkInput = document.getElementById('affiliateLinkInput');
const affiliateError = document.getElementById('affiliateError');
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
  const initialDomain = data.domain || (data.category === 'shopee' ? 'shopee.ph' : 'tiktok.com');
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

  // Field 1: Auto-fill read-only product page URL
  pageUrlInput.value = tabUrl || data.url || '';

  // Display content section & save button
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  contentSection.style.display = 'flex';
  saveBtn.style.display = 'block';
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save to LinkVault';

  // Focus affiliate link input for immediate paste
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
  errorMessage.textContent = msg || 'Open a Shopee product or TikTok video page first';
}

/**
 * Quick Paste handler from clipboard.
 */
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      affiliateLinkInput.value = text.trim();
      affiliateError.style.display = 'none';
      affiliateLinkInput.classList.remove('has-error');
    }
  } catch {
    // Clipboard permission might be blocked, focus input instead
    affiliateLinkInput.focus();
  }
}

/**
 * Initializes popup on load.
 */
async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showError('Open a Shopee product or TikTok video page first');
      return;
    }

    const tabUrl = tab.url || '';
    const isSupported =
      tabUrl.includes('shopee.ph') ||
      tabUrl.includes('shp.ee') ||
      tabUrl.includes('tiktok.com');

    if (!isSupported) {
      showError('Open a Shopee product or TikTok video page first');
      return;
    }

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
              showError(retryResponse?.error || 'Open a Shopee product or TikTok video page first');
            }
          });
        } catch {
          showError('Open a Shopee product or TikTok video page first');
        }
      } else if (response.success && response.data) {
        showPreview(response.data, tabUrl);
      } else {
        showError(response.error || 'Open a Shopee product or TikTok video page first');
      }
    });
  } catch {
    showError('Open a Shopee product or TikTok video page first');
  }
}

/**
 * On "Save to LinkVault" button click:
 * Validates Field 2 (Affiliate link) and saves with DOM extracted title & image.
 */
function handleSave() {
  if (!extractedData) return;

  const rawAffiliateUrl = affiliateLinkInput.value.trim();

  // Validate Field 2: Affiliate Link
  if (!rawAffiliateUrl) {
    affiliateError.style.display = 'block';
    affiliateLinkInput.classList.add('has-error');
    affiliateLinkInput.focus();
    return;
  }

  affiliateError.style.display = 'none';
  affiliateLinkInput.classList.remove('has-error');

  const affiliateUrl = normalizeUrl(rawAffiliateUrl);
  const affiliateDomain = extractDomain(affiliateUrl);
  const affiliateCategory = detectCategory(affiliateUrl) !== 'other' 
    ? detectCategory(affiliateUrl) 
    : (extractedData.category || 'other');

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  statusToast.style.display = 'none';

  // Step 1 — Build the link object:
  // Use user's affiliate link for url/domain/category, but real DOM metadata for title & image!
  const newLink = {
    id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url: affiliateUrl,
    domain: affiliateDomain,
    category: affiliateCategory,
    title: extractedData.title || (affiliateCategory === 'shopee' ? 'Shopee Product' : 'TikTok Video'),
    description: affiliateCategory === 'tiktok' ? 'TikTok Video' : 'Shopee Product',
    image: extractedData.image || null,
    favicon: `https://www.google.com/s2/favicons?domain=${affiliateDomain}&sz=128`,
    fallbackGradient: null,
    isLoading: false,
    createdAt: new Date().toISOString()
  };

  // Step 2 — Find the localhost:5173 tab if it is open
  chrome.tabs.query({ url: 'http://localhost:5173/*' }, (tabs) => {
    if (tabs.length > 0) {
      // App is open — inject a script directly into the app tab
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: (link) => {
            try {
              const raw = localStorage.getItem('linkvault_bookmarks_v1');
              const existing = raw ? JSON.parse(raw) : [];
              const alreadyExists = existing.some((l) => l.url === link.url);
              if (!alreadyExists) {
                existing.unshift(link);
                localStorage.setItem('linkvault_bookmarks_v1', JSON.stringify(existing));
                window.dispatchEvent(
                  new CustomEvent('linkvault_sync_links', { detail: existing })
                );
              }
              return true;
            } catch (e) {
              return false;
            }
          },
          args: [newLink]
        },
        (results) => {
          if (results && results[0]?.result === true) {
            showStatus('✓ Saved to LinkVault!', 'green');
          } else {
            saveToPending(newLink);
          }
        }
      );
    } else {
      // App tab not open — save to chrome.storage.local as pending
      saveToPending(newLink);
    }
  });
}

// Event Listeners
saveBtn.addEventListener('click', handleSave);
pasteBtn.addEventListener('click', handlePaste);

affiliateLinkInput.addEventListener('input', () => {
  if (affiliateLinkInput.value.trim()) {
    affiliateError.style.display = 'none';
    affiliateLinkInput.classList.remove('has-error');
  }
});

affiliateLinkInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSave();
  }
});

document.addEventListener('DOMContentLoaded', init);
