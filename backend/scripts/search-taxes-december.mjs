/**
 * Script pentru căutarea cheltuielilor cu taxe în decembrie 2025
 * Caută în toate câmpurile (tip, explicație, departament)
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

async function searchTaxes() {
  try {
    console.log('🔍 Căutare cheltuieli cu taxe în decembrie 2025...\n')
    
    // Caută în toate câmpurile pentru cuvinte legate de taxe
    const result = await pool.query(`
      SELECT 
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        description,
        data_source
      FROM expenditures_sync
      WHERE operational_date >= '2025-12-01' 
        AND operational_date <= '2025-12-31'
        AND (
          LOWER(expenditure_type) LIKE '%tax%' 
          OR LOWER(expenditure_type) LIKE '%impozit%'
          OR LOWER(expenditure_type) LIKE '%taxa%'
          OR LOWER(expenditure_type) LIKE '%contribut%'
          OR LOWER(description) LIKE '%tax%'
          OR LOWER(description) LIKE '%impozit%'
          OR LOWER(description) LIKE '%taxa%'
          OR LOWER(department_name) LIKE '%tax%'
        )
      ORDER BY operational_date DESC, amount DESC
    `)
    
    if (result.rows.length === 0) {
      console.log('❌ NU EXISTĂ cheltuieli cu taxe în baza de date pentru decembrie 2025!')
      console.log('\n💡 Verifică:')
      console.log('   1. Dacă tipul de cheltuială se numește altfel (ex: "Contribuții salariale")')
      console.log('   2. Dacă datele sunt în Google Sheets după 13 decembrie 2025')
      console.log('   3. Dacă datele au fost adăugate recent în Google Sheets')
    } else {
      console.log(`✅ Găsite ${result.rows.length} cheltuieli cu taxe:\n`)
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.operational_date} - ${row.expenditure_type}`)
        console.log(`   ${row.location_name} - ${row.department_name}: ${parseFloat(row.amount).toFixed(2)} RON`)
        if (row.description) {
          console.log(`   ${row.description}`)
        }
        console.log(`   Sursă: ${row.data_source}`)
        console.log('')
      })
    }
    
    // Verifică toate tipurile de cheltuieli pentru decembrie 2025
    const allTypesResult = await pool.query(`
      SELECT DISTINCT
        expenditure_type,
        COUNT(*) as count,
        SUM(amount) as total
      FROM expenditures_sync
      WHERE operational_date >= '2025-12-01' 
        AND operational_date <= '2025-12-31'
      GROUP BY expenditure_type
      ORDER BY expenditure_type
    `)
    
    console.log(`\n📊 Toate tipurile de cheltuieli în decembrie 2025 (${allTypesResult.rows.length} tipuri):`)
    allTypesResult.rows.forEach(row => {
      console.log(`   - ${row.expenditure_type}: ${row.count} înregistrări, Total: ${parseFloat(row.total).toFixed(2)} RON`)
    })
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

searchTaxes()
