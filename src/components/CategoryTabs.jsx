import React from 'react';
import { Layers } from 'lucide-react';

export function CategoryTabs({ activeCategory, onSelectCategory, links = [] }) {
  const counts = {
    all: links.length,
    tiktok: links.filter((l) => l.category === 'tiktok').length,
    shopee: links.filter((l) => l.category === 'shopee').length,
    other: links.filter((l) => l.category !== 'tiktok' && l.category !== 'shopee').length,
  };

  const categories = [
    { id: 'all', label: 'All Links', count: counts.all },
    { id: 'tiktok', label: 'TikTok', count: counts.tiktok },
    { id: 'shopee', label: 'Shopee', count: counts.shopee },
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
