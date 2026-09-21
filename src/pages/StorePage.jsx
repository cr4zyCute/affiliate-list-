import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './StorePage.css';
import { subscribeToStoreUpdates } from '../utils/storeSync';

// ── Icons (inline SVG — no extra dependencies) ──────────────
function ShoppingBagIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PackageIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function FlameIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function PaletteIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function CloseIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Skeleton loader cards ────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="store-skeleton-grid">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div className="store-skeleton-card" key={n}>
          <div className="store-skeleton-img" />
          <div className="store-skeleton-body">
            <div className="store-skeleton-line medium" />
            <div className="store-skeleton-line short" />
            <div className="store-skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Star Rating Component ─────────────────────────────────────
function StarRating({ rating = 0, reviewsCount = null }) {
  if (!rating || rating <= 0) return null;
  const num = Number(rating);

  // Generate 5 star indicators
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (num >= i) {
      stars.push('full');
    } else if (num >= i - 0.5) {
      stars.push('half');
    } else {
      stars.push('empty');
    }
  }

  return (
    <div className="store-rating-wrap" title={`${num} out of 5 stars`}>
      <span className="store-rating-score">{num.toFixed(1)}</span>
      <div className="store-stars-row" aria-label={`${num} stars`}>
        {stars.map((type, idx) => (
          <svg
            key={idx}
            className="store-star-icon"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={type === 'full' ? '#F59E0B' : type === 'half' ? 'url(#halfStarGrad)' : '#E5E7EB'}
            stroke="#F59E0B"
            strokeWidth="1.2"
          >
            <defs>
              <linearGradient id="halfStarGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      {reviewsCount && (
        <span className="store-reviews-count">({reviewsCount})</span>
      )}
    </div>
  );
}

// ── Bought Badge Component ───────────────────────────────────
function BoughtBadge({ count }) {
  if (!count) return null;
  return (
    <div className="store-bought-badge" title={count}>
      <FlameIcon size={12} />
      <span>{count}</span>
    </div>
  );
}

