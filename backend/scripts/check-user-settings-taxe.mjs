/**
 * Script pentru verificarea setărilor utilizatorului pentru departamentul "Taxe"
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

// Normalize diacritics (same as backend/frontend)
const normalizeDiacritics = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț')
    .replace(/Ş/g, 'Ș')
    .trim()
}

async function checkUserSettings() {
  try {
    console.log('🔍 Verificare setări utilizatori pentru departamentul "Taxe"...\n')
    
    // Verifică toți utilizatorii
    const usersResult = await pool.query(`
      SELECT 
        id,
        username,
        preferences->'expendituresSettings'->'includedDepartments' as included_departments,
        preferences->'expendituresSettings' as all_settings
      FROM users
      ORDER BY id
    `)
    
    console.log(`📋 Utilizatori găsiți: ${usersResult.rows.length}\n`)
    
    usersResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. User ID: ${row.id}, Username: ${row.username || 'N/A'}`)
      
      const depts = row.included_departments
      const allSettings = row.all_settings
      
      if (!allSettings) {
        console.log('   ⚠️ NU EXISTĂ setări expendituresSettings!')
        console.log('   💡 Utilizatorul va vedea TOATE departamentele (default)')
      } else {
        if (Array.isArray(depts)) {
          console.log(`   📊 Departamente incluse: ${depts.length}`)
          
          // Verifică dacă "Taxe" este inclus
          const hasTaxe = depts.some(d => {
            const normalized = normalizeDiacritics((d || '').toLowerCase().trim())
            return normalized === 'taxe'
          })
          
          console.log(`   ✅ "Taxe" inclus: ${hasTaxe ? 'DA' : 'NU'}`)
          
          if (hasTaxe) {
            const taxeIndex = depts.findIndex(d => {
              const normalized = normalizeDiacritics((d || '').toLowerCase().trim())
              return normalized === 'taxe'
            })
            console.log(`   📍 Poziția "Taxe" în listă: ${taxeIndex + 1}`)
            console.log(`   📝 Valoarea exactă: "${depts[taxeIndex]}"`)
          } else {
            console.log('   ❌ PROBLEMA: "Taxe" NU este inclus în lista de departamente!')
            console.log('   💡 Soluție: Bifează "Taxe" în Setări → Departamente')
            
            // Arată primele 10 departamente pentru referință
            if (depts.length > 0) {
              console.log(`   📋 Primele 10 departamente din listă: ${depts.slice(0, 10).join(', ')}`)
            }
          }
        } else {
          console.log('   ⚠️ includedDepartments nu este un array!')
          console.log('   💡 Utilizatorul va vedea TOATE departamentele (default)')
        }
      }
      console.log('')
    })
    
    // Verifică dacă există date cu "Taxe" care ar trebui să apară
    const taxeDataResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM expenditures_sync
      WHERE department_name = 'Taxe'
        AND operational_date >= '2025-12-01'
        AND operational_date <= '2025-12-31'
    `)
    
    console.log(`\n💰 Date "Taxe" pentru decembrie 2025 în baza de date: ${taxeDataResult.rows[0].count} înregistrări`)
    console.log('   Aceste date AR TREBUI să apară dacă "Taxe" este inclus în setări!')
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

checkUserSettings()
