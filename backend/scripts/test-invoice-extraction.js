/**
 * Script de test pentru extragerea facturii EFI2539567423
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import dinamic
const { extractElectricInvoiceDataSmart } = await import('../routes/electric-invoice-ai.js')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testExtraction() {
  console.log('🧪 TEST EXTRAGERE FACTURĂ EFI2539567423\n')
  
  // Caută PDF-ul
  const pdfPath = path.join(__dirname, '../../uploads/Factura-Z1_ajutguybuaqwr3obnac3ymqkmq5rm.pdf')
  
  if (!fs.existsSync(pdfPath)) {
    console.log('❌ PDF-ul nu a fost găsit la:', pdfPath)
    console.log('   Caută în alte locații...')
    
    // Caută în toate locațiile posibile
    const possiblePaths = [
      path.join(__dirname, '../../temp'),
      path.join(__dirname, '../../'),
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'temp')
    ]
    
    let found = false
    for (const dir of possiblePaths) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.includes('ajutguybuaqwr3obnac3ymqkmq5rm'))
        if (files.length > 0) {
          const fullPath = path.join(dir, files[0])
          console.log(`   ✅ Găsit: ${fullPath}`)
          await testWithPdf(fullPath)
          found = true
          break
        }
      }
    }
    
    if (!found) {
      console.log('❌ PDF-ul nu a fost găsit în niciun loc')
      console.log('   Te rog să furnizezi calea exactă la PDF')
    }
  } else {
    await testWithPdf(pdfPath)
  }
}

async function testWithPdf(pdfPath) {
  try {
    console.log(`\n📄 Citire PDF: ${pdfPath}`)
    const pdfBuffer = fs.readFileSync(pdfPath)
    console.log(`   Dimensiune: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`)
    
    const result = await extractElectricInvoiceDataSmart(pdfBuffer)
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 REZULTAT EXTRAGERE:')
    console.log('='.repeat(80))
    console.log(`Număr factură: ${result.numar_factura}`)
    console.log(`Suma totală: ${result.suma_totala || 'N/A'} RON`)
    console.log(`Total de plată: ${result.total_de_plata || 'N/A'} RON`)
    console.log(`Sold anterior: ${result.sold_anterior || 'N/A'} RON`)
    console.log(`Penalități: ${result.penalitati || 'N/A'} RON`)
    console.log(`Dobânzi: ${result.dobanzi || 'N/A'} RON`)
    console.log(`Preț/kWh: ${result.pret_per_kwh || 'N/A'}`)
    console.log(`NLC-uri găsite: ${result.nlc_codes?.length || 0}`)
    
    console.log('\n📋 DETALII NLC-URI:')
    if (result.nlc_data && result.nlc_data.length > 0) {
      result.nlc_data.forEach((nlc, idx) => {
        console.log(`\n${idx + 1}. NLC ${nlc.nlc}:`)
        console.log(`   Locație: ${nlc.location || 'N/A'}`)
        console.log(`   Suma activă: ${nlc.suma ? nlc.suma.toFixed(2) : 'N/A'} RON`)
        console.log(`   Suma totală: ${nlc.sumaTotala ? nlc.sumaTotala.toFixed(2) : 'N/A'} RON`)
        console.log(`   Consum: ${nlc.consum ? nlc.consum.toFixed(2) : 'N/A'} kWh`)
        console.log(`   Preț/kWh: ${nlc.pretPerKwh || nlc.pretCalculat ? (nlc.pretPerKwh || nlc.pretCalculat).toFixed(4) : 'N/A'}`)
      })
      
      const totalNlcSum = result.nlc_data.reduce((sum, r) => {
        return sum + (parseFloat(r.sumaTotala || r.suma || 0) || 0)
      }, 0)
      console.log(`\n💰 Suma totală din NLC-uri: ${totalNlcSum.toFixed(2)} RON`)
      console.log(`💰 Suma totală din factură: ${result.suma_totala || 'N/A'} RON`)
      
      if (result.suma_totala) {
        const diff = Math.abs(totalNlcSum - parseFloat(result.suma_totala))
        console.log(`📊 Diferență: ${diff.toFixed(2)} RON`)
      }
    } else {
      console.log('   ❌ Nu s-au găsit NLC-uri!')
    }
    
  } catch (error) {
    console.error('❌ EROARE:', error.message)
    console.error(error.stack)
  }
}

testExtraction().catch(console.error)






