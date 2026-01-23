/**
 * Script pentru identificarea și ștergerea facturilor dublate
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Facturi suspecte de dublare (din verificarea anterioară)
// Formatul în baza de date este "EFI/XXXXX" (cu slash)
const suspiciousInvoices = [
  { factura: 'EFI/2539961855', expectedAmount: 35078.28, actualAmount: 70156.54 },
  { factura: 'EFI/2536366515', expectedAmount: 17424.85, actualAmount: 34849.76 },
  { factura: 'EFI/2532743440', expectedAmount: 22428.11, actualAmount: 44856.20 },
  { factura: 'EFI/2532743443', expectedAmount: 39634.08, actualAmount: 79268.12 },
  { factura: 'EFI/2539961853', expectedAmount: 44499.87, actualAmount: 87498.88 }
]

async function findAndFixDuplicates() {
  console.log('🔍 Căutare facturi dublate...\n')

  for (const invoice of suspiciousInvoices) {
    const invoiceNumber = invoice.factura.trim().toUpperCase()
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📋 Factură: ${invoiceNumber}`)
    console.log(`   Așteptat: ${invoice.expectedAmount.toFixed(2)} RON`)
    console.log(`   În sistem: ${invoice.actualAmount.toFixed(2)} RON`)
    console.log(`   Diferență: ${(invoice.actualAmount - invoice.expectedAmount).toFixed(2)} RON`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Găsește toate înregistrările pentru această factură
    // Încearcă mai întâi exact, apoi cu LIKE pentru flexibilitate
    let result = await pool.query(`
      SELECT 
        id,
        numar_factura,
        nlc_code,
        location_name,
        suma_totala,
        consum_kwh,
        perioada_facturare,
        data_emiterii,
        extracted_at
      FROM electric_invoices_nlc
      WHERE numar_factura = $1
      ORDER BY id ASC
    `, [invoiceNumber])

    // Dacă nu găsește exact, încearcă cu LIKE (fără slash sau cu slash)
    if (result.rows.length === 0) {
      const numericPart = invoiceNumber.replace(/^EFI[\/]?/i, '')
      result = await pool.query(`
        SELECT 
          id,
          numar_factura,
          nlc_code,
          location_name,
          suma_totala,
          consum_kwh,
          perioada_facturare,
          data_emiterii,
          extracted_at
        FROM electric_invoices_nlc
        WHERE numar_factura LIKE $1
        ORDER BY id ASC
      `, [`%${numericPart}%`])
    }

    if (result.rows.length === 0) {
      console.log(`   ⚠️  Factura ${invoiceNumber} nu a fost găsită în sistem\n`)
      continue
    }

    console.log(`   📊 Găsite ${result.rows.length} înregistrări:\n`)

    // Afișează toate înregistrările
    result.rows.forEach(row => {
      const suma = parseFloat(row.suma_totala || 0)
      console.log(`   ID: ${row.id}, NLC: ${row.nlc_code}, Loc: ${row.location_name}, Suma: ${suma.toFixed(2)} RON, Perioadă: ${row.perioada_facturare}`)
    })

    // Calculează suma totală actuală
    const currentTotal = result.rows.reduce((sum, row) => sum + parseFloat(row.suma_totala || 0), 0)
    console.log(`\n   💰 Suma totală actuală: ${currentTotal.toFixed(2)} RON`)
    console.log(`   💰 Suma așteptată: ${invoice.expectedAmount.toFixed(2)} RON`)

    // Verifică dacă suma totală este dublă față de așteptat (cu toleranță mai mare pentru rotunjiri)
    const isDouble = Math.abs(currentTotal - invoice.expectedAmount * 2) < 1.0

    if (isDouble && result.rows.length === 2) {
      // Probabil că sunt două NLC-uri cu aceeași sumă (duplicate)
      // Verifică dacă sumele sunt identice
      const sum1 = parseFloat(result.rows[0].suma_totala || 0)
      const sum2 = parseFloat(result.rows[1].suma_totala || 0)
      
      // Verifică dacă au aceeași perioadă și locație
      const samePeriod = result.rows[0].perioada_facturare === result.rows[1].perioada_facturare
      const sameLocation = result.rows[0].location_name === result.rows[1].location_name

      if (samePeriod && sameLocation && Math.abs(sum1 - sum2) < 0.01) {
        // Ambele au aceeași sumă, perioadă și locație - probabil duplicate
        // Păstrează prima (cea cu ID mai mic) și șterge a doua
        const toKeep = result.rows[0].id < result.rows[1].id ? result.rows[0] : result.rows[1]
        const toDelete = result.rows[0].id < result.rows[1].id ? result.rows[1] : result.rows[0]
        
        console.log(`\n   ⚠️  Două înregistrări identice găsite (aceeași perioadă, locație și sumă)`)
        console.log(`   🔍 Se șterge una dintre ele...`)
        console.log(`      → Se păstrează: ID ${toKeep.id} (NLC: ${toKeep.nlc_code}, Suma: ${sum1.toFixed(2)} RON)`)
        console.log(`      → Se șterge: ID ${toDelete.id} (NLC: ${toDelete.nlc_code}, Suma: ${sum2.toFixed(2)} RON)`)

        // Șterge duplicatul
        await pool.query(`
          DELETE FROM electric_invoices_nlc
          WHERE id = $1
        `, [toDelete.id])

        const totalAfter = parseFloat(toKeep.suma_totala || 0)
        console.log(`   ✅ Duplicat șters! Suma după ștergere: ${totalAfter.toFixed(2)} RON`)
        console.log(`   📊 Diferență față de așteptat: ${Math.abs(totalAfter - invoice.expectedAmount).toFixed(2)} RON\n`)
        continue
      } else {
        console.log(`   ℹ️  Nu sunt duplicate identice - au perioade/locații/sume diferite\n`)
      }
    }

    // Grupează după NLC pentru a vedea dacă sunt duplicate
    const groupedByNlc = {}
    result.rows.forEach(row => {
      const nlc = row.nlc_code
      if (!groupedByNlc[nlc]) {
        groupedByNlc[nlc] = []
      }
      groupedByNlc[nlc].push(row)
    })

    // Verifică dacă există duplicate (același NLC, aceeași sumă)
    const duplicates = []
    const unique = []

    for (const [nlc, rows] of Object.entries(groupedByNlc)) {
      if (rows.length > 1) {
        // Există duplicate pentru acest NLC
        console.log(`   🔴 NLC ${nlc}: ${rows.length} duplicate găsite`)
        
        // Sortează după ID (păstrează prima înregistrare)
        rows.sort((a, b) => a.id - b.id)
        
        // Prima înregistrare rămâne, restul sunt duplicate
        unique.push(rows[0])
        for (let i = 1; i < rows.length; i++) {
          duplicates.push(rows[i])
          const suma = parseFloat(rows[i].suma_totala || 0)
          console.log(`      → Duplicat ID ${rows[i].id}: ${suma.toFixed(2)} RON, ${rows[i].location_name}`)
        }
      } else {
        // Nu sunt duplicate pentru acest NLC
        unique.push(rows[0])
        const suma = parseFloat(rows[0].suma_totala || 0)
        console.log(`   ✅ NLC ${nlc}: OK (${suma.toFixed(2)} RON, ${rows[0].location_name})`)
      }
    }

    if (duplicates.length > 0) {
      console.log(`\n   🗑️  Se vor șterge ${duplicates.length} duplicate...`)
      
      // Calculează suma totală după ștergere
      const totalAfter = unique.reduce((sum, row) => sum + parseFloat(row.suma_totala || 0), 0)
      console.log(`\n   💰 Suma totală după ștergere: ${totalAfter.toFixed(2)} RON`)
      console.log(`   📊 Diferență față de așteptat: ${Math.abs(totalAfter - invoice.expectedAmount).toFixed(2)} RON`)

      // Șterge duplicatele
      const idsToDelete = duplicates.map(d => d.id)
      await pool.query(`
        DELETE FROM electric_invoices_nlc
        WHERE id = ANY($1::int[])
      `, [idsToDelete])

      console.log(`   ✅ ${duplicates.length} duplicate șterse cu succes!\n`)
    } else {
      console.log(`   ℹ️  Nu s-au găsit duplicate pentru această factură\n`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ Verificare și curățare completă!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  await pool.end()
}

// Rulează scriptul
findAndFixDuplicates().catch(console.error)






