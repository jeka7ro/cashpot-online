/**
 * Script pentru verificarea datelor noi din Google Sheets
 * Verifică dacă există date după 13 decembrie 2025
 */

const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595'

async function checkLatestData() {
  try {
    console.log('🔍 Verificare date noi din Google Sheets...\n')
    console.log(`📋 URL: ${GOOGLE_SHEETS_URL}\n`)
    
    let csvUrl = GOOGLE_SHEETS_URL
    if (GOOGLE_SHEETS_URL.includes('/edit')) {
      const sheetId = GOOGLE_SHEETS_URL.match(/\/d\/(.*?)\//)?.[1]
      const gid = GOOGLE_SHEETS_URL.match(/gid=(\d+)/)?.[1] || '0'
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
      console.log(`📥 CSV URL: ${csvUrl}\n`)
    }
    
    const csvResponse = await fetch(csvUrl)
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.status} ${csvResponse.statusText}`)
    }
    
    const csvText = await csvResponse.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    const rows = lines.slice(1)
    
    console.log(`📊 Total rânduri în Google Sheets: ${rows.length}\n`)
    
    // Parse toate datele
    const allDates = []
    const december2025Rows = []
    const taxRows = []
    
    for (const row of rows) {
      try {
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
        
        if (values.length < 5) continue
        
        const [dateStr, explanation, amountStr, location, department, expenditureType] = values
        
        let operationalDate = null
        if (dateStr && dateStr.trim()) {
          if (dateStr.includes('.')) {
            const dateParts = dateStr.split('.')
            if (dateParts.length === 3) {
              operationalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
            }
          } else if (dateStr.includes('/')) {
            const dateParts = dateStr.split('/')
            if (dateParts.length === 3) {
              operationalDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
            }
          } else if (dateStr.includes('-')) {
            operationalDate = dateStr.split('T')[0]
          }
        }
        
        if (operationalDate) {
          allDates.push(operationalDate)
          
          if (operationalDate.startsWith('2025-12')) {
            december2025Rows.push({
              date: operationalDate,
              dateStr,
              explanation,
              amount: amountStr,
              location,
              department,
              expenditureType
            })
            
            // Verifică dacă este taxe
            const lowerDept = (department || '').toLowerCase()
            const lowerType = (expenditureType || '').toLowerCase()
            const lowerExplanation = (explanation || '').toLowerCase()
            
            if (lowerDept === 'taxe' || lowerType.includes('contribut') || 
                lowerExplanation.includes('contribut') || lowerExplanation.includes('tax')) {
              taxRows.push({
                date: operationalDate,
                dateStr,
                explanation,
                amount: amountStr,
                location,
                department,
                expenditureType
              })
            }
          }
        }
      } catch (error) {
        // Skip
      }
    }
    
    // Sortează datele
    allDates.sort()
    const minDate = allDates[0]
    const maxDate = allDates[allDates.length - 1]
    
    console.log(`📅 Interval total date: ${minDate} - ${maxDate}`)
    console.log(`📊 Date pentru decembrie 2025: ${december2025Rows.length} înregistrări`)
    console.log(`💰 Cheltuieli cu taxe în decembrie 2025: ${taxRows.length} înregistrări\n`)
    
    if (december2025Rows.length > 0) {
      const decDates = december2025Rows.map(r => r.date).sort()
      const decMin = decDates[0]
      const decMax = decDates[decDates.length - 1]
      console.log(`📅 Interval decembrie 2025: ${decMin} - ${decMax}`)
      
      if (decMax < '2025-12-31') {
        console.log(`\n⚠️ ATENȚIE: Ultima dată este ${decMax}, nu există date până la sfârșitul lunii!`)
      }
    }
    
    if (taxRows.length > 0) {
      console.log(`\n💰 Cheltuieli cu taxe găsite:\n`)
      taxRows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.dateStr} - ${row.expenditureType}`)
        console.log(`   ${row.location} - ${row.department}: ${row.amount} RON`)
        if (row.explanation) {
          console.log(`   ${row.explanation}`)
        }
        console.log('')
      })
    } else {
      console.log('\n❌ NU EXISTĂ cheltuieli cu departamentul "Taxe" în decembrie 2025!')
      console.log('   Verifică dacă departamentul este exact "Taxe" în Google Sheets.')
    }
    
    // Verifică datele după 13 decembrie
    const afterDec13 = december2025Rows.filter(r => r.date > '2025-12-13')
    if (afterDec13.length > 0) {
      console.log(`\n🆕 Date NOI după 13 decembrie 2025: ${afterDec13.length} înregistrări\n`)
      afterDec13.forEach((row, index) => {
        console.log(`${index + 1}. ${row.dateStr} - ${row.expenditureType} - ${row.location}: ${row.amount} RON`)
      })
      console.log('\n💡 Rulează importul pentru a aduce aceste date noi!')
    } else {
      console.log('\n✅ Nu există date noi după 13 decembrie 2025 în Google Sheets.')
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  }
}

checkLatestData()
