import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export function DateFilter({
  dateFilter,
  onChangeFilter,
  customRange,
  onApplyCustomRange,
}) {
  const [isCustomOpen, setIsCustomOpen] = useState(dateFilter === 'custom');
  const [tempFrom, setTempFrom] = useState(customRange.from || '');
  const [tempTo, setTempTo] = useState(customRange.to || '');

  const filterOptions = [
    { value: 'all', label: 'All dates' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 days' },
    { value: 'last30days', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom date range...' },
  ];

  const handleSelectChange = (e) => {
    const val = e.target.value;
    onChangeFilter(val);
    if (val === 'custom') {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    onApplyCustomRange({ from: tempFrom, to: tempTo });
  };

  return (
    <div className="date-filter-wrapper">
      <div className="date-filter-select-box">
        <Calendar size={15} className="date-filter-icon" />
        <select
          className="date-filter-select"
          value={dateFilter}
          onChange={handleSelectChange}
          aria-label="Filter by date"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Date: {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="date-filter-arrow" />
      </div>

      {/* Custom Date Range Panel */}
      {isCustomOpen && (
        <form onSubmit={handleApplyCustom} className="custom-date-panel animate-scale-up">
          <div className="custom-date-inputs">
            <div className="date-input-group">
              <label htmlFor="custom-date-from" className="date-input-label">From:</label>
              <input
                id="custom-date-from"
                type="date"
                className="date-input-field"
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value)}
                required
              />
            </div>

            <div className="date-input-group">
              <label htmlFor="custom-date-to" className="date-input-label">To:</label>
              <input
                id="custom-date-to"
                type="date"
                className="date-input-field"
                value={tempTo}
                onChange={(e) => setTempTo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="custom-date-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              <Check size={14} />
              <span>Apply Filter</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setIsCustomOpen(false);
                onChangeFilter('all');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
