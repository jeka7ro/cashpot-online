import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

async function checkDates() {
  try {
    // Verifică facturile electrice în expenditures_sync
    const result = await pool.query(`
      SELECT 
        operational_date,
        description,
        location_name,
        amount,
        EXTRACT(YEAR FROM operational_date) as year,
        EXTRACT(MONTH FROM operational_date) as month
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
      ORDER BY operational_date
      LIMIT 50
    `)
    
    console.log(`Total înregistrări electrice: ${result.rows.length}\n`)
    
    // Grupează pe an
    const byYear = {}
    result.rows.forEach(r => {
      const year = r.year
      if (!byYear[year]) {
        byYear[year] = []
      }
      byYear[year].push(r)
    })
    
    Object.keys(byYear).sort().forEach(year => {
      console.log(`\n📅 An ${year}: ${byYear[year].length} înregistrări`)
      byYear[year].slice(0, 5).forEach(r => {
        const invoiceMatch = r.description.match(/Factură\s+(EFI[\/\-]?\d+)/i)
        const invoiceNum = invoiceMatch ? invoiceMatch[1] : 'N/A'
        const amount = parseFloat(r.amount) || 0
        console.log(`   ${r.operational_date} - ${r.location_name} - ${amount.toFixed(2)} RON - ${invoiceNum}`)
      })
      if (byYear[year].length > 5) {
        console.log(`   ... și încă ${byYear[year].length - 5} înregistrări`)
      }
    })
    
    // Verifică dacă există facturi cu perioada de facturare în 2024
    const result2024 = await pool.query(`
      SELECT 
        operational_date,
        description,
        location_name,
        amount
      FROM expenditures_sync
      WHERE department_name = 'Electricitate'
        AND description LIKE '%2024%'
      LIMIT 20
    `)
    
    console.log(`\n\n🔍 Înregistrări cu "2024" în descriere: ${result2024.rows.length}`)
    result2024.rows.forEach(r => {
      const invoiceMatch = r.description.match(/Factură\s+(EFI[\/\-]?\d+)/i)
      const invoiceNum = invoiceMatch ? invoiceMatch[1] : 'N/A'
      const periodMatch = r.description.match(/Perioadă:\s*([^|]+)/i)
      const period = periodMatch ? periodMatch[1].trim() : 'N/A'
      console.log(`   ${r.operational_date} - ${invoiceNum} - Perioadă: ${period}`)
    })
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkDates()
