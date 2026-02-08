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
        const userResult = await pool.query("SELECT id, username, role FROM users WHERE username ILIKE '%Valentina%' OR full_name ILIKE '%Valentina%'")

        if (userResult.rows.length === 0) {
            console.log('❌ User not found.')
        } else {
            const user = userResult.rows[0]
            console.log('✅ User:', user.username, '(ID:', user.id, ')')
            console.log('🔑 Role:', user.role) // <--- CRITICAL
        }
    } catch (err) {
        console.error('❌ Error:', err)
    } finally {
        pool.end()
    }
}

debug()
