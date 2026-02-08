import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') })

const { Pool } = pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
})

async function debug() {
    try {
        console.log('🔍 Searching for user "Valentina"...')
        const userResult = await pool.query("SELECT id, username, preferences FROM users WHERE username ILIKE '%Valentina%' OR full_name ILIKE '%Valentina%'")

        if (userResult.rows.length === 0) {
            console.log('❌ User Valentina not found.')
        } else {
            const user = userResult.rows[0]
            console.log('✅ Found User:', user.username, '(ID:', user.id, ')')
            console.log('👤 User Preferences Raw:', JSON.stringify(user.preferences, null, 2))
        }

        console.log('\n🌍 Checking Global Settings (expenditures_sync_config)...')
        const globalResult = await pool.query("SELECT setting_value FROM global_settings WHERE setting_key = 'expenditures_sync_config'")

        if (globalResult.rows.length === 0) {
            console.log('❌ Global settings not found!')
        } else {
            const globalConfig = globalResult.rows[0].setting_value
            const parsed = typeof globalConfig === 'string' ? JSON.parse(globalConfig) : globalConfig
            console.log('✅ Global Config Found:')
            console.log('   - Departments:', parsed.includedDepartments?.length || 0)
            console.log('   - Types:', parsed.includedExpenditureTypes?.length || 0)
            console.log('   - Raw keys:', Object.keys(parsed))
        }

    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

debug()
