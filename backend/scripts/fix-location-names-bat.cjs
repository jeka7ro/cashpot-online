const pg = require('pg')

// Baza locală PostgreSQL (Render)
const localPool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false },
  max: 5
})

// Funcție de normalizare corectă - elimină diacritice și normalizează case
const normalizeLocationName = (name) => {
  if (!name) return 'Nespecificat'
  
  let normalized = name.trim()
  
  // Elimină "Birou" - nu este o locație
  if (normalized.toLowerCase().includes('birou')) {
    return null // Va fi ignorat
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

async function fixLocations() {
  try {
    console.log('🔧 Corectare nume locații în expenditures_sync...\n')
    
    // Obține toate locațiile unice
    const result = await localPool.query(`
      SELECT DISTINCT location_name, COUNT(*) as count
      FROM expenditures_sync
      WHERE data_source IN ('bat_sync', 'google_sheets')
      GROUP BY location_name
      ORDER BY location_name
    `)
    
    console.log(`📊 Găsite ${result.rows.length} locații unice:\n`)
    result.rows.forEach(row => {
      console.log(`   ${row.location_name}: ${row.count} înregistrări`)
    })
    
    console.log('\n🔄 Corectare locații...\n')
    
    let updated = 0
    let skipped = 0
    
    for (const row of result.rows) {
      const oldName = row.location_name
      const newName = normalizeLocationName(oldName)
      
      if (!newName) {
        console.log(`⏭️  Omis "${oldName}" (nu este o locație validă)`)
        skipped++
        continue
      }
      
      if (oldName !== newName) {
        console.log(`   "${oldName}" → "${newName}"`)
        
        // Șterge duplicatele care ar apărea după actualizare
        // Găsește înregistrările care ar deveni duplicate
        const duplicates = await localPool.query(`
          SELECT e2.id
          FROM expenditures_sync e1
          INNER JOIN expenditures_sync e2 ON 
            e1.operational_date = e2.operational_date
            AND ABS(e1.amount - e2.amount) < 0.01
            AND e1.department_name = e2.department_name
            AND e1.expenditure_type = e2.expenditure_type
            AND e1.location_name = $1
            AND e2.location_name = $2
            AND e1.id != e2.id
            AND e1.data_source IN ('bat_sync', 'google_sheets')
            AND e2.data_source IN ('bat_sync', 'google_sheets')
        `, [newName, oldName])
        
        if (duplicates.rows.length > 0) {
          console.log(`      ⚠️  Găsite ${duplicates.rows.length} duplicate, șterg înregistrările vechi...`)
          const idsToDelete = duplicates.rows.map(r => r.id)
          await localPool.query(`
            DELETE FROM expenditures_sync
            WHERE id = ANY($1::int[])
          `, [idsToDelete])
        }
        
        // Actualizează restul înregistrărilor
        const updateResult = await localPool.query(`
          UPDATE expenditures_sync
          SET location_name = $1
          WHERE location_name = $2
            AND data_source IN ('bat_sync', 'google_sheets')
            AND id NOT IN (
              SELECT e2.id
              FROM expenditures_sync e1
              INNER JOIN expenditures_sync e2 ON 
                e1.operational_date = e2.operational_date
                AND ABS(e1.amount - e2.amount) < 0.01
                AND e1.department_name = e2.department_name
                AND e1.expenditure_type = e2.expenditure_type
                AND e1.location_name = $1
                AND e2.location_name = $2
                AND e1.id != e2.id
                AND e1.data_source IN ('bat_sync', 'google_sheets')
                AND e2.data_source IN ('bat_sync', 'google_sheets')
            )
        `, [newName, oldName])
        
        updated += updateResult.rowCount
      }
    }
    
    console.log(`\n✅ Corectare finalizată!`)
    console.log(`   Actualizate: ${updated} înregistrări`)
    console.log(`   Omitse: ${skipped} locații`)
    
    // Verifică rezultatul final
    const finalResult = await localPool.query(`
      SELECT DISTINCT location_name, COUNT(*) as count
      FROM expenditures_sync
      WHERE data_source IN ('bat_sync', 'google_sheets')
      GROUP BY location_name
      ORDER BY location_name
    `)
    
    console.log(`\n📊 Locații finale (${finalResult.rows.length}):`)
    finalResult.rows.forEach(row => {
      console.log(`   ${row.location_name}: ${row.count} înregistrări`)
    })
    
  } catch (error) {
    console.error('❌ Eroare:', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
  } finally {
    await localPool.end()
  }
}

fixLocations()
