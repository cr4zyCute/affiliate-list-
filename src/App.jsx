import React, { useState, useEffect, useRef } from 'react';
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

export default function App() {
  const [links, setLinks] = useState(() => getCachedLinks());
  const [toast, setToast] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [deletingLink, setDeletingLink] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('linkvault_theme') || 'light';
  });

  // Keep a reference to latest links for event listeners
  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  // Step 5.1: Initial Mount - Load from Turso with fallback to localStorage cache
  useEffect(() => {
    async function loadInitialData() {
      try {
        const tursoLinks = await getAllLinks();
        if (Array.isArray(tursoLinks) && tursoLinks.length > 0) {
          setLinks(tursoLinks);
          setCachedLinks(tursoLinks);
        } else {
          // If Turso is empty on first setup, migrate existing localStorage bookmarks to Turso!
          const cached = getCachedLinks();
          if (cached.length > 0) {
            setLinks(cached);
            // Auto-upload existing bookmarks to Turso
            for (const item of cached) {
              try {
                await saveLink(item);
              } catch (e) {
                console.error('Initial sync to Turso failed for:', item.title, e);
              }
            }
          } else {
            setLinks([]);
            setCachedLinks([]);
          }
        }
      } catch (err) {
        console.warn('Could not load from Turso, using localStorage fallback:', err.message || err);
        const cached = getCachedLinks();
        setLinks(cached);
      }
    }

    loadInitialData();
  }, []);

  // Sync pending links from extension on mount and listen for real-time extension saves
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

              // Sync each new extension link to Turso in background
              for (const item of newLinks) {
                try {
                  await saveLink(item);
                } catch (e) {
                  console.error('Failed to sync extension link to Turso:', e);
                }
              }

              showToast(
                `Imported ${newLinks.length} link${newLinks.length > 1 ? 's' : ''} from LinkVault Saver`,
                'success'
              );
            }

            chrome.storage.local.remove('linkvault_pending');
          }
        });
      }
    };

    syncFromPending();

    // Listen for direct sync event from extension injected script
    const handleSyncEvent = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setLinks(e.detail);
        setCachedLinks(e.detail);
        showToast('Saved new link from LinkVault Saver', 'success');
      } else {
        const cached = getCachedLinks();
        if (cached.length > 0) setLinks(cached);
      }
    };

    window.addEventListener('focus', syncFromPending);
    window.addEventListener('storage', handleSyncEvent);
    window.addEventListener('linkvault_sync_links', handleSyncEvent);

    return () => {
      window.removeEventListener('focus', syncFromPending);
      window.removeEventListener('storage', handleSyncEvent);
      window.removeEventListener('linkvault_sync_links', handleSyncEvent);
    };
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

  // Step 5.2: Add Link Flow
  const handleAddLinks = async (urls) => {
    for (const url of urls) {
      // 1. Check duplicate locally and in Turso
      const isLocalDuplicate = links.some((l) => l.url.toLowerCase() === url.toLowerCase());
      let isDbDuplicate = false;
      try {
        isDbDuplicate = await linkExists(url);
      } catch {
        // Fall back to local check if Turso query fails
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

  // Step 5.3: Execute Delete Flow
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

  // Step 5.4: Edit Flow
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
