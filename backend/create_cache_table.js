
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        console.log('📊 Creating incasari_monthly_cache table NOW...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS incasari_monthly_cache (
        id SERIAL PRIMARY KEY,
        cache_key TEXT UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_incasari_cache_key ON incasari_monthly_cache(cache_key);
    `);
        console.log('✅ Table created.');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
main();
