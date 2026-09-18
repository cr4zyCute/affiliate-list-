import React, { useState, useRef, useEffect } from 'react';
import { Share2, Check, Sparkles } from 'lucide-react';
import { SocialLinearIcon } from './SocialPostButtons';
import { getPlatformsForCategoryTab } from '../services/postFilterService';

export function SocialPostFilter({
  activeCategory = 'all',
  postFilter = 'all',
  onChangePostFilter,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const platforms = getPlatformsForCategoryTab(activeCategory);
  const hasActiveFilter = postFilter !== 'all';

  // Outside click & escape handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChangePostFilter(val);
    setIsOpen(false);
  };

  const statusOptions = [
    { value: 'all', label: 'All Post Statuses' },
    { value: 'not_posted', label: 'Not Posted Anywhere', indicator: 'status-indicator-none' },
    { value: 'partially_posted', label: 'Partially Posted', indicator: 'status-indicator-partial' },
    { value: 'fully_posted', label: 'Fully Posted (All Channels)', indicator: 'status-indicator-full' },
  ];

  // Helper to format category name for headers
  const categoryLabel =
    activeCategory === 'all'
      ? 'All Platforms'
      : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);

  return (
    <div className="icon-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`btn-icon-control btn-post-filter ${hasActiveFilter ? 'is-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Filter by social media post status"
        title="Filter by post status (Shopee, Lazada, TikTok, Amazon, etc.)"
      >
        <Share2 size={17} />
        {hasActiveFilter && <span className="active-dot-indicator active-dot-social" />}
      </button>

      {isOpen && (
        <div
          className="dropdown-menu dropdown-menu-post-filter animate-scale-up"
          role="menu"
        >
          {/* General Status Section */}
          <div className="dropdown-header">Overall Status</div>
          <div className="dropdown-options">
            {statusOptions.map((opt) => {
              const isSelected = postFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  className={`dropdown-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="dropdown-item-left">
                    {opt.indicator && (
                      <span className={`post-filter-dot ${opt.indicator}`} />
                    )}
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="dropdown-check-icon" />}
                </button>
              );
            })}
          </div>

          {/* Category-Specific Social Channels Section */}
          <div className="dropdown-divider" />
          <div className="dropdown-header">{categoryLabel} Social Channels</div>

          <div className="dropdown-platform-grid">
            {platforms.map((p) => {
              const notPostedKey = `not_posted_${p.id}`;
              const postedKey = `posted_${p.id}`;
              const isNotPostedSelected = postFilter === notPostedKey;
              const isPostedSelected = postFilter === postedKey;

              return (
                <div key={p.id} className="dropdown-platform-row">
                  <div className="platform-row-label">
                    <SocialLinearIcon platform={p.id} size={14} />
                    <span>{p.label}</span>
                  </div>
                  <div className="platform-toggle-pair">
                    <button
                      type="button"
                      className={`btn-platform-subfilter ${isNotPostedSelected ? 'is-selected is-not-posted' : ''}`}
                      onClick={() => handleSelect(notPostedKey)}
                      title={`Show links not posted to ${p.label}`}
                    >
                      Not Posted
                    </button>
                    <button
                      type="button"
                      className={`btn-platform-subfilter ${isPostedSelected ? 'is-selected is-posted' : ''}`}
                      onClick={() => handleSelect(postedKey)}
                      title={`Show links posted to ${p.label}`}
                    >
                      Posted
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {hasActiveFilter && (
            <>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-reset-btn"
                onClick={() => handleSelect('all')}
              >
                Clear post filter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
