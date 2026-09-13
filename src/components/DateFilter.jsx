import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Check } from 'lucide-react';

export function DateFilter({
  dateFilter,
  onChangeFilter,
  customRange,
  onApplyCustomRange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(dateFilter === 'custom');
  const [tempFrom, setTempFrom] = useState(customRange.from || '');
  const [tempTo, setTempTo] = useState(customRange.to || '');

  const dropdownRef = useRef(null);

  const filterOptions = [
    { value: 'all', label: 'All dates' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 days' },
    { value: 'last30days', label: 'Last 30 days' },
    { value: 'custom', label: 'Custom range...' },
  ];

  const hasActiveFilter = dateFilter !== 'all';

  // Handle outside click & escape key
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
    if (val === 'custom') {
      setIsCustomMode(true);
      onChangeFilter('custom');
    } else {
      setIsCustomMode(false);
      onChangeFilter(val);
      setIsOpen(false);
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    onApplyCustomRange({ from: tempFrom, to: tempTo });
    setIsOpen(false);
  };

  return (
    <div className="icon-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`btn-icon-control ${hasActiveFilter ? 'is-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Filter by date (${dateFilter})`}
        title="Filter by date"
      >
        <Calendar size={18} />
        {hasActiveFilter && <span className="active-dot-indicator" />}
      </button>

      {isOpen && (
        <div className="dropdown-menu dropdown-menu-date animate-scale-up" role="menu">
          <div className="dropdown-header">Date</div>

          {!isCustomMode ? (
            <div className="dropdown-options">
              {filterOptions.map((opt) => {
                const isSelected = dateFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitem"
                    className={`dropdown-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} className="dropdown-check-icon" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleApplyCustom} className="dropdown-custom-form">
              <div className="custom-date-inputs">
                <div className="date-input-group">
                  <label htmlFor="filter-date-from" className="date-input-label">From</label>
                  <input
                    id="filter-date-from"
                    type="date"
                    className="date-input-field"
                    value={tempFrom}
                    onChange={(e) => setTempFrom(e.target.value)}
                    required
                  />
                </div>
                <div className="date-input-group">
                  <label htmlFor="filter-date-to" className="date-input-label">To</label>
                  <input
                    id="filter-date-to"
                    type="date"
                    className="date-input-field"
                    value={tempTo}
                    onChange={(e) => setTempTo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="dropdown-custom-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsCustomMode(false);
                    onChangeFilter('all');
                    setIsOpen(false);
                  }}
                >
                  Reset
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Apply
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
