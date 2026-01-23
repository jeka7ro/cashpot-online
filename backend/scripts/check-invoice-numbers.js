/**
 * Script pentru verificarea numărului exact al facturilor în baza de date
 */

import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

const invoicesToCheck = [
  'EFI2539961855',
  'EFI2536366515',
  'EFI2532743440',
  'EFI2532743443',
  'EFI2539961853'
]

async function checkInvoices() {
  console.log('🔍 Verificare numere facturi în baza de date...\n')

  for (const invoiceNum of invoicesToCheck) {
    console.log(`\n📋 Căutare: ${invoiceNum}`)
    
    // Caută exact
    let result = await pool.query(`
      SELECT 
        id,
        numar_factura,
        nlc_code,
        location_name,
        suma_totala,
        COUNT(*) OVER() as total_count
      FROM electric_invoices_nlc
      WHERE numar_factura = $1
      ORDER BY id
    `, [invoiceNum])

    if (result.rows.length > 0) {
      console.log(`   ✅ Găsit exact: ${result.rows.length} înregistrări`)
      result.rows.forEach(row => {
        console.log(`      ID: ${row.id}, NLC: ${row.nlc_code}, Loc: ${row.location_name}, Suma: ${row.suma_totala}`)
      })
    } else {
      // Caută cu LIKE
      result = await pool.query(`
        SELECT 
          id,
          numar_factura,
          nlc_code,
          location_name,
          suma_totala,
          COUNT(*) OVER() as total_count
        FROM electric_invoices_nlc
        WHERE numar_factura LIKE $1
        ORDER BY id
      `, [`%${invoiceNum.substring(3)}%`]) // Fără prefix EFI

      if (result.rows.length > 0) {
        console.log(`   ⚠️  Găsit cu LIKE: ${result.rows.length} înregistrări`)
        result.rows.forEach(row => {
          console.log(`      ID: ${row.id}, Factură: "${row.numar_factura}", NLC: ${row.nlc_code}, Loc: ${row.location_name}, Suma: ${row.suma_totala}`)
        })
      } else {
        console.log(`   ❌ Nu găsit`)
      }
    }
  }

  // Verifică și toate facturile care conțin aceste numere
  console.log('\n\n🔍 Verificare facturi care conțin aceste numere...\n')
  for (const invoiceNum of invoicesToCheck) {
    const numericPart = invoiceNum.replace(/^EFI/i, '')
    const result = await pool.query(`
      SELECT 
        id,
        numar_factura,
        nlc_code,
        location_name,
        suma_totala,
        SUM(suma_totala) OVER (PARTITION BY numar_factura) as total_per_invoice
      FROM electric_invoices_nlc
      WHERE numar_factura LIKE $1
      ORDER BY numar_factura, id
    `, [`%${numericPart}%`])

    if (result.rows.length > 0) {
      console.log(`\n📋 Facturi care conțin "${numericPart}":`)
      const grouped = {}
      result.rows.forEach(row => {
        const invNum = row.numar_factura
        if (!grouped[invNum]) {
          grouped[invNum] = []
        }
        grouped[invNum].push(row)
      })

      for (const [invNum, rows] of Object.entries(grouped)) {
        const total = rows.reduce((sum, r) => sum + parseFloat(r.suma_totala || 0), 0)
        console.log(`   "${invNum}": ${rows.length} înregistrări, Total: ${total.toFixed(2)} RON`)
        rows.forEach(row => {
          console.log(`      → ID: ${row.id}, NLC: ${row.nlc_code}, Loc: ${row.location_name}, Suma: ${row.suma_totala}`)
        })
      }
    }
  }

  await pool.end()
}

checkInvoices().catch(console.error)






