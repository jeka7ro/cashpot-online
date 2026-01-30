/**
 * Script pentru testarea normalizării tipului "Contribuții salariale"
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

console.log('🧪 Testare normalizare tip "Contribuții salariale"...\n')

// Tipul din baza de date (cu ţ - sedilă)
const dbType = 'Contribuţii salariale'
console.log(`📊 Tip din baza de date: "${dbType}"`)

// Tipul din setări (fără diacritice)
const settingsType = 'Contributii salariale'
console.log(`📋 Tip din setări: "${settingsType}"`)

// Normalizează ambele
const normalizedDb = normalizeDiacritics(dbType.toLowerCase().trim())
const normalizedSettings = normalizeDiacritics(settingsType.toLowerCase().trim())

console.log(`\n📊 Tip din DB normalizat: "${normalizedDb}"`)
console.log(`📋 Tip din setări normalizat: "${normalizedSettings}"`)

// Verifică dacă se potrivesc
const matches = normalizedDb === normalizedSettings
console.log(`\n✅ Se potrivesc: ${matches ? 'DA' : 'NU'}`)

if (!matches) {
  console.log('\n❌ PROBLEMA: Normalizarea nu funcționează corect!')
  console.log('   Diferențe:')
  console.log(`   - DB: "${normalizedDb}" (${normalizedDb.length} caractere)`)
  console.log(`   - Settings: "${normalizedSettings}" (${normalizedSettings.length} caractere)`)
  
  // Verifică caracterele
  console.log('\n   Caractere DB:')
  normalizedDb.split('').forEach((char, i) => {
    console.log(`     ${i}: "${char}" (code: ${char.charCodeAt(0)})`)
  })
  
  console.log('\n   Caractere Settings:')
  normalizedSettings.split('').forEach((char, i) => {
    console.log(`     ${i}: "${char}" (code: ${char.charCodeAt(0)})`)
  })
} else {
  console.log('\n✅ Normalizarea funcționează corect!')
  console.log('   Problema este în altă parte.')
}

// Test cu lista de tipuri din setări
const includedTypes = ['Contributii salariale', 'Alte tipuri']
const normalizedIncluded = includedTypes.map(t => normalizeDiacritics(t?.toLowerCase().trim() || ''))
const itemType = normalizeDiacritics(dbType.toLowerCase().trim())

console.log(`\n📋 Lista normalizată din setări: ${JSON.stringify(normalizedIncluded)}`)
console.log(`📊 Tip normalizat din DB: "${itemType}"`)
console.log(`✅ Include check: ${normalizedIncluded.includes(itemType) ? 'DA - VA APĂREA' : 'NU - NU VA APĂREA'}`)
