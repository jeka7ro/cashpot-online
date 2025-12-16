const pg = require('pg')
// Fetch este nativ în Node.js 18+

// URL-ul corect al Google Sheets
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595'

// Baza de date PostgreSQL (Render)
const pool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Normalizează numele de locație (din electric-invoice-ai.js)
function normalizeLocationName(location) {
  if (!location) return 'Unknown'
  
  const normalized = location
    .trim()
    .replace(/Pitesti/gi, 'Pitești')
    .replace(/Ploiesti/gi, 'Ploiești')
    .replace(/Valcea/gi, 'Vâlcea')
    .replace(/Craiova/gi, 'Craiova')
  
  return normalized
}

async function importGoogleSheets() {
  try {
    console.log('📥 Import date din Google Sheets...\n')
    console.log(`🔗 URL: ${GOOGLE_SHEETS_URL}\n`)
    
    // Convert Google Sheets URL to CSV export URL
    let csvUrl = GOOGLE_SHEETS_URL
    if (GOOGLE_SHEETS_URL.includes('/edit')) {
      const sheetId = GOOGLE_SHEETS_URL.match(/\/d\/(.*?)\//)?.[1]
      const gid = GOOGLE_SHEETS_URL.match(/gid=(\d+)/)?.[1] || '0'
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      console.log(`📋 Sheet ID: ${sheetId}, GID: ${gid}`)
      console.log(`📥 CSV URL: ${csvUrl}\n`)
    }
    
    // Fetch CSV data
    console.log('📥 Se descarcă CSV-ul...')
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }
    
    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('CSV este gol sau invalid')
    }
    
    console.log(`✅ CSV descărcat: ${lines.length} linii\n`)
    
    // Parse CSV (skip header)
    const rows = lines.slice(1)
    console.log(`📊 Procesare ${rows.length} rânduri...\n`)
    
    let imported = 0
    let skipped = 0
    let errors = 0
    
    // Set pentru verificarea duplicate-urilor
    const currentKeys = new Set()
    
    for (let idx = 0; idx < rows.length; idx++) {
      try {
        const row = rows[idx]
        
        // Parse CSV with proper quote handling
        const values = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim())
        
        if (values.length < 5) {
          skipped++
          continue
        }
        
        const [dateStr, explanation, amountStr, location, department, expenditureType] = values
        
        // Parse date
        let operationalDate
        if (dateStr && dateStr.includes('.')) {
          const dateParts = dateStr.split('.')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
          }
        } else if (dateStr && dateStr.includes('/')) {
          const dateParts = dateStr.split('/')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
          }
        } else if (dateStr && dateStr.includes('-')) {
          operationalDate = dateStr.split('T')[0]
        }
        
        if (!operationalDate) {
          skipped++
          continue
        }
        
        const amount = parseFloat(amountStr?.replace(/[^\d.-]/g, '') || 0)
        if (isNaN(amount) || amount === 0) {
          skipped++
          continue
        }
        
        // Normalizează locația
        const normalizedLocation = normalizeLocationName(location || 'Unknown')
        const normalizedDept = (department || 'Unknown').trim()
        const normalizedType = (expenditureType || 'Unknown').trim()
        
        // Cheie pentru verificarea duplicate-urilor
        const key = `${operationalDate}|${amount}|${normalizedLocation}|${normalizedDept}|${normalizedType}|google_sheets`
        
        if (currentKeys.has(key)) {
          skipped++
          continue
        }
        
        // Verifică dacă există deja în baza de date
        const checkResult = await pool.query(`
          SELECT id FROM expenditures_sync
          WHERE operational_date = $1
            AND amount = $2
            AND location_name = $3
            AND department_name = $4
            AND expenditure_type = $5
            AND data_source = 'google_sheets'
        `, [operationalDate, amount, normalizedLocation, normalizedDept, normalizedType])
        
        if (checkResult.rows.length > 0) {
          skipped++
          continue
        }
        
        // Inserează în baza de date
        await pool.query(`
          INSERT INTO expenditures_sync (
            operational_date, amount, location_name, department_name, 
            expenditure_type, description, data_source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          operationalDate,
          amount,
          normalizedLocation,
          normalizedDept,
          normalizedType,
          explanation || null,
          'google_sheets'
        ])
        
        currentKeys.add(key)
        imported++
        
        if (imported % 100 === 0) {
          process.stdout.write(`\r📊 Procesat: ${imported} importate, ${skipped} omise, ${errors} erori...`)
        }
        
      } catch (rowError) {
        errors++
        if (errors <= 5) {
          console.error(`\n⚠️  Eroare la rândul ${idx + 1}:`, rowError.message)
        }
      }
    }
    
    console.log('\n')
    console.log('═'.repeat(80))
    console.log('✅ Import finalizat!')
    console.log(`   📥 Importate: ${imported} înregistrări`)
    console.log(`   ⏭️  Omitse: ${skipped} înregistrări`)
    console.log(`   ❌ Erori: ${errors} înregistrări`)
    console.log('═'.repeat(80))
    
  } catch (error) {
    console.error('\n❌ Eroare:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

importGoogleSheets()
