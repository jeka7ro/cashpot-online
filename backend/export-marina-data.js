/**
 * Script pentru export date din Marina în format JSON
 * Rulează local și salvează datele în fișiere JSON
 */

import mysql from 'mysql2/promise'
import fs from 'fs'

const marinaConfig = {
  host: '161.97.133.165',
  port: 3306,
  user: 'eugen',
  password: '(@Ee0wRHVohZww33',
  database: 'cyberslot_dbn',
}

async function exportMarinaData() {
  let connection

  try {
    console.log('🔌 Conectare la serverul Marina...')
    connection = await mysql.createConnection(marinaConfig)
    console.log('✅ Conectat cu succes!')

    // Export Slots
    console.log('\n📊 Export sloturi...')
    const slotsQuery = `
      SELECT 
        m.id,
        m.slot_machine_id as serial_number,
        mm.name as provider,
        mct.name as cabinet,
        gt.name as game_mix,
        CASE 
          WHEN m.active = 1 THEN 'Active'
          ELSE 'Inactive'
        END as status,
        l.address as location,
        m.updated_at as last_updated,
        m.created_at
      FROM machines m
      LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
      LEFT JOIN machine_manufacturers mm ON mt.manufacturer_id = mm.id
      LEFT JOIN machine_cabinet_types mct ON m.cabinet_type_id = mct.id
      LEFT JOIN machine_game_templates gt ON m.game_template_id = gt.id
      LEFT JOIN locations l ON m.location_id = l.id
      WHERE m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `
    
    const [slots] = await connection.execute(slotsQuery)
    fs.writeFileSync('marina-slots.json', JSON.stringify(slots, null, 2))
    console.log(`✅ Exportate ${slots.length} sloturi în marina-slots.json`)

    // Export Locations
    console.log('\n📍 Export locații...')
    const locationsQuery = `
      SELECT 
        l.id,
        l.code as name,
        l.code as location,
        l.address,
        l.city,
        c.name as company,
        NULL as surface_area,
        CASE 
          WHEN l.active = 1 THEN 'Active'
          ELSE 'Inactive'
        END as status,
        l.updated_at as last_updated,
        l.created_at
      FROM locations l
      LEFT JOIN companies c ON l.company_id = c.id
      WHERE l.deleted_at IS NULL
      ORDER BY l.created_at DESC
    `
    
    const [locations] = await connection.execute(locationsQuery)
    fs.writeFileSync('marina-locations.json', JSON.stringify(locations, null, 2))
    console.log(`✅ Exportate ${locations.length} locații în marina-locations.json`)

    // Export Providers
    console.log('\n🏢 Export provideri...')
    const providersQuery = `
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM machine_manufacturers
      WHERE deleted_at IS NULL
      ORDER BY name
    `
    
    const [providers] = await connection.execute(providersQuery)
    fs.writeFileSync('marina-providers.json', JSON.stringify(providers, null, 2))
    console.log(`✅ Exportați ${providers.length} provideri în marina-providers.json`)

    // Export Cabinets
    console.log('\n🗄️ Export cabinete...')
    const cabinetsQuery = `
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM machine_cabinet_types
      WHERE deleted_at IS NULL
      ORDER BY name
    `
    
    const [cabinets] = await connection.execute(cabinetsQuery)
    fs.writeFileSync('marina-cabinets.json', JSON.stringify(cabinets, null, 2))
    console.log(`✅ Exportate ${cabinets.length} cabinete în marina-cabinets.json`)

    // Export Game Mixes
    console.log('\n🎮 Export game mixes...')
    const gameMixesQuery = `
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM machine_game_templates
      WHERE deleted_at IS NULL
      ORDER BY name
    `
    
    const [gameMixes] = await connection.execute(gameMixesQuery)
    fs.writeFileSync('marina-game-mixes.json', JSON.stringify(gameMixes, null, 2))
    console.log(`✅ Exportate ${gameMixes.length} game mixes în marina-game-mixes.json`)

    console.log('\n✅ EXPORT COMPLET! Fișierele sunt gata pentru import.')
    console.log('\nPași următori:')
    console.log('1. Accesează https://w1n.ro/slots/marina-import')
    console.log('2. Click pe "Încarcă JSON"')
    console.log('3. Selectează fișierul marina-slots.json sau marina-locations.json')
    console.log('4. Selectează înregistrările și apasă Import')

  } catch (error) {
    console.error('❌ Eroare:', error.message)
    console.error('\nVerifică:')
    console.error('- Serverul Marina este pornit')
    console.error('- Credențialele sunt corecte')
    console.error('- Firewall-ul permite conexiuni')
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Conexiune închisă')
    }
  }
}

// Rulează export
exportMarinaData()

