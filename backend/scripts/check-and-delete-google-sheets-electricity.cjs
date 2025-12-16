const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function checkAndDeleteGoogleSheetsElectricity() {
  try {
    console.log('🔍 Verificare date Google Sheets pentru Electricitate (2024-2025)...\n')
    
    // Verifică datele existente
    const checkQuery = `
      SELECT 
        data_source,
        department_name,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
      GROUP BY data_source, department_name
      ORDER BY data_source
    `
    
    const checkResult = await pool.query(checkQuery)
    
    console.log('📊 Date Electricitate 2024-2025 grupate după sursă:')
    console.log('─'.repeat(80))
    checkResult.rows.forEach(row => {
      console.log(`Sursă: ${row.data_source || '(NULL)'}`)
      console.log(`  Departament: ${row.department_name}`)
      console.log(`  Număr înregistrări: ${row.count}`)
      console.log(`  Suma totală: ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      console.log(`  Perioadă: ${row.min_date} - ${row.max_date}`)
      console.log('')
    })
    
    // Verifică datele Google Sheets specifice
    const googleSheetsQuery = `
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
        AND department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
    `
    
    const gsResult = await pool.query(googleSheetsQuery)
    const gsCount = parseInt(gsResult.rows[0].count) || 0
    const gsTotal = parseFloat(gsResult.rows[0].total_amount || 0)
    
    console.log('📋 Date Google Sheets Electricitate 2024-2025:')
    console.log('─'.repeat(80))
    console.log(`Număr înregistrări: ${gsCount}`)
    console.log(`Suma totală: ${gsTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    if (gsCount > 0) {
      console.log(`Perioadă: ${gsResult.rows[0].min_date} - ${gsResult.rows[0].max_date}`)
    }
    console.log('')
    
    if (gsCount === 0) {
      console.log('✅ Nu există date Google Sheets pentru Electricitate 2024-2025.')
      console.log('💡 Verifică dacă datele au alt `data_source` sau dacă au fost deja șterse.\n')
      
      // Verifică toate sursele pentru Electricitate
      console.log('🔍 Verificare TOATE sursele pentru Electricitate 2024-2025:')
      const allSourcesResult = await pool.query(`
        SELECT 
          data_source,
          COUNT(*) as count,
          SUM(amount) as total_amount
        FROM expenditures_sync
        WHERE department_name = 'Electricitate'
          AND operational_date >= '2024-01-01'
          AND operational_date < '2026-01-01'
        GROUP BY data_source
        ORDER BY data_source
      `)
      
      allSourcesResult.rows.forEach(row => {
        console.log(`  ${row.data_source || '(NULL)'}: ${row.count} înregistrări, ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
      })
      console.log('')
      
      await pool.end()
      return
    }
    
    // Confirmă ștergerea
    console.log('⚠️  ATENȚIE: Urmează să ștergi datele Google Sheets pentru Electricitate 2024-2025!')
    console.log(`   Se vor șterge ${gsCount} înregistrări cu suma totală de ${gsTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    console.log('')
    
    // Pentru siguranță, cere confirmare
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => {
      rl.question('❓ Confirmi ștergerea? (scrie "DA" pentru a confirma): ', resolve)
    })
    
    rl.close()
    
    if (answer.trim().toUpperCase() !== 'DA') {
      console.log('❌ Ștergerea a fost anulată.')
      await pool.end()
      return
    }
    
    // Șterge datele
    console.log('\n🗑️  Ștergere date Google Sheets Electricitate 2024-2025...')
    const deleteQuery = `
      DELETE FROM expenditures_sync
      WHERE data_source = 'google_sheets'
        AND department_name = 'Electricitate'
        AND operational_date >= '2024-01-01'
        AND operational_date < '2026-01-01'
    `
    
    const deleteResult = await pool.query(deleteQuery)
    
    console.log(`✅ Șterse ${deleteResult.rowCount} înregistrări Google Sheets pentru Electricitate 2024-2025.`)
    
    // Verifică din nou
    const verifyResult = await pool.query(googleSheetsQuery)
    const remainingCount = parseInt(verifyResult.rows[0].count) || 0
    
    if (remainingCount === 0) {
      console.log('✅ Confirmare: Nu mai există date Google Sheets pentru Electricitate 2024-2025.')
    } else {
      console.log(`⚠️  ATENȚIE: Încă există ${remainingCount} înregistrări Google Sheets pentru Electricitate 2024-2025!`)
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkAndDeleteGoogleSheetsElectricity()
