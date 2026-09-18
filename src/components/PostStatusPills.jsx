import React from 'react';
import { getPostStatusCounts } from '../services/postFilterService';

export function PostStatusPills({
  links = [],
  postFilter = 'all',
  onChangePostFilter,
}) {
  const counts = getPostStatusCounts(links);

  const pills = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'not_posted', label: 'Not Posted', count: counts.notPosted, dotClass: 'dot-not-posted' },
    { id: 'partially_posted', label: 'Partially Posted', count: counts.partiallyPosted, dotClass: 'dot-partial' },
    { id: 'fully_posted', label: 'Fully Posted', count: counts.fullyPosted, dotClass: 'dot-fully-posted' },
  ];

  // If a specific platform filter is active (e.g. 'posted_fb' or 'not_posted_shopee'),
  // we can show an extra active pill or indicate custom filter.
  const isCustomPlatformFilter =
    postFilter.startsWith('posted_') || postFilter.startsWith('not_posted_');

  return (
    <div className="post-status-pills-bar" role="tablist" aria-label="Social media post status filters">
      <div className="post-status-pills-track">
        {pills.map((pill) => {
          const isActive = postFilter === pill.id;

          return (
            <button
              key={pill.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`status-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => onChangePostFilter(pill.id)}
            >
              {pill.dotClass && <span className={`pill-dot ${pill.dotClass}`} />}
              <span className="pill-label">{pill.label}</span>
              <span className="pill-count">{pill.count}</span>
            </button>
          );
        })}

        {isCustomPlatformFilter && (
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="status-pill is-active is-custom-filter"
            onClick={() => onChangePostFilter('all')}
            title="Click to clear specific channel filter"
          >
            <span className="pill-dot dot-custom" />
            <span className="pill-label">
              {postFilter.startsWith('not_posted_') ? 'Not on ' : 'On '}
              {postFilter.replace('not_posted_', '').replace('posted_', '').toUpperCase()}
            </span>
            <span className="pill-close">✕</span>
          </button>
        )}
      </div>
    </div>
  );
}
