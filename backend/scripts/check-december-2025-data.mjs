/**
 * Script pentru verificarea datelor din decembrie 2025
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

async function checkDecember2025() {
  try {
    console.log('🔍 Verificare date decembrie 2025...\n')
    
    // Verifică datele din baza de date pentru decembrie 2025
    const dbResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        data_source,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
      WHERE operational_date >= '2025-12-01' 
        AND operational_date <= '2025-12-31'
      GROUP BY data_source
      ORDER BY data_source
    `)
    
    console.log('📊 Date în baza de date pentru decembrie 2025:')
    if (dbResult.rows.length === 0) {
      console.log('   ❌ NU EXISTĂ DATE pentru decembrie 2025!')
    } else {
      dbResult.rows.forEach(row => {
        console.log(`   ${row.data_source}: ${row.total} înregistrări`)
        console.log(`      Interval: ${row.min_date} - ${row.max_date}`)
      })
    }
    
    // Verifică datele cu "taxe" în decembrie 2025
    const taxesResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        expenditure_type,
        location_name,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE operational_date >= '2025-12-01' 
        AND operational_date <= '2025-12-31'
        AND (
          LOWER(expenditure_type) LIKE '%tax%' 
          OR LOWER(expenditure_type) LIKE '%impozit%'
          OR LOWER(expenditure_type) LIKE '%taxa%'
        )
      GROUP BY expenditure_type, location_name
      ORDER BY expenditure_type, location_name
    `)
    
    console.log('\n💰 Cheltuieli cu "taxe" în decembrie 2025:')
    if (taxesResult.rows.length === 0) {
      console.log('   ❌ NU EXISTĂ cheltuieli cu taxe pentru decembrie 2025!')
    } else {
      taxesResult.rows.forEach(row => {
        console.log(`   ${row.expenditure_type} - ${row.location_name}: ${row.total} înregistrări, Total: ${parseFloat(row.total_amount).toFixed(2)} RON`)
      })
    }
    
    // Verifică datele din Google Sheets (toate datele)
    const googleSheetsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
    `)
    
    console.log('\n📊 Date din Google Sheets (toate):')
    if (googleSheetsResult.rows.length > 0) {
      const row = googleSheetsResult.rows[0]
      console.log(`   Total: ${row.total} înregistrări`)
      console.log(`   Interval: ${row.min_date} - ${row.max_date}`)
    }
    
    // Verifică ultimele date importate din Google Sheets
    const lastGoogleSheetsResult = await pool.query(`
      SELECT 
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        synced_at
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
      ORDER BY operational_date DESC, synced_at DESC
      LIMIT 10
    `)
    
    console.log('\n📋 Ultimele 10 înregistrări din Google Sheets:')
    if (lastGoogleSheetsResult.rows.length === 0) {
      console.log('   ❌ NU EXISTĂ date din Google Sheets!')
    } else {
      lastGoogleSheetsResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.operational_date} - ${row.expenditure_type} - ${row.location_name}: ${parseFloat(row.amount).toFixed(2)} RON`)
      })
    }
    
    console.log('\n💡 Recomandare: Rulează importul manual pentru a aduce datele noi din Google Sheets')
    console.log('   node backend/scripts/import-all-expenditures-direct.mjs')
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

checkDecember2025()
