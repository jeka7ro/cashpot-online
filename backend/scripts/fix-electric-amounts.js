import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function fixAmounts() {
  try {
    console.log('🔧 Corectare sume în expenditures_sync pentru a folosi exact suma facturilor...\n')
    
    // Obține toate facturile unice
    const invoices = await pool.query(`
      SELECT DISTINCT
        numar_factura,
        MAX(invoice_total_amount) as invoice_total_amount,
        MAX(perioada_facturare) as perioada_facturare
      FROM electric_invoices_nlc
      WHERE numar_factura IS NOT NULL 
        AND numar_factura != 'N/A'
        AND perioada_facturare IS NOT NULL
      GROUP BY numar_factura
      ORDER BY numar_factura
    `)
    
    console.log(`📋 Găsite ${invoices.rows.length} facturi\n`)
    
    let totalFixed = 0
    
    for (const invoice of invoices.rows) {
      const numarFactura = invoice.numar_factura
      const invoiceTotalAmount = invoice.invoice_total_amount ? parseFloat(invoice.invoice_total_amount) : null
      
      // Calculează suma corectă a facturii
      const sumaFacturaResult = await pool.query(`
        SELECT 
          SUM(suma_totala) as suma_nlcs
        FROM electric_invoices_nlc
        WHERE numar_factura = $1
      `, [numarFactura])
      
      const sumaNlcs = parseFloat(sumaFacturaResult.rows[0].suma_nlcs || 0)
      const sumaCorectaFactura = invoiceTotalAmount && invoiceTotalAmount > 0 ? invoiceTotalAmount : sumaNlcs
      
      // Calculează suma actuală în expenditures_sync
      const sumaActualaResult = await pool.query(`
        SELECT SUM(amount) as total_amount
        FROM expenditures_sync
        WHERE department_name = 'Electricitate'
          AND description LIKE '%Factură ' || $1 || '%'
      `, [numarFactura])
      
      const sumaActuala = parseFloat(sumaActualaResult.rows[0].total_amount || 0)
      
      // Dacă sumele sunt diferite, corectează
      if (Math.abs(sumaActuala - sumaCorectaFactura) > 0.01) {
        const diferenta = sumaCorectaFactura - sumaActuala
        const factorCorectie = sumaCorectaFactura / sumaActuala
        
        console.log(`  ${numarFactura}:`)
        console.log(`    Suma corectă: ${sumaCorectaFactura.toFixed(2)} RON`)
        console.log(`    Suma actuală: ${sumaActuala.toFixed(2)} RON`)
        console.log(`    Diferență: ${diferenta.toFixed(2)} RON`)
        console.log(`    Factor corecție: ${factorCorectie.toFixed(6)}`)
        
        // Actualizează toate înregistrările pentru această factură cu factorul de corecție
        const updateResult = await pool.query(`
          UPDATE expenditures_sync
          SET amount = amount * $1
          WHERE department_name = 'Electricitate'
            AND description LIKE '%Factură ' || $2 || '%'
          RETURNING id
        `, [factorCorectie, numarFactura])
        
        console.log(`    ✅ Actualizate ${updateResult.rowCount} înregistrări\n`)
        totalFixed += updateResult.rowCount
      }
    }
    
    // Verifică suma finală
    const finalTotal = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
    `)
    
    console.log(`\n📊 Rezumat:`)
    console.log(`   Facturi corectate: ${totalFixed > 0 ? 'Da' : 'Nu'}`)
    console.log(`   Total înregistrări: ${finalTotal.rows[0].total_records}`)
    console.log(`   Suma totală: ${parseFloat(finalTotal.rows[0].total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    
    // Verifică suma corectă totală
    const invoicesTotal = await pool.query(`
      SELECT 
        numar_factura,
        MAX(invoice_total_amount) as invoice_total,
        SUM(suma_totala) as suma_nlcs
      FROM electric_invoices_nlc
      WHERE numar_factura IS NOT NULL AND numar_factura != 'N/A'
      GROUP BY numar_factura
    `)
    
    let totalCorrect = 0
    invoicesTotal.rows.forEach(r => {
      const invoiceTotal = parseFloat(r.invoice_total || 0)
      const sumaNlcs = parseFloat(r.suma_nlcs || 0)
      totalCorrect += invoiceTotal > 0 ? invoiceTotal : sumaNlcs
    })
    
    console.log(`   Suma corectă (din facturi): ${totalCorrect.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    console.log(`   Diferență: ${(parseFloat(finalTotal.rows[0].total_amount || 0) - totalCorrect).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

if (process.argv.includes('--fix')) {
  fixAmounts()
} else {
  console.log('💡 Pentru a corecta sumele, rulează scriptul cu --fix:')
  console.log('   node backend/scripts/fix-electric-amounts.js --fix')
}
