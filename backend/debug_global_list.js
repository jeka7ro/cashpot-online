import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const { Pool } = pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
})

async function debug() {
    try {
        console.log('\n🌍 Checking Global Settings List...')
        const globalResult = await pool.query("SELECT setting_value FROM global_settings WHERE setting_key = 'expenditures_sync_config'")
        if (globalResult.rows.length > 0) {
            const globalConfig = globalResult.rows[0].setting_value
            const parsed = typeof globalConfig === 'string' ? JSON.parse(globalConfig) : globalConfig

            console.log('✅ Global Included Departments (' + (parsed.includedDepartments?.length || 0) + '):')
            console.log(JSON.stringify(parsed.includedDepartments, null, 2))
        }
    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

debug()
