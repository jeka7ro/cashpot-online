/**
 * Script pentru crearea unei reguli zilnice de import automat
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function createDailyRule() {
  try {
    console.log('🔄 Creare regulă zilnică pentru import automat...\n')
    
    // Verifică dacă există deja o regulă zilnică activă
    const existingResult = await pool.query(`
      SELECT * FROM expenditures_backup_rules
      WHERE schedule_type = 'daily' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `)
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0]
      console.log('⚠️ Există deja o regulă zilnică activă:')
      console.log(`   ID: ${existing.id}`)
      console.log(`   Nume: ${existing.name}`)
      console.log(`   Ora: ${existing.schedule_time}`)
      console.log(`   Creată: ${existing.created_at}`)
      console.log('\n💡 Pentru a crea o regulă nouă, dezactivează mai întâi cea existentă sau șterge-o.')
      return
    }
    
    // Creează regula zilnică la 02:00 (2 dimineața)
    const result = await pool.query(`
      INSERT INTO expenditures_backup_rules (
        name,
        schedule_type,
        schedule_time,
        is_active,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      'Import zilnic cheltuieli',
      'daily',
      '02:00', // 2 dimineața
      true,
      1 // Admin user
    ])
    
    const rule = result.rows[0]
    
    console.log('✅ Regulă zilnică creată cu succes!')
    console.log(`   ID: ${rule.id}`)
    console.log(`   Nume: ${rule.name}`)
    console.log(`   Tip: ${rule.schedule_type}`)
    console.log(`   Ora: ${rule.schedule_time}`)
    console.log(`   Activă: ${rule.is_active ? '✅' : '❌'}`)
    console.log(`\n📅 Importul va rula automat zilnic la ${rule.schedule_time}`)
    console.log('   Scheduler-ul verifică la fiecare minut dacă este timpul pentru import.')
    console.log('\n💡 Pentru a schimba ora, folosește:')
    console.log('   PUT /api/expenditures/backup-rules/' + rule.id)
    console.log('   Body: { "schedule_time": "03:00" }')
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createDailyRule()
