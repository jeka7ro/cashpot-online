import pg from 'pg'
import mysql from 'mysql2/promise'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })
dotenv.config({ path: join(__dirname, '.env') })

// Cyber pool
const cyberPool = await mysql.createPool({
    host: process.env.CYBER_DB_HOST,
    port: process.env.CYBER_DB_PORT || 3306,
    user: process.env.CYBER_DB_USER,
    password: process.env.CYBER_DB_PASSWORD,
    database: process.env.CYBER_DB_NAME || 'cyberslot_dbn',
    waitForConnections: true,
    connectionLimit: 5,
})

// location_id=1 este Pitesti
// Verificăm ce date are Cyber pentru locația 1 în feb 2026
const [rows] = await cyberPool.query(`
  SELECT 
    mas.machine_id,
    COALESCE(SUM(mas.in), 0) as total_in,
    COALESCE(SUM(mas.out), 0) as total_out,
    COALESCE(SUM(mas.in - mas.out), 0) as ggr,
    COALESCE(SUM(mas.bet), 0) as total_bet,
    COALESCE(SUM(mas.win), 0) as total_win,
    COUNT(*) as days_count
  FROM cyberslot_dbn.machine_audit_summaries mas
  WHERE mas.date >= '2026-02-01' AND mas.date <= '2026-02-27'
    AND mas.location_id = 1
  GROUP BY mas.machine_id
  ORDER BY total_in DESC
  LIMIT 5
`)

console.log('\n=== CYBER - Pitesti (location_id=1) - feb 2026 - primele 5 aparate ===')
rows.forEach(r => console.log(`  machine_id=${r.machine_id}  IN=${r.total_in}  OUT=${r.total_out}  GGR=${r.ggr}  BET=${r.total_bet}  WIN=${r.total_win}`))

// Total Cyber pentru Pitesti
const [totRows] = await cyberPool.query(`
  SELECT 
    mas.location_id,
    ROUND(COALESCE(SUM(mas.in), 0)) as total_in,
    ROUND(COALESCE(SUM(mas.out), 0)) as total_out,
    COUNT(DISTINCT mas.machine_id) as machines
  FROM cyberslot_dbn.machine_audit_summaries mas
  WHERE mas.date >= '2026-02-01' AND mas.date <= '2026-02-27'
  GROUP BY mas.location_id
  ORDER BY total_in DESC
  LIMIT 10
`)
console.log('\n=== CYBER - TOTAL per locatie - feb 2026 ===')
totRows.forEach(r => console.log(`  location_id=${r.location_id}  IN=${r.total_in}  OUT=${r.total_out}  aparate=${r.machines}`))

// Care location_id sumează la ~10.587.560?
const totalIn = totRows.reduce((s, r) => s + Number(r.total_in), 0)
console.log('\n=== TOTAL ALL LOCATIONS Cyber feb 2026 ===', 'IN=', totalIn)

// Structura unui rând din machine_audit_summaries
const [cols] = await cyberPool.query(`DESCRIBE cyberslot_dbn.machine_audit_summaries`)
console.log('\n=== COLUMNS machine_audit_summaries ===')
cols.forEach(c => console.log(' ', c.Field, c.Type))

await cyberPool.end()
