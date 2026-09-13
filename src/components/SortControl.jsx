import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';

export function SortControl({ sortOrder, onChangeSort }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const sortOptions = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
  ];

  const hasCustomSort = sortOrder !== 'newest';

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
    onChangeSort(val);
    setIsOpen(false);
  };

  return (
    <div className="icon-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`btn-icon-control ${hasCustomSort ? 'is-active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Sort links (${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'})`}
        title="Sort order"
      >
        <ArrowUpDown size={18} />
      </button>

      {isOpen && (
        <div className="dropdown-menu dropdown-menu-sort animate-scale-up" role="menu">
          <div className="dropdown-header">Sort</div>
          <div className="dropdown-options">
            {sortOptions.map((opt) => {
              const isSelected = sortOrder === opt.value;
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
        </div>
      )}
    </div>
  );
}
