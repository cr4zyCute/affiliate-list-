import React from 'react';

/**
 * Clean linear stroke SVG icons for each social / platform button.
 * Matches existing Lucide icon style (stroke-based, 2px stroke, linear design).
 */
export function SocialLinearIcon({ platform, size = 14 }) {
  switch (platform) {
    case 'shopee':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
          <path d="M10 13.5c.6-.6 1.4-.8 2-.8s1.6.3 1.6.9c0 .9-2 1-2 1.9 0 .6.7.9 1.4.9.7 0 1.2-.3 1.4-.6" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
      );

    case 'lazada':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3h12l3 6-9 12L3 9z" />
          <path d="M3 9h18" />
          <path d="m9 13 3 3 3-3" />
        </svg>
      );

    case 'pinterest':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M8.5 20.5l2-7.5c-.3-.5-.4-1.2-.4-1.8 0-1.7 1-2.9 2.2-2.9 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 3.9-.3 1.2.6 2.2 1.8 2.2 2.2 0 3.6-2.8 3.6-6 0-2.5-1.7-4.4-4.7-4.4-3.4 0-5.6 2.6-5.6 5.5 0 1 .4 2.1.9 2.7.1.1.1.2 0 .4l-.3 1.1" />
        </svg>
      );

    case 'fb':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );

    case 'ig':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      );

    case 'yt':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="15" x="2" y="4.5" rx="4" />
          <polygon points="10 8.5 15 12 10 15.5 10 8.5" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'quora':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="11" r="7.5" />
          <path d="M14 16.5l3.5 3.5" />
          <path d="M10 11.5a2 2 0 1 0 4 0" />
        </svg>
      );

    case 'x':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 4l16 16M4 20L20 4" />
        </svg>
      );

    default:
      return null;
  }
}

/**
 * Returns the exact list of linear buttons depending on link category:
 * - Shopee: Shopee, FB, IG
 * - TikTok: TikTok, FB, IG
 * - Lazada: Lazada, FB, IG
 * - Amazon: Pinterest, FB, IG, YouTube, Quora, X
 * - Other: FB, IG, X
 */
export function getSocialPlatforms(category, url = '', domain = '') {
  const c = String(category || '').toLowerCase();
  const u = String(url || '').toLowerCase();
  const d = String(domain || '').toLowerCase();

  const isShopee = c === 'shopee' || u.includes('shopee') || u.includes('shp.ee') || d.includes('shopee') || d.includes('shp.ee');
  const isTiktok = c === 'tiktok' || u.includes('tiktok') || d.includes('tiktok');
  const isLazada = c === 'lazada' || u.includes('lazada') || u.includes('lzd.co') || d.includes('lazada') || d.includes('lzd.co');
  const isAmazon = c === 'amazon' || u.includes('amazon') || u.includes('amzn.to') || u.includes('amzn.com') || d.includes('amazon');

  if (isShopee) {
    return [
      { id: 'shopee', label: 'Shopee' },
      { id: 'fb', label: 'Facebook' },
      { id: 'ig', label: 'Instagram' },
    ];
  }

  if (isTiktok) {
    return [
      { id: 'tiktok', label: 'TikTok' },
      { id: 'fb', label: 'Facebook' },
      { id: 'ig', label: 'Instagram' },
    ];
  }

  if (isLazada) {
    return [
      { id: 'lazada', label: 'Lazada' },
      { id: 'fb', label: 'Facebook' },
      { id: 'ig', label: 'Instagram' },
    ];
  }

  if (isAmazon) {
    return [
      { id: 'pinterest', label: 'Pinterest' },
      { id: 'fb', label: 'Facebook' },
      { id: 'ig', label: 'Instagram' },
      { id: 'yt', label: 'YouTube' },
      { id: 'quora', label: 'Quora' },
      { id: 'x', label: 'X (Twitter)' },
    ];
  }

  return [
    { id: 'fb', label: 'Facebook' },
    { id: 'ig', label: 'Instagram' },
    { id: 'x', label: 'X (Twitter)' },
  ];
}

/**
 * 1-line Social Media Posted Status Tracker Component
 */
export function SocialPostButtons({
  linkId,
  category,
  url,
  domain,
  postedPlatforms = [],
  onTogglePosted,
}) {
  const platforms = getSocialPlatforms(category, url, domain);

  return (
    <div
      className="card-social-post-group"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="Social media posting tracker"
    >
      {platforms.map((platform) => {
        const isPosted = Array.isArray(postedPlatforms) && postedPlatforms.includes(platform.id);

        return (
          <button
            key={platform.id}
            type="button"
            className={`social-post-btn social-btn-${platform.id} ${isPosted ? 'is-posted' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePosted && onTogglePosted(linkId, platform.id);
            }}
            title={
              isPosted
                ? `Posted on ${platform.label} ✓ (Click to unmark)`
                : `Mark as posted on ${platform.label}`
            }
            aria-label={
              isPosted
                ? `Posted on ${platform.label}`
                : `Not yet posted on ${platform.label}`
            }
            aria-pressed={isPosted}
          >
            <SocialLinearIcon platform={platform.id} size={14} />
            {isPosted && <span className="posted-indicator-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
