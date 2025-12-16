/**
 * Script pentru verificarea statusului facturilor problematice
 * Identifică care facturi trebuie reimportate și care sunt deja în sistem
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

const problematicInvoices = [
  'EFI2524845289',
  'EFI2539961853',
  'EFI2543071392',
  'EFI2539685342',
  'EFI2543222246',
  'EFI2539807871',
  'EFI2539567423'
]

async function checkInvoicesStatus() {
  console.log('\n📋 STATUS FACTURI PROBLEMATICE')
  console.log('='.repeat(80))
  
  const toReimport = []
  const existsButNeedsFix = []
  const existsAndOk = []
  
  for (const invoiceNum of problematicInvoices) {
    const normalizedInvoiceNum = invoiceNum.replace(/\//g, '').replace(/\s/g, '').toUpperCase()
    
    const checkResult = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(suma_totala) as total_suma,
        STRING_AGG(DISTINCT numar_contor::text, ', ') as contori
      FROM electric_invoices_nlc
      WHERE UPPER(REPLACE(REPLACE(TRIM(numar_factura), '/', ''), ' ', '')) = $1
    `, [normalizedInvoiceNum])
    
    const count = parseInt(checkResult.rows[0]?.count || 0)
    const totalSuma = parseFloat(checkResult.rows[0]?.total_suma || 0)
    const contori = checkResult.rows[0]?.contori || 'N/A'
    
    if (count === 0) {
      toReimport.push({
        factura: invoiceNum,
        status: 'ȘTEARSĂ - TREBUIE REIMPORTATĂ',
        contor: 'N/A - Furnizează din factură'
      })
    } else {
      // Verifică dacă are probleme (ex: sume greșite, contor lipsă)
      const hasIssues = contori === 'N/A' || totalSuma === 0
      
      if (hasIssues) {
        existsButNeedsFix.push({
          factura: invoiceNum,
          status: 'EXISTĂ ÎN DB - TREBUIE CORECTATĂ',
          count: count,
          suma: totalSuma,
          contor: contori
        })
      } else {
        existsAndOk.push({
          factura: invoiceNum,
          status: 'EXISTĂ ÎN DB',
          count: count,
          suma: totalSuma,
          contor: contori
        })
      }
    }
  }
  
  console.log('\n🔴 FACTURI DE REIMPORTAT (Șterse din DB):')
  console.log('-'.repeat(80))
  if (toReimport.length === 0) {
    console.log('   ✅ Toate facturile există în baza de date')
  } else {
    toReimport.forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.factura} - ${inv.status}`)
      console.log(`      Contor: ${inv.contor}`)
    })
  }
  
  console.log('\n🟡 FACTURI CARE EXISTĂ DAR TREBUIE CORECTATE:')
  console.log('-'.repeat(80))
  if (existsButNeedsFix.length === 0) {
    console.log('   ✅ Nu sunt facturi care necesită corecții')
  } else {
    existsButNeedsFix.forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.factura} - ${inv.status}`)
      console.log(`      Înregistrări: ${inv.count}`)
      console.log(`      Suma: ${inv.suma.toFixed(2)} RON`)
      console.log(`      Contor: ${inv.contor}`)
    })
  }
  
  console.log('\n🟢 FACTURI CARE EXISTĂ ȘI PAR OK:')
  console.log('-'.repeat(80))
  if (existsAndOk.length === 0) {
    console.log('   ⚠️  Nu sunt facturi care par OK')
  } else {
    existsAndOk.forEach((inv, idx) => {
      console.log(`   ${idx + 1}. ${inv.factura} - ${inv.status}`)
      console.log(`      Înregistrări: ${inv.count}`)
      console.log(`      Suma: ${inv.suma.toFixed(2)} RON`)
      console.log(`      Contor: ${inv.contor}`)
    })
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 REZUMAT:')
  console.log(`   🔴 De reimportat: ${toReimport.length}`)
  console.log(`   🟡 De corectat: ${existsButNeedsFix.length}`)
  console.log(`   🟢 OK: ${existsAndOk.length}`)
  console.log(`   📄 Total: ${problematicInvoices.length}`)
  
  console.log('\n📝 ACȚIUNI NECESARE:')
  console.log('-'.repeat(80))
  if (toReimport.length > 0) {
    console.log('\n1. REIMPORTĂ următoarele facturi (cu numerele de contor corecte):')
    toReimport.forEach((inv) => {
      console.log(`   - ${inv.factura}`)
    })
  }
  
  if (existsButNeedsFix.length > 0) {
    console.log('\n2. CORECTEAZĂ următoarele facturi (verifică sume și contori):')
    existsButNeedsFix.forEach((inv) => {
      console.log(`   - ${inv.factura} (${inv.count} înregistrări, suma: ${inv.suma.toFixed(2)} RON)`)
    })
  }
  
  if (toReimport.length === 0 && existsButNeedsFix.length === 0) {
    console.log('\n   ✅ Toate facturile sunt în sistem și par OK!')
  }
  
  await pool.end()
}

checkInvoicesStatus()
  .then(() => {
    console.log('\n✅ Script finalizat')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Eroare fatală:', error)
    process.exit(1)
  })




