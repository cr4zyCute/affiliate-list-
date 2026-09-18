import * as XLSX from 'xlsx';

// Platform label map
const PLATFORM_LABELS = {
  shopee: 'Shopee',
  lazada: 'Lazada',
  tiktok: 'TikTok',
  fb: 'Facebook',
  ig: 'Instagram',
  pinterest: 'Pinterest',
  yt: 'YouTube',
  quora: 'Quora',
  x: 'X (Twitter)',
};

/** Format ISO date → readable string */
function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

/** Map a link to a flat row object keyed by header label */
function linkToRow(link, index) {
  const postedOn =
    (link.postedPlatforms || [])
      .map((p) => PLATFORM_LABELS[p] || p)
      .join(', ') || '—';

  return {
    '#': index + 1,
    Title: link.title || link.domain || '(No title)',
    'Product URL': link.url || '',
    'Affiliate Link': link.affiliateUrl || link.url || '',
    Domain: link.domain || '',
    Category: link.category
      ? link.category.charAt(0).toUpperCase() + link.category.slice(1)
      : 'Other',
    Status: link.status === 'done' ? 'Done' : 'Active',
    'Posted On': postedOn,
    Caption: link.caption || '',
    'Date Added': formatDate(link.createdAt),
    'Date Completed': link.completedAt ? formatDate(link.completedAt) : '—',
  };
}

/** Set column widths on a worksheet */
function applyColWidths(ws) {
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 52 },  // Title
    { wch: 55 },  // Product URL
    { wch: 55 },  // Affiliate Link
    { wch: 22 },  // Domain
    { wch: 12 },  // Category
    { wch: 10 },  // Status
    { wch: 30 },  // Posted On
    { wch: 50 },  // Caption
    { wch: 22 },  // Date Added
    { wch: 22 },  // Date Completed
  ];
}

/**
 * Build an xlsx worksheet from a link array.
 * Layout:
 *   Row 1  — merged sheet title banner
 *   Row 2  — merged link count subtitle
 *   Row 3  — blank separator
 *   Row 4  — column headers (frozen)
 *   Row 5+ — data
 */
function buildSheet(links, sheetTitle) {
  const HEADERS = [
    '#',
    'Title',
    'Product URL',
    'Affiliate Link',
    'Domain',
    'Category',
    'Status',
    'Posted On',
    'Caption',
    'Date Added',
    'Date Completed',
  ];

  const bannerRow   = [sheetTitle, ...Array(HEADERS.length - 1).fill('')];
  const subtitleRow = [
    `${links.length} link${links.length !== 1 ? 's' : ''}  •  Exported ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    ...Array(HEADERS.length - 1).fill(''),
  ];
  const blankRow    = Array(HEADERS.length).fill('');
  const headerRow   = HEADERS;
  const dataRows    = links.map((link, i) =>
    HEADERS.map((h) => linkToRow(link, i)[h]),
  );

  const aoa = [bannerRow, subtitleRow, blankRow, headerRow, ...dataRows];
  const ws  = XLSX.utils.aoa_to_sheet(aoa);

  // Merge banner & subtitle across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: HEADERS.length - 1 } },
  ];

  applyColWidths(ws);

  // Freeze rows above data (rows 1-4)
  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  return ws;
}

/**
 * Export a single sub-category's links to Excel.
 *
 * @param {Array}  links          - visible links in the active mainCategory
 * @param {string} categoryFilter - 'all' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'other'
 * @param {string} mainCategory   - 'UA' | 'WA' | 'MA'
 */
export function downloadCategoryExcel(links, categoryFilter, mainCategory = 'UA') {
  let filtered;
  if (categoryFilter === 'all') {
    filtered = links;
  } else if (categoryFilter === 'other') {
    filtered = links.filter(
      (l) => !['shopee', 'lazada', 'tiktok', 'amazon'].includes(l.category),
    );
  } else {
    filtered = links.filter((l) => l.category === categoryFilter);
  }

  if (filtered.length === 0) {
    alert('No links to export for this category.');
    return;
  }

  const label =
    categoryFilter === 'all'
      ? 'All'
      : categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1);

  const sheetTitle = `${mainCategory} — ${label} Links`;
  const ws = buildSheet(filtered, sheetTitle);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31));

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${mainCategory}_${label}_Links_${date}.xlsx`);
}

/**
 * Export ALL links from every sub-category in one multi-sheet workbook.
 * Sheet order: All → Shopee → Lazada → TikTok → Amazon → Other
 *
 * @param {Array}  links        - visible links in the active mainCategory
 * @param {string} mainCategory - 'UA' | 'WA' | 'MA'
 */
export function downloadAllExcel(links, mainCategory = 'UA') {
  if (links.length === 0) {
    alert('No links to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Combined "All" sheet
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(links, `${mainCategory} — All Links`),
    'All',
  );

  // Individual category sheets
  const categories = [
    { label: 'Shopee', filter: (l) => l.category === 'shopee' },
    { label: 'Lazada', filter: (l) => l.category === 'lazada' },
    { label: 'TikTok', filter: (l) => l.category === 'tiktok' },
    { label: 'Amazon', filter: (l) => l.category === 'amazon' },
    {
      label: 'Other',
      filter: (l) =>
        !['shopee', 'lazada', 'tiktok', 'amazon'].includes(l.category),
    },
  ];

  for (const cat of categories) {
    const subset = links.filter(cat.filter);
    if (subset.length === 0) continue;
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(subset, `${mainCategory} — ${cat.label} Links`),
      cat.label,
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${mainCategory}_All_Links_${date}.xlsx`);
}
