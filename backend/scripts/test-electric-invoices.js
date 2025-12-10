import pdfParse from 'pdf-parse'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Funcție pentru extragere inteligentă
const extractElectricInvoiceData = (text) => {
  const data = {}
  const upperText = text.toUpperCase()
  
  console.log('\n📄 Analizând PDF...')
  console.log(`   Lungime text: ${text.length} caractere`)
  console.log(`   Primele 500 caractere:\n${text.substring(0, 500)}\n`)
  
  // Extrage TOATE NLC-urile din factură (pot fi mai multe!)
  const nlcMatches = [...text.matchAll(/(?:COD\s+Loc\s+de\s+consum|NLC|NUMAR\s+LOC\s+DE\s+CONSUM|LOC\s+DE\s+CONSUM)\s*[:]?\s*(\d{8,})/gi)]
  if (nlcMatches.length > 0) {
    data.nlc_codes = nlcMatches.map(m => m[1].trim())
    console.log(`✅ Găsite ${data.nlc_codes.length} coduri NLC:`, data.nlc_codes)
  } else {
    // Încearcă format alternativ
    const altNlcMatches = [...text.matchAll(/NLC\s*[:]?\s*(\d{8,})/gi)]
    if (altNlcMatches.length > 0) {
      data.nlc_codes = altNlcMatches.map(m => m[1].trim())
      console.log(`✅ Găsite ${data.nlc_codes.length} coduri NLC (format alternativ):`, data.nlc_codes)
    }
  }
  
  // Extrage TOATE locațiile (pot fi mai multe în aceeași factură!)
  const locations = []
  const locationKeywords = {
    'Pitești': ['PITEȘTI', 'PITESTI', 'PITI'],
    'Ploiești (centru)': ['PLOIESTI (CENTRU)', 'PLOIEȘTI (CENTRU)', 'PLOIESTI CENTRU', 'PLOIEȘTI CENTRU'],
    'Ploiești (nord)': ['PLOIESTI (NORD)', 'PLOIEȘTI (NORD)', 'PLOIESTI NORD', 'PLOIEȘTI NORD'],
    'Craiova': ['CRAIOVA', 'CARIOVA'],
    'Vâlcea': ['VÂLCEA', 'VALCEA', 'RÂMNICU VÂLCEA'],
    'București': ['BUCUREȘTI', 'BUCHAREST']
  }
  
  for (const [locationName, keywords] of Object.entries(locationKeywords)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(text)) {
        if (!locations.includes(locationName)) {
          locations.push(locationName)
        }
      }
    }
  }
  
  if (locations.length > 0) {
    data.locations = locations
    console.log(`✅ Găsite ${locations.length} locații:`, locations)
  }
  
  // Extrage număr factură
  const facturaMatch = text.match(/(?:FACTURA|FACTUR[ĂA])\s*(?:NR\.?|NO\.?|NUMAR\.?)?\s*[:]?\s*([A-Z0-9\-/]+)/i)
  if (facturaMatch) {
    data.numar_factura = facturaMatch[1].trim()
    console.log(`✅ Număr factură: ${data.numar_factura}`)
  }
  
  // Extrage perioada
  let perioadaMatch = text.match(/(?:PERIOADA|PERIOAD[ĂA]|FACTURARE|CONSUM)\s*(?:FACTURARE|FACTUR[ĂA]RI|DE\s+FACTURARE)?\s*[:]?\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*[-–]\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})/i)
  if (!perioadaMatch) {
    perioadaMatch = text.match(/(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*[-–]\s*(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})/i)
  }
  if (perioadaMatch) {
    const startDate = perioadaMatch[1].replace(/[.\-]/g, '.')
    const endDate = perioadaMatch[2].replace(/[.\-]/g, '.')
    data.perioada_facturare = `${startDate} - ${endDate}`
    console.log(`✅ Perioadă: ${data.perioada_facturare}`)
  }
  
  // Extrage suma totală
  let sumaTotalaMatch = text.match(/(?:TOTAL\s+(?:CU\s+)?TVA|TOTAL\s+DE\s+PLAT[ĂA]|TOTAL\s+GENERAL|TOTAL\s+DE\s+PLATA|TOTAL\s+PLATA)\s*[:]?\s*(\d+(?:\s?\d{3})*(?:[.,]\d{2})?)\s*(?:RON|LEI)?/i)
  if (sumaTotalaMatch) {
    data.suma_totala = sumaTotalaMatch[1].replace(/\s/g, '').replace(',', '.')
    console.log(`✅ Suma totală: ${data.suma_totala} RON`)
  } else {
    const totalMatches = [...text.matchAll(/(?:TOTAL|SUMA)\s*[:]?\s*(\d+(?:\s?\d{3})*(?:[.,]\d{2})?)\s*(?:RON|LEI)?/gi)]
    if (totalMatches.length > 0) {
      let maxAmount = 0
      let maxMatch = null
      for (const match of totalMatches) {
        const amountStr = match[1].replace(/\s/g, '').replace(',', '.')
        const amount = parseFloat(amountStr)
        if (amount > maxAmount) {
          maxAmount = amount
          maxMatch = amountStr
        }
      }
      if (maxMatch) {
        data.suma_totala = maxMatch
        console.log(`✅ Suma totală (cel mai mare): ${data.suma_totala} RON`)
      }
    }
  }
  
  // Extrage consum kWh
  const consumMatch = text.match(/(?:CONSUM|ENERGIE|KWH)\s*[:]?\s*(\d+(?:[.,]\d+)?)\s*(?:KWH|KW\.H)?/i)
  if (consumMatch) {
    data.consum_kwh = consumMatch[1].replace(',', '.')
    console.log(`✅ Consum kWh: ${data.consum_kwh}`)
  }
  
  return data
}

// Testează cele două facturi
const testInvoices = async () => {
  const invoices = [
    '/Users/eugeniucazmal/Downloads/electrica smartflix/Factura-Z1_avcgcdyrkergqptfkucwldykmq5q5.pdf',
    '/Users/eugeniucazmal/Downloads/electrica smartflix/Factura-Z1_avcgij5tvbzwqptfkucwldykmq5q5.pdf'
  ]
  
  for (const invoicePath of invoices) {
    console.log('\n' + '='.repeat(80))
    console.log(`📄 Analizând: ${path.basename(invoicePath)}`)
    console.log('='.repeat(80))
    
    try {
      if (!fs.existsSync(invoicePath)) {
        console.log(`❌ Fișierul nu există: ${invoicePath}`)
        continue
      }
      
      const pdfBuffer = fs.readFileSync(invoicePath)
      const pdfData = await pdfParse(pdfBuffer)
      const extractedData = extractElectricInvoiceData(pdfData.text)
      
      console.log('\n📊 REZULTATE EXTRAGERE:')
      console.log(JSON.stringify(extractedData, null, 2))
      
    } catch (error) {
      console.error(`❌ Eroare la analizarea ${invoicePath}:`, error.message)
    }
  }
}

testInvoices().catch(console.error)







