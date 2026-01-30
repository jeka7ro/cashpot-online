
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot';

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function test() {
    try {
        console.log('--- Testing P&L SQL Logic ---');
        const startYear = 2025;
        const sql = `
        SELECT
          EXTRACT(YEAR FROM audit_date)::INTEGER AS year,
          EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
          location_id,
          COALESCE(SUM(profit), 0) AS total_ggr,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cb_real,
          COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
          COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date >= $1::date
        GROUP BY EXTRACT(YEAR FROM audit_date), EXTRACT(MONTH FROM audit_date), location_id
        ORDER BY year DESC, month DESC, location_id
      `;
        const params = [`${startYear}-01-01`];
        const result = await pool.query(sql, params);
        console.log(`Found ${result.rows.length} raw rows from DB`);
        if (result.rows.length > 0) {
            console.log('Sample row:', JSON.stringify(result.rows[0], null, 2));
        }

        console.log('--- Testing Mapping Logic ---');
        const loadExportedData = (filename) => {
            try {
                const filePath = path.join(__dirname, 'cyber-data', filename);
                if (fs.existsSync(filePath)) {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    return data;
                }
            } catch (error) { }
            return [];
        };

        const locationsData = loadExportedData('locations.json');
        console.log(`Loaded ${locationsData.length} locations`);

        const locationMap = new Map();
        locationsData.forEach((loc) => {
            if (loc && typeof loc.id !== 'undefined') {
                locationMap.set(String(loc.id), loc.name || loc.location || `Loc ${loc.id}`);
            }
        });

        const rows = result.rows.map((row) => {
            const locationId = row.location_id;
            const key = locationId === null || typeof locationId === 'undefined' ? null : String(locationId);
            const locationName = key ? locationMap.get(key) || `Loc ${key}` : 'Nesetat';
            return {
                year: parseInt(row.year),
                month: parseInt(row.month),
                locationId,
                locationName,
                totalGgr: Number(row.total_ggr || 0),
            };
        });

        const responseData = {
            success: true,
            rows
        };

        console.log('--- Testing Cache Save Logic ---');
        const cacheKey = 'test_cache_key_' + Date.now();
        await pool.query(`
            INSERT INTO incasari_monthly_cache (cache_key, data, created_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (cache_key) 
            DO UPDATE SET data = $2, created_at = NOW()
        `, [cacheKey, responseData]);
        console.log('✅ Cache save successful');

        const cacheCheck = await pool.query('SELECT LENGTH(data::text) FROM incasari_monthly_cache WHERE cache_key = $1', [cacheKey]);
        console.log('Cache entry length:', cacheCheck.rows[0].length);

    } catch (err) {
        console.error('❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

test();
