import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import StorePage from './pages/StorePage.jsx'

// Auto-register PWA service worker immediately for WebAPK minting on Android
registerSW({ immediate: true })

// Simple pathname router — /store is public, everything else is the private dashboard
const isStorePage = window.location.pathname === '/store' || window.location.pathname === '/store/'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isStorePage ? <StorePage /> : <App />}
  </StrictMode>,
)

