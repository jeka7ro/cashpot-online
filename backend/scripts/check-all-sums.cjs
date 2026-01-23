const pg = require('pg')

const pool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function checkAllSums() {
  try {
    console.log('🔍 Verificare sume totale...\n')
    
    // Total general
    const totalResult = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount
      FROM expenditures_sync
    `)
    
    console.log('📊 TOTAL GENERAL:')
    console.log(`   Număr înregistrări: ${totalResult.rows[0].total_count}`)
    console.log(`   Suma totală: ${parseFloat(totalResult.rows[0].total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    console.log('')
    
    // Total per sursă
    const sourceResult = await pool.query(`
      SELECT 
        data_source,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      GROUP BY data_source
      ORDER BY data_source
    `)
    
    console.log('📊 Total per sursă:')
    sourceResult.rows.forEach(row => {
      console.log(`   ${row.data_source || '(NULL)'}: ${row.count} înregistrări, ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    })
    console.log('')
    
    // Verifică duplicate-uri care pot dubla sumele
    const duplicatesQuery = `
      SELECT 
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        data_source,
        COUNT(*) as count,
        array_agg(id) as ids
      FROM expenditures_sync
      GROUP BY operational_date, amount, location_name, department_name, expenditure_type, data_source
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `
    
    const duplicatesResult = await pool.query(duplicatesQuery)
    
    if (duplicatesResult.rows.length > 0) {
      console.log('⚠️  DUPLICATE-URI detectate (pot dubla sumele):')
      duplicatesResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Data: ${row.operational_date}, Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   Locație: ${row.location_name}, Departament: ${row.department_name}, Tip: ${row.expenditure_type}`)
        console.log(`   Sursă: ${row.data_source}, Apare ${row.count} ori, ID-uri: ${row.ids.join(', ')}`)
        console.log('')
      })
    } else {
      console.log('✅ Nu există duplicate-uri exacte')
    }
    
    // Verifică sume negative sau suspecte
    const suspiciousQuery = `
      SELECT 
        COUNT(*) as negative_count,
        SUM(amount) as negative_total
      FROM expenditures_sync
      WHERE amount < 0
    `
    
    const suspiciousResult = await pool.query(suspiciousQuery)
    const negativeCount = parseInt(suspiciousResult.rows[0].negative_count) || 0
    
    if (negativeCount > 0) {
      console.log(`⚠️  Există ${negativeCount} înregistrări cu sume negative`)
      console.log(`   Total sume negative: ${parseFloat(suspiciousResult.rows[0].negative_total || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkAllSums()


