import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') })

const { Pool } = pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function fixLocationNormalization() {
    try {
        console.log('🛠 Starting Global Location Normalization Check...')

        // Check how many need fixing
        const checkRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM expenditures_sync 
        WHERE (normalized_location_name IS NULL OR normalized_location_name = '')
        AND location_name IS NOT NULL
    `)
        console.log(`found ${checkRes.rows[0].count} records with missing normalized_location_name`)

        if (parseInt(checkRes.rows[0].count) > 0) {
            const updateRes = await pool.query(`
          UPDATE expenditures_sync 
          SET normalized_location_name = lower(trim(location_name))
          WHERE (normalized_location_name IS NULL OR normalized_location_name = '')
          AND location_name IS NOT NULL
        `)
            console.log(`✅ Updated normalized_location_name for ${updateRes.rowCount} records.`)

            // Invalidate cache
            await pool.query('DELETE FROM incasari_monthly_cache')
            console.log('🧹 Cache invalidated.')
        } else {
            console.log('✅ No records need fixing.')
        }

    } catch (err) {
        console.error('❌ Error executing fix:', err)
    } finally {
        await pool.end()
    }
}

fixLocationNormalization()
