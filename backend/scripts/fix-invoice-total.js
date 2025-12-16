/**
 * Script pentru verificarea și corectarea sumei totale a facturii EFI/2543071392
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Încarcă .env din root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function checkInvoice() {
  const invoiceNumber = 'EFI/2543071392'
  const expectedAmount = 111906.57
  
  console.log(`\n🔍 Verificare factură: ${invoiceNumber}`)
  console.log(`   Suma așteptată: ${expectedAmount.toFixed(2)} RON\n`)
  
  try {
    // Găsește toate înregistrările pentru această factură
    const result = await pool.query(`
      SELECT 
        id,
        nlc_code,
        location_name,
        numar_factura,
        perioada_facturare,
        suma_totala,
        suma_activa,
        suma_reactiva,
        consum_kwh,
        invoice_total_amount,
        extracted_at
      FROM electric_invoices_nlc
      WHERE UPPER(TRIM(numar_factura)) = $1
      ORDER BY id
    `, [invoiceNumber.toUpperCase()])
    
    if (result.rows.length === 0) {
      console.log(`❌ Factura ${invoiceNumber} nu a fost găsită în sistem`)
      return
    }
    
    console.log(`📊 Găsite ${result.rows.length} înregistrări:\n`)
    
    let totalSumaCalculata = 0
    result.rows.forEach((row, idx) => {
      const suma = parseFloat(row.suma_totala) || 0
      totalSumaCalculata += suma
      console.log(`${idx + 1}. ID: ${row.id}, NLC: ${row.nlc_code}, Locație: ${row.location_name}`)
      console.log(`   Suma totală: ${suma.toFixed(2)} RON`)
      console.log(`   Suma activă: ${row.suma_activa ? parseFloat(row.suma_activa).toFixed(2) : 'N/A'} RON`)
      console.log(`   Suma reactivă: ${row.suma_reactiva ? parseFloat(row.suma_reactiva).toFixed(2) : 'N/A'} RON`)
      console.log(`   Consum: ${row.consum_kwh ? parseFloat(row.consum_kwh).toFixed(0) : 'N/A'} kWh`)
      console.log(`   Invoice total amount: ${row.invoice_total_amount ? parseFloat(row.invoice_total_amount).toFixed(2) : 'NULL'} RON`)
      console.log('')
    })
    
    console.log(`\n💰 SUME:`)
    console.log(`   Suma calculată (din NLC-uri): ${totalSumaCalculata.toFixed(2)} RON`)
    console.log(`   Suma așteptată (din factură): ${expectedAmount.toFixed(2)} RON`)
    console.log(`   Diferență: ${Math.abs(totalSumaCalculata - expectedAmount).toFixed(2)} RON`)
    console.log(`   Procent diferență: ${((Math.abs(totalSumaCalculata - expectedAmount) / expectedAmount) * 100).toFixed(1)}%`)
    
    // Verifică dacă există un NLC cu suma prea mare
    const suspiciousNlcs = result.rows.filter(r => {
      const sumaNlc = parseFloat(r.suma_totala) || 0
      return sumaNlc > expectedAmount * 0.5 // Dacă suma NLC-ului este >50% din suma facturii, e suspect
    })
    
    if (suspiciousNlcs.length > 0) {
      console.log(`\n⚠️ NLC-URI SUSPECTE (sumă prea mare):`)
      suspiciousNlcs.forEach(nlc => {
        const sumaNlc = parseFloat(nlc.suma_totala) || 0
        const procent = (sumaNlc / expectedAmount) * 100
        console.log(`   - NLC ${nlc.nlc_code} (${nlc.location_name}): ${sumaNlc.toFixed(2)} RON (${procent.toFixed(1)}% din suma facturii)`)
        console.log(`     ID: ${nlc.id}, Suma activă: ${nlc.suma_activa ? parseFloat(nlc.suma_activa).toFixed(2) : 'N/A'} RON`)
      })
    }
    
    // Actualizează invoice_total_amount pentru toate înregistrările
    if (Math.abs(totalSumaCalculata - expectedAmount) > 1) {
      console.log(`\n🔄 Actualizare invoice_total_amount pentru toate înregistrările...`)
      const updateResult = await pool.query(`
        UPDATE electric_invoices_nlc
        SET invoice_total_amount = $1
        WHERE UPPER(TRIM(numar_factura)) = $2
      `, [expectedAmount, invoiceNumber.toUpperCase()])
      
      console.log(`   ✅ Actualizate ${updateResult.rowCount} înregistrări cu suma totală: ${expectedAmount.toFixed(2)} RON`)
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkInvoice()
