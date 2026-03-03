import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '.env') })

const slots = JSON.parse(readFileSync(join(__dirname, 'cyber-data/slots.json'), 'utf8'))

// Ce machine_ids apar in Cyber pentru Pitesti (simulam din PostgreSQL)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } })

const r = await pool.query(`
  SELECT DISTINCT machine_id FROM incasari_daily WHERE location_id=1 AND audit_date='2026-02-20' LIMIT 10
`)
const machineIds = r.rows.map(x => x.machine_id)
console.log('machine_ids din incasari_daily pentru Pitesti:', machineIds)

// Cauta aceste machine_id in slots.json (prin slot.id)
machineIds.forEach(mid => {
    const found = slots.find(s => Number(s.id) === Number(mid))
    console.log(`  machine_id=${mid} → slot:`, found
        ? `id=${found.id} serial=${found.serial_number} provider=${found.provider} mix=${found.game_mix}`
        : 'NOT FOUND in slots.json')
})

await pool.end()
