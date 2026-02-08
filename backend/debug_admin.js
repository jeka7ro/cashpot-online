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
        console.log('🔍 Searching for ADMIN user (id=1)...')
        const adminResult = await pool.query("SELECT id, username, preferences FROM users WHERE id = 1")

        if (adminResult.rows.length === 0) {
            console.log('❌ Admin not found.')
        } else {
            const admin = adminResult.rows[0]
            console.log('✅ Found Admin:', admin.username, '(ID:', admin.id, ')')
            if (admin.preferences && admin.preferences.expendituresSettings) {
                const settings = admin.preferences.expendituresSettings
                console.log('👤 Admin Preferences:')
                console.log('   - includedDepartments count:', settings.includedDepartments ? settings.includedDepartments.length : 'MISSING')
                console.log('   - includedExpenditureTypes count:', settings.includedExpenditureTypes ? settings.includedExpenditureTypes.length : 'MISSING')

                if (settings.includedDepartments) {
                    console.log('   - Admin Department Selection:', JSON.stringify(settings.includedDepartments))
                }
            } else {
                console.log('👤 Admin has NO expendituresSettings')
            }
        }

        console.log('\n🌍 Checking Global Settings (expenditures_sync_config)...')
        const globalResult = await pool.query("SELECT setting_value FROM global_settings WHERE setting_key = 'expenditures_sync_config'")
        if (globalResult.rows.length > 0) {
            const globalConfig = globalResult.rows[0].setting_value
            const parsed = typeof globalConfig === 'string' ? JSON.parse(globalConfig) : globalConfig
            console.log('✅ Global Config:')
            console.log('   - includedDepartments count:', parsed.includedDepartments ? parsed.includedDepartments.length : 'MISSING')
            console.log('   - includedExpenditureTypes count:', parsed.includedExpenditureTypes ? parsed.includedExpenditureTypes.length : 'MISSING')
        }

    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

debug()
