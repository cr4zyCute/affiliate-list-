import React, { useState } from 'react';
import { Plus, Link as LinkIcon, AlertCircle, Check, Type } from 'lucide-react';
import { isValidUrl, normalizeUrl, extractUrlsFromText } from '../services/metadataService';

export function LinkInput({ onAddLinks, existingUrls = [] }) {
  const [inputValue, setInputValue] = useState('');
  const [titleValue, setTitleValue] = useState('');
  const [error, setError] = useState('');
  const [justAdded, setJustAdded] = useState(false);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e?.preventDefault();

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Please paste or type a URL first.');
      return;
    }

    // Extract all URLs from input (supports multiple links pasted together)
    const detectedUrls = extractUrlsFromText(trimmed);

    if (detectedUrls.length === 0) {
      if (!isValidUrl(trimmed)) {
        setError('Please enter a valid website link (e.g. https://github.com, tiktok.com, or amazon.com).');
        return;
      }
      detectedUrls.push(normalizeUrl(trimmed));
    }

    // Filter out duplicates
    const newUrls = detectedUrls.filter((url) => 
      !existingUrls.some((existing) => existing.toLowerCase() === url.toLowerCase())
    );

    if (newUrls.length === 0) {
      setError('The link(s) you entered are already in your saved list.');
      return;
    }

    const customTitle = titleValue.trim() || undefined;

    // Clear inputs immediately so user can paste the next link right away!
    setInputValue('');
    setTitleValue('');
    setError('');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);

    // Instant addition to list
    const itemsToAdd = newUrls.map((url) => ({
      url,
      title: customTitle,
    }));

    onAddLinks(itemsToAdd);
  };

  return (
    <div className="link-input-section">
      <form onSubmit={handleSubmit} className="link-input-card">
        <div className={`input-field-wrapper dual-input-wrapper ${error ? 'has-error' : ''}`}>
          {/* Link URL Input Field */}
          <div className="input-field-subgroup input-subgroup-url">
            <div className="input-icon-prefix">
              <LinkIcon size={18} className="text-muted" />
            </div>

            <input
              id="link-url-input"
              type="text"
              className="link-input"
              placeholder="Paste a link here..."
              value={inputValue}
              onChange={handleInputChange}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <div className="input-field-divider" />

          {/* Title Input Field */}
          <div className="input-field-subgroup input-subgroup-title">
            <div className="input-icon-prefix">
              <Type size={18} className="text-muted" />
            </div>

            <input
              id="link-title-input"
              type="text"
              className="link-input link-title-input"
              placeholder="Paste or type title (optional)..."
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {/* Submit Button */}
          <button
            id="add-link-btn"
            type="submit"
            className="btn btn-primary btn-add"
            disabled={!inputValue.trim()}
          >
            {justAdded ? (
              <>
                <Check size={16} className="text-white" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Add</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="input-error-message animate-fade-in" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}
