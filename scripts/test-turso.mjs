import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://links-crzycute.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkzMzI1NjgsImlkIjoiMDFhMDljMjQtNzkwMS03M2Q3LWEwYjktYmY4NDM1MjVmNDhlIiwia2lkIjoiVHBhNm1RSTNYTE9RS0l0aGY0eHFwUzZqWlpiWFdIZkdlbVJJNmN3YkhLZyIsInJpZCI6IjA3YzBkMjgyLTExNWEtNDBkZi1iM2I5LTRlMGI5YzQ3ZWYzYiJ9.jxT2wYGdthfk_7Ks8-ZW_1upBjsznlG9RMN9p8Z2LPvfaB5Z52f6bh8Y59NCABBMD5eqMz7d9Vkef0QTQuXRBw'
});

async function main() {
  try {
    console.log('Connecting to Turso...');
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log('Tables in database:', tables.rows);

    const hasLinks = tables.rows.some(r => r.name === 'links');
    if (!hasLinks) {
      console.log('Table links does not exist. Creating now...');
      await client.execute(`
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
      `);
      console.log('Table created successfully!');
    }

    const rows = await client.execute('SELECT * FROM links;');
    console.log('Total links in Turso:', rows.rows.length);
    console.log('Links rows:', rows.rows);
  } catch (err) {
    console.error('Turso error:', err);
  }
}

main();
