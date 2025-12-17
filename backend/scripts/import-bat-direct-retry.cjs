const pg = require('pg')

// Baza locală PostgreSQL (Render)
const localPool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false },
  max: 5
})

// Funcție pentru conexiune la BAT cu retry agresiv
async function getBATConnection(maxRetries = 10, retryDelay = 5000) {
  const dbHost = '82.76.35.50'
  const dbUser = 'cashpot'
  const dbPassword = '129hj8oahwd7yaw3e21321'
  const dbPort = 26257
  const dbName = 'cashpot'
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 Tentativă ${attempt}/${maxRetries} de conectare la BAT: ${dbHost}:${dbPort}/${dbName}`)
      
      const pool = new pg.Pool({
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
        ssl: false,
        max: 1,
        connectionTimeoutMillis: 180000, // 3 minute
        query_timeout: 600000, // 10 minute
        statement_timeout: 600000,
        idle_in_transaction_session_timeout: 600000
      })
      
      // Test conexiune
      await Promise.race([
        pool.query('SELECT NOW() as current_time'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 180000))
      ])
      
      console.log('✅ Conexiune BAT reușită!\n')
      return pool
    } catch (error) {
      console.error(`❌ Tentativă ${attempt} eșuată:`, error.message)
      if (attempt < maxRetries) {
        console.log(`⏳ Aștept ${retryDelay / 1000} secunde înainte de următoarea tentativă...\n`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        // Crește delay-ul progresiv
        retryDelay = Math.min(retryDelay * 1.5, 30000) // Max 30 secunde
      } else {
        throw new Error(`Nu s-a putut conecta la BAT după ${maxRetries} tentative`)
      }
    }
  }
}

async function importBAT() {
  let externalPool = null
  
  try {
    console.log('📥 Import date din BAT cu retry agresiv...\n')
    
    // Conectare la BAT cu retry
    externalPool = await getBATConnection(10, 5000)
    
    // Obține datele din BAT - folosește exact același query ca în backend
    console.log('📊 Se obțin datele din BAT...')
    const batQuery = `
      SELECT 
        p.date as operational_date,
        p.amount,
        COALESCE(l.name, 'Nespecificat') as location_name,
        COALESCE(d.name, 'Nespecificat') as department_name,
        COALESCE(et.name, 'Nespecificat') as expenditure_type,
        '' as description
      FROM public.casino_payments p
      LEFT JOIN public.casino_locations l ON p.location_id = l.id
      LEFT JOIN public.casino_departments d ON p.department_id = d.id
      LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
      WHERE p.is_deleted = false
        AND p.date >= '2020-01-01'
      ORDER BY p.date DESC
    `
    
    console.log('⏳ Executare query (poate dura câteva minute)...')
    const batResult = await Promise.race([
      externalPool.query(batQuery),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 600000))
    ])
    
    console.log(`✅ Obținute ${batResult.rows.length} înregistrări din BAT\n`)
    
    await externalPool.end()
    externalPool = null
    
    // Normalizare locații corectă - elimină diacritice și normalizează case
    const normalizeLocationName = (name) => {
      if (!name) return 'Nespecificat'
      
      let normalized = name.trim()
      
      // Elimină "Birou" - nu este o locație
      if (normalized.toLowerCase().includes('birou')) {
        return 'Nespecificat'
      }
      
      // Mapare corectă pentru locații
      const locationMap = {
        'pitesti': 'Pitești',
        'pitești': 'Pitești',
        'ploiesti (centru)': 'Ploiești (centru)',
        'ploiești (centru)': 'Ploiești (centru)',
        'ploiesti centru': 'Ploiești (centru)',
        'ploiești centru': 'Ploiești (centru)',
        'ploiesti (nord)': 'Ploiești (nord)',
        'ploiești (nord)': 'Ploiești (nord)',
        'ploiesti nord': 'Ploiești (nord)',
        'ploiești nord': 'Ploiești (nord)',
        'valcea': 'Vâlcea',
        'vâlcea': 'Vâlcea',
        'craiova': 'Craiova'
      }
      
      // Normalizează: lowercase, elimină spații multiple
      const key = normalized.toLowerCase().replace(/\s+/g, ' ').trim()
      
      // Verifică dacă există în mapare
      if (locationMap[key]) {
        return locationMap[key]
      }
      
      // Dacă nu există în mapare, folosește prima literă mare, restul mic
      return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
    }
    
    // Inserează datele în expenditures_sync
    console.log('💾 Inserare date în expenditures_sync...\n')
    
    let imported = 0
    let skipped = 0
    let errors = 0
    
    const BATCH_SIZE = 100
    
    for (let i = 0; i < batResult.rows.length; i += BATCH_SIZE) {
      const batch = batResult.rows.slice(i, i + BATCH_SIZE)
      
      for (const row of batch) {
        try {
          // Procesează data corect - poate fi Date object sau string
          let operationalDate = null
          if (row.operational_date) {
            try {
              if (row.operational_date instanceof Date) {
                operationalDate = row.operational_date.toISOString().split('T')[0]
              } else if (typeof row.operational_date === 'string') {
                operationalDate = row.operational_date.split('T')[0].split(' ')[0]
              } else {
                // Încearcă să convertească la string și apoi la date
                const dateStr = String(row.operational_date)
                operationalDate = dateStr.split('T')[0].split(' ')[0]
              }
              // Validare format YYYY-MM-DD
              if (!/^\d{4}-\d{2}-\d{2}$/.test(operationalDate)) {
                console.warn(`⚠️ Invalid date format: ${row.operational_date} -> ${operationalDate}`)
                skipped++
                continue
              }
            } catch (e) {
              console.warn(`⚠️ Error processing date: ${row.operational_date}`, e.message)
              skipped++
              continue
            }
          }
          if (!operationalDate) {
            skipped++
            continue
          }
          
          const normalizedLocation = normalizeLocationName(row.location_name)
          const normalizedDept = (row.department_name || 'Nespecificat').trim()
          const normalizedType = (row.expenditure_type || 'Nespecificat').trim()
          const normalizedAmount = typeof row.amount === 'number' ? row.amount : (parseFloat(String(row.amount || 0)) || 0)

          // Insert cu ON CONFLICT (evită erori pe duplicate între surse)
          const insertResult = await localPool.query(`
            INSERT INTO expenditures_sync (
              operational_date,
              amount,
              location_name,
              department_name,
              expenditure_type,
              description,
              data_source
            ) VALUES ($1, $2, $3, $4, $5, $6, 'bat_sync')
            ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) DO NOTHING
          `, [
            operationalDate,
            normalizedAmount,
            normalizedLocation,
            normalizedDept,
            normalizedType,
            '' // description
          ])

          if (insertResult.rowCount > 0) {
            imported++
          } else {
            skipped++
          }
        } catch (error) {
          console.error(`❌ Eroare la inserare înregistrare:`, error.message)
          errors++
        }
      }
      
      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= batResult.rows.length) {
        console.log(`   Procesat: ${Math.min(i + BATCH_SIZE, batResult.rows.length)}/${batResult.rows.length} (importate: ${imported}, omise: ${skipped}, erori: ${errors})`)
      }
    }
    
    console.log('\n✅ Import completat!')
    console.log(`   Importate: ${imported}`)
    console.log(`   Omise (duplicate): ${skipped}`)
    console.log(`   Erori: ${errors}`)
    
  } catch (error) {
    console.error('\n❌ Eroare:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
  } finally {
    if (externalPool) {
      try {
        await externalPool.end()
      } catch (e) {}
    }
    await localPool.end()
  }
}

importBAT()
