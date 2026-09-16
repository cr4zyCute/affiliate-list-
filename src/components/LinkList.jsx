import React, { useState } from 'react';
import { CategoryTabs } from './CategoryTabs';
import { SearchBar } from './SearchBar';
import { DateFilter } from './DateFilter';
import { SortControl } from './SortControl';
import { DateGroup } from './DateGroup';
import { EmptyState } from './EmptyState';
import { filterLinksByDate, groupLinksByDate } from '../services/dateService';

export function LinkList({ links, onDeleteLink, onCopyLink, onEditLink, onToggleDone, onAddToCategory }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [sortOrder, setSortOrder] = useState('newest');

  // Multi-criteria Filtering Pipeline
  // 1. Filter by category
  let filtered = links.filter((link) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'shopee') return link.category === 'shopee';
    if (activeCategory === 'lazada') return link.category === 'lazada';
    if (activeCategory === 'tiktok') return link.category === 'tiktok';
    if (activeCategory === 'amazon') return link.category === 'amazon';
    if (activeCategory === 'other') return !['shopee', 'lazada', 'tiktok', 'amazon'].includes(link.category);
    return true;
  });

  // 2. Filter by search query (title, URL, domain, description)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((link) => {
      const titleMatch = link.title?.toLowerCase().includes(q);
      const urlMatch = link.url?.toLowerCase().includes(q);
      const domainMatch = link.domain?.toLowerCase().includes(q);
      const descMatch = link.description?.toLowerCase().includes(q);
      return titleMatch || urlMatch || domainMatch || descMatch;
    });
  }

  // 3. Filter by date criteria (All, Today, Yesterday, 7d, 30d, Custom)
  filtered = filterLinksByDate(filtered, dateFilter, customRange);

  // 4. Group by Day with specified sort order
  const dateGroups = groupLinksByDate(filtered, sortOrder);

  const isFiltered =
    activeCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    dateFilter !== 'all' ||
    sortOrder !== 'newest';

  const handleResetFilters = () => {
    setActiveCategory('all');
    setSearchQuery('');
    setDateFilter('all');
    setCustomRange({ from: '', to: '' });
    setSortOrder('newest');
  };

  return (
    <section className="link-list-section" aria-label="Timeline of saved links">
      {/* 1. Category Tabs Navigation */}
      <CategoryTabs
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        links={links}
      />

      {/* 2. Compact Search & Filter Control Bar */}
      {links.length > 0 && (
        <div className="filter-controls-container">
          <div className="search-filter-bar">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />

            <div className="filter-actions-group">
              <DateFilter
                dateFilter={dateFilter}
                onChangeFilter={setDateFilter}
                customRange={customRange}
                onApplyCustomRange={setCustomRange}
              />

              <SortControl
                sortOrder={sortOrder}
                onChangeSort={setSortOrder}
              />
            </div>
          </div>

          {isFiltered && (
            <div className="filter-status-row">
              <span className="filter-count-badge">
                {filtered.length} {filtered.length === 1 ? 'link' : 'links'}
              </span>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleResetFilters}
                title="Reset all filters to default"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Timeline Display */}
      <div className="timeline-container">
        {links.length === 0 ? (
          <EmptyState type="no-links" />
        ) : dateGroups.length === 0 ? (
          <EmptyState type="no-results" onResetFilters={handleResetFilters} />
        ) : (
          dateGroups.map((group) => (
            <DateGroup
              key={group.dateKey}
              group={group}
              onDeleteLink={onDeleteLink}
              onCopyLink={onCopyLink}
              onEditLink={onEditLink}
              onToggleDone={onToggleDone}
              onAddToCategory={onAddToCategory}
            />
          ))
        )}
      </div>
    </section>
  );
}
