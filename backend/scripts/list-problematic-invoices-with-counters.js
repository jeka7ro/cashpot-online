/**
 * Script pentru listarea facturilor problematice cu numerele de contor asociate
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Facturi problematice identificate
const problematicInvoices = [
  'EFI2524845289',
  'EFI2539961853',
  'EFI2543071392',
  'EFI2539685342',
  'EFI2543222246',
  'EFI2539807871',
  'EFI2539567423'
]

// Numere de contor corecte furnizate de utilizator (din conversația anterioară)
// NOTĂ: Acestea trebuie actualizate cu valorile corecte din tabelul furnizat
const correctCounterCodes = {
  'EFI2524845289': 'N/A - Verifică în factură',
  'EFI2539961853': 'N/A - Verifică în factură',
  'EFI2543071392': 'N/A - Verifică în factură',
  'EFI2539685342': 'N/A - Verifică în factură',
  'EFI2543222246': 'N/A - Verifică în factură',
  'EFI2539807871': 'N/A - Verifică în factură',
  'EFI2539567423': 'N/A - Verifică în factură'
}

async function listProblematicInvoices() {
  console.log('\n📋 LISTA FACTURI PROBLEMATICE CU NUMERE DE CONTOR')
  console.log('='.repeat(80))
  
  try {
    const results = []
    
    for (const invoiceNum of problematicInvoices) {
      console.log(`\n📄 Factură: ${invoiceNum}`)
      console.log('-'.repeat(80))
      
      const normalizedInvoiceNum = invoiceNum.replace(/\//g, '').replace(/\s/g, '').toUpperCase()
      
      // Verifică dacă există în baza de date (chiar dacă a fost ștearsă, poate există în backup)
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
          pdf_filename
        FROM electric_invoices_nlc
        WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = $1
        ORDER BY nlc_code, id
      `, [normalizedInvoiceNum])
      
      if (checkResult.rows.length === 0) {
        console.log(`   ⚠️  Nu există în baza de date (probabil a fost ștearsă)`)
        results.push({
          factura: invoiceNum,
          status: 'Ștearsă',
          nlc_count: 0,
          nlc_codes: [],
          contor_codes: [],
          suma_totala: 0,
          correct_counter: correctCounterCodes[invoiceNum] || 'N/A'
        })
        continue
      }
      
      console.log(`   Găsite: ${checkResult.rows.length} înregistrări`)
      
      const contorCodes = new Set()
      const nlcCodes = new Set()
      let totalSum = 0
      const details = []
      
      checkResult.rows.forEach((row) => {
        if (row.numar_contor) {
          contorCodes.add(row.numar_contor)
        }
        if (row.nlc_code) {
          nlcCodes.add(row.nlc_code)
        }
        totalSum += parseFloat(row.suma_totala || 0)
        
        details.push({
          nlc: row.nlc_code || 'N/A',
          location: row.location_name || 'N/A',
          contor: row.numar_contor || 'N/A',
          suma: parseFloat(row.suma_totala || 0)
        })
      })
      
      console.log(`   Suma totală: ${totalSum.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
      console.log(`   NLC-uri: ${Array.from(nlcCodes).join(', ')}`)
      console.log(`   Numere contor (din DB): ${contorCodes.size > 0 ? Array.from(contorCodes).join(', ') : 'N/A'}`)
      console.log(`   Număr contor corect (furnizat): ${correctCounterCodes[invoiceNum] || 'N/A'}`)
      
      console.log(`\n   Detalii înregistrări:`)
      details.forEach((d, idx) => {
        console.log(`   ${idx + 1}. NLC: ${d.nlc} | Locație: ${d.location} | Contor: ${d.contor} | Suma: ${d.suma.toFixed(2)} RON`)
      })
      
      results.push({
        factura: invoiceNum,
        status: 'Există în DB',
        nlc_count: checkResult.rows.length,
        nlc_codes: Array.from(nlcCodes),
        contor_codes: Array.from(contorCodes),
        suma_totala: totalSum,
        correct_counter: correctCounterCodes[invoiceNum] || 'N/A'
      })
    }
    
    // Rezumat final
    console.log('\n' + '='.repeat(80))
    console.log('📊 REZUMAT FINAL')
    console.log('='.repeat(80))
    console.log('\nTabel formatat pentru copiere:')
    console.log('\nFactură | NLC-uri | Contor (DB) | Contor (Corect) | Suma Totală')
    console.log('-'.repeat(80))
    
    results.forEach((r) => {
      const nlcStr = (r.nlc_codes && r.nlc_codes.length > 0) ? r.nlc_codes.join(', ') : 'N/A'
      const contorDb = (r.contor_codes && r.contor_codes.length > 0) ? r.contor_codes.join(', ') : 'N/A'
      const contorCorrect = r.correct_counter || 'N/A'
      const suma = r.suma_totala ? r.suma_totala.toFixed(2) : '0.00'
      
      console.log(`${r.factura} | ${nlcStr} | ${contorDb} | ${contorCorrect} | ${suma} RON`)
    })
    
    console.log('\n' + '='.repeat(80))
    console.log(`Total facturi: ${problematicInvoices.length}`)
    console.log(`Facturi găsite în DB: ${results.filter(r => r.status === 'Există în DB').length}`)
    console.log(`Facturi șterse: ${results.filter(r => r.status === 'Ștearsă').length}`)
    
  } catch (error) {
    console.error('❌ EROARE:', error)
    throw error
  }
}

listProblematicInvoices()
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






