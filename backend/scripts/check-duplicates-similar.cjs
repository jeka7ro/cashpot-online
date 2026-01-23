const pg = require('pg')

const pool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function checkDuplicatesSimilar() {
  try {
    console.log('🔍 Verificare duplicate-uri similare pentru Birou...\n')
    
    // Verifică duplicate-uri apropiate (aceeași dată, locație, tip, dar sume diferite sau ID-uri diferite)
    const similarQuery = `
      SELECT 
        operational_date,
        location_name,
        expenditure_type,
        data_source,
        COUNT(*) as count,
        COUNT(DISTINCT amount) as distinct_amounts,
        SUM(amount) as total_amount,
        array_agg(id ORDER BY id) as ids,
        array_agg(amount ORDER BY id) as amounts
      FROM expenditures_sync
      WHERE department_name = 'Birou'
      GROUP BY operational_date, location_name, expenditure_type, data_source
      HAVING COUNT(*) > 1
      ORDER BY count DESC, operational_date DESC
      LIMIT 30
    `
    
    const similarResult = await pool.query(similarQuery)
    
    if (similarResult.rows.length > 0) {
      console.log('⚠️  DUPLICATE-URI SIMILARE detectate (aceeași dată, locație, tip):')
      console.log('═'.repeat(100))
      similarResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Data: ${row.operational_date}, Locație: ${row.location_name}`)
        console.log(`   Tip: ${row.expenditure_type}, Sursă: ${row.data_source}`)
        console.log(`   Apare ${row.count} ori, ${row.distinct_amounts} sume distincte`)
        console.log(`   Total: ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   ID-uri: ${row.ids.join(', ')}`)
        console.log(`   Sume: ${row.amounts.join(', ')}`)
        console.log('')
      })
    } else {
      console.log('✅ Nu există duplicate-uri similare pentru Birou')
    }
    
    // Verifică totalul general Birou
    const totalQuery = `
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Birou'
    `
    
    const totalResult = await pool.query(totalQuery)
    console.log('\n📊 TOTAL GENERAL Birou în baza de date:')
    console.log(`   Număr înregistrări: ${totalResult.rows[0].total_count}`)
    console.log(`   Suma totală: ${parseFloat(totalResult.rows[0].total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkDuplicatesSimilar()


