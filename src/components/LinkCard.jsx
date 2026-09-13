import React, { useState, useRef } from 'react';
import { ExternalLink, Copy, Check, Globe, Edit3, Loader2, Clock } from 'lucide-react';
import { formatAddedTimestamp } from '../services/dateService';

export function LinkCard({ link, onDelete, onCopy, onEdit }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const startCoordsRef = useRef({ x: 0, y: 0 });

  const {
    url,
    title,
    domain,
    category,
    description,
    image,
    favicon,
    isLoading,
    createdAt,
  } = link;

  // Long press handler using universal Pointer Events
  const handlePointerDown = (e) => {
    // Only primary button (left mouse click or touch)
    if (e.button !== undefined && e.button !== 0) return;

    isLongPressRef.current = false;
    startCoordsRef.current = { x: e.clientX, y: e.clientY };
    setIsPressing(true);

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsPressing(false);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
      // Trigger delete confirmation
      onDelete(link.id);
    }, 700);
  };

  const handlePointerMove = (e) => {
    if (!timerRef.current) return;
    const dx = Math.abs(e.clientX - startCoordsRef.current.x);
    const dy = Math.abs(e.clientY - startCoordsRef.current.y);
    // If movement exceeds 10px (e.g. user is scrolling), cancel the long-press timer
    if (dx > 10 || dy > 10) {
      cancelLongPress();
    }
  };

  const cancelLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  };

  const handlePointerUp = () => {
    cancelLongPress();
  };

  const handlePointerCancel = () => {
    cancelLongPress();
  };

  const handlePointerLeave = () => {
    cancelLongPress();
  };

  const handleCardClick = (e) => {
    // If this click was from completing a long-press hold, do not open the link
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyClick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    onCopy && onCopy(url);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit && onEdit(link);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(link.id);
    }
  };

  const domainInitial = domain ? domain.replace(/^https?:\/\//, '').charAt(0).toUpperCase() : 'L';
  const timestampText = formatAddedTimestamp(createdAt);

  return (
    <article
      className={`link-card animate-card-in ${isLoading ? 'is-loading-card' : ''} ${isPressing ? 'is-pressing' : ''}`}
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      title={`Open ${title || domain} (Press and hold to delete)`}
      aria-label={`Bookmark: ${title || domain}. Press and hold to delete.`}
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
              className="card-action-btn btn-edit"
              onClick={handleEditClick}
              title="Edit title or notes"
              aria-label={`Edit ${title || domain}`}
              disabled={isLoading}
            >
              <Edit3 size={16} />
            </button>

            <button
              type="button"
              className={`card-action-btn btn-copy ${copied ? 'copied' : ''}`}
              onClick={handleCopyClick}
              title={copied ? 'Copied to clipboard!' : 'Copy link URL'}
              aria-label="Copy link URL"
            >
              {copied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
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
