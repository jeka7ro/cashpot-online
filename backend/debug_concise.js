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
        console.log('🔍 Searching for user "Valentina"...')
        const userResult = await pool.query("SELECT id, username, preferences FROM users WHERE username ILIKE '%Valentina%' OR full_name ILIKE '%Valentina%'")

        if (userResult.rows.length === 0) {
            console.log('❌ User not found.')
        } else {
            const user = userResult.rows[0]
            console.log('✅ User:', user.username, '(ID:', user.id, ')')
            if (user.preferences && user.preferences.expendituresSettings) {
                console.log('👤 Preferences Keys:', Object.keys(user.preferences.expendituresSettings))
                const settings = user.preferences.expendituresSettings
                console.log('   - includedDepartments:', settings.includedDepartments ? settings.includedDepartments.length : 'MISSING')
                console.log('   - includedExpenditureTypes:', settings.includedExpenditureTypes ? settings.includedExpenditureTypes.length : 'MISSING')
                console.log('   - includedTypes:', settings.includedTypes ? settings.includedTypes.length : 'MISSING')
            } else {
                console.log('👤 User has NO expendituresSettings')
            }
        }

        console.log('\n🌍 Checking Global Settings...')
        const globalResult = await pool.query("SELECT setting_value FROM global_settings WHERE setting_key = 'expenditures_sync_config'")
        if (globalResult.rows.length > 0) {
            const globalConfig = globalResult.rows[0].setting_value
            const parsed = typeof globalConfig === 'string' ? JSON.parse(globalConfig) : globalConfig
            console.log('✅ Global Config Keys:', Object.keys(parsed))
            console.log('   - includedDepartments:', parsed.includedDepartments ? parsed.includedDepartments.length : 'MISSING')
            console.log('   - includedExpenditureTypes:', parsed.includedExpenditureTypes ? parsed.includedExpenditureTypes.length : 'MISSING')
        } else {
            console.log('❌ Global settings not found')
        }

    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

debug()
