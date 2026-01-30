/**
 * Script pentru testarea filtrării departamentului "Taxe"
 */

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

// Test filtering logic
const includedDepartments = ['Taxe', 'Salarii', 'POS', 'Bancă']
const testDepartment = 'Taxe'

console.log('🧪 Testare filtrare departament "Taxe"...\n')

console.log('📋 Lista departamente incluse:', includedDepartments)
console.log(`📌 Departament de testat: "${testDepartment}"\n`)

// Normalize included departments
const normalizedIncluded = includedDepartments.map(d => normalizeDiacritics(d?.toLowerCase().trim() || ''))
console.log('📋 Lista normalizată (lowercase, fără diacritice):', normalizedIncluded)

// Normalize test department
const itemDept = normalizeDiacritics((testDepartment || '').toLowerCase().trim())
console.log(`📌 Departament normalizat: "${itemDept}"\n`)

// Check if matches
const matches = normalizedIncluded.includes(itemDept)
console.log(`✅ Rezultat: ${matches ? 'MATCH - AR TREBUI SĂ APARĂ' : 'NO MATCH - NU VA APĂREA'}`)

if (!matches) {
  console.log('\n❌ PROBLEMA: Departamentul nu se potrivește!')
  console.log('   Verifică:')
  console.log(`   - Normalized included: ${JSON.stringify(normalizedIncluded)}`)
  console.log(`   - Normalized item: "${itemDept}"`)
  console.log(`   - Includes check: ${normalizedIncluded.includes(itemDept)}`)
} else {
  console.log('\n✅ Logica de filtrare funcționează corect!')
  console.log('   Dacă tot nu apare în aplicație, verifică:')
  console.log('   1. Dacă utilizatorul este logat corect')
  console.log('   2. Dacă setările sunt încărcate corect în frontend')
  console.log('   3. Dacă există alte filtre active (date, tipuri, locații)')
}
