
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
    ssl: { rejectUnauthorized: false },
    max: 10
});

const normalizeText = (text) => {
    if (!text) return '';
    return String(text).trim()
        .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

async function main() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting BULK Optimization...');

        // 1. Fetch ALL remaining rows
        console.log('📦 Fetching rows to process...');
        const res = await client.query(`
      SELECT id, location_name, department_name, expenditure_type 
      FROM expenditures_sync
      WHERE normalized_location_name IS NULL
    `);

        const total = res.rows.length;
        console.log(`⚡ Found ${total} rows to process. Preparing batches...`);

        if (total === 0) {
            console.log('✅ Nothing to do!');
            return;
        }

        // 2. Process in Batches of 2000
        const BATCH_SIZE = 2000;
        let processed = 0;

        const chunks = [];
        for (let i = 0; i < total; i += BATCH_SIZE) {
            chunks.push(res.rows.slice(i, i + BATCH_SIZE));
        }

        console.log(`🔄 Processing ${chunks.length} batches...`);

        for (const [index, chunk] of chunks.entries()) {
            const values = [];
            const params = [];
            let pIdx = 1;

            chunk.forEach(row => {
                const normLoc = normalizeText(row.location_name);
                const normDept = normalizeText(row.department_name);
                const normType = normalizeText(row.expenditure_type);

                values.push(`($${pIdx++}::int, $${pIdx++}::text, $${pIdx++}::text, $${pIdx++}::text)`);
                params.push(row.id, normLoc, normDept, normType);
            });

            const query = `
        UPDATE expenditures_sync AS t 
        SET 
          normalized_location_name = v.nl,
          normalized_department_name = v.nd,
          normalized_expenditure_type = v.nt
        FROM (VALUES ${values.join(',')}) AS v(id, nl, nd, nt)
        WHERE t.id = v.id
      `;

            await client.query(query, params);
            processed += chunk.length;
            console.log(`✅ Batch ${index + 1}/${chunks.length} done. (${processed}/${total})`);
        }

        console.log('🎉 Bulk update complete!');

        // Ensure indexes exist (idempotent)
        await client.query(`
        CREATE INDEX IF NOT EXISTS idx_exp_sync_norm_loc ON expenditures_sync(normalized_location_name);
        CREATE INDEX IF NOT EXISTS idx_exp_sync_norm_dept ON expenditures_sync(normalized_department_name);
        CREATE INDEX IF NOT EXISTS idx_exp_sync_norm_type ON expenditures_sync(normalized_expenditure_type);
    `);

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main();
