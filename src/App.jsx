import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LinkInput } from './components/LinkInput';
import { LinkList } from './components/LinkList';
import { Modal } from './components/Modal';
import { EditModal } from './components/EditModal';
import { Toast } from './components/Toast';
import {
  createOptimisticLink,
} from './services/metadataService';
import {
  getAllLinks,
  saveLink,
  deleteLink,
  updateLink,
  updateLinkStatus,
  linkExists,
} from './lib/db';
import {
  getCachedLinks,
  setCachedLinks,
  clearCache,
} from './utils/storage';
import './App.css';

/**
 * HOW TO INSTALL LINKVAULT AS PWA ON ANDROID:
 * 1. Open LinkVault in Chrome on Android
 * 2. Tap the 3-dot menu (top right)
 * 3. Tap "Add to Home Screen" or "Install App"
 * 4. Tap Install
 * 5. Now when you share any link from TikTok/Shopee:
 *    tap the share button → scroll to find "LinkVault" → tap it
 *    → link is saved automatically
 */

// CHANGED: Helper function to compare remote Turso links with local state to prevent unnecessary re-renders & UI flicker
function haveLinksChanged(current, incoming) {
  if (!Array.isArray(current) || !Array.isArray(incoming)) return true;
  if (current.length !== incoming.length) return true;
  for (let i = 0; i < incoming.length; i++) {
    const cur = current[i];
    const inc = incoming[i];
    if (!cur || !inc) return true;
    if (cur.id !== inc.id) return true;
    if (cur.url !== inc.url) return true;
    if (cur.title !== inc.title) return true;
    if (cur.image !== inc.image) return true;
    if (cur.category !== inc.category) return true;
    if (cur.description !== inc.description) return true;
    if (cur.status !== inc.status) return true;
    if (cur.completedAt !== inc.completedAt) return true;
    if (cur.mainCategory !== inc.mainCategory) return true;
    if (cur.caption !== inc.caption) return true;
  }
  return false;
}

