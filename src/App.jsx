import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LinkInput } from './components/LinkInput';
import { LinkList } from './components/LinkList';
import { Modal } from './components/Modal';
import { EditModal } from './components/EditModal';
import { Toast } from './components/Toast';
import {
  fetchLinkMetadata,
  createOptimisticLink,
  detectCategory,
} from './services/metadataService';
import {
  getAllLinks,
  saveLink,
  deleteLink,
  updateLink,
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
  }
  return false;
}

export default function App() {
  // CHANGED: Use localStorage only as the initial paint cache while Turso loads in the background
  const [links, setLinks] = useState(() => getCachedLinks());
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

  // Step 5.2: Add Link Flow (Optimistic UI + Turso write)
  const handleAddLinks = async (urls) => {
    for (const url of urls) {
      // 1. Check duplicate locally and in Turso
      const isLocalDuplicate = links.some((l) => l.url.toLowerCase() === url.toLowerCase());
      let isDbDuplicate = false;
      try {
        isDbDuplicate = await linkExists(url);
      } catch {
        isDbDuplicate = false;
      }

      if (isLocalDuplicate || isDbDuplicate) {
        showToast('Link already saved', 'warning');
        continue;
      }

      // 2. Optimistic UI: add link immediately with isLoading: true
      const optimisticItem = createOptimisticLink(url);
      optimisticItem.createdAt = new Date().toISOString();

      setLinks((prev) => {
        const next = [optimisticItem, ...prev];
        setCachedLinks(next);
        return next;
      });

      showToast(`Adding ${optimisticItem.domain}...`, 'info');

      // 3. Run metadata fetch in background
      let finalItem = { ...optimisticItem };
      try {
        const metadata = await fetchLinkMetadata(optimisticItem.url);
        finalItem = {
          ...optimisticItem,
          ...metadata,
          category: metadata.category || optimisticItem.category || detectCategory(optimisticItem.url),
          createdAt: optimisticItem.createdAt,
          isLoading: false,
        };
      } catch (err) {
        console.error('Metadata fetch error for', optimisticItem.url, err);
        finalItem = {
          ...optimisticItem,
          description: `Link saved from ${optimisticItem.domain}`,
          category: optimisticItem.category || 'other',
          createdAt: optimisticItem.createdAt,
          isLoading: false,
        };
      }

      // 4. Update React state with completed metadata
      setLinks((prev) => {
        const next = prev.map((l) => (l.id === optimisticItem.id ? finalItem : l));
        setCachedLinks(next);
        return next;
      });

      // 5. Save to Turso & handle fallback
      try {
        await saveLink(finalItem);
        showToast(`Saved ${finalItem.domain}`, 'success');
      } catch (dbError) {
        console.warn('Turso save failed, kept in local cache:', dbError);
        showToast('Saved locally only — sync failed', 'warning');
      }
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

  const existingUrls = links.map((l) => l.url);

  return (
    <div className="app-layout">
      <div className="app-container">
        <Header
          totalLinks={links.length}
          onClearAll={() => setIsClearModalOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <main className="app-main">
          <LinkInput
            onAddLinks={handleAddLinks}
            existingUrls={existingUrls}
          />

          <LinkList
            links={links}
            onDeleteLink={requestDeleteLink}
            onCopyLink={handleCopyLink}
            onEditLink={(link) => setEditingLink(link)}
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
