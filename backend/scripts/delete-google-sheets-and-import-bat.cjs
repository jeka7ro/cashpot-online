const pg = require('pg')

// Baza de date PostgreSQL (Render)
const localPool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
})

// Baza de date externă BAT - folosește aceleași setări ca în backend
const getExternalPool = () => {
  const dbHost = process.env.EXPENDITURES_DB_HOST || '82.76.35.50'
  const dbUser = process.env.EXPENDITURES_DB_USER || 'cashpot'
  const dbPassword = process.env.EXPENDITURES_DB_PASSWORD || '129hj8oahwd7yaw3e21321'
  const dbPort = parseInt(process.env.EXPENDITURES_DB_PORT || '26257')
  const dbName = process.env.EXPENDITURES_DB_NAME || 'cashpot'
  
  console.log(`🔌 Conectare la BAT: ${dbHost}:${dbPort}/${dbName}`)
  
  return new pg.Pool({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    connectionTimeoutMillis: 120000, // 2 minute
    query_timeout: 600000, // 10 minute
    statement_timeout: 600000,
    idle_in_transaction_session_timeout: 600000,
    ssl: false,
    max: 2
  })
}

// Normalizează numele de locație (EXACT ca în backend)
function normalizeLocationName(location) {
  if (!location) return 'Unknown'
  
  return location
    .trim()
    .replace(/Pitesti/gi, 'Pitești')
    .replace(/Ploiesti/gi, 'Ploiești')
    .replace(/Valcea/gi, 'Vâlcea')
    .replace(/Craiova/gi, 'Craiova')
}

async function deleteGoogleSheetsAndImportBAT() {
  try {
    console.log('🗑️  Ștergere date Google Sheets...\n')
    
    // 1. Șterge toate datele Google Sheets
    const deleteResult = await localPool.query(
      'DELETE FROM expenditures_sync WHERE data_source = $1',
      ['google_sheets']
    )
    
    console.log(`✅ Șterse ${deleteResult.rowCount} înregistrări Google Sheets\n`)
    
    // 2. Import date din BAT
    console.log('📥 Import date din BAT...\n')
    
    const externalPool = getExternalPool()
    
    // Test conexiune
    console.log('🔌 Testare conexiune BAT...')
    await externalPool.query('SELECT NOW() as current_time')
    console.log('✅ Conexiune BAT reușită\n')
    
    // Obține datele din BAT - folosește aceleași tabele ca în backend
    console.log('📊 Se obțin datele din BAT...')
    const batQuery = `
      SELECT 
        p.date as operational_date,
        p.amount,
        COALESCE(l.name, p.location_name, 'Unknown') as location_name,
        COALESCE(d.name, p.department_name, 'Unknown') as department_name,
        COALESCE(et.name, p.expenditure_type, 'Unknown') as expenditure_type,
        p.description,
        p.created_at,
        p.updated_at
      FROM public.casino_payments p
      LEFT JOIN public.casino_locations l ON p.location_id = l.id
      LEFT JOIN public.casino_departments d ON p.department_id = d.id
      LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
      WHERE p.is_deleted = false
        AND p.date >= '2020-01-01'
      ORDER BY p.date DESC
    `
    
    const batResult = await externalPool.query(batQuery)
    console.log(`✅ Obținute ${batResult.rows.length} înregistrări din BAT\n`)
    
    await externalPool.end()
    
    // 3. Inserează datele în expenditures_sync cu normalizare corectă
    console.log('💾 Inserare date în expenditures_sync cu normalizare locații...\n')
    
    let imported = 0
    let skipped = 0
    let errors = 0
    
    const currentKeys = new Set()
    
    for (const row of batResult.rows) {
      try {
        const operationalDate = row.operational_date ? row.operational_date.split('T')[0] : null
        if (!operationalDate) {
          skipped++
          continue
        }
        
        const amount = parseFloat(row.amount || 0)
        if (isNaN(amount) || amount === 0) {
          skipped++
          continue
        }
        
        // NORMALIZEAZĂ locația
        const normalizedLocation = normalizeLocationName(row.location_name || 'Unknown')
        const normalizedDept = (row.department_name || 'Unknown').trim()
        const normalizedType = (row.expenditure_type || 'Unknown').trim()
        
        // Cheie pentru verificarea duplicate-urilor
        const key = `${operationalDate}|${amount}|${normalizedLocation}|${normalizedDept}|${normalizedType}|bat_sync`
        
        if (currentKeys.has(key)) {
          skipped++
          continue
        }
        
        // Verifică dacă există deja în baza de date
        const checkResult = await localPool.query(`
          SELECT id FROM expenditures_sync
          WHERE operational_date = $1
            AND amount = $2
            AND location_name = $3
            AND department_name = $4
            AND expenditure_type = $5
            AND data_source = 'bat_sync'
        `, [operationalDate, amount, normalizedLocation, normalizedDept, normalizedType])
        
        if (checkResult.rows.length > 0) {
          skipped++
          continue
        }
        
        // Inserează în baza de date
        await localPool.query(`
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
          row.description || null,
          'bat_sync'
        ])
        
        currentKeys.add(key)
        imported++
        
        if (imported % 100 === 0) {
          process.stdout.write(`\r📊 Procesat: ${imported} importate, ${skipped} omise, ${errors} erori...`)
        }
        
      } catch (rowError) {
        errors++
        if (errors <= 5) {
          console.error(`\n⚠️  Eroare la rând:`, rowError.message)
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
    
    // Verifică locațiile importate
    console.log('\n📊 Locații importate:')
    const locationsResult = await localPool.query(`
      SELECT 
        location_name,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE data_source = 'bat_sync'
      GROUP BY location_name
      ORDER BY location_name
    `)
    
    locationsResult.rows.forEach(row => {
      console.log(`   ${row.location_name}: ${row.count} înregistrări, ${parseFloat(row.total_amount || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`)
    })
    
  } catch (error) {
    console.error('\n❌ Eroare:', error.message)
    console.error(error.stack)
  } finally {
    await localPool.end()
  }
}

deleteGoogleSheetsAndImportBAT()
