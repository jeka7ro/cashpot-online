/**
 * Script pentru verificarea directă a datelor din Google Sheets pentru decembrie 2025
 */

const DEFAULT_GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595'

async function checkGoogleSheets() {
  try {
    console.log('🔍 Verificare directă date Google Sheets pentru decembrie 2025...\n')
    
    let csvUrl = DEFAULT_GOOGLE_SHEETS_URL
    if (DEFAULT_GOOGLE_SHEETS_URL.includes('/edit')) {
      const sheetId = DEFAULT_GOOGLE_SHEETS_URL.match(/\/d\/(.*?)\//)?.[1]
      const gid = DEFAULT_GOOGLE_SHEETS_URL.match(/gid=(\d+)/)?.[1] || '0'
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    }
    
    console.log('📥 Fetching CSV from Google Sheets...')
    const csvResponse = await fetch(csvUrl)
    
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.status} ${csvResponse.statusText}`)
    }
    
    const csvText = await csvResponse.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    console.log(`📊 Total lines in CSV: ${lines.length}`)
    
    if (lines.length < 2) {
      console.log('❌ CSV este gol sau invalid')
      return
    }
    
    const rows = lines.slice(1) // Skip header
    console.log(`📊 Rows to process: ${rows.length}\n`)
    
    // Parse și filtrează pentru decembrie 2025
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
        
        // Parse date
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
        
        if (!operationalDate) continue
        
        // Verifică dacă este decembrie 2025
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
          
          // Verifică dacă este despre taxe
          const lowerType = (expenditureType || '').toLowerCase()
          const lowerExplanation = (explanation || '').toLowerCase()
          if (lowerType.includes('tax') || lowerType.includes('impozit') || lowerType.includes('taxa') ||
              lowerExplanation.includes('tax') || lowerExplanation.includes('impozit') || lowerExplanation.includes('taxa')) {
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
      } catch (error) {
        // Skip invalid rows
      }
    }
    
    console.log(`📊 Date pentru decembrie 2025 în Google Sheets: ${december2025Rows.length} înregistrări\n`)
    
    if (december2025Rows.length > 0) {
      console.log('📋 Primele 20 înregistrări pentru decembrie 2025:')
      december2025Rows.slice(0, 20).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.dateStr} - ${row.expenditureType} - ${row.location}: ${row.amount} RON`)
        if (row.explanation) {
          console.log(`      ${row.explanation}`)
        }
      })
      
      if (december2025Rows.length > 20) {
        console.log(`   ... și încă ${december2025Rows.length - 20} înregistrări`)
      }
    }
    
    console.log(`\n💰 Cheltuieli cu taxe în decembrie 2025: ${taxRows.length} înregistrări\n`)
    
    if (taxRows.length > 0) {
      console.log('📋 Toate cheltuielile cu taxe:')
      taxRows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.dateStr} - ${row.expenditureType} - ${row.location}: ${row.amount} RON`)
        if (row.explanation) {
          console.log(`      ${row.explanation}`)
        }
      })
    } else {
      console.log('   ❌ NU EXISTĂ cheltuieli cu taxe în Google Sheets pentru decembrie 2025!')
      console.log('   💡 Verifică dacă tipul de cheltuială conține cuvântul "tax", "impozit" sau "taxa"')
    }
    
    // Verifică ultimele date
    if (december2025Rows.length > 0) {
      const dates = december2025Rows.map(r => r.date).sort()
      console.log(`\n📅 Interval date decembrie 2025: ${dates[0]} - ${dates[dates.length - 1]}`)
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  }
}

checkGoogleSheets()
