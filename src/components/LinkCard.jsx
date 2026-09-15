import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Copy, Check, Globe, Loader2, Clock, Edit3, Trash2, CheckCircle2, RefreshCw, MoreVertical, FileText, Sparkles } from 'lucide-react';
import { formatAddedTimestamp, formatCompletedTimestamp } from '../services/dateService';
import { getRandomCaption, getCaptionWithoutBuyHere } from '../data/captions';

const SWIPE_THRESHOLD = 75; // px distance to activate swipe action
const MAX_SWIPE_DISTANCE = 130; // max translation clamp

export function LinkCard({ link, onDelete, onCopy, onEdit, onToggleDone, onAddToCategory }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Random or saved caption paired with this link
  const [selectedCaption, setSelectedCaption] = useState(() => link.caption || getRandomCaption());
  const [copiedCaptionLink, setCopiedCaptionLink] = useState(false);
  const [copiedCaptionOnly, setCopiedCaptionOnly] = useState(false);

  // Close dropdown menu on click outside or escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const startPosRef = useRef({ x: 0, y: 0 });
  const gestureRef = useRef({
    active: false,
    direction: null, // 'horizontal' | 'vertical' | null
    moved: false,
    pointerId: null,
  });
  const didSwipeRef = useRef(false);

  const {
    id,
    url,
    title,
    domain,
    category,
    description,
    image,
    favicon,
    isLoading,
    createdAt,
    status,
    completedAt,
  } = link;

  const isDone = status === 'done';

  // Modern Universal Pointer Events for Smooth Swiping
  const handlePointerDown = (e) => {
    // Only primary button (left-click or touch)
    if (e.button !== undefined && e.button !== 0) return;

    // Ignore if target is inside quick actions, url row, or caption section
    if (
      e.target.closest('.card-quick-actions') ||
      e.target.closest('.card-url-row') ||
      e.target.closest('.card-caption-container')
    ) return;

    startPosRef.current = { x: e.clientX, y: e.clientY };
    gestureRef.current = {
      active: true,
      direction: null,
      moved: false,
      pointerId: e.pointerId,
    };
    didSwipeRef.current = false;
  };

  const handlePointerMove = (e) => {
    if (!gestureRef.current.active) return;

    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;

    // Determine gesture direction on initial movement
    if (!gestureRef.current.direction) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > 6 || absY > 6) {
        if (absY > absX) {
          // User is vertically scrolling the page - ignore swipe and allow default scrolling
          gestureRef.current.direction = 'vertical';
          return;
        } else {
          // User is swiping horizontally
          gestureRef.current.direction = 'horizontal';
          gestureRef.current.moved = true;
          setIsDragging(true);

          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // pointer capture not supported on some virtual environments
          }
        }
      } else {
        return;
      }
    }

    if (gestureRef.current.direction === 'horizontal') {
      // Calculate smooth clamped translation with progressive resistance
      const sign = Math.sign(dx);
      const absVal = Math.abs(dx);
      let calculatedX = dx;

      if (absVal > MAX_SWIPE_DISTANCE) {
        calculatedX = sign * (MAX_SWIPE_DISTANCE + (absVal - MAX_SWIPE_DISTANCE) * 0.15);
      }

      setOffsetX(calculatedX);
      if (Math.abs(dx) > 10) {
        didSwipeRef.current = true;
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!gestureRef.current.active) return;

    const currentOffset = offsetX;
    const isHorizontal = gestureRef.current.direction === 'horizontal';

    // Release pointer capture
    if (gestureRef.current.pointerId !== null) {
      try {
        if (e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function') {
          e.currentTarget.releasePointerCapture(gestureRef.current.pointerId);
        }
      } catch {
        // ignore
      }
    }

    // Reset gesture tracking
    gestureRef.current = {
      active: false,
      direction: null,
      moved: false,
      pointerId: null,
    };
    setIsDragging(false);
    setOffsetX(0);

    // Keep didSwipeRef true briefly to prevent click handler from opening link
    if (isHorizontal && Math.abs(currentOffset) > 10) {
      didSwipeRef.current = true;
      setTimeout(() => {
        didSwipeRef.current = false;
      }, 200);
    }

    // Trigger actions if threshold exceeded
    if (isHorizontal) {
      if (currentOffset >= SWIPE_THRESHOLD) {
        // Swipe Right -> Edit Link
        onEdit && onEdit(link);
      } else if (currentOffset <= -SWIPE_THRESHOLD) {
        // Swipe Left -> Delete Confirmation
        onDelete && onDelete(link.id);
      }
    }
  };

  const handlePointerCancel = (e) => {
    if (gestureRef.current.pointerId !== null) {
      try {
        if (e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function') {
          e.currentTarget.releasePointerCapture(gestureRef.current.pointerId);
        }
      } catch {
        // ignore
      }
    }
    gestureRef.current = {
      active: false,
      direction: null,
      moved: false,
      pointerId: null,
    };
    setIsDragging(false);
    setOffsetX(0);
    setTimeout(() => {
      didSwipeRef.current = false;
    }, 100);
  };

  const handleCardClick = (e) => {
    // If this click was from completing a swipe gesture, do not open the link
    if (didSwipeRef.current || Math.abs(offsetX) > 5) {
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

  const handleRefreshCaption = (e) => {
    e.stopPropagation();
    setSelectedCaption(getRandomCaption());
  };

  // BUTTON 1 — COPY CAPTION + LINK
  // [Selected caption including “Buy Here 👇”]
  // [The corresponding link]
  const handleCopyCaptionLink = (e) => {
    e.stopPropagation();
    const formatted = `${selectedCaption}\n${url}`;
    navigator.clipboard.writeText(formatted);
    setCopiedCaptionLink(true);
    onCopy && onCopy(formatted);
    setTimeout(() => setCopiedCaptionLink(false), 2000);
  };

  // BUTTON 2 — COPY CAPTION ONLY (WITHOUT "Buy Here 👇") + LINK
  // Format:
  // [Selected caption without “Buy Here 👇”]
  // [The corresponding link]
  const handleCopyCaptionOnly = (e) => {
    e.stopPropagation();
    const captionOnly = getCaptionWithoutBuyHere(selectedCaption);
    const formatted = `${captionOnly}\n${url}`;
    navigator.clipboard.writeText(formatted);
    setCopiedCaptionOnly(true);
    onCopy && onCopy(formatted);
    setTimeout(() => setCopiedCaptionOnly(false), 2000);
  };

  const handleToggleDoneClick = (e) => {
    e.stopPropagation();
    onToggleDone && onToggleDone(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete && onDelete(link.id);
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      onEdit && onEdit(link);
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      onToggleDone && onToggleDone(id);
    }
  };

  const domainInitial = domain ? domain.replace(/^https?:\/\//, '').charAt(0).toUpperCase() : 'L';
  const timestampText = formatAddedTimestamp(createdAt);
  const completedTimestampText = formatCompletedTimestamp(completedAt);

  const isShopee =
    category === 'shopee' ||
    (url && (url.toLowerCase().includes('shopee') || url.toLowerCase().includes('shp.ee'))) ||
    (domain && (domain.toLowerCase().includes('shopee') || domain.toLowerCase().includes('shp.ee')));

  const effectiveFavicon = isShopee ? '/shopee-logo.png' : favicon;

  // Determine active action visual feedback state
  const isRightSwipe = offsetX > 0;
  const isLeftSwipe = offsetX < 0;
  const isThresholdMet = Math.abs(offsetX) >= SWIPE_THRESHOLD;

  // Ignore generic automated placeholders as description
  const isGenericDesc =
    !description ||
    description.startsWith('Fetching ') ||
    description === url ||
    description.startsWith('Link saved from') ||
    description === 'Shopee Product' ||
    description === 'TikTok Video' ||
    description === 'Lazada Product';

  const cleanDescription = isGenericDesc ? null : description;

  return (
    <div className="swipe-card-container">
      {/* Background Swipe Action: EDIT (Left side revealed when swiping right) */}
      <div
        className={`swipe-action-backdrop swipe-action-edit ${
          isRightSwipe ? 'is-visible' : ''
        } ${isRightSwipe && isThresholdMet ? 'is-active-action' : ''}`}
        aria-hidden="true"
      >
        <div className="swipe-action-content">
          <Edit3 size={18} className="swipe-action-icon" />
          <span className="swipe-action-label">EDIT</span>
        </div>
      </div>

      {/* Background Swipe Action: DELETE (Right side revealed when swiping left) */}
      <div
        className={`swipe-action-backdrop swipe-action-delete ${
          isLeftSwipe ? 'is-visible' : ''
        } ${isLeftSwipe && isThresholdMet ? 'is-active-action' : ''}`}
        aria-hidden="true"
      >
        <div className="swipe-action-content">
          <Trash2 size={18} className="swipe-action-icon" />
          <span className="swipe-action-label">DELETE</span>
        </div>
      </div>

      {/* Foreground Link Card */}
      <article
        className={`link-card animate-card-in ${isLoading ? 'is-loading-card' : ''} ${
          isDragging ? 'is-swiping' : ''
        } ${isDone ? 'is-done' : ''}`}
        style={{
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.25, 1)',
        }}
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        title={`Open ${title || domain} (Swipe right to edit, swipe left to delete)`}
        aria-label={`Bookmark: ${title || domain}. ${isDone ? 'Status: Done.' : 'Status: Active.'} Swipe right to edit, swipe left to delete.`}
      >
        {/* Visual Preview / Thumbnail Area */}
        <div className="card-preview-area">
          {isLoading ? (
            <div className="preview-loading-box">
              <Loader2 size={24} className="spinner text-accent" />
              <span className="loading-badge-text">Loading...</span>
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
              {effectiveFavicon ? (
                <img
                  src={effectiveFavicon}
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
                {effectiveFavicon && (
                  <img
                    src={effectiveFavicon}
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
            </div>

            <div className="card-quick-actions" onClick={(e) => e.stopPropagation()}>
              {/* 1. Mark as Done button (Icon Only) */}
              <button
                type="button"
                className={`card-action-btn btn-action-icon btn-toggle-done ${isDone ? 'is-done' : ''}`}
                onClick={handleToggleDoneClick}
                title={isDone ? 'Mark as Not Done' : 'Mark as Done'}
                aria-label={isDone ? 'Mark as Not Done' : 'Mark as Done'}
              >
                <CheckCircle2 size={16} className={`toggle-done-icon ${isDone ? 'icon-done' : 'icon-active'}`} />
              </button>

              {/* 2. BUTTON 1 — COPY CAPTION + LINK (Sparkles Icon Only) */}
              <button
                type="button"
                className={`card-action-btn btn-action-icon btn-caption-link ${copiedCaptionLink ? 'is-copied copied' : ''}`}
                onClick={handleCopyCaptionLink}
                title={copiedCaptionLink ? 'Copied Caption + Link!' : 'Copy Caption (with "Buy Here 👇") + Link'}
                aria-label="Copy caption with Buy Here and link"
              >
                {copiedCaptionLink ? <Check size={16} className="copy-icon-success text-success" /> : <Sparkles size={16} />}
              </button>

              {/* 3. BUTTON 2 — COPY CAPTION (NO "Buy Here 👇") + LINK (FileText Icon Only) */}
              <button
                type="button"
                className={`card-action-btn btn-action-icon btn-caption-only ${copiedCaptionOnly ? 'is-copied copied' : ''}`}
                onClick={handleCopyCaptionOnly}
                title={copiedCaptionOnly ? 'Copied Caption (No CTA) + Link!' : 'Copy Caption (without "Buy Here 👇") + Link'}
                aria-label="Copy caption without Buy Here and link"
              >
                {copiedCaptionOnly ? <Check size={16} className="copy-icon-success text-success" /> : <FileText size={16} />}
              </button>

              {/* 4. Copy Link URL Button (Copy Icon Only) */}
              <button
                type="button"
                className={`card-action-btn btn-action-icon btn-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopyClick}
                title={copied ? 'Copied URL to clipboard!' : 'Copy link URL'}
                aria-label="Copy link URL"
              >
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>

              {/* 5. THREE-DOT (⋮) MENU FOR ADDING TO UA/WA/MA */}
              <div className="caption-menu-wrapper" ref={menuRef}>
                <button
                  type="button"
                  className={`card-action-btn btn-action-icon btn-caption-menu-toggle ${isMenuOpen ? 'is-open' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  title="Save this caption & link to a category (UA, WA, MA)"
                  aria-label="Add to category menu"
                  aria-haspopup="true"
                  aria-expanded={isMenuOpen}
                >
                  <MoreVertical size={16} />
                </button>

                {isMenuOpen && (
                  <div className="caption-dropdown-menu" onClick={(e) => e.stopPropagation()} role="menu">
                    <button
                      type="button"
                      className="caption-dropdown-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onAddToCategory && onAddToCategory(link, 'UA', selectedCaption);
                      }}
                    >
                      <span>Add to <strong>UA</strong></span>
                    </button>
                    <button
                      type="button"
                      className="caption-dropdown-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onAddToCategory && onAddToCategory(link, 'WA', selectedCaption);
                      }}
                    >
                      <span>Add to <strong>WA</strong></span>
                    </button>
                    <button
                      type="button"
                      className="caption-dropdown-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onAddToCategory && onAddToCategory(link, 'MA', selectedCaption);
                      }}
                    >
                      <span>Add to <strong>MA</strong></span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <h2 className="card-title" title={title || domain}>
            {title || domain}
          </h2>

          <div className="card-url-row">
            <span className="card-url-link" title={url}>
              <Globe size={13} />
              <span className="card-url-text">{url}</span>
            </span>
          </div>

          {/* Minimalist Caption Inspo Box */}
          <div className="card-caption-container" onClick={(e) => e.stopPropagation()}>
            <div className="card-caption-header">
              <span className="card-caption-label">Caption Inspo</span>
              <button
                type="button"
                className="btn-caption-refresh"
                onClick={handleRefreshCaption}
                title="Randomly pick another caption"
                aria-label="Randomly pick another caption"
              >
                <RefreshCw size={11} className="caption-refresh-icon" />
                <span>Randomize</span>
              </button>
            </div>

            <div className="card-caption-preview" title={selectedCaption}>
              <p className="card-caption-quote">{selectedCaption}</p>
            </div>
          </div>

          <div className="card-footer-row">
            {cleanDescription ? (
              <p className="card-description" title={cleanDescription}>
                {cleanDescription}
              </p>
            ) : (
              <span />
            )}

            <div className="card-footer-meta">
              {isDone && completedTimestampText ? (
                <span className="card-timestamp card-timestamp-done" title={`Completed: ${completedAt}`}>
                  <Check size={12} className="timestamp-done-icon text-success" />
                  <span>{completedTimestampText}</span>
                </span>
              ) : timestampText ? (
                <span className="card-timestamp" title={`Created: ${createdAt}`}>
                  <Clock size={12} className="timestamp-icon" />
                  <span>{timestampText}</span>
                </span>
              ) : null}
              <span className="external-indicator">
                <ExternalLink size={13} />
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

