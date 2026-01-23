/**
 * Script pentru verificarea facturilor din imagine
 * Compară sumele facturilor cu cele din sistem
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Facturi din imagine
const invoicesFromImage = [
  { factura: 'EFI2524828318', suma: 6897.01 },
  { factura: 'EFI2522625538', suma: 59091.94 },
  { factura: 'EFI2522625742', suma: 53422.53 },
  { factura: 'EFI2522625841', suma: 63502.55 },
  { factura: 'EFI2522625903', suma: 60792.78 },
  { factura: 'EFI2543222246', suma: 2045.32 },
  { factura: 'EFI2539807871', suma: 6639.17 },
  { factura: 'EFI2539684013', suma: 129964.1 },
  { factura: 'EFI2539567423', suma: 22142.76 },
  { factura: 'EFI2528639277', suma: 74016.7 },
  { factura: 'EFI2528633003', suma: 9015.2 },
  { factura: 'EFI2524845289', suma: 18406.97 },
  { factura: 'EFI2522624173', suma: 92715.49 },
  { factura: 'EFI2522624244', suma: 95602.92 },
  { factura: 'EFI2522624304', suma: 80017.7 },
  { factura: 'EFI2522624183', suma: 106318.3 },
  { factura: 'EFI2522624411', suma: 69853.21 },
  { factura: 'EFI2522624492', suma: 87034.19 },
  { factura: 'EFI2543071392', suma: 111906.6 },
  { factura: 'EFI2539961855', suma: 35078.28 },
  { factura: 'EFI2539892994', suma: 10575.9 },
  { factura: 'EFI2539871627', suma: 26243.92 },
  { factura: 'EFI2539871629', suma: 9949.47 },
  { factura: 'EFI2539685342', suma: 168727.1 },
  { factura: 'EFI2539961853', suma: 44499.87 },
  { factura: 'EFI2536366515', suma: 17424.85 },
  { factura: 'EFI2532743440', suma: 22428.11 },
  { factura: 'EFI2532743443', suma: 39634.08 }
]

async function verifyInvoices() {
  console.log('🔍 Verificare facturi din imagine...\n')
  console.log(`Total facturi de verificat: ${invoicesFromImage.length}\n`)

  const results = {
    found: [],
    foundWithDifferentAmount: [],
    notFound: []
  }

  const tolerance = 0.01 // Toleranță de 1 ban pentru diferențe de rotunjire

  for (const invoice of invoicesFromImage) {
    const invoiceNumber = invoice.factura.trim().toUpperCase()
    const expectedAmount = invoice.suma

    // Caută factura în sistem
    let invoiceResult = await pool.query(`
      SELECT 
        numar_factura,
        SUM(suma_totala) as total_suma,
        COUNT(*) as nlc_count,
        STRING_AGG(DISTINCT nlc_code::text, ', ') as nlc_codes,
        STRING_AGG(DISTINCT location_name, ', ') as locations,
        MIN(data_emiterii) as data_emiterii
      FROM electric_invoices_nlc
      WHERE UPPER(TRIM(numar_factura)) = $1
      GROUP BY numar_factura
    `, [invoiceNumber])

    // Dacă nu găsește exact, încearcă să caute după partea numerică
    if (invoiceResult.rows.length === 0 && invoiceNumber.includes('EFI')) {
      const numericPart = invoiceNumber.replace(/^EFI/i, '').trim()
      if (numericPart) {
        invoiceResult = await pool.query(`
          SELECT 
            numar_factura,
            SUM(suma_totala) as total_suma,
            COUNT(*) as nlc_count,
            STRING_AGG(DISTINCT nlc_code::text, ', ') as nlc_codes,
            STRING_AGG(DISTINCT location_name, ', ') as locations,
            MIN(data_emiterii) as data_emiterii
          FROM electric_invoices_nlc
          WHERE UPPER(TRIM(numar_factura)) LIKE $1
          GROUP BY numar_factura
        `, [`%${numericPart}%`])
      }
    }

    if (invoiceResult.rows.length === 0) {
      results.notFound.push({
        factura: invoiceNumber,
        expectedAmount,
        reason: 'Factură nu există în sistem'
      })
    } else {
      const dbInvoice = invoiceResult.rows[0]
      const dbAmount = parseFloat(dbInvoice.total_suma) || 0
      const difference = Math.abs(dbAmount - expectedAmount)

      if (difference <= tolerance) {
        results.found.push({
          factura: invoiceNumber,
          expectedAmount,
          dbAmount,
          nlcCount: parseInt(dbInvoice.nlc_count),
          nlcCodes: dbInvoice.nlc_codes,
          locations: dbInvoice.locations,
          dataEmiterii: dbInvoice.data_emiterii
        })
      } else {
        results.foundWithDifferentAmount.push({
          factura: invoiceNumber,
          expectedAmount,
          dbAmount,
          difference,
          differencePercent: ((difference / expectedAmount) * 100).toFixed(2),
          nlcCount: parseInt(dbInvoice.nlc_count),
          nlcCodes: dbInvoice.nlc_codes,
          locations: dbInvoice.locations,
          dataEmiterii: dbInvoice.data_emiterii
        })
      }
    }
  }

  // Afișează rezultatele
  const summary = {
    found: results.found.length,
    foundWithDifferentAmount: results.foundWithDifferentAmount.length,
    notFound: results.notFound.length
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 REZULTATE VERIFICARE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Găsite și corespund: ${summary.found}`)
  console.log(`⚠️  Găsite cu diferențe: ${summary.foundWithDifferentAmount}`)
  console.log(`❌ Lipsă din sistem: ${summary.notFound}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Afișează facturile care corespund
  if (results.found.length > 0) {
    console.log('✅ FACTURI CARE CORESPUND:\n')
    results.found.forEach(inv => {
      console.log(`   ${inv.factura}: ${inv.expectedAmount.toFixed(2)} RON ✅`)
    })
    console.log('')
  }

  // Afișează facturile cu diferențe
  if (results.foundWithDifferentAmount.length > 0) {
    console.log('⚠️  FACTURI CU DIFERENȚE:\n')
    results.foundWithDifferentAmount.forEach(inv => {
      console.log(`   ${inv.factura}:`)
      console.log(`      Așteptat: ${inv.expectedAmount.toFixed(2)} RON`)
      console.log(`      În sistem: ${inv.dbAmount.toFixed(2)} RON`)
      console.log(`      Diferență: ${inv.difference.toFixed(2)} RON (${inv.differencePercent}%)`)
      console.log(`      NLC-uri: ${inv.nlcCount}`)
      console.log(`      Locații: ${inv.locations || 'N/A'}`)
      console.log('')
    })
  }

  // Afișează facturile lipsă
  if (results.notFound.length > 0) {
    console.log('❌ FACTURI LIPSĂ DIN SISTEM:\n')
    results.notFound.forEach(inv => {
      console.log(`   ${inv.factura}: ${inv.expectedAmount.toFixed(2)} RON`)
      console.log(`      Motiv: ${inv.reason || 'Nu există în sistem'}`)
      console.log('')
    })
  }

  // Calcul total
  const totalExpected = invoicesFromImage.reduce((sum, inv) => sum + inv.suma, 0)
  const totalFound = results.found.reduce((sum, inv) => sum + inv.dbAmount, 0)
  const totalDifferent = results.foundWithDifferentAmount.reduce((sum, inv) => sum + inv.dbAmount, 0)
  const totalNotFound = results.notFound.reduce((sum, inv) => sum + inv.expectedAmount, 0)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💰 SUME TOTALE:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total așteptat (din imagine): ${totalExpected.toFixed(2)} RON`)
  console.log(`Total găsit și corespunde: ${totalFound.toFixed(2)} RON`)
  console.log(`Total găsit cu diferențe: ${totalDifferent.toFixed(2)} RON`)
  console.log(`Total lipsă: ${totalNotFound.toFixed(2)} RON`)
  console.log(`Total în sistem (găsite): ${(totalFound + totalDifferent).toFixed(2)} RON`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await pool.end()
}

// Rulează verificarea
verifyInvoices().catch(console.error)






