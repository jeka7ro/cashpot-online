import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const cyberConfig = {
  host: '161.97.133.165',
  user: 'eugen',
  password: '(@Ee0wRHVohZww33',
  database: 'cyberslot_dbn'
}

async function exportCyberData() {
  let connection
  try {
    console.log('🔄 Conectare la Cyber DB...')
    connection = await mysql.createConnection(cyberConfig)
    console.log('✅ Conectat la Cyber DB!')

    // Export slots
    console.log('📊 Exporting slots...')
    const [slots] = await connection.execute(`
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
        l.code as location,
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
    `)
    
    // Export locations
    console.log('📍 Exporting locations...')
    const [locations] = await connection.execute(`
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
    `)

    // Export cabinets
    console.log('🎰 Exporting cabinets...')
    const [cabinets] = await connection.execute(`
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM machine_cabinet_types
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `)

    // Export game mixes
    console.log('🎲 Exporting game mixes...')
    const [gameMixes] = await connection.execute(`
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM machine_game_templates
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `)

    // Export providers
    console.log('🎮 Exporting providers...')
    const [providers] = await connection.execute(`
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM machine_manufacturers
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `)

    // Write files
    const dataDir = path.join(__dirname, '..', 'cyber-data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    fs.writeFileSync(path.join(dataDir, 'slots.json'), JSON.stringify(slots, null, 2))
    fs.writeFileSync(path.join(dataDir, 'locations.json'), JSON.stringify(locations, null, 2))
    fs.writeFileSync(path.join(dataDir, 'cabinets.json'), JSON.stringify(cabinets, null, 2))
    fs.writeFileSync(path.join(dataDir, 'game-mixes.json'), JSON.stringify(gameMixes, null, 2))
    fs.writeFileSync(path.join(dataDir, 'providers.json'), JSON.stringify(providers, null, 2))

    console.log('✅ Export complet!')
    console.log(`📊 Slots: ${slots.length}`)
    console.log(`📍 Locations: ${locations.length}`)
    console.log(`🎰 Cabinets: ${cabinets.length}`)
    console.log(`🎲 Game Mixes: ${gameMixes.length}`)
    console.log(`🎮 Providers: ${providers.length}`)

  } catch (error) {
    console.error('❌ Eroare:', error.message)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

exportCyberData()
