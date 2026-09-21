import React, { useState } from 'react';
import { CategoryTabs } from './CategoryTabs';
import { SearchBar } from './SearchBar';
import { DateFilter } from './DateFilter';
import { SortControl } from './SortControl';
import { SocialPostFilter } from './SocialPostFilter';
import { PostStatusPills } from './PostStatusPills';
import { DateGroup } from './DateGroup';
import { EmptyState } from './EmptyState';
import { filterLinksByDate, groupLinksByDate } from '../services/dateService';
import { filterLinksByPostStatus } from '../services/postFilterService';
import { downloadCategoryExcel } from '../utils/exportExcel';
import { Download } from 'lucide-react';

export function LinkList({
  links,
  onDeleteLink,
  onCopyLink,
  onEditLink,
  onToggleDone,
  onAddToCategory,
  onTogglePostedPlatform,
  onToggleStore,
  activeMainCategory = 'UA',
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [postFilter, setPostFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [sortOrder, setSortOrder] = useState('newest');

  // Sub-category counts for download button tooltips
  const categoryCounts = {
    all: links.length,
    shopee: links.filter((l) => l.category === 'shopee').length,
    lazada: links.filter((l) => l.category === 'lazada').length,
    tiktok: links.filter((l) => l.category === 'tiktok').length,
    amazon: links.filter((l) => l.category === 'amazon').length,
    other: links.filter(
      (l) => !['shopee', 'lazada', 'tiktok', 'amazon'].includes(l.category),
    ).length,
  };

  // Multi-criteria Filtering Pipeline
  // 1. Filter by category
  const categoryLinks = links.filter((link) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'shopee') return link.category === 'shopee';
    if (activeCategory === 'lazada') return link.category === 'lazada';
    if (activeCategory === 'tiktok') return link.category === 'tiktok';
    if (activeCategory === 'amazon') return link.category === 'amazon';
    if (activeCategory === 'other') return !['shopee', 'lazada', 'tiktok', 'amazon'].includes(link.category);
    return true;
  });

  // 2. Filter by social media post status (Not posted, Partially posted, Fully posted, Platform specific)
  let filtered = filterLinksByPostStatus(categoryLinks, postFilter);

  // 3. Filter by search query (title, URL, domain, description)
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

  // 4. Filter by date criteria (All, Today, Yesterday, 7d, 30d, Custom)
  filtered = filterLinksByDate(filtered, dateFilter, customRange);

  // 5. Group by Day with specified sort order
  const dateGroups = groupLinksByDate(filtered, sortOrder);

  const isFiltered =
    activeCategory !== 'all' ||
    postFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    dateFilter !== 'all' ||
    sortOrder !== 'newest';

  const handleResetFilters = () => {
    setActiveCategory('all');
    setPostFilter('all');
    setSearchQuery('');
    setDateFilter('all');
    setCustomRange({ from: '', to: '' });
    setSortOrder('newest');
  };

  const handleCategorySelect = (cat) => {
    setActiveCategory(cat);
    // If a platform-specific filter was active that doesn't make sense on the new category,
    // gracefully reset it to 'all'
    if (postFilter.startsWith('posted_') || postFilter.startsWith('not_posted_')) {
      setPostFilter('all');
    }
  };

  return (
    <section className="link-list-section" aria-label="Timeline of saved links">
      {/* 1. Category Tabs Navigation */}
      <CategoryTabs
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
        links={links}
      />

      {links.length > 0 && (
        <div className="filter-controls-container">
          {/* Quick Post Status Segmented Pills for Current Category */}
          <PostStatusPills
            links={categoryLinks}
            postFilter={postFilter}
            onChangePostFilter={setPostFilter}
          />

          <div className="search-filter-bar">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />

            <div className="filter-actions-group">
              <SocialPostFilter
                activeCategory={activeCategory}
                postFilter={postFilter}
                onChangePostFilter={setPostFilter}
              />

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

              {/* Per-category download — active tab's links */}
              <button
                type="button"
                className="btn-excel-cat-inline"
                onClick={() => downloadCategoryExcel(filtered, activeCategory, activeMainCategory)}
                title={`Download ${activeCategory === 'all' ? 'all' : activeCategory} filtered links as Excel`}
                aria-label="Download current category as Excel"
              >
                <Download size={13} />
              </button>
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

      {/* 4. Main Timeline Display */}
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
              onTogglePostedPlatform={onTogglePostedPlatform}
              onToggleStore={onToggleStore}
            />
          ))
        )}
      </div>
    </section>
  );
}


