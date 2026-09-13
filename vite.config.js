import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

// Custom dev middleware plugin to bridge LinkVault Saver extension via pending-links.json
function extensionApiPlugin() {
  const pendingFile = path.resolve(process.cwd(), 'pending-links.json')

  // Helper to read pending links safely
  function readPendingLinks() {
    try {
      if (fs.existsSync(pendingFile)) {
        const raw = fs.readFileSync(pendingFile, 'utf8')
        return JSON.parse(raw) || []
      }
    } catch {
      // ignore
    }
    return []
  }

  // Helper to write pending links safely
  function writePendingLinks(links) {
    try {
      fs.writeFileSync(pendingFile, JSON.stringify(links, null, 2), 'utf8')
    } catch (e) {
      console.error('Failed to write pending-links.json:', e)
    }
  }

  return {
    name: 'linkvault-extension-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''

        // CORS headers for Chrome Extension and local requests
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        // POST /api/save-link: Extension saves product link
        if (req.method === 'POST' && url === '/api/save-link') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              const existing = readPendingLinks()
              existing.push({
                ...data,
                id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                createdAt: data.createdAt || new Date().toISOString(),
              })
              writePendingLinks(existing)

              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(JSON.stringify({ success: true, count: existing.length }))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid JSON' }))
            }
          })
          return
        }

        // GET /api/pending-links: App reads pending links and clears the file
        if (req.method === 'GET' && url === '/api/pending-links') {
          const links = readPendingLinks()
          writePendingLinks([]) // clear pending list
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify({ success: true, links }))
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    extensionApiPlugin(),
    // CHANGED: Added VitePWA with Web Share Target for Android share sheet integration
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LinkVault',
        short_name: 'LinkVault',
        description: 'Save affiliate links from Shopee and TikTok',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // THIS is what makes it appear in the Android share sheet
        share_target: {
          action: '/share-target',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
    }),
  ],
  server: {
    proxy: {
      '/api/tiktok': 'http://localhost:3000',
      '/api/shopee': 'http://localhost:3000',
    },
  },
})
