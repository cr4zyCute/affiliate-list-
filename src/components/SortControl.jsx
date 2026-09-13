import React from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';

export function SortControl({ sortOrder, onChangeSort }) {
  return (
    <div className="sort-control-wrapper">
      <ArrowUpDown size={14} className="sort-icon" />
      <select
        className="sort-select"
        value={sortOrder}
        onChange={(e) => onChangeSort(e.target.value)}
        aria-label="Sort links by date"
      >
        <option value="newest">Sort: Newest first</option>
        <option value="oldest">Sort: Oldest first</option>
      </select>
      <ChevronDown size={14} className="sort-arrow" />
    </div>
  );
}
