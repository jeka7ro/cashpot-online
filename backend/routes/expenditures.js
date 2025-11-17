import express from 'express'
import pg from 'pg'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
const { Pool } = pg

// Global variable to track sync progress
let _syncProgress = null

// Progress manager for sync
export const syncProgressManager = {
  getProgress: () => _syncProgress,
  setProgress: (progress) => { _syncProgress = progress },
  clearProgress: () => { _syncProgress = null }
}

// Global variable to track import-all progress
let _importAllProgress = null

// Progress manager for import-all
export const importAllProgressManager = {
  getProgress: () => _importAllProgress,
  setProgress: (progress) => { _importAllProgress = progress },
  clearProgress: () => { _importAllProgress = null }
}

const SQL_TABLE_SORT_COLUMNS = {
  operational_date: 'operational_date',
  amount: 'amount',
  location_name: 'location_name',
  department_name: 'department_name',
  expenditure_type: 'expenditure_type',
  data_source: 'data_source',
  created_at: 'created_at',
  updated_at: 'updated_at'
}

const getIncludedFiltersForUser = async (pool, userId) => {
  const result = {
    departments: null,
    types: null,
    locations: null
  }

  if (!userId) {
    return result
  }

  try {
    const settingsResult = await pool.query(
      `
        SELECT preferences
        FROM users
        WHERE id = $1
      `,
      [userId]
    )

    const preferences = settingsResult.rows[0]?.preferences?.expendituresSettings
    if (preferences) {
      if (Array.isArray(preferences.includedDepartments)) {
        result.departments = preferences.includedDepartments.filter(Boolean)
      }
      if (Array.isArray(preferences.includedExpenditureTypes)) {
        result.types = preferences.includedExpenditureTypes.filter(Boolean)
      }
      if (Array.isArray(preferences.includedLocations)) {
        result.locations = preferences.includedLocations.filter(Boolean)
      }
    }
  } catch (error) {
    console.error('Error loading expenditures settings for SQL table:', error)
  }

  return result
}

const buildSqlTableWhereClause = (query, includedFilters) => {
  const {
    startDate,
    endDate,
    department = 'all',
    type = 'all',
    location = 'all',
    dataSource = 'all',
    search = ''
  } = query

  const filters = []
  const values = []
  let paramIndex = 1

  const { departments, types, locations } = includedFilters

  if (departments && departments.length > 0) {
    filters.push(`department_name = ANY($${paramIndex++}::text[])`)
    values.push(departments)
  }

  if (types && types.length > 0) {
    filters.push(`expenditure_type = ANY($${paramIndex++}::text[])`)
    values.push(types)
  }

  if (locations && locations.length > 0) {
    filters.push(`location_name = ANY($${paramIndex++}::text[])`)
    values.push(locations)
  }

  if (startDate) {
    // Convertim la DATE pentru comparație corectă (evită probleme cu timezone/time)
    filters.push(`DATE(operational_date) >= DATE($${paramIndex++}::text)`)
    values.push(startDate)
  }

  if (endDate) {
    // Convertim la DATE pentru comparație corectă (evită probleme cu timezone/time)
    filters.push(`DATE(operational_date) <= DATE($${paramIndex++}::text)`)
    values.push(endDate)
  }

  if (department && department !== 'all') {
    filters.push(`department_name = $${paramIndex++}`)
    values.push(department)
  }

  if (type && type !== 'all') {
    filters.push(`expenditure_type = $${paramIndex++}`)
    values.push(type)
  }

  if (location && location !== 'all') {
    filters.push(`location_name = $${paramIndex++}`)
    values.push(location)
  }

  if (dataSource && dataSource !== 'all') {
    filters.push(`data_source = $${paramIndex++}`)
    values.push(dataSource)
  }

  if (search && search.trim().length > 0) {
    filters.push(`(
      description ILIKE $${paramIndex} OR
      location_name ILIKE $${paramIndex} OR
      department_name ILIKE $${paramIndex} OR
      expenditure_type ILIKE $${paramIndex}
    )`)
    values.push(`%${search.trim()}%`)
    paramIndex++
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

  return { whereClause, values, nextParamIndex: paramIndex }
}

const attachUserNames = async (pool, rows) => {
  const userIds = new Set()
  rows.forEach((row) => {
    if (row.created_by) userIds.add(row.created_by)
    if (row.updated_by) userIds.add(row.updated_by)
  })

  if (userIds.size === 0) {
    return rows
  }

  const usersResult = await pool.query(
    `
      SELECT id, COALESCE(full_name, username) AS name
      FROM users
      WHERE id = ANY($1::int[])
    `,
    [[...userIds]]
  )

  const usersMap = usersResult.rows.reduce((acc, user) => {
    acc[user.id] = user.name || `User ${user.id}`
    return acc
  }, {})

  return rows.map((row) => ({
    ...row,
    created_by_name: row.created_by ? usersMap[row.created_by] || `User ${row.created_by}` : null,
    updated_by_name: row.updated_by ? usersMap[row.updated_by] || `User ${row.updated_by}` : null
  }))
}

// External DB connection pool (for expenditures)
// FORȚĂM IP EXTERN 82.76.35.50 pentru acces din afara biroului
let externalPool = null

const getExternalPool = () => {
  // IP EXTERN pentru acces de oriunde - NU mai folosim IP intern 192.168.1.39!
  const dbHost = process.env.EXPENDITURES_DB_HOST || '82.76.35.50'
  
  // Întotdeauna resetăm pool-ul pentru a folosi IP-ul extern
  if (externalPool) {
    try {
      externalPool.end().catch(() => {})
    } catch (e) {}
    externalPool = null
  }
  
  // Credențiale pentru baza de date externă
  // Pot fi suprascrise din variabilele de mediu EXPENDITURES_DB_USER și EXPENDITURES_DB_PASSWORD
  // NOTĂ: jeka/31Ianuarie pe port 9858 sunt pentru LOGARE PC, nu pentru baza de date!
  const dbUser = process.env.EXPENDITURES_DB_USER || 'cashpot'
  const dbPassword = process.env.EXPENDITURES_DB_PASSWORD || '129hj8oahwd7yaw3e21321'
  const dbPort = parseInt(process.env.EXPENDITURES_DB_PORT || '26257')
  const dbName = process.env.EXPENDITURES_DB_NAME || 'cashpot'
  
  console.log(`🔌 Creating NEW external DB pool:`)
  console.log(`   Host: ${dbHost}`)
  console.log(`   Port: ${dbPort}`)
  console.log(`   Database: ${dbName}`)
  console.log(`   User: ${dbUser}`)
  console.log(`   Password: ${dbPassword ? '***' + dbPassword.slice(-3) : 'NOT SET'}`)
  
  externalPool = new Pool({
    user: dbUser,
    password: dbPassword,
    host: dbHost, // FORȚĂM IP EXTERN: 82.76.35.50
    port: dbPort,
    database: dbName,
    ssl: process.env.EXPENDITURES_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000, // 60 secunde timeout pentru conexiuni externe (firewall delay)
    query_timeout: 120000, // 120 secunde timeout pentru query-uri (mărit pentru batch-uri mari)
    statement_timeout: 120000, // 120 secunde timeout pentru statements
    idle_in_transaction_session_timeout: 120000 // 120 secunde timeout pentru sesiuni idle
  })
  
  externalPool.on('error', (err) => {
    console.error('❌ External DB pool error:', err.message)
    externalPool = null // Reset pool on error
  })
  
  return externalPool
}

// Test connection to external DB
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🧪 Testing external DB connection from test endpoint...')
    console.log('📡 Request headers:', {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'user-agent': req.headers['user-agent']
    })
    console.log('🌐 Server info:', {
      hostname: process.env.RENDER_EXTERNAL_HOSTNAME || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown'
    })
    
    const pool = getExternalPool()
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name, inet_server_addr() as server_ip')
    
    res.json({ 
      success: true, 
      message: 'Connection successful',
      timestamp: result.rows[0].current_time,
      database: result.rows[0].db_name,
      serverIP: result.rows[0].server_ip,
      connectionInfo: {
        host: process.env.EXPENDITURES_DB_HOST || '82.76.35.50',
        port: process.env.EXPENDITURES_DB_PORT || '26257',
        database: process.env.EXPENDITURES_DB_NAME || 'cashpot',
        user: process.env.EXPENDITURES_DB_USER || 'cashpot'
      }
    })
  } catch (error) {
    console.error('❌ External DB connection error:', error)
    console.error('❌ Error code:', error.code)
    console.error('❌ Error details:', error.toString())
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      errorCode: error.code,
      hint: error.code === 'ENETUNREACH' 
        ? '⚠️ IMPORTANT: Firewall-ul din birou trebuie să permită conexiuni de la IP-urile Render! Verifică whitelist-ul pe router/firewall.' 
        : 'Verifică configurația conexiunii și firewall-ul',
      connectionInfo: {
        host: process.env.EXPENDITURES_DB_HOST || '82.76.35.50',
        port: process.env.EXPENDITURES_DB_PORT || '26257'
      }
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
          location_name,
          department_name,
          expenditure_type,
          amount,
          operational_date,
          description,
          data_source,
          synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        record.location_name || 'Unknown',
        record.department_name || 'Unknown',
        record.expenditure_type || 'Unknown',
        parseFloat(record.amount || 0),
        record.operational_date,
        record.description || null,
        record.data_source || 'bat_sync'
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

// GET /api/expenditures/sync-status - Get current sync progress
router.get('/sync-status', async (req, res) => {
  try {
    if (!_syncProgress) {
      return res.json({
        status: 'idle',
        message: 'Nu există sincronizare în curs'
      })
    }
    
    res.json(_syncProgress)
  } catch (error) {
    console.error('Error getting sync status:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message,
      status: 'error'
    })
  }
})

