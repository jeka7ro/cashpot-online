const pg = require('pg')

// Baza de date PostgreSQL (Render)
const pool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function checkAmountsIssue() {
  try {
    console.log('🔍 Verificare sume pentru Birou...\n')
    
    // Verifică înregistrările Birou recente
    const recentQuery = `
      SELECT 
        id,
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        description,
        data_source
      FROM expenditures_sync
      WHERE department_name = 'Birou'
        AND expenditure_type = 'Facturi Management'
      ORDER BY operational_date DESC, id DESC
      LIMIT 20
    `
    
    const recentResult = await pool.query(recentQuery)
    
    console.log('📊 Ultimele 20 înregistrări Birou / Facturi Management:')
    console.log('═'.repeat(100))
    
    recentResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ID: ${row.id}, Data: ${row.operational_date}`)
      console.log(`   Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log(`   Locație: ${row.location_name}, Sursă: ${row.data_source}`)
      console.log(`   Descriere: ${row.description || 'N/A'}`)
      console.log('')
    })
    
    // Verifică duplicate-uri exacte
    const duplicatesQuery = `
      SELECT 
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        data_source,
        COUNT(*) as count,
        array_agg(id ORDER BY id) as ids
      FROM expenditures_sync
      WHERE department_name = 'Birou'
        AND expenditure_type = 'Facturi Management'
      GROUP BY operational_date, amount, location_name, department_name, expenditure_type, data_source
      HAVING COUNT(*) > 1
      ORDER BY count DESC, operational_date DESC
    `
    
    const duplicatesResult = await pool.query(duplicatesQuery)
    
    if (duplicatesResult.rows.length > 0) {
      console.log('⚠️  DUPLICATE-URI EXACTE detectate:')
      console.log('═'.repeat(100))
      duplicatesResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Data: ${row.operational_date}, Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   Locație: ${row.location_name}, Sursă: ${row.data_source}`)
        console.log(`   Apare ${row.count} ori, ID-uri: ${row.ids.join(', ')}`)
        console.log('')
      })
    } else {
      console.log('✅ Nu există duplicate-uri exacte pentru Birou / Facturi Management')
    }
    
    // Verifică totalurile per locație
    console.log('\n📊 Totaluri Birou / Facturi Management per locație:')
    console.log('─'.repeat(100))
    const totalsQuery = `
      SELECT 
        location_name,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount,
        AVG(amount) as avg_amount
      FROM expenditures_sync
      WHERE department_name = 'Birou'
        AND expenditure_type = 'Facturi Management'
      GROUP BY location_name
      ORDER BY location_name
    `
    
    const totalsResult = await pool.query(totalsQuery)
    totalsResult.rows.forEach(row => {
      console.log(`   ${row.location_name || '(NULL)'}:`)
      console.log(`     Număr: ${row.count}`)
      console.log(`     Total: ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log(`     Min: ${parseFloat(row.min_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log(`     Max: ${parseFloat(row.max_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log(`     Medie: ${parseFloat(row.avg_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log('')
    })
    
    // Verifică dacă există înregistrări cu sume suspecte (foarte mari sau foarte mici)
    const suspiciousQuery = `
      SELECT 
        id,
        operational_date,
        amount,
        location_name,
        description
      FROM expenditures_sync
      WHERE department_name = 'Birou'
        AND (amount > 100000 OR amount < 0.01)
      ORDER BY amount DESC
      LIMIT 20
    `
    
    const suspiciousResult = await pool.query(suspiciousQuery)
    
    if (suspiciousResult.rows.length > 0) {
      console.log('⚠️  Înregistrări cu sume suspecte (>100.000 sau <0.01):')
      console.log('─'.repeat(100))
      suspiciousResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ID: ${row.id}, Data: ${row.operational_date}`)
        console.log(`   Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   Locație: ${row.location_name}, Descriere: ${row.description || 'N/A'}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkAmountsIssue()


