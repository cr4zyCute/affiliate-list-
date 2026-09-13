/**
 * Service for date grouping, timeline headers, timestamp formatting,
 * and date range filtering.
 */

/**
 * Checks if two dates fall on the same calendar day.
 */
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Returns formatted calendar date, e.g., "September 14, 2026".
 */
export function formatFullDate(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns formatted short time, e.g., "2:35 AM".
 */
export function formatTime(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats link's added timestamp:
 * - Today: "Added today • 2:35 AM"
 * - Yesterday: "Added yesterday • 8:42 PM"
 * - Older: "Added September 12 • 3:20 PM"
 */
export function formatAddedTimestamp(dateIso) {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const timeStr = formatTime(d);

  if (isSameDay(d, now)) {
    return `Added today • ${timeStr}`;
  }
  if (isSameDay(d, yesterday)) {
    return `Added yesterday • ${timeStr}`;
  }

  const monthDay = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
  return `Added ${monthDay} • ${timeStr}`;
}

/**
 * Retrieves the header information for a date group in the timeline:
 * - Today: { primary: "Today", secondary: "September 14, 2026" }
 * - Yesterday: { primary: "Yesterday", secondary: "September 13, 2026" }
 * - Older: { primary: "September 12, 2026", secondary: null }
 */
export function getDateGroupInfo(dateIso) {
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) {
    return { primary: 'Unknown Date', secondary: null };
  }

  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const fullDate = formatFullDate(d);

  if (isSameDay(d, now)) {
    return { primary: 'Today', secondary: fullDate };
  }
  if (isSameDay(d, yesterday)) {
    return { primary: 'Yesterday', secondary: fullDate };
  }

  return { primary: fullDate, secondary: null };
}

/**
 * Filters links according to date filter criteria.
 * @param {Array} links
 * @param {string} filterType - 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'
 * @param {Object} customRange - { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 */
export function filterLinksByDate(links, filterType = 'all', customRange = {}) {
  if (!Array.isArray(links) || filterType === 'all') return links;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  return links.filter((link) => {
    if (!link.createdAt) return true;
    const linkDate = new Date(link.createdAt);
    if (isNaN(linkDate.getTime())) return true;

    switch (filterType) {
      case 'today':
        return linkDate >= todayStart && linkDate <= todayEnd;

      case 'yesterday':
        return linkDate >= yesterdayStart && linkDate <= yesterdayEnd;

      case 'last7days': {
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        return linkDate >= sevenDaysAgo && linkDate <= todayEnd;
      }

      case 'last30days': {
        const thirtyDaysAgo = new Date(todayStart);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        return linkDate >= thirtyDaysAgo && linkDate <= todayEnd;
      }

      case 'custom': {
        const { from, to } = customRange;
        if (!from && !to) return true;

        const fromDate = from ? new Date(`${from}T00:00:00`) : new Date(0);
        const toDate = to ? new Date(`${to}T23:59:59.999`) : new Date(8640000000000000);

        return linkDate >= fromDate && linkDate <= toDate;
      }

      default:
        return true;
    }
  });
}

/**
 * Sorts links by createdAt date.
 * @param {Array} links
 * @param {string} sortOrder - 'newest' | 'oldest'
 */
export function sortLinks(links, sortOrder = 'newest') {
  return [...links].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Groups links into date timeline sections.
 * Preserves the sorted order of days and items.
 */
export function groupLinksByDate(links, sortOrder = 'newest') {
  if (!Array.isArray(links) || links.length === 0) return [];

  const sorted = sortLinks(links, sortOrder);
  const groupsMap = new Map();

  for (const link of sorted) {
    const dateObj = new Date(link.createdAt || Date.now());
    const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

    if (!groupsMap.has(dateKey)) {
      const headerInfo = getDateGroupInfo(link.createdAt || new Date().toISOString());
      groupsMap.set(dateKey, {
        dateKey,
        primaryLabel: headerInfo.primary,
        secondaryLabel: headerInfo.secondary,
        links: [],
      });
    }

    groupsMap.get(dateKey).links.push(link);
  }

  return Array.from(groupsMap.values());
}
