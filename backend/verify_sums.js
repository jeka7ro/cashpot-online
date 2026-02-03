import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') })

const { Pool } = pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function verifySums() {
    try {
        console.log('🔍 Verifying Expenses for FULL YEAR 2025...')
        const start = '2025-01-01'
        const end = '2025-12-31'

        const targetLocations = ['pitesti', 'valcea', 'craiova', 'ploiesti (centru)', 'ploiesti (nord)']

        // 1. RAW TOTAL (Filtered by Location)
        const rawRes = await pool.query(`
      SELECT SUM(amount) as total, COUNT(*) as count 
      FROM expenditures_sync 
      WHERE operational_date BETWEEN $1 AND $2
      AND lower(location_name) = ANY($3::text[])
    `, [start, end, targetLocations])
        console.log(`\n💰 RAW TOTAL (Filtered Locations): ${rawRes.rows[0].total} RON (${rawRes.rows[0].count} records)`)

        // 2. BREAKDOWN BY DEPT (for these locations)
        const deptRes = await pool.query(`
        SELECT normalized_department_name, SUM(amount) as total
        FROM expenditures_sync
        WHERE operational_date BETWEEN $1 AND $2
        AND lower(location_name) = ANY($3::text[])
        GROUP BY normalized_department_name
    `, [start, end, targetLocations])
        console.log('\n🏢 BY DEPT (Filtered):')
        deptRes.rows.forEach(r => console.log(`   - ${r.normalized_department_name}: ${r.total}`))

        // 3. BREAKDOWN BY SOURCE (for these locations)
        const sourceRes = await pool.query(`
        SELECT data_source, SUM(amount) as total
        FROM expenditures_sync
        WHERE operational_date BETWEEN $1 AND $2
        AND lower(location_name) = ANY($3::text[])
        GROUP BY data_source
    `, [start, end, targetLocations])
        console.log('\n📊 BY SOURCE (Filtered):')
        sourceRes.rows.forEach(r => console.log(`   - ${r.data_source}: ${r.total}`))

        // 5. BREAKDOWN BY LOCATION
        const locRes = await pool.query(`
        SELECT normalized_location_name, SUM(amount) as total
        FROM expenditures_sync
        WHERE operational_date BETWEEN $1 AND $2
        AND lower(location_name) = ANY($3::text[])
        GROUP BY normalized_location_name
    `, [start, end, targetLocations])
        console.log('\n📍 BY LOCATION (Filtered List):')
        locRes.rows.forEach(r => console.log(`   - ${r.normalized_location_name}: ${r.total}`))

        // 4. SIMULATE P&L QUERY (The one currently in incasari.js)
        // We try to mimic the filters: 
        // AND (data_source = 'auto_discount' OR data_source = 'google_sheets' OR normalized_department_name = ANY(...))
        // Let's count how many satisfy the "Catch-All" logic I added.
        const pnlSimRes = await pool.query(`
        SELECT SUM(amount) as total
        FROM expenditures_sync
        WHERE operational_date BETWEEN $1 AND $2
        AND location_name IS NOT NULL AND location_name != ''
        -- UPDATED LOGIC: Include everything, do not exclude unknown
        -- AND (
        --    data_source = 'auto_discount' 
        --    OR data_source = 'google_sheets' 
        --    OR (normalized_department_name IS NOT NULL AND normalized_department_name != 'unknown' AND normalized_department_name != 'null')
        -- )
    `, [start, end])
        console.log(`\n📉 P&L QUERY SIMULATION: ${pnlSimRes.rows[0].total} RON`)

        const diff = Number(rawRes.rows[0].total) - Number(pnlSimRes.rows[0].total)
        // 6. INSPECT NULL LOCATIONS
        const nullLocRes = await pool.query(`
        SELECT id, amount, location_name, department_name, data_source, description
        FROM expenditures_sync
        WHERE operational_date BETWEEN $1 AND $2
        AND (location_name IS NULL OR location_name = '')
        LIMIT 10
    `, [start, end])
        console.log('\n👻 NULL LOCATION RECORDS:')
        nullLocRes.rows.forEach(r => console.log(r))

        // 5. Check 'Type' distribution for filtered items
        if (Math.abs(diff) > 1) {
            console.log('\n🕵️‍♀️ MISSING RECORDS ANALYSIS (Records excluded by P&L Logic):')
            const missingRes = await pool.query(`
        SELECT id, amount, location_name, department_name, data_source, normalized_department_name
        FROM expenditures_sync
        WHERE operational_date BETWEEN $1 AND $2
        AND NOT (
            (location_name IS NOT NULL AND location_name != '')
            AND (
                data_source = 'auto_discount' 
                OR data_source = 'google_sheets' 
                OR (normalized_department_name IS NOT NULL AND normalized_department_name != 'unknown' AND normalized_department_name != 'null')
            )
        )
        LIMIT 10
       `, [start, end])
            missingRes.rows.forEach(r => console.log(r))
        }

    } catch (err) {
        console.error(err)
    } finally {
        pool.end()
    }
}

verifySums()
