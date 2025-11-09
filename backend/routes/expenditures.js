import express from 'express'
import pg from 'pg'

const router = express.Router()
const { Pool } = pg

// External DB connection pool (for expenditures)
let externalPool = null

const getExternalPool = () => {
  if (!externalPool) {
    externalPool = new Pool({
      user: process.env.EXPENDITURES_DB_USER || 'cashpot',
      password: process.env.EXPENDITURES_DB_PASSWORD || '129hj8oahwd7yaw3e21321',
      host: process.env.EXPENDITURES_DB_HOST || '192.168.1.39',
      port: process.env.EXPENDITURES_DB_PORT || 26257,
      database: process.env.EXPENDITURES_DB_NAME || 'cashpot',
      ssl: false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
    
    externalPool.on('error', (err) => {
      console.error('❌ External DB pool error:', err)
    })
  }
  return externalPool
}

// Test connection to external DB
router.get('/test-connection', async (req, res) => {
  try {
    const pool = getExternalPool()
    const result = await pool.query('SELECT NOW() as current_time')
    res.json({ 
      success: true, 
      message: 'Connection successful',
      timestamp: result.rows[0].current_time
    })
  } catch (error) {
    console.error('External DB connection error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Get external locations - HYBRID: Hardcoded + Local Sync Data
router.get('/external-locations', async (req, res) => {
  try {
    const localPool = req.app.get('pool')
    
    // HARDCODED locations (din Power BI + datele user-ului)
    const hardcodedLocations = [
      { id: 1, name: 'Pitesti', record_count: 0, total_amount: 0 },
      { id: 2, name: 'Craiova', record_count: 0, total_amount: 0 },
      { id: 3, name: 'Ploiesti (nord)', record_count: 0, total_amount: 0 },
      { id: 4, name: 'Ploiesti (centru)', record_count: 0, total_amount: 0 },
      { id: 5, name: 'Valcea', record_count: 0, total_amount: 0 }
    ]
    
    // Try to get from local sync data (dacă există)
    try {
      const result = await localPool.query(`
        SELECT DISTINCT 
          ROW_NUMBER() OVER (ORDER BY location_name) as id,
          location_name as name,
          COUNT(*) as record_count,
          SUM(amount) as total_amount
        FROM expenditures_sync
        WHERE location_name IS NOT NULL AND location_name != ''
        GROUP BY location_name
        ORDER BY location_name
      `)
      
      if (result.rows.length > 0) {
        console.log(`✅ Found ${result.rows.length} locations in local sync data`)
        return res.json(result.rows)
      }
    } catch (dbError) {
      console.log('⚠️ No sync data yet, returning hardcoded locations')
    }
    
    // Fallback: Return hardcoded list
    console.log(`✅ Returning ${hardcodedLocations.length} hardcoded locations`)
    res.json(hardcodedLocations)
  } catch (error) {
    console.error('❌ Error fetching locations:', error)
    res.json([])
  }
})

// Get expenditure types - HYBRID: Hardcoded + Local Sync Data
router.get('/expenditure-types', async (req, res) => {
  try {
    const localPool = req.app.get('pool')
    
    // HARDCODED categories (comune) - user poate configura ÎNAINTE de sync
    const hardcodedTypes = [
      { id: 1, name: 'Chirie locație lunară', record_count: 0, total_amount: 0 },
      { id: 2, name: 'Chirie Spațiu', record_count: 0, total_amount: 0 },
      { id: 3, name: 'Utilități (Gaze)', record_count: 0, total_amount: 0 },
      { id: 4, name: 'Utilități (Curent Electric)', record_count: 0, total_amount: 0 },
      { id: 5, name: 'Utilități (Apă)', record_count: 0, total_amount: 0 },
      { id: 6, name: 'Salarii Personal', record_count: 0, total_amount: 0 },
      { id: 7, name: 'Întreținere Echipamente', record_count: 0, total_amount: 0 },
      { id: 8, name: 'Consumabile', record_count: 0, total_amount: 0 },
      { id: 9, name: 'Reparații', record_count: 0, total_amount: 0 },
      { id: 10, name: 'Marketing', record_count: 0, total_amount: 0 }
    ]
    
    // Try to get from local sync data (dacă există)
    try {
      const result = await localPool.query(`
        SELECT DISTINCT 
          ROW_NUMBER() OVER (ORDER BY expenditure_type) as id,
          expenditure_type as name,
          COUNT(*) as record_count,
          SUM(amount) as total_amount
        FROM expenditures_sync
        WHERE expenditure_type IS NOT NULL AND expenditure_type != ''
        GROUP BY expenditure_type
        ORDER BY expenditure_type
      `)
      
      if (result.rows.length > 0) {
        console.log(`✅ Found ${result.rows.length} expenditure types in local sync data`)
        return res.json(result.rows)
      }
    } catch (dbError) {
      console.log('⚠️ No sync data yet, returning hardcoded categories')
    }
    
    // Fallback: Return hardcoded list
    console.log(`✅ Returning ${hardcodedTypes.length} hardcoded categories`)
    res.json(hardcodedTypes)
  } catch (error) {
    console.error('❌ Error fetching expenditure types:', error)
    res.json([])
  }
})

// Get departments - HYBRID: Hardcoded + Local Sync Data
router.get('/departments', async (req, res) => {
  try {
    const localPool = req.app.get('pool')
    
    // HARDCODED departments from Power BI (user poate configura ÎNAINTE de sync!)
    const hardcodedDepartments = [
      { id: 1, name: 'Unknown', record_count: 0, total_amount: 0 },
      { id: 2, name: 'Bancă', record_count: 0, total_amount: 0 },
      { id: 3, name: 'POS', record_count: 0, total_amount: 0 },
      { id: 4, name: 'Registru de Casă', record_count: 0, total_amount: 0 },
      { id: 5, name: 'Alte Cheltuieli', record_count: 0, total_amount: 0 },
      { id: 6, name: 'Salarii', record_count: 0, total_amount: 0 }
    ]
    
    // Try to get from local sync data (dacă există)
    try {
      const result = await localPool.query(`
        SELECT DISTINCT 
          ROW_NUMBER() OVER (ORDER BY department_name) as id,
          department_name as name,
          COUNT(*) as record_count,
          SUM(amount) as total_amount
        FROM expenditures_sync
        WHERE department_name IS NOT NULL AND department_name != ''
        GROUP BY department_name
        ORDER BY department_name
      `)
      
      if (result.rows.length > 0) {
        console.log(`✅ Found ${result.rows.length} departments in local sync data`)
        return res.json(result.rows)
      }
    } catch (dbError) {
      console.log('⚠️ No sync data yet, returning hardcoded departments')
    }
    
    // Fallback: Return hardcoded list
    console.log(`✅ Returning ${hardcodedDepartments.length} hardcoded departments (user poate configura ÎNAINTE de sync)`)
    res.json(hardcodedDepartments)
  } catch (error) {
    console.error('❌ Error fetching departments:', error)
    res.json([])
  }
})

// UPLOAD data directly from LOCAL sync script (bypass external DB connection!)
router.post('/upload', async (req, res) => {
  try {
    const { records } = req.body
    const localPool = req.app.get('pool')
    
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid format. Expected: { records: [...] }' 
      })
    }
    
    console.log(`📤 Receiving ${records.length} expenditure records from LOCAL sync...`)
    
    // Clear old data
    await localPool.query('DELETE FROM expenditures_sync')
    console.log('🗑️ Cleared old expenditures data')
    
    // Insert new records
    let inserted = 0
    for (const record of records) {
      await localPool.query(`
        INSERT INTO expenditures_sync (
          location_name, department_name, expenditure_type, amount, 
          operational_date, synced_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        record.location_name || 'Unknown',
        record.department_name || 'Unknown',
        record.expenditure_type || 'Unknown',
        parseFloat(record.amount || 0),
        record.operational_date
      ])
      inserted++
    }
    
    console.log(`✅ Successfully inserted ${inserted} expenditure records!`)
    res.json({ 
      success: true, 
      message: `Uploaded ${inserted} records`, 
      records: inserted 
    })
  } catch (error) {
    console.error('❌ Error uploading expenditures:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Sync expenditures data from external DB
router.post('/sync', async (req, res) => {
  try {
    const { startDate, endDate, filters } = req.body
    const localPool = req.app.get('pool')
    
    // Try to get external pool - catch error if connection fails
    let externalPool
    try {
      externalPool = getExternalPool()
    } catch (poolError) {
      console.error('❌ Cannot create external DB pool:', poolError.message)
      return res.status(500).json({
        success: false,
        error: 'Nu se poate conecta la DB extern. Folosește LOCAL sync script când ești conectat remote la birou!',
        hint: 'cd backend && npm run sync-expenditures'
      })
    }
    
    console.log('🔄 Starting expenditures sync...', { startDate, endDate, filters })
    
    // Load settings to get included items
    const settingsResult = await localPool.query(`
      SELECT setting_value 
      FROM global_settings 
      WHERE setting_key = 'expenditures_sync_config'
    `)
    
    let syncSettings = {
      includedExpenditureTypes: [],
      includedDepartments: [],
      includedLocations: [],
      excludeDeleted: true,
      showInExpenditures: null
    }
    
    if (settingsResult.rows.length > 0) {
      syncSettings = { ...syncSettings, ...JSON.parse(settingsResult.rows[0].setting_value) }
    }
    
    console.log('📋 Sync settings:', syncSettings)
    
    // Build WHERE clause based on filters
    let whereConditions = []
    const queryParams = []
    let paramCounter = 1
    
    // is_deleted filter
    if (syncSettings.excludeDeleted) {
      whereConditions.push('p.is_deleted = false')
    }
    
    // show_in_expenditures filter
    if (syncSettings.showInExpenditures !== null) {
      whereConditions.push(`p.show_in_expenditures = ${syncSettings.showInExpenditures}`)
    }
    
    if (startDate) {
      whereConditions.push(`p.operational_date >= $${paramCounter}`)
      queryParams.push(startDate)
      paramCounter++
    }
    
    if (endDate) {
      whereConditions.push(`p.operational_date <= $${paramCounter}`)
      queryParams.push(endDate)
      paramCounter++
    }
    
    const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1'
    
    // Fetch data from external DB
    const query = `
      SELECT 
        l.id as location_id,
        l.name as location_name,
        d.name as department_name,
        et.name as expenditure_type,
        p.amount,
        p.operational_date,
        p.id as payment_id
      FROM public.casino_payments p
      LEFT JOIN public.casino_locations l ON p.location_id = l.id
      LEFT JOIN public.casino_departments d ON p.department_id = d.id
      LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
      WHERE ${whereClause}
      ORDER BY p.operational_date DESC, l.name, et.name
    `
    
    const result = await externalPool.query(query, queryParams)
    console.log(`✅ Fetched ${result.rows.length} expenditure records from external DB`)
    
    // Filter data based on included items
    let filteredRows = result.rows
    
    // Filter by expenditure types (only if list is not empty)
    if (syncSettings.includedExpenditureTypes && syncSettings.includedExpenditureTypes.length > 0) {
      filteredRows = filteredRows.filter(row => 
        syncSettings.includedExpenditureTypes.includes(row.expenditure_type)
      )
      console.log(`📊 Filtered by expenditure types: ${filteredRows.length} records remaining`)
    }
    
    // Filter by departments (only if list is not empty)
    if (syncSettings.includedDepartments && syncSettings.includedDepartments.length > 0) {
      filteredRows = filteredRows.filter(row => 
        syncSettings.includedDepartments.includes(row.department_name)
      )
      console.log(`📊 Filtered by departments: ${filteredRows.length} records remaining`)
    }
    
    // Filter by locations (only if list is not empty)
    if (syncSettings.includedLocations && syncSettings.includedLocations.length > 0) {
      filteredRows = filteredRows.filter(row => 
        syncSettings.includedLocations.includes(row.location_name)
      )
      console.log(`📊 Filtered by locations: ${filteredRows.length} records remaining`)
    }
    
    console.log(`✅ Final filtered data: ${filteredRows.length} records`)
    
    // Clear existing sync data
    await localPool.query('DELETE FROM expenditures_sync')
    
    // Get location mapping
    const mappingResult = await localPool.query('SELECT * FROM expenditure_location_mapping')
    const mapping = {}
    mappingResult.rows.forEach(row => {
      mapping[row.external_location_name] = row.local_location_id
    })
    
    // Insert synced data
    let inserted = 0
    for (const row of filteredRows) {
      const mappedLocationId = mapping[row.location_name] || null
      
      await localPool.query(`
        INSERT INTO expenditures_sync (
          location_name, department_name, expenditure_type, amount, 
          operational_date, synced_at, original_location_id, mapped_location_id
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
      `, [
        row.location_name,
        row.department_name,
        row.expenditure_type,
        row.amount,
        row.operational_date,
        row.location_id,
        mappedLocationId
      ])
      inserted++
    }
    
    console.log(`✅ Synced ${inserted} expenditure records to local DB`)
    
    res.json({
      success: true,
      message: `Synchronized ${inserted} records`,
      records: inserted,
      dateRange: { startDate, endDate }
    })
  } catch (error) {
    console.error('Error syncing expenditures:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get synced expenditures data
router.get('/data', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const result = await pool.query(`
      SELECT * FROM expenditures_sync
      ORDER BY operational_date DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching expenditures:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get location mapping
router.get('/mapping', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const result = await pool.query('SELECT * FROM expenditure_location_mapping ORDER BY external_location_name')
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching mapping:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update location mapping
router.put('/mapping', async (req, res) => {
  try {
    const { mappings } = req.body // Array of { external_location_name, local_location_id }
    const pool = req.app.get('pool')
    
    // Clear existing mappings
    await pool.query('DELETE FROM expenditure_location_mapping')
    
    // Insert new mappings
    for (const mapping of mappings) {
      if (mapping.local_location_id) {
        await pool.query(
          'INSERT INTO expenditure_location_mapping (external_location_name, local_location_id) VALUES ($1, $2)',
          [mapping.external_location_name, mapping.local_location_id]
        )
      }
    }
    
    res.json({ success: true, message: 'Mapping updated successfully' })
  } catch (error) {
    console.error('Error updating mapping:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get sync settings
router.get('/settings', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const result = await pool.query(`
      SELECT setting_value 
      FROM global_settings 
      WHERE setting_key = 'expenditures_sync_config'
    `)
    
    if (result.rows.length > 0) {
      const settings = JSON.parse(result.rows[0].setting_value)
      console.log('✅ Loaded expenditures settings from DB:', settings)
      res.json(settings)
    } else {
      // Default settings - EXCLUDE 4 departamente
      const defaultSettings = {
        autoSync: false,
        syncInterval: 24,
        syncTime: '02:00',
        excludeDeleted: true,
        showInExpenditures: true,
        includedExpenditureTypes: [], // EMPTY = TOATE tipurile sunt incluse (71/71)
        includedDepartments: [
          'Achiziții Sloturi și accesorii',
          'Asociația pentru drepturi de autor',
          'Bar',
          'Birou',
          'Cheltuieli Administrative',
          'Chirie',
          'Comisioane',
          'Electricitate',
          'Logistica',
          'Marketing',
          'Mentenanța',
          'Metrologie',
          'Pază și Intervenție',
          'Plată utilități',
          'Prestări servicii',
          'Protocol',
          'Salarii',
          'Servicii de Curățenie'
          // EXCLUDE (debifate): Alte Cheltuieli, Bancă, POS, Registru de Casă
        ],
        includedLocations: [] // EMPTY = TOATE locațiile sunt incluse (5/5)
      }
      console.log('⚠️ No settings found, returning defaults (18/22 departments, all types, all locations)')
      res.json(defaultSettings)
    }
  } catch (error) {
    console.error('Error fetching sync settings:', error)
    res.json({
      autoSync: false,
      syncInterval: 24,
      syncTime: '02:00',
      excludeDeleted: true,
      showInExpenditures: true,
      includedExpenditureTypes: [], // TOATE tipurile (71/71)
      includedDepartments: [
        'Achiziții Sloturi și accesorii',
        'Asociația pentru drepturi de autor',
        'Bar',
        'Birou',
        'Cheltuieli Administrative',
        'Chirie',
        'Comisioane',
        'Electricitate',
        'Logistica',
        'Marketing',
        'Mentenanța',
        'Metrologie',
        'Pază și Intervenție',
        'Plată utilități',
        'Prestări servicii',
        'Protocol',
        'Salarii',
        'Servicii de Curățenie'
      ], // 18/22 (exclude: Alte Cheltuieli, Bancă, POS, Registru de Casă)
      includedLocations: [] // TOATE locațiile (5/5)
    })
  }
})

// Update sync settings
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body
    const pool = req.app.get('pool')
    
    console.log('💾 BACKEND - Primesc setări de salvat:')
    console.log('   - includedDepartments:', settings.includedDepartments?.length, 'items')
    console.log('   - includedExpenditureTypes:', settings.includedExpenditureTypes?.length, 'items')
    console.log('   - includedLocations:', settings.includedLocations?.length, 'items')
    console.log('   - Full departments array:', settings.includedDepartments)
    
    // Clean settings object (remove undefined/null/circular refs)
    const cleanSettings = {
      autoSync: settings.autoSync || false,
      syncInterval: settings.syncInterval || 24,
      syncTime: settings.syncTime || '02:00',
      excludeDeleted: settings.excludeDeleted !== undefined ? settings.excludeDeleted : true,
      showInExpenditures: settings.showInExpenditures !== undefined ? settings.showInExpenditures : true,
      includedExpenditureTypes: Array.isArray(settings.includedExpenditureTypes) ? settings.includedExpenditureTypes : [],
      includedDepartments: Array.isArray(settings.includedDepartments) ? settings.includedDepartments : [],
      includedLocations: Array.isArray(settings.includedLocations) ? settings.includedLocations : []
    }
    
    // SALVARE directă ca JSONB (NU string!)
    console.log('📦 Salvez direct ca JSONB:', JSON.stringify(cleanSettings).substring(0, 200))
    
    await pool.query(`
      INSERT INTO global_settings (setting_key, setting_value)
      VALUES ('expenditures_sync_config', $1::jsonb)
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP
    `, [JSON.stringify(cleanSettings)])
    
    console.log('✅ BACKEND - Setări salvate în DB cu succes!')
    
    // Verifică ce s-a salvat (re-citește)
    const verifyResult = await pool.query(`
      SELECT setting_value 
      FROM global_settings 
      WHERE setting_key = 'expenditures_sync_config'
    `)
    const savedSettings = JSON.parse(verifyResult.rows[0].setting_value)
    console.log('🔍 BACKEND - Verificare: Ce e în DB acum:', {
      departments: savedSettings.includedDepartments?.length,
      types: savedSettings.includedExpenditureTypes?.length,
      locations: savedSettings.includedLocations?.length
    })
    
    res.json({ success: true, message: 'Settings updated successfully', settings: savedSettings })
  } catch (error) {
    console.error('Error updating sync settings:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router

