/**
 * Script pentru testarea filtrării taxelor după fix
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

// Normalize type for comparison (elimină TOATE diacriticele)
const normalizeTypeForComparison = (str) => {
  if (!str) return ''
  return normalizeDiacritics(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove all diacritics
    .toLowerCase()
    .trim()
}

console.log('🧪 Testare filtrare taxe după fix...\n')

// Tipul din baza de date (cu ţ - sedilă)
const dbType = 'Contribuţii salariale'
console.log(`📊 Tip din baza de date: "${dbType}"`)

// Tipul din setări (fără diacritice)
const settingsType = 'Contributii salariale'
console.log(`📋 Tip din setări: "${settingsType}"`)

// Normalizează ambele cu noua funcție
const normalizedDb = normalizeTypeForComparison(dbType)
const normalizedSettings = normalizeTypeForComparison(settingsType)

console.log(`\n📊 Tip din DB normalizat: "${normalizedDb}"`)
console.log(`📋 Tip din setări normalizat: "${normalizedSettings}"`)

// Verifică dacă se potrivesc
const matches = normalizedDb === normalizedSettings
console.log(`\n✅ Se potrivesc: ${matches ? 'DA ✅' : 'NU ❌'}`)

// Test cu lista de tipuri din setări
const includedTypes = ['Contributii salariale', 'Alte tipuri']
const normalizedIncluded = includedTypes.map(t => normalizeTypeForComparison(t || ''))
const itemType = normalizeTypeForComparison(dbType)

console.log(`\n📋 Lista normalizată din setări: ${JSON.stringify(normalizedIncluded)}`)
console.log(`📊 Tip normalizat din DB: "${itemType}"`)
console.log(`✅ Include check: ${normalizedIncluded.includes(itemType) ? 'DA - VA APĂREA ✅' : 'NU - NU VA APĂREA ❌'}`)

if (normalizedIncluded.includes(itemType)) {
  console.log('\n✅ PROBLEMA REZOLVATĂ! Taxele vor apărea acum în aplicație!')
} else {
  console.log('\n❌ Problema persistă. Verifică logica de normalizare.')
}