export default function App() {
  // Use localStorage only as the initial paint cache while Turso loads in the background
  const [links, setLinks] = useState(() => getCachedLinks());
  const [activeMainCategory, setActiveMainCategory] = useState(() => {
    return localStorage.getItem('linkvault_main_category') || 'UA';
  });
  const [toast, setToast] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [deletingLink, setDeletingLink] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('linkvault_theme') || 'light';
  });

  // Reference to current links to avoid stale closures in sync triggers
  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  // Flag to avoid concurrent sync fetches
  const isFetchingRef = useRef(false);

  // CHANGED: Core Smart Reconciliation & Sync Function from Turso
  // Silently fetches from Turso, compares by id/fields, and updates state without UI flicker
  const syncFromTurso = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const remoteLinks = await getAllLinks();
      if (!Array.isArray(remoteLinks)) return;

      // Handle initial migration if Turso database is empty on very first run
      if (isInitial && remoteLinks.length === 0) {
        const cached = getCachedLinks();
        if (cached.length > 0) {
          setLinks(cached);
          for (const item of cached) {
            try {
              await saveLink(item);
            } catch (e) {
              console.error('Initial migration to Turso failed for:', item.title, e);
            }
          }
          return;
        }
      }

      const current = linksRef.current;
      // Preserve any optimistic items currently in progress (isLoading: true)
      const pendingOptimistic = current.filter((l) => l.isLoading);
      const settledCurrent = current.filter((l) => !l.isLoading);

      // Reconcile and only trigger state update if data genuinely changed
      if (haveLinksChanged(settledCurrent, remoteLinks)) {
        const nextLinks = pendingOptimistic.length > 0
          ? [...pendingOptimistic, ...remoteLinks]
          : remoteLinks;

        setLinks(nextLinks);
        setCachedLinks(remoteLinks); // update first-paint cache
      }
    } catch (err) {
      if (isInitial) {
        console.warn('Initial Turso load notice (using cache):', err.message || err);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // CHANGED: Multi-Device Smart Sync Engine
  // 1. 5s adaptive polling loop while visible (paused when hidden to save reads)
  // 2. Instant sync triggers on visibilitychange, window.focus, and window.online
  // 3. Clean teardown on unmount
  useEffect(() => {
    // Initial fetch on mount
    syncFromTurso(true);

    let pollInterval = null;

    const startPolling = () => {
      if (!pollInterval) {
        pollInterval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            syncFromTurso(false);
          }
        }, 5000);
      }
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    // Instant trigger on tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromTurso(false);
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Instant trigger when user focuses tab or unlocks phone screen
    const handleFocus = () => {
      syncFromTurso(false);
    };

    // Instant trigger when device reconnects to internet
    const handleOnline = () => {
      syncFromTurso(false);
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncFromTurso]);

  // CHANGED: Handle incoming shared link from Android share sheet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('url') || params.get('text');

    if (sharedUrl && (window.location.pathname === '/share-target' || window.location.pathname.startsWith('/share-target'))) {
      // Extract the URL if it was shared as text (e.g. "Check this out: https://...")
      const urlMatch = sharedUrl.match(/https?:\/\/[^\s]+/);
      const extractedUrl = urlMatch ? urlMatch[0] : sharedUrl;

      if (extractedUrl) {
        // Automatically add the link — same flow as typing it in manually
        handleAddLinks([extractedUrl]);

        // Clean up the URL so the share-target path disappears
        window.history.replaceState({}, '', '/');

        // Show a brief toast
        showToast('Link saved from share!');
      }
    }
  }, []);

  // CHANGED: Extension pending queue sync on mount (without old local event listeners)
  useEffect(() => {
    const syncFromPending = async () => {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.get(['linkvault_pending'], async (result) => {
          const pending = result.linkvault_pending || [];
          if (pending.length > 0) {
            const current = linksRef.current;
            const existingUrls = new Set(current.map((l) => l.url.toLowerCase()));
            const newLinks = pending.filter((l) => !existingUrls.has(l.url.toLowerCase()));

            if (newLinks.length > 0) {
              const merged = [...newLinks, ...current];
              setLinks(merged);
              setCachedLinks(merged);

              for (const item of newLinks) {
                try {
                  await saveLink(item);
                } catch (e) {
                  console.error('Failed to sync extension link to Turso:', e);
                }
              }
            }

            chrome.storage.local.remove('linkvault_pending');
          }
        });
      }
    };

    syncFromPending();
  }, []);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('linkvault_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSelectMainCategory = (cat) => {
    setActiveMainCategory(cat);
    localStorage.setItem('linkvault_main_category', cat);
  };

  // Step 5.2: Add Link Flow (Instant Link Addition + Turso write into active category)
  const handleAddLinks = async (items) => {
    for (const entry of items) {
      const url = typeof entry === 'string' ? entry : entry.url;
      const customTitle = typeof entry === 'object' && entry.title ? entry.title.trim() : null;

      // 1. Check duplicate locally within the active main category
      const isLocalDuplicate = links.some(
        (l) => (l.mainCategory || 'UA') === activeMainCategory && l.url.toLowerCase() === url.toLowerCase()
      );

      if (isLocalDuplicate) {
        showToast(`Link already in ${activeMainCategory}`, 'warning');
        continue;
      }

      // 2. Create link immediately associated with the active main category
      const item = createOptimisticLink(url);
      if (customTitle) {
        item.title = customTitle;
      }
      item.createdAt = new Date().toISOString();
      item.isLoading = false;
      item.mainCategory = activeMainCategory; // automatically assigned to active UA/WA/MA category

      // 3. Add directly to state and local cache
      setLinks((prev) => {
        const next = [item, ...prev];
        setCachedLinks(next);
        return next;
      });

      // 4. Save to Turso
      try {
        await saveLink(item);
        showToast(`Saved to ${activeMainCategory}`, 'success');
      } catch (dbError) {
        console.warn('Turso save failed, kept in local cache:', dbError);
        showToast(`Saved to ${activeMainCategory} locally — sync failed`, 'warning');
      }
    }
  };

  // Copy/Add an item and its caption to another main category (UA, WA, MA)
  const handleAddToCategory = async (link, targetCategory, caption) => {
    const isAlreadyInTarget = links.some(
      (l) => (l.mainCategory || 'UA') === targetCategory && l.url.toLowerCase() === link.url.toLowerCase()
    );

    if (isAlreadyInTarget) {
      showToast(`Already in ${targetCategory}`, 'warning');
      return;
    }

    const newItem = {
      ...link,
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      mainCategory: targetCategory,
      caption: caption || link.caption || null,
      createdAt: new Date().toISOString(),
    };

    setLinks((prev) => {
      const next = [newItem, ...prev];
      setCachedLinks(next);
      return next;
    });

    try {
      await saveLink(newItem);
      showToast(`Added to ${targetCategory}`, 'success');
    } catch (err) {
      console.warn('Turso save failed for add to category:', err);
      showToast(`Added to ${targetCategory} locally`, 'info');
    }
  };

  // Trigger Delete Confirmation Modal
  const requestDeleteLink = (id) => {
    const target = links.find((l) => l.id === id);
    if (target) {
      setDeletingLink(target);
    }
  };

  // Step 5.3: Execute Delete Flow (Optimistic UI + Turso write)
  const handleDeleteLink = async (id) => {
    const previousLinks = [...links];
    const targetLink = links.find((l) => l.id === id);

    // 1. Optimistic UI: remove immediately
    const updated = links.filter((link) => link.id !== id);
    setLinks(updated);
    setCachedLinks(updated);

    // 2. Call Turso deleteLink
    try {
      await deleteLink(id);
      showToast(`Removed "${targetLink?.title || 'Link'}"`, 'info');
    } catch (err) {
      console.error('Turso delete failed:', err);
      // 3. Rollback UI on failure
      setLinks(previousLinks);
      setCachedLinks(previousLinks);
      showToast('Delete failed — try again', 'error');
    }
  };

  // Step 5.4: Edit Flow (Optimistic UI + Turso write)
  const handleEditLink = async (id, updatedFields) => {
    const previousLinks = [...links];

    // 1. Optimistic UI: update immediately
    const updated = links.map((link) =>
      link.id === id ? { ...link, ...updatedFields } : link
    );
    setLinks(updated);
    setCachedLinks(updated);

    // 2. Call Turso updateLink
    try {
      await updateLink(id, updatedFields);
      showToast('Bookmark updated', 'success');
    } catch (err) {
      console.error('Turso update failed:', err);
      // 3. Rollback UI on failure
      setLinks(previousLinks);
      setCachedLinks(previousLinks);
      showToast('Update failed', 'error');
    }
  };

  // Step 5.5: Toggle Done/Active Status Flow (Optimistic UI + Turso write)
  const handleToggleDone = async (id) => {
    const target = links.find((l) => l.id === id);
    if (!target) return;

    const isCurrentlyDone = target.status === 'done';
    const nextStatus = isCurrentlyDone ? 'active' : 'done';
    const nextCompletedAt = isCurrentlyDone ? null : new Date().toISOString();

    const previousLinks = [...links];

    // 1. Optimistic UI: update immediately
    const updated = links.map((link) =>
      link.id === id
        ? { ...link, status: nextStatus, completedAt: nextCompletedAt }
        : link
    );
    setLinks(updated);
    setCachedLinks(updated);

    if (nextStatus === 'done') {
      showToast('Marked as done', 'success');
    } else {
      showToast('Marked as not done', 'info');
    }

    // 2. Call Turso updateLinkStatus
    try {
      await updateLinkStatus(id, nextStatus, nextCompletedAt);
    } catch (err) {
      console.error('Turso update status failed:', err);
      // 3. Rollback UI on failure
      setLinks(previousLinks);
      setCachedLinks(previousLinks);
      showToast('Status update failed — try again', 'error');
    }
  };

  const handleClearAll = async () => {
    const previousLinks = [...links];
    setLinks([]);
    clearCache();

    // Delete items in Turso
    try {
      for (const item of previousLinks) {
        await deleteLink(item.id);
      }
      showToast('All links have been cleared', 'info');
    } catch (err) {
      console.warn('Turso clear failed:', err);
      showToast('Cleared locally — sync error', 'warning');
    }
  };

  const handleCopyLink = () => {
    showToast('URL copied to clipboard', 'success');
  };

  const visibleLinks = links.filter((l) => (l.mainCategory || 'UA') === activeMainCategory);
  const existingUrls = visibleLinks.map((l) => l.url);

  return (
    <div className="app-layout">
      <div className="app-container">
        <Header
          totalLinks={visibleLinks.length}
          onClearAll={() => setIsClearModalOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          activeMainCategory={activeMainCategory}
          onSelectMainCategory={handleSelectMainCategory}
        />

        <main className="app-main">
          <LinkInput
            onAddLinks={handleAddLinks}
            existingUrls={existingUrls}
          />

          <LinkList
            links={visibleLinks}
            onDeleteLink={requestDeleteLink}
            onCopyLink={handleCopyLink}
            onEditLink={(link) => setEditingLink(link)}
            onToggleDone={handleToggleDone}
            onAddToCategory={handleAddToCategory}
          />
        </main>

        <footer className="app-footer">
          <p>
            LinkVault &bull; Save and organize your links
          </p>
        </footer>
      </div>

      {/* Confirmation Modal for Deleting an Individual Link */}
      <Modal
        isOpen={!!deletingLink}
        title="Delete this link?"
        description="This will permanently remove this link from your saved links."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (deletingLink) {
            handleDeleteLink(deletingLink.id);
            setDeletingLink(null);
          }
        }}
        onClose={() => setDeletingLink(null)}
      />

      {/* Confirmation Modal for Clearing All Links */}
      <Modal
        isOpen={isClearModalOpen}
        title="Clear all saved links?"
        description="Are you sure you want to delete all saved bookmarks? This action cannot be undone."
        confirmText="Yes, Clear All"
        onConfirm={handleClearAll}
        onClose={() => setIsClearModalOpen(false)}
      />

      {/* Edit Link Details Modal */}
      <EditModal
        isOpen={!!editingLink}
        link={editingLink}
        onSave={handleEditLink}
        onClose={() => setEditingLink(null)}
      />

      {/* Toast Feedback Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
