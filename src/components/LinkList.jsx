import React, { useState } from 'react';
import { CategoryTabs } from './CategoryTabs';
import { SearchBar } from './SearchBar';
import { DateFilter } from './DateFilter';
import { SortControl } from './SortControl';
import { DateGroup } from './DateGroup';
import { EmptyState } from './EmptyState';
import { filterLinksByDate, groupLinksByDate } from '../services/dateService';

export function LinkList({ links, onDeleteLink, onCopyLink, onEditLink }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [sortOrder, setSortOrder] = useState('newest');

  // Multi-criteria Filtering Pipeline
  // 1. Filter by category
  let filtered = links.filter((link) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'tiktok') return link.category === 'tiktok';
    if (activeCategory === 'shopee') return link.category === 'shopee';
    if (activeCategory === 'other') return link.category !== 'tiktok' && link.category !== 'shopee';
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
    dateFilter !== 'all';

  const handleResetFilters = () => {
    setActiveCategory('all');
    setSearchQuery('');
    setDateFilter('all');
    setCustomRange({ from: '', to: '' });
    setSortOrder('newest');
  };

  return (
    <section className="link-list-section" aria-label="Timeline of saved links">
      {/* Category Tabs */}
      <CategoryTabs
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        links={links}
      />

      {/* Search and Date Filter Bar */}
      {links.length > 0 && (
        <div className="filter-controls-container">
          <div className="filter-row-primary">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />

            <DateFilter
              dateFilter={dateFilter}
              onChangeFilter={setDateFilter}
              customRange={customRange}
              onApplyCustomRange={setCustomRange}
            />
          </div>

          <div className="filter-row-secondary">
            <SortControl
              sortOrder={sortOrder}
              onChangeSort={setSortOrder}
            />

            <div className="filter-results-badge">
              <span>{filtered.length} {filtered.length === 1 ? 'link' : 'links'}</span>
              {isFiltered && (
                <button
                  type="button"
                  className="btn-reset-filters"
                  onClick={handleResetFilters}
                  title="Clear all active filters"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Timeline Display */}
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
            />
          ))
        )}
      </div>
    </section>
  );
}
