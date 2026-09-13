/**
 * LinkVault Saver - Popup Script
 * Reads metadata from active tab content script and saves directly into LinkVault app
 * via chrome.scripting or chrome.storage.local (Zero fetch calls to localhost).
 */

let extractedData = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const previewCard = document.getElementById('previewCard');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');

const previewImage = document.getElementById('previewImage');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const previewTitle = document.getElementById('previewTitle');
const previewUrl = document.getElementById('previewUrl');
const domainBadge = document.getElementById('domainBadge');

const saveBtn = document.getElementById('saveBtn');
const statusToast = document.getElementById('statusToast');

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
 * Renders the preview card on successful data extraction.
 */
function showPreview(data) {
  extractedData = data;

  // Domain badge
  domainBadge.textContent =
    data.domain || (data.category === 'shopee' ? 'shopee.ph' : 'tiktok.com');

  // Title & URL
  previewTitle.textContent = data.title || 'Untitled';
  previewUrl.textContent = data.url;

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

  // Display preview & save button
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  previewCard.style.display = 'flex';
  saveBtn.style.display = 'block';
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save to LinkVault';
}

/**
 * Renders failure message.
 */
function showError(msg) {
  loadingState.style.display = 'none';
  previewCard.style.display = 'none';
  saveBtn.style.display = 'none';
  errorState.style.display = 'flex';
  errorMessage.textContent = msg || 'Open a Shopee product or TikTok video page first';
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
        // Content script might not be injected yet (tab opened before extension install)
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });

          // Retry extraction after injection
          chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (retryResponse) => {
            if (retryResponse && retryResponse.success && retryResponse.data) {
              showPreview(retryResponse.data);
            } else {
              showError(retryResponse?.error || 'Open a Shopee product or TikTok video page first');
            }
          });
        } catch {
          showError('Open a Shopee product or TikTok video page first');
        }
      } else if (response.success && response.data) {
        showPreview(response.data);
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
 * Injects directly into localhost:5173 tab if open, or saves to chrome.storage.local
 */
function handleSave() {
  if (!extractedData) return;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  statusToast.style.display = 'none';

  // Step 1 — Build the link object
  const newLink = {
    id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    url: extractedData.url,
    domain: extractedData.domain,
    category: extractedData.category,
    title: extractedData.title,
    description: extractedData.category === 'tiktok' ? 'TikTok Video' : 'Shopee Product',
    image: extractedData.image || null,
    favicon: `https://www.google.com/s2/favicons?domain=${extractedData.domain}&sz=128`,
    fallbackGradient: null,
    isLoading: false,
    createdAt: new Date().toISOString()
  };

  // Step 2 — Find the localhost:5173 tab if it is open
  chrome.tabs.query({ url: 'http://localhost:5173/*' }, (tabs) => {
    if (tabs.length > 0) {
      // App is open — inject a script directly into the app tab
      // that writes to its own localStorage
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: (link) => {
            try {
              const raw = localStorage.getItem('linkvault_bookmarks_v1');
              const existing = raw ? JSON.parse(raw) : [];
              // Avoid duplicates by URL
              const alreadyExists = existing.some((l) => l.url === link.url);
              if (!alreadyExists) {
                existing.unshift(link); // add to top of list
                localStorage.setItem('linkvault_bookmarks_v1', JSON.stringify(existing));
                // Dispatch event so React app updates immediately in the active tab
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
            // fallback to chrome.storage
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

saveBtn.addEventListener('click', handleSave);
document.addEventListener('DOMContentLoaded', init);
