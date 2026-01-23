const pg = require('pg')

const pool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function verifyImportedSums() {
  try {
    console.log('🔍 Verificare sume importate...\n')
    
    // Verifică duplicate-uri exacte
    const duplicatesQuery = `
      SELECT 
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        COUNT(*) as count,
        array_agg(id) as ids
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
      GROUP BY operational_date, amount, location_name, department_name, expenditure_type
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 30
    `
    
    const duplicatesResult = await pool.query(duplicatesQuery)
    
    if (duplicatesResult.rows.length > 0) {
      console.log('⚠️  DUPLICATE-URI detectate:')
      console.log('═'.repeat(100))
      duplicatesResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Data: ${row.operational_date}, Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   Locație: ${row.location_name}, Departament: ${row.department_name}, Tip: ${row.expenditure_type}`)
        console.log(`   Apare ${row.count} ori, ID-uri: ${row.ids.join(', ')}`)
        console.log('')
      })
    } else {
      console.log('✅ Nu există duplicate-uri exacte')
    }
    
    // Verifică totalul general
    const totalQuery = `
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
    `
    
    const totalResult = await pool.query(totalQuery)
    console.log('\n📊 TOTAL Google Sheets:')
    console.log(`   Număr înregistrări: ${totalResult.rows[0].count}`)
    console.log(`   Suma totală: ${parseFloat(totalResult.rows[0].total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    
    // Verifică câteva exemple de sume pentru a vedea dacă sunt corecte
    const samplesQuery = `
      SELECT 
        id,
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        description
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
        AND department_name = 'Birou'
      ORDER BY operational_date DESC
      LIMIT 10
    `
    
    const samplesResult = await pool.query(samplesQuery)
    console.log('\n📋 Exemple Birou (ultimele 10):')
    samplesResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. Data: ${row.operational_date}, Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log(`   Locație: ${row.location_name}, Tip: ${row.expenditure_type}`)
      console.log(`   Descriere: ${row.description || 'N/A'}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

verifyImportedSums()


