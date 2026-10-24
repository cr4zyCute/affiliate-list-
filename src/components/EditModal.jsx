import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Image as ImageIcon } from 'lucide-react';

export function EditModal({ isOpen, link, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('other');

  useEffect(() => {
    if (link) {
      setTitle(link.title || '');
      setAffiliateUrl(link.affiliateUrl || (link.url && !link.pageUrl ? link.url : ''));
      setPageUrl(link.pageUrl || link.url || '');
      setDescription(link.description || '');
      setImageUrl(link.image || '');
      setCategory(link.category || 'other');
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(link.id, {
      title: title.trim() || link.domain,
      affiliateUrl: affiliateUrl.trim() || null,
      pageUrl: pageUrl.trim() || null,
      description: description.trim(),
      image: imageUrl.trim() || null,
      category: category || 'other',
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog edit-modal-dialog animate-scale-up" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
      >
        <button 
          className="modal-close-btn" 
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="edit-modal-header">
          <div className="modal-icon-container modal-icon-accent">
            <Edit3 size={24} className="text-accent" />
          </div>
          <div>
            <h3 id="edit-modal-title" className="modal-title">Edit Product & Link Details</h3>
            <p className="modal-description">Customize the title, affiliate link, image, or platform for this item.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-group">
            <label htmlFor="edit-title" className="form-label">Product / Link Title</label>
            <input
              id="edit-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Custom title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-affiliate" className="form-label">
              <span>Affiliate Link</span>
              <span className="text-xs text-muted" style={{ marginLeft: '0.4rem', fontWeight: 'normal' }}>
                (Used for all 1-tap copy buttons)
              </span>
            </label>
            <input
              id="edit-affiliate"
              type="url"
              className="form-input"
              value={affiliateUrl}
              onChange={(e) => setAffiliateUrl(e.target.value)}
              placeholder="Paste affiliate shortlink (e.g. https://s.shopee.ph/... or amzn.to/...)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-page-url" className="form-label">
              <span>Product Page URL (Optional)</span>
            </label>
            <input
              id="edit-page-url"
              type="url"
              className="form-input"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://shopee.ph/product-name..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-category" className="form-label">Platform / Category</label>
            <select
              id="edit-category"
              className="form-input form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="shopee">Shopee</option>
              <option value="tiktok">TikTok</option>
              <option value="lazada">Lazada</option>
              <option value="amazon">Amazon</option>
              <option value="other">Other / General</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-image" className="form-label">Thumbnail Image URL (Optional)</label>
            <div className="image-input-wrapper">
              <input
                id="edit-image"
                type="text"
                className="form-input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/thumbnail.png"
              />
              {imageUrl && (
                <button
                  type="button"
                  className="btn-clear-image"
                  onClick={() => setImageUrl('')}
                  title="Remove image"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
