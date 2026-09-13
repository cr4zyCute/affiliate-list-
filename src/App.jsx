import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LinkInput } from './components/LinkInput';
import { LinkList } from './components/LinkList';
import { Modal } from './components/Modal';
import { EditModal } from './components/EditModal';
import { Toast } from './components/Toast';
import { fetchLinkMetadata, createOptimisticLink, detectCategory } from './services/metadataService';
import { getStoredLinks, saveStoredLinks } from './utils/storage';
import './App.css';

export default function App() {
  const [links, setLinks] = useState(() => getStoredLinks());
  const [toast, setToast] = useState(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('linkvault_theme') || 'light';
  });

  // Sync theme to document element, body classes, and localStorage
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

  // Sync to localStorage whenever links change
  useEffect(() => {
    saveStoredLinks(links);
  }, [links]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  const handleAddLinks = (urls) => {
    // 1. Instantly create optimistic link objects (includes current ISO date)
    const optimisticItems = urls.map((url) => {
      const item = createOptimisticLink(url);
      item.createdAt = new Date().toISOString();
      return item;
    });

    // 2. Immediately add them to the list
    setLinks((prev) => [...optimisticItems, ...prev]);

    if (optimisticItems.length === 1) {
      showToast(`Added ${optimisticItems[0].domain}`, 'success');
    } else {
      showToast(`Added ${optimisticItems.length} links`, 'success');
    }

    // 3. In the background, fetch the preview metadata for each link
    optimisticItems.forEach(async (item) => {
      try {
        const metadata = await fetchLinkMetadata(item.url);
        setLinks((prev) =>
          prev.map((link) =>
            link.id === item.id
              ? {
                  ...link,
                  ...metadata,
                  id: item.id,
                  category: metadata.category || item.category || detectCategory(item.url),
                  createdAt: link.createdAt || item.createdAt,
                  isLoading: false,
                }
              : link
          )
        );
      } catch (err) {
        console.error('Metadata fetch error for', item.url, err);
        setLinks((prev) =>
          prev.map((link) =>
            link.id === item.id
              ? {
                  ...link,
                  description: `Link saved from ${link.domain}`,
                  category: item.category || 'other',
                  createdAt: link.createdAt || item.createdAt,
                  isLoading: false,
                }
              : link
          )
        );
      }
    });
  };

  const handleDeleteLink = (id) => {
    const targetLink = links.find((l) => l.id === id);
    setLinks((prev) => prev.filter((link) => link.id !== id));
    showToast(`Removed "${targetLink?.title || 'Link'}"`, 'info');
  };

  const handleClearAll = () => {
    setLinks([]);
    showToast('All links have been cleared', 'info');
  };

  const handleEditLink = (id, updatedFields) => {
    setLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, ...updatedFields } : link))
    );
    showToast('Bookmark updated', 'success');
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
            onDeleteLink={handleDeleteLink}
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
