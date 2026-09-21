import React, { useState, useEffect, useRef } from 'react';
import './PinLock.css';

const CORRECT_PIN = import.meta.env.VITE_ADMIN_PIN || '0000';
const SESSION_KEY = 'lv_admin_unlocked';
const MAX_LEN     = CORRECT_PIN.length;

export default function PinLock({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  );
  const [digits, setDigits]   = useState([]);
  const [shake, setShake]     = useState(false);
  const [error, setError]     = useState('');
  const containerRef          = useRef(null);

  // Keyboard support
  useEffect(() => {
    if (unlocked) return;
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      if (e.key === 'Backspace') del();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlocked, digits]);

  function press(num) {
    setError('');
    setDigits(prev => {
      const next = [...prev, num];
      if (next.length === MAX_LEN) {
        setTimeout(() => submit(next), 120);
      }
      return next.length <= MAX_LEN ? next : prev;
    });
  }

  function del() {
    setError('');
    setDigits(prev => prev.slice(0, -1));
  }

  function submit(d) {
    const entered = d.join('');
    if (entered === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setShake(true);
      setError('Incorrect PIN');
      setDigits([]);
      setTimeout(() => setShake(false), 600);
    }
  }

  if (unlocked) return children;

  const keys = ['1','2','3','4','5','6','7','8','9','','0','bksp'];

  return (
    <div className="pin-overlay">
      <div className={`pin-card ${shake ? 'pin-shake' : ''}`} ref={containerRef}>
        <div className="pin-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1 className="pin-title">Admin Access</h1>
        <p className="pin-subtitle">Enter your PIN to continue</p>

        <div className="pin-dots" aria-label="PIN entry">
          {Array.from({ length: MAX_LEN }).map((_, i) => (
            <span
              key={i}
              className={`pin-dot ${i < digits.length ? 'pin-dot--filled' : ''}`}
            />
          ))}
        </div>

        <p className="pin-error" role="alert">{error || '\u00A0'}</p>

        <div className="pin-pad">
          {keys.map((k, i) => {
            if (k === '') return <span key={i} className="pin-key-empty" />;
            if (k === 'bksp') return (
              <button key={i} className="pin-key pin-key--del" onClick={del} aria-label="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                  <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                </svg>
              </button>
            );
            return (
              <button key={i} className="pin-key" onClick={() => press(k)} aria-label={k}>
                {k}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
