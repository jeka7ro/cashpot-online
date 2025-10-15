import express from 'express'
import { getCyberConnection, testCyberConnection } from '../config/cyber.js'
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
    const result = await testCyberConnection()
    if (result) {
      res.json({ success: true, message: 'Cyber database connection successful' })
    } else {
      res.status(500).json({ success: false, message: 'Cyber database connection failed' })
    }
  } catch (error) {
    console.error('Cyber connection test error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get all slots from Cyber (with fallback to JSON file)
router.get('/slots', async (req, res) => {
  try {
    const cyberPool = getCyberConnection()
    const connection = await cyberPool.getConnection()
    
    // Query to get machines (slots) from Cyber database with correct table structure
    const query = `
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
    `
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching Cyber slots from database, using exported data:', error.message)
    const fallbackData = loadExportedData('slots.json')
    res.json(fallbackData)
  }
})

// Get all locations from Cyber (with fallback to hardcoded data)
router.get('/locations', async (req, res) => {
  try {
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
