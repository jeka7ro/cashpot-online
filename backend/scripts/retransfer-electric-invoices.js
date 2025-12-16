import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function retransferInvoices() {
  try {
    console.log('🔄 Retransfer facturi electrice cu sumele corecte...\n')
    
    // Obține toate facturile unice din centralizator
    const invoicesResult = await pool.query(`
      SELECT DISTINCT
        numar_factura,
        MAX(invoice_total_amount) as invoice_total_amount,
        MAX(perioada_facturare) as perioada_facturare,
        MAX(furnizor) as furnizor,
        MAX(pret_per_kwh) as pret_per_kwh,
        MAX(tva) as tva
      FROM electric_invoices_nlc
      WHERE numar_factura IS NOT NULL 
        AND numar_factura != 'N/A'
        AND perioada_facturare IS NOT NULL
      GROUP BY numar_factura
      ORDER BY numar_factura
    `)
    
    console.log(`📋 Găsite ${invoicesResult.rows.length} facturi unice\n`)
    
    const normalizedLocation = (locationName) => {
      if (!locationName) return 'N/A'
      return String(locationName).trim()
    }
    
    let totalSaved = 0
    let processedCount = 0
    
    for (const invoice of invoicesResult.rows) {
      try {
        const numarFactura = invoice.numar_factura
        const invoiceTotalAmount = invoice.invoice_total_amount ? parseFloat(invoice.invoice_total_amount) : null
        
        // Obține toate NLC-urile pentru această factură
        const nlcsResult = await pool.query(`
          SELECT 
            nlc_code,
            location_name,
            perioada_facturare,
            suma_activa,
            suma_reactiva,
            suma_totala,
            consum_kwh,
            pret_per_kwh
          FROM electric_invoices_nlc
          WHERE numar_factura = $1
          ORDER BY nlc_code
        `, [numarFactura])
        
        const nlcData = nlcsResult.rows.map(nlc => ({
          nlc: nlc.nlc_code,
          location: nlc.location_name,
          period: nlc.perioada_facturare,
          suma: parseFloat(nlc.suma_activa || 0),
          sumaReactiva: parseFloat(nlc.suma_reactiva || 0),
          sumaTotala: parseFloat(nlc.suma_totala || (nlc.suma_activa || 0) + (nlc.suma_reactiva || 0)),
          consum: parseFloat(nlc.consum_kwh || 0),
          pretCalculat: parseFloat(nlc.pret_per_kwh || 0)
        }))
        
        if (nlcData.length === 0) {
          console.log(`   ⚠️ Skip ${numarFactura} - fără NLC-uri`)
          continue
        }
        
        // Calculează suma totală a facturii
        const totalSumaFactura = invoiceTotalAmount && invoiceTotalAmount > 0
          ? invoiceTotalAmount
          : nlcData.reduce((sum, nlc) => sum + (parseFloat(nlc.sumaTotala || nlc.suma || 0)), 0)
        
        // Calculează consumul total pentru distribuția proporțională
        const totalConsumFactura = nlcData.reduce((sum, nlc) => sum + (parseFloat(nlc.consum || 0)), 0)
        
        // Parsează perioada
        const periodMatch = invoice.perioada_facturare?.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/)
        if (!periodMatch) {
          console.log(`   ⚠️ Skip ${numarFactura} - perioadă invalidă: ${invoice.perioada_facturare}`)
          continue
        }
        
        const startDate = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]))
        const endDate = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]))
        const zileTotale = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
        
        // Calculează luni acoperite
        const luniAcoperite = []
        let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
        
        while (current <= endDate) {
          const luna = current.getMonth() + 1
          const an = current.getFullYear()
          const primaDinLuna = new Date(an, luna - 1, 1)
          const ultimaDinLuna = new Date(an, luna, 0)
          const inceputEfectiv = startDate > primaDinLuna ? startDate : primaDinLuna
          const sfarsitEfectiv = endDate < ultimaDinLuna ? endDate : ultimaDinLuna
          
          if (inceputEfectiv <= sfarsitEfectiv) {
            const zileInLuna = Math.floor((sfarsitEfectiv - inceputEfectiv) / (1000 * 60 * 60 * 24)) + 1
            const proportie = zileTotale > 0 ? zileInLuna / zileTotale : 1
            
            luniAcoperite.push({
              luna: luna,
              an: an,
              dataExpenditure: `${an}-${String(luna).padStart(2, '0')}-01`,
              zile: zileInLuna,
              proportie: proportie
            })
          }
          
          current.setMonth(current.getMonth() + 1)
        }
        
        let savedCount = 0
        
        // Procesează fiecare NLC
        for (const nlc of nlcData) {
          const consumKwh = parseFloat(nlc.consum || 0)
          
          // Distribuie suma facturii proporțional pe baza consumului
          let sumaDeUtilizat = 0
          if (totalConsumFactura > 0 && consumKwh > 0) {
            sumaDeUtilizat = totalSumaFactura * (consumKwh / totalConsumFactura)
          } else if (nlcData.length > 0) {
            sumaDeUtilizat = totalSumaFactura / nlcData.length
          } else {
            sumaDeUtilizat = parseFloat(nlc.sumaTotala || nlc.suma || 0)
          }
          
          if (!sumaDeUtilizat || sumaDeUtilizat <= 0) {
            continue
          }
          
          const normalizedLoc = normalizedLocation(nlc.location)
          
          // Salvează pentru fiecare lună
          for (const lunaInfo of luniAcoperite) {
            try {
              const sumaPerLuna = sumaDeUtilizat * lunaInfo.proportie
              const consumPerLuna = consumKwh * lunaInfo.proportie
              
              // Verifică dacă există deja
              const existingCheck = await pool.query(`
                SELECT id FROM expenditures_sync 
                WHERE operational_date = $1 
                  AND location_name = $2 
                  AND department_name = 'Electricitate'
                  AND (
                    description LIKE '%NLC: ' || $3 || '%'
                    OR description LIKE '%Factură ' || $4 || '%'
                  )
                  AND ABS(amount - $5) < 0.01
                LIMIT 1
              `, [lunaInfo.dataExpenditure, normalizedLoc, nlc.nlc, numarFactura, sumaPerLuna])
              
              if (existingCheck.rows.length > 0) {
                continue
              }
              
              const description = `Factură ${numarFactura} | NLC: ${nlc.nlc} | Perioadă: ${invoice.perioada_facturare} | ${lunaInfo.zile} zile (${(lunaInfo.proportie * 100).toFixed(1)}%) | Consum: ${consumPerLuna.toFixed(2)} kWh`
              
              await pool.query(`
                INSERT INTO expenditures_sync (
                  location_name,
                  department_name,
                  expenditure_type,
                  amount,
                  operational_date,
                  description,
                  data_source,
                  synced_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING id
              `, [
                normalizedLoc,
                'Electricitate',
                'Factură Reală',
                sumaPerLuna,
                lunaInfo.dataExpenditure,
                description,
                'electric_invoice'
              ])
              
              savedCount++
            } catch (saveError) {
              console.error(`   ❌ Eroare la salvare pentru ${lunaInfo.luna}/${lunaInfo.an}:`, saveError.message)
            }
          }
        }
        
        // Marchează factura ca salvată
        await pool.query(`
          UPDATE electric_invoices_nlc
          SET saved_to_expenditures = true
          WHERE numar_factura = $1
        `, [numarFactura])
        
        totalSaved += savedCount
        processedCount++
        
        const usedAmount = invoiceTotalAmount ? `invoice_total_amount=${invoiceTotalAmount.toFixed(2)}` : `suma_nlcs=${totalSumaFactura.toFixed(2)}`
        console.log(`   ✅ ${numarFactura}: ${savedCount} înregistrări (${usedAmount} RON)`)
        
      } catch (error) {
        console.error(`   ❌ Eroare la procesarea facturii ${invoice.numar_factura}:`, error.message)
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
    console.log(`   Facturi procesate: ${processedCount}`)
    console.log(`   Total înregistrări salvate: ${totalSaved}`)
    console.log(`   Total înregistrări în expenditures_sync: ${finalTotal.rows[0].total_records}`)
    console.log(`   Suma totală: ${parseFloat(finalTotal.rows[0].total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

retransferInvoices()
