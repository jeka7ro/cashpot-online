import express from 'express'
import { getMarinaConnection } from '../config/marina.js'

const router = express.Router()

// Get all slots from Marina
router.get('/slots', async (req, res) => {
  try {
    const marinaPool = getMarinaConnection()
    const connection = await marinaPool.getConnection()
    
    // Query to get machines (slots) from Marina database
    const query = `
      SELECT 
        m.id,
        m.slot_machine_id as serial_number,
        mt.name as provider,
        ct.name as cabinet,
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
      LEFT JOIN machine_cabinet_types ct ON m.cabinet_type_id = ct.id
      LEFT JOIN machine_game_templates gt ON m.game_template_id = gt.id
      LEFT JOIN locations l ON m.location_id = l.id
      WHERE m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `
    
    const [rows] = await connection.execute(query)
    connection.release()
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching Marina slots:', error)
    res.status(500).json({ error: 'Failed to fetch slots from Marina' })
  }
})

// Get all locations from Marina
router.get('/locations', async (req, res) => {
  try {
    const marinaPool = getMarinaConnection()
    const connection = await marinaPool.getConnection()
    
    // Query to get locations from Marina database
    const query = `
      SELECT 
        l.id,
        l.code as name,
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
    console.error('Error fetching Marina locations:', error)
    res.status(500).json({ error: 'Failed to fetch locations from Marina' })
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
