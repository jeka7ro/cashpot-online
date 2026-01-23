/**
 * Test pentru noua logică de extracție
 */

import { extractElectricInvoiceDataSmart } from '../routes/electric-invoice-ai.js'
import fs from 'fs'

const pdfPath = '/Users/eugeniucazmal/Downloads/electrica smartflix/Factura-Z1_avcgcdyrkergqptfkucwldykmq5q5.pdf'

console.log('🔍 Test extragere PDF...')
console.log(`📄 Fișier: ${pdfPath}`)

if (!fs.existsSync(pdfPath)) {
  console.error('❌ Fișierul nu există!')
  process.exit(1)
}

try {
  const pdfBuffer = fs.readFileSync(pdfPath)
  console.log(`✅ Fișier citit: ${pdfBuffer.length} bytes\n`)
  
  const result = await extractElectricInvoiceDataSmart(pdfBuffer)
  
  console.log('\n\n========================================')
  console.log('REZULTAT FINAL:')
  console.log('========================================')
  console.log(JSON.stringify(result, null, 2))
  
} catch (error) {
  console.error('❌ Eroare:', error)
  process.exit(1)
}