// ── Auto-Sliding Card Image Gallery ──────────────────────────
function CardImageSlider({ product }) {
  const variants = (product.colorVariants && product.colorVariants.length > 0)
    ? product.colorVariants
    : (product.image ? [{ name: product.colorName || 'Default', image: product.image }] : []);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (variants.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % variants.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [variants.length, isHovered]);

  const currentVariant = variants[currentIdx] || variants[0];
  const displayImg = currentVariant?.image || product.image;

  return (
    <div
      className="store-card-image-wrap"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {displayImg ? (
        <img
          src={displayImg}
          alt={product.title}
          className="store-card-img"
          loading="lazy"
        />
      ) : (
        <div className="store-card-img-fallback">
          <PackageIcon size={40} />
          <span>Amazon</span>
        </div>
      )}

      {/* Color count badge */}
      {variants.length > 1 && (
        <div className="store-card-variant-tag">
          <span className="store-variant-tag-dot" />
          <span>{variants.length} colors</span>
        </div>
      )}

      {/* Slide indicator dots */}
      {variants.length > 1 && (
        <div className="store-slider-dots">
          {variants.slice(0, 6).map((_, i) => (
            <span
              key={i}
              className={`store-slider-dot ${i === currentIdx ? 'is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx(i);
              }}
            />
          ))}
          {variants.length > 6 && (
            <span className="store-slider-dot-more">+{variants.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Product Preview Modal ────────────────────────────────────
function ProductPreviewModal({ product, onClose }) {
  if (!product) return null;

  const variants = (product.colorVariants && product.colorVariants.length > 0)
    ? product.colorVariants
    : (product.image ? [{ name: product.colorName || 'Default', image: product.image, thumbnail: product.image }] : []);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeVariant = variants[selectedIdx] || variants[0];
  const activeColorName = activeVariant?.name || product.colorName || 'Default';
  const activeImage = activeVariant?.image || product.image;
  const affiliateHref = product.url || product.pageUrl || '#';

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="store-modal-overlay" onClick={onClose}>
      <div className="store-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="store-modal-close" onClick={onClose} aria-label="Close preview">
          <CloseIcon size={14} />
        </button>

        <div className="store-modal-grid">
          {/* Main Visual Preview */}
          <div className="store-modal-preview-area">
            <div className="store-modal-img-wrap">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={activeColorName}
                  className="store-modal-img"
                />
              ) : (
                <div className="store-card-img-fallback">
                  <PackageIcon size={48} />
                  <span>Amazon</span>
                </div>
              )}
            </div>
          </div>

          {/* Details & Color Variations */}
          <div className="store-modal-details">
            <div className="store-modal-badge-row">
              <span className="store-modal-domain">amazon.com</span>
              <BoughtBadge count={product.boughtCount} />
            </div>

            <h2 className="store-modal-title">{product.title}</h2>

            <StarRating rating={product.rating} reviewsCount={product.reviewsCount} />

            {product.caption && (
              <p className="store-modal-caption">{product.caption}</p>
            )}

            {/* Color Section */}
            <div className="store-modal-color-section">
              <div className="store-modal-color-label">
                <span className="store-color-icon">
                  <PaletteIcon size={15} />
                </span>
                <span className="store-color-label-text">Color:</span>
                <span className="store-color-active-name">{activeColorName}</span>
              </div>

              {/* Color Swatches / Thumbnails */}
              {variants.length > 0 && (
                <div className="store-swatches-grid" role="radiogroup" aria-label="Available colors">
                  {variants.map((variant, idx) => {
                    const isSelected = idx === selectedIdx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`store-swatch-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedIdx(idx)}
                        title={variant.name}
                        aria-checked={isSelected}
                        role="radio"
                      >
                        {variant.thumbnail || variant.image ? (
                          <img
                            src={variant.thumbnail || variant.image}
                            alt={variant.name}
                            className="store-swatch-thumb"
                          />
                        ) : (
                          <span className="store-swatch-fallback">{variant.name.charAt(0)}</span>
                        )}
                        <span className="store-swatch-tooltip">{variant.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action button: Direct Affiliate Link Button (NO PRICE!) */}
            <div className="store-modal-actions">
              <a
                href={affiliateHref}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="store-modal-shop-btn"
              >
                <span>Shop on Amazon</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <p className="store-modal-affiliate-note">
                Opens directly on Amazon to Shop More .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Individual Product Card ──────────────────────────────────
function ProductCard({ product, onOpenPreview }) {
  const href = product.url || product.pageUrl || '#';
  const title = product.title || 'Amazon Product';
  const caption = product.caption || product.description || '';

  return (
    <div
      className="store-card"
      onClick={() => onOpenPreview(product)}
      role="button"
      tabIndex={0}
      title="Click to preview colors"
      id={`product-${product.id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onOpenPreview(product);
        }
      }}
    >
      {/* Auto-sliding Image Gallery */}
      <CardImageSlider product={product} />

      {/* Body */}
      <div className="store-card-body">
        {/* Star Rating & Bought Proof */}
        <div className="store-card-meta-row">
          <StarRating rating={product.rating} reviewsCount={product.reviewsCount} />
          <BoughtBadge count={product.boughtCount} />
        </div>

        <h2 className="store-card-title">{title}</h2>

        {caption && (
          <p className="store-card-caption">{caption}</p>
        )}

        {/* Card Footer: Direct Affiliate Link Button (NO PRICE!) */}
        <div className="store-card-footer">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="store-card-btn"
            onClick={(e) => e.stopPropagation()}
            title="Shop directly on Amazon"
          >
            <span>Shop on Amazon</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Store Page ──────────────────────────────────────────
export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [previewProduct, setPreviewProduct] = useState(null);

  const isFetchingRef = useRef(false);

  const loadProducts = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isBackground) {
      setStatus('loading');
      setErrorMsg('');
    }

    try {
      // Prevent all caching (browser, proxy, CDN) with cache-buster timestamp
      const res = await fetch(`/api/store?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
      setStatus('ok');
    } catch (err) {
      // Only show error UI on full page initial loads; don't break UI on background poll failures
      if (!isBackground) {
        setErrorMsg(err.message || 'Something went wrong.');
        setStatus('error');
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 1. Initial load
    loadProducts(false);

    // 2. Cross-tab instant sync (fires when links are added/updated in admin tab)
    const unsubscribe = subscribeToStoreUpdates(() => {
      loadProducts(true);
    });

    // 3. Auto-refresh when user focuses or returns to the store tab
    const handleFocus = () => loadProducts(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadProducts(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Background polling every 10 seconds to keep catalog updated
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadProducts(true);
      }
    }, 10000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [loadProducts]);

  // Filter by search term (title or caption)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.caption || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div className="store-page">
      {/* ── Sticky Header ── */}
      <header className="store-header">
        <div className="store-header-inner">
          <div className="store-brand">
            <div className="store-brand-mark">
              <ShoppingBagIcon size={16} />
            </div>
            <span className="store-brand-name">My Amazon Picks</span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="store-hero">
        <p className="store-hero-eyebrow">Curated Amazon Finds</p>
        <h1 className="store-hero-title">Products I Recommend</h1>
      </section>

      {/* ── Content ── */}
      {status === 'loading' && (
        <div className="store-grid-wrap">
          <SkeletonGrid />
        </div>
      )}

      {status === 'error' && (
        <div className="store-state-wrap">
          <p className="store-error-title">Could not load products</p>
          <p className="store-error-msg">{errorMsg}</p>
          <button className="store-retry-btn" onClick={loadProducts}>
            Try Again
          </button>
        </div>
      )}

      {status === 'ok' && (
        <>
          {/* Controls */}
          <div className="store-controls">
            <div className="store-search-wrap">
              <span className="store-search-icon">
                <SearchIcon size={15} />
              </span>
              <input
                id="store-search"
                type="search"
                className="store-search-input"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
              />
            </div>
            <span className="store-product-count">
              {filtered.length === products.length
                ? `${products.length} product${products.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${products.length} products`}
            </span>
          </div>

          {/* Grid */}
          <div className="store-grid-wrap">
            {filtered.length === 0 ? (
              <div className="store-state-wrap">
                <PackageIcon size={48} />
                <p className="store-empty-title">No products found</p>
                <p className="store-empty-subtitle">
                  {search ? 'Try a different search term.' : 'No products have been added to the store yet.'}
                </p>
              </div>
            ) : (
              <div className="store-grid">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenPreview={setPreviewProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Product Color Swatches & Details Preview Modal ── */}
      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
        />
      )}

      {/* ── Footer ── */}
      <footer className="store-footer">
        <p>
          As an Amazon Associate, I earn from qualifying purchases.
          Prices and availability are subject to change.
        </p>
      </footer>
    </div>
  );
}
