const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function checkGoogleSheetsUrl() {
  try {
    console.log('🔍 Verificare URL Google Sheets din setări...\n')
    
    // URL-ul corect furnizat de utilizator
    const CORRECT_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595'
    
    // URL-ul default din cod
    const DEFAULT_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=828539440#gid=828539440'
    
    console.log('📋 URL-uri:')
    console.log(`   Corect (utilizator): ${CORRECT_URL}`)
    console.log(`   Default (cod):      ${DEFAULT_URL}`)
    console.log('')
    
    // Verifică în global_settings
    const settingsResult = await pool.query(`
      SELECT setting_value 
      FROM global_settings 
      WHERE setting_key = 'expenditures_sync_config'
    `)
    
    let currentUrl = null
    let settings = null
    
    if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
      const settingValue = settingsResult.rows[0].setting_value
      settings = typeof settingValue === 'string' ? JSON.parse(settingValue) : settingValue
      currentUrl = settings.googleSheetsUrl || null
      
      console.log('📊 Setări din global_settings:')
      console.log(`   URL Google Sheets: ${currentUrl || '(NULL sau gol)'}`)
      console.log(`   Setări complete:`, JSON.stringify(settings, null, 2))
    } else {
      console.log('⚠️  Nu există setări în global_settings pentru expenditures_sync_config')
    }
    
    console.log('')
    
    // Verifică în variabilele de mediu
    const envUrl = process.env.GOOGLE_SHEETS_URL || null
    console.log('🌍 Variabile de mediu:')
    console.log(`   GOOGLE_SHEETS_URL: ${envUrl || '(nu este setat)'}`)
    console.log('')
    
    // Compară URL-urile
    const urlToUse = currentUrl || envUrl || DEFAULT_URL
    console.log('🔍 Comparație:')
    console.log(`   URL folosit actual: ${urlToUse}`)
    console.log(`   URL corect:         ${CORRECT_URL}`)
    console.log(`   Coincide: ${urlToUse === CORRECT_URL ? '✅ DA' : '❌ NU'}`)
    console.log('')
    
    // Extrage gid-urile pentru comparație
    const extractGid = (url) => {
      const match = url.match(/gid=(\d+)/)
      return match ? match[1] : null
    }
    
    const currentGid = extractGid(urlToUse)
    const correctGid = extractGid(CORRECT_URL)
    const defaultGid = extractGid(DEFAULT_URL)
    
    console.log('📊 GID-uri (tab-uri):')
    console.log(`   GID actual:  ${currentGid || 'N/A'}`)
    console.log(`   GID corect:  ${correctGid || 'N/A'}`)
    console.log(`   GID default: ${defaultGid || 'N/A'}`)
    console.log('')
    
    if (currentGid !== correctGid) {
      console.log('⚠️  ATENȚIE: GID-ul nu coincide!')
      console.log(`   Se folosește tab-ul cu GID ${currentGid}, dar ar trebui să fie ${correctGid}`)
      console.log('')
      console.log('💡 Pentru a actualiza URL-ul:')
      console.log('   1. Folosește endpoint-ul PUT /api/expenditures/google-sheets-settings')
      console.log('   2. Sau actualizează direct în global_settings')
      console.log('')
      
      // Oferă opțiunea de actualizare
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise(resolve => {
        rl.question('❓ Vrei să actualizez URL-ul la cel corect? (scrie "DA" pentru a confirma): ', resolve)
      })
      
      rl.close()
      
      if (answer.trim().toUpperCase() === 'DA') {
        console.log('\n🔄 Actualizare URL Google Sheets...')
        
        // Actualizează setările
        if (!settings) {
          settings = {}
        }
        settings.googleSheetsUrl = CORRECT_URL
        
        // Salvează în baza de date
        await pool.query(`
          INSERT INTO global_settings (setting_key, setting_value)
          VALUES ('expenditures_sync_config', $1)
          ON CONFLICT (setting_key)
          DO UPDATE SET setting_value = $1
        `, [JSON.stringify(settings)])
        
        console.log('✅ URL Google Sheets actualizat cu succes!')
        console.log(`   Nou URL: ${CORRECT_URL}`)
      } else {
        console.log('❌ Actualizare anulată.')
      }
    } else {
      console.log('✅ URL-ul Google Sheets este corect!')
    }
    
  } catch (error) {
    console.error('❌ Eroare:', error)
  } finally {
    await pool.end()
  }
}

checkGoogleSheetsUrl()
