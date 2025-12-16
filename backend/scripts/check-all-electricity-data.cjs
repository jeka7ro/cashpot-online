const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function checkAllElectricityData() {
  try {
    console.log('🔍 Verificare COMPLETĂ date Electricitate 2024-2025...\n')
    
    // 1. Verifică TOATE datele Electricitate, indiferent de sursă
    const allDataQuery = `
      SELECT 
        data_source,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date,
        array_agg(DISTINCT location_name) as locations,
        array_agg(DISTINCT expenditure_type) as types
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
      GROUP BY data_source
      ORDER BY data_source NULLS LAST
    `
    
    const allResult = await pool.query(allDataQuery)
    
    console.log('📊 TOATE datele Electricitate 2024-2025 (grupate după sursă):')
    console.log('═'.repeat(100))
    
    if (allResult.rows.length === 0) {
      console.log('❌ NU EXISTĂ date Electricitate pentru 2024-2025 în expenditures_sync!')
    } else {
      allResult.rows.forEach((row, idx) => {
        console.log(`\n${idx + 1}. Sursă: ${row.data_source || '(NULL sau gol)'}`)
        console.log(`   📈 Număr înregistrări: ${row.count}`)
        console.log(`   💰 Suma totală: ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   📅 Perioadă: ${row.min_date} - ${row.max_date}`)
        console.log(`   📍 Locații: ${row.locations?.slice(0, 5).join(', ') || 'N/A'}${row.locations?.length > 5 ? '...' : ''}`)
        console.log(`   🏷️  Tipuri: ${row.types?.slice(0, 3).join(', ') || 'N/A'}${row.types?.length > 3 ? '...' : ''}`)
      })
    }
    
    console.log('\n' + '═'.repeat(100))
    
    // 2. Verifică datele Google Sheets specifice
    const googleSheetsQuery = `
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
        AND department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
    `
    
    const gsResult = await pool.query(googleSheetsQuery)
    const gsCount = parseInt(gsResult.rows[0].count) || 0
    
    console.log(`\n📋 Date Google Sheets specifice: ${gsCount} înregistrări`)
    
    // 3. Verifică dacă există date cu data_source NULL sau gol
    const nullSourceQuery = `
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE (data_source IS NULL OR data_source = '')
        AND department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
    `
    
    const nullResult = await pool.query(nullSourceQuery)
    const nullCount = parseInt(nullResult.rows[0].count) || 0
    
    if (nullCount > 0) {
      console.log(`\n⚠️  ATENȚIE: Există ${nullCount} înregistrări cu data_source NULL sau gol!`)
      console.log(`   Suma totală: ${parseFloat(nullResult.rows[0].total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    }
    
    // 4. Verifică datele cu data_source diferit de 'google_sheets'
    const otherSourcesQuery = `
      SELECT 
        data_source,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE data_source IS NOT NULL
        AND data_source != 'google_sheets'
        AND data_source != ''
        AND department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
      GROUP BY data_source
      ORDER BY data_source
    `
    
    const otherResult = await pool.query(otherSourcesQuery)
    
    if (otherResult.rows.length > 0) {
      console.log(`\n📊 Date din alte surse (nu Google Sheets):`)
      otherResult.rows.forEach(row => {
        console.log(`   ${row.data_source}: ${row.count} înregistrări, ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      })
    }
    
    // 5. Afișează câteva exemple de înregistrări
    const sampleQuery = `
      SELECT 
        id,
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        data_source,
        description
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
      ORDER BY operational_date DESC
      LIMIT 10
    `
    
    const sampleResult = await pool.query(sampleQuery)
    
    if (sampleResult.rows.length > 0) {
      console.log(`\n📝 Exemple de înregistrări (ultimele 10):`)
      console.log('─'.repeat(100))
      sampleResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Data: ${row.operational_date}, Suma: ${parseFloat(row.amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
        console.log(`   Locație: ${row.location_name}, Tip: ${row.expenditure_type}`)
        console.log(`   Sursă: ${row.data_source || '(NULL)'}, Descriere: ${row.description || 'N/A'}`)
        console.log('')
      })
    }
    
    console.log('\n' + '═'.repeat(100))
    console.log('✅ Verificare completă terminată!')
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkAllElectricityData()
