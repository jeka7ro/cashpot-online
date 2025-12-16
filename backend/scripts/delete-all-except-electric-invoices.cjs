const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function deleteAllExceptElectricInvoices() {
  try {
    console.log('🗑️  Ștergere TOATE datele EXCEPT Electricitate din facturi electrice (modul)...\n')
    
    // 1. Verifică câte date Electricitate din facturi electrice există
    const electricInvoicesQuery = `
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
        AND data_source = 'electric_invoice'
    `
    
    const electricResult = await pool.query(electricInvoicesQuery)
    const electricCount = parseInt(electricResult.rows[0].count) || 0
    const electricTotal = parseFloat(electricResult.rows[0].total_amount || 0)
    
    console.log('📊 Date Electricitate din facturi electrice (se vor PĂSTRA):')
    console.log(`   Număr înregistrări: ${electricCount}`)
    console.log(`   Suma totală: ${electricTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    console.log('')
    
    // 2. Verifică câte date vor fi șterse
    const toDeleteQuery = `
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount,
        data_source,
        department_name
      FROM expenditures_sync
      WHERE NOT (department_name = 'Electricitate' AND data_source = 'electric_invoice')
      GROUP BY data_source, department_name
      ORDER BY data_source, department_name
    `
    
    const toDeleteResult = await pool.query(toDeleteQuery)
    
    console.log('📊 Date care vor fi ȘTERSE:')
    console.log('─'.repeat(80))
    
    let totalToDelete = 0
    let totalAmountToDelete = 0
    
    toDeleteResult.rows.forEach(row => {
      const count = parseInt(row.count) || 0
      const amount = parseFloat(row.total_amount || 0)
      totalToDelete += count
      totalAmountToDelete += amount
      
      console.log(`   ${row.data_source || '(NULL)'} / ${row.department_name}: ${count} înregistrări, ${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    })
    
    console.log('─'.repeat(80))
    console.log(`   TOTAL de șters: ${totalToDelete} înregistrări, ${totalAmountToDelete.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    console.log('')
    
    if (totalToDelete === 0) {
      console.log('✅ Nu există date de șters (toate sunt Electricitate din facturi electrice).')
      await pool.end()
      return
    }
    
    // 3. Confirmă ștergerea
    console.log('⚠️  ATENȚIE: Urmează să ștergi TOATE datele EXCEPT Electricitate din facturi electrice!')
    console.log(`   Se vor șterge ${totalToDelete} înregistrări`)
    console.log(`   Se vor PĂSTRA ${electricCount} înregistrări Electricitate din facturi electrice`)
    console.log('')
    
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
    
    // 4. Șterge datele
    console.log('\n🗑️  Ștergere date...')
    const deleteQuery = `
      DELETE FROM expenditures_sync
      WHERE NOT (department_name = 'Electricitate' AND data_source = 'electric_invoice')
    `
    
    const deleteResult = await pool.query(deleteQuery)
    
    console.log(`✅ Șterse ${deleteResult.rowCount} înregistrări.`)
    
    // 5. Verifică rezultatul
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN department_name = 'Electricitate' AND data_source = 'electric_invoice' THEN 1 END) as electric_invoice_count,
        COUNT(CASE WHEN NOT (department_name = 'Electricitate' AND data_source = 'electric_invoice') THEN 1 END) as other_count
      FROM expenditures_sync
    `
    
    const verifyResult = await pool.query(verifyQuery)
    const totalRemaining = parseInt(verifyResult.rows[0].total_count) || 0
    const electricRemaining = parseInt(verifyResult.rows[0].electric_invoice_count) || 0
    const otherRemaining = parseInt(verifyResult.rows[0].other_count) || 0
    
    console.log('')
    console.log('📊 Verificare după ștergere:')
    console.log(`   Total rămas: ${totalRemaining} înregistrări`)
    console.log(`   Electricitate (facturi electrice): ${electricRemaining} înregistrări`)
    console.log(`   Alte date: ${otherRemaining} înregistrări`)
    
    if (otherRemaining === 0 && electricRemaining === electricCount) {
      console.log('✅ Ștergere reușită! Doar Electricitate din facturi electrice a rămas.')
    } else {
      console.log('⚠️  ATENȚIE: Rezultatul nu este cel așteptat!')
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

deleteAllExceptElectricInvoices()
