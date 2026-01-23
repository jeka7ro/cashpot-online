const axios = require('axios')
require('dotenv').config()

// URL-ul corect al Google Sheets
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595'

// URL-ul API (local sau production)
const API_URL = process.env.API_URL || 'http://localhost:5000'

async function importGoogleSheets() {
  try {
    console.log('📥 Import date din Google Sheets...\n')
    console.log(`🔗 URL Google Sheets: ${GOOGLE_SHEETS_URL}`)
    console.log(`🌐 API URL: ${API_URL}`)
    console.log('')
    
    // NOTĂ: Pentru a folosi endpoint-ul /import-all, ar trebui să ai un token de autentificare
    // Dar putem folosi direct endpoint-ul /import-google-sheets dacă există
    
    // Verifică dacă există un token în environment
    const token = process.env.AUTH_TOKEN || null
    
    if (!token) {
      console.log('⚠️  Nu există token de autentificare în environment.')
      console.log('💡 Opțiuni:')
      console.log('   1. Rulează importul manual din aplicație (butonul "Sincronizare Date")')
      console.log('   2. Sau setează AUTH_TOKEN în environment și rulează din nou')
      console.log('')
      console.log('📋 Alternativ, poți folosi direct endpoint-ul:')
      console.log(`   POST ${API_URL}/api/expenditures/import-google-sheets`)
      console.log(`   Body: { "sheetUrl": "${GOOGLE_SHEETS_URL}" }`)
      return
    }
    
    console.log('🔄 Trimitere cerere de import...')
    
    // Folosește endpoint-ul de import Google Sheets
    const response = await axios.post(
      `${API_URL}/api/expenditures/import-google-sheets`,
      {
        sheetUrl: GOOGLE_SHEETS_URL
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log('✅ Import reușit!')
    console.log('📊 Rezultate:', JSON.stringify(response.data, null, 2))
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Eroare API:', error.response.status, error.response.data)
    } else if (error.request) {
      console.error('❌ Nu s-a primit răspuns de la server')
      console.error('💡 Verifică dacă serverul rulează și dacă API_URL este corect')
    } else {
      console.error('❌ Eroare:', error.message)
    }
    
    console.log('')
    console.log('💡 Alternativă: Rulează importul manual din aplicație:')
    console.log('   1. Mergi la pagina de Setări Cheltuieli')
    console.log('   2. Apasă butonul "Sincronizare Date" sau "Adu toate datele"')
    console.log('   3. Selectează doar "Google Sheets"')
    console.log('   4. Apasă "Import"')
  }
}

importGoogleSheets()