// Sync expenditures data from external DB
router.post('/sync', async (req, res) => {
  // Check if already syncing
  if (_syncProgress && _syncProgress.status === 'running') {
    return res.status(400).json({ 
      success: false, 
      error: 'Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.' 
    })
  }
  try {
    const { startDate, endDate, filters } = req.body
    const localPool = req.app.get('pool')
    
    // Try to get external pool - catch error if connection fails
    // Retry logic pentru conexiuni externe (firewall delay)
    let externalPool
    let lastError = null
    const maxRetries = 3
    const retryDelay = 2000 // 2 secunde între retry-uri
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔌 Attempting to create external DB connection (attempt ${attempt}/${maxRetries})...`)
        externalPool = getExternalPool()
        
        // Test connection immediately cu timeout mai mare
        console.log('🧪 Testing external DB connection...')
        console.log('🌐 Attempting connection from:', process.env.RENDER_EXTERNAL_HOSTNAME || 'unknown host')
        console.log('🌐 Node environment:', process.env.NODE_ENV || 'unknown')
        
        // Query cu timeout explicit
        const testResult = await Promise.race([
          externalPool.query('SELECT NOW() as current_time, current_database() as db_name'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection test timeout after 60 seconds')), 60000)
          )
        ])
        
        console.log('✅ External DB connection test successful!')
        console.log(`   Database: ${testResult.rows[0].db_name}`)
        console.log(`   Time: ${testResult.rows[0].current_time}`)
        console.log('✅ Connection is working - can proceed with sync!')
        lastError = null
        break // Success - exit retry loop
      } catch (poolError) {
        lastError = poolError
        console.error(`❌ Connection attempt ${attempt}/${maxRetries} failed:`, poolError.message)
        console.error('❌ Error code:', poolError.code)
        
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          // Reset pool pentru următorul retry
          if (externalPool) {
            try {
              externalPool.end().catch(() => {})
            } catch (e) {}
            externalPool = null
          }
        } else {
          console.error('❌ All connection attempts failed!')
          console.error('❌ Error stack:', lastError.stack)
        }
      }
    }
    
    // Dacă toate retry-urile au eșuat
    if (lastError) {
      let errorMessage = 'Nu se poate conecta la baza de date externă'
      let errorHint = ''
      
      if (lastError.code === 'ECONNREFUSED') {
        errorMessage = `Nu se poate conecta la ${process.env.EXPENDITURES_DB_HOST || '82.76.35.50'}:${process.env.EXPENDITURES_DB_PORT || '26257'}`
        errorHint = 'Verifică dacă IP-ul și portul sunt corecte și dacă baza de date acceptă conexiuni externe'
      } else if (lastError.code === 'ENETUNREACH' || lastError.message?.includes('network')) {
        errorMessage = 'Nu se poate ajunge la baza de date externă (probleme de rețea)'
        errorHint = '⚠️ IMPORTANT: Firewall-ul din birou trebuie să permită conexiuni INBOUND pe portul 26257 de la IP-urile Render! Verifică configurarea router-ului/firewall-ului pentru Port Forwarding și whitelist IP-urile Render.'
      } else if (lastError.message?.includes('password') || lastError.message?.includes('authentication')) {
        errorMessage = 'Eroare de autentificare la baza de date externă'
        errorHint = 'Verifică username-ul și parola în variabilele de mediu (EXPENDITURES_DB_USER, EXPENDITURES_DB_PASSWORD)'
      } else if (lastError.message?.includes('timeout') || lastError.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout la conectare la baza de date externă (60 secunde)'
        errorHint = 'Firewall-ul din birou blochează conexiuni sau nu este configurat Port Forwarding pentru 82.76.35.50:26257. Verifică configurarea router-ului/firewall-ului pentru a permite conexiuni INBOUND de la IP-urile Render.'
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        hint: errorHint || 'Verifică log-urile backend-ului pentru detalii',
        errorCode: lastError.code,
        attempts: maxRetries
      })
    }
    
    console.log('🔄 Starting expenditures sync...', { startDate, endDate, filters })
    
    // Initialize progress tracking
    _syncProgress = {
      status: 'running',
      currentStep: 'Pornire sincronizare...',
      totalFetched: 0,
      totalFiltered: 0,
      processed: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
      startTime: new Date()
    }
    
    // Load settings to get included items
    let syncSettings = {
      includedExpenditureTypes: [],
      includedDepartments: [],
      includedLocations: [],
      excludeDeleted: true,
      showInExpenditures: null
    }
    
    try {
      const settingsResult = await localPool.query(`
        SELECT setting_value 
        FROM global_settings 
        WHERE setting_key = 'expenditures_sync_config'
      `)
      
      if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
        const settingValue = settingsResult.rows[0].setting_value
        // Handle both string JSON and already parsed object
        if (typeof settingValue === 'string') {
          syncSettings = { ...syncSettings, ...JSON.parse(settingValue) }
        } else if (typeof settingValue === 'object') {
          syncSettings = { ...syncSettings, ...settingValue }
        }
      }
    } catch (settingsError) {
      console.warn('⚠️ Error loading sync settings, using defaults:', settingsError.message)
      // Continue with default settings
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
    
    // show_in_expenditures filter - verifică dacă coloana există înainte
    // Nu aplicăm acest filter dacă coloana nu există în baza de date
    // if (syncSettings.showInExpenditures !== null) {
    //   whereConditions.push(`p.show_in_expenditures = ${syncSettings.showInExpenditures}`)
    // }
    
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
    
    _syncProgress.currentStep = 'Preluare date din baza externă...'
    const result = await externalPool.query(query, queryParams)
    console.log(`✅ Fetched ${result.rows.length} expenditure records from external DB`)
    
    _syncProgress.totalFetched = result.rows.length
    
    // Filter data based on included items
    _syncProgress.currentStep = 'Filtrare date...'
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
    
    _syncProgress.totalFiltered = filteredRows.length
    _syncProgress.currentStep = `Verificare duplicate și inserare înregistrări noi... (${filteredRows.length} de procesat)`
    
    if (filteredRows.length === 0) {
      _syncProgress.status = 'completed'
      _syncProgress.currentStep = 'Nu există date de sincronizat'
      console.warn('⚠️ No records to sync after filtering')
      return res.json({
        success: true,
        message: 'No records to sync after filtering',
        records: 0,
        dateRange: { startDate, endDate },
        warning: 'Toate datele au fost filtrate. Verifică setările de sincronizare!'
      })
    }
    
    // Get location mapping
    const mappingResult = await localPool.query('SELECT * FROM expenditure_location_mapping')
    const mapping = {}
    mappingResult.rows.forEach(row => {
      mapping[row.external_location_name] = row.local_location_id
    })
    console.log(`📍 Loaded ${mappingResult.rows.length} location mappings`)
    
    // NU ștergem datele existente! Verificăm duplicatele și inserăm doar pe cele noi
    console.log('🔄 Verificare duplicate și inserare doar înregistrări noi...')
    
    // Insert synced data - batch insert pentru performanță mai bună
    let inserted = 0
    let skipped = 0 // Duplicatele
    let errors = 0
    const batchSize = 50 // Insert în batch-uri de 50
    const totalRecords = filteredRows.length
    
    console.log(`📊 Starting sync: ${totalRecords} records to process...`)
    
    for (let i = 0; i < filteredRows.length; i += batchSize) {
      const batch = filteredRows.slice(i, i + batchSize)
      const currentIndex = i + batch.length
      const progress = Math.round((currentIndex / totalRecords) * 100)
      
      // Update progress
      _syncProgress.processed = currentIndex
      _syncProgress.inserted = inserted
      _syncProgress.skipped = skipped
      _syncProgress.errors = errors
      _syncProgress.currentStep = `Procesare: ${currentIndex}/${totalRecords} (${progress}%) | Noi: ${inserted} | Duplicate: ${skipped} | Erori: ${errors}`
      
      console.log(`📝 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(totalRecords / batchSize)}: ${currentIndex}/${totalRecords} (${progress}%) - Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`)
      
      for (const row of batch) {
        try {
          const mappedLocationId = mapping[row.location_name] || null
          
          // Verificăm dacă înregistrarea există deja (duplicat)
          // Verificăm după: operational_date, amount, location_name, department_name, expenditure_type
          // NU verificăm după data_source - datele pot veni din multiple surse (BAT, Google Sheets, API)
          const existingCheck = await localPool.query(`
            SELECT id 
            FROM expenditures_sync
            WHERE operational_date = $1 
              AND amount = $2 
              AND location_name = $3 
              AND department_name = $4
              AND expenditure_type = $5
            LIMIT 1
          `, [
            row.operational_date,
            row.amount || 0,
            row.location_name || 'Unknown',
            row.department_name || 'Unknown',
            row.expenditure_type || 'Unknown'
          ])
          
          // Dacă există deja, skip
          if (existingCheck.rows.length > 0) {
            skipped++
            continue
          }
          
          // Inserăm doar dacă nu există deja - folosim ON CONFLICT pentru siguranță maximă
          await localPool.query(`
            INSERT INTO expenditures_sync (
              location_name, department_name, expenditure_type, amount, 
              operational_date, synced_at, mapped_location_id, data_source
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
            ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
            DO NOTHING
          `, [
            row.location_name || 'Unknown',
            row.department_name || 'Unknown',
            row.expenditure_type || 'Unknown',
            row.amount || 0,
            row.operational_date,
            mappedLocationId,
            'api_sync'
          ])
          inserted++
        } catch (insertError) {
          errors++
          console.error(`❌ Error inserting record ${i + batch.indexOf(row) + 1}:`, insertError.message)
          console.error('   Record data:', JSON.stringify(row))
          // Continuă cu următoarea înregistrare
        }
      }
    }
    
    console.log(`✅ Synced ${inserted} new expenditure records to local DB`)
    console.log(`   - ${skipped} records skipped (already exist)`)
    console.log(`   - ${errors} errors`)
    
    if (errors > 0) {
      console.warn(`⚠️ Sync completed with ${errors} errors out of ${filteredRows.length} total records`)
    }
    
    // Update final progress
    _syncProgress.status = 'completed'
    _syncProgress.processed = filteredRows.length
    _syncProgress.inserted = inserted
    _syncProgress.skipped = skipped
    _syncProgress.errors = errors
    _syncProgress.currentStep = `Completat! ${inserted} noi, ${skipped} duplicate, ${errors} erori`
    _syncProgress.endTime = new Date()
    
    const response = {
      success: true,
      message: `Sincronizate ${inserted} înregistrări noi${skipped > 0 ? ` (${skipped} deja existente)` : ''}${errors > 0 ? ` (${errors} erori)` : ''}`,
      records: inserted,
      skipped: skipped,
      errors: errors,
      totalFetched: result.rows.length,
      totalFiltered: filteredRows.length,
      dateRange: { startDate, endDate }
    }
    
    // Clear progress after 5 seconds
    setTimeout(() => {
      _syncProgress = null
    }, 5000)
    
    res.json(response)
  } catch (error) {
    console.error('❌ Error syncing expenditures:', error)
    console.error('❌ Error stack:', error.stack)
    
    // Provide detailed error message
    let errorMessage = error.message || 'Eroare necunoscută la sincronizare'
    let errorHint = ''
    
    // Check for connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENETUNREACH' || error.message?.includes('connect')) {
      errorMessage = 'Nu se poate conecta la baza de date externă (82.76.35.50:26257)'
      errorHint = 'Verifică dacă IP-ul extern este accesibil și dacă firewall-ul permite conexiunea'
    } else if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout la conectare la baza de date externă'
      errorHint = 'Verifică conexiunea la internet și accesibilitatea bazei de date externe'
    } else if (error.message?.includes('password') || error.message?.includes('authentication')) {
      errorMessage = 'Eroare de autentificare la baza de date externă'
      errorHint = 'Verifică credențialele în configurarea backend-ului'
    }
    
    // Update progress on error
    if (_syncProgress) {
      _syncProgress.status = 'failed'
      _syncProgress.currentStep = `Eroare: ${errorMessage}`
      _syncProgress.endTime = new Date()
      setTimeout(() => {
        _syncProgress = null
      }, 10000)
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      hint: errorHint || undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/expenditures/import-all-status - Get import-all progress
router.get('/import-all-status', authenticateToken, async (req, res) => {
  try {
    if (!_importAllProgress) {
      return res.json({
        status: 'idle',
        message: 'Nu există import în curs'
      })
    }
    
    res.json(_importAllProgress)
  } catch (error) {
    console.error('Error getting import-all status:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message,
      status: 'error'
    })
  }
})

// POST /api/expenditures/import-all - Import TOATE datele din toate sursele (SQL, Google Sheets, BAT) - fără dubluri
router.post('/import-all', authenticateToken, async (req, res) => {
  // Check if already importing
  // Also check if progress is older than 5 minutes (stale) - allow restart
  const isRunning = _importAllProgress && _importAllProgress.status === 'running'
  const isStale = isRunning && _importAllProgress.startTime && 
    (new Date() - new Date(_importAllProgress.startTime)) > 5 * 60 * 1000 // 5 minutes
  
  if (isRunning && !isStale) {
    console.log('⚠️ Import already running, cannot start new one')
    return res.status(400).json({ 
      success: false, 
      error: 'Import deja în curs. Vă rugăm să așteptați finalizarea.',
      alreadyRunning: true
    })
  }
  
  // If stale, clear it and allow new import
  if (isStale) {
    console.log('⚠️ Stale import progress detected, clearing and allowing new import')
    _importAllProgress = null
  }
  
  // Return immediately (non-blocking)
  res.json({ 
    success: true, 
    message: 'Import început. Verifică progresul la /api/expenditures/import-all-status',
    started: true
  })
  
  // Start import in background (non-blocking)
  const startImport = async () => {
    try {
      const localPool = req.app.get('pool')
      
      const startTime = new Date()
      
      // Initialize progress
      _importAllProgress = {
        status: 'running',
        currentStep: 'Inițializare...',
        totalFound: 0,
        totalProcessed: 0,
        imported: 0,
        skipped: 0,
        errors: 0,
        fromExternalAPI: 0,
        fromGoogleSheets: 0,
        existing: 0,
        startTime: startTime.toISOString(),
        endTime: null
      }
      
      console.log('🔄 Starting import ALL expenditures from all sources...')
      
      // Step 1: Get all data from SQL table - TOATE DATELE, FĂRĂ FILTRE!
      _importAllProgress.currentStep = 'Se încarcă datele existente din SQL...'
      console.log('📊 Step 1: Getting ALL existing data from expenditures_sync (NO DATE FILTERS)...')
      const existingResult = await localPool.query(`
        SELECT * FROM expenditures_sync
        ORDER BY operational_date DESC
      `)
      const existingData = existingResult.rows
      _importAllProgress.existing = existingData.length
      
      // Log date range for debugging
      if (existingData.length > 0) {
        const dates = existingData.map(r => r.operational_date).filter(d => d)
        const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null
        console.log(`✅ Found ${existingData.length} existing records in expenditures_sync`)
        console.log(`📅 Date range in SQL: ${minDate ? minDate.toISOString().split('T')[0] : 'N/A'} to ${maxDate ? maxDate.toISOString().split('T')[0] : 'N/A'}`)
      } else {
        console.log(`✅ Found 0 existing records in expenditures_sync`)
      }
    
      // Step 2: Get Google Sheets URL from settings, environment, or use default
      _importAllProgress.currentStep = 'Se caută URL Google Sheets...'
      const DEFAULT_GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=828539440#gid=828539440'
      
      let googleSheetsUrl = null
      try {
        console.log('🔍 Step 2: Looking for Google Sheets URL...')
        
        const settingsResult = await localPool.query(`
          SELECT setting_value 
          FROM global_settings 
          WHERE setting_key = 'expenditures_sync_config'
        `)
        
        if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
          const settingValue = settingsResult.rows[0].setting_value
          const settings = typeof settingValue === 'string' ? JSON.parse(settingValue) : settingValue
          googleSheetsUrl = settings.googleSheetsUrl || null
        }
        
        if (!googleSheetsUrl) {
          googleSheetsUrl = process.env.GOOGLE_SHEETS_URL || null
        }
        
        if (!googleSheetsUrl) {
          googleSheetsUrl = DEFAULT_GOOGLE_SHEETS_URL
        }
      } catch (urlError) {
        console.warn('⚠️ Error getting Google Sheets URL, using default:', urlError.message)
        googleSheetsUrl = DEFAULT_GOOGLE_SHEETS_URL
      }
      
      // Step 3: Try to get data from external DB (API sync source)
      _importAllProgress.currentStep = 'Se conectează la baza de date externă (API)...'
      let externalData = []
      try {
        console.log('📊 Step 3: Getting data from external DB (API sync)...')
        let externalPool
        try {
          externalPool = getExternalPool()
          const testResult = await externalPool.query('SELECT NOW() as current_time')
          console.log('✅ External DB connection successful')
        } catch (poolError) {
          console.warn('⚠️ Cannot connect to external DB, skipping API sync source:', poolError.message)
          externalPool = null
        }
        
        if (externalPool) {
          console.log('✅ External DB pool available, starting data fetch...')
          
          // IMPORT-ALL: NU ÎNCĂRCĂM syncSettings PENTRU IMPORT-ALL!
          // Import-all aduce TOATE datele, fără nicio filtrare (nici pe date, nici pe tipuri, nici pe departamente, nici pe locații)
          // Doar pentru URL Google Sheets citim setările, dar ignorăm complet filtrele!
          
          try {
            const settingsResult = await localPool.query(`
              SELECT setting_value 
              FROM global_settings 
              WHERE setting_key = 'expenditures_sync_config'
            `)
            
            if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
              const settingValue = settingsResult.rows[0].setting_value
              const parsed = typeof settingValue === 'string' ? JSON.parse(settingValue) : settingValue
              
              // Doar pentru Google Sheets URL, ignorăm toate celelalte setări!
              if (!googleSheetsUrl && parsed.googleSheetsUrl) {
                googleSheetsUrl = parsed.googleSheetsUrl
              }
            }
          } catch (settingsError) {
            console.warn('⚠️ Error loading settings for Google Sheets URL:', settingsError.message)
          }
          
          // IMPORT-ALL: Aducem TOATE datele din API extern în BATCH-URI pentru a evita timeout-uri!
          // NU aplicăm filtre pe date, tipuri, departamente, locații - DOAR is_deleted = false
          // Procesăm în batch-uri de 1000 pentru a aduce TOATE datele (din 2023 până acum!)
          let whereConditions = ['p.is_deleted = false']
          const whereClause = whereConditions.join(' AND ')
          
          console.log('🔍 IMPORT-ALL: NO FILTERS - Only filtering is_deleted = false')
          console.log('🔍 IMPORT-ALL: Will fetch ALL records from external DB in batches (no date limits, no type filters, no department filters, no location filters)')
          console.log('🔍 IMPORT-ALL: Where clause:', whereClause)
          
          // Test query pentru a verifica că conexiunea funcționează
          try {
            console.log('🧪 Testing external DB connection with simple query...')
            const testQuery = await externalPool.query('SELECT COUNT(*) as total FROM public.casino_payments WHERE is_deleted = false')
            const testTotal = parseInt(testQuery.rows[0].total || 0)
            console.log(`✅ External DB connection OK! Total records (is_deleted = false): ${testTotal}`)
          } catch (testError) {
            console.error('❌ External DB test query failed:', testError.message)
            console.error('❌ Error details:', testError.stack)
            throw testError
          }
          
          // NOUĂ ABORDARE: Fetch pe intervale de timp (year-by-year) pentru a aduce TOATE datele
          // ORDER BY DESC aduce doar date noi, ORDER BY ASC + query pe ani = toate datele
          
          console.log('🔍 IMPORT-ALL: Starting DATE-RANGE based fetching (NEW APPROACH - year-by-year)')
          
          // First, get date range and total count
          let totalRecords = 0
          let minDateInDB = null
          let maxDateInDB = null
          
          try {
            const countQuery = `
              SELECT 
                COUNT(*) as total,
                MIN(p.operational_date) as min_date,
                MAX(p.operational_date) as max_date
              FROM public.casino_payments p
              WHERE ${whereClause}
            `
            console.log('🔍 IMPORT-ALL: Getting date range and total count from external DB...')
            console.log('🔍 Count query:', countQuery)
            console.log('🔍 Where clause:', whereClause)
            console.log('🔍 External pool config:', {
              host: process.env.EXPENDITURES_DB_HOST || '82.76.35.50',
              port: process.env.EXPENDITURES_DB_PORT || '26257',
              database: process.env.EXPENDITURES_DB_NAME || 'cashpot',
              user: process.env.EXPENDITURES_DB_USER || 'cashpot'
            })
            
            const countResult = await externalPool.query(countQuery)
            totalRecords = parseInt(countResult.rows[0].total || 0)
            minDateInDB = countResult.rows[0].min_date
            maxDateInDB = countResult.rows[0].max_date
            
            console.log(`📊 IMPORT-ALL: Total records: ${totalRecords}`)
            console.log(`📅 IMPORT-ALL: Date range in DB: ${minDateInDB} to ${maxDateInDB}`)
            
            if (totalRecords === 0) {
              console.error('⚠️⚠️⚠️ CRITICAL: Total records is 0! No data in external DB or query is wrong!')
            }
            
            if (!minDateInDB || !maxDateInDB) {
              console.error('⚠️⚠️⚠️ CRITICAL: Could not get date range from DB! minDate:', minDateInDB, 'maxDate:', maxDateInDB)
              console.error('⚠️ This might mean there is no data in external DB or the query failed!')
            }
            
            _importAllProgress.totalFound = totalRecords
          } catch (countError) {
            console.error('❌ CRITICAL ERROR: Could not get date range from external DB!')
            console.error('❌ Error message:', countError.message)
            console.error('❌ Error stack:', countError.stack)
            console.error('❌ Error code:', countError.code)
            console.warn('⚠️ Will try fallback approach, but data might not be fetched correctly')
          }
          
          let allExternalRows = []
          const batchSize = 2000
          const maxRetries = 3
          const retryDelay = 1000
          
          // Strategy: Fetch by year chunks (most reliable)
          if (minDateInDB && maxDateInDB) {
            const startDate = new Date(minDateInDB)
            const endDate = new Date(maxDateInDB)
            const startYear = startDate.getFullYear()
            const endYear = endDate.getFullYear()
            
            console.log(`📅 Fetching data year by year: ${startYear} to ${endYear}`)
            console.log(`📅 Start date: ${minDateInDB}, End date: ${maxDateInDB}`)
            console.log(`📅 Start year: ${startYear}, End year: ${endYear}`)
            
            if (isNaN(startYear) || isNaN(endYear)) {
              console.error('⚠️⚠️⚠️ CRITICAL: Invalid year range! startYear:', startYear, 'endYear:', endYear)
              throw new Error('Invalid date range from external DB')
            }
            
            for (let year = startYear; year <= endYear; year++) {
              const yearStart = `${year}-01-01`
              const yearEnd = `${year}-12-31`
              
              console.log(`\n📅 ========== FETCHING YEAR ${year} ==========`)
              console.log(`📅 Year range: ${yearStart} to ${yearEnd}`)
              _importAllProgress.currentStep = `Se preiau datele pentru anul ${year}...`
              
              // First, check how many records exist for this year
              try {
                const yearCountQuery = `
                  SELECT COUNT(*) as total
                  FROM public.casino_payments p
                  WHERE ${whereClause}
                    AND p.operational_date >= $1
                    AND p.operational_date <= $2
                `
                const yearCountResult = await externalPool.query(yearCountQuery, [yearStart, yearEnd])
                const yearTotal = parseInt(yearCountResult.rows[0].total || 0)
                console.log(`📊 Year ${year}: Total records in external DB: ${yearTotal}`)
              } catch (countError) {
                console.warn(`⚠️ Could not get count for year ${year}:`, countError.message)
              }
              
              let yearOffset = 0
              let yearHasMore = true
              let yearBatchNumber = 0
              let yearTotalFetched = 0
              
              while (yearHasMore && yearBatchNumber < 1000) { // Max 1000 batches per year
                yearBatchNumber++
                let batchRows = []
                let batchSuccess = false
                let retryCount = 0
                
                while (!batchSuccess && retryCount < maxRetries) {
                  try {
                    const yearQuery = `
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
                        AND p.operational_date >= $1
                        AND p.operational_date <= $2
                      ORDER BY p.operational_date ASC, p.id ASC
                      LIMIT $3 OFFSET $4
                    `
                    
                    console.log(`📊 Year ${year}, Batch ${yearBatchNumber}: LIMIT ${batchSize} OFFSET ${yearOffset}`)
                    
                    const batchResult = await externalPool.query(yearQuery, [yearStart, yearEnd, batchSize, yearOffset])
                    batchRows = batchResult.rows
                    batchSuccess = true
                    
                    if (batchRows.length > 0) {
                      const firstDate = batchRows[0].operational_date
                      const lastDate = batchRows[batchRows.length - 1].operational_date
                      console.log(`✅ Year ${year}, Batch ${yearBatchNumber}: Fetched ${batchRows.length} records (${firstDate} to ${lastDate})`)
                    } else {
                      console.log(`✅ Year ${year}, Batch ${yearBatchNumber}: Fetched 0 records (no more data)`)
                    }
                    
                  } catch (batchError) {
                    retryCount++
                    console.error(`❌ Year ${year}, Batch ${yearBatchNumber} failed (attempt ${retryCount}/${maxRetries}):`, batchError.message)
                    console.error(`❌ Error details:`, batchError.stack)
                    
                    if (retryCount < maxRetries) {
                      await new Promise(resolve => setTimeout(resolve, retryDelay))
                    } else {
                      console.error(`❌ Year ${year} FAILED after ${maxRetries} attempts - continuing to next year`)
                      yearHasMore = false
                      break
                    }
                  }
                }
                
                if (batchRows.length === 0) {
                  yearHasMore = false
                } else {
                  allExternalRows = allExternalRows.concat(batchRows)
                  yearOffset += batchRows.length
                  yearTotalFetched += batchRows.length
                  _importAllProgress.fromExternalAPI = allExternalRows.length
                  
                  if (batchRows.length < batchSize) {
                    yearHasMore = false
                  }
                }
              }
              
              console.log(`✅ Year ${year} complete: ${yearTotalFetched} records fetched (offset: ${yearOffset})`)
              console.log(`📊 Year ${year} total so far: ${allExternalRows.length} records`)
              
              // Log date range for this year
              const yearData = allExternalRows.filter(r => {
                if (!r.operational_date) return false
                const rowYear = new Date(r.operational_date).getFullYear()
                return rowYear === year
              })
              if (yearData.length > 0) {
                const yearDates = yearData.map(r => r.operational_date).filter(d => d)
                const yearMinDate = new Date(Math.min(...yearDates.map(d => new Date(d))))
                const yearMaxDate = new Date(Math.max(...yearDates.map(d => new Date(d))))
                console.log(`📅 Year ${year} date range: ${yearMinDate.toISOString().split('T')[0]} to ${yearMaxDate.toISOString().split('T')[0]}`)
              } else {
                console.error(`⚠️⚠️⚠️ WARNING: Year ${year} has NO data in allExternalRows!`)
              }
              
              console.log(`📅 =========================================\n`)
            }
            
            // Final summary by year - CRITICAL FOR DEBUGGING!
            console.log(`\n📊 ========== YEAR-BY-YEAR SUMMARY ==========`)
            const byYearFinal = {}
            allExternalRows.forEach(row => {
              if (row.operational_date) {
                const year = new Date(row.operational_date).getFullYear()
                byYearFinal[year] = (byYearFinal[year] || 0) + 1
              }
            })
            
            if (Object.keys(byYearFinal).length === 0) {
              console.error(`⚠️⚠️⚠️ CRITICAL: NO RECORDS BY YEAR! Total rows: ${allExternalRows.length}`)
            } else {
              Object.keys(byYearFinal).sort().forEach(year => {
                console.log(`📅 Year ${year}: ${byYearFinal[year]} records`)
              })
            }
            
            console.log(`📊 TOTAL FROM EXTERNAL DB: ${allExternalRows.length} records`)
            
            // Find min and max dates in fetched data
            const dates = allExternalRows.map(r => r.operational_date).filter(d => d)
            if (dates.length > 0) {
              const minFetchedDate = new Date(Math.min(...dates.map(d => new Date(d))))
              const maxFetchedDate = new Date(Math.max(...dates.map(d => new Date(d))))
              console.log(`📅 Date range in fetched data: ${minFetchedDate.toISOString().split('T')[0]} to ${maxFetchedDate.toISOString().split('T')[0]}`)
            } else {
              console.error(`⚠️⚠️⚠️ CRITICAL: NO DATES IN FETCHED DATA!`)
            }
            
            console.log(`📊 ==========================================\n`)
          } else {
            // Fallback: Original approach with ASC ordering
            console.log('⚠️ Fallback: Using batch approach with ASC ordering')
            let offset = 0
            let hasMore = true
            let batchNumber = 0
            const maxBatches = 1000
            
            _importAllProgress.currentStep = 'Se preiau datele din API extern (batch 0)...'
            
            while (hasMore && batchNumber < maxBatches) {
              batchNumber++
              let batchRows = []
              let batchSuccess = false
              let retryCount = 0
              
              while (!batchSuccess && retryCount < maxRetries) {
                try {
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
                    ORDER BY p.operational_date ASC, p.id ASC
                    LIMIT $1 OFFSET $2
                  `
                  
                  console.log(`📊 Fallback Batch ${batchNumber}: LIMIT ${batchSize} OFFSET ${offset}`)
                  _importAllProgress.currentStep = `Se preiau datele din API extern (batch ${batchNumber}, ${offset} înregistrări)...`
                  
                  const batchResult = await externalPool.query(query, [batchSize, offset])
                  batchRows = batchResult.rows
                  batchSuccess = true
                  
                  console.log(`✅ Fallback Batch ${batchNumber}: Fetched ${batchRows.length} records`)
                
              } catch (batchError) {
                retryCount++
                console.error(`❌ Batch ${batchNumber} failed (attempt ${retryCount}/${maxRetries}):`, batchError.message)
                console.error(`❌ Batch error details:`, batchError.stack)
                
                if (retryCount < maxRetries) {
                  console.log(`⏳ Retrying batch ${batchNumber} in ${retryDelay}ms...`)
                  await new Promise(resolve => setTimeout(resolve, retryDelay))
                } else {
                  console.error(`❌ Batch ${batchNumber} failed after ${maxRetries} attempts - stopping import`)
                  throw batchError
                }
              }
            }
            
            if (batchRows.length === 0) {
              hasMore = false
              console.log(`✅ No more records - finished fetching all batches. Total: ${allExternalRows.length} records`)
              console.log(`📊 Final offset: ${offset}, Final batch number: ${batchNumber}`)
            } else {
              allExternalRows = allExternalRows.concat(batchRows)
              offset += batchRows.length
              
              // Dacă am primit mai puțin decât batchSize, am ajuns la final
              if (batchRows.length < batchSize) {
                hasMore = false
                console.log(`✅ Last batch received (${batchRows.length} < ${batchSize}) - finished fetching all batches. Total: ${allExternalRows.length} records`)
                console.log(`📊 Final offset: ${offset}, Final batch number: ${batchNumber}`)
              } else {
                // Continuăm cu următorul batch - log pentru debugging
                console.log(`➡️ Continuing to next batch (offset will be ${offset})...`)
              }
              
              // Update progress
              _importAllProgress.fromExternalAPI = allExternalRows.length
              
              // Log progress periodic
              if (batchNumber % 5 === 0 || !hasMore) {
                const dates = allExternalRows.map(r => r.operational_date).filter(d => d)
                const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null
                const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null
                console.log(`📊 Progress: ${allExternalRows.length} records fetched so far (${batchNumber} batches)`)
                console.log(`📅 Cumulative date range: ${minDate ? minDate.toISOString().split('T')[0] : 'N/A'} to ${maxDate ? maxDate.toISOString().split('T')[0] : 'N/A'}`)
              }
            }
          }
          
          // Verificare batchNumber doar dacă există (în fallback approach)
          if (typeof batchNumber !== 'undefined' && batchNumber >= maxBatches) {
            console.error(`⚠️⚠️⚠️ WARNING: Reached maximum batch limit (${maxBatches})! May not have fetched all records!`)
            console.error(`⚠️ Total fetched: ${allExternalRows.length}, Last offset: ${typeof offset !== 'undefined' ? offset : 'N/A'}`)
          }
          
          // IMPORT-ALL: NU aplicăm filtre! Vrem TOATE datele!
          // Filtrele se aplică doar la sincronizare normală, nu la import-all
          let filteredRows = allExternalRows
          
          // Log date range for debugging - CRITICAL FOR DEBUGGING!
          console.log(`\n📊 ========== EXTERNAL DB IMPORT SUMMARY ==========`)
          console.log(`📊 Total rows from external DB: ${filteredRows.length}`)
          
          if (filteredRows.length > 0) {
            const dates = filteredRows.map(r => r.operational_date).filter(d => d)
            const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => new Date(d)))) : null
            const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : null
            
            // Count records by date ranges
            const byYear = {}
            filteredRows.forEach(row => {
              if (row.operational_date) {
                const year = new Date(row.operational_date).getFullYear()
                byYear[year] = (byYear[year] || 0) + 1
              }
            })
            
            console.log(`📅 Date range in fetched data: ${minDate ? minDate.toISOString().split('T')[0] : 'N/A'} to ${maxDate ? maxDate.toISOString().split('T')[0] : 'N/A'}`)
            console.log(`📊 Records by year:`)
            Object.keys(byYear).sort().forEach(year => {
              console.log(`   📅 Year ${year}: ${byYear[year]} records`)
            })
            
            if (filteredRows.length > 0) {
              console.log(`📊 Sample row (first):`, {
                location: filteredRows[0].location_name,
                department: filteredRows[0].department_name,
                type: filteredRows[0].expenditure_type,
                amount: filteredRows[0].amount,
                date: filteredRows[0].operational_date
              })
              console.log(`📊 Sample row (last):`, {
                location: filteredRows[filteredRows.length - 1].location_name,
                department: filteredRows[filteredRows.length - 1].department_name,
                type: filteredRows[filteredRows.length - 1].expenditure_type,
                amount: filteredRows[filteredRows.length - 1].amount,
                date: filteredRows[filteredRows.length - 1].operational_date
              })
            }
            
            // WARNING dacă cel mai vechi record este după 13.11
            if (minDate && new Date(minDate) > new Date('2024-11-13')) {
              console.error(`⚠️⚠️⚠️ WARNING: Oldest record is AFTER 2024-11-13! This means we didn't fetch all records!`)
              console.error(`⚠️ Oldest date: ${minDate.toISOString().split('T')[0]}, Expected: before 2024-11-13`)
            }
          } else {
            console.error(`⚠️⚠️⚠️ CRITICAL: NO ROWS FETCHED FROM EXTERNAL DB!`)
          }
          
          console.log(`📊 ================================================\n`)
          
          // NU FILTRĂM! Aducem TOATE datele pentru import-all
          // Filtrele din syncSettings sunt pentru sincronizare normală, nu pentru import-all
          externalData = filteredRows
          _importAllProgress.fromExternalAPI = filteredRows.length
          console.log(`✅ Using ALL ${externalData.length} records from external DB (no filters applied for import-all)`)
          
          // CRITICAL VERIFICATION: Verificăm dacă am adus date
          if (externalData.length === 0) {
            console.error('⚠️⚠️⚠️ CRITICAL: externalData is EMPTY after fetch!')
            console.error('⚠️ This means NO data was fetched from external DB!')
            console.error('⚠️ Check:')
            console.error('   1. Is external DB accessible?')
            console.error('   2. Are credentials correct?')
            console.error('   3. Does casino_payments table exist?')
            console.error('   4. Are there records with is_deleted = false?')
          } else {
            console.log(`✅ SUCCESS: Fetched ${externalData.length} records from external DB`)
            // Log sample data
            if (externalData.length > 0) {
              console.log(`📊 Sample record:`, {
                date: externalData[0].operational_date,
                location: externalData[0].location_name,
                amount: externalData[0].amount,
                department: externalData[0].department_name
              })
            }
          }
        } else {
          console.error('⚠️⚠️⚠️ CRITICAL: externalPool is NULL! Cannot fetch data from external DB!')
          console.error('⚠️ Connection to external DB failed or was not established!')
        }
      } catch (externalError) {
        console.error('❌ CRITICAL ERROR: Failed to fetch external data!')
        console.error('❌ Error message:', externalError.message)
        console.error('❌ Error stack:', externalError.stack)
        console.error('❌ Error code:', externalError.code)
        console.warn('⚠️ Continuing with existing data only, but NO new data will be imported!')
        externalData = []
      }
    
      // Step 4: Import from Google Sheets if URL is available
      _importAllProgress.currentStep = 'Se importă datele din Google Sheets...'
      let googleSheetsData = []
      if (googleSheetsUrl) {
        try {
          console.log('📊 Step 4: Importing data from Google Sheets...')
          console.log('🔗 Google Sheets URL:', googleSheetsUrl)
          
          let csvUrl = googleSheetsUrl
          if (googleSheetsUrl.includes('/edit')) {
            const sheetId = googleSheetsUrl.match(/\/d\/(.*?)\//)?.[1]
            const gid = googleSheetsUrl.match(/gid=(\d+)/)?.[1] || '0'
            csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
            console.log('📋 Converted to CSV URL:', csvUrl)
            console.log('📋 Sheet ID:', sheetId, 'GID:', gid)
          }
          
          console.log('📥 Fetching CSV from Google Sheets...')
          const csvResponse = await fetch(csvUrl)
          console.log('📥 CSV Response status:', csvResponse.status, csvResponse.statusText)
          
          if (!csvResponse.ok) {
            const errorText = await csvResponse.text()
            console.error('❌ CSV Response error:', errorText.substring(0, 500))
            throw new Error(`Failed to fetch CSV: ${csvResponse.status} ${csvResponse.statusText}`)
          }
          
          const csvText = await csvResponse.text()
          console.log('📄 CSV text length:', csvText.length, 'characters')
          console.log('📄 First 500 chars of CSV:', csvText.substring(0, 500))
          
          const lines = csvText.split('\n').filter(line => line.trim())
          console.log('📊 Total lines in CSV:', lines.length)
          
          if (lines.length >= 2) {
            console.log('📋 Header line:', lines[0])
            const rows = lines.slice(1) // Skip header
            console.log('📊 Rows to process:', rows.length)
            
            let parsedRows = 0
            let skippedRows = 0
            let errorRows = 0
            
            for (const row of rows) {
              try {
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
                values.push(current.trim())
                
                if (values.length < 5) {
                  skippedRows++
                  if (parsedRows === 0 && skippedRows <= 3) {
                    console.warn(`⚠️ Skipping row with ${values.length} columns (need 5+):`, values)
                  }
                  continue
                }
                
                const [dateStr, explanation, amountStr, location, department, expenditureType] = values
                
                let operationalDate
                if (dateStr && dateStr.trim()) {
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
                    operationalDate = dateStr.split('T')[0] // Take only date part if datetime
                  }
                }
                
                if (!operationalDate) {
                  skippedRows++
                  if (parsedRows === 0 && skippedRows <= 3) {
                    console.warn(`⚠️ Skipping row - invalid date format:`, dateStr, '| Values:', values.slice(0, 3))
                  }
                  continue
                }
                
                let amount
                if (amountStr) {
                  const cleanAmount = amountStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
                  amount = parseFloat(cleanAmount)
                }
                
                if (!amount || isNaN(amount) || !location || !department) {
                  skippedRows++
                  if (parsedRows === 0 && skippedRows <= 3) {
                    console.warn(`⚠️ Skipping row - invalid amount/location/department:`, {
                      amount: amountStr,
                      location,
                      department
                    })
                  }
                  continue
                }
                
                googleSheetsData.push({
                  operational_date: operationalDate,
                  amount: amount,
                  location_name: location || 'Unknown',
                  department_name: department || 'Unknown',
                  expenditure_type: expenditureType || 'Unknown',
                  description: explanation || null,
                  data_source: 'google_sheets'
                })
                parsedRows++
              } catch (rowError) {
                errorRows++
                if (errorRows <= 3) {
                  console.error('❌ Error parsing Google Sheets row:', rowError.message, '| Row:', row.substring(0, 200))
                }
              }
            }
            
            _importAllProgress.fromGoogleSheets = googleSheetsData.length
            console.log(`✅ Google Sheets: Parsed ${parsedRows} valid rows, skipped ${skippedRows}, errors ${errorRows}`)
            console.log(`✅ Total fetched ${googleSheetsData.length} records from Google Sheets`)
            
            if (googleSheetsData.length === 0 && rows.length > 0) {
              console.error('⚠️ WARNING: No valid data parsed from Google Sheets!')
              console.error('⚠️ Check CSV format - first few rows:', rows.slice(0, 3))
            }
          }
        } catch (gsError) {
          console.error('❌ Error importing from Google Sheets:', gsError.message)
          console.error('❌ Stack:', gsError.stack)
          _importAllProgress.currentStep = `❌ Eroare Google Sheets: ${gsError.message}`
          // Continue with other sources but log the error clearly
        }
      }
      
      // Step 5: Combine and deduplicate
      _importAllProgress.currentStep = 'Se combină și se verifică duplicatele...'
      console.log('📊 Step 5: Combining and deduplicating data...')
      
      // Combine all external data
      externalData = [...externalData, ...googleSheetsData]
      console.log(`📊 Total external data before deduplication: ${externalData.length}`)
      
      // CRITICAL: Normalize and deduplicate externalData ÎNAINTE de procesare!
      // Normalizăm datele pentru a avea același format (trim, lowercase, etc.)
      const normalizeString = (str) => {
        if (!str) return 'Unknown'
        return String(str).trim().replace(/\s+/g, ' ')
      }
      
      const normalizeAmount = (amt) => {
        const num = parseFloat(amt) || 0
        // Rotunjim la 2 zecimale pentru a evita probleme cu floating point
        return Math.round(num * 100) / 100
      }
      
      const normalizeDate = (dateStr) => {
        if (!dateStr) return null
        // Asigurăm că data este în format YYYY-MM-DD
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        return date.toISOString().split('T')[0]
      }
      
      // Normalizăm datele externe
      const normalizedExternalData = externalData.map(row => ({
        ...row,
        operational_date: normalizeDate(row.operational_date),
        amount: normalizeAmount(row.amount),
        location_name: normalizeString(row.location_name),
        department_name: normalizeString(row.department_name),
        expenditure_type: normalizeString(row.expenditure_type)
      })).filter(row => row.operational_date) // Eliminăm rândurile fără dată validă
      
      // Deduplicăm externalData normalizat
      const externalDataMap = new Map()
      const deduplicatedExternalData = []
      let externalDuplicates = 0
      
      for (const row of normalizedExternalData) {
        const key = `${row.operational_date}|${row.amount}|${row.location_name}|${row.department_name}|${row.expenditure_type}`
        
        if (!externalDataMap.has(key)) {
          externalDataMap.set(key, row)
          deduplicatedExternalData.push(row)
        } else {
          externalDuplicates++
        }
      }
      
      console.log(`✅ Deduplicated external data: ${externalData.length} → ${deduplicatedExternalData.length} (removed ${externalDuplicates} duplicates)`)
      externalData = deduplicatedExternalData
      _importAllProgress.totalFound = externalData.length
      
      // Build existing map from database cu aceeași normalizare
      const existingMap = new Map()
      existingData.forEach(record => {
        const key = `${normalizeDate(record.operational_date)}|${normalizeAmount(record.amount)}|${normalizeString(record.location_name)}|${normalizeString(record.department_name)}|${normalizeString(record.expenditure_type)}`
        existingMap.set(key, record)
      })
      console.log(`📊 Existing records in database: ${existingMap.size}`)
      
      const mappingResult = await localPool.query('SELECT * FROM expenditure_location_mapping')
      const mapping = {}
      mappingResult.rows.forEach(row => {
        mapping[row.external_location_name] = row.local_location_id
      })
      
      // Process external data and check for duplicates ÎNAINTE de insert!
      // Folosim batch insert cu ON CONFLICT pentru siguranță maximă!
      let imported = 0
      let skipped = 0
      let errors = 0
      
      _importAllProgress.currentStep = 'Se procesează și se inserează datele...'
      
      // Batch size pentru inserare eficientă
      const batchSize = 100
      
      for (let batchStart = 0; batchStart < externalData.length; batchStart += batchSize) {
        const batch = externalData.slice(batchStart, batchStart + batchSize)
        const batchPromises = []
        
        for (const row of batch) {
          // CRITICAL: Folosim aceleași funcții de normalizare pentru key!
          const normalizedKey = `${normalizeDate(row.operational_date)}|${normalizeAmount(row.amount)}|${normalizeString(row.location_name)}|${normalizeString(row.department_name)}|${normalizeString(row.expenditure_type)}`
          
          // Verificăm duplicate în memory map
          if (existingMap.has(normalizedKey)) {
            skipped++
            _importAllProgress.skipped = skipped
            continue
          }
          
          // Verificăm duplicate în baza de date CU QUERY - CRITICAL pentru siguranță!
          const mappedLocationId = mapping[row.location_name] || null
          const dataSource = row.data_source || 'api_sync'
          const description = row.description || null
          
          // Folosim ON CONFLICT DO NOTHING pentru a preveni duplicate
          // Dar trebuie să creăm un index unique pentru a funcționa
          // Pentru moment, folosim verificare explicită + INSERT
          const duplicateCheckPromise = localPool.query(`
            SELECT id FROM expenditures_sync
            WHERE operational_date = $1 
              AND amount = $2 
              AND location_name = $3 
              AND department_name = $4
              AND expenditure_type = $5
            LIMIT 1
          `, [
            row.operational_date,
            row.amount,
            row.location_name,
            row.department_name,
            row.expenditure_type
          ]).then(duplicateCheck => {
            if (duplicateCheck.rows.length > 0) {
              skipped++
              _importAllProgress.skipped = skipped
              existingMap.set(normalizedKey, duplicateCheck.rows[0])
              return null // Skip insert
            }
            
            // Insert cu ON CONFLICT DO NOTHING pentru a preveni duplicate la nivel de DB
            // UNIQUE INDEX pe (operational_date, amount, location_name, department_name, expenditure_type)
            // Folosim ON CONFLICT cu coloanele exacte din UNIQUE INDEX
            // IMPORTANT: Datele trebuie să fie normalizate (normalizeDate, normalizeAmount, normalizeString)
            const insertPromise = dataSource === 'google_sheets' && description
              ? localPool.query(`
                  INSERT INTO expenditures_sync (
                    location_name, department_name, expenditure_type, amount, 
                    operational_date, synced_at, mapped_location_id, data_source, description
                  ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8)
                  ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
                  DO NOTHING
                `, [
                  row.location_name,  // Deja normalizat cu normalizeString
                  row.department_name, // Deja normalizat cu normalizeString
                  row.expenditure_type, // Deja normalizat cu normalizeString
                  row.amount,          // Deja normalizat cu normalizeAmount
                  row.operational_date, // Deja normalizat cu normalizeDate
                  mappedLocationId,
                  dataSource,
                  description
                ])
              : localPool.query(`
                  INSERT INTO expenditures_sync (
                    location_name, department_name, expenditure_type, amount, 
                    operational_date, synced_at, mapped_location_id, data_source
                  ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
                  ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
                  DO NOTHING
                `, [
                  row.location_name,  // Deja normalizat cu normalizeString
                  row.department_name, // Deja normalizat cu normalizeString
                  row.expenditure_type, // Deja normalizat cu normalizeString
                  row.amount,          // Deja normalizat cu normalizeAmount
                  row.operational_date, // Deja normalizat cu normalizeDate
                  mappedLocationId,
                  dataSource
                ])
            
            return insertPromise.then(result => {
              if (result.rowCount > 0) {
                existingMap.set(normalizedKey, row)
                imported++
                _importAllProgress.imported = imported
              } else {
                skipped++
                _importAllProgress.skipped = skipped
              }
              return result
            }).catch(insertError => {
              // Dacă este duplicate error (23505 = unique_violation), skipăm
              if (insertError.code === '23505' || insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
                skipped++
                _importAllProgress.skipped = skipped
                return null
              }
              // Altfel, este o altă eroare
              errors++
              _importAllProgress.errors = errors
              console.error('❌ Error inserting record:', insertError.message)
              throw insertError
            })
          })
          
          batchPromises.push(duplicateCheckPromise)
        }
        
        // Așteptăm batch-ul să se termine
        try {
          await Promise.all(batchPromises.filter(p => p !== null))
        } catch (batchError) {
          console.error('❌ Batch error:', batchError.message)
        }
        
        _importAllProgress.totalProcessed = Math.min(batchStart + batchSize, externalData.length)
        
        // Update progress
        if ((batchStart + batchSize) % 200 === 0 || batchStart + batchSize >= externalData.length) {
          _importAllProgress.currentStep = `Se procesează... ${_importAllProgress.totalProcessed}/${externalData.length} (${imported} noi, ${skipped} duplicate, ${errors} erori)`
        }
      }
      
      console.log(`✅ Import completed: ${imported} new, ${skipped} duplicate, ${errors} errors`)
      
      const finalCount = await localPool.query('SELECT COUNT(*) as total FROM expenditures_sync')
      const totalRecords = parseInt(finalCount.rows[0].total)
      
      const endTime = new Date()
      _importAllProgress.status = 'completed'
      _importAllProgress.currentStep = 'Import completat!'
      _importAllProgress.endTime = endTime.toISOString()
      _importAllProgress.total = totalRecords
      
      // Clear progress after 5 seconds
      setTimeout(() => {
        _importAllProgress = null
      }, 5000)
      
    } catch (error) {
      console.error('❌ Error importing all expenditures:', error)
      const endTime = new Date()
      _importAllProgress = {
        status: 'failed',
        currentStep: `Eroare: ${error.message}`,
        endTime: endTime.toISOString(),
        error: error.message
      }
      
      setTimeout(() => {
        _importAllProgress = null
      }, 5000)
    }
  }
  
  // Start import in background
  startImport().catch(err => {
    console.error('❌ Fatal error in import-all background process:', err)
  })
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
    // ACEEAȘI LOGICĂ ca în frontend!
    const normalizeDiacritics = (str) => {
      if (!str) return ''
      return str
        .replace(/ţ/g, 'ț')  // sedilă → virgulă
        .replace(/ş/g, 'ș')  // sedilă → virgulă
        .replace(/Ţ/g, 'Ț')
        .replace(/Ş/g, 'Ș')
        .trim() // IMPORTANT! La fel ca în frontend
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
      // Google Sheets URL persistent
      googleSheetsUrl: settings.googleSheetsUrl || '',
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
    
    // PREVIEW MODE - procesează MAXIM primele 2000 rânduri (pentru viteză)
    const rowsToCheck = rows.slice(0, 2000)
    console.log(`🚀 PREVIEW MODE: Procesez primele ${rowsToCheck.length} rânduri (din ${rows.length} total)`)
    
    for (const row of rowsToCheck) {
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
    
    // Calculăm estimare pentru TOATE rândurile dacă am verificat doar o parte
    const checkedRows = rowsToCheck.length
    const totalRows = rows.length
    const wasLimited = totalRows > checkedRows
    
    let estimatedNew = newRows.length
    let estimatedDuplicates = duplicates.length
    
    if (wasLimited) {
      // Extrapolare liniară
      const ratio = totalRows / checkedRows
      estimatedNew = Math.round(newRows.length * ratio)
      estimatedDuplicates = Math.round(duplicates.length * ratio)
      console.log(`📊 Estimare pentru TOATE ${totalRows} rânduri: ~${estimatedNew} noi, ~${estimatedDuplicates} duplicate`)
    }
    
    console.log(`👀 Preview COMPLET: ${newRows.length} noi, ${duplicates.length} duplicate, ${errors} erori din ${checkedRows}/${totalRows} verificate`)
    
    res.json({ 
      success: true, 
      totalRows: totalRows,
      checkedRows: checkedRows,
      wasLimited: wasLimited,
      newRows: newRows.slice(0, 20), // Sample doar primele 20 pentru display
      duplicates: duplicates.slice(0, 10), // Sample de 10
      newCount: wasLimited ? estimatedNew : newRows.length, // Estimare dacă e limitat
      duplicateCount: wasLimited ? estimatedDuplicates : duplicates.length,
      errorCount: errors,
      message: wasLimited ? `Verificate ${checkedRows} din ${totalRows} rânduri. Estimare: ~${estimatedNew} date noi.` : 'Toate rândurile au fost verificate.'
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

// SQL TABLE VIEW - fetch paginated expenditures with filters
router.get('/sql-table', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const userId = req.user?.userId || req.user?.id
    const includedFilters = await getIncludedFiltersForUser(pool, userId)
    const rawPageSize = (req.query.pageSize || '50').toString().toLowerCase()
    const isAll = rawPageSize === 'all' || rawPageSize === '0'

    const {
      startDate,
      endDate,
      department = 'all',
      type = 'all',
      location = 'all',
      dataSource = 'all',
      search = '',
      page = '1',
      sortBy = 'operational_date',
      order = 'desc'
    } = req.query

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1)
    const parsedPageSize = Math.min(Math.max(parseInt(rawPageSize, 10) || 50, 1), 500)
    const limit = isAll ? null : parsedPageSize
    const offset = isAll ? 0 : (pageNumber - 1) * parsedPageSize
    const sortColumn = SQL_TABLE_SORT_COLUMNS[sortBy] || SQL_TABLE_SORT_COLUMNS.operational_date
    const sortOrder = order && order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    const { whereClause, values, nextParamIndex } = buildSqlTableWhereClause(req.query, includedFilters)

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS total_amount FROM expenditures_sync ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0]?.total || 0, 10)
    const totalAmount = parseFloat(countResult.rows[0]?.total_amount || 0)

    const limitClause = !isAll ? `LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}` : ''
    const dataQuery = `
      SELECT 
        id,
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        description,
        data_source,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM expenditures_sync
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      ${limitClause}
    `
    const dataValues = !isAll ? [...values, parsedPageSize, offset] : [...values]

    const dataResult = await pool.query(dataQuery, dataValues)
    const dataWithNames = await attachUserNames(pool, dataResult.rows)

    res.json({
      success: true,
      data: dataWithNames,
      pagination: {
        page: pageNumber,
        pageSize: isAll ? 'all' : parsedPageSize,
        total,
        totalPages: isAll ? 1 : Math.max(1, Math.ceil(total / parsedPageSize)),
        totalAmount
      }
    })
  } catch (error) {
    console.error('Error loading SQL table data:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// SQL TABLE EXPORT (CSV / Excel)
router.get('/sql-table/export', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const userId = req.user?.userId || req.user?.id
    const includedFilters = await getIncludedFiltersForUser(pool, userId)

    const format = (req.query.format || 'csv').toString().toLowerCase()
    const sortColumn = SQL_TABLE_SORT_COLUMNS[req.query.sortBy] || SQL_TABLE_SORT_COLUMNS.operational_date
    const sortOrder = req.query.order && req.query.order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

    const { whereClause, values } = buildSqlTableWhereClause(req.query, includedFilters)

    const dataQuery = `
      SELECT 
        id,
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        description,
        data_source,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM expenditures_sync
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
    `

    const dataResult = await pool.query(dataQuery, values)
    const rows = await attachUserNames(pool, dataResult.rows)

    const formatDate = (value) => {
      if (!value) return ''
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0]
    }

    const formatDateTime = (value) => {
      if (!value) return ''
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toISOString().replace('T', ' ').split('.')[0]
    }

    const exportRows = rows.map((row) => ({
      ID: row.id,
      Data: formatDate(row.operational_date),
      Suma: row.amount ?? '',
      Departament: row.department_name || '',
      'Tip Cheltuială': row.expenditure_type || '',
      Locație: row.location_name || '',
      Descriere: row.description || '',
      Sursă: row.data_source === 'google_sheets' ? 'Google Sheets' : 'BAT Sync',
      'Creat de': row.created_by_name || '',
      'Creat la': formatDateTime(row.created_at),
      'Actualizat de': row.updated_by_name || '',
      'Actualizat la': formatDateTime(row.updated_at)
    }))

    if (format === 'xlsx' || format === 'excel') {
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportRows)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cheltuieli')
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      res.setHeader('Content-Disposition', 'attachment; filename="cheltuieli_sql.xlsx"')
      return res.send(buffer)
    }

    // Default: CSV export
    const headers = Object.keys(exportRows[0] || {
      ID: '',
      Data: '',
      Suma: '',
      Departament: '',
      'Tip Cheltuială': '',
      Locație: '',
      Descriere: '',
      Sursă: '',
      'Creat de': '',
      'Creat la': '',
      'Actualizat de': '',
      'Actualizat la': ''
    })

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return ''
      const str = value.toString()
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvRows = [
      headers.join(','),
      ...exportRows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))
    ]

    const csvContent = csvRows.join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="cheltuieli_sql.csv"')
    return res.send(csvContent)
  } catch (error) {
    console.error('Error exporting SQL table data:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// SQL TABLE UPDATE
router.put('/sql-table/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const { id } = req.params
    const {
      operational_date,
      amount,
      location_name,
      department_name,
      expenditure_type,
      description
    } = req.body || {}

    if (!operational_date || !amount || !location_name || !department_name || !expenditure_type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    const parsedAmount = parseFloat(amount)
    if (Number.isNaN(parsedAmount)) {
      return res.status(400).json({ success: false, error: 'Invalid amount value' })
    }

    const userId = req.user?.userId || req.user?.id

    const updateResult = await pool.query(
      `
        UPDATE expenditures_sync
        SET
          operational_date = $1,
          amount = $2,
          location_name = $3,
          department_name = $4,
          expenditure_type = $5,
          description = $6,
          updated_by = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING
          id,
          operational_date,
          amount,
          location_name,
          department_name,
          expenditure_type,
          description,
          data_source,
          created_by,
          updated_by,
          created_at,
          updated_at
      `,
      [
        operational_date,
        parsedAmount,
        location_name,
        department_name,
        expenditure_type,
        description || null,
        userId || null,
        id
      ]
    )

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' })
    }

    res.json({ success: true, record: updateResult.rows[0] })
  } catch (error) {
    console.error('Error updating expenditure row:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// SQL TABLE DELETE
router.delete('/sql-table/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const { id } = req.params
    const deleteResult = await pool.query(
      'DELETE FROM expenditures_sync WHERE id = $1 RETURNING id',
      [id]
    )

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting expenditure row:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/clean-duplicates - Remove duplicate records from expenditures_sync
router.post('/clean-duplicates', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    console.log('🧹 Starting duplicate cleanup in expenditures_sync...')
    
    // Find duplicates
    const duplicateQuery = `
      SELECT 
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY id) as ids
      FROM expenditures_sync
      GROUP BY operational_date, amount, location_name, department_name, expenditure_type
      HAVING COUNT(*) > 1
    `
    
    const duplicateResult = await pool.query(duplicateQuery)
    const duplicates = duplicateResult.rows
    
    console.log(`📊 Found ${duplicates.length} groups with duplicates`)
    
    let totalDuplicatesRemoved = 0
    let totalRecordsAfter = 0
    
    if (duplicates.length > 0) {
      // Keep first ID from each group, delete the rest
      for (const dup of duplicates) {
        const ids = dup.ids
        const keepId = ids[0] // Keep first ID
        const deleteIds = ids.slice(1) // Delete the rest
        
        if (deleteIds.length > 0) {
          await pool.query(`
            DELETE FROM expenditures_sync
            WHERE id = ANY($1::int[])
          `, [deleteIds])
          
          totalDuplicatesRemoved += deleteIds.length
          console.log(`🧹 Removed ${deleteIds.length} duplicates for ${dup.operational_date}, ${dup.location_name}, ${dup.department_name}`)
        }
      }
      
      // Get final count
      const finalCountResult = await pool.query('SELECT COUNT(*) as total FROM expenditures_sync')
      totalRecordsAfter = parseInt(finalCountResult.rows[0].total)
    } else {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM expenditures_sync')
      totalRecordsAfter = parseInt(countResult.rows[0].total)
    }
    
    console.log(`✅ Cleanup complete: Removed ${totalDuplicatesRemoved} duplicate records`)
    console.log(`📊 Total records after cleanup: ${totalRecordsAfter}`)
    
    res.json({
      success: true,
      message: `Curățare duplicate completă: ${totalDuplicatesRemoved} duplicate eliminate`,
      duplicatesRemoved: totalDuplicatesRemoved,
      totalRecordsAfter: totalRecordsAfter,
      duplicateGroups: duplicates.length
    })
  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router

