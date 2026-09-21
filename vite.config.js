import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

// Custom dev middleware plugin to bridge LinkVault Saver extension via pending-links.json
function extensionApiPlugin(env) {
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

        // GET /api/store: Public Amazon store — query Turso directly in dev
        if (req.method === 'GET' && url === '/api/store') {
          const dbUrl = env.TURSO_DATABASE_URL || env.VITE_TURSO_DATABASE_URL
          const authToken = env.TURSO_AUTH_TOKEN || env.VITE_TURSO_AUTH_TOKEN

          if (!dbUrl || !authToken) {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Store database not configured.' }))
            return
          }

          ;(async () => {
            try {
              const tursoUrl = dbUrl.replace('libsql://', 'https://')
              const response = await fetch(`${tursoUrl}/v2/pipeline`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requests: [
                    {
                      type: 'execute',
                      stmt: {
                        sql: `SELECT id, url, domain, category, title, description, image, caption, affiliate_url, page_url, created_at
                              FROM links
                              WHERE (category = 'amazon' OR url LIKE '%amazon.%' OR url LIKE '%amzn.%')
                                AND (store_visible IS NULL OR store_visible = 1)
                              ORDER BY created_at DESC`,
                        args: [],
                      },
                    },
                    { type: 'close' },
                  ],
                }),
              })

              if (!response.ok) throw new Error(`Turso error: ${response.status}`)

              const data = await response.json()
              const rows = data?.results?.[0]?.response?.result?.rows ?? []
              const cols = data?.results?.[0]?.response?.result?.cols ?? []
              const colNames = cols.map((c) => c.name)

              const products = rows.map((row) => {
                const obj = {}
                colNames.forEach((col, i) => { obj[col] = row[i]?.value ?? null })
                return {
                  id: obj.id,
                  title: obj.title || 'Amazon Product',
                  description: obj.description || '',
                  caption: obj.caption || '',
                  image: obj.image || null,
                  url: obj.affiliate_url || obj.url,
                  pageUrl: obj.page_url || obj.url,
                  domain: obj.domain || 'amazon.com',
                  createdAt: obj.created_at,
                }
              })

              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
              res.statusCode = 200
              res.end(JSON.stringify({ products }))
            } catch (err) {
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message || 'Failed to load store products.' }))
            }
          })()
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars from .env.local (prefix '' = load everything, not just VITE_)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      extensionApiPlugin(env),
    // CHANGED: Added VitePWA with Web Share Target for Android share sheet integration
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'shopee-logo.png'],
      manifest: {
        id: '/',
        name: 'LinkVault',
        short_name: 'LinkVault',
        description: 'Save affiliate links from Shopee and TikTok',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/tiktok': 'http://localhost:3000',
      '/api/shopee': 'http://localhost:3000',
    },
  },
  }
})

