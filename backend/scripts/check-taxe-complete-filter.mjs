/**
 * Script pentru verificarea completă a filtrării taxelor
 * Verifică departamentul "Taxe" ȘI tipul "Contribuții salariale"
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

// Normalize diacritics (same as frontend/backend)
const normalizeDiacritics = (str) => {
  if (!str) return ''
  return str
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț')
    .replace(/Ş/g, 'Ș')
    .trim()
}

async function checkCompleteFilter() {
  try {
    console.log('🔍 Verificare completă filtrare taxe...\n')
    
    // Verifică setările utilizatorului admin (ID 1)
    const userResult = await pool.query(`
      SELECT 
        id,
        username,
        preferences->'expendituresSettings'->'includedDepartments' as included_departments,
        preferences->'expendituresSettings'->'includedExpenditureTypes' as included_types
      FROM users
      WHERE id = 1
    `)
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilizatorul admin nu a fost găsit!')
      return
    }
    
    const user = userResult.rows[0]
    const includedDepartments = user.included_departments || []
    const includedTypes = user.included_types || []
    
    console.log(`👤 Utilizator: ${user.username} (ID: ${user.id})`)
    console.log(`📊 Departamente incluse: ${includedDepartments.length}`)
    console.log(`📊 Tipuri incluse: ${includedTypes.length}\n`)
    
    // Verifică dacă "Taxe" este inclus
    const normalizedDepts = includedDepartments.map(d => normalizeDiacritics(d?.toLowerCase().trim() || ''))
    const hasTaxe = normalizedDepts.includes('taxe')
    console.log(`✅ Departament "Taxe" inclus: ${hasTaxe ? 'DA' : 'NU'}`)
    if (hasTaxe) {
      const taxeIndex = normalizedDepts.indexOf('taxe')
      console.log(`   Valoarea exactă: "${includedDepartments[taxeIndex]}"`)
    }
    
    // Verifică dacă "Contribuții salariale" este inclus
    const normalizedTypes = includedTypes.map(t => normalizeDiacritics(t?.toLowerCase().trim() || ''))
    const hasContributii = normalizedTypes.some(t => t.includes('contribut') && t.includes('salar'))
    console.log(`✅ Tip "Contribuții salariale" inclus: ${hasContributii ? 'DA' : 'NU'}`)
    
    if (hasContributii) {
      const contributiiIndex = normalizedTypes.findIndex(t => t.includes('contribut') && t.includes('salar'))
      console.log(`   Valoarea exactă: "${includedTypes[contributiiIndex]}"`)
    }
    
    // Verifică datele din baza de date pentru decembrie 2025
    const taxeDataResult = await pool.query(`
      SELECT 
        department_name,
        expenditure_type,
        location_name,
        amount,
        operational_date
      FROM expenditures_sync
      WHERE department_name = 'Taxe'
        AND operational_date >= '2025-12-01'
        AND operational_date <= '2025-12-31'
      ORDER BY operational_date, location_name
    `)
    
    console.log(`\n💰 Date "Taxe" pentru decembrie 2025: ${taxeDataResult.rows.length} înregistrări\n`)
    
    if (taxeDataResult.rows.length > 0) {
      taxeDataResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.operational_date} - ${row.expenditure_type}`)
        console.log(`   ${row.location_name}: ${parseFloat(row.amount).toFixed(2)} RON`)
        
        // Verifică dacă ar trebui să apară cu filtrele actuale
        const deptNormalized = normalizeDiacritics((row.department_name || '').toLowerCase().trim())
        const typeNormalized = normalizeDiacritics((row.expenditure_type || '').toLowerCase().trim())
        
        const deptMatch = normalizedDepts.includes(deptNormalized)
        const typeMatch = normalizedTypes.includes(typeNormalized) || normalizedTypes.length === 0
        
        console.log(`   Departament match: ${deptMatch ? '✅' : '❌'}`)
        console.log(`   Tip match: ${typeMatch ? '✅' : '❌'}`)
        console.log(`   ${deptMatch && typeMatch ? '✅ VA APĂREA' : '❌ NU VA APĂREA'}`)
        console.log('')
      })
    }
    
    // Rezumat
    console.log('\n📋 REZUMAT:')
    console.log(`   - Departament "Taxe" inclus: ${hasTaxe ? '✅' : '❌'}`)
    console.log(`   - Tip "Contribuții salariale" inclus: ${hasContributii ? '✅' : '❌'}`)
    console.log(`   - Date în baza de date: ${taxeDataResult.rows.length} înregistrări`)
    
    if (!hasTaxe) {
      console.log('\n❌ PROBLEMA: Departamentul "Taxe" NU este inclus în setări!')
      console.log('   💡 Soluție: Mergi în Setări → Departamente → Bifează "Taxe"')
    } else if (!hasContributii) {
      console.log('\n❌ PROBLEMA: Tipul "Contribuții salariale" NU este inclus în setări!')
      console.log('   💡 Soluție: Mergi în Setări → Tipuri Cheltuieli → Bifează "Contribuții salariale"')
    } else {
      console.log('\n✅ Toate filtrele sunt corecte! Datele ar trebui să apară în aplicație.')
      console.log('   Dacă tot nu apar, verifică:')
      console.log('   1. Filtrele de dată (decembrie 2025)')
      console.log('   2. Filtrele de locație')
      console.log('   3. Console-ul browserului pentru erori')
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

checkCompleteFilter()
