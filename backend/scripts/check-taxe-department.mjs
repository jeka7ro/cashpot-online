/**
 * Script pentru verificarea departamentului "Taxe" în baza de date și setări
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

// Normalize diacritics (same as frontend)
const normalizeDiacritics = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț')
    .replace(/Ş/g, 'Ș')
    .trim()
}

async function checkTaxeDepartment() {
  try {
    console.log('🔍 Verificare departament "Taxe" în baza de date și setări...\n')
    
    // Verifică departamentul "Taxe" în expenditures_sync
    const taxeResult = await pool.query(`
      SELECT DISTINCT
        department_name,
        COUNT(*) as count,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
      WHERE LOWER(department_name) LIKE '%tax%'
         OR department_name = 'Taxe'
      GROUP BY department_name
      ORDER BY department_name
    `)
    
    console.log('📊 Departamente cu "tax" în nume:')
    if (taxeResult.rows.length === 0) {
      console.log('   ❌ NU EXISTĂ departamente cu "tax" în nume!')
    } else {
      taxeResult.rows.forEach(row => {
        console.log(`   - "${row.department_name}": ${row.count} înregistrări`)
        console.log(`     Interval: ${row.min_date} - ${row.max_date}`)
      })
    }
    
    // Verifică setările pentru utilizator (folosind id în loc de user_id)
    const settingsResult = await pool.query(`
      SELECT 
        id,
        preferences->'expenditures'->'includedDepartments' as included_departments
      FROM users
      WHERE preferences->'expenditures' IS NOT NULL
      ORDER BY id
    `)
    
    console.log('\n📋 Setări utilizatori (includedDepartments):')
    if (settingsResult.rows.length === 0) {
      console.log('   ⚠️ NU EXISTĂ setări pentru utilizatori!')
    } else {
      settingsResult.rows.forEach(row => {
        const depts = row.included_departments
        const hasTaxe = Array.isArray(depts) && depts.some(d => {
          const normalized = normalizeDiacritics((d || '').toLowerCase().trim())
          return normalized === 'taxe' || normalized.includes('tax')
        })
        console.log(`   User ${row.id}:`)
        console.log(`     Total departamente incluse: ${Array.isArray(depts) ? depts.length : 0}`)
        console.log(`     "Taxe" inclus: ${hasTaxe ? '✅' : '❌'}`)
        if (Array.isArray(depts) && depts.length > 0) {
          console.log(`     Primele 5: ${depts.slice(0, 5).join(', ')}`)
        }
      })
    }
    
    // Verifică toate departamentele unice din baza de date
    const allDeptsResult = await pool.query(`
      SELECT DISTINCT department_name
      FROM expenditures_sync
      WHERE department_name IS NOT NULL
        AND department_name != ''
        AND department_name != 'Unknown'
      ORDER BY department_name
    `)
    
    console.log(`\n📊 Toate departamentele din baza de date (${allDeptsResult.rows.length}):`)
    allDeptsResult.rows.forEach((row, index) => {
      const normalized = normalizeDiacritics((row.department_name || '').toLowerCase().trim())
      const isTaxe = normalized === 'taxe' || normalized.includes('tax')
      console.log(`   ${index + 1}. "${row.department_name}" ${isTaxe ? '✅ (TAXE!)' : ''}`)
    })
    
    // Verifică dacă există date cu departamentul exact "Taxe"
    const exactTaxeResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM expenditures_sync
      WHERE department_name = 'Taxe'
    `)
    
    console.log(`\n💰 Înregistrări cu departamentul exact "Taxe": ${exactTaxeResult.rows[0].count}`)
    
    // Verifică pentru decembrie 2025
    const decTaxeResult = await pool.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM expenditures_sync
      WHERE department_name = 'Taxe'
        AND operational_date >= '2025-12-01'
        AND operational_date <= '2025-12-31'
    `)
    
    console.log(`💰 Înregistrări "Taxe" pentru decembrie 2025: ${decTaxeResult.rows[0].count}`)
    console.log(`   Total: ${parseFloat(decTaxeResult.rows[0].total || 0).toFixed(2)} RON`)
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

checkTaxeDepartment()
