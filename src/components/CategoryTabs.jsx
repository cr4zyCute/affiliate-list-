import React from 'react';

export function CategoryTabs({ activeCategory, onSelectCategory, links = [] }) {
  const counts = {
    all: links.length,
    shopee: links.filter((l) => l.category === 'shopee').length,
    lazada: links.filter((l) => l.category === 'lazada').length,
    tiktok: links.filter((l) => l.category === 'tiktok').length,
    amazon: links.filter((l) => l.category === 'amazon').length,
    other: links.filter((l) => !['shopee', 'lazada', 'tiktok', 'amazon'].includes(l.category)).length,
  };

  const categories = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'shopee', label: 'Shopee', count: counts.shopee },
    { id: 'lazada', label: 'Lazada', count: counts.lazada },
    { id: 'tiktok', label: 'TikTok', count: counts.tiktok },
    { id: 'amazon', label: 'Amazon', count: counts.amazon },
    { id: 'other', label: 'Other', count: counts.other },
  ];

  return (
    <nav className="category-nav" aria-label="Link category tabs">
      <div className="category-tabs-container" role="tablist">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`category-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <span className="category-tab-name">{cat.label}</span>
              {cat.count > 0 && (
                <span className="category-tab-count">{cat.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
