/**
 * Script pentru investigarea diferențelor de sume între imagine și sistem
 * Identifică toate facturile cu probleme și sugerează corecții
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Facturi din imagine cu sumele corecte
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

// Suma totală din imagine
const TOTAL_FROM_IMAGE = 1523947.00

async function investigateDifferences() {
  console.log('\n🔍 INVESTIGARE DIFERENȚE FACTURI')
  console.log('='.repeat(80))
  
  try {
    // 1. Calculează suma totală din sistem (SUM pe toate înregistrările)
    const totalSystemResult = await pool.query(`
      SELECT SUM(suma_totala) as total_suma
      FROM electric_invoices_nlc
      WHERE suma_totala IS NOT NULL
    `)
    const totalSystem = parseFloat(totalSystemResult.rows[0]?.total_suma || 0)
    
    console.log(`\n📊 SUME TOTALE:`)
    console.log(`   Imagine: ${TOTAL_FROM_IMAGE.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    console.log(`   Sistem (SUM toate înregistrările): ${totalSystem.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    console.log(`   Diferență: ${(totalSystem - TOTAL_FROM_IMAGE).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    
    // 2. Calculează suma totală grupând pe factură (cum se face în frontend)
    // Normalizează numărul facturii eliminând slash-uri pentru grupare corectă
    const totalByInvoiceResult = await pool.query(`
      SELECT 
        UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) as numar_factura_normalized,
        numar_factura as numar_factura_original,
        SUM(suma_totala) as total_suma,
        COUNT(*) as nlc_count,
        STRING_AGG(DISTINCT nlc_code::text, ', ') as nlc_codes
      FROM electric_invoices_nlc
      WHERE numar_factura IS NOT NULL AND numar_factura != 'N/A'
      GROUP BY numar_factura_normalized, numar_factura_original
      ORDER BY numar_factura_normalized
    `)
    
    const totalByInvoice = totalByInvoiceResult.rows.reduce((sum, row) => {
      return sum + parseFloat(row.total_suma || 0)
    }, 0)
    
    console.log(`   Sistem (SUM grupate pe factură): ${totalByInvoice.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    console.log(`   Diferență față de imagine: ${(totalByInvoice - TOTAL_FROM_IMAGE).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    
    // 3. Compară fiecare factură din imagine cu sistem
    console.log(`\n📋 COMPARAȚIE FACTURI:`)
    console.log('-'.repeat(80))
    
    const discrepancies = []
    const missingInSystem = []
    const missingInImage = []
    
    // Creează un map pentru facturile din imagine
    const imageMap = new Map()
    invoicesFromImage.forEach(inv => {
      imageMap.set(inv.factura.toUpperCase(), inv.suma)
    })
    
    // Verifică fiecare factură din imagine
    for (const invoice of invoicesFromImage) {
      const invoiceNum = invoice.factura.toUpperCase()
      const expectedSum = invoice.suma
      
      // Normalizează numărul facturii (elimină slash-uri și spații)
      const normalizedInvoiceNum = invoiceNum.replace(/\//g, '').replace(/\s/g, '')
      
      const dbResult = await pool.query(`
        SELECT 
          numar_factura,
          SUM(suma_totala) as total_suma,
          COUNT(*) as nlc_count,
          STRING_AGG(DISTINCT nlc_code::text, ', ') as nlc_codes,
          STRING_AGG(DISTINCT location_name, ', ') as locations
        FROM electric_invoices_nlc
        WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = $1
        GROUP BY numar_factura
      `, [normalizedInvoiceNum])
      
      if (dbResult.rows.length === 0) {
        missingInSystem.push({ factura: invoiceNum, suma: expectedSum })
        console.log(`❌ ${invoiceNum}: LIPSEȘTE din sistem (ar trebui: ${expectedSum.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON)`)
        continue
      }
      
      const dbRow = dbResult.rows[0]
      const systemSum = parseFloat(dbRow.total_suma || 0)
      const difference = systemSum - expectedSum
      const nlcCount = parseInt(dbRow.nlc_count || 0)
      
      if (Math.abs(difference) > 0.01) {
        discrepancies.push({
          factura: invoiceNum,
          suma_imagine: expectedSum,
          suma_sistem: systemSum,
          diferenta: difference,
          nlc_count: nlcCount,
          nlc_codes: dbRow.nlc_codes,
          locations: dbRow.locations
        })
        
        const status = difference > 0 ? '🔴 MAI MARE' : '🟡 MAI MICĂ'
        console.log(`${status} ${invoiceNum}:`)
        console.log(`   Imagine: ${expectedSum.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
        console.log(`   Sistem:  ${systemSum.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON (${nlcCount} NLC-uri)`)
        console.log(`   Diferență: ${difference > 0 ? '+' : ''}${difference.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
        if (nlcCount > 1) {
          console.log(`   ⚠️  Factură cu ${nlcCount} NLC-uri: ${dbRow.nlc_codes}`)
        }
        console.log('')
      } else {
        console.log(`✅ ${invoiceNum}: OK (${systemSum.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON, ${nlcCount} NLC-uri)`)
      }
    }
    
    // Verifică facturi din sistem care nu sunt în imagine
    const systemInvoices = new Set(
      totalByInvoiceResult.rows.map(row => row.numar_factura_normalized)
    )
    const imageInvoices = new Set(
      invoicesFromImage.map(inv => inv.factura.toUpperCase())
    )
    
    for (const systemInv of systemInvoices) {
      if (!imageInvoices.has(systemInv)) {
        const dbRow = totalByInvoiceResult.rows.find(
          row => row.numar_factura_normalized === systemInv
        )
        if (dbRow) {
          missingInImage.push({
            factura: systemInv,
            suma: parseFloat(dbRow.total_suma || 0),
            nlc_count: parseInt(dbRow.nlc_count || 0)
          })
        }
      }
    }
    
    // 4. Rezumat
    console.log('\n' + '='.repeat(80))
    console.log('📊 REZUMAT:')
    console.log('-'.repeat(80))
    console.log(`Total facturi în imagine: ${invoicesFromImage.length}`)
    console.log(`Total facturi în sistem: ${totalByInvoiceResult.rows.length}`)
    console.log(`Facturi cu diferențe: ${discrepancies.length}`)
    console.log(`Facturi lipsă din sistem: ${missingInSystem.length}`)
    console.log(`Facturi în sistem dar nu în imagine: ${missingInImage.length}`)
    
    if (discrepancies.length > 0) {
      console.log(`\n🔴 FACTURI CU DIFERENȚE:`)
      discrepancies.forEach(d => {
        console.log(`   ${d.factura}: ${d.suma_imagine.toFixed(2)} RON (imagine) vs ${d.suma_sistem.toFixed(2)} RON (sistem) = ${d.diferenta > 0 ? '+' : ''}${d.diferenta.toFixed(2)} RON`)
      })
      
      const totalDifference = discrepancies.reduce((sum, d) => sum + d.diferenta, 0)
      console.log(`\n   Total diferență: ${totalDifference > 0 ? '+' : ''}${totalDifference.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    }
    
    if (missingInSystem.length > 0) {
      console.log(`\n❌ FACTURI LIPSE DIN SISTEM:`)
      missingInSystem.forEach(m => {
        console.log(`   ${m.factura}: ${m.suma.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
      })
    }
    
    if (missingInImage.length > 0) {
      console.log(`\n⚠️  FACTURI ÎN SISTEM DAR NU ÎN IMAGINE (${missingInImage.length}):`)
      missingInImage.slice(0, 10).forEach(m => {
        console.log(`   ${m.factura}: ${m.suma.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON (${m.nlc_count} NLC-uri)`)
      })
      if (missingInImage.length > 10) {
        console.log(`   ... și încă ${missingInImage.length - 10} facturi`)
      }
    }
    
    // 5. Analiză detaliată pentru facturile problematice
    if (discrepancies.length > 0) {
      console.log(`\n🔍 ANALIZĂ DETALIATĂ FACTURI PROBLEMATICE:`)
      console.log('-'.repeat(80))
      
      for (const disc of discrepancies) {
        console.log(`\n📄 Factură ${disc.factura}:`)
        
        // Normalizează numărul facturii
        const normalizedFactura = disc.factura.replace(/\//g, '').replace(/\s/g, '')
        
        // Obține toate înregistrările pentru această factură
        const detailsResult = await pool.query(`
          SELECT 
            id,
            nlc_code,
            location_name,
            suma_totala,
            suma_activa,
            suma_reactiva,
            consum_kwh,
            numar_contor
          FROM electric_invoices_nlc
          WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = $1
          ORDER BY nlc_code
        `, [normalizedFactura])
        
        console.log(`   Total înregistrări: ${detailsResult.rows.length}`)
        console.log(`   Suma din imagine: ${disc.suma_imagine.toFixed(2)} RON`)
        console.log(`   Suma din sistem: ${disc.suma_sistem.toFixed(2)} RON`)
        console.log(`   Diferență: ${disc.diferenta > 0 ? '+' : ''}${disc.diferenta.toFixed(2)} RON`)
        console.log(`\n   Detalii NLC-uri:`)
        
        let sumActiva = 0
        let sumReactiva = 0
        let sumTotala = 0
        
        detailsResult.rows.forEach((row, idx) => {
          const sumaActiva = parseFloat(row.suma_activa || 0)
          const sumaReactiva = parseFloat(row.suma_reactiva || 0)
          const sumaTotala = parseFloat(row.suma_totala || 0)
          
          sumActiva += sumaActiva
          sumReactiva += sumaReactiva
          sumTotala += sumaTotala
          
          console.log(`   ${idx + 1}. NLC ${row.nlc_code || 'N/A'}:`)
          console.log(`      Locație: ${row.location_name || 'N/A'}`)
          console.log(`      Contor: ${row.numar_contor || 'N/A'}`)
          console.log(`      Suma activă: ${sumaActiva.toFixed(2)} RON`)
          console.log(`      Suma reactivă: ${sumaReactiva.toFixed(2)} RON`)
          console.log(`      Suma totală: ${sumaTotala.toFixed(2)} RON`)
          console.log(`      Consum: ${parseFloat(row.consum_kwh || 0).toFixed(2)} kWh`)
        })
        
        console.log(`\n   Totaluri calculate:`)
        console.log(`      Suma activă totală: ${sumActiva.toFixed(2)} RON`)
        console.log(`      Suma reactivă totală: ${sumReactiva.toFixed(2)} RON`)
        console.log(`      Suma totală (activă + reactivă): ${(sumActiva + sumReactiva).toFixed(2)} RON`)
        console.log(`      Suma totală din DB: ${sumTotala.toFixed(2)} RON`)
      }
    }
    
    // 6. Verificare specială pentru EFI2543222246 (care apare ca 0.00)
    console.log(`\n🔍 VERIFICARE SPECIALĂ EFI2543222246:`)
    console.log('-'.repeat(80))
    const specialResult = await pool.query(`
      SELECT 
        id,
        nlc_code,
        location_name,
        numar_factura,
        suma_totala,
        suma_activa,
        suma_reactiva,
        consum_kwh,
        numar_contor,
        perioada_facturare
      FROM electric_invoices_nlc
      WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = 'EFI2543222246'
      ORDER BY id
    `)
    
    if (specialResult.rows.length === 0) {
      console.log(`   ❌ Factura EFI2543222246 NU EXISTĂ în sistem!`)
      console.log(`   Ar trebui să fie: 2045.32 RON`)
    } else {
      const total = specialResult.rows.reduce((sum, row) => sum + parseFloat(row.suma_totala || 0), 0)
      console.log(`   Găsită: ${specialResult.rows.length} înregistrări`)
      console.log(`   Suma totală: ${total.toFixed(2)} RON (ar trebui: 2045.32 RON)`)
      specialResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ID ${row.id}, NLC ${row.nlc_code}, Suma: ${parseFloat(row.suma_totala || 0).toFixed(2)} RON`)
      })
    }
    
    // 7. Verificare pentru EFI2539961853 (cu două NLC-uri)
    console.log(`\n🔍 VERIFICARE SPECIALĂ EFI2539961853 (două NLC-uri):`)
    console.log('-'.repeat(80))
    const duplicateNlcResult = await pool.query(`
      SELECT 
        id,
        nlc_code,
        location_name,
        suma_totala,
        suma_activa,
        suma_reactiva
      FROM electric_invoices_nlc
      WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = 'EFI2539961853'
      ORDER BY nlc_code, id
    `)
    
    if (duplicateNlcResult.rows.length > 0) {
      const total = duplicateNlcResult.rows.reduce((sum, row) => sum + parseFloat(row.suma_totala || 0), 0)
      console.log(`   Găsită: ${duplicateNlcResult.rows.length} înregistrări`)
      console.log(`   Suma totală: ${total.toFixed(2)} RON (ar trebui: 44499.87 RON)`)
      console.log(`   Diferență: ${(total - 44499.87).toFixed(2)} RON`)
      duplicateNlcResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ID ${row.id}, NLC ${row.nlc_code}, Loc: ${row.location_name || 'N/A'}`)
        console.log(`      Suma: ${parseFloat(row.suma_totala || 0).toFixed(2)} RON`)
      })
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ INVESTIGARE COMPLETĂ')
    console.log('='.repeat(80) + '\n')
    
  } catch (error) {
    console.error('❌ EROARE:', error)
    throw error
  }
}

// Rulează investigarea
investigateDifferences()
  .then(() => {
    console.log('✅ Script finalizat')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Eroare fatală:', error)
    process.exit(1)
  })
  .finally(() => {
    pool.end()
  })






