/**
 * Script pentru ștergerea facturilor problematice și afișarea numerelor de contor
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Facturi problematice de șters
const problematicInvoices = [
  'EFI2524845289',
  'EFI2539961853',
  'EFI2543071392',
  'EFI2539685342',
  'EFI2543222246',
  'EFI2539807871',
  'EFI2539567423'
]

async function deleteProblematicInvoices() {
  console.log('\n🔍 VERIFICARE ȘI ȘTERGERE FACTURI PROBLEMATICE')
  console.log('='.repeat(80))
  
  try {
    for (const invoiceNum of problematicInvoices) {
      console.log(`\n📄 Factură: ${invoiceNum}`)
      console.log('-'.repeat(80))
      
      // Normalizează numărul facturii
      const normalizedInvoiceNum = invoiceNum.replace(/\//g, '').replace(/\s/g, '').toUpperCase()
      
      // Verifică ce există în baza de date
      const checkResult = await pool.query(`
        SELECT 
          id,
          nlc_code,
          location_name,
          numar_factura,
          numar_contor,
          suma_totala,
          suma_activa,
          suma_reactiva,
          consum_kwh,
          perioada_facturare,
          data_emiterii,
          invoice_file_path,
          pdf_filename
        FROM electric_invoices_nlc
        WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = $1
        ORDER BY nlc_code, id
      `, [normalizedInvoiceNum])
      
      if (checkResult.rows.length === 0) {
        console.log(`   ⚠️  Nu există în baza de date`)
        continue
      }
      
      console.log(`   Găsite: ${checkResult.rows.length} înregistrări`)
      
      // Afișează numerele de contor
      const contorCodes = new Set()
      const totalSum = checkResult.rows.reduce((sum, row) => {
        if (row.numar_contor) {
          contorCodes.add(row.numar_contor)
        }
        return sum + parseFloat(row.suma_totala || 0)
      }, 0)
      
      console.log(`   Suma totală: ${totalSum.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
      console.log(`   Numere contor: ${contorCodes.size > 0 ? Array.from(contorCodes).join(', ') : 'N/A'}`)
      
      console.log(`\n   Detalii înregistrări:`)
      checkResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ID: ${row.id}`)
        console.log(`      NLC: ${row.nlc_code || 'N/A'}`)
        console.log(`      Locație: ${row.location_name || 'N/A'}`)
        console.log(`      Contor: ${row.numar_contor || 'N/A'}`)
        console.log(`      Suma: ${parseFloat(row.suma_totala || 0).toFixed(2)} RON`)
        console.log(`      Perioadă: ${row.perioada_facturare || 'N/A'}`)
        if (row.pdf_filename) {
          console.log(`      PDF: ${row.pdf_filename}`)
        }
      })
      
      // Șterge înregistrările
      const deleteResult = await pool.query(`
        DELETE FROM electric_invoices_nlc
        WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = $1
        RETURNING id
      `, [normalizedInvoiceNum])
      
      console.log(`\n   ✅ Șterse: ${deleteResult.rows.length} înregistrări`)
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ ȘTERGERE COMPLETĂ')
    console.log('='.repeat(80))
    
    // Rezumat final
    console.log('\n📊 REZUMAT:')
    console.log('-'.repeat(80))
    console.log(`Facturi procesate: ${problematicInvoices.length}`)
    
  } catch (error) {
    console.error('❌ EROARE:', error)
    throw error
  }
}

// Rulează ștergerea
deleteProblematicInvoices()
  .then(() => {
    console.log('\n✅ Script finalizat')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Eroare fatală:', error)
    process.exit(1)
  })
  .finally(() => {
    pool.end()
  })






