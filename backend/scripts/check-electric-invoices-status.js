import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function checkInvoiceStatus() {
  try {
    console.log('🔍 Verificare status facturi electrice...\n')
    
    // Obține toate înregistrările din electric_invoices_nlc
    const allRecords = await pool.query(`
      SELECT 
        numar_factura,
        saved_to_expenditures,
        data_emiterii,
        perioada_facturare,
        location_name,
        nlc_code
      FROM electric_invoices_nlc
      WHERE numar_factura IS NOT NULL AND numar_factura != 'N/A'
      ORDER BY numar_factura, nlc_code
    `)
    
    console.log(`📊 Total înregistrări NLC: ${allRecords.rows.length}`)
    
    // Grupează pe facturi
    const invoicesMap = new Map()
    
    allRecords.rows.forEach(record => {
      const invoiceNum = record.numar_factura
      
      if (!invoicesMap.has(invoiceNum)) {
        invoicesMap.set(invoiceNum, {
          numar_factura: invoiceNum,
          saved_to_expenditures: record.saved_to_expenditures,
          nlcs: [],
          locations: new Set(),
          dates: []
        })
      }
      
      const invoice = invoicesMap.get(invoiceNum)
      invoice.nlcs.push(record.nlc_code)
      invoice.locations.add(record.location_name)
      if (record.data_emiterii) {
        invoice.dates.push(record.data_emiterii)
      }
      
      // Dacă cel puțin un NLC din factură este salvat, considerăm factura ca salvată
      if (record.saved_to_expenditures === true) {
        invoice.saved_to_expenditures = true
      }
    })
    
    const invoices = Array.from(invoicesMap.values())
    
    // Separa facturile salvate de cele nesalvate
    const savedInvoices = invoices.filter(inv => inv.saved_to_expenditures === true)
    const unsavedInvoices = invoices.filter(inv => inv.saved_to_expenditures !== true)
    
    console.log(`\n📋 Total facturi unice: ${invoices.length}`)
    console.log(`✅ Facturi salvate în cheltuieli: ${savedInvoices.length}`)
    console.log(`❌ Facturi netransferate: ${unsavedInvoices.length}`)
    
    // Detalii pentru facturile netransferate
    if (unsavedInvoices.length > 0) {
      console.log(`\n🔴 Facturi netransferate (${unsavedInvoices.length}):`)
      console.log('='.repeat(80))
      
      unsavedInvoices.forEach((invoice, index) => {
        const minDate = invoice.dates.length > 0 ? new Date(Math.min(...invoice.dates.map(d => new Date(d)))).toLocaleDateString('ro-RO') : 'N/A'
        const locations = Array.from(invoice.locations).sort().join(', ')
        
        console.log(`\n${index + 1}. ${invoice.numar_factura}`)
        console.log(`   📅 Data emitere: ${minDate}`)
        console.log(`   📍 Locații: ${locations}`)
        console.log(`   🔢 NLC-uri: ${invoice.nlcs.length} (${invoice.nlcs.slice(0, 3).join(', ')}${invoice.nlcs.length > 3 ? '...' : ''})`)
      })
    }
    
    // Detalii pentru facturile salvate
    if (savedInvoices.length > 0) {
      console.log(`\n\n✅ Facturi salvate în cheltuieli (${savedInvoices.length}):`)
      console.log('='.repeat(80))
      
      // Arată primele 10 pentru exemplu
      const toShow = savedInvoices.slice(0, 10)
      toShow.forEach((invoice, index) => {
        const minDate = invoice.dates.length > 0 ? new Date(Math.min(...invoice.dates.map(d => new Date(d)))).toLocaleDateString('ro-RO') : 'N/A'
        console.log(`${index + 1}. ${invoice.numar_factura} (${minDate}) - ${invoice.nlcs.length} NLC-uri`)
      })
      
      if (savedInvoices.length > 10) {
        console.log(`   ... și încă ${savedInvoices.length - 10} facturi`)
      }
    }
    
    // Statistici per an
    console.log(`\n\n📊 Statistici per an:`)
    console.log('='.repeat(80))
    
    const byYear = {}
    invoices.forEach(invoice => {
      if (invoice.dates.length > 0) {
        const minDate = new Date(Math.min(...invoice.dates.map(d => new Date(d))))
        const year = minDate.getFullYear()
        
        if (!byYear[year]) {
          byYear[year] = { total: 0, saved: 0, unsaved: 0 }
        }
        
        byYear[year].total++
        if (invoice.saved_to_expenditures) {
          byYear[year].saved++
        } else {
          byYear[year].unsaved++
        }
      }
    })
    
    Object.keys(byYear).sort().forEach(year => {
      const stats = byYear[year]
      console.log(`\n${year}:`)
      console.log(`   Total facturi: ${stats.total}`)
      console.log(`   ✅ Salvate: ${stats.saved}`)
      console.log(`   ❌ Netransferate: ${stats.unsaved}`)
    })
    
    // Verifică și în expenditures_sync
    console.log(`\n\n🔍 Verificare în expenditures_sync:`)
    console.log('='.repeat(80))
    
    const expendituresCheck = await pool.query(`
      SELECT COUNT(DISTINCT 
        CASE 
          WHEN description LIKE '%Factură EFI/%' THEN 
            SUBSTRING(description FROM '%Factură (EFI[/-]?[0-9]+)%')
          WHEN description LIKE '%Factură EFI%' THEN 
            SUBSTRING(description FROM '%Factură (EFI[^|]+)%')
          ELSE NULL
        END
      ) as unique_invoices,
      COUNT(*) as total_records
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
    `)
    
    const expendituresStats = expendituresCheck.rows[0]
    console.log(`   Total înregistrări electrice în expenditures_sync: ${expendituresStats.total_records}`)
    console.log(`   Facturi unice detectate: ${expendituresStats.unique_invoices || 'N/A (nu s-au putut extrage)'}`)
    
    console.log(`\n\n💡 Rezumat:`)
    console.log('='.repeat(80))
    console.log(`   • Total facturi în centralizator: ${invoices.length}`)
    console.log(`   • Facturi salvate: ${savedInvoices.length}`)
    console.log(`   • Facturi de transferat: ${unsavedInvoices.length}`)
    console.log(`   • Înregistrări în expenditures_sync: ${expendituresStats.total_records}`)
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkInvoiceStatus()
