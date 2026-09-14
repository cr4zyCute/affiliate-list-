import React, { useState, useRef } from 'react';
import { ExternalLink, Copy, Check, Globe, Loader2, Clock, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { formatAddedTimestamp, formatCompletedTimestamp } from '../services/dateService';

const SWIPE_THRESHOLD = 75; // px distance to activate swipe action
const MAX_SWIPE_DISTANCE = 130; // max translation clamp

export function LinkCard({ link, onDelete, onCopy, onEdit, onToggleDone }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

    // Ignore if target is copy button or done toggle button
    if (e.target.closest('.btn-copy') || e.target.closest('.btn-toggle-done')) return;

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
        e.currentTarget.releasePointerCapture(gestureRef.current.pointerId);
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
        e.currentTarget.releasePointerCapture(gestureRef.current.pointerId);
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

              {isDone && (
                <span className="done-status-pill" title={`Completed on ${completedTimestampText}`}>
                  <Check size={11} className="done-status-icon" />
                  Done
                </span>
              )}
            </div>

            <div className="card-quick-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`card-action-btn btn-toggle-done ${isDone ? 'is-done' : ''}`}
                onClick={handleToggleDoneClick}
                title={isDone ? 'Mark as Not Done' : 'Mark as Done'}
                aria-label={isDone ? 'Mark as Not Done' : 'Mark as Done'}
              >
                <CheckCircle2 size={16} className={`toggle-done-icon ${isDone ? 'icon-done' : 'icon-active'}`} />
                <span className="btn-action-label">{isDone ? 'Mark as Not Done' : 'Mark as Done'}</span>
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

          <div className="card-url-row">
            <span className="card-url-link" title={url}>
              <Globe size={13} />
              <span className="card-url-text">{url}</span>
            </span>
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

