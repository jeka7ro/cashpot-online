/**
 * Script pentru importul imediat al tuturor datelor de cheltuieli
 * Aduce datele noi din BAT, Google Sheets și Preferences
 */

const axios = require('axios')
const jwt = require('jsonwebtoken')

const API_URL = process.env.API_URL || 'http://localhost:5001'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Creează un token JWT pentru admin
const token = jwt.sign(
  { userId: 1, username: 'admin', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
)

async function importAllExpenditures() {
  try {
    console.log('🔄 Pornire import TOATE datele de cheltuieli...\n')
    console.log(`🌐 API URL: ${API_URL}\n`)
    
    // Pornește importul cu toate sursele
    console.log('📥 Import din toate sursele: BAT, Google Sheets, Preferences\n')
    
    const response = await axios.post(
      `${API_URL}/api/expenditures/import-all`,
      {
        sources: {
          bat: true,
          googleSheets: true,
          preferences: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 secunde pentru răspunsul inițial
      }
    )
    
    if (response.data?.success || response.data?.alreadyRunning) {
      console.log('✅ Import pornit cu succes!')
      console.log('📊 Verificare progres...\n')
      
      // Așteaptă puțin și verifică progresul
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Verifică progresul
      let attempts = 0
      const maxAttempts = 120 // 120 de verificări (10 minute)
      
      while (attempts < maxAttempts) {
        try {
          const progressResponse = await axios.get(
            `${API_URL}/api/expenditures/import-all-status`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              timeout: 5000
            }
          )
          
          const progress = progressResponse.data
          
          if (progress.status === 'completed') {
            console.log('\n✅ Import completat!')
            console.log(`   Importate: ${progress.imported || 0}`)
            console.log(`   Omise (duplicate): ${progress.skipped || 0}`)
            console.log(`   Erori: ${progress.errors || 0}`)
            console.log(`   BAT: ${progress.fromExternalAPI || 0}`)
            console.log(`   Google Sheets: ${progress.fromGoogleSheets || 0}`)
            console.log(`   Total în DB: ${progress.total || 0}`)
            break
          } else if (progress.status === 'failed') {
            console.error('\n❌ Eroare la import:', progress.error || 'Eroare necunoscută')
            break
          } else if (progress.status === 'running') {
            const step = progress.currentStep || 'În curs...'
            console.log(`⏳ ${step} - Importate: ${progress.imported || 0}, Omise: ${progress.skipped || 0}, Erori: ${progress.errors || 0}`)
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          attempts++
        } catch (error) {
          console.error('❌ Eroare la verificare progres:', error.message)
          break
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⚠️ Timeout la verificare progres. Importul poate fi încă în curs.')
        console.log('   Verifică manual în aplicație sau în loguri.')
      }
    } else {
      console.error('❌ Nu s-a putut porni importul:', response.data)
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.alreadyRunning) {
      console.log('⚠️ Import deja în curs. Verificare progres...\n')
      
      // Verifică progresul existent
      try {
        const progressResponse = await axios.get(
          `${API_URL}/api/expenditures/import-all-status`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )
        
        const progress = progressResponse.data
        console.log(`Status: ${progress.status}`)
        if (progress.status === 'running') {
          console.log(`Pas curent: ${progress.currentStep || 'N/A'}`)
          console.log(`Importate: ${progress.imported || 0}, Omise: ${progress.skipped || 0}`)
        }
      } catch (e) {
        console.error('Eroare la verificare progres:', e.message)
      }
    } else {
      console.error('❌ Eroare:', error.message)
      if (error.response) {
        console.error('   Status:', error.response.status)
        console.error('   Data:', JSON.stringify(error.response.data, null, 2))
      }
      process.exit(1)
    }
  }
}

importAllExpenditures()
