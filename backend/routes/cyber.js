import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Load exported data as fallback
const loadExportedData = (filename) => {
  try {
    const filePath = path.join(__dirname, '..', 'cyber-data', filename)
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      console.log(`✅ Loaded ${data.length} items from ${filename}`)
      return data
    }
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message)
  }
  return []
}

// Test Cyber database connection
router.get('/test', async (req, res) => {
  try {
    // On Render, skip database connection test and use JSON only
    if (process.env.RENDER === 'true') {
      res.json({ success: true, message: 'Using JSON fallback data (Render mode)', mode: 'json' })
      return
    }
    
    res.json({ success: true, message: 'Cyber endpoints working (local mode)', mode: 'local' })
  } catch (error) {
    console.error('Cyber connection test error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get all slots from Cyber (with fallback to JSON file)
router.get('/slots', async (req, res) => {
  try {
    // On Render, use JSON fallback only
    if (process.env.RENDER === 'true') {
      console.log('🔄 Using JSON fallback for slots (Render mode)')
      const slots = loadExportedData('slots.json')
      const locations = loadExportedData('locations.json')
      
      // Load game mixes and machine games
      const gameMixes = loadExportedData('game-mixes.json')
      const machineGames = loadExportedData('machine_games.json')
      
      // Enhance slots with address, jackpot data, and game mix
      const enhancedSlots = slots.map(slot => {
        // Find location details
        const location = locations.find(loc => loc.location === slot.location)
        
        // Find game mix by ID from machine_games mapping
        let gameMixName = 'N/A'
        const machineGame = machineGames.find(mg => mg.serial_number === slot.serial_number)
        if (machineGame && machineGame.game_mix_id) {
          const gameMix = gameMixes.find(gm => gm.id === machineGame.game_mix_id)
          gameMixName = gameMix ? gameMix.name : 'N/A'
        } else if (slot.game_mix && slot.game_mix !== null) {
          // If game_mix is already populated, use it
          gameMixName = slot.game_mix
        }
        
        return {
          ...slot,
          address: location?.address || 'N/A',
          city: location?.city || 'N/A',
          company: location?.company || 'N/A',
          game_mix: gameMixName
        }
      })
      
      res.json(enhancedSlots)
      return
    }
    
    // On local development, try to connect to Cyber database
    // For now, just use JSON fallback
    console.log('🔄 Using JSON fallback for slots (local mode)')
    const slots = loadExportedData('slots.json')
    const locations = loadExportedData('locations.json')
    const gameMixes = loadExportedData('game-mixes.json')
    const machineGames = loadExportedData('machine_games.json')
    
    // Enhance slots with address, jackpot data, and game mix
    const enhancedSlots = slots.map(slot => {
      // Find location details
      const location = locations.find(loc => loc.location === slot.location)
      
      // Find game mix by ID from machine_games mapping
      let gameMixName = 'N/A'
      const machineGame = machineGames.find(mg => mg.serial_number === slot.serial_number)
      if (machineGame && machineGame.game_mix_id) {
        const gameMix = gameMixes.find(gm => gm.id === machineGame.game_mix_id)
        gameMixName = gameMix ? gameMix.name : 'N/A'
      } else if (slot.game_mix && slot.game_mix !== null) {
        // If game_mix is already populated, use it
        gameMixName = slot.game_mix
      }
      
      return {
        ...slot,
        address: location?.address || 'N/A',
        city: location?.city || 'N/A',
        company: location?.company || 'N/A',
        game_mix: gameMixName
      }
    })
    
    res.json(enhancedSlots)
  } catch (error) {
    console.error('Error fetching Cyber slots from database, using exported data:', error.message)
    const slots = loadExportedData('slots.json')
    const locations = loadExportedData('locations.json')
    const gameMixes = loadExportedData('game-mixes.json')
    const machineGames = loadExportedData('machine_games.json')
    
    // Enhance slots with address, jackpot data, and game mix
    const enhancedSlots = slots.map(slot => {
      const location = locations.find(loc => loc.location === slot.location)
      
      // Find game mix by ID from machine_games mapping
      let gameMixName = 'N/A'
      const machineGame = machineGames.find(mg => mg.serial_number === slot.serial_number)
      if (machineGame && machineGame.game_mix_id) {
        const gameMix = gameMixes.find(gm => gm.id === machineGame.game_mix_id)
        gameMixName = gameMix ? gameMix.name : 'N/A'
      } else if (slot.game_mix && slot.game_mix !== null) {
        // If game_mix is already populated, use it
        gameMixName = slot.game_mix
      }
      
      return {
        ...slot,
        address: location?.address || 'N/A',
        city: location?.city || 'N/A',
        company: location?.company || 'N/A',
        game_mix: gameMixName
      }
    })
    
    res.json(enhancedSlots)
  }
})

// Get jackpots for slots
router.get('/slots-with-jackpots', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    // Get all slots with their jackpots and game mixes
    const query = `
      SELECT 
        s.*,
        j.id as jackpot_id,
        j.jackpot_name,
        j.jackpot_type,
        j.current_amount,
        j.max_amount,
        j.progress_percentage,
        j.status as jackpot_status,
        j.winner,
        j.triggered_date,
        gm.name as game_mix_name
      FROM slots s
      LEFT JOIN jackpots j ON s.serial_number = j.serial_number
      LEFT JOIN game_mixes gm ON s.game_mix_id = gm.id
      ORDER BY s.created_at DESC
    `
    
    const result = await pool.query(query)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching slots with jackpots:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get all locations from Cyber (with fallback to hardcoded data)
router.get('/locations', async (req, res) => {
  try {
    // On Render, use JSON fallback only
    if (process.env.RENDER === 'true') {
      console.log('🔄 Using JSON fallback for locations (Render mode)')
      const locations = loadExportedData('locations.json')
      res.json(locations)
      return
    }
    
    const cyberPool = getCyberConnection()
    const connection = await cyberPool.getConnection()
    
    // Query to get locations from Cyber database
    const query = `
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
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching Cyber locations from database, using exported data:', error.message)
    const fallbackData = loadExportedData('locations.json')
    res.json(fallbackData)
  }
})

// Get all cabinets from Cyber
router.get('/cabinets', async (req, res) => {
  try {
    // On Render, use JSON fallback only
    if (process.env.RENDER === 'true') {
      console.log('🔄 Using JSON fallback for cabinets (Render mode)')
      const cabinets = loadExportedData('cabinets.json')
      res.json(cabinets)
      return
    }
    
    const cyberPool = getCyberConnection()
    const connection = await cyberPool.getConnection()
    
    const query = `
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM machine_cabinet_types
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching Cyber cabinets from database, using exported data:', error.message)
    const fallbackData = loadExportedData('cabinets.json')
    res.json(fallbackData)
  }
})

// Get all game mixes from Cyber
router.get('/game-mixes', async (req, res) => {
  try {
    // On Render, use JSON fallback only
    if (process.env.RENDER === 'true') {
      console.log('🔄 Using JSON fallback for game-mixes (Render mode)')
      const gameMixes = loadExportedData('game-mixes.json')
      res.json(gameMixes)
      return
    }
    
    const cyberPool = getCyberConnection()
    const connection = await cyberPool.getConnection()
    
    const query = `
      SELECT 
        id,
        name,
        description,
        created_at,
        updated_at
      FROM machine_game_templates
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching Cyber game mixes from database, using exported data:', error.message)
    const fallbackData = loadExportedData('game-mixes.json')
    res.json(fallbackData)
  }
})

// Get all providers from Cyber
router.get('/providers', async (req, res) => {
  try {
    // On Render, use JSON fallback only
    if (process.env.RENDER === 'true') {
      console.log('🔄 Using JSON fallback for providers (Render mode)')
      const providers = loadExportedData('providers.json')
      res.json(providers)
      return
    }
    
    const cyberPool = getCyberConnection()
    const connection = await cyberPool.getConnection()
    
    const query = `
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM machine_manufacturers
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching Cyber providers from database, using exported data:', error.message)
    const fallbackData = loadExportedData('providers.json')
    res.json(fallbackData)
  }
})

// Get Marina database schema info
router.get('/schema', async (req, res) => {
  try {
    const cyberPool = getCyberConnection()
    const connection = await cyberPool.getConnection()
    
    // Get all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'cyberslot_dbn'
      ORDER BY table_name
    `
    
    const [tablesRows] = await connection.execute(tablesQuery)
    
    // Get columns for each table
    const schema = {}
    for (const table of tablesRows) {
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = ? AND table_schema = 'cyberslot_dbn'
        ORDER BY ordinal_position
      `
      const [columnsRows] = await connection.execute(columnsQuery, [table.table_name])
      schema[table.table_name] = columnsRows
    }
    
    connection.release()
    
    res.json({
      tables: tablesRows.map(row => row.table_name),
      schema
    })
  } catch (error) {
    console.error('Error fetching Marina schema:', error)
    res.status(500).json({ error: 'Failed to fetch Marina schema' })
  }
})

export default router
