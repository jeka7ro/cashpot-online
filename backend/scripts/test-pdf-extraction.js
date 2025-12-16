/**
 * Script de test pentru extragerea NLC-urilor din PDF
 */

import pdfParse from 'pdf-parse'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pdfPath = '/Users/eugeniucazmal/Downloads/electrica smartflix/Factura-Z1_avcgcdyrkergqptfkucwldykmq5q5.pdf'

console.log('🔍 Testare extragere PDF...')
console.log(`📄 Fișier: ${pdfPath}`)

if (!fs.existsSync(pdfPath)) {
  console.error('❌ Fișierul nu există!')
  process.exit(1)
}

try {
  const pdfBuffer = fs.readFileSync(pdfPath)
  console.log(`✅ Fișier citit: ${pdfBuffer.length} bytes`)
  
  const pdfData = await pdfParse(pdfBuffer)
  const text = pdfData.text
  
  console.log(`\n📄 Text extras: ${text.length} caractere\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('PRIMELE 3000 CARACTERE:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(text.substring(0, 3000))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // Caută TOATE numerele de 10 cifre
  const all10Digit = [...text.matchAll(/(\d{10})/g)]
  console.log(`🔢 Găsite ${all10Digit.length} numere de 10 cifre`)
  const unique10Digit = [...new Set(all10Digit.map(m => m[1]))]
  console.log(`   Unice: ${unique10Digit.length}`)
  console.log(`   Primele 30: ${unique10Digit.slice(0, 30).join(', ')}`)
  
  // Caută NLC-uri (încep cu 700)
  const nlcNumbers = unique10Digit.filter(n => n.startsWith('700'))
  console.log(`\n⚡ NLC-uri (încep cu 700): ${nlcNumbers.length}`)
  if (nlcNumbers.length > 0) {
    console.log(`   ${nlcNumbers.join(', ')}`)
    
    // Pentru fiecare NLC, caută contextul
    for (const nlc of nlcNumbers) {
      const index = text.indexOf(nlc)
      if (index !== -1) {
        const context = text.substring(Math.max(0, index - 200), Math.min(text.length, index + 200))
        console.log(`\n   📍 Context pentru NLC ${nlc}:`)
        console.log(`   ${context.replace(/\n/g, ' ')}`)
      }
    }
  }
  
  // Caută "Localitatea"
  const localitateMatches = [...text.matchAll(/Localitatea\s+([A-ZĂÂÎȘȚ][A-ZĂÂÎȘȚ\s,]+)/gi)]
  console.log(`\n📍 Găsite ${localitateMatches.length} apariții "Localitatea"`)
  if (localitateMatches.length > 0) {
    localitateMatches.forEach((match, idx) => {
      console.log(`   ${idx + 1}. "${match[1].trim()}" (poziție: ${match.index})`)
    })
  }
  
  // Caută "COD Loc de consum"
  const codLocMatches = [...text.matchAll(/(?:COD|Cod)\s+Loc\s+de\s+consum/gi)]
  console.log(`\n🔍 Găsite ${codLocMatches.length} apariții "COD Loc de consum"`)
  
  // Caută "NLC"
  const nlcLabelMatches = [...text.matchAll(/NLC/gi)]
  console.log(`\n🔍 Găsite ${nlcLabelMatches.length} apariții "NLC"`)
  
  // Salvează textul complet într-un fișier pentru analiză
  const outputPath = path.join(__dirname, 'extracted-text.txt')
  fs.writeFileSync(outputPath, text)
  console.log(`\n💾 Text complet salvat în: ${outputPath}`)
  
} catch (error) {
  console.error('❌ Eroare:', error)
  process.exit(1)
}











