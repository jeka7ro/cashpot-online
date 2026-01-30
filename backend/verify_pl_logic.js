import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const normalizeLocationName = (name) => {
    if (!name) return ''
    let n = name.toString().trim()
    n = n.replace(/\s*E\.?\s*S\.?\s*$/i, '')
    n = n.replace(/\s*ES\s*$/i, '')
    return n.trim()
}

const loadExportedData = (filename) => {
    try {
        const filePath = path.join(__dirname, 'cyber-data', filename)
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            return data
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error.message)
    }
    return []
}

async function testMonthlyByLocation() {
    try {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 1;
        const startDate = `${startYear}-01-01`;

        console.log('--- Testing incasari_daily query ---');
        const sql = `
      SELECT
        EXTRACT(YEAR FROM audit_date)::INTEGER AS year,
        EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
        location_id,
        COALESCE(SUM(profit), 0) AS total_ggr,
        COUNT(DISTINCT serial_number) AS slots_count
      FROM incasari_daily
      WHERE audit_date >= $1::date
      GROUP BY EXTRACT(YEAR FROM audit_date), EXTRACT(MONTH FROM audit_date), location_id
      ORDER BY year DESC, month DESC, location_id
      LIMIT 10
    `;
        const result = await pool.query(sql, [startDate]);
        console.log(`Found ${result.rows.length} rows in incasari_daily query`);
        if (result.rows.length > 0) {
            console.log('Sample row:', result.rows[0]);
        }

        console.log('\n--- Testing expenditures_sync query ---');
        const expendituresSql = `
      SELECT
        EXTRACT(YEAR FROM operational_date)::INTEGER AS year,
        EXTRACT(MONTH FROM operational_date)::INTEGER AS month,
        location_name,
        COALESCE(SUM(amount), 0) AS total_expenditures
      FROM expenditures_sync
      WHERE operational_date IS NOT NULL
        AND operational_date >= $1::date
        AND location_name IS NOT NULL
        AND location_name != ''
      GROUP BY EXTRACT(YEAR FROM operational_date), EXTRACT(MONTH FROM operational_date), location_name
      LIMIT 10
    `;
        const expResult = await pool.query(expendituresSql, [startDate]);
        console.log(`Found ${expResult.rows.length} rows in expenditures_sync query`);
        if (expResult.rows.length > 0) {
            console.log('Sample row:', expResult.rows[0]);
        }

        console.log('\n--- Real-world test: 2025-2026 data exists? ---');
        const countSql = `SELECT COUNT(*) FROM incasari_daily WHERE audit_date >= '2025-01-01'`;
        const countRes = await pool.query(countSql);
        console.log(`Rows in incasari_daily since 2025-01-01: ${countRes.rows[0].count}`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

testMonthlyByLocation();
