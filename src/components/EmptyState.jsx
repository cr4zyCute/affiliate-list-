import React from 'react';
import { SearchX, Link as LinkIcon } from 'lucide-react';

export function EmptyState({ type = 'no-links', onResetFilters }) {
  if (type === 'no-results') {
    return (
      <div className="empty-state-container" role="status">
        <div className="empty-icon-wrapper">
          <SearchX size={22} />
        </div>
        <h3 className="empty-title">No links found</h3>
        <p className="empty-description">
          Try a different search query or change your date filter.
        </p>
        {onResetFilters && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onResetFilters}
          >
            Reset All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="empty-state-container" role="status">
      <div className="empty-icon-wrapper">
        <LinkIcon size={22} />
      </div>
      <h3 className="empty-title">Your link vault is empty</h3>
      <p className="empty-description">
        Paste a link above and click Add (or press Enter) to save your first bookmark.
      </p>
    </div>
  );
}
