
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

async function check() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT COUNT(*) as completed FROM expenditures_sync WHERE normalized_location_name IS NOT NULL');
        const resTotal = await client.query('SELECT COUNT(*) as total FROM expenditures_sync');
        console.log(`Progress: ${res.rows[0].completed} / ${resTotal.rows[0].total} records normalized.`);
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
check();
