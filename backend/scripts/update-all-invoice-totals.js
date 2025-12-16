/**
 * Script pentru actualizarea sumelor totale extrase din facturi
 * Folosește suma extrasă direct din factură în loc de suma calculată din NLC-uri
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Lista facturilor cu sumele corecte cunoscute (din verificări manuale)
const knownCorrectAmounts = {
  'EFI/2543071392': 111906.57,
  'EFI/2539807871': 6639.17,
  'EFI2539807871': 6639.17, // Variantă fără slash
  // Adaugă aici alte facturi când le verifici
}

async function updateInvoiceTotals() {
  console.log('\n🔄 ACTUALIZARE SUME TOTALE EXTRASE DIN FACTURI')
  console.log('='.repeat(80))
  
  try {
    // Găsește toate facturile grupate
    const result = await pool.query(`
      SELECT 
        numar_factura,
        COUNT(*) as record_count,
        SUM(suma_totala) as calculated_total,
        MAX(invoice_total_amount) as current_invoice_total
      FROM electric_invoices_nlc
      WHERE numar_factura IS NOT NULL AND numar_factura != ''
      GROUP BY numar_factura
      ORDER BY numar_factura
    `)
    
    console.log(`\n📊 Găsite ${result.rows.length} facturi unice\n`)
    
    let updated = 0
    let skipped = 0
    let needsManualCheck = []
    
    for (const row of result.rows) {
      const invoiceNumber = row.numar_factura.trim()
      const calculatedTotal = parseFloat(row.calculated_total) || 0
      const currentInvoiceTotal = row.current_invoice_total ? parseFloat(row.current_invoice_total) : null
      
      // Verifică dacă avem suma corectă cunoscută (cu sau fără slash)
      const normalizedInvoice = invoiceNumber.replace(/\//g, '')
      const knownAmount = knownCorrectAmounts[invoiceNumber] || 
                         knownCorrectAmounts[invoiceNumber.toUpperCase()] ||
                         knownCorrectAmounts[normalizedInvoice] ||
                         knownCorrectAmounts[normalizedInvoice.toUpperCase()]
      
      if (knownAmount) {
        // Actualizează cu suma cunoscută
        await pool.query(`
          UPDATE electric_invoices_nlc
          SET invoice_total_amount = $1
          WHERE numar_factura = $2
        `, [knownAmount, invoiceNumber])
        
        console.log(`✅ ${invoiceNumber}: Actualizat cu ${knownAmount.toFixed(2)} RON (calculată: ${calculatedTotal.toFixed(2)} RON)`)
        updated++
      } else if (currentInvoiceTotal && currentInvoiceTotal > 0) {
        // Deja are suma extrasă setată
        console.log(`ℹ️  ${invoiceNumber}: Deja are suma extrasă: ${currentInvoiceTotal.toFixed(2)} RON`)
        skipped++
      } else {
        // Nu are suma extrasă și nu o cunoaștem - trebuie verificată manual
        needsManualCheck.push({
          invoiceNumber,
          calculatedTotal,
          recordCount: parseInt(row.record_count)
        })
        console.log(`⚠️  ${invoiceNumber}: Suma calculată: ${calculatedTotal.toFixed(2)} RON (necesită verificare manuală)`)
      }
    }
    
    console.log(`\n📊 REZUMAT:`)
    console.log(`   ✅ Actualizate: ${updated}`)
    console.log(`   ℹ️  Deja setate: ${skipped}`)
    console.log(`   ⚠️  Necesită verificare: ${needsManualCheck.length}`)
    
    if (needsManualCheck.length > 0) {
      console.log(`\n⚠️  FACTURI CARE NECESITĂ VERIFICARE MANUALĂ:`)
      needsManualCheck.forEach(inv => {
        console.log(`   - ${inv.invoiceNumber}: ${inv.calculatedTotal.toFixed(2)} RON (${inv.recordCount} înregistrări)`)
      })
      console.log(`\n💡 Pentru a actualiza aceste facturi, adaugă-le în 'knownCorrectAmounts' cu suma corectă extrasă din factură`)
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

updateInvoiceTotals()
