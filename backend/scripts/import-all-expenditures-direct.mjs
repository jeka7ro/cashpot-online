/**
 * Script pentru importul imediat al tuturor datelor de cheltuieli
 * Aduce datele noi din BAT, Google Sheets și Preferences
 * Folosește direct funcția de import, fără API
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { executeExpendituresImport } from '../routes/expenditures.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const { Pool } = pg

// Creează pool pentru baza de date locală
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function importAllExpenditures() {
  try {
    console.log('🔄 Pornire import TOATE datele de cheltuieli...\n')
    
    // Execută importul cu toate sursele activate
    console.log('📥 Import din toate sursele: BAT, Google Sheets, Preferences\n')
    
    await executeExpendituresImport(pool, {
      bat: true,
      googleSheets: true,
      preferences: true
    })
    
    console.log('\n✅ Import completat cu succes!')
    
    // Verifică câte înregistrări există acum
    const result = await pool.query('SELECT COUNT(*) as total FROM expenditures_sync')
    const total = parseInt(result.rows[0].total) || 0
    console.log(`📊 Total înregistrări în expenditures_sync: ${total}`)
    
    // Verifică pe surse
    const batResult = await pool.query(`SELECT COUNT(*) as total FROM expenditures_sync WHERE data_source = 'bat_sync'`)
    const googleResult = await pool.query(`SELECT COUNT(*) as total FROM expenditures_sync WHERE data_source = 'google_sheets'`)
    
    console.log(`   - BAT: ${batResult.rows[0].total}`)
    console.log(`   - Google Sheets: ${googleResult.rows[0].total}`)
    
  } catch (error) {
    console.error('❌ Eroare la import:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

importAllExpenditures()
