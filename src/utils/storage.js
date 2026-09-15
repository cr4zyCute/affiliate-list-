import { detectCategory } from '../services/metadataService';

/**
 * LocalStorage cache layer for LinkVault.
 * Turso is the source of truth; localStorage serves as the offline fallback and quick-load cache.
 */

const CACHE_STORAGE_KEY = 'linkvault_bookmarks_v1';

/**
 * Get all cached links from localStorage.
 */
export function getCachedLinks() {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Ensure all cached links have category defined and normalize status/completedAt/mainCategory/caption
    return parsed.map((item) => {
      const autoCategory = detectCategory(item.url);
      return {
        ...item,
        category: item.category && item.category !== 'other' ? item.category : autoCategory,
        status: item.status === 'done' ? 'done' : 'active',
        completedAt: item.completedAt || null,
        mainCategory: item.mainCategory || 'UA',
        caption: item.caption || null,
      };
    });
  } catch (e) {
    console.error('Failed to read cached links from localStorage', e);
    return [];
  }
}

/**
 * Save links array to localStorage cache.
 */
export function setCachedLinks(links) {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to write cached links to localStorage', e);
  }
}

/**
 * Clear the localStorage cache.
 */
export function clearCache() {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear localStorage cache', e);
  }
}

// Backwards-compatible aliases
export const getStoredLinks = getCachedLinks;
export const saveStoredLinks = setCachedLinks;
