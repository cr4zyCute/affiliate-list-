import React from 'react';

export function CategoryTabs({ activeCategory, onSelectCategory, links = [] }) {
  const counts = {
    all: links.length,
    shopee: links.filter((l) => l.category === 'shopee').length,
    lazada: links.filter((l) => l.category === 'lazada').length,
    tiktok: links.filter((l) => l.category === 'tiktok').length,
    other: links.filter((l) => !['shopee', 'lazada', 'tiktok'].includes(l.category)).length,
  };

  const categories = [
    { id: 'all', label: 'All Links', count: counts.all },
    { id: 'shopee', label: 'Shopee', count: counts.shopee },
    { id: 'lazada', label: 'Lazada', count: counts.lazada },
    { id: 'tiktok', label: 'TikTok', count: counts.tiktok },
    { id: 'other', label: 'Other', count: counts.other },
  ];

  return (
    <div className="category-tabs-container" role="tablist" aria-label="Link categories">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`category-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            <span className="category-tab-label">{cat.label}</span>
            <span className={`category-tab-count ${isActive ? 'count-active' : ''}`}>
              {cat.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
