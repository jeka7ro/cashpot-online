const axios = require('axios')

// URL-ul API-ului local
const API_URL = process.env.API_URL || 'http://localhost:5000'

async function triggerBATImport() {
  try {
    console.log('📥 Pornire import BAT prin API...\n')
    console.log(`🌐 API URL: ${API_URL}\n`)
    
    // NOTĂ: Pentru a folosi endpoint-ul, ar trebui să ai un token de autentificare
    // Dar poți folosi direct din aplicație:
    console.log('💡 INSTRUCȚIUNI:')
    console.log('   1. Mergi în aplicație la pagina de Setări Cheltuieli')
    console.log('   2. Apasă butonul "Adu toate datele" sau "Import Toate Datele"')
    console.log('   3. Selectează DOAR "BAT" (debifează Google Sheets și Preferences)')
    console.log('   4. Apasă "Import"')
    console.log('')
    console.log('   SAU folosește endpoint-ul direct:')
    console.log(`   POST ${API_URL}/api/expenditures/import-all`)
    console.log('   Body: { "sources": { "bat": true, "googleSheets": false, "preferences": false } }')
    console.log('   Header: Authorization: Bearer YOUR_TOKEN')
    console.log('')
    
    // Verifică dacă există date BAT deja
    const checkQuery = `
      SELECT COUNT(*) as count FROM expenditures_sync WHERE data_source = 'bat_sync'
    `
    console.log('📊 Verificare date BAT existente...')
    console.log('   (Rulează manual: SELECT COUNT(*) FROM expenditures_sync WHERE data_source = \\'bat_sync\\')')
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
  }
}

triggerBATImport()
