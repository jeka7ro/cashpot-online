
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env (assuming we run from backend/ dir or referencing relative)
// process.cwd() is expected to be backend/
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

console.log('🔌 Connecting to DB...');
// Use SSL if indicated by check_indexes.cjs success, logic mostly based on previous success
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const normalizeText = (text) => {
    if (!text) return '';
    return String(text).trim()
        .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD') // splits chars (e.g. ă -> a + ˘)
        .replace(/[\u0300-\u036f]/g, '') // removes diacritics
        .toLowerCase();
};

async function main() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Optimization Script...');

        // 1. BACKUP (Safety First)
        console.log('💾 Creating backup table expenditures_sync_backup...');
        await client.query('CREATE TABLE IF NOT EXISTS expenditures_sync_backup AS SELECT * FROM expenditures_sync');

        // 2. ADD COLUMNS
        console.log('📋 Adding normalized columns to expenditures_sync...');
        await client.query(`
      ALTER TABLE expenditures_sync 
      ADD COLUMN IF NOT EXISTS normalized_location_name TEXT,
      ADD COLUMN IF NOT EXISTS normalized_department_name TEXT,
      ADD COLUMN IF NOT EXISTS normalized_expenditure_type TEXT;
    `);

        // 3. BACKFILL
        console.log('📦 Fetching rows for backfill (where normalized is null)...');
        const res = await client.query(`
      SELECT id, location_name, department_name, expenditure_type 
      FROM expenditures_sync
      WHERE normalized_location_name IS NULL
    `);
        console.log(`Processing ${res.rowCount} rows...`);

        let count = 0;
        for (const row of res.rows) {
            const normLoc = normalizeText(row.location_name);
            const normDept = normalizeText(row.department_name);
            const normType = normalizeText(row.expenditure_type);

            await client.query(`
        UPDATE expenditures_sync 
        SET 
          normalized_location_name = $1,
          normalized_department_name = $2,
          normalized_expenditure_type = $3
        WHERE id = $4
      `, [normLoc, normDept, normType, row.id]);

            count++;
            if (count % 5000 === 0) console.log(`Processed ${count} rows...`);
        }
        console.log('\n✅ Backfill complete.');

        // 4. INDEXES
        console.log('⚡ Creating indexes on expenditures_sync...');
        await client.query(`
        CREATE INDEX IF NOT EXISTS idx_exp_sync_norm_loc ON expenditures_sync(normalized_location_name);
        CREATE INDEX IF NOT EXISTS idx_exp_sync_norm_dept ON expenditures_sync(normalized_department_name);
        CREATE INDEX IF NOT EXISTS idx_exp_sync_norm_type ON expenditures_sync(normalized_expenditure_type);
    `);

        // 5. INCASARI CACHE TABLE
        console.log('📊 Creating incasari_monthly_cache table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS incasari_monthly_cache (
        id SERIAL PRIMARY KEY,
        cache_key TEXT UNIQUE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_incasari_cache_key ON incasari_monthly_cache(cache_key);
    `);

        // 6. ANALYZE
        console.log('🧹 Running VACUUM ANALYZE...');
        await client.query('VACUUM ANALYZE expenditures_sync;');

        console.log('✅ Database optimization finished successfully!');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main();
