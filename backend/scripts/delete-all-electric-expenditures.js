import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function deleteAllElectric() {
  try {
    console.log('🗑️  Ștergere toate înregistrările electrice din expenditures_sync...\n')
    
    // Verifică câte înregistrări există
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
    `)
    
    const totalRecords = parseInt(countResult.rows[0].total || 0)
    console.log(`📊 Total înregistrări electrice: ${totalRecords}`)
    
    if (totalRecords === 0) {
      console.log('✅ Nu există înregistrări de șters')
      return
    }
    
    // Șterge toate înregistrările electrice
    const deleteResult = await pool.query(`
      DELETE FROM expenditures_sync
      WHERE department_name = 'Electricitate'
      RETURNING id
    `)
    
    console.log(`✅ Șterse ${deleteResult.rowCount} înregistrări`)
    
    // Resetează saved_to_expenditures pentru toate facturile
    const resetResult = await pool.query(`
      UPDATE electric_invoices_nlc
      SET saved_to_expenditures = false
    `)
    
    console.log(`✅ Resetat saved_to_expenditures pentru toate facturile`)
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

if (process.argv.includes('--confirm')) {
  deleteAllElectric()
} else {
  console.log('⚠️  ATENȚIE: Acest script va șterge TOATE înregistrările electrice din expenditures_sync!')
  console.log('💡 Pentru a confirma, rulează:')
  console.log('   node backend/scripts/delete-all-electric-expenditures.js --confirm')
}
