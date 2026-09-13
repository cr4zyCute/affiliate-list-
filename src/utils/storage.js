import { detectCategory } from '../services/metadataService';

/**
 * Clean LocalStorage persistence for user bookmarks.
 */

const STORAGE_KEY = 'linkvault_bookmarks_v1';

export function getStoredLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Ensure all existing stored links have their category automatically detected
    return parsed.map((item) => {
      const autoCategory = detectCategory(item.url);
      return {
        ...item,
        category: (item.category && item.category !== 'other') ? item.category : autoCategory,
      };
    });
  } catch (e) {
    console.error('Failed to read links from localStorage', e);
    return [];
  }
}

export function saveStoredLinks(links) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to save links to localStorage', e);
  }
}
