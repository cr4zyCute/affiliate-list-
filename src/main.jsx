import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import StorePage from './pages/StorePage.jsx'
import PinLock from './components/PinLock.jsx'

// Auto-register PWA service worker immediately for WebAPK minting on Android
registerSW({ immediate: true })

// Routing:
//   /store              → public store page
//   /nikki-sixx-acosta  → private admin dashboard
//   /                   → redirect to /store
const path = window.location.pathname.replace(/\/+$/, '') || '/'

// Stash share-target parameters immediately so they are never lost across auth / redirects
if (path.startsWith('/share-target') && window.location.search) {
  try {
    sessionStorage.setItem('lv_pending_share', window.location.search);
  } catch (e) {}
}

if (path === '/') {
  // Redirect root visitors to the store
  window.location.replace('/store')
} else {
  const isAdmin = path === '/nikki-sixx-acosta' || path.startsWith('/share-target')
  const isStore = path === '/store'

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      {isAdmin ? <PinLock><App /></PinLock> : <StorePage />}
    </StrictMode>,
  )
}

