import React, { useState } from 'react';
import { ExternalLink, X, Copy, Check, Globe, Edit3, Loader2, Clock } from 'lucide-react';
import { formatAddedTimestamp } from '../services/dateService';

export function LinkCard({ link, onDelete, onCopy, onEdit }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    url,
    title,
    domain,
    category,
    description,
    image,
    favicon,
    fallbackGradient,
    isLoading,
    createdAt,
  } = link;

  const handleCardClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyClick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    onCopy && onCopy(url);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(link.id);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit && onEdit(link);
  };

  const domainInitial = domain ? domain.replace(/^https?:\/\//, '').charAt(0).toUpperCase() : 'L';
  const timestampText = formatAddedTimestamp(createdAt);

  return (
    <article
      className={`link-card animate-card-in ${isLoading ? 'is-loading-card' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      title={`Open ${title || domain} in a new tab`}
      aria-label={`Bookmark: ${title || domain}`}
    >
      {/* Visual Preview / Thumbnail Area */}
      <div className="card-preview-area">
        {isLoading ? (
          <div className="preview-loading-box">
            <Loader2 size={24} className="spinner text-accent" />
            <span className="loading-badge-text">Fetching preview...</span>
          </div>
        ) : image && !imageFailed ? (
          <img
            src={image}
            alt={`Preview of ${title || domain}`}
            className="preview-image"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="preview-fallback">
            {favicon ? (
              <img
                src={favicon}
                alt=""
                className="fallback-favicon"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="fallback-monogram">{domainInitial}</span>
            )}
            <span className="fallback-badge-text">{domain}</span>
          </div>
        )}
      </div>

      {/* Main Content Info */}
      <div className="card-content-area">
        <div className="card-header-row">
          <div className="card-tags-group">
            <div className="domain-chip">
              {favicon && (
                <img
                  src={favicon}
                  alt=""
                  className="domain-favicon"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <span className="domain-text">{domain}</span>
              {isLoading && <span className="loading-pulse-pill">Loading</span>}
            </div>

            {category && category !== 'other' && (
              <span className={`category-tag-badge category-${category}`}>
                {category === 'shopee' ? 'Shopee' : category === 'lazada' ? 'Lazada' : category === 'tiktok' ? 'TikTok' : category}
              </span>
            )}
          </div>

          <div className="card-quick-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="card-action-btn"
              onClick={handleEditClick}
              title="Edit title or notes"
              aria-label={`Edit ${title || domain}`}
              disabled={isLoading}
            >
              <Edit3 size={15} />
            </button>

            <button
              type="button"
              className={`card-action-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyClick}
              title={copied ? 'Copied to clipboard!' : 'Copy link URL'}
              aria-label="Copy link URL"
            >
              {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
            </button>

            <button
              type="button"
              className="card-action-btn btn-delete"
              onClick={handleDeleteClick}
              title="Delete this link"
              aria-label={`Delete ${title || domain}`}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <h2 className="card-title" title={title || domain}>
          {title || domain}
        </h2>

        {description && (
          <p className={`card-description ${isLoading ? 'card-description-loading' : ''}`} title={description}>
            {description}
          </p>
        )}

        <div className="card-footer-row">
          <span className="card-url-link" title={url}>
            <Globe size={13} />
            <span className="card-url-text">{url}</span>
          </span>

          <div className="card-footer-meta">
            {timestampText && (
              <span className="card-timestamp" title={`Created: ${createdAt}`}>
                <Clock size={12} className="timestamp-icon" />
                <span>{timestampText}</span>
              </span>
            )}
            <span className="external-indicator">
              <ExternalLink size={13} />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
