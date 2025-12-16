import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function fixDuplicates() {
  try {
    console.log('🔍 Căutare și ștergere duplicate pentru facturi electrice...\n')
    
    // Găsește duplicatele: aceeași factură, aceeași locație, aceeași dată, dar sume diferite sau multiple înregistrări
    const duplicates = await pool.query(`
      SELECT 
        operational_date,
        location_name,
        description,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        ARRAY_AGG(id ORDER BY id) as ids,
        ARRAY_AGG(amount ORDER BY id) as amounts
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
      GROUP BY operational_date, location_name, description
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `)
    
    console.log(`📊 Duplicate găsite: ${duplicates.rows.length} grupuri\n`)
    
    if (duplicates.rows.length === 0) {
      console.log('✅ Nu există duplicate!')
      return
    }
    
    let deletedCount = 0
    let keptCount = 0
    
    for (const dup of duplicates.rows) {
      const ids = dup.ids
      const amounts = dup.amounts
      
      // Extrage NLC-ul din descriere
      const nlcMatch = dup.description.match(/NLC:\s*(\d+)/i)
      const nlc = nlcMatch ? nlcMatch[1] : null
      
      // Extrage numărul facturii
      const invoiceMatch = dup.description.match(/Factură\s+(EFI[\/\-]?\d+)/i)
      const invoiceNum = invoiceMatch ? invoiceMatch[1] : null
      
      console.log(`\n📦 Duplicate pentru: ${invoiceNum || 'N/A'} - ${dup.location_name} - ${dup.operational_date}`)
      console.log(`   ${dup.count} înregistrări, sume: ${amounts.map(a => parseFloat(a).toFixed(2)).join(', ')} RON`)
      
      // Dacă toate sumele sunt identice, păstrează prima, șterge restul
      const uniqueAmounts = [...new Set(amounts.map(a => parseFloat(a)))]
      if (uniqueAmounts.length === 1) {
        console.log(`   → Toate sumele sunt identice (${uniqueAmounts[0].toFixed(2)} RON)`)
        console.log(`   → Păstrează ID ${ids[0]}, șterge restul`)
        
        const toDelete = ids.slice(1)
        for (const id of toDelete) {
          await pool.query('DELETE FROM expenditures_sync WHERE id = $1', [id])
          deletedCount++
        }
        keptCount++
      } else {
        // Sumelor diferite - păstrează cea mai mare (sau media?)
        console.log(`   ⚠️ Sumele diferă! Suma totală: ${parseFloat(dup.total_amount || 0).toFixed(2)} RON`)
        
        // Păstrează prima înregistrare, actualizează suma la media (sau la suma corectă din centralizator?)
        // Pentru moment, păstrează prima și șterge restul
        const toDelete = ids.slice(1)
        for (const id of toDelete) {
          await pool.query('DELETE FROM expenditures_sync WHERE id = $1', [id])
          deletedCount++
        }
        keptCount++
        console.log(`   → Păstrat ID ${ids[0]}, șterse ${toDelete.length} duplicate`)
      }
    }
    
    console.log(`\n\n📊 Rezumat:`)
    console.log(`   Grupuri duplicate: ${duplicates.rows.length}`)
    console.log(`   Înregistrări șterse: ${deletedCount}`)
    console.log(`   Înregistrări păstrate: ${keptCount}`)
    
    // Verifică suma totală după ștergere
    const finalTotal = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
    `)
    
    console.log(`\n✅ După ștergere:`)
    console.log(`   Total înregistrări: ${finalTotal.rows[0].total_records}`)
    console.log(`   Suma totală: ${parseFloat(finalTotal.rows[0].total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`)
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

if (process.argv.includes('--fix')) {
  fixDuplicates()
} else {
  console.log('💡 Pentru a șterge duplicatele, rulează scriptul cu --fix:')
  console.log('   node backend/scripts/fix-electric-duplicates.js --fix')
}
