/**
 * Script pentru listarea tuturor tipurilor de cheltuieli din decembrie 2025
 */

const DEFAULT_GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595'

async function listAllTypes() {
  try {
    console.log('🔍 Listare toate tipurile de cheltuieli din decembrie 2025...\n')
    
    let csvUrl = DEFAULT_GOOGLE_SHEETS_URL
    if (DEFAULT_GOOGLE_SHEETS_URL.includes('/edit')) {
      const sheetId = DEFAULT_GOOGLE_SHEETS_URL.match(/\/d\/(.*?)\//)?.[1]
      const gid = DEFAULT_GOOGLE_SHEETS_URL.match(/gid=(\d+)/)?.[1] || '0'
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    }
    
    const csvResponse = await fetch(csvUrl)
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.status}`)
    }
    
    const csvText = await csvResponse.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    const rows = lines.slice(1)
    
    const december2025Data = []
    const typesMap = new Map()
    
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
        
        if (!operationalDate || !operationalDate.startsWith('2025-12')) continue
        
        const type = expenditureType || 'Unknown'
        if (!typesMap.has(type)) {
          typesMap.set(type, [])
        }
        
        typesMap.get(type).push({
          date: operationalDate,
          dateStr,
          explanation,
          amount: amountStr,
          location,
          department,
          type
        })
      } catch (error) {
        // Skip
      }
    }
    
    console.log(`📊 Tipuri de cheltuieli în decembrie 2025 (${typesMap.size} tipuri):\n`)
    
    const sortedTypes = Array.from(typesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    
    sortedTypes.forEach(([type, records]) => {
      console.log(`📌 ${type}: ${records.length} înregistrări`)
      const total = records.reduce((sum, r) => {
        const amt = parseFloat((r.amount || '0').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0
        return sum + amt
      }, 0)
      console.log(`   Total: ${total.toFixed(2)} RON`)
      console.log(`   Locații: ${[...new Set(records.map(r => r.location))].join(', ')}`)
      console.log(`   Interval: ${records[0].date} - ${records[records.length - 1].date}`)
      console.log('')
    })
    
    // Verifică dacă există date după 13 decembrie
    const allDates = Array.from(typesMap.values()).flat().map(r => r.date).sort()
    const maxDate = allDates[allDates.length - 1]
    console.log(`📅 Ultima dată în Google Sheets pentru decembrie 2025: ${maxDate}`)
    
    if (maxDate < '2025-12-31') {
      console.log(`\n⚠️ ATENȚIE: Ultima dată este ${maxDate}, nu există date până la sfârșitul lunii!`)
      console.log('   Verifică dacă există date noi în Google Sheets după această dată.')
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('Stack:', error.stack)
  }
}

listAllTypes()
