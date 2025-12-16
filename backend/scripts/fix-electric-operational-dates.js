import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function fixOperationalDates() {
  try {
    console.log('🔧 Corectare operational_date pentru facturile electrice...\n')
    
    // Obține toate înregistrările electrice
    const result = await pool.query(`
      SELECT 
        id,
        operational_date,
        description,
        location_name,
        amount
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
      ORDER BY operational_date
    `)
    
    console.log(`📊 Total înregistrări de verificat: ${result.rows.length}\n`)
    
    let updatedCount = 0
    let skippedCount = 0
    const errors = []
    
    for (const record of result.rows) {
      try {
        // Extrage perioada de facturare din descriere
        const periodMatch = record.description.match(/Perioadă:\s*(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/i)
        
        if (!periodMatch) {
          skippedCount++
          continue
        }
        
        // Parsează perioada
        const startDay = parseInt(periodMatch[1])
        const startMonth = parseInt(periodMatch[2])
        const startYear = parseInt(periodMatch[3])
        const endDay = parseInt(periodMatch[4])
        const endMonth = parseInt(periodMatch[5])
        const endYear = parseInt(periodMatch[6])
        
        const startDate = new Date(startYear, startMonth - 1, startDay)
        const endDate = new Date(endYear, endMonth - 1, endDay)
        
        // Calculează luna din perioada de facturare (prima lună)
        const correctYear = startDate.getFullYear()
        const correctMonth = startDate.getMonth() + 1
        const correctOperationalDate = `${correctYear}-${String(correctMonth).padStart(2, '0')}-01`
        
        // Verifică dacă operational_date este corectă
        const currentOperationalDate = record.operational_date.toISOString().split('T')[0]
        const correctOperationalDateFull = new Date(correctOperationalDate).toISOString().split('T')[0]
        
        if (currentOperationalDate === correctOperationalDateFull) {
          skippedCount++
          continue
        }
        
        // Update operational_date
        await pool.query(`
          UPDATE expenditures_sync
          SET operational_date = $1
          WHERE id = $2
        `, [correctOperationalDate, record.id])
        
        updatedCount++
        console.log(`✅ ID ${record.id}: ${currentOperationalDate} → ${correctOperationalDate} (Perioadă: ${periodMatch[0].substring(9)})`)
        
      } catch (error) {
        errors.push({ id: record.id, error: error.message })
        console.error(`❌ Eroare la ID ${record.id}:`, error.message)
      }
    }
    
    console.log(`\n\n📊 Rezumat:`)
    console.log(`   Total înregistrări: ${result.rows.length}`)
    console.log(`   ✅ Actualizate: ${updatedCount}`)
    console.log(`   ⏭️  Omise (deja corecte sau fără perioadă): ${skippedCount}`)
    console.log(`   ❌ Erori: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Erori:`)
      errors.forEach(e => {
        console.log(`   ID ${e.id}: ${e.error}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

// Rulează doar dacă se trimite --fix
if (process.argv.includes('--fix')) {
  fixOperationalDates()
} else {
  console.log('💡 Pentru a corecta operational_date, rulează scriptul cu --fix:')
  console.log('   node backend/scripts/fix-electric-operational-dates.js --fix')
}
