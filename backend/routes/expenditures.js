import express from 'express'
import pg from 'pg'
import { authenticateToken } from '../middleware/auth.js'

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

// Get sync settings (PER USER!)
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || req.user?.id
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }
    
    // Load settings from user preferences
    const result = await pool.query(`
      SELECT preferences 
      FROM users 
      WHERE id = $1
    `, [userId])
    
    if (result.rows.length > 0 && result.rows[0].preferences?.expendituresSettings) {
      const settings = result.rows[0].preferences.expendituresSettings
      console.log('✅ Loaded expenditures settings for user', userId, ':', settings)
      res.json(settings)
    } else {
      // Default settings - TOATE BIFATE!
      const defaultSettings = {
        autoSync: false,
        syncInterval: 24,
        syncTime: '02:00',
        excludeDeleted: true,
        showInExpenditures: true,
        // TOATE tipurile cheltuieli bifate (71/71)
        includedExpenditureTypes: [
          'Acte Metrologice', 'Alcool', 'Altele', 'Amenajare Sală', 'Amenzi / Taxe / Impozite',
          'Analiza de risc la securitatea fizica', 'Asociație proprietari', 'Bere', 'Bomboane',
          'Cafea', 'Catering', 'Cazare', 'Cheltuieli locale', 'Cheltuieli Marketing',
          'Chirie locatie lunara (factura integrala)', 'Chirie Spațiu', 'Combustibil',
          'Comisioane bancare', 'Comision OMV', 'Comision POS', 'Curățenie birou',
          'Dezinsecție', 'Diurna', 'EGT', 'Electrica (factura integrala)',
          'Factura paza (intergrala)', 'Fise medicale', 'Intervenția', 'Jackpoturi Neînregistrate',
          'Management', 'Mentenanta DVR', 'Mentenanța mașina de numărat bani', 'Muzică Ambientală',
          'Novomatic', 'Pepsi', 'Plăți aparate', 'Plați POS', 'Produse Birotică',
          'Produse Curățenie', 'Produse de întreținere', 'PSI/SSM', 'Reparații sală',
          'Revizie AC', 'Revizie stingătoare', 'Revizii Auto', 'Role imprimantă',
          'Salarii agenți paza', 'Salarii angajați', 'Salariile agenților paza',
          'Salariile angajaților fără agenți', 'Salarii personal curățenie', 'Salubritate',
          'Service Sloturi', 'Servicii Cleaning', 'Servicii curierat', 'Servicii HR',
          'Spălare mochetă', 'Suplimentare Bar', 'Ținuta personal', 'Tombola',
          'Transfer către Sediu', 'Transfer la altă sală', 'Transfer la bancă',
          'Transfer Salarii', 'Transport Marketing', 'Transport Sloturi',
          'TV / INTERNET / TELEFON', 'UCMR ADA / UPFR', 'Unicredit', 'Utilități birou',
          'Utilități spațiu comercial'
        ],
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
      // TOATE tipurile cheltuieli bifate (71/71) - ACELAȘI CA MAI SUS!
      includedExpenditureTypes: [
        'Acte Metrologice', 'Alcool', 'Altele', 'Amenajare Sală', 'Amenzi / Taxe / Impozite',
        'Analiza de risc la securitatea fizica', 'Asociație proprietari', 'Bere', 'Bomboane',
        'Cafea', 'Catering', 'Cazare', 'Cheltuieli locale', 'Cheltuieli Marketing',
        'Chirie locatie lunara (factura integrala)', 'Chirie Spațiu', 'Combustibil',
        'Comisioane bancare', 'Comision OMV', 'Comision POS', 'Curățenie birou',
        'Dezinsecție', 'Diurna', 'EGT', 'Electrica (factura integrala)',
        'Factura paza (intergrala)', 'Fise medicale', 'Intervenția', 'Jackpoturi Neînregistrate',
        'Management', 'Mentenanta DVR', 'Mentenanța mașina de numărat bani', 'Muzică Ambientală',
        'Novomatic', 'Pepsi', 'Plăți aparate', 'Plați POS', 'Produse Birotică',
        'Produse Curățenie', 'Produse de întreținere', 'PSI/SSM', 'Reparații sală',
        'Revizie AC', 'Revizie stingătoare', 'Revizii Auto', 'Role imprimantă',
        'Salarii agenți paza', 'Salarii angajați', 'Salariile agenților paza',
        'Salariile angajaților fără agenți', 'Salarii personal curățenie', 'Salubritate',
        'Service Sloturi', 'Servicii Cleaning', 'Servicii curierat', 'Servicii HR',
        'Spălare mochetă', 'Suplimentare Bar', 'Ținuta personal', 'Tombola',
        'Transfer către Sediu', 'Transfer la altă sală', 'Transfer la bancă',
        'Transfer Salarii', 'Transport Marketing', 'Transport Sloturi',
        'TV / INTERNET / TELEFON', 'UCMR ADA / UPFR', 'Unicredit', 'Utilități birou',
        'Utilități spațiu comercial'
      ],
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

// Update sync settings (PER USER!)
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body
    const pool = req.app.get('pool')
    const userId = req.user?.userId || req.user?.id
    
    console.log('🔧 PUT /settings - Received request')
    console.log('   User ID:', userId)
    console.log('   Settings:', settings ? 'YES' : 'NO')
    console.log('   Pool:', pool ? 'YES' : 'NO')
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' })
    }
    
    // VERIFICARE POOL (Render poate să returneze undefined/null)
    if (!pool) {
      console.error('❌ POOL is NULL/undefined - Render connection failed!')
      return res.status(503).json({ 
        success: false, 
        error: 'Database connection not available. Try again in 30 seconds.' 
      })
    }
    
    console.log('💾 BACKEND - Primesc setări de salvat pentru user', userId, ':')
    console.log('   - includedDepartments:', settings.includedDepartments?.length, 'items')
    console.log('   - includedExpenditureTypes:', settings.includedExpenditureTypes?.length, 'items')
    console.log('   - includedLocations:', settings.includedLocations?.length, 'items')
    console.log('   - Full departments array:', settings.includedDepartments)
    
    // NORMALIZE DIACRITICS (ț/ţ, ș/ş) pentru a detecta duplicate Unicode!
    const normalizeDiacritics = (str) => {
      return str
        .replace(/ţ/g, 'ț')  // sedilă → virgulă
        .replace(/ş/g, 'ș')  // sedilă → virgulă
        .replace(/Ţ/g, 'Ț')
        .replace(/Ş/g, 'Ș')
    }
    
    const removeDuplicatesWithNormalization = (arr) => {
      const seen = new Set()
      const unique = []
      
      arr.forEach(item => {
        const normalized = normalizeDiacritics(item)
        if (!seen.has(normalized)) {
          seen.add(normalized)
          unique.push(normalized) // Salvează forma normalizată
        }
      })
      
      return unique
    }
    
    // Clean settings object (remove undefined/null/circular refs + DUPLICATES!)
    const cleanSettings = {
      autoSync: settings.autoSync || false,
      syncInterval: settings.syncInterval || 24,
      syncTime: settings.syncTime || '02:00',
      excludeDeleted: settings.excludeDeleted !== undefined ? settings.excludeDeleted : true,
      showInExpenditures: settings.showInExpenditures !== undefined ? settings.showInExpenditures : true,
      // REMOVE DUPLICATES cu normalizare diacritice!
      includedExpenditureTypes: Array.isArray(settings.includedExpenditureTypes) 
        ? removeDuplicatesWithNormalization(settings.includedExpenditureTypes)
        : [],
      includedDepartments: Array.isArray(settings.includedDepartments) 
        ? removeDuplicatesWithNormalization(settings.includedDepartments)
        : [],
      includedLocations: Array.isArray(settings.includedLocations) 
        ? removeDuplicatesWithNormalization(settings.includedLocations)
        : []
    }
    
    console.log('🧹 CLEANED arrays (duplicates removed + diacritics normalized):')
    console.log('   - Departments:', cleanSettings.includedDepartments.length, 'unique')
    console.log('   - Types:', cleanSettings.includedExpenditureTypes.length, 'unique')
    console.log('   - Locations:', cleanSettings.includedLocations.length, 'unique')
    console.log('   - Original types count:', settings.includedExpenditureTypes?.length)
    if (settings.includedExpenditureTypes?.length !== cleanSettings.includedExpenditureTypes.length) {
      console.log('   ⚠️ DUPLICATE GĂSIT ȘI ELIMINAT:', 
        settings.includedExpenditureTypes.length - cleanSettings.includedExpenditureTypes.length, 'duplicates')
    }
    
    // SALVARE în users.preferences.expendituresSettings (PER USER!)
    console.log('📦 Salvez setări pentru user', userId)
    
    // 1. Load current preferences
    const currentResult = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId])
    const currentPreferences = currentResult.rows[0]?.preferences || {}
    
    // 2. Update expendituresSettings
    const updatedPreferences = {
      ...currentPreferences,
      expendituresSettings: cleanSettings
    }
    
    // 3. Save back to database
    await pool.query(`
      UPDATE users 
      SET preferences = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [JSON.stringify(updatedPreferences), userId])
    
    console.log('✅ BACKEND - Setări salvate în users.preferences pentru user', userId)
    
    // Verifică ce s-a salvat (re-citește)
    const verifyResult = await pool.query(`
      SELECT preferences 
      FROM users 
      WHERE id = $1
    `, [userId])
    
    const savedSettings = verifyResult.rows[0].preferences?.expendituresSettings
    console.log('🔍 BACKEND - Verificare: Ce e în DB pentru user', userId, ':', {
      departments: savedSettings?.includedDepartments?.length,
      types: savedSettings?.includedExpenditureTypes?.length,
      locations: savedSettings?.includedLocations?.length
    })
    
    res.json({ success: true, message: 'Settings updated successfully for user ' + userId, settings: savedSettings })
  } catch (error) {
    console.error('Error updating sync settings:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== GOOGLE SHEETS SYNC ====================

// PREVIEW Google Sheets data (NO IMPORT)
router.post('/preview-google-sheets', authenticateToken, async (req, res) => {
  try {
    const { sheetUrl } = req.body
    
    if (!sheetUrl) {
      return res.status(400).json({ success: false, error: 'Sheet URL is required' })
    }
    
    console.log('👀 PREVIEW Google Sheets data from:', sheetUrl)
    
    // Convert Google Sheets URL to CSV export URL
    let csvUrl = sheetUrl
    if (sheetUrl.includes('/edit')) {
      const sheetId = sheetUrl.match(/\/d\/(.*?)\//)?.[1]
      const gid = sheetUrl.match(/gid=(\d+)/)?.[1] || '0'
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    }
    
    // Fetch CSV data
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`)
    }
    
    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV is empty or invalid' })
    }
    
    // Parse CSV (skip header)
    const rows = lines.slice(1)
    
    // PostgreSQL connection
    const { Pool } = pg
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
    
    let newRows = []
    let duplicates = []
    let errors = 0
    
    console.log(`📊 Total rows in CSV: ${rows.length}`)
    
    for (const row of rows) { // Procesează TOATE rândurile pentru preview
      try {
        // Parse CSV with better handling
        const values = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim()) // Last value
        
        // Log doar la fiecare 100 rânduri
        if (newRows.length % 100 === 0 && newRows.length > 0) {
          console.log(`✅ Procesat ${newRows.length + duplicates.length + errors} rânduri...`)
        }
        
        if (values.length < 5) { // Minim 5 coloane: Date, Amount, Location, Department, Type
          console.log(`⚠️ Skipping row with only ${values.length} columns`)
          errors++
          continue
        }
        
        const [dateStr, explanation, amountStr, location, department, expenditureType, createdBy, createdAt] = values
        
        // Parse date - accept multiple formats
        let operationalDate
        if (dateStr.includes('.')) {
          // DD.MM.YYYY
          const dateParts = dateStr.split('.')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
          }
        } else if (dateStr.includes('/')) {
          // MM/DD/YYYY or DD/MM/YYYY
          const dateParts = dateStr.split('/')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
          }
        } else if (dateStr.includes('-')) {
          // YYYY-MM-DD (already correct)
          operationalDate = dateStr
        }
        
        if (!operationalDate) {
          console.log(`⚠️ Invalid date format: "${dateStr}"`)
          errors++
          continue
        }
        
        // Parse amount - handle multiple formats
        let amount
        if (amountStr) {
          // Remove spaces, thousand separators (. or ,), then parse
          const cleanAmount = amountStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
          amount = parseFloat(cleanAmount)
        }
        
        if (!amount || isNaN(amount) || !location || !department) {
          console.log(`⚠️ Invalid data: amount=${amount}, location="${location}", department="${department}"`)
          errors++
          continue
        }
        
        // Check if exists in DB
        const existing = await pool.query(`
          SELECT id FROM expenditures_sync 
          WHERE operational_date = $1 
            AND amount = $2 
            AND location_name = $3 
            AND department_name = $4
            AND expenditure_type = $5
          LIMIT 1
        `, [operationalDate, amount, location, department, expenditureType])
        
        const rowData = {
          date: operationalDate,
          amount: amount,
          location: location,
          department: department,
          type: expenditureType,
          description: explanation
        }
        
        if (existing.rows.length > 0) {
          duplicates.push(rowData)
        } else {
          newRows.push(rowData)
        }
        
      } catch (rowError) {
        console.error('❌ Error processing row:', rowError.message)
        errors++
      }
    }
    
    await pool.end()
    
    console.log(`👀 Preview COMPLET: ${newRows.length} noi, ${duplicates.length} duplicate, ${errors} erori din ${rows.length} total`)
    
    res.json({ 
      success: true, 
      totalRows: rows.length,
      newRows: newRows.slice(0, 20), // Sample doar primele 20 pentru display
      duplicates: duplicates.slice(0, 10), // Sample de 10
      newCount: newRows.length, // Dar COUNT-ul total corect!
      duplicateCount: duplicates.length,
      errorCount: errors
    })
    
  } catch (error) {
    console.error('❌ Preview error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Import CSV from Google Sheets
router.post('/import-google-sheets', authenticateToken, async (req, res) => {
  try {
    const { sheetUrl, force = false } = req.body
    
    if (!sheetUrl) {
      return res.status(400).json({ success: false, error: 'Sheet URL is required' })
    }
    
    console.log('🔄 Starting Google Sheets import from:', sheetUrl)
    
    // Convert Google Sheets URL to CSV export URL
    let csvUrl = sheetUrl
    if (sheetUrl.includes('/edit')) {
      const sheetId = sheetUrl.match(/\/d\/(.*?)\//)?.[1]
      const gid = sheetUrl.match(/gid=(\d+)/)?.[1] || '0'
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    }
    
    console.log('📥 Fetching CSV from:', csvUrl)
    
    // Fetch CSV data
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`)
    }
    
    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return res.status(400).json({ success: false, error: 'CSV is empty or invalid' })
    }
    
    // Parse CSV (skip header)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1)
    
    console.log(`📊 CSV Headers: ${headers.slice(0, 8).join(', ')}`)
    console.log(`📈 Total rows to process: ${rows.length}`)
    
    // PostgreSQL connection (Render.com DB)
    const { Pool } = pg
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
    
    let imported = 0
    let skipped = 0
    let errors = 0
    
    for (const row of rows) {
      try {
        // Parse CSV with proper quote handling
        const values = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        values.push(current.trim()) // Last value
        
        if (values.length < 5) { // Minim 5 coloane
          console.log('⚠️ Skipping row with only', values.length, 'columns')
          skipped++
          continue
        }
        
        // Map columns (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7)
        const [dateStr, explanation, amountStr, location, department, expenditureType, createdBy, createdAt] = values
        
        // Parse date - accept multiple formats
        let operationalDate
        if (dateStr.includes('.')) {
          const dateParts = dateStr.split('.')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
          }
        } else if (dateStr.includes('/')) {
          const dateParts = dateStr.split('/')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
          }
        } else if (dateStr.includes('-')) {
          operationalDate = dateStr
        }
        
        if (!operationalDate) {
          console.log('⚠️ Invalid date format:', dateStr)
          skipped++
          continue
        }
        
        // Parse amount - handle multiple formats
        let amount
        if (amountStr) {
          const cleanAmount = amountStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
          amount = parseFloat(cleanAmount)
        }
        
        if (!amount || isNaN(amount) || !location || !department) {
          console.log('⚠️ Invalid data:', { amount, location, department })
          skipped++
          continue
        }
        
        // Check if already exists (to avoid duplicates)
        if (!force) {
          const existing = await pool.query(`
            SELECT id FROM expenditures_sync 
            WHERE operational_date = $1 
              AND amount = $2 
              AND location_name = $3 
              AND department_name = $4
              AND expenditure_type = $5
            LIMIT 1
          `, [operationalDate, amount, location, department, expenditureType])
          
          if (existing.rows.length > 0) {
            skipped++
            continue
          }
        }
        
        // Insert into DB
        await pool.query(`
          INSERT INTO expenditures_sync (
            operational_date, 
            amount, 
            location_name, 
            department_name, 
            expenditure_type, 
            description, 
            data_source,
            created_by,
            synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [operationalDate, amount, location, department, expenditureType, explanation, 'google_sheets', createdBy])
        
        imported++
        
        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} rows...`)
        }
        
      } catch (rowError) {
        console.error('❌ Error processing row:', rowError.message)
        errors++
      }
    }
    
    await pool.end()
    
    console.log(`🎉 Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`)
    
    res.json({ 
      success: true, 
      imported, 
      skipped, 
      errors,
      message: `Successfully imported ${imported} expenditures from Google Sheets`
    })
    
  } catch (error) {
    console.error('❌ Google Sheets import error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Check if Google Sheets data exists
router.get('/google-sheets-status', authenticateToken, async (req, res) => {
  try {
    const { Pool } = pg
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        MIN(operational_date) as earliest_date,
        MAX(operational_date) as latest_date,
        SUM(amount) as total_amount
      FROM expenditures_sync 
      WHERE data_source = 'google_sheets'
    `)
    
    await pool.end()
    
    const stats = result.rows[0]
    
    res.json({ 
      success: true, 
      hasData: parseInt(stats.total_records) > 0,
      stats: {
        totalRecords: parseInt(stats.total_records),
        earliestDate: stats.earliest_date,
        latestDate: stats.latest_date,
        totalAmount: parseFloat(stats.total_amount || 0)
      }
    })
  } catch (error) {
    console.error('Error checking Google Sheets status:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get Google Sheets sync settings
router.get('/google-sheets-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    const { Pool } = pg
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
    
    const result = await pool.query(`
      SELECT preferences 
      FROM users 
      WHERE id = $1
    `, [userId])
    
    await pool.end()
    
    const settings = result.rows[0]?.preferences?.googleSheetsSync || {
      enabled: false,
      sheetUrl: '',
      syncInterval: 24, // hours
      lastSync: null
    }
    
    res.json({ success: true, settings })
  } catch (error) {
    console.error('Error loading Google Sheets settings:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update Google Sheets sync settings
router.put('/google-sheets-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { enabled, sheetUrl, syncInterval } = req.body
    
    const { Pool } = pg
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
    
    // Get current preferences
    const current = await pool.query(`
      SELECT preferences 
      FROM users 
      WHERE id = $1
    `, [userId])
    
    const preferences = current.rows[0]?.preferences || {}
    
    // Update Google Sheets sync settings
    preferences.googleSheetsSync = {
      enabled,
      sheetUrl,
      syncInterval: parseInt(syncInterval) || 24,
      lastSync: preferences.googleSheetsSync?.lastSync || null
    }
    
    // Save to DB
    await pool.query(`
      UPDATE users 
      SET preferences = $1 
      WHERE id = $2
    `, [JSON.stringify(preferences), userId])
    
    await pool.end()
    
    console.log('✅ Google Sheets sync settings saved for user', userId)
    
    res.json({ success: true, settings: preferences.googleSheetsSync })
  } catch (error) {
    console.error('Error updating Google Sheets settings:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router

