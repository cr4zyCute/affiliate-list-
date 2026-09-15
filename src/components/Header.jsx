import React from 'react';
import { BookmarkCheck, Link as LinkIcon, Trash2, Moon, Sun } from 'lucide-react';

export function Header({
  totalLinks,
  onClearAll,
  theme = 'light',
  onToggleTheme,
  activeMainCategory = 'UA',
  onSelectMainCategory,
}) {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-container">
          <div className="brand-icon-wrapper">
            <LinkIcon size={20} className="brand-icon" />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">LinkVault</h1>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Main Categories (UA, WA, MA) for Caption/Link List System */}
          <div className="main-category-group" role="tablist" aria-label="Main Categories">
            {['UA', 'WA', 'MA'].map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeMainCategory === cat}
                className={`btn-main-cat ${activeMainCategory === cat ? 'is-active' : ''}`}
                onClick={() => onSelectMainCategory && onSelectMainCategory(cat)}
                title={`Switch to ${cat} list`}
                aria-label={`${cat} category list`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="stats-pill" title={`Total saved links in ${activeMainCategory}`}>
            <BookmarkCheck size={16} />
            <span>
              <strong>{totalLinks}</strong>
            </span>
          </div>

          {/* {totalLinks > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-clear-all"
              onClick={onClearAll}
              title="Clear all saved links"
            >
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          )} */}
        </div>
      </div>
    </header>
  );
}
