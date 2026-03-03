import mysql from 'mysql2/promise'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '.env') })

const pool = await mysql.createPool({
    host: process.env.CYBER_DB_HOST,
    port: process.env.CYBER_DB_PORT || 3306,
    user: process.env.CYBER_DB_USER,
    password: process.env.CYBER_DB_PASSWORD,
    database: 'cyberslot_dbn',
    waitForConnections: true,
    connectionLimit: 5,
})

try {
    const [cols] = await pool.query(`DESCRIBE cyberslot_dbn.machine_types`)
    console.log('\n=== COLUMNS in machine_types ===')
    cols.forEach(c => console.log(`  ${c.Field}  (${c.Type})`))

    const [sample] = await pool.query(`SELECT * FROM cyberslot_dbn.machine_types LIMIT 3`)
    console.log('\n=== SAMPLE rows ===')
    sample.forEach(r => console.log(JSON.stringify(r)))
} catch (e) {
    console.error('ERROR:', e.message)
}

try {
    const [mas] = await pool.query(`DESCRIBE cyberslot_dbn.machine_audit_summaries LIMIT 1`)
    console.log('\n=== COLUMNS in machine_audit_summaries (first 10) ===')
    mas.slice(0, 10).forEach(c => console.log(`  ${c.Field}  (${c.Type})`))
} catch (e) {
    console.error('MAS ERROR:', e.message)
}

await pool.end()
