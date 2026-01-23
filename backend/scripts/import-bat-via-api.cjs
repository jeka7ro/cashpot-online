const axios = require('axios')
const jwt = require('jsonwebtoken')

const API_URL = process.env.API_URL || 'http://localhost:5000'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Creează un token JWT pentru admin
const token = jwt.sign(
  { userId: 1, username: 'admin', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
)

async function importBAT() {
  try {
    console.log('📥 Pornire import BAT prin API...\n')
    console.log(`🌐 API URL: ${API_URL}\n`)
    
    // Pornește importul
    const response = await axios.post(
      `${API_URL}/api/expenditures/import-all`,
      {
        sources: {
          bat: true,
          googleSheets: false,
          preferences: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 secunde pentru răspunsul inițial
      }
    )
    
    if (response.data?.success || response.data?.alreadyRunning) {
      console.log('✅ Import pornit cu succes!')
      console.log('📊 Verificare progres...\n')
      
      // Așteaptă puțin și verifică progresul
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verifică progresul
      let attempts = 0
      const maxAttempts = 60 // 60 de verificări (3 minute)
      
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
            console.log('✅ Import completat!')
            console.log(`   BAT: ${progress.bat?.imported || 0} importate, ${progress.bat?.skipped || 0} omise`)
            break
          } else if (progress.status === 'error') {
            console.error('❌ Eroare la import:', progress.error)
            break
          } else if (progress.status === 'running') {
            const batProgress = progress.bat || {}
            console.log(`⏳ Import în curs... BAT: ${batProgress.imported || 0} importate, ${batProgress.skipped || 0} omise`)
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
        console.log('   Verifică manual în aplicație sau rulează:')
        console.log('   SELECT COUNT(*) FROM expenditures_sync WHERE data_source = \'bat_sync\'')
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
        if (progress.bat) {
          console.log(`BAT: ${progress.bat.imported || 0} importate, ${progress.bat.skipped || 0} omise`)
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
    }
  }
}

importBAT()


