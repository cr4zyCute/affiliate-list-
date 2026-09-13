import { createClient } from '@libsql/client/web';
import { detectCategory } from '../services/metadataService';

const dbUrl = import.meta.env.VITE_TURSO_DATABASE_URL;
const dbToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

let initPromise = null;

/**
 * Returns an initialized LibSQL client or null if env credentials are unset.
 */
function getTursoClient() {
  if (!dbUrl || !dbToken || dbUrl.includes('your-database') || dbToken.includes('your-token')) {
    return null;
  }
  return createClient({
    url: dbUrl,
    authToken: dbToken,
  });
}

/**
 * Ensures the `links` table exists in Turso automatically.
 * Runs once on startup so manual SQL shell execution is not required.
 */
async function ensureTable(client) {
  if (!initPromise) {
    initPromise = client.execute(`
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        domain TEXT,
        category TEXT,
        title TEXT,
        description TEXT,
        image TEXT,
        favicon TEXT,
        created_at TEXT
      );
    `).catch((err) => {
      console.warn('Table auto-init notice:', err.message || err);
      // Reset so next query can retry if needed
      initPromise = null;
    });
  }
  return initPromise;
}

/**
 * Load all links from Turso database ordered by created_at DESC.
 * Returns array of clean link objects.
 */
export async function getAllLinks() {
  const client = getTursoClient();
  if (!client) {
    throw new Error('Turso credentials are not configured in environment variables.');
  }

  try {
    await ensureTable(client);

    const result = await client.execute({
      sql: 'SELECT id, url, domain, category, title, description, image, favicon, created_at FROM links ORDER BY created_at DESC',
      args: [],
    });

    return result.rows.map((row) => {
      const url = String(row.url || '');
      const autoCategory = detectCategory(url);
      const rawCategory = String(row.category || 'other');
      const category = rawCategory && rawCategory !== 'other' ? rawCategory : autoCategory;

      return {
        id: String(row.id || ''),
        url,
        domain: String(row.domain || ''),
        category,
        title: String(row.title || ''),
        description: String(row.description || ''),
        image: row.image ? String(row.image) : null,
        favicon: String(row.favicon || ''),
        createdAt: String(row.created_at || new Date().toISOString()),
        isLoading: false,
      };
    });
  } catch (error) {
    console.error('Turso [getAllLinks] error:', error);
    throw error;
  }
}

/**
 * Check if a URL already exists in Turso database.
 * Returns true if existing, false otherwise.
 */
export async function linkExists(url) {
  const client = getTursoClient();
  if (!client) {
    return false;
  }

  try {
    await ensureTable(client);

    const result = await client.execute({
      sql: 'SELECT id FROM links WHERE url = ? LIMIT 1',
      args: [url],
    });
    return result.rows.length > 0;
  } catch (error) {
    console.error('Turso [linkExists] error:', error);
    throw error;
  }
}

/**
 * Save a single link to Turso database.
 * Minimizes DB payload: excludes isLoading, strips UI-only fields, truncates text.
 */
export async function saveLink(link) {
  const client = getTursoClient();
  if (!client) {
    throw new Error('Turso credentials are not configured in environment variables.');
  }

  try {
    await ensureTable(client);

    const truncatedTitle = link.title ? String(link.title).slice(0, 500) : '';
    const truncatedDescription = link.description ? String(link.description).slice(0, 500) : '';
    const truncatedImage = link.image ? String(link.image).slice(0, 1000) : null;
    const createdAt = link.createdAt || new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO links (id, url, domain, category, title, description, image, favicon, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              url = excluded.url,
              domain = excluded.domain,
              category = excluded.category,
              title = excluded.title,
              description = excluded.description,
              image = excluded.image,
              favicon = excluded.favicon,
              created_at = excluded.created_at`,
      args: [
        link.id,
        link.url,
        link.domain || '',
        link.category || 'other',
        truncatedTitle,
        truncatedDescription,
        truncatedImage,
        link.favicon || '',
        createdAt,
      ],
    });

    return true;
  } catch (error) {
    console.error('Turso [saveLink] error:', error);
    throw error;
  }
}

/**
 * Delete a single link from Turso database by ID.
 */
export async function deleteLink(id) {
  const client = getTursoClient();
  if (!client) {
    throw new Error('Turso credentials are not configured in environment variables.');
  }

  try {
    await ensureTable(client);

    await client.execute({
      sql: 'DELETE FROM links WHERE id = ?',
      args: [id],
    });
    return true;
  } catch (error) {
    console.error('Turso [deleteLink] error:', error);
    throw error;
  }
}

/**
 * Update editable fields (title, description, image, category) of an existing link.
 */
export async function updateLink(id, { title, description, image, category }) {
  const client = getTursoClient();
  if (!client) {
    throw new Error('Turso credentials are not configured in environment variables.');
  }

  try {
    await ensureTable(client);

    const truncatedTitle = title ? String(title).slice(0, 500) : '';
    const truncatedDescription = description ? String(description).slice(0, 500) : '';
    const truncatedImage = image ? String(image).slice(0, 1000) : null;

    if (category) {
      await client.execute({
        sql: 'UPDATE links SET title = ?, description = ?, image = ?, category = ? WHERE id = ?',
        args: [truncatedTitle, truncatedDescription, truncatedImage, category, id],
      });
    } else {
      await client.execute({
        sql: 'UPDATE links SET title = ?, description = ?, image = ? WHERE id = ?',
        args: [truncatedTitle, truncatedDescription, truncatedImage, id],
      });
    }

    return true;
  } catch (error) {
    console.error('Turso [updateLink] error:', error);
    throw error;
  }
}
