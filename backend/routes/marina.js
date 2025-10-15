import express from 'express'
import { getMarinaConnection, testMarinaConnection } from '../config/marina.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Test Marina database connection
router.get('/test', async (req, res) => {
  try {
    const result = await testMarinaConnection()
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
    const marinaPool = getMarinaConnection()
    const connection = await marinaPool.getConnection()
    
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
    console.error('Error fetching Cyber slots from database, trying JSON file...', error.message)
    
    // Fallback to JSON file if database connection fails
    try {
      const jsonPath = path.join(__dirname, '..', 'marina-slots.json')
      if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        console.log(`✅ Loaded ${jsonData.length} slots from JSON file`)
        res.json(jsonData)
      } else {
        res.status(500).json({ error: 'Failed to fetch slots from Cyber and no local file available' })
      }
    } catch (fileError) {
      console.error('Error reading JSON file:', fileError)
      res.status(500).json({ error: 'Failed to fetch slots from Cyber' })
    }
  }
})

// Get all locations from Cyber (with fallback to JSON file)
router.get('/locations', async (req, res) => {
  try {
    const marinaPool = getMarinaConnection()
    const connection = await marinaPool.getConnection()
    
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
    console.error('Error fetching Cyber locations from database, trying JSON file...', error.message)
    
    // Fallback to JSON file if database connection fails
    try {
      const jsonPath = path.join(__dirname, '..', 'marina-locations.json')
      if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        console.log(`✅ Loaded ${jsonData.length} locations from JSON file`)
        res.json(jsonData)
      } else {
        res.status(500).json({ error: 'Failed to fetch locations from Cyber and no local file available' })
      }
    } catch (fileError) {
      console.error('Error reading JSON file:', fileError)
      res.status(500).json({ error: 'Failed to fetch locations from Cyber' })
    }
  }
})

// Get Marina database schema info
router.get('/schema', async (req, res) => {
  try {
    const marinaPool = getMarinaConnection()
    const connection = await marinaPool.getConnection()
    
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
