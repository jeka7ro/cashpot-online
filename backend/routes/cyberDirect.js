import express from 'express'
import mysql from 'mysql2/promise'

const router = express.Router()

// Cyber database connection config
const cyberDbConfig = {
  host: '161.97.133.165',
  user: 'eugen',
  password: '(@Ee0wRHVohZww33',
  database: 'cyberslot_dbn',
  port: 3306,
  connectTimeout: 30000
}

// Fetch yesterday's data from machine_audit_summaries (READ ONLY - for preview)
router.get('/fetch-yesterday', async (req, res) => {
  let cyberConnection = null
  
  try {
    console.log('🔌 Connecting to Cyber database...')
    
    // Connect to Cyber database
    cyberConnection = await mysql.createConnection(cyberDbConfig)
    console.log('✅ Connected to Cyber database')
    
    // Calculate yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    console.log(`📅 Fetching data for yesterday: ${yesterdayStr}`)
    
    // Query from machines table with proper JOINs to get ALL data
    const [rows] = await cyberConnection.execute(
      `SELECT 
        m.id,
        m.slot_machine_id as serial_number,
        l.code as location,
        mct.name as cabinet,
        gt.name as game_mix,
        mm.name as provider,
        mt.manufacture_year,
        l.address,
        CASE WHEN m.active = 1 THEN 'Active' ELSE 'Inactive' END as status,
        m.created_at,
        m.updated_at
       FROM machines m
       LEFT JOIN locations l ON m.location_id = l.id
       LEFT JOIN machine_cabinet_types mct ON m.cabinet_type_id = mct.id
       LEFT JOIN machine_game_templates gt ON m.game_template_id = gt.id
       LEFT JOIN machine_types mt ON m.machine_type_id = mt.id
       LEFT JOIN machine_manufacturers mm ON mt.manufacturer_id = mm.id
       WHERE m.deleted_at IS NULL
         AND (DATE(m.created_at) = ? OR DATE(m.updated_at) = ?)
       ORDER BY m.id DESC`,
      [yesterdayStr, yesterdayStr]
    )
    
    console.log(`📊 Found ${rows.length} records from yesterday`)
    
    // Return data for preview in UI
    res.json({
      success: true,
      date: yesterdayStr,
      count: rows.length,
      data: rows
    })
    
  } catch (error) {
    console.error('❌ Cyber fetch error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Eroare la conectarea sau citirea din baza de date Cyber'
    })
  } finally {
    if (cyberConnection) {
      try {
        await cyberConnection.end()
        console.log('🔌 Cyber connection closed')
      } catch (closeError) {
        console.error('Error closing connection:', closeError)
      }
    }
  }
})

// Import selected items to local database
router.post('/import-selected', async (req, res) => {
  try {
    const { items } = req.body
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nu au fost selectate înregistrări pentru import'
      })
    }
    
    console.log(`📥 Importing ${items.length} selected items...`)
    
    // Get local PostgreSQL pool
    const pool = req.app.get('pool')
    if (!pool) {
      throw new Error('Database pool not available')
    }
    
    // Process each selected record
    let inserted = 0
    let updated = 0
    let errors = 0
    
    for (const row of items) {
      try {
        // Check if record already exists
        const checkResult = await pool.query(
          'SELECT id FROM slots WHERE serial_number = $1',
          [row.serial_number]
        )
        
        if (checkResult.rows.length > 0) {
          // Update existing record
          await pool.query(
            `UPDATE slots SET 
              provider = $1,
              cabinet = $2,
              game_mix = $3,
              location = $4,
              status = $5,
              last_updated = $6
             WHERE serial_number = $7`,
            [
              row.provider || 'N/A',
              row.cabinet || 'N/A',
              row.game_mix || 'N/A',
              row.location || 'N/A',
              row.status || 'Active',
              row.updated_at || new Date(),
              row.serial_number
            ]
          )
          updated++
        } else {
          // Insert new record
          await pool.query(
            `INSERT INTO slots (
              serial_number, provider, cabinet, game_mix, location, status, 
              last_updated, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              row.serial_number,
              row.provider || 'N/A',
              row.cabinet || 'N/A',
              row.game_mix || 'N/A',
              row.location || 'N/A',
              row.status || 'Active',
              row.updated_at || new Date(),
              row.created_at || new Date()
            ]
          )
          inserted++
        }
      } catch (recordError) {
        console.error(`❌ Error processing record ${row.serial_number}:`, recordError.message)
        errors++
      }
    }
    
    const result = {
      success: true,
      total: items.length,
      inserted,
      updated,
      errors,
      message: `Import completat: ${inserted} înregistrări noi, ${updated} actualizate, ${errors} erori`
    }
    
    console.log('✅ Import completed:', result)
    res.json(result)
    
  } catch (error) {
    console.error('❌ Cyber import error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Eroare la conectarea sau importul din baza de date Cyber'
    })
  } finally {
    // Close Cyber connection
    if (cyberConnection) {
      try {
        await cyberConnection.end()
        console.log('🔌 Cyber connection closed')
      } catch (closeError) {
        console.error('Error closing connection:', closeError)
      }
    }
  }
})

// Get connection status
router.get('/test-connection', async (req, res) => {
  let cyberConnection = null
  
  try {
    console.log('🔌 Testing Cyber database connection...')
    cyberConnection = await mysql.createConnection(cyberDbConfig)
    console.log('✅ Connection successful')
    
    // Test query
    const [rows] = await cyberConnection.execute('SELECT COUNT(*) as total FROM machine_audit_summaries')
    
    res.json({
      success: true,
      message: 'Conexiune reușită la baza de date Cyber',
      totalRecords: rows[0].total
    })
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  } finally {
    if (cyberConnection) {
      await cyberConnection.end()
    }
  }
})

export default router

