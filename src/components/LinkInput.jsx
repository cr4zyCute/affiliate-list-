import React, { useState } from 'react';
import { Plus, Link as LinkIcon, AlertCircle, Clipboard, Check } from 'lucide-react';
import { isValidUrl, normalizeUrl, extractUrlsFromText } from '../services/metadataService';

export function LinkInput({ onAddLinks, existingUrls = [] }) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [justAdded, setJustAdded] = useState(false);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (error) setError('');
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputValue(text.trim());
          if (error) setError('');
        }
      }
    } catch {
      // Clipboard access might be blocked by browser permissions, ignore gracefully
    }
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
        setError('Please enter a valid website link (e.g. https://github.com, tiktok.com, or youtube.com).');
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

    // Clear input immediately so user can paste the next link right away!
    setInputValue('');
    setError('');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);

    // Instant addition to list
    onAddLinks(newUrls);
  };

  return (
    <div className="link-input-section">
      <form onSubmit={handleSubmit} className="link-input-card">
        <div className={`input-field-wrapper ${error ? 'has-error' : ''}`}>
          <div className="input-icon-prefix">
            <LinkIcon size={20} className="text-muted" />
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

          {!inputValue && (
            <button
              type="button"
              className="btn-clipboard-paste"
              onClick={handlePasteClipboard}
              title="Paste from clipboard"
            >
              <Clipboard size={15} />
              <span className="hide-mobile">Paste</span>
            </button>
          )}

          <button
            id="add-link-btn"
            type="submit"
            className="btn btn-primary btn-add"
            disabled={!inputValue.trim()}
          >
            {justAdded ? (
              <>
                <Check size={18} className="text-white" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <Plus size={18} />
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
