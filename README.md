# LinkVault — Visual Link Bookmarking & Preview Dashboard

A full-featured, modern web application built with **Vite + React** for pasting, validating, previewing, and managing links with automatic Open Graph metadata generation and `localStorage` persistence.

---

## Features

1. **Smart Link Input & Validation**:
   - Clean, prominent input field with `Paste a link here...` placeholder.
   - Enter key and Add button submission.
   - Intelligent URL normalization (automatically handles inputs like `github.com` or `youtube.com/watch...`).
   - Strict validation preventing invalid URLs and duplicate links with inline alert notifications.
   - One-click clipboard paste button.

2. **Automatic Rich Previews (Open Graph)**:
   - Fetches live Open Graph metadata (title, description, banner image, favicon, domain).
   - Dynamic fallback engine: If an external site doesn't have an OG image or blocks hotlinking, displays a branded gradient badge with site favicon/monogram.
   - Layout is strictly preserved—external images and long titles never break alignment.

3. **Link Management**:
   - **Clickable Cards**: Clicking anywhere on the card opens the website in a new tab (`target="_blank" rel="noopener noreferrer"`).
   - **Copy Link**: One-click URL copy with animated feedback.
   - **Delete**: Remove individual links with confirmation.
   - **Clear All**: Confirmation modal to prevent accidental data loss.
   - **Search & Filter**: Real-time filtering by title, domain, or URL.
   - **Local Storage Persistence**: Links persist across page reloads in `localStorage`.
   - **Sample Links**: Built-in sample loader to test rich cards with popular websites.

4. **Modern, Polished UI**:
   - Curated dark theme with slate/indigo tones, glassmorphism (`backdrop-filter: blur()`), glowing accents, and responsive card layouts.
   - Smooth micro-animations and loading skeleton state when fetching link metadata.
   - Fully responsive on desktop, tablet, and mobile devices.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```

---

## Tech Stack
- **Framework**: Vite + React 19
- **Icons**: Lucide React
- **Styling**: Modern Vanilla CSS with CSS Custom Properties, Glassmorphism, and Flexbox/Grid
- **Metadata**: Microlink API + Google Favicons + Domain fallback engine
- **Storage**: Browser LocalStorage API
