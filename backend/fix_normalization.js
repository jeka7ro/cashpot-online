import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') })

const { Pool } = pg

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function fixNormalization() {
    try {
        console.log('🛠 Starting normalization fix for auto-discounts...')

        // 1a. Update normalized_department_name to 'bar' for AUTO_DISCOUNT
        const res1 = await pool.query(`
      UPDATE expenditures_sync 
      SET normalized_department_name = 'bar' 
      WHERE data_source = 'auto_discount' 
      AND (normalized_department_name IS NULL OR normalized_department_name = '')
    `)
        console.log(`✅ Updated normalized_department_name (Bar) for ${res1.rowCount} auto-discount records.`)

        // 1b. Update normalized_department_name for GOOGLE_SHEETS (use actual department)
        const res1b = await pool.query(`
      UPDATE expenditures_sync 
      SET normalized_department_name = lower(department_name)
      WHERE data_source = 'google_sheets' 
      AND (normalized_department_name IS NULL OR normalized_department_name = '')
    `)
        console.log(`✅ Updated normalized_department_name for ${res1b.rowCount} Google Sheets records.`)

        // 2a. Update normalized_expenditure_type to 'discount pepsi' for AUTO_DISCOUNT
        const res2 = await pool.query(`
      UPDATE expenditures_sync 
      SET normalized_expenditure_type = 'discount pepsi' 
      WHERE data_source = 'auto_discount' 
      AND (normalized_expenditure_type IS NULL OR normalized_expenditure_type = '')
    `)
        console.log(`✅ Updated normalized_expenditure_type (Pepsi) for ${res2.rowCount} auto-discount records.`)

        // 2b. Update normalized_expenditure_type for GOOGLE_SHEETS
        const res2b = await pool.query(`
      UPDATE expenditures_sync 
      SET normalized_expenditure_type = lower(expenditure_type)
      WHERE data_source = 'google_sheets' 
      AND (normalized_expenditure_type IS NULL OR normalized_expenditure_type = '')
    `)
        console.log(`✅ Updated normalized_expenditure_type for ${res2b.rowCount} Google Sheets records.`)

        // 3. Update normalized_location_name (simplified)
        const res3 = await pool.query(`
      UPDATE expenditures_sync 
      SET normalized_location_name = lower(location_name)
      WHERE data_source = 'auto_discount' 
      AND (normalized_location_name IS NULL OR normalized_location_name = '')
    `)
        console.log(`✅ Updated normalized_location_name for ${res3.rowCount} records.`)

    } catch (err) {
        console.error('❌ Error executing fix:', err)
    } finally {
        // Invalidate Cache for good measure
        try {
            await pool.query('DELETE FROM incasari_monthly_cache')
            console.log('🧹 Cache invalidated.')
        } catch (e) { }
        await pool.end()
    }
}

fixNormalization()
