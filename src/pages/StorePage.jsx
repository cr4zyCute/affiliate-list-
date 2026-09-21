import React, { useState, useEffect, useMemo } from 'react';
import './StorePage.css';

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

// ── Individual product card ──────────────────────────────────
function ProductCard({ product }) {
  const [imgFailed, setImgFailed] = useState(false);

  const href = product.url || product.pageUrl || '#';
  const title = product.title || 'Amazon Product';
  const caption = product.caption || product.description || '';

  return (
    <a
      className="store-card"
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      title={title}
      id={`product-${product.id}`}
    >
      {/* Image */}
      <div className="store-card-image-wrap">
        {product.image && !imgFailed ? (
          <img
            src={product.image}
            alt={title}
            className="store-card-img"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="store-card-img-fallback">
            <PackageIcon size={40} />
            <span>Amazon</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="store-card-body">
        <h2 className="store-card-title">{title}</h2>

        {caption && (
          <p className="store-card-caption">{caption}</p>
        )}

        <div className="store-card-footer">
          <span className="store-card-btn">Shop on Amazon</span>
        </div>
      </div>
    </a>
  );
}

// ── Main Store Page ──────────────────────────────────────────
export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  const loadProducts = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/store');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
      setStatus('ok');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.');
      setStatus('error');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

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
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </>
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
