const pg = require('pg')

// Baza de date PostgreSQL (Render)
const pool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function checkBirouData() {
  try {
    console.log('🔍 Verificare date Birou...\n')
    
    // Verifică toate datele Birou
    const birouQuery = `
      SELECT 
        data_source,
        expenditure_type,
        location_name,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
      WHERE department_name = 'Birou'
      GROUP BY data_source, expenditure_type, location_name
      ORDER BY data_source, expenditure_type, location_name
    `
    
    const birouResult = await pool.query(birouQuery)
    
    console.log('📊 Date Birou grupate după sursă, tip și locație:')
    console.log('═'.repeat(100))
    
    let grandTotal = 0
    birouResult.rows.forEach((row, idx) => {
      const total = parseFloat(row.total_amount || 0)
      grandTotal += total
      console.log(`${idx + 1}. ${row.data_source || '(NULL)'} / ${row.expenditure_type || '(NULL)'} / ${row.location_name || '(NULL)'}`)
      console.log(`   Număr: ${row.count}, Suma: ${total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log(`   Perioadă: ${row.min_date} - ${row.max_date}`)
      console.log('')
    })
    
    console.log('═'.repeat(100))
    console.log(`💰 TOTAL GENERAL Birou: ${grandTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    console.log('')
    
    // Verifică duplicate-uri
    const duplicatesQuery = `
      SELECT 
        operational_date,
        amount,
        location_name,
        expenditure_type,
        data_source,
        COUNT(*) as count,
        array_agg(id) as ids
      FROM expenditures_sync
      WHERE department_name = 'Birou'
      GROUP BY operational_date, amount, location_name, expenditure_type, data_source
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `
    
    const duplicatesResult = await pool.query(duplicatesQuery)
    
    if (duplicatesResult.rows.length > 0) {
      console.log('⚠️  DUPLICATE-URI detectate:')
      console.log('─'.repeat(100))
      duplicatesResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Data: ${row.operational_date}, Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   Locație: ${row.location_name}, Tip: ${row.expenditure_type}, Sursă: ${row.data_source}`)
        console.log(`   Apare ${row.count} ori, ID-uri: ${row.ids.join(', ')}`)
        console.log('')
      })
    } else {
      console.log('✅ Nu există duplicate-uri pentru Birou')
    }
    
    // Verifică datele per locație
    console.log('\n📊 Totaluri Birou per locație:')
    console.log('─'.repeat(100))
    const locationQuery = `
      SELECT 
        location_name,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Birou'
      GROUP BY location_name
      ORDER BY location_name
    `
    
    const locationResult = await pool.query(locationQuery)
    locationResult.rows.forEach(row => {
      console.log(`   ${row.location_name || '(NULL)'}: ${row.count} înregistrări, ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    })
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkBirouData()
