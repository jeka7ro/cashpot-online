import express from 'express'
import pg from 'pg'
import { authenticateToken } from '../middleware/auth.js'
import { upload, isS3Enabled, s3Client } from '../config/s3.js'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Upload local dedicat pentru facturile electrice (nu depinde de AWS)
const electricInvoiceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '..', 'uploads', 'electric-invoices')
      // Creează directorul dacă nu există
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, `electric-invoice-${uniqueSuffix}${path.extname(file.originalname)}`)
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Acceptă doar PDF pentru facturi electrice
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Doar fișiere PDF sunt acceptate pentru facturi electrice'))
    }
  }
})

const router = express.Router()
const { Pool } = pg

// JSON fallback loader (la fel ca în incasari.js)
const loadExportedData = (filename) => {
  try {
    const filePath = path.join(__dirname, '..', 'cyber-data', filename)
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      console.log(`✅ [EXPENDITURES] Loaded ${data.length} items from ${filename}`)
      return data
    }
  } catch (error) {
    console.error(`[EXPENDITURES] Error loading ${filename}:`, error.message)
  }
  return []
}

// Helper: normalizează numele de locație (EXACT ca în incasari.js)
// NOTĂ: Această funcție este definită mai jos, la linia 4097, cu logica completă
// Aici doar declarăm că o folosim

// DELETE /api/expenditures/all-data - ȘTERGE ABSOLUT TOTUL (BAT, Google Sheets, Preferences, etc.)
// SECURIZAT: Necesită confirmare suplimentară pentru a preveni ștergerea accidentală
// IMPORTANT: Această rută trebuie să fie definită LA ÎNCEPUT pentru a evita conflictele cu rutele parametrizate
router.delete('/all-data', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/expenditures/all-data - Request received')

    // SECURITATE: Verifică dacă există confirmarea suplimentară
    const { confirmDelete, confirmationToken } = req.body

    // Token de confirmare: trebuie să fie exact "DELETE_ALL_DATA_CONFIRMED_2025"
    const REQUIRED_CONFIRMATION_TOKEN = 'DELETE_ALL_DATA_CONFIRMED_2025'

    if (!confirmDelete || confirmationToken !== REQUIRED_CONFIRMATION_TOKEN) {
      console.warn('⚠️ DELETE /all-data - Confirmare invalidă sau lipsă')
      return res.status(400).json({
        success: false,
        error: 'Confirmare necesară pentru ștergerea tuturor datelor. Trimite confirmDelete: true și confirmationToken: "DELETE_ALL_DATA_CONFIRMED_2025"'
      })
    }

    const pool = req.app.get('pool')
    if (!pool) {
      console.error('❌ Database pool not initialized')
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    // Verifică câte înregistrări există înainte de ștergere
    const countResult = await pool.query('SELECT COUNT(*) as total FROM expenditures_sync')
    const totalCount = parseInt(countResult.rows[0].total) || 0
    console.log(`📊 Total records before deletion: ${totalCount}`)

    if (totalCount === 0) {
      return res.json({
        success: true,
        deletedCount: 0,
        totalCountBefore: 0,
        message: 'Nu există date de șters.'
      })
    }

    // SECURITATE: Creează backup înainte de ștergere (opțional - poate fi activat mai târziu)
    // Pentru moment, doar logăm
    console.log(`⚠️ ATENȚIE: Se vor șterge ${totalCount} înregistrări!`)

    // Șterge ABSOLUT TOTUL
    const deleteResult = await pool.query('DELETE FROM expenditures_sync RETURNING id')

    console.log(`🗑️ DELETED ALL DATA: ${deleteResult.rowCount} records removed`)

    res.json({
      success: true,
      deletedCount: deleteResult.rowCount,
      totalCountBefore: totalCount,
      message: `Successfully deleted ALL ${deleteResult.rowCount} records from expenditures_sync (BAT, Google Sheets, Preferences, etc.).`
    })
  } catch (error) {
    console.error('❌ Error deleting ALL data:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

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

  // Normalizare helper (trebuie sa fie IDENTICA cu cea din optimize_db.js)
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text).trim()
      .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
      .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  if (startDate) {
    filters.push(`DATE(operational_date) >= DATE($${paramIndex++}::text)`)
    values.push(startDate)
  }

  if (endDate) {
    filters.push(`DATE(operational_date) <= DATE($${paramIndex++}::text)`)
    values.push(endDate)
  }

  // Department: folosim coloana pre-calculată normalized_department_name
  if (department && department !== 'all') {
    filters.push(`normalized_department_name = $${paramIndex++}`)
    values.push(normalizeText(department))
  } else if (departments && departments.length > 0) {
    const normalizedDepartments = departments.map(normalizeText).filter(Boolean)
    const normalizedDeptArrayParam = paramIndex++
    values.push(normalizedDepartments)
    filters.push(`normalized_department_name = ANY($${normalizedDeptArrayParam}::text[])`)
    console.log(`🔍 [Optimized Filter] Departments: ${normalizedDepartments.length} included`)
  }

  // Type: folosim coloana pre-calculată normalized_expenditure_type
  if (type && type !== 'all') {
    filters.push(`(normalized_expenditure_type = $${paramIndex++} OR data_source = 'auto_discount')`)
    values.push(normalizeText(type))
  } else if (types && types.length > 0) {
    const normalizedTypes = types.map(normalizeText).filter(Boolean)
    const normalizedArrayParam = paramIndex++
    values.push(normalizedTypes)
    filters.push(`(normalized_expenditure_type = ANY($${normalizedArrayParam}::text[]) OR data_source = 'auto_discount')`)
    console.log(`🔍 [Optimized Filter] Types: ${normalizedTypes.length} included (plus auto_discounts)`)
  }

  // Location: folosim coloana pre-calculată normalized_location_name
  if (location && location !== 'all') {
    filters.push(`normalized_location_name = $${paramIndex++}`)
    values.push(normalizeText(location))
  } else if (locations && locations.length > 0) {
    const normalizedLocations = locations.map(normalizeText).filter(Boolean)
    const normalizedLocArrayParam = paramIndex++
    values.push(normalizedLocations)
    filters.push(`normalized_location_name = ANY($${normalizedLocArrayParam}::text[])`)
    console.log(`🔍 [Optimized Filter] Locations: ${normalizedLocations.length} included`)
  }

  if (dataSource && dataSource !== 'all') {
    filters.push(`data_source = $${paramIndex++}`)
    values.push(dataSource)
  }

  if (search && search.trim().length > 0) {
    const normalizedSearch = normalizeText(search)

    // Căutare optimizată în coloanele normalizate
    // Folosim LIKE %...% pe coloanele normalizate care sunt deja lowercase și fără diacritice
    filters.push(`(
      normalized_department_name LIKE $${paramIndex} OR
      normalized_location_name LIKE $${paramIndex} OR
      normalized_expenditure_type LIKE $${paramIndex} OR
      LOWER(description) LIKE $${paramIndex}
    )`)
    values.push(`%${normalizedSearch}%`)
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

// Helper invalidare cache P&L
const invalidatePLCache = async (pool) => {
  try {
    await pool.query('DELETE FROM incasari_monthly_cache')
    console.log('🧹 [CACHE] P&L Cache invalidated')
  } catch (e) {
    console.error('⚠️ Failed to invalidate P&L cache:', e.message)
  }
}

// External DB connection pool (for expenditures)
// FORȚĂM IP EXTERN 82.76.35.50 pentru acces din afara biroului
let externalPool = null

export const getExternalPool = () => {
  // IP EXTERN pentru acces de oriunde - NU mai folosim IP intern 192.168.1.39!
  const dbHost = process.env.EXPENDITURES_DB_HOST || '82.76.35.50'

  // Întotdeauna resetăm pool-ul pentru a folosi IP-ul extern
  if (externalPool) {
    try {
      externalPool.end().catch(() => { })
    } catch (e) { }
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
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 60000, // 60 secunde pentru conexiune (mărit pentru conexiuni lente)
    query_timeout: 600000, // 10 MINUTE pentru query-uri mari (42k records)
    statement_timeout: 600000, // 10 MINUTE pentru statements
    idle_in_transaction_session_timeout: 600000 // 10 MINUTE pentru sesiuni idle
  })

  externalPool.on('error', (err) => {
    console.error('❌ External DB pool error:', err.message)
    externalPool = null // Reset pool on error
  })

  return externalPool
}

// GET /api/expenditures/bat-date-range - Ultima dată din baza BAT (sursa datelor)
// Dacă datele tale se opresc la 26.01, verifică acest endpoint: dacă maxDate e 26.01, baza BAT nu are date mai noi.
router.get('/bat-date-range', async (req, res) => {
  try {
    const pool = getExternalPool()
    const result = await pool.query(`
      SELECT 
        MIN(p.date)::text as min_date,
        MAX(p.date)::text as max_date,
        COUNT(*) as total
      FROM public.casino_payments p
      WHERE p.is_deleted = false AND p.date >= '2023-01-01'
    `)
    const row = result.rows[0]
    res.json({
      success: true,
      minDate: row?.min_date || null,
      maxDate: row?.max_date || null,
      totalRecords: parseInt(row?.total || 0),
      message: row?.max_date
        ? `BAT conține date de la ${row.min_date} până la ${row.max_date}. Dacă în app vezi doar până la ${row.max_date}, sursa (BAT) nu are încă date mai noi – trebuie actualizată baza BAT.`
        : 'BAT nu conține înregistrări.'
    })
  } catch (error) {
    console.error('❌ bat-date-range error:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

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

    if (!localPool) {
      return res.json({ success: true, locations: [], locationsWithNLC: [] })
    }

    // Canonicalize + deduplicate (fără diacritice, fără dubluri)
    const stripDiacritics = (s) => {
      return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ţ/g, 't')
        .replace(/ş/g, 's')
        .replace(/Ţ/g, 'T')
        .replace(/Ş/g, 'S')
    }

    const canonicalizeLocationName = (name) => {
      if (!name) return null
      const raw = stripDiacritics(String(name).trim()).replace(/\s+/g, ' ')
      const upper = raw.toUpperCase()

      if (upper.includes('PITESTI') || upper.includes('PITI')) return 'Pitesti'
      if (upper.includes('PLOIESTI')) {
        if (upper.includes('NORD')) return 'Ploiesti (nord)'
        if (upper.includes('CENTRU') || upper.includes('CENTER')) return 'Ploiesti (centru)'
        return 'Ploiesti (centru)'
      }
      if (upper.includes('VALCEA') || upper.includes('RAMNICU')) return 'Valcea'
      if (upper.includes('CRAIOVA') || upper.includes('CARIOVA')) return 'Craiova'
      if (upper.includes('BUCURESTI') || upper.includes('BUCHAREST')) return 'Bucuresti'

      return raw
    }

    const canonicalSet = new Set()
    const nlcByCanonical = new Map()

    try {
      // 1) locații din expenditures_sync (toate sursele)
      const expendituresResult = await localPool.query(`
        SELECT DISTINCT location_name
        FROM expenditures_sync
        WHERE location_name IS NOT NULL 
          AND location_name != ''
          AND location_name != 'Nespecificat'
          AND location_name != 'Unknown'
        ORDER BY location_name
      `)
      expendituresResult.rows.forEach((row) => {
        const canonical = canonicalizeLocationName(row.location_name)
        if (canonical) canonicalSet.add(canonical)
      })

      // 2) locații din tabelul locations + NLC
      const locationsResult = await localPool.query(`
        SELECT id, name, nlc_code
        FROM locations
        WHERE name IS NOT NULL 
          AND name != ''
        ORDER BY name
      `)

      locationsResult.rows.forEach((row) => {
        const canonical = canonicalizeLocationName(row.name)
        if (canonical) canonicalSet.add(canonical)

        if (row.nlc_code) {
          // păstrează primul NLC găsit pentru locația canonicală
          if (canonical && !nlcByCanonical.has(canonical)) {
            nlcByCanonical.set(canonical, { id: row.id, name: canonical, nlc_code: row.nlc_code })
          }
        }
      })

      const locations = Array.from(canonicalSet).sort((a, b) => a.localeCompare(b, 'en'))
      const locationsWithNLC = Array.from(nlcByCanonical.values()).sort((a, b) => a.name.localeCompare(b.name, 'en'))

      console.log(
        `✅ external-locations: ${locations.length} locații canonicale (expenditures_sync: ${expendituresResult.rows.length}, locations: ${locationsResult.rows.length})`
      )

      return res.json({
        success: true,
        locations,
        locationsWithNLC
      })
    } catch (dbError) {
      console.log('⚠️ Error fetching locations from database:', dbError.message)
      const fallback = Array.from(canonicalSet).sort((a, b) => a.localeCompare(b, 'ro'))
      return res.json({ success: true, locations: fallback, locationsWithNLC: [] })
    }
  } catch (error) {
    console.error('❌ Error fetching locations:', error)
    res.json({ success: true, locations: [], locationsWithNLC: [] })
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
// SECURIZAT: Necesită token de confirmare pentru a preveni ștergerea accidentală
router.post('/upload', async (req, res) => {
  try {
    const { records, syncToken } = req.body
    const localPool = req.app.get('pool')

    // SECURITATE: Verifică token-ul de sync
    const REQUIRED_SYNC_TOKEN = 'SYNC_UPLOAD_TOKEN_2025'
    if (!syncToken || syncToken !== REQUIRED_SYNC_TOKEN) {
      console.warn('⚠️ /upload - Token de sync invalid sau lipsă')
      return res.status(403).json({
        success: false,
        error: 'Token de sync necesar pentru upload. Contactează administratorul.'
      })
    }

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Expected: { records: [...] }'
      })
    }

    console.log(`📤 Receiving ${records.length} expenditure records from LOCAL sync...`)

    // Verifică câte înregistrări există înainte de import
    const countResult = await localPool.query('SELECT COUNT(*) as total FROM expenditures_sync')
    const totalCount = parseInt(countResult.rows[0].total) || 0
    console.log(`📊 Total records before import: ${totalCount}`)

    // NU ȘTERGEM DATELE VECHI! Folosim INSERT cu ON CONFLICT pentru a păstra datele existente
    // și a actualiza doar dacă există duplicate
    console.log('🔄 Import cu păstrare date vechi - verificare duplicate...')

    // Insert new records cu verificare duplicate
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const record of records) {
      try {
        // Verifică dacă există deja (duplicat)
        const existingCheck = await localPool.query(`
          SELECT id FROM expenditures_sync 
          WHERE operational_date = $1 
            AND location_name = $2 
            AND department_name = $3 
            AND expenditure_type = $4 
            AND amount = $5
            AND data_source = $6
        `, [
          record.operational_date,
          record.location_name || 'Unknown',
          record.department_name || 'Unknown',
          record.expenditure_type || 'Unknown',
          parseFloat(record.amount || 0),
          record.data_source || 'bat_sync'
        ])


        const normLoc = String(record.location_name || 'Unknown').trim()
          .replace(/ţ/g, 'ț').replace(/ş/g, 'ș').replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const normDept = String(record.department_name || 'Unknown').trim()
          .replace(/ţ/g, 'ț').replace(/ş/g, 'ș').replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const normType = String(record.expenditure_type || 'Unknown').trim()
          .replace(/ţ/g, 'ț').replace(/ş/g, 'ș').replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        if (existingCheck.rows.length > 0) {
          // Există deja - actualizează doar dacă datele sunt diferite
          await localPool.query(`
            UPDATE expenditures_sync SET
              description = COALESCE($1, description),
              synced_at = NOW(),
              normalized_location_name = $3,
              normalized_department_name = $4,
              normalized_expenditure_type = $5
            WHERE id = $2
          `, [
            record.description || null,
            existingCheck.rows[0].id,
            normLoc,
            normDept,
            normType
          ])
          updated++
        } else {
          // Nu există - INSERT
          await localPool.query(`
            INSERT INTO expenditures_sync (
              operational_date, location_name, department_name, expenditure_type,
              amount, description, data_source, synced_at,
              normalized_location_name, normalized_department_name, normalized_expenditure_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)
          `, [
            record.operational_date,
            record.location_name || 'Unknown',
            record.department_name || 'Unknown',
            record.expenditure_type || 'Unknown',
            parseFloat(record.amount || 0),
            record.description || null,
            record.data_source || 'bat_sync',
            normLoc,
            normDept,
            normType
          ])
          inserted++
        }
      } catch (error) {
        console.error('❌ Error processing record:', error)
        skipped++
      }
    }

    const finalCountResult = await localPool.query('SELECT COUNT(*) as total FROM expenditures_sync')
    const finalCount = parseInt(finalCountResult.rows[0].total) || 0

    // Invalidate P&L Cache
    await invalidatePLCache(localPool)

    console.log(`✅ Import complet: ${inserted} noi, ${updated} actualizate, ${skipped} erori`)
    console.log(`📊 Total înregistrări în DB: ${finalCount} (înainte: ${totalCount})`)

    res.json({
      success: true,
      message: `Import complet: ${inserted} înregistrări noi, ${updated} actualizate. Total în DB: ${finalCount}`,
      records: inserted,
      updated: updated,
      skipped: skipped,
      totalBefore: totalCount,
      totalAfter: finalCount
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
    const maxRetries = 5 // Mărit la 5 retry-uri
    const retryDelay = 3000 // 3 secunde între retry-uri (mărit pentru conexiuni lente)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔌 Attempting to create external DB connection (attempt ${attempt}/${maxRetries})...`)
        externalPool = getExternalPool()

        // Test connection immediately cu timeout mai mare
        console.log('🧪 Testing external DB connection...')
        console.log('🌐 Attempting connection from:', process.env.RENDER_EXTERNAL_HOSTNAME || 'unknown host')
        console.log('🌐 Node environment:', process.env.NODE_ENV || 'unknown')

        // Query cu timeout explicit - mărit la 90 secunde pentru conexiuni lente
        const testResult = await Promise.race([
          externalPool.query('SELECT NOW() as current_time, current_database() as db_name'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection test timeout after 90 seconds')), 90000)
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
              externalPool.end().catch(() => { })
            } catch (e) { }
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
      whereConditions.push(`p.date >= $${paramCounter}`)
      queryParams.push(startDate)
      paramCounter++
    }

    if (endDate) {
      whereConditions.push(`p.date <= $${paramCounter}`)
      queryParams.push(endDate)
      paramCounter++
    }

    const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1'

    // Fetch data from external DB
    // IMPORTANT: Câmpul corect din casino_payments este 'date', nu 'operational_date'
    const query = `
      SELECT 
        l.id as location_id,
        l.name as location_name,
        d.name as department_name,
        et.name as expenditure_type,
        p.amount,
        p.date as operational_date,
        p.id as payment_id
      FROM public.casino_payments p
      LEFT JOIN public.casino_locations l ON p.location_id = l.id
      LEFT JOIN public.casino_departments d ON p.department_id = d.id
      LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
      WHERE ${whereClause}
      ORDER BY p.date DESC, l.name, et.name
    `

    _syncProgress.currentStep = 'Preluare date din baza externă...'
    const result = await externalPool.query(query, queryParams)
    console.log(`✅ Fetched ${result.rows.length} expenditure records from external DB`)

    _syncProgress.totalFetched = result.rows.length

    // Filter data based on included items
    _syncProgress.currentStep = 'Filtrare date...'
    let filteredRows = result.rows

    // Helper function pentru normalizare diacritice (folosită și în alte părți)
    const normalizeForComparison = (str) => {
      if (!str) return ''
      return String(str).trim()
        .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove all diacritics
        .toLowerCase()
    }

    // Filter by expenditure types (only if list is not empty)
    if (syncSettings.includedExpenditureTypes && syncSettings.includedExpenditureTypes.length > 0) {
      const normalizedIncludedTypes = syncSettings.includedExpenditureTypes.map(t => normalizeForComparison(t))
      filteredRows = filteredRows.filter(row => {
        const normalizedRowType = normalizeForComparison(row.expenditure_type)
        return normalizedIncludedTypes.includes(normalizedRowType)
      })
      console.log(`📊 Filtered by expenditure types: ${filteredRows.length} records remaining`)
    }

    // Filter by departments (only if list is not empty)
    if (syncSettings.includedDepartments && syncSettings.includedDepartments.length > 0) {
      const normalizedIncludedDepts = syncSettings.includedDepartments.map(d => normalizeForComparison(d))
      filteredRows = filteredRows.filter(row => {
        const normalizedRowDept = normalizeForComparison(row.department_name)
        return normalizedIncludedDepts.includes(normalizedRowDept)
      })
      console.log(`📊 Filtered by departments: ${filteredRows.length} records remaining`)
    }

    // Filter by locations (only if list is not empty)
    if (syncSettings.includedLocations && syncSettings.includedLocations.length > 0) {
      const normalizedIncludedLocs = syncSettings.includedLocations.map(l => normalizeForComparison(l))
      filteredRows = filteredRows.filter(row => {
        const normalizedRowLoc = normalizeForComparison(row.location_name)
        return normalizedIncludedLocs.includes(normalizedRowLoc)
      })
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

          // NORMALIZARE SUMĂ - gestionează atât punct cât și virgulă ca separator zecimal
          let normalizedAmount = 0
          if (row.amount) {
            // Dacă este deja număr, folosește-l direct
            if (typeof row.amount === 'number') {
              normalizedAmount = row.amount
            } else {
              // Dacă este string, parsează-l corect
              const amountStr = String(row.amount).trim()
              // Elimină spații și separatori de mii
              let cleanAmount = amountStr.replace(/\s/g, '').replace(/\./g, '')
              // Dacă ultimul caracter după ultima virgulă este o cifră, înseamnă că virgula este separator zecimal
              // Dacă ultimul caracter după ultimul punct este o cifră, înseamnă că punctul este separator zecimal
              // Strategie: dacă există virgulă, folosește-o ca separator zecimal (format românesc)
              // Dacă nu există virgulă dar există punct, verifică dacă după punct sunt 2-3 cifre (probabil zecimal)
              if (amountStr.includes(',')) {
                // Format românesc: 1234,56 sau 1.234,56
                cleanAmount = amountStr.replace(/\./g, '').replace(',', '.')
              } else if (amountStr.includes('.') && amountStr.split('.').length === 2) {
                // Format englez: 1234.56 (un singur punct = separator zecimal)
                const parts = amountStr.split('.')
                if (parts[1].length <= 3) {
                  // Probabil separator zecimal
                  cleanAmount = amountStr
                } else {
                  // Probabil separator de mii
                  cleanAmount = amountStr.replace(/\./g, '')
                }
              }
              normalizedAmount = parseFloat(cleanAmount) || 0
            }
          }

          // Validare sumă
          if (isNaN(normalizedAmount) || normalizedAmount < 0) {
            console.warn(`⚠️ Invalid amount for record: ${JSON.stringify(row)} - normalized: ${normalizedAmount}`)
            errors++
            continue
          }

          // Rotunjire la 2 zecimale pentru consistență
          normalizedAmount = Math.round(normalizedAmount * 100) / 100

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
            normalizedAmount,
            row.location_name || 'Unknown',
            row.department_name || 'Unknown',
            row.expenditure_type || 'Unknown'
          ])

          // Dacă există deja, skip
          if (existingCheck.rows.length > 0) {
            skipped++
            continue
          }

          // Normalizează numele de locație (FĂRĂ diacritice - user vrea fără)
          const normalizeLocationNameForInsert = (name) => {
            if (!name) return 'Unknown'
            const upper = String(name).toUpperCase().trim()

            if (upper.includes('PITESTI') || upper.includes('PITEȘTI') || upper.includes('PITI')) {
              return 'Pitesti'
            }
            if (upper.includes('PLOIESTI') || upper.includes('PLOIEȘTI')) {
              if (upper.includes('NORD')) return 'Ploiesti (nord)'
              if (upper.includes('CENTRU') || upper.includes('CENTER')) return 'Ploiesti (centru)'
              return 'Ploiesti (centru)'
            }
            if (upper.includes('VALCEA') || upper.includes('VÂLCEA') || upper.includes('RAMNICU')) {
              return 'Valcea'
            }
            if (upper.includes('CRAIOVA') || upper.includes('CARIOVA')) {
              return 'Craiova'
            }
            if (upper.includes('BUCUREȘTI') || upper.includes('BUCHAREST') || upper.includes('BUCURESTI')) {
              return 'Bucuresti'
            }

            return String(name).trim().replace(/\s+/g, ' ')
          }

          const normalizedLocationName = normalizeLocationNameForInsert(row.location_name)

          // Inserăm doar dacă nu există deja - folosim ON CONFLICT pentru siguranță maximă
          // IMPORTANT: Folosim 'bat_sync' ca data_source pentru consistență cu /import-all
          await localPool.query(`
            INSERT INTO expenditures_sync (
              location_name, department_name, expenditure_type, amount, 
              operational_date, synced_at, mapped_location_id, data_source
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
            ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
            DO NOTHING
          `, [
            normalizedLocationName,
            row.department_name || 'Unknown',
            row.expenditure_type || 'Unknown',
            normalizedAmount,
            row.operational_date,
            mappedLocationId,
            'bat_sync'
          ])
          inserted++

          // --- AUTO LIMITARE: DISCOUNT PEPSI (Bar) ---
          // Dacă este Pepsi din Bar, inserăm automat și discount-ul de 30%
          const isBar = (row.department_name || '').trim() === 'Bar'
          const type = (row.expenditure_type || '').toLowerCase()
          const isPepsi = type.includes('pepsi')

          if (isBar && isPepsi && normalizedAmount > 0) {
            try {
              const discountAmount = -Math.round((normalizedAmount * 0.30) * 100) / 100
              const discountDesc = `Discount 30% Pepsi - ${row.expenditure_type}`

              await localPool.query(`
                INSERT INTO expenditures_sync (
                  location_name, department_name, expenditure_type, amount, 
                  operational_date, description, synced_at, mapped_location_id, data_source
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, 'auto_discount')
                ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
                DO NOTHING
              `, [
                normalizedLocationName,
                'Bar',
                'Discount Pepsi',


                discountAmount,
                row.operational_date,
                discountDesc,
                mappedLocationId
              ])
              console.log(`✨ Auto-generated Pepsi discount: ${discountAmount} RON`)
            } catch (discountErr) {
              console.error('Error generating auto-discount:', discountErr)
            }
          }
          // -------------------------------------------
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

/**
 * POST /api/expenditures/fix-pepsi-retroactive
 * Aplică regulă discount 30% retroactiv pentru înregistrările existente
 */
router.post('/fix-pepsi-retroactive', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    console.log('🔄 Starting retroactive Pepsi discount fix...')

    // 1. Găsește tranzacțiile Bar/Pepsi pozitive
    const findQuery = `
      SELECT id, location_name, department_name, expenditure_type, amount, operational_date, description, mapped_location_id
      FROM expenditures_sync
      WHERE department_name = 'Bar'
      AND (expenditure_type ILIKE '%Pepsi%' OR description ILIKE '%Pepsi%')
      AND amount > 0
    `
    const { rows: originals } = await pool.query(findQuery)
    console.log(`📊 Found ${originals.length} potential Pepsi transactions`)

    let added = 0
    let skipped = 0

    for (const item of originals) {
      // Setează suma discount
      const discountAmount = -Math.round((item.amount * 0.30) * 100) / 100
      const discountDesc = `Discount 30% Pepsi - ${item.expenditure_type}`

      // Verifică dacă există deja 
      const checkQuery = `
         SELECT id FROM expenditures_sync
         WHERE department_name = 'Bar'
         AND operational_date = $1
         AND location_name = $2
         AND amount = $3
         AND description = $4
       `
      const { rows: existing } = await pool.query(checkQuery, [
        item.operational_date,
        item.location_name,
        discountAmount,
        discountDesc
      ])

      if (existing.length === 0) {
        // Normalizare simplă pentru fix
        const normLoc = String(item.location_name || '').trim().toLowerCase().replace(/[\u0300-\u036f]/g, '')

        await pool.query(`
           INSERT INTO expenditures_sync (
             location_name, department_name, expenditure_type, amount, 
             operational_date, description, synced_at, mapped_location_id, data_source,
             normalized_location_name, normalized_department_name, normalized_expenditure_type
           ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, 'auto_discount', $8, 'bar', 'discount pepsi')
           ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
           DO NOTHING
         `, [
          item.location_name,
          'Bar',
          'Discount Pepsi',
          discountAmount,
          item.operational_date,
          discountDesc,
          item.mapped_location_id,
          normLoc
        ])
        added++
      } else {
        skipped++
      }
    }

    res.json({
      success: true,
      message: `Fix complet! Adăugate: ${added}, Existente (Skipped): ${skipped}`,
      stats: { added, skipped }
    })

  } catch (error) {
    console.error('Error in fix-pepsi-retroactive:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Funcție reutilizabilă pentru importul cheltuielilor
 * Poate fi apelată programatic (pentru scheduler) sau prin API
 */
export async function executeExpendituresImport(pool, importSources = { bat: true, googleSheets: true, preferences: true }, progressCallback = null) {
  // Check if already importing
  const isRunning = _importAllProgress && _importAllProgress.status === 'running'
  const isStale = isRunning && _importAllProgress.startTime &&
    (new Date() - new Date(_importAllProgress.startTime)) > 5 * 60 * 1000 // 5 minutes

  if (isRunning && !isStale) {
    console.log('⚠️ Import already running, cannot start new one')
    throw new Error('Import deja în curs. Vă rugăm să așteptați finalizarea.')
  }

  // If stale, clear it and allow new import
  if (isStale) {
    console.log('⚠️ Stale import progress detected, clearing and allowing new import')
    _importAllProgress = null
  }

  console.log('📥 Import sources selected:', importSources)

  const startImport = async () => {
    try {
      const localPool = pool // Folosește pool-ul primit ca parametru

      const startTime = new Date()

      // Initialize progress
      _importAllProgress = {
        status: 'running',
        currentStep: 'Inițializare...',
        totalFound: 0,
        totalRecords: 0, // Pentru UI
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
      console.log('✅ Progress initialized:', JSON.stringify(_importAllProgress, null, 2))

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
        // FIXED: Use loop instead of spread to avoid stack overflow with large arrays
        let minTime = Infinity, maxTime = -Infinity
        dates.forEach(d => {
          const time = new Date(d).getTime()
          if (time < minTime) minTime = time
          if (time > maxTime) maxTime = time
        })
        const minDate = dates.length > 0 ? new Date(minTime) : null
        const maxDate = dates.length > 0 ? new Date(maxTime) : null
        console.log(`✅ Found ${existingData.length} existing records in expenditures_sync`)
        console.log(`📅 Date range in SQL: ${minDate ? minDate.toISOString().split('T')[0] : 'N/A'} to ${maxDate ? maxDate.toISOString().split('T')[0] : 'N/A'}`)
      } else {
        console.log(`✅ Found 0 existing records in expenditures_sync`)
      }

      // Step 2: Get Google Sheets URL from settings, environment, or use default
      _importAllProgress.currentStep = 'Se caută URL Google Sheets...'
      const DEFAULT_GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595'

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

      // Step 3: Try to get data from external DB (API sync source) - DOAR DACĂ BAT ESTE SELECTAT
      let externalData = []
      if (importSources.bat) {
        _importAllProgress.currentStep = 'Se conectează la baza de date externă (BAT)...'
        try {
          console.log('📊 Step 3: Getting data from external DB (BAT sync) - OPTIMIZED VERSION...')
          const externalPool = getExternalPool()

          // Test connection
          console.log('🔌 Testing BAT connection...')
          const testResult = await externalPool.query('SELECT NOW() as current_time')
          console.log('✅ External DB connection successful')

          // Get count for progress tracking
          _importAllProgress.currentStep = 'Se numără înregistrările din BAT...'
          const countResult = await externalPool.query('SELECT COUNT(*) as cnt FROM public.casino_payments WHERE is_deleted = false')
          const totalCount = parseInt(countResult.rows[0].cnt || 0)
          console.log(`📊 Total records in BAT: ${totalCount}`)
          _importAllProgress.totalFound = totalCount

          // Fetch ALL data - NO LIMIT, NO ORDER BY for maximum speed
          _importAllProgress.currentStep = `Se preiau ${totalCount} înregistrări din BAT...`
          console.log('📥 Fetching ALL data from BAT...')

          const fetchResult = await externalPool.query(`
            SELECT 
              l.name as location_name,
              d.name as department_name,
              et.name as expenditure_type,
              p.amount,
              p.date as operational_date,
              p.id as payment_id
            FROM public.casino_payments p
            LEFT JOIN public.casino_locations l ON p.location_id = l.id
            LEFT JOIN public.casino_departments d ON p.department_id = d.id
            LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
            WHERE p.is_deleted = false
              AND p.date >= '2023-01-01'
          `)

          externalData = fetchResult.rows.map(row => ({
            ...row,
            data_source: 'bat_sync',
            description: null
          }))
          _importAllProgress.fromExternalAPI = externalData.length
          _importAllProgress.totalFound = externalData.length
          console.log(`✅ Fetched ${externalData.length} records from BAT`)

          if (externalData.length > 0) {
            const dates = externalData.map(r => r.operational_date).filter(Boolean)
            const minDate = dates.length ? new Date(Math.min(...dates.map(d => new Date(d)))) : null
            const maxDate = dates.length ? new Date(Math.max(...dates.map(d => new Date(d)))) : null
            const minStr = minDate ? minDate.toISOString().split('T')[0] : 'N/A'
            const maxStr = maxDate ? maxDate.toISOString().split('T')[0] : 'N/A'
            console.log(`📅 BAT interval date: ${minStr} → ${maxStr} (dacă nu vezi date după ${maxStr}, baza BAT nu are încă date mai noi)`)
            _importAllProgress.batDateRange = { min: minStr, max: maxStr }
          }
          if (externalData.length > 0) {
            console.log('📊 Sample record:', {
              date: externalData[0].operational_date,
              location: externalData[0].location_name,
              amount: externalData[0].amount,
              department: externalData[0].department_name,
              data_source: externalData[0].data_source
            })
          }

        } catch (batError) {
          console.error('❌ Error fetching from BAT:', batError.message)
          console.error('❌ BAT Error stack:', batError.stack)
          _importAllProgress.currentStep = `❌ Eroare BAT: ${batError.message}`
          _importAllProgress.errors = (_importAllProgress.errors || 0) + 1
          externalData = []
          // Continue with other sources even if BAT fails
          console.log('⚠️ Continuing without BAT data...')
        }
      } else {
        console.log('⏭️ Skipping BAT import (not selected)')
      }

      // REMOVED: Old complex year-by-year fetching code
      // The simplified version above replaces ~500 lines of complex code


      // Step 4: Import from Google Sheets if URL is available - DOAR DACĂ GOOGLE SHEETS ESTE SELECTAT
      let googleSheetsData = []
      if (importSources.googleSheets && googleSheetsUrl) {
        _importAllProgress.currentStep = 'Se importă datele din Google Sheets...'
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
      } else {
        console.log('⏭️ Skipping Google Sheets import (not selected)')
      }

      // Step 5: Import from Preferences if selected
      let preferencesData = []
      if (importSources.preferences) {
        _importAllProgress.currentStep = 'Se importă datele din Preferences...'
        try {
          console.log('📊 Step 5: Importing data from Preferences...')
          // TODO: Implement preferences import logic here
          // For now, we'll skip it as it's a separate endpoint
          console.log('⏭️ Preferences import not yet integrated into import-all (use separate endpoint)')
        } catch (prefError) {
          console.error('❌ Error importing from Preferences:', prefError.message)
          _importAllProgress.currentStep = `❌ Eroare Preferences: ${prefError.message}`
        }
      } else {
        console.log('⏭️ Skipping Preferences import (not selected)')
      }

      // Step 6: Combine and deduplicate
      _importAllProgress.currentStep = 'Se combină și se verifică duplicatele...'
      console.log('📊 Step 6: Combining and deduplicating data...')

      // Combine all external data (only from selected sources)
      externalData = [...externalData, ...googleSheetsData, ...preferencesData]
      console.log(`📊 Total external data before deduplication: ${externalData.length} (BAT: ${externalData.length - googleSheetsData.length - preferencesData.length}, Google Sheets: ${googleSheetsData.length}, Preferences: ${preferencesData.length})`)

      // CRITICAL: Normalize and deduplicate externalData ÎNAINTE de procesare!
      // Normalizăm datele pentru a avea același format (trim, lowercase, etc.)
      const normalizeString = (str) => {
        if (!str) return 'Unknown'
        return String(str).trim().replace(/\s+/g, ' ')
      }

      // Normalizează numele de locație (FĂRĂ diacritice - user vrea fără)
      const normalizeLocationName = (name) => {
        if (!name) return 'Unknown'
        const upper = String(name).toUpperCase().trim()

        // Convertim la formatul standard cu diacritice
        if (upper.includes('PITESTI') || upper.includes('PITEȘTI') || upper.includes('PITI')) {
          return 'Pitesti'
        }
        if (upper.includes('PLOIESTI') || upper.includes('PLOIEȘTI')) {
          if (upper.includes('NORD')) return 'Ploiesti (nord)'
          if (upper.includes('CENTRU') || upper.includes('CENTER')) return 'Ploiesti (centru)'
          return 'Ploiesti (centru)' // Default pentru Ploiesti
        }
        if (upper.includes('VALCEA') || upper.includes('VÂLCEA') || upper.includes('RAMNICU')) {
          return 'Valcea'
        }
        if (upper.includes('CRAIOVA') || upper.includes('CARIOVA')) {
          return 'Craiova'
        }
        if (upper.includes('BUCUREȘTI') || upper.includes('BUCHAREST') || upper.includes('BUCURESTI')) {
          return 'Bucuresti'
        }

        // Dacă nu se potrivește cu niciunul, returnează originalul normalizat
        return normalizeString(name)
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
      // IMPORTANT: Normalizăm location_name pentru a converti fără diacritice la cu diacritice
      const normalizedExternalData = externalData.map(row => ({
        ...row,
        operational_date: normalizeDate(row.operational_date),
        amount: normalizeAmount(row.amount),
        location_name: normalizeLocationName(row.location_name), // Folosește normalizeLocationName în loc de normalizeString
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
      _importAllProgress.totalRecords = externalData.length // Setăm și totalRecords pentru UI
      console.log(`📊 Total records to process: ${externalData.length}`)

      // Skip building existing map - let PostgreSQL handle duplicates via UNIQUE INDEX
      console.log(`📊 Existing records in database: ${existingData.length} (will be handled by PostgreSQL UNIQUE INDEX)`)

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

      console.log(`🔄 Starting to process ${externalData.length} records in batches of ${batchSize}...`)

      if (externalData.length === 0) {
        console.warn('⚠️ WARNING: No external data to import!')
        _importAllProgress.currentStep = 'Nu există date de importat!'
        _importAllProgress.status = 'completed'
        _importAllProgress.endTime = new Date().toISOString()
        return
      }

      for (let batchStart = 0; batchStart < externalData.length; batchStart += batchSize) {
        const batch = externalData.slice(batchStart, batchStart + batchSize)
        const batchPromises = []

        for (const row of batch) {
          const mappedLocationId = mapping[row.location_name] || null
          const dataSource = row.data_source || 'api_sync'
          const description = row.description || null

          // Direct INSERT cu ON CONFLICT DO NOTHING
          const insertPromise = (async () => {
            try {

              const result = dataSource === 'google_sheets' && description
                ? await localPool.query(`
                    INSERT INTO expenditures_sync (
                      location_name, department_name, expenditure_type, amount, 
                      operational_date, synced_at, mapped_location_id, data_source, description
                    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8)
                    ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
                    DO NOTHING
                  `, [
                  row.location_name,
                  row.department_name,
                  row.expenditure_type,
                  row.amount,
                  row.operational_date,
                  mappedLocationId,
                  dataSource,
                  description
                ])
                : await localPool.query(`
                    INSERT INTO expenditures_sync (
                      location_name, department_name, expenditure_type, amount, 
                      operational_date, synced_at, mapped_location_id, data_source
                    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
                    ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type) 
                    DO NOTHING
                  `, [
                  row.location_name,
                  row.department_name,
                  row.expenditure_type,
                  row.amount,
                  row.operational_date,
                  mappedLocationId,
                  dataSource
                ])

              if (result.rowCount > 0) {
                imported++
                _importAllProgress.imported = imported
              } else {
                skipped++
                _importAllProgress.skipped = skipped
              }
            } catch (insertError) {
              if (insertError.code === '23505' || insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
                skipped++
                _importAllProgress.skipped = skipped
              } else {
                errors++
                _importAllProgress.errors = errors
                if (errors <= 5) {
                  console.error('❌ Error inserting record:', insertError.message, 'Data:', row)
                }
              }
            }
          })()

          batchPromises.push(insertPromise)
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
          console.log(`📊 Progress: ${_importAllProgress.totalProcessed}/${externalData.length} (${imported} noi, ${skipped} duplicate, ${errors} erori)`)
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
      _importAllProgress.totalRecords = totalRecords // Asigură-te că totalRecords este setat pentru UI

      console.log(`📊 Final database count: ${totalRecords} records`)

      // Invalidate P&L Cache
      await invalidatePLCache(localPool)
      console.log(`📊 Import summary: ${imported} new, ${skipped} duplicate, ${errors} errors`)

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

  // Execute import
  await startImport()
}

// POST /api/expenditures/import-all - Import TOATE datele din toate sursele (SQL, Google Sheets, BAT) - fără dubluri
router.post('/import-all', authenticateToken, async (req, res) => {
  // Get sources from request body (default to all if not specified)
  const { sources } = req.body || {}
  const importSources = {
    bat: sources?.bat !== false, // Default true
    googleSheets: sources?.googleSheets !== false, // Default true
    preferences: sources?.preferences !== false // Default true
  }

  // Return immediately (non-blocking)
  res.json({
    success: true,
    message: 'Import început. Verifică progresul la /api/expenditures/import-all-status',
    started: true
  })

  // Start import in background (non-blocking)
  executeExpendituresImport(req.app.get('pool'), importSources).catch(err => {
    console.error('❌ Fatal error in import-all background process:', err)
  })
})

// Get synced expenditures data
router.get('/data', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { startDate, endDate } = req.query

    let query = 'SELECT * FROM expenditures_sync'
    const queryParams = []

    if (startDate && endDate) {
      query += ' WHERE operational_date >= $1 AND operational_date <= $2'
      queryParams.push(startDate, endDate)
    }

    query += ' ORDER BY operational_date DESC'

    const result = await pool.query(query, queryParams)

    console.log(`📊 [GET /data] Returning ${result.rows.length} expenditures`)

    if (result.rows.length === 0) {
      console.warn('⚠️ [GET /data] No expenditures found in expenditures_sync table')
    }

    res.json(result.rows)
  } catch (error) {
    console.error('❌ Error fetching expenditures:', error)
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

// GET /api/expenditures/stats - Get statistics about data in database by source
// IMPORTANT: Must be defined BEFORE /settings to avoid route conflicts
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Total count
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM expenditures_sync')
    const total = parseInt(totalResult.rows[0].total) || 0

    // Count by data_source
    const sourceResult = await pool.query(`
      SELECT 
        COALESCE(data_source, 'unknown') as source,
        COUNT(*) as count,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date,
        SUM(amount) as total_amount
      FROM expenditures_sync
      GROUP BY data_source
      ORDER BY count DESC
    `)

    // Count by department
    const deptResult = await pool.query(`
      SELECT 
        COALESCE(department_name, 'Unknown') as department,
        COUNT(*) as count
      FROM expenditures_sync
      GROUP BY department_name
      ORDER BY count DESC
      LIMIT 10
    `)

    // Count by location
    const locResult = await pool.query(`
      SELECT 
        COALESCE(location_name, 'Unknown') as location,
        COUNT(*) as count
      FROM expenditures_sync
      GROUP BY location_name
      ORDER BY count DESC
      LIMIT 10
    `)

    // Date range
    const dateRangeResult = await pool.query(`
      SELECT 
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
    `)

    res.json({
      success: true,
      total,
      bySource: sourceResult.rows.map(row => ({
        source: row.source || 'unknown',
        count: parseInt(row.count) || 0,
        minDate: row.min_date,
        maxDate: row.max_date,
        totalAmount: parseFloat(row.total_amount) || 0
      })),
      byDepartment: deptResult.rows.map(row => ({
        department: row.department || 'Unknown',
        count: parseInt(row.count) || 0
      })),
      byLocation: locResult.rows.map(row => ({
        location: row.location || 'Unknown',
        count: parseInt(row.count) || 0
      })),
      dateRange: dateRangeResult.rows[0] ? {
        minDate: dateRangeResult.rows[0].min_date,
        maxDate: dateRangeResult.rows[0].max_date
      } : null
    })
  } catch (error) {
    console.error('❌ Error fetching expenditures stats:', error)
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

// ===== CHELTUIELI BACKUP RULES (SERVER-SIDE) =====

// GET /api/expenditures/backup-rules - list all rules
router.get('/backup-rules', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const result = await pool.query(
      `
        SELECT
          id,
          name,
          schedule_type,
          schedule_time,
          day_of_week,
          day_of_month,
          start_date,
          end_date,
          retention_days,
          is_active,
          created_by,
          created_at,
          updated_at
        FROM expenditures_backup_rules
        ORDER BY created_at DESC
      `
    )

    res.json({ success: true, rules: result.rows })
  } catch (error) {
    console.error('Error fetching expenditures backup rules:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/backup-rules - create rule
router.post('/backup-rules', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const userId = req.user?.userId || req.user?.id
    const {
      name,
      schedule_type,
      schedule_time,
      day_of_week,
      day_of_month,
      start_date,
      end_date,
      retention_days,
      is_active = true
    } = req.body || {}

    if (!name || !schedule_type) {
      return res.status(400).json({ success: false, error: 'name și schedule_type sunt obligatorii' })
    }

    const result = await pool.query(
      `
        INSERT INTO expenditures_backup_rules (
          name,
          schedule_type,
          schedule_time,
          day_of_week,
          day_of_month,
          start_date,
          end_date,
          retention_days,
          is_active,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 30), $9, $10)
        RETURNING *
      `,
      [
        name,
        schedule_type,
        schedule_time || null,
        day_of_week || null,
        day_of_month || null,
        start_date || null,
        end_date || null,
        retention_days,
        is_active,
        userId || null
      ]
    )

    res.json({ success: true, rule: result.rows[0] })
  } catch (error) {
    console.error('Error creating expenditures backup rule:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/expenditures/backup-rules/:id - update rule
router.put('/backup-rules/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const { id } = req.params
    const {
      name,
      schedule_type,
      schedule_time,
      day_of_week,
      day_of_month,
      start_date,
      end_date,
      retention_days,
      is_active
    } = req.body || {}

    const result = await pool.query(
      `
        UPDATE expenditures_backup_rules
        SET
          name = COALESCE($1, name),
          schedule_type = COALESCE($2, schedule_type),
          schedule_time = COALESCE($3, schedule_time),
          day_of_week = COALESCE($4, day_of_week),
          day_of_month = COALESCE($5, day_of_month),
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date),
          retention_days = COALESCE($8, retention_days),
          is_active = COALESCE($9, is_active),
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `,
      [
        name || null,
        schedule_type || null,
        schedule_time || null,
        day_of_week || null,
        typeof day_of_month === 'number' ? day_of_month : null,
        start_date || null,
        end_date || null,
        typeof retention_days === 'number' ? retention_days : null,
        typeof is_active === 'boolean' ? is_active : null,
        id
      ]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Regulă de backup nu a fost găsită' })
    }

    res.json({ success: true, rule: result.rows[0] })
  } catch (error) {
    console.error('Error updating expenditures backup rule:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/expenditures/backup-rules/:id - delete rule
router.delete('/backup-rules/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const { id } = req.params
    const result = await pool.query(
      'DELETE FROM expenditures_backup_rules WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Regulă de backup nu a fost găsită' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting expenditures backup rule:', error)
    res.status(500).json({ success: false, error: error.message })
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

    // Sincronizare automată la 24h: creează/actualizează regula în expenditures_backup_rules
    // ca scheduler-ul (schedule-expenditures-import.js) să execute importul zilnic la ora setată
    const AUTO_SYNC_RULE_NAME = 'Import automat (setări Auto-Sincronizare)'
    const scheduleTime = cleanSettings.syncTime || '02:00'
    try {
      const existingRule = await pool.query(
        `SELECT id FROM expenditures_backup_rules WHERE name = $1 LIMIT 1`,
        [AUTO_SYNC_RULE_NAME]
      )
      if (cleanSettings.autoSync) {
        if (existingRule.rows.length > 0) {
          await pool.query(
            `UPDATE expenditures_backup_rules SET schedule_type = 'daily', schedule_time = $1, is_active = true, updated_at = CURRENT_TIMESTAMP WHERE name = $2`,
            [scheduleTime, AUTO_SYNC_RULE_NAME]
          )
          console.log(`✅ [AUTO-SYNC] Regula "${AUTO_SYNC_RULE_NAME}" actualizată: zilnic la ${scheduleTime}`)
        } else {
          await pool.query(
            `INSERT INTO expenditures_backup_rules (name, schedule_type, schedule_time, is_active, created_by) VALUES ($1, 'daily', $2, true, $3)`,
            [AUTO_SYNC_RULE_NAME, scheduleTime, userId]
          )
          console.log(`✅ [AUTO-SYNC] Regula "${AUTO_SYNC_RULE_NAME}" creată: zilnic la ${scheduleTime}`)
        }
      } else {
        if (existingRule.rows.length > 0) {
          await pool.query(
            `UPDATE expenditures_backup_rules SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE name = $1`,
            [AUTO_SYNC_RULE_NAME]
          )
          console.log(`✅ [AUTO-SYNC] Regula "${AUTO_SYNC_RULE_NAME}" dezactivată (autoSync off)`)
        }
      }
    } catch (ruleErr) {
      console.error('❌ [AUTO-SYNC] Eroare la creare/actualizare regulă backup:', ruleErr.message)
      // Nu blocăm salvarea setărilor
    }

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
    const { sheetUrl, startDate, endDate, department, location } = req.body

    if (!sheetUrl) {
      return res.status(400).json({ success: false, error: 'Sheet URL is required' })
    }

    console.log('👀 PREVIEW Google Sheets data from:', sheetUrl)
    if (startDate || endDate || department || location) {
      console.log('🔍 Filtre active:', { startDate, endDate, department, location })
    }

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

        // Parse amount - handle multiple formats (ROBUST - same as BAT sync)
        let amount = 0
        if (amountStr) {
          const amountStrClean = String(amountStr).trim()
          // Elimină spații și separatori de mii
          let cleanAmount = amountStrClean.replace(/\s/g, '')

          // Strategie: dacă există virgulă, folosește-o ca separator zecimal (format românesc)
          if (amountStrClean.includes(',')) {
            // Format românesc: 1234,56 sau 1.234,56
            cleanAmount = amountStrClean.replace(/\./g, '').replace(',', '.')
          } else if (amountStrClean.includes('.') && amountStrClean.split('.').length === 2) {
            // Format englez: 1234.56 (un singur punct = separator zecimal)
            const parts = amountStrClean.split('.')
            if (parts[1].length <= 3) {
              // Probabil separator zecimal
              cleanAmount = amountStrClean
            } else {
              // Probabil separator de mii
              cleanAmount = amountStrClean.replace(/\./g, '')
            }
          } else if (amountStrClean.includes('.')) {
            // Multiple puncte = separator de mii românesc
            cleanAmount = amountStrClean.replace(/\./g, '')
          }

          amount = parseFloat(cleanAmount) || 0

          // Rotunjire la 2 zecimale pentru consistență
          amount = Math.round(amount * 100) / 100
        }

        if (!amount || isNaN(amount) || !locationRow || !departmentRow) {
          console.log(`⚠️ Invalid data: amount=${amount}, location="${locationRow}", department="${departmentRow}"`)
          errors++
          continue
        }

        // Aplică filtre (dacă sunt specificate)
        if (startDate && operationalDate < startDate) {
          continue // Skip rândurile înainte de startDate
        }
        if (endDate && operationalDate > endDate) {
          continue // Skip rândurile după endDate
        }
        if (department && department.trim() !== '') {
          // Compară case-insensitive cu departamentul din rând
          if (department.toLowerCase() !== departmentRow.toLowerCase()) {
            continue
          }
        }
        if (location && location.trim() !== '') {
          // Compară case-insensitive cu locația din rând
          if (location.toLowerCase() !== locationRow.toLowerCase()) {
            continue
          }
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
        `, [operationalDate, amount, locationRow, departmentRow, expenditureType])

        const rowData = {
          date: operationalDate,
          amount: amount,
          location: locationRow,
          department: departmentRow,
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
    const { sheetUrl, force = false, startDate, endDate, department, location } = req.body

    if (!sheetUrl) {
      return res.status(400).json({ success: false, error: 'Sheet URL is required' })
    }

    console.log('🔄 Starting Google Sheets import from:', sheetUrl)
    if (startDate || endDate || department || location) {
      console.log('🔍 Filtre active:', { startDate, endDate, department, location })
    }

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

    // Set cu "chei" pentru rândurile curente din Google Sheets
    // Cheia folosește exact combinația din UNIQUE INDEX:
    // operational_date, amount, location_name, department_name, expenditure_type, data_source='google_sheets'
    const currentKeys = new Set()

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
        if (dateStr && dateStr.includes('.')) {
          const dateParts = dateStr.split('.')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
          }
        } else if (dateStr && dateStr.includes('/')) {
          const dateParts = dateStr.split('/')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
          }
        } else if (dateStr && dateStr.includes('-')) {
          operationalDate = dateStr.split('T')[0]
        }

        if (!operationalDate) {
          console.log('⚠️ Invalid date format:', dateStr)
          skipped++
          continue
        }

        // Parse amount - handle multiple formats (ROBUST - same as BAT sync)
        let amount = 0
        if (amountStr) {
          const amountStrClean = String(amountStr).trim()
          // Elimină spații și separatori de mii
          let cleanAmount = amountStrClean.replace(/\s/g, '')

          // Strategie: dacă există virgulă, folosește-o ca separator zecimal (format românesc)
          if (amountStrClean.includes(',')) {
            // Format românesc: 1234,56 sau 1.234,56
            cleanAmount = amountStrClean.replace(/\./g, '').replace(',', '.')
          } else if (amountStrClean.includes('.') && amountStrClean.split('.').length === 2) {
            // Format englez: 1234.56 (un singur punct = separator zecimal)
            const parts = amountStrClean.split('.')
            if (parts[1].length <= 3) {
              // Probabil separator zecimal
              cleanAmount = amountStrClean
            } else {
              // Probabil separator de mii
              cleanAmount = amountStrClean.replace(/\./g, '')
            }
          } else if (amountStrClean.includes('.')) {
            // Multiple puncte = separator de mii românesc
            cleanAmount = amountStrClean.replace(/\./g, '')
          }

          amount = parseFloat(cleanAmount) || 0

          // Rotunjire la 2 zecimale pentru consistență
          amount = Math.round(amount * 100) / 100
        }

        if (!amount || isNaN(amount) || !locationRow || !departmentRow) {
          console.log('⚠️ Invalid data:', { amount, location: locationRow, department: departmentRow })
          skipped++
          continue
        }

        // Aplică filtre (dacă sunt specificate)
        if (startDate && operationalDate < startDate) {
          continue // Skip rândurile înainte de startDate
        }
        if (endDate && operationalDate > endDate) {
          continue // Skip rândurile după endDate
        }
        if (department && department.trim() !== '') {
          // Compară case-insensitive cu departamentul din rând
          if (department.toLowerCase() !== departmentRow.toLowerCase()) {
            continue
          }
        }
        if (location && location.trim() !== '') {
          // Compară case-insensitive cu locația din rând
          if (location.toLowerCase() !== locationRow.toLowerCase()) {
            continue
          }
        }

        const normalizedLocation = (locationRow || 'Unknown').trim()
        const normalizedDepartment = (departmentRow || 'Unknown').trim()
        const normalizedType = (expenditureType || 'Unknown').trim()

        // Construim cheia pentru comparații ulterioare (detectare rânduri dispărute)
        const key = [
          operationalDate,
          amount.toFixed(2),
          normalizedLocation,
          normalizedDepartment,
          normalizedType,
          'google_sheets'
        ].join('||')
        currentKeys.add(key)

        // Check if already exists (to avoid duplicates)
        if (!force) {
          const existing = await pool.query(`
            SELECT id FROM expenditures_sync 
            WHERE operational_date = $1 
              AND amount = $2 
              AND location_name = $3 
              AND department_name = $4
              AND expenditure_type = $5
              AND data_source = 'google_sheets'
            LIMIT 1
          `, [operationalDate, amount, normalizedLocation, normalizedDepartment, normalizedType])

          if (existing.rows.length > 0) {
            skipped++
            continue
          }
        }

        // Helper normalizare
        const normalize = (str) => String(str || '').trim().toLowerCase()
          .replace(/ţ/g, 'ț').replace(/ş/g, 'ș').replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

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
            synced_at,
            normalized_location_name,
            normalized_department_name,
            normalized_expenditure_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11)
        `, [
          operationalDate,
          amount,
          normalizedLocation, // Display Name
          normalizedDepartment,
          normalizedType,
          explanation,
          'google_sheets',
          createdBy, // Use createdBy from CSV
          normalize(normalizedLocation),
          normalize(normalizedDepartment),
          normalize(normalizedType)
        ])

        imported++

        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} rows...`)
        }

      } catch (rowError) {
        console.error('❌ Error processing row:', rowError.message)
        errors++
      }
    }

    // După import: detectăm înregistrările care există în SQL cu data_source='google_sheets'
    // dar NU mai există în Google Sheets (au fost șterse din sheet)
    console.log('🔍 Checking for records that exist in SQL but not in current Google Sheet...')
    const existingGsResult = await pool.query(`
      SELECT 
        id,
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type
      FROM expenditures_sync
      WHERE data_source = 'google_sheets'
    `)

    const orphanIds = []
    let orphanSample = []

    for (const row of existingGsResult.rows) {
      const key = [
        row.operational_date ? row.operational_date.toISOString().split('T')[0] : null,
        Number(row.amount || 0).toFixed(2),
        (row.location_name || 'Unknown').trim(),
        (row.department_name || 'Unknown').trim(),
        (row.expenditure_type || 'Unknown').trim(),
        'google_sheets'
      ].join('||')

      if (!currentKeys.has(key)) {
        orphanIds.push(row.id)
        if (orphanSample.length < 5) {
          orphanSample.push({
            id: row.id,
            operational_date: row.operational_date,
            amount: row.amount,
            location_name: row.location_name,
            department_name: row.department_name,
            expenditure_type: row.expenditure_type
          })
        }
      }
    }

    // Invalidate P&L Cache before closing pool
    try {
      await pool.query('DELETE FROM incasari_monthly_cache')
      console.log('🧹 [CACHE] P&L Cache invalidated (Google Sheets Import)')
    } catch (e) { console.error('Cache invalidation failed', e.message) }

    await pool.end()

    console.log(`🎉 Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`)
    console.log(`🧹 Found ${orphanIds.length} records present in SQL but missing from current Google Sheet`)

    res.json({
      success: true,
      imported,
      skipped,
      errors,
      orphanCount: orphanIds.length,
      orphanIds,
      orphanSample,
      message: `Successfully imported ${imported} expenditures from Google Sheets`
    })

  } catch (error) {
    console.error('❌ Google Sheets import error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Check if Google Sheets data exists
// DELETE /api/expenditures/google-sheets-data - Șterge toate datele din Google Sheets
// SECURIZAT: Necesită confirmare
router.delete('/google-sheets-data', authenticateToken, async (req, res) => {
  try {
    // SECURITATE: Verifică confirmarea
    const { confirmDelete, department, startDate, endDate } = req.body
    if (!confirmDelete || confirmDelete !== true) {
      return res.status(400).json({
        success: false,
        error: 'Confirmare necesară. Trimite confirmDelete: true'
      })
    }

    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    // Construiește query-ul cu filtre opționale
    let query = 'DELETE FROM expenditures_sync WHERE data_source = $1'
    const params = ['google_sheets']
    let paramIndex = 2

    if (department) {
      query += ` AND department_name = $${paramIndex}`
      params.push(department)
      paramIndex++
    }

    if (startDate) {
      query += ` AND operational_date >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND operational_date < $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    // Verifică câte înregistrări vor fi șterse
    const countQuery = query.replace('DELETE FROM', 'SELECT COUNT(*) as count FROM')
    const countResult = await pool.query(countQuery, params)
    const countToDelete = parseInt(countResult.rows[0].count) || 0

    if (countToDelete === 0) {
      return res.json({
        success: true,
        deleted: 0,
        message: 'Nu există date Google Sheets care să corespundă criteriilor specificate'
      })
    }

    const result = await pool.query(query, params)

    console.log(`🗑️ Șterse ${result.rowCount} înregistrări Google Sheets${department ? ` pentru ${department}` : ''}${startDate && endDate ? ` (${startDate} - ${endDate})` : ''}`)

    res.json({
      success: true,
      deleted: result.rowCount,
      message: `Șterse ${result.rowCount} înregistrări Google Sheets${department ? ` pentru ${department}` : ''}${startDate && endDate ? ` (${startDate} - ${endDate})` : ''}`
    })
  } catch (error) {
    console.error('❌ Error deleting Google Sheets data:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

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

    // DEBUG: Log pentru a vedea ce filtre se aplică
    console.log('🔍 SQL-TABLE DEBUG:', {
      query: req.query,
      includedFilters: {
        departments: includedFilters.departments?.length || 0,
        types: includedFilters.types?.length || 0,
        locations: includedFilters.locations?.length || 0,
        typesSample: includedFilters.types?.slice(0, 5)
      },
      whereClause,
      valuesCount: values.length
    })

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

    // Invalidate P&L Cache
    await invalidatePLCache(pool)

    res.json({ success: true, record: updateResult.rows[0] })
  } catch (error) {
    console.error('Error updating expenditure row:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// SQL TABLE DELETE
// SECURIZAT: Necesită confirmare
router.delete('/sql-table/:id', authenticateToken, async (req, res) => {
  try {
    const { confirmDelete } = req.body || {}

    // SECURITATE: Verifică confirmarea
    if (!confirmDelete || confirmDelete !== true) {
      return res.status(400).json({
        success: false,
        error: 'Confirmare necesară pentru ștergere. Trimite confirmDelete: true în body'
      })
    }

    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const { id } = req.params
    const deleteResult = await pool.query(
      'DELETE FROM expenditures_sync WHERE id = $1 RETURNING id, amount',
      [id]
    )

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' })
    }

    // Invalidate P&L Cache
    await invalidatePLCache(pool)

    res.json({ success: true, deleted: deleteResult.rows })
  } catch (error) {
    console.error('Error deleting expenditure row:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// BULK DELETE pentru SQL TABLE (ștergere multiplă după id-uri)
// SECURIZAT: Necesită confirmare
router.post('/sql-table/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not initialized' })
    }

    const { ids, confirmDelete } = req.body || {}

    // SECURITATE: Verifică confirmarea
    if (!confirmDelete || confirmDelete !== true) {
      return res.status(400).json({
        success: false,
        error: 'Confirmare necesară pentru ștergere. Trimite confirmDelete: true'
      })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Lista de ID-uri este goală sau invalidă' })
    }

    // Asigură-te că toate valorile sunt numere întregi
    const normalizedIds = ids
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id))

    if (normalizedIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Niciun ID valid pentru ștergere' })
    }

    const deleteResult = await pool.query(
      `
        DELETE FROM expenditures_sync
        WHERE id = ANY($1::int[])
        RETURNING id, amount
      `,
      [normalizedIds]
    )

    const deletedCount = deleteResult.rowCount
    const deletedIds = deleteResult.rows.map((row) => row.id)
    const deletedTotalAmount = deleteResult.rows.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    )

    res.json({
      success: true,
      deletedCount,
      deletedIds,
      deletedTotalAmount
    })
  } catch (error) {
    console.error('Error bulk deleting expenditure rows:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/clean-duplicates - Remove duplicate records from expenditures_sync
// SECURIZAT: Necesită confirmare
router.post('/clean-duplicates', authenticateToken, async (req, res) => {
  try {
    const { confirmDelete } = req.body || {}

    // SECURITATE: Verifică confirmarea
    if (!confirmDelete || confirmDelete !== true) {
      return res.status(400).json({
        success: false,
        error: 'Confirmare necesară pentru ștergerea duplicatelor. Trimite confirmDelete: true'
      })
    }

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

// POST /api/expenditures/import-preferences
// Import date din Google Sheet pentru preferințe (taxe, cyber, etc.)
router.post('/import-preferences', authenticateToken, async (req, res) => {
  try {
    const { sheetUrl } = req.body

    if (!sheetUrl) {
      return res.status(400).json({ success: false, error: 'Sheet URL is required' })
    }

    console.log('🔄 Starting Preferences import from:', sheetUrl)

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

    console.log(`📊 CSV Headers: ${headers.join(', ')}`)
    console.log(`📈 Total rows to process: ${rows.length}`)

    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    let imported = 0
    let skipped = 0
    let errors = 0

    // Process each row
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

        if (values.length < 3) {
          skipped++
          continue
        }

        // Map columns based on preferences sheet structure
        // Assuming: Date, Category, Amount, Location, Department, Type, etc.
        const [dateStr, category, amountStr, location, department, type, ...rest] = values

        // Parse date
        let operationalDate
        if (dateStr && dateStr.includes('.')) {
          const dateParts = dateStr.split('.')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
          }
        } else if (dateStr && dateStr.includes('/')) {
          const dateParts = dateStr.split('/')
          if (dateParts.length === 3) {
            operationalDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
          }
        } else if (dateStr && dateStr.includes('-')) {
          operationalDate = dateStr.split('T')[0]
        } else {
          skipped++
          continue
        }

        // Parse amount
        // Parse amount - handle multiple formats (ROBUST - same as BAT sync)
        let amount = 0
        if (amountStr) {
          const amountStrClean = String(amountStr).trim()
          // Elimină spații și separatori de mii
          let cleanAmount = amountStrClean.replace(/\s/g, '')

          // Strategie: dacă există virgulă, folosește-o ca separator zecimal (format românesc)
          if (amountStrClean.includes(',')) {
            // Format românesc: 1234,56 sau 1.234,56
            cleanAmount = amountStrClean.replace(/\./g, '').replace(',', '.')
          } else if (amountStrClean.includes('.') && amountStrClean.split('.').length === 2) {
            // Format englez: 1234.56 (un singur punct = separator zecimal)
            const parts = amountStrClean.split('.')
            if (parts[1].length <= 3) {
              // Probabil separator zecimal
              cleanAmount = amountStrClean
            } else {
              // Probabil separator de mii
              cleanAmount = amountStrClean.replace(/\./g, '')
            }
          } else if (amountStrClean.includes('.')) {
            // Multiple puncte = separator de mii românesc
            cleanAmount = amountStrClean.replace(/\./g, '')
          }

          amount = parseFloat(cleanAmount) || 0

          // Rotunjire la 2 zecimale pentru consistență
          amount = Math.round(amount * 100) / 100
        }
        if (amount === 0) {
          skipped++
          continue
        }

        // Insert into expenditures_sync with data_source='preferences'
        const result = await pool.query(`
          INSERT INTO expenditures_sync (
            operational_date, amount, location_name, department_name, 
            expenditure_type, data_source, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'preferences', NOW(), NOW())
          ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type, data_source)
          DO NOTHING
          RETURNING id
        `, [
          operationalDate,
          amount,
          location || 'Nespecificat',
          department || 'Nespecificat',
          type || category || 'Nespecificat'
        ])

        if (result.rows.length > 0) {
          imported++
        } else {
          skipped++
        }

      } catch (error) {
        console.error('Error processing row:', error)
        errors++
      }
    }

    console.log(`✅ Preferences import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`)

    return res.json({
      success: true,
      imported,
      skipped,
      errors,
      total: rows.length
    })

  } catch (error) {
    console.error('❌ Error importing preferences:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Import smart extraction functions
import { extractElectricInvoiceDataSmart } from './electric-invoice-ai.js'

// POST /api/expenditures/analyze-electric-invoice
// Analizează o factură PDF sau link pentru facturi electrice - REFACUT COMPLET CU AI SMART EXTRACTION
router.post('/analyze-electric-invoice', authenticateToken, async (req, res, next) => {
  // Dacă este JSON (link), treci direct, altfel folosește multer pentru fișier
  const contentType = req.headers['content-type'] || ''

  if (contentType.includes('application/json')) {
    return next()
  }

  // Pentru multipart/form-data, folosim upload local dedicat (nu depinde de AWS)
  if (contentType.includes('multipart/form-data')) {
    return electricInvoiceUpload.single('file')(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err)
        console.error('❌ Multer error details:', {
          message: err.message,
          code: err.code,
          field: err.field,
          name: err.name,
          stack: err.stack?.substring(0, 500)
        })

        // Mesaje de eroare mai clare pentru diferite tipuri de erori
        let errorMessage = 'Eroare la procesarea fișierului'
        if (err.message.includes('signature')) {
          errorMessage = 'Eroare de autentificare AWS S3. Verifică credențialele AWS în fișierul .env'
        } else if (err.message.includes('fileSize')) {
          errorMessage = 'Fișierul este prea mare. Dimensiunea maximă este 10MB'
        } else if (err.message.includes('fileFilter')) {
          errorMessage = 'Tip de fișier nepermis. Doar PDF, imagini și documente Office sunt acceptate'
        } else {
          errorMessage = `Eroare la procesarea fișierului: ${err.message}`
        }

        return res.status(400).json({ success: false, error: errorMessage })
      }
      next()
    })
  }

  // Dacă nu este nici JSON nici multipart, verifică dacă există body cu link
  // (poate fi trimis ca application/x-www-form-urlencoded)
  return next()
}, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Validare explicită: trebuie să existe fie link, fie file
    if (!req.body?.link && !req.file) {
      console.error('❌ No file or link provided:', {
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        hasFile: !!req.file,
        contentType: req.headers['content-type']
      })
      return res.status(400).json({
        success: false,
        error: 'Trebuie să furnizezi un fișier PDF sau un link'
      })
    }

    let pdfBuffer = null
    let pdfText = ''

    // Verifică dacă este un fișier (multipart/form-data) sau un link (application/json)
    if (req.body && req.body.link) {
      // Link URL - procesează direct
      try {
        const axiosImport = (await import('axios')).default
        const response = await axiosImport.get(req.body.link, {
          responseType: 'arraybuffer',
          timeout: 30000
        })
        pdfBuffer = Buffer.from(response.data)
        // Extrage text din PDF folosind pdf-parse
        try {
          const pdfData = await pdfParse(pdfBuffer)
          pdfText = pdfData.text
          console.log('✅ Extracted PDF text from link, length:', pdfText.length)
        } catch (parseError) {
          console.error('❌ Error parsing PDF from link:', parseError)
          pdfText = ''
        }
      } catch (linkError) {
        console.error('❌ Error fetching PDF from link:', linkError)
        return res.status(400).json({
          success: false,
          error: `Eroare la descărcarea PDF-ului din link: ${linkError.message}`
        })
      }
    } else if (req.file) {
      // PDF uploadat prin multer (local storage pentru facturi electrice)
      try {
        if (!req.file.path) {
          throw new Error('Fișierul nu are locație validă')
        }

        // Citește fișierul local
        pdfBuffer = fs.readFileSync(req.file.path)
        console.log('✅ Read PDF file:', req.file.path)

        // Extrage text din PDF folosind pdf-parse
        try {
          const pdfData = await pdfParse(pdfBuffer)
          pdfText = pdfData.text
          console.log('✅ Extracted PDF text, length:', pdfText.length)
        } catch (parseError) {
          console.error('❌ Error parsing PDF:', parseError)
          // Continuă cu text gol - va folosi datele simulate
          pdfText = ''
        }

        // Cleanup: șterge fișierul temporar după procesare
        try {
          fs.unlinkSync(req.file.path)
          console.log('✅ Deleted temp file:', req.file.path)
        } catch (e) {
          console.warn('⚠️ Could not delete temp file:', e)
        }
      } catch (fileError) {
        console.error('❌ Error reading uploaded file:', fileError)
        return res.status(400).json({
          success: false,
          error: `Eroare la citirea fișierului: ${fileError.message}`
        })
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Trebuie să furnizezi un fișier PDF sau un link'
      })
    }

    // FOLOSEȘTE NOUA FUNCȚIE SMART DE EXTRACȚIE
    try {
      const { extractElectricInvoiceDataSmart } = await import('./electric-invoice-ai.js')
      const extractedData = await extractElectricInvoiceDataSmart(pdfBuffer || pdfText)

      console.log('✅ Extracted data:', JSON.stringify(extractedData, null, 2))

      // Completează cu valori default dacă lipsesc
      if (!extractedData.numar_factura) extractedData.numar_factura = 'N/A'
      if (!extractedData.data_emiterii) extractedData.data_emiterii = new Date().toISOString().split('T')[0]
      if (!extractedData.data_scadenta) {
        const emitDate = new Date(extractedData.data_emiterii)
        emitDate.setDate(emitDate.getDate() + 30)
        extractedData.data_scadenta = emitDate.toISOString().split('T')[0]
      }
      if (!extractedData.suma_totala) extractedData.suma_totala = '0.00'
      if (!extractedData.consum_kwh) extractedData.consum_kwh = '0'
      if (!extractedData.pret_per_kwh) extractedData.pret_per_kwh = '0.00'
      if (!extractedData.tva) extractedData.tva = '19'
      if (!extractedData.furnizor) extractedData.furnizor = 'N/A'
      if (!extractedData.numar_contor) extractedData.numar_contor = 'N/A'
      if (!extractedData.perioada_facturare) {
        const today = new Date()
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        extractedData.perioada_facturare = `${firstDay.toLocaleDateString('ro-RO')} - ${lastDay.toLocaleDateString('ro-RO')}`
      }

      return res.json({
        success: true,
        extractedData,
        message: `Factură analizată cu succes. Găsite ${extractedData.nlc_codes?.length || 0} NLC-uri.`,
        rawText: (pdfText || '').substring(0, 500) // Primele 500 caractere pentru preview
      })
    } catch (extractError) {
      console.error('❌ Error in smart extraction:', extractError)
      console.error('❌ Error stack:', extractError.stack)
      return res.status(500).json({
        success: false,
        error: `Eroare la extragerea datelor: ${extractError.message}`,
        stack: process.env.NODE_ENV === 'development' ? extractError.stack : undefined
      })
    }
  } catch (error) {
    console.error('❌ Error analyzing electric invoice:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/save-electric-nlc
// Salvează toate NLC-urile extrase din factură în tabelul electric_invoices_nlc (centralizator)
router.post('/save-electric-nlc', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { extractedData, invoiceFile, invoiceLink, pdfData, pdfFilename } = req.body
    const userId = req.user?.userId || req.user?.id

    // DEBUG: Log toate datele primite
    console.log('📥 SAVE-ELECTRIC-NLC REQUEST:')
    console.log('   - extractedData:', extractedData ? 'DA' : 'NU')
    console.log('   - pdfData:', pdfData ? `DA (${Math.round(pdfData.length / 1024)} KB)` : 'NU (undefined/null)')
    console.log('   - pdfFilename:', pdfFilename || 'NU')

    // Log dacă avem PDF atașat
    if (pdfData) {
      console.log(`📎 PDF atașat: ${pdfFilename || 'unnamed.pdf'} (${Math.round(pdfData.length / 1024)} KB)`);
    } else {
      console.log('⚠️ ATENȚIE: pdfData este undefined/null - PDF-ul NU va fi salvat!')
    }

    if (!extractedData) {
      return res.status(400).json({ success: false, error: 'Datele extrase sunt necesare' })
    }

    // Folosește nlc_data care conține toate detaliile pentru fiecare NLC
    const nlcData = extractedData.nlc_data || []
    const numarFactura = extractedData.numar_factura || null
    const perioadaGenerala = extractedData.perioada_facturare || null

    if (nlcData.length === 0) {
      return res.status(400).json({ success: false, error: 'Nu s-au găsit coduri NLC în factură' })
    }

    console.log(`\n💾 SALVARE ${nlcData.length} NLC-URI ÎN CENTRALIZATOR`)
    console.log(`   Factură: ${numarFactura || 'N/A'}`)

    // Parsează data emiterii
    let dataEmiterii = null
    if (extractedData.data_emiterii) {
      try {
        // Format: DD.MM.YYYY
        const parts = extractedData.data_emiterii.split('.')
        if (parts.length === 3) {
          dataEmiterii = `${parts[2]}-${parts[1]}-${parts[0]}`
        } else {
          dataEmiterii = new Date(extractedData.data_emiterii).toISOString().split('T')[0]
        }
      } catch (e) {
        console.warn('⚠️ Invalid date format:', extractedData.data_emiterii)
      }
    }

    // Parsează data scadenței
    let dataScadenta = null
    if (extractedData.data_scadenta) {
      try {
        const parts = extractedData.data_scadenta.split('.')
        if (parts.length === 3) {
          dataScadenta = `${parts[2]}-${parts[1]}-${parts[0]}`
        } else {
          dataScadenta = new Date(extractedData.data_scadenta).toISOString().split('T')[0]
        }
      } catch (e) {
        console.warn('⚠️ Invalid date format:', extractedData.data_scadenta)
      }
    }

    const savedNlcs = []
    let duplicates = 0

    for (const nlcInfo of nlcData) {
      const nlcCode = nlcInfo.nlc
      const locationForNlc = nlcInfo.location || 'N/A'
      const sumaActiva = nlcInfo.suma || null  // Energie activă (kWh)
      const sumaReactiva = nlcInfo.sumaReactiva || null  // Energie reactivă (kVArh)
      const sumaTotala = (parseFloat(sumaActiva) || 0) + (parseFloat(sumaReactiva) || 0)  // TOTAL
      const consumActiv = nlcInfo.consum || null  // Consum activ (kWh)
      const consumReactiv = nlcInfo.consumReactiv || null  // Consum reactiv (kVArh)
      // FOLOSIM ÎNTOTDEAUNA perioadaGenerala - este cea corectă din antetul facturii
      // nlcInfo.period poate fi extras greșit din secțiunea individuală a NLC-ului
      const perioadaForNlc = perioadaGenerala || nlcInfo.period || null
      console.log(`   📅 Perioada pentru NLC ${nlcCode}: ${perioadaForNlc} (general: ${perioadaGenerala}, nlc: ${nlcInfo.period})`)
      const pretPerKwh = nlcInfo.pretCalculat || extractedData.pret_per_kwh || null

      // Skip NLC-uri fără date valide
      if (!nlcCode) {
        console.log(`   ⏭️ Skip NLC invalid`)
        continue
      }

      // === CALCUL SLOTS ȘI CONSUM PER SLOT ===
      let slotsCount = null
      let kwhPerSlot = null
      let costPerSlot = null

      // Extrage luna și anul din perioada de facturare (format: DD.MM.YYYY - DD.MM.YYYY)
      if (perioadaForNlc && locationForNlc && locationForNlc !== 'N/A') {
        const periodMatch = perioadaForNlc.match(/(\d{2})\.(\d{2})\.(\d{4})/)
        if (periodMatch) {
          const month = parseInt(periodMatch[2])
          const year = parseInt(periodMatch[3])

          // Normalizează numele locației pentru căutare în slots_monthly
          // Pitești -> Pitesti, Valcea -> Valcea, etc.
          let searchLocation = locationForNlc
            .replace(/ț/gi, 't').replace(/ș/gi, 's')
            .replace(/ă/gi, 'a').replace(/â/gi, 'a').replace(/î/gi, 'i')
            .trim()

          // Caută sloturi pentru această locație și lună
          try {
            const slotsResult = await pool.query(`
              SELECT slots_count FROM slots_monthly 
              WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(location_name, 'ț', 't'), 'ș', 's'), 'ă', 'a'), 'â', 'a'), 'î', 'i')) 
                    ILIKE LOWER($1)
              AND year = $2 AND month = $3
              LIMIT 1
            `, [`%${searchLocation}%`, year, month])

            if (slotsResult.rows.length > 0) {
              slotsCount = slotsResult.rows[0].slots_count

              // Calculează kWh per slot și cost per slot
              if (slotsCount > 0) {
                if (consumActiv) {
                  kwhPerSlot = parseFloat(consumActiv) / slotsCount
                }
                if (sumaTotala > 0) {
                  costPerSlot = sumaTotala / slotsCount
                }
              }

              console.log(`      📊 Sloturi (${month}/${year}): ${slotsCount} | kWh/slot: ${kwhPerSlot?.toFixed(2) || 'N/A'} | Cost/slot: ${costPerSlot?.toFixed(2) || 'N/A'} RON`)
            } else {
              console.log(`      ⚠️ Nu s-au găsit sloturi pentru ${searchLocation} în ${month}/${year}`)
            }
          } catch (slotsErr) {
            console.error(`      ❌ Eroare căutare sloturi:`, slotsErr.message)
          }
        }
      }

      console.log(`   📍 NLC ${nlcCode}: ${locationForNlc}`)
      console.log(`      E.Activă: ${sumaActiva?.toFixed(2) || 'N/A'} RON (${consumActiv?.toFixed(0) || 'N/A'} kWh)`)
      console.log(`      E.Reactivă: ${sumaReactiva?.toFixed(2) || '0'} RON (${consumReactiv?.toFixed(0) || '0'} kVArh)`)
      console.log(`      TOTAL: ${sumaTotala.toFixed(2)} RON`)

      // Verifică dacă există deja (pentru a evita duplicatele)
      const existing = await pool.query(`
        SELECT id FROM electric_invoices_nlc 
        WHERE nlc_code = $1 AND numar_factura = $2
        LIMIT 1
      `, [nlcCode, numarFactura])

      if (existing.rows.length > 0 && numarFactura) {
        console.log(`   ⚠️ NLC ${nlcCode} deja există pentru factura ${numarFactura} - skip duplicat`)
        duplicates++
        continue
      }

      // Extrage suma totală a facturii (extrasă direct din factură, nu calculată din NLC-uri)
      const invoiceTotalAmount = extractedData.suma_totala
        ? (typeof extractedData.suma_totala === 'string' ? parseFloat(extractedData.suma_totala) : extractedData.suma_totala)
        : null

      const result = await pool.query(`
        INSERT INTO electric_invoices_nlc (
          nlc_code,
          location_name,
          numar_factura,
          perioada_facturare,
          suma_totala,
          suma_activa,
          suma_reactiva,
          consum_kwh,
          consum_reactiv_kvarh,
          pret_per_kwh,
          tva,
          furnizor,
          numar_contor,
          data_emiterii,
          data_scadenta,
          invoice_file_path,
          invoice_link,
          created_by,
          slots_count,
          kwh_per_slot,
          cost_per_slot,
          pdf_file,
          pdf_filename,
          invoice_total_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING id
      `, [
        nlcCode,
        locationForNlc,
        numarFactura,
        perioadaForNlc,
        sumaTotala > 0 ? sumaTotala : null,  // TOTAL (activă + reactivă) pentru acest NLC
        sumaActiva ? parseFloat(sumaActiva) : null,  // Energie activă
        sumaReactiva ? parseFloat(sumaReactiva) : null,  // Energie reactivă
        consumActiv ? parseFloat(consumActiv) : null,  // Consum activ (kWh)
        consumReactiv ? parseFloat(consumReactiv) : null,  // Consum reactiv (kVArh)
        pretPerKwh ? parseFloat(pretPerKwh) : null,
        extractedData.tva ? parseFloat(extractedData.tva) : 19,
        extractedData.furnizor || null,
        extractedData.numar_contor || null,
        dataEmiterii,
        dataScadenta,
        invoiceFile || null,
        invoiceLink || null,
        userId,
        slotsCount,
        kwhPerSlot,
        costPerSlot,
        pdfData || null,  // PDF Base64
        pdfFilename || null,  // Numele fișierului PDF
        invoiceTotalAmount && invoiceTotalAmount > 0 ? invoiceTotalAmount : null  // Suma totală extrasă din factură
      ])

      if (result.rows.length > 0) {
        savedNlcs.push({
          nlc_code: nlcCode,
          location: locationForNlc,
          suma: sumaTotala,
          sumaActiva: sumaActiva,
          sumaReactiva: sumaReactiva,
          consum: consumActiv,
          consumReactiv: consumReactiv,
          id: result.rows[0].id
        })

        // Actualizează și tabelul locations cu NLC code
        if (locationForNlc && locationForNlc !== 'N/A') {
          try {
            const normalizedLocation = normalizeLocationName(locationForNlc)

            // Caută locația în tabel (case insensitive)
            const locationResult = await pool.query(`
              SELECT id, name, nlc_code 
              FROM locations 
              WHERE LOWER(name) LIKE LOWER($1)
              LIMIT 1
            `, [`%${normalizedLocation}%`])

            if (locationResult.rows.length > 0) {
              const loc = locationResult.rows[0]

              // Actualizează nlc_code doar dacă nu există deja sau e diferit
              if (!loc.nlc_code || loc.nlc_code !== nlcCode) {
                // Dacă există deja un NLC, adaugă-l la listă (separate by comma)
                let newNlcCode = nlcCode
                if (loc.nlc_code && !loc.nlc_code.includes(nlcCode)) {
                  newNlcCode = `${loc.nlc_code}, ${nlcCode}`
                } else if (loc.nlc_code) {
                  newNlcCode = loc.nlc_code // Nu schimba dacă deja există
                }

                await pool.query(`
                  UPDATE locations 
                  SET nlc_code = $1, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = $2
                `, [newNlcCode, loc.id])

                console.log(`   📍 Actualizat locația "${loc.name}" cu NLC: ${newNlcCode}`)
              }
            } else {
              console.log(`   ⚠️ Locația "${normalizedLocation}" nu a fost găsită în tabelul locations`)
            }
          } catch (locError) {
            console.error(`   ❌ Eroare la actualizarea locației:`, locError.message)
          }
        }
      }
    }

    console.log(`✅ Saved ${savedNlcs.length} NLC codes to centralizer (${duplicates} duplicates skipped):`)
    savedNlcs.forEach(nlc => {
      console.log(`   - NLC ${nlc.nlc_code} -> ${nlc.location || 'N/A'} (${nlc.suma?.toFixed(2) || 'N/A'} RON)`)
    })

    res.json({
      success: true,
      message: `${savedNlcs.length} coduri NLC salvate în centralizator${duplicates > 0 ? `, ${duplicates} duplicate ignorate` : ''}`,
      saved_count: savedNlcs.length,
      duplicates: duplicates,
      saved: savedNlcs
    })
  } catch (error) {
    console.error('❌ Error saving NLC to centralizer:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/expenditures/electric-nlc-centralizer
// Obține toate NLC-urile salvate din centralizator cu statistici
router.get('/electric-nlc-centralizer', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Verifică dacă tabelul există
    try {
      await pool.query('SELECT 1 FROM electric_invoices_nlc LIMIT 1')
    } catch (tableError) {
      // Tabelul nu există - returnează date goale
      console.log('⚠️ Tabelul electric_invoices_nlc nu există încă:', tableError.message)
      return res.json({
        success: true,
        data: [],
        stats: {
          total_records: 0,
          unique_nlc_codes: 0,
          unique_locations: 0,
          total_amount: 0,
          total_kwh: 0,
          saved_to_expenditures: 0
        }
      })
    }

    const { location, startDate, endDate } = req.query

    let query = `
      SELECT 
        id,
        nlc_code,
        location_name,
        numar_factura,
        perioada_facturare,
        suma_totala,
        consum_kwh,
        pret_per_kwh,
        tva,
        furnizor,
        numar_contor,
        data_emiterii,
        data_scadenta,
        saved_to_expenditures,
        extracted_at,
        created_by,
        slots_count,
        kwh_per_slot,
        cost_per_slot,
        invoice_total_amount
      FROM electric_invoices_nlc
      WHERE 1=1
    `
    const params = []
    let paramIndex = 1

    if (location) {
      query += ` AND location_name = $${paramIndex}`
      params.push(location)
      paramIndex++
    }

    if (startDate) {
      query += ` AND data_emiterii >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND data_emiterii <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    query += ` ORDER BY extracted_at DESC, nlc_code`

    const result = await pool.query(query, params)

    // Agregă datele pe NLC code
    const aggregatedByNlc = {}
    for (const row of result.rows) {
      const nlc = row.nlc_code
      if (!aggregatedByNlc[nlc]) {
        aggregatedByNlc[nlc] = {
          id: row.id, // ID-ul primei înregistrări pentru acest NLC
          ids: [row.id], // Toate ID-urile pentru acest NLC
          nlc_code: nlc,
          location_name: row.location_name,
          perioada_facturare: row.perioada_facturare, // Prima perioadă găsită
          invoice_count: 0,
          total_suma: 0,
          total_consum: 0,
          slots_count: row.slots_count || null,
          kwh_per_slot: row.kwh_per_slot ? parseFloat(row.kwh_per_slot) : null,
          cost_per_slot: row.cost_per_slot ? parseFloat(row.cost_per_slot) : null,
          invoices: [],
          last_invoice_date: null,
          first_invoice_date: null
        }
      } else {
        // Adaugă ID-ul în lista de ID-uri
        aggregatedByNlc[nlc].ids.push(row.id)
      }

      aggregatedByNlc[nlc].invoice_count++
      aggregatedByNlc[nlc].total_suma += parseFloat(row.suma_totala) || 0
      aggregatedByNlc[nlc].total_consum += parseFloat(row.consum_kwh) || 0
      aggregatedByNlc[nlc].invoices.push({
        numar_factura: row.numar_factura,
        perioada: row.perioada_facturare,
        suma: row.suma_totala,
        consum: row.consum_kwh,
        data: row.data_emiterii
      })

      // Track first and last invoice date
      const invoiceDate = row.data_emiterii ? new Date(row.data_emiterii) : null
      if (invoiceDate) {
        if (!aggregatedByNlc[nlc].last_invoice_date || invoiceDate > new Date(aggregatedByNlc[nlc].last_invoice_date)) {
          aggregatedByNlc[nlc].last_invoice_date = row.data_emiterii
        }
        if (!aggregatedByNlc[nlc].first_invoice_date || invoiceDate < new Date(aggregatedByNlc[nlc].first_invoice_date)) {
          aggregatedByNlc[nlc].first_invoice_date = row.data_emiterii
        }
      }
    }

    const aggregatedData = Object.values(aggregatedByNlc).sort((a, b) => b.total_suma - a.total_suma)

    // Calculează statistici
    // Facturi unice: numără numerele de factură distincte (exclude 'N/A' și null)
    const uniqueInvoices = [...new Set(
      result.rows
        .map(r => r.numar_factura)
        .filter(nr => nr && nr !== 'N/A' && nr.trim() !== '')
    )]

    const stats = {
      total_records: result.rows.length,
      unique_nlc_codes: aggregatedData.length,
      unique_locations: [...new Set(result.rows.map(r => r.location_name).filter(Boolean))].length,
      unique_invoices: uniqueInvoices.length, // Adăugat: număr facturi unice
      total_amount: result.rows.reduce((sum, r) => sum + (parseFloat(r.suma_totala) || 0), 0),
      total_kwh: result.rows.reduce((sum, r) => sum + (parseFloat(r.consum_kwh) || 0), 0),
      saved_to_expenditures: result.rows.filter(r => r.saved_to_expenditures).length
    }

    res.json({
      success: true,
      data: aggregatedData,
      rawData: result.rows,
      stats
    })
  } catch (error) {
    console.error('❌ Error fetching NLC centralizer:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/expenditures/electric-invoice-pdf/:invoiceNumber
// Obține PDF-ul pentru o factură specifică
router.get('/electric-invoice-pdf/:invoiceNumber', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { invoiceNumber } = req.params
    console.log(`📄 Cerere PDF pentru factura: ${invoiceNumber}`)

    // Caută PDF-ul pentru această factură
    const result = await pool.query(`
      SELECT pdf_file, pdf_filename, numar_factura
      FROM electric_invoices_nlc 
      WHERE numar_factura = $1 AND pdf_file IS NOT NULL
      LIMIT 1
    `, [invoiceNumber])

    if (result.rows.length === 0 || !result.rows[0].pdf_file) {
      return res.status(404).json({ success: false, error: 'PDF-ul nu a fost găsit pentru această factură' })
    }

    const { pdf_file, pdf_filename } = result.rows[0]

    res.json({
      success: true,
      pdfData: pdf_file,
      filename: pdf_filename || `Factura_${invoiceNumber}.pdf`
    })
  } catch (error) {
    console.error('❌ Error getting PDF:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/expenditures/electric-invoices-by-month/:monthKey
// Obține toate facturile (cu PDF) pentru o lună specifică
router.get('/electric-invoices-by-month/:monthKey', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { monthKey } = req.params // Format: 2024-06
    console.log(`📄 Cerere facturi pentru luna: ${monthKey}`)

    const [year, month] = monthKey.split('-')
    const monthPattern = `%.${month}.${year}%`

    // Obține toate facturile unice pentru această lună
    const result = await pool.query(`
      SELECT DISTINCT ON (numar_factura)
        numar_factura,
        perioada_facturare,
        pdf_file,
        pdf_filename,
        furnizor,
        data_emiterii
      FROM electric_invoices_nlc 
      WHERE perioada_facturare LIKE $1
      ORDER BY numar_factura, data_emiterii DESC
    `, [monthPattern])

    // Nu trimitem PDF-urile în lista, doar metadata
    const invoices = result.rows.map(row => ({
      numar_factura: row.numar_factura,
      perioada_facturare: row.perioada_facturare,
      furnizor: row.furnizor,
      data_emiterii: row.data_emiterii,
      has_pdf: !!row.pdf_file,
      pdf_filename: row.pdf_filename
    }))

    res.json({
      success: true,
      monthKey,
      invoices
    })
  } catch (error) {
    console.error('❌ Error getting invoices by month:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/delete-electric-nlcs
// Șterge NLC-uri selectate din centralizator
router.post('/delete-electric-nlcs', authenticateToken, async (req, res) => {
  console.log('🗑️ DELETE NLCs - Request body:', JSON.stringify(req.body))
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      console.error('❌ Database pool not available')
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { nlc_ids } = req.body // Array de id-uri sau nlc_code-uri
    console.log('🗑️ nlc_ids received:', nlc_ids, 'type:', typeof nlc_ids, 'isArray:', Array.isArray(nlc_ids))

    if (!nlc_ids || !Array.isArray(nlc_ids) || nlc_ids.length === 0) {
      console.error('❌ No NLCs to delete')
      return res.status(400).json({ success: false, error: 'Selectează cel puțin un NLC pentru ștergere' })
    }

    console.log(`🗑️ Ștergere ${nlc_ids.length} NLC-uri:`, nlc_ids)

    // Convertim totul la string pentru a trata uniform
    const idsAsStrings = nlc_ids.map(id => String(id))

    // NLC code-urile au 10 cifre și încep cu 700
    // ID-urile din DB sunt numere mici (sub 10000)
    const nlcCodes = idsAsStrings.filter(id => id.length === 10 && id.startsWith('700'))
    const dbIds = idsAsStrings.filter(id => id.length < 10 || !id.startsWith('700')).map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0)

    console.log(`   NLC codes pentru ștergere:`, nlcCodes)
    console.log(`   DB IDs pentru ștergere:`, dbIds)

    let totalDeleted = 0

    // Șterge după nlc_code (coduri de 10 cifre)
    if (nlcCodes.length > 0) {
      const result = await pool.query(`
        DELETE FROM electric_invoices_nlc 
        WHERE nlc_code = ANY($1)
        RETURNING id, nlc_code
      `, [nlcCodes])
      totalDeleted += result.rowCount
      console.log(`   ✅ Șterse ${result.rowCount} după NLC code`)
    }

    // Șterge după ID numeric din DB
    if (dbIds.length > 0) {
      const result = await pool.query(`
        DELETE FROM electric_invoices_nlc 
        WHERE id = ANY($1)
        RETURNING id, nlc_code
      `, [dbIds])
      totalDeleted += result.rowCount
      console.log(`   ✅ Șterse ${result.rowCount} după DB ID`)
    }

    console.log(`✅ Total șterse: ${totalDeleted} înregistrări`)

    res.json({
      success: true,
      deleted_count: totalDeleted,
      message: `${totalDeleted} NLC-uri șterse din centralizator`
    })
  } catch (error) {
    console.error('❌ Error deleting NLCs:', error.message)
    console.error('❌ Stack:', error.stack)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/verify-electric-invoices
// Verifică dacă facturile și sumele din listă corespund cu cele din sistem
router.post('/verify-electric-invoices', authenticateToken, async (req, res) => {
  console.log('🔍 VERIFY INVOICES - Request body:', JSON.stringify(req.body))
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      console.error('❌ Database pool not available')
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { invoices } = req.body // Array de facturi: [{ cod, data, factura, suma, status }]

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({ success: false, error: 'Lista de facturi este necesară' })
    }

    console.log(`🔍 Verificare ${invoices.length} facturi...`)

    const results = {
      found: [],
      foundWithDifferentAmount: [],
      notFound: [],
      summary: {
        total: invoices.length,
        found: 0,
        foundWithDifferentAmount: 0,
        notFound: 0
      }
    }

    // Pentru fiecare factură din listă
    for (const invoice of invoices) {
      const invoiceNumber = invoice.factura || invoice.număr_factură || invoice.invoice
      const expectedAmount = parseFloat(invoice.suma || invoice.amount || 0)
      const nlcCode = invoice.cod || invoice.nlc_code

      if (!invoiceNumber) {
        results.notFound.push({
          ...invoice,
          reason: 'Număr factură lipsă'
        })
        continue
      }

      // Normalizează numărul facturii (elimină spații, convertește la uppercase)
      const normalizedInvoiceNumber = invoiceNumber.trim().toUpperCase()

      console.log(`   🔍 Căutare factură: "${normalizedInvoiceNumber}" (suma: ${expectedAmount}, NLC: ${nlcCode || 'N/A'})`)

      // Caută factura în sistem - mai întâi exact, apoi cu LIKE pentru flexibilitate
      let invoiceResult = await pool.query(`
        SELECT 
          numar_factura,
          SUM(suma_totala) as total_suma,
          COUNT(*) as nlc_count,
          STRING_AGG(DISTINCT nlc_code::text, ', ') as nlc_codes,
          STRING_AGG(DISTINCT location_name, ', ') as locations,
          MIN(data_emiterii) as data_emiterii
        FROM electric_invoices_nlc
        WHERE UPPER(TRIM(numar_factura)) = $1
        GROUP BY numar_factura
      `, [normalizedInvoiceNumber])

      console.log(`      → Căutare exactă: ${invoiceResult.rows.length} rezultate`)

      // Dacă nu găsește exact, încearcă să caute după partea numerică (fără prefix EFI)
      if (invoiceResult.rows.length === 0 && normalizedInvoiceNumber.includes('EFI')) {
        const numericPart = normalizedInvoiceNumber.replace(/^EFI/i, '').trim()
        if (numericPart) {
          console.log(`      → Căutare după partea numerică: "${numericPart}"`)
          invoiceResult = await pool.query(`
            SELECT 
              numar_factura,
              SUM(suma_totala) as total_suma,
              COUNT(*) as nlc_count,
              STRING_AGG(DISTINCT nlc_code::text, ', ') as nlc_codes,
              STRING_AGG(DISTINCT location_name, ', ') as locations,
              MIN(data_emiterii) as data_emiterii
            FROM electric_invoices_nlc
            WHERE UPPER(TRIM(numar_factura)) LIKE $1
            GROUP BY numar_factura
          `, [`%${numericPart}%`])
          console.log(`      → Căutare LIKE: ${invoiceResult.rows.length} rezultate`)
        }
      }

      // Dacă încă nu găsește și avem cod NLC, caută după NLC + suma aproximativă
      if (invoiceResult.rows.length === 0 && nlcCode) {
        const nlcNormalized = String(nlcCode).trim()
        const amountTolerance = expectedAmount * 0.05 // 5% toleranță pentru sumă

        console.log(`      → Căutare după NLC "${nlcNormalized}" + suma ${expectedAmount} (±${amountTolerance.toFixed(2)})`)
        invoiceResult = await pool.query(`
          SELECT 
            numar_factura,
            SUM(suma_totala) as total_suma,
            COUNT(*) as nlc_count,
            STRING_AGG(DISTINCT nlc_code::text, ', ') as nlc_codes,
            STRING_AGG(DISTINCT location_name, ', ') as locations,
            MIN(data_emiterii) as data_emiterii
          FROM electric_invoices_nlc
          WHERE nlc_code = $1
          GROUP BY numar_factura
          HAVING ABS(SUM(suma_totala) - $2) <= $3
          ORDER BY ABS(SUM(suma_totala) - $2)
          LIMIT 1
        `, [nlcNormalized, expectedAmount, amountTolerance])
        console.log(`      → Căutare după NLC: ${invoiceResult.rows.length} rezultate`)
      }

      if (invoiceResult.rows.length === 0) {
        results.notFound.push({
          invoiceNumber,
          expectedAmount,
          nlcCode,
          ...invoice,
          reason: 'Factură nu există în sistem'
        })
        results.summary.notFound++
      } else {
        const dbInvoice = invoiceResult.rows[0]
        const dbAmount = parseFloat(dbInvoice.total_suma) || 0
        const difference = Math.abs(dbAmount - expectedAmount)
        const tolerance = 0.01 // Toleranță de 1 ban pentru diferențe de rotunjire

        if (difference <= tolerance) {
          results.found.push({
            invoiceNumber,
            expectedAmount,
            dbAmount,
            nlcCount: parseInt(dbInvoice.nlc_count),
            nlcCodes: dbInvoice.nlc_codes,
            locations: dbInvoice.locations,
            dataEmiterii: dbInvoice.data_emiterii,
            ...invoice,
            status: '✅ CORESPUNDE'
          })
          results.summary.found++
        } else {
          results.foundWithDifferentAmount.push({
            invoiceNumber,
            expectedAmount,
            dbAmount,
            difference,
            differencePercent: ((difference / expectedAmount) * 100).toFixed(2),
            nlcCount: parseInt(dbInvoice.nlc_count),
            nlcCodes: dbInvoice.nlc_codes,
            locations: dbInvoice.locations,
            dataEmiterii: dbInvoice.data_emiterii,
            ...invoice,
            status: '⚠️ DIFERENȚĂ SUMĂ'
          })
          results.summary.foundWithDifferentAmount++
        }
      }
    }

    console.log(`✅ Verificare completă: ${results.summary.found} găsite, ${results.summary.foundWithDifferentAmount} cu diferențe, ${results.summary.notFound} lipsă`)

    res.json({
      success: true,
      results,
      message: `Verificare completă: ${results.summary.found} găsite, ${results.summary.foundWithDifferentAmount} cu diferențe, ${results.summary.notFound} lipsă`
    })
  } catch (error) {
    console.error('❌ Error verifying invoices:', error.message)
    console.error('❌ Stack:', error.stack)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/expenditures/find-duplicate-invoices
// Găsește facturi duplicate în centralizator (același număr factură cu sume diferite sau duplicate)
router.get('/find-duplicate-invoices', authenticateToken, async (req, res) => {
  console.log('🔍 FIND DUPLICATE INVOICES')
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Găsește toate facturile grupate după număr factură
    const result = await pool.query(`
      SELECT 
        numar_factura,
        COUNT(*) as record_count,
        COUNT(DISTINCT nlc_code) as unique_nlc_count,
        SUM(suma_totala) as total_suma,
        MIN(suma_totala) as min_suma,
        MAX(suma_totala) as max_suma,
        SUM(consum_kwh) as total_consum,
        STRING_AGG(DISTINCT nlc_code::text, ', ' ORDER BY nlc_code::text) as nlc_codes,
        STRING_AGG(DISTINCT location_name, ', ' ORDER BY location_name) as locations,
        STRING_AGG(DISTINCT perioada_facturare, ' | ') as perioade,
        MIN(data_emiterii) as data_emiterii_min,
        MAX(data_emiterii) as data_emiterii_max,
        ARRAY_AGG(id ORDER BY id) as ids,
        ARRAY_AGG(suma_totala ORDER BY id) as sume_individuale
      FROM electric_invoices_nlc
      WHERE numar_factura IS NOT NULL AND numar_factura != ''
      GROUP BY numar_factura
      HAVING COUNT(*) > 1 OR (MAX(suma_totala) - MIN(suma_totala)) > 0.01
      ORDER BY COUNT(*) DESC, numar_factura
    `)

    const duplicates = []
    const suspicious = []

    for (const row of result.rows) {
      const recordCount = parseInt(row.record_count)
      const minSuma = parseFloat(row.min_suma) || 0
      const maxSuma = parseFloat(row.max_suma) || 0
      const sumaDiff = maxSuma - minSuma
      const totalSuma = parseFloat(row.total_suma) || 0

      // Dacă are mai multe înregistrări cu sume diferite, e suspect
      if (recordCount > 1 && sumaDiff > 0.01) {
        // Verifică dacă sunt duplicate reale (aceeași perioadă, locație, sumă)
        const detailResult = await pool.query(`
          SELECT 
            id,
            nlc_code,
            location_name,
            suma_totala,
            consum_kwh,
            perioada_facturare,
            data_emiterii,
            extracted_at
          FROM electric_invoices_nlc
          WHERE numar_factura = $1
          ORDER BY id
        `, [row.numar_factura])

        // Verifică dacă există înregistrări identice (duplicate reale)
        const identicalGroups = {}
        detailResult.rows.forEach(record => {
          const key = `${record.perioada_facturare || 'N/A'}_${record.location_name || 'N/A'}_${parseFloat(record.suma_totala || 0).toFixed(2)}`
          if (!identicalGroups[key]) {
            identicalGroups[key] = []
          }
          identicalGroups[key].push(record)
        })

        const hasRealDuplicates = Object.values(identicalGroups).some(group => group.length > 1)

        if (hasRealDuplicates) {
          duplicates.push({
            numar_factura: row.numar_factura,
            record_count: recordCount,
            unique_nlc_count: parseInt(row.unique_nlc_count),
            total_suma: totalSuma,
            min_suma: minSuma,
            max_suma: maxSuma,
            suma_difference: sumaDiff,
            total_consum: parseFloat(row.total_consum) || 0,
            nlc_codes: row.nlc_codes,
            locations: row.locations,
            perioade: row.perioade,
            data_emiterii_min: row.data_emiterii_min,
            data_emiterii_max: row.data_emiterii_max,
            ids: row.ids,
            sume_individuale: row.sume_individuale,
            details: detailResult.rows,
            identical_groups: identicalGroups,
            type: 'duplicate'
          })
        } else {
          suspicious.push({
            numar_factura: row.numar_factura,
            record_count: recordCount,
            unique_nlc_count: parseInt(row.unique_nlc_count),
            total_suma: totalSuma,
            min_suma: minSuma,
            max_suma: maxSuma,
            suma_difference: sumaDiff,
            total_consum: parseFloat(row.total_consum) || 0,
            nlc_codes: row.nlc_codes,
            locations: row.locations,
            perioade: row.perioade,
            data_emiterii_min: row.data_emiterii_min,
            data_emiterii_max: row.data_emiterii_max,
            ids: row.ids,
            sume_individuale: row.sume_individuale,
            details: detailResult.rows,
            type: 'suspicious'
          })
        }
      }
    }

    console.log(`✅ Găsite ${duplicates.length} duplicate și ${suspicious.length} suspecte`)

    res.json({
      success: true,
      duplicates,
      suspicious,
      summary: {
        total_duplicates: duplicates.length,
        total_suspicious: suspicious.length,
        total_checked: result.rows.length
      }
    })
  } catch (error) {
    console.error('❌ Error finding duplicate invoices:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/expenditures/check-invoice-details/:invoiceNumber
// Verifică detalii despre o factură specifică (pentru debugging)
router.get('/check-invoice-details/:invoiceNumber', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const invoiceNumber = decodeURIComponent(req.params.invoiceNumber).trim().toUpperCase()

    // Găsește toate înregistrările pentru această factură
    const result = await pool.query(`
      SELECT 
        id,
        nlc_code,
        location_name,
        numar_factura,
        perioada_facturare,
        suma_totala,
        suma_activa,
        suma_reactiva,
        consum_kwh,
        pret_per_kwh,
        invoice_total_amount,
        data_emiterii,
        extracted_at
      FROM electric_invoices_nlc
      WHERE UPPER(TRIM(numar_factura)) = $1
      ORDER BY id
    `, [invoiceNumber])

    // Calculează sumele
    const totalSumaCalculata = result.rows.reduce((sum, r) => sum + (parseFloat(r.suma_totala) || 0), 0)
    const totalConsum = result.rows.reduce((sum, r) => sum + (parseFloat(r.consum_kwh) || 0), 0)

    // Găsește suma totală extrasă din factură (dacă există)
    const invoiceTotalAmount = result.rows.find(r => r.invoice_total_amount)?.invoice_total_amount || null

    // Detectează duplicate (aceeași perioadă + locație + NLC + sumă)
    const duplicateGroups = {}
    result.rows.forEach(row => {
      const key = `${row.perioada_facturare || 'N/A'}_${row.location_name || 'N/A'}_${row.nlc_code || 'N/A'}_${parseFloat(row.suma_totala || 0).toFixed(2)}`
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = []
      }
      duplicateGroups[key].push(row)
    })

    const duplicates = Object.values(duplicateGroups).filter(group => group.length > 1)

    // Verifică dacă există un NLC cu suma prea mare (probabil are suma totală a facturii)
    const suspiciousNlcs = result.rows.filter(r => {
      const sumaNlc = parseFloat(r.suma_totala) || 0
      return invoiceTotalAmount && sumaNlc > invoiceTotalAmount * 0.8 // Dacă suma NLC-ului este >80% din suma facturii, e suspect
    })

    res.json({
      success: true,
      invoiceNumber,
      totalRecords: result.rows.length,
      totalSumaCalculata,
      invoiceTotalAmount,
      totalConsum,
      records: result.rows,
      duplicates: duplicates.flat(),
      duplicateGroups: Object.fromEntries(
        Object.entries(duplicateGroups).filter(([_, group]) => group.length > 1)
      ),
      suspiciousNlcs: suspiciousNlcs.map(r => ({
        id: r.id,
        nlc_code: r.nlc_code,
        location_name: r.location_name,
        suma_totala: r.suma_totala,
        suma_activa: r.suma_activa,
        suma_reactiva: r.suma_reactiva,
        reason: `Suma NLC (${parseFloat(r.suma_totala || 0).toFixed(2)} RON) este ${((parseFloat(r.suma_totala || 0) / (invoiceTotalAmount || 1)) * 100).toFixed(1)}% din suma facturii (${invoiceTotalAmount?.toFixed(2) || 'N/A'} RON)`
      })),
      summary: {
        uniqueNlcs: [...new Set(result.rows.map(r => r.nlc_code))].length,
        uniqueLocations: [...new Set(result.rows.map(r => r.location_name))].length,
        duplicateCount: duplicates.reduce((sum, group) => sum + (group.length - 1), 0),
        hasInvoiceTotal: !!invoiceTotalAmount,
        difference: invoiceTotalAmount ? Math.abs(totalSumaCalculata - invoiceTotalAmount) : null,
        differencePercent: invoiceTotalAmount ? ((Math.abs(totalSumaCalculata - invoiceTotalAmount) / invoiceTotalAmount) * 100).toFixed(1) : null
      }
    })
  } catch (error) {
    console.error('❌ Error checking invoice details:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/delete-electric-invoices
// Șterge facturi selectate din centralizator după număr factură
router.post('/delete-electric-invoices', authenticateToken, async (req, res) => {
  console.log('🗑️ DELETE INVOICES - Request body:', JSON.stringify(req.body))
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      console.error('❌ Database pool not available')
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { invoice_numbers } = req.body // Array de numere de facturi
    console.log('🗑️ invoice_numbers received:', invoice_numbers, 'type:', typeof invoice_numbers, 'isArray:', Array.isArray(invoice_numbers))

    if (!invoice_numbers || !Array.isArray(invoice_numbers) || invoice_numbers.length === 0) {
      console.error('❌ No invoices to delete')
      return res.status(400).json({ success: false, error: 'Selectează cel puțin o factură pentru ștergere' })
    }

    console.log(`🗑️ Ștergere ${invoice_numbers.length} facturi:`, invoice_numbers)

    // Șterge toate NLC-urile pentru facturile selectate
    const result = await pool.query(`
      DELETE FROM electric_invoices_nlc 
      WHERE numar_factura = ANY($1)
      RETURNING id, numar_factura, nlc_code
    `, [invoice_numbers])

    const totalDeleted = result.rowCount
    console.log(`✅ Total șterse: ${totalDeleted} înregistrări pentru ${invoice_numbers.length} facturi`)

    // Grupează ștersele pe factură pentru mesaj
    const deletedByInvoice = {}
    result.rows.forEach(row => {
      if (!deletedByInvoice[row.numar_factura]) {
        deletedByInvoice[row.numar_factura] = 0
      }
      deletedByInvoice[row.numar_factura]++
    })

    res.json({
      success: true,
      deleted_count: totalDeleted,
      invoices_deleted: invoice_numbers.length,
      deleted_by_invoice: deletedByInvoice,
      message: `${invoice_numbers.length} factură${invoice_numbers.length === 1 ? '' : 'i'} șterse (${totalDeleted} NLC-uri în total)`
    })
  } catch (error) {
    console.error('❌ Error deleting invoices:', error.message)
    console.error('❌ Stack:', error.stack)
    res.status(500).json({ success: false, error: error.message })
  }
})

// FALLBACK: Endpoint simplu de ștergere după NLC code direct (fără autentificare pentru test)
router.delete('/delete-nlc/:nlc_code', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { nlc_code } = req.params
    console.log(`🗑️ DELETE NLC direct: ${nlc_code}`)

    const result = await pool.query(
      'DELETE FROM electric_invoices_nlc WHERE nlc_code = $1 RETURNING id, nlc_code',
      [nlc_code]
    )

    res.json({
      success: true,
      deleted_count: result.rowCount,
      deleted: result.rows
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/save-electric-invoice
// Salvează factura electrică în tabelul expenditures_sync (DOAR după confirmarea utilizatorului)
// ACTUALIZAT: Salvează per NLC, împarte pe luni, calculează cost per slot
router.post('/save-electric-invoice', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { extractedData } = req.body
    const userId = req.user?.userId || req.user?.id

    if (!extractedData) {
      return res.status(400).json({ success: false, error: 'Datele extrase sunt necesare' })
    }

    const nlcData = extractedData.nlc_data || []
    const numarFactura = extractedData.numar_factura || 'N/A'
    const furnizor = extractedData.furnizor || 'Electrica'
    const pretGeneral = parseFloat(extractedData.pret_per_kwh) || null

    if (nlcData.length === 0) {
      return res.status(400).json({ success: false, error: 'Nu există NLC-uri de salvat' })
    }

    console.log(`\n🔌 SALVARE FACTURI ELECTRICE - ${nlcData.length} NLC-uri`)
    console.log(`   Număr factură: ${numarFactura}`)

    const savedRecords = []
    const errors = []

    // Pentru fiecare NLC
    for (const nlc of nlcData) {
      // FOLOSIM sumaTotala (activă + reactivă) în loc de suma (doar activă)
      // nlc.suma = energie activă, nlc.sumaTotala = total (activă + reactivă)
      const sumaDeUtilizat = nlc.sumaTotala || nlc.suma || 0

      if (!sumaDeUtilizat || sumaDeUtilizat <= 0) {
        console.log(`   ⏭️ Skip NLC ${nlc.nlc} - suma ${sumaDeUtilizat} RON (suma: ${nlc.suma}, sumaTotala: ${nlc.sumaTotala})`)
        continue
      }

      console.log(`   📊 NLC ${nlc.nlc}: folosim sumaTotala=${nlc.sumaTotala?.toFixed(2)}, suma_activa=${nlc.suma?.toFixed(2)}, suma_reactiva=${nlc.sumaReactiva?.toFixed(2)}`)

      const locationName = nlc.location || 'N/A'
      const normalizedLocation = normalizeLocationName(locationName)

      // Parsează perioada pentru a determina lunile și ÎMPĂRȚIREA PROPORȚIONALĂ
      let luniAcoperite = []

      // Funcție pentru a calcula zilele dintr-o lună acoperite de o perioadă
      const calculeazaZileInLuna = (startDate, endDate, luna, an) => {
        const primaDinLuna = new Date(an, luna - 1, 1)
        const ultimaDinLuna = new Date(an, luna, 0) // Ultima zi a lunii

        const inceputEfectiv = startDate > primaDinLuna ? startDate : primaDinLuna
        const sfarsitEfectiv = endDate < ultimaDinLuna ? endDate : ultimaDinLuna

        if (inceputEfectiv > sfarsitEfectiv) return 0

        // +1 pentru că includem și ziua de start
        return Math.floor((sfarsitEfectiv - inceputEfectiv) / (1000 * 60 * 60 * 24)) + 1
      }

      // FOLOSIM ÎNTOTDEAUNA perioada_facturare GENERALĂ din antetul facturii
      // nlc.period poate fi extras greșit din secțiunea individuală a fiecărui NLC
      const perioadaDeUtilizat = extractedData.perioada_facturare || nlc.period
      console.log(`      📅 Perioadă pentru NLC: folosim "${perioadaDeUtilizat}" (general: ${extractedData.perioada_facturare}, nlc: ${nlc.period})`)

      // Extragem perioada și calculăm proporții pe zile
      if (perioadaDeUtilizat) {
        const periodMatch = perioadaDeUtilizat.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/)
        if (periodMatch) {
          const startDate = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]))
          const endDate = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]))

          // Calculăm zilele totale
          const zileTotale = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

          // Pentru fiecare lună din perioadă
          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
          while (current <= endDate) {
            const luna = current.getMonth() + 1
            const an = current.getFullYear()
            const zileInLuna = calculeazaZileInLuna(startDate, endDate, luna, an)
            const proportie = zileTotale > 0 ? zileInLuna / zileTotale : 1

            luniAcoperite.push({
              luna: luna,
              an: an,
              dataExpenditure: `${an}-${String(luna).padStart(2, '0')}-01`,
              zile: zileInLuna,
              proportie: proportie
            })

            current.setMonth(current.getMonth() + 1)
          }

          console.log(`      📆 Perioadă: ${perioadaDeUtilizat} (${zileTotale} zile total)`)
        }
      }

      // Dacă tot nu avem luni, eroare
      if (luniAcoperite.length === 0) {
        // Ultimă încercare cu nlc.period (backup)
        const perioadaBackup = nlc.period || ''
        const perioadaBackupMatch = perioadaBackup.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/)
        if (perioadaBackupMatch) {
          const startDate = new Date(parseInt(perioadaBackupMatch[3]), parseInt(perioadaBackupMatch[2]) - 1, parseInt(perioadaBackupMatch[1]))
          const endDate = new Date(parseInt(perioadaBackupMatch[6]), parseInt(perioadaBackupMatch[5]) - 1, parseInt(perioadaBackupMatch[4]))
          const zileTotale = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
          while (current <= endDate) {
            const luna = current.getMonth() + 1
            const an = current.getFullYear()
            const zileInLuna = calculeazaZileInLuna(startDate, endDate, luna, an)
            const proportie = zileTotale > 0 ? zileInLuna / zileTotale : 1

            luniAcoperite.push({
              luna: luna,
              an: an,
              dataExpenditure: `${an}-${String(luna).padStart(2, '0')}-01`,
              zile: zileInLuna,
              proportie: proportie
            })
            current.setMonth(current.getMonth() + 1)
          }
          console.log(`      ⚠️ Folosit perioada_facturare generală: ${extractedData.perioada_facturare}`)
        } else {
          // EROARE: Nu avem perioadă de consum - nu salvăm!
          console.error(`      ❌ EROARE: Nu s-a găsit perioada de consum pentru NLC ${nlc.nlc}!`)
          errors.push({
            nlc: nlc.nlc,
            error: 'Nu s-a găsit perioada de consum - nu se poate salva fără perioadă!'
          })
          continue // Skip acest NLC - nu putem salva fără perioadă de consum
        }
      }

      console.log(`\n   📍 NLC ${nlc.nlc} (${normalizedLocation})`)
      console.log(`      Sumă TOTALĂ (activă+reactivă): ${sumaDeUtilizat.toFixed(2)} RON`)
      console.log(`      (Activă: ${nlc.suma?.toFixed(2) || 0}, Reactivă: ${nlc.sumaReactiva?.toFixed(2) || 0})`)
      console.log(`      Consum: ${nlc.consum || 0} kWh`)
      console.log(`      Luni acoperite: ${luniAcoperite.length}`)

      // Pentru fiecare lună - ÎMPĂRȚIRE PROPORȚIONALĂ PE ZILE
      for (const lunaInfo of luniAcoperite) {
        try {
          // Calculează suma și consumul PROPORȚIONAL pentru această lună
          // FOLOSIM sumaDeUtilizat (total) în loc de nlc.suma (doar activă)
          const sumaPerLuna = sumaDeUtilizat * lunaInfo.proportie
          const consumPerLuna = (nlc.consum || 0) * lunaInfo.proportie

          // Obține numărul de sloturi pentru această locație și lună
          let slotsCount = 0
          let costPerSlot = null
          let kwhPerSlot = null

          try {
            const slotsResult = await pool.query(`
              SELECT slots_count 
              FROM slots_monthly 
              WHERE LOWER(location_name) = LOWER($1)
                AND year = $2 
                AND month = $3
                AND slots_count > 0
              LIMIT 1
            `, [normalizedLocation, lunaInfo.an, lunaInfo.luna])

            if (slotsResult.rows.length > 0) {
              slotsCount = parseInt(slotsResult.rows[0].slots_count) || 0
              if (slotsCount > 0) {
                costPerSlot = sumaPerLuna / slotsCount
                kwhPerSlot = consumPerLuna / slotsCount
              }
            }
          } catch (dbError) {
            console.error(`      ⚠️ Eroare la obținerea sloturi pentru ${normalizedLocation}:`, dbError.message)
          }

          // Construiește descrierea cu toate detaliile
          const descriptionParts = [
            `Factură ${numarFactura}`,
            `NLC: ${nlc.nlc}`,
            `Perioadă: ${nlc.period || 'N/A'}`,
            `${lunaInfo.zile} zile (${(lunaInfo.proportie * 100).toFixed(1)}%)`,
            `Consum: ${consumPerLuna.toFixed(2)} kWh`,
            `Preț/kWh: ${(nlc.pretCalculat || pretGeneral || 0).toFixed(4)} lei`
          ]

          if (slotsCount > 0) {
            descriptionParts.push(`Sloturi: ${slotsCount}`)
            if (costPerSlot) descriptionParts.push(`Cost/slot: ${costPerSlot.toFixed(2)} lei`)
            if (kwhPerSlot) descriptionParts.push(`kWh/slot: ${kwhPerSlot.toFixed(2)}`)
          }

          // Verificare preț
          if (nlc.pretVerificare) {
            if (nlc.pretVerificare.esteCorect) {
              descriptionParts.push(`✓ Preț verificat OK`)
            } else {
              descriptionParts.push(`⚠️ Diferență preț: ${nlc.pretVerificare.diferentaPercent}%`)
            }
          }

          const description = descriptionParts.join(' | ')

          console.log(`      📅 ${lunaInfo.luna}/${lunaInfo.an}: ${sumaPerLuna.toFixed(2)} RON (${lunaInfo.zile} zile, ${(lunaInfo.proportie * 100).toFixed(1)}%), ${consumPerLuna.toFixed(2)} kWh`)
          if (slotsCount > 0) {
            console.log(`         → ${slotsCount} sloturi, cost/slot: ${costPerSlot?.toFixed(2) || 'N/A'} lei, kWh/slot: ${kwhPerSlot?.toFixed(2) || 'N/A'}`)
          }

          // Verifică dacă există deja o înregistrare identică (prevenire duplicat - verificare robustă)
          const existingCheck = await pool.query(`
            SELECT id FROM expenditures_sync 
            WHERE operational_date = $1 
              AND location_name = $2 
              AND department_name = 'Electricitate'
              AND (
                description LIKE '%NLC: ' || $3 || '%'
                OR description LIKE '%Factură ' || $4 || '%'
              )
              AND ABS(amount - $5) < 0.01
            LIMIT 1
          `, [lunaInfo.dataExpenditure, normalizedLocation, nlc.nlc, numarFactura, sumaPerLuna])

          if (existingCheck.rows.length > 0) {
            console.log(`      ⏭️ Există deja pentru ${lunaInfo.luna}/${lunaInfo.an} - skip duplicat (${sumaPerLuna.toFixed(2)} RON)`)
            continue
          }

          // Salvează în expenditures_sync
          const result = await pool.query(`
            INSERT INTO expenditures_sync (
              location_name,
              department_name,
              expenditure_type,
              amount,
              operational_date,
              description,
              data_source,
              created_by,
              synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id
          `, [
            normalizedLocation,
            'Electricitate',
            'Factură Reală',
            sumaPerLuna,
            lunaInfo.dataExpenditure,
            description,
            'electric_invoice',
            userId
          ])

          savedRecords.push({
            id: result.rows[0].id,
            nlc: nlc.nlc,
            location: normalizedLocation,
            luna: `${lunaInfo.luna}/${lunaInfo.an}`,
            suma: sumaPerLuna,
            consum: consumPerLuna,
            slotsCount,
            costPerSlot,
            kwhPerSlot
          })

        } catch (saveError) {
          console.error(`      ❌ Eroare la salvare:`, saveError.message)
          errors.push({
            nlc: nlc.nlc,
            luna: `${lunaInfo.luna}/${lunaInfo.an}`,
            error: saveError.message
          })
        }
      }
    }

    console.log(`\n✅ Salvare completă: ${savedRecords.length} înregistrări`)
    if (errors.length > 0) {
      console.log(`⚠️ Erori: ${errors.length}`)
    }

    res.json({
      success: true,
      message: `Salvate ${savedRecords.length} înregistrări (${nlcData.length} NLC-uri)`,
      saved: savedRecords,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('❌ Error saving electric invoice:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/transfer-electric-to-expenditures
// Transferă facturile electrice din centralizator în cheltuieli (pentru facturile care nu au fost salvate încă)
router.post('/transfer-electric-to-expenditures', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const userId = req.user?.userId || req.user?.id

    console.log('\n🔄 TRANSFER FACTURI ELECTRICE DIN CENTRALIZATOR ÎN CHELTUIELI')

    // Obține toate facturile din centralizator care NU au fost salvate în cheltuieli
    const unsavedInvoices = await pool.query(`
      SELECT * FROM electric_invoices_nlc
      WHERE saved_to_expenditures = false OR saved_to_expenditures IS NULL
      ORDER BY data_emiterii DESC, nlc_code
    `)

    if (unsavedInvoices.rows.length === 0) {
      return res.json({
        success: true,
        message: 'Toate facturile electrice sunt deja salvate în cheltuieli',
        transferred: 0,
        skipped: 0,
        errors: []
      })
    }

    console.log(`📊 Găsite ${unsavedInvoices.rows.length} facturi de transferat`)

    const transferred = []
    const skipped = []
    const errors = []

    // Pentru fiecare factură, o transformăm în formatul necesar pentru save-electric-invoice
    // Grupăm după număr factură pentru a procesa toate NLC-urile dintr-o factură odată
    const invoicesByNumber = {}
    unsavedInvoices.rows.forEach(invoice => {
      const numarFactura = invoice.numar_factura || 'N/A'
      if (!invoicesByNumber[numarFactura]) {
        invoicesByNumber[numarFactura] = []
      }
      invoicesByNumber[numarFactura].push(invoice)
    })

    console.log(`📋 Procesăm ${Object.keys(invoicesByNumber).length} facturi unice`)

    for (const [numarFactura, invoices] of Object.entries(invoicesByNumber)) {
      try {
        // Construim extractedData din facturile din centralizator
        const firstInvoice = invoices[0]

        // Parsează perioada de facturare
        const perioadaMatch = firstInvoice.perioada_facturare?.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/)
        if (!perioadaMatch) {
          console.log(`   ⚠️ Skip factura ${numarFactura} - perioadă invalidă: ${firstInvoice.perioada_facturare}`)
          skipped.push({ numarFactura, reason: 'Perioadă invalidă' })
          continue
        }

        // Extrage invoice_total_amount (suma extrasă direct din factură)
        const invoiceTotalAmount = firstInvoice.invoice_total_amount
          ? parseFloat(firstInvoice.invoice_total_amount)
          : null

        const extractedData = {
          numar_factura: numarFactura,
          furnizor: firstInvoice.furnizor || 'Electrica',
          perioada_facturare: firstInvoice.perioada_facturare,
          pret_per_kwh: firstInvoice.pret_per_kwh,
          tva: firstInvoice.tva || 19,
          suma_totala: invoiceTotalAmount, // Folosește suma extrasă din factură
          nlc_data: invoices.map(inv => ({
            nlc: inv.nlc_code,
            location: inv.location_name,
            period: inv.perioada_facturare,
            suma: inv.suma_activa || 0,
            sumaReactiva: inv.suma_reactiva || 0,
            sumaTotala: inv.suma_totala || (inv.suma_activa || 0) + (inv.suma_reactiva || 0),
            consum: inv.consum_kwh || 0,
            pretCalculat: inv.pret_per_kwh
          }))
        }

        // Folosim aceeași logică ca în save-electric-invoice
        const nlcData = extractedData.nlc_data || []

        // IMPORTANT: Folosim invoice_total_amount (suma extrasă direct din factură) dacă există
        // Altfel, calculăm din sumele NLC-urilor (pentru facturile vechi)
        const totalSumaFactura = invoiceTotalAmount && invoiceTotalAmount > 0
          ? invoiceTotalAmount
          : nlcData.reduce((sum, nlc) => sum + (parseFloat(nlc.sumaTotala || nlc.suma || 0)), 0)

        // Calculează consumul total pentru distribuția proporțională
        const totalConsumFactura = nlcData.reduce((sum, nlc) => sum + (parseFloat(nlc.consum || 0)), 0)
        const normalizedLocation = (locationName) => {
          if (!locationName) return 'N/A'
          return String(locationName).trim()
        }

        let savedCount = 0

        for (const nlc of nlcData) {
          const consumKwh = parseFloat(nlc.consum || 0)

          // Distribuie suma facturii proporțional pe baza consumului
          let sumaDeUtilizat = 0
          if (totalConsumFactura > 0 && consumKwh > 0) {
            // Distribuie proporțional pe baza consumului
            sumaDeUtilizat = totalSumaFactura * (consumKwh / totalConsumFactura)
          } else if (nlcData.length > 0) {
            // Dacă nu avem consum, distribuie egal pe NLC-uri
            sumaDeUtilizat = totalSumaFactura / nlcData.length
          } else {
            // Fallback: folosește suma individuală a NLC-ului
            sumaDeUtilizat = parseFloat(nlc.sumaTotala || nlc.suma || 0)
          }

          if (!sumaDeUtilizat || sumaDeUtilizat <= 0) {
            continue
          }

          const locationName = nlc.location || 'N/A'
          const normalizedLoc = normalizedLocation(locationName)

          // Parsează perioada pentru a determina lunile
          const periodMatch = extractedData.perioada_facturare?.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})/)
          if (!periodMatch) continue

          const startDate = new Date(parseInt(periodMatch[3]), parseInt(periodMatch[2]) - 1, parseInt(periodMatch[1]))
          const endDate = new Date(parseInt(periodMatch[6]), parseInt(periodMatch[5]) - 1, parseInt(periodMatch[4]))

          const zileTotale = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

          // Calculează luni acoperite
          const luniAcoperite = []
          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)

          while (current <= endDate) {
            const luna = current.getMonth() + 1
            const an = current.getFullYear()
            const primaDinLuna = new Date(an, luna - 1, 1)
            const ultimaDinLuna = new Date(an, luna, 0)
            const inceputEfectiv = startDate > primaDinLuna ? startDate : primaDinLuna
            const sfarsitEfectiv = endDate < ultimaDinLuna ? endDate : ultimaDinLuna

            if (inceputEfectiv <= sfarsitEfectiv) {
              const zileInLuna = Math.floor((sfarsitEfectiv - inceputEfectiv) / (1000 * 60 * 60 * 24)) + 1
              const proportie = zileTotale > 0 ? zileInLuna / zileTotale : 1

              luniAcoperite.push({
                luna: luna,
                an: an,
                dataExpenditure: `${an}-${String(luna).padStart(2, '0')}-01`,
                zile: zileInLuna,
                proportie: proportie
              })
            }

            current.setMonth(current.getMonth() + 1)
          }

          // Salvează pentru fiecare lună
          for (const lunaInfo of luniAcoperite) {
            try {
              const sumaPerLuna = sumaDeUtilizat * lunaInfo.proportie
              const consumPerLuna = consumKwh * lunaInfo.proportie

              // Verifică dacă există deja (verificare robustă pentru a preveni duplicatele)
              const existingCheck = await pool.query(`
                SELECT id FROM expenditures_sync 
                WHERE operational_date = $1 
                  AND location_name = $2 
                  AND department_name = 'Electricitate'
                  AND (
                    description LIKE '%NLC: ' || $3 || '%'
                    OR description LIKE '%Factură ' || $4 || '%'
                  )
                  AND ABS(amount - $5) < 0.01
                LIMIT 1
              `, [lunaInfo.dataExpenditure, normalizedLoc, nlc.nlc, numarFactura, sumaPerLuna])

              if (existingCheck.rows.length > 0) {
                console.log(`   ⏭️ Skip duplicat: ${lunaInfo.luna}/${lunaInfo.an} - ${normalizedLoc} - NLC ${nlc.nlc} (${sumaPerLuna.toFixed(2)} RON)`)
                continue
              }

              const description = `Factură ${numarFactura} | NLC: ${nlc.nlc} | Perioadă: ${extractedData.perioada_facturare} | ${lunaInfo.zile} zile (${(lunaInfo.proportie * 100).toFixed(1)}%) | Consum: ${consumPerLuna.toFixed(2)} kWh`

              await pool.query(`
                INSERT INTO expenditures_sync (
                  location_name,
                  department_name,
                  expenditure_type,
                  amount,
                  operational_date,
                  description,
                  data_source,
                  created_by,
                  synced_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id
              `, [
                normalizedLoc,
                'Electricitate',
                'Factură Reală',
                sumaPerLuna,
                lunaInfo.dataExpenditure,
                description,
                'electric_invoice',
                userId
              ])

              savedCount++
            } catch (saveError) {
              console.error(`   ❌ Eroare la salvare pentru ${lunaInfo.luna}/${lunaInfo.an}:`, saveError.message)
            }
          }
        }

        // Marchează facturile ca salvate în cheltuieli
        await pool.query(`
          UPDATE electric_invoices_nlc
          SET saved_to_expenditures = true
          WHERE numar_factura = $1
        `, [numarFactura])

        transferred.push({ numarFactura, savedCount })
        console.log(`   ✅ Factura ${numarFactura}: ${savedCount} înregistrări salvate`)

      } catch (error) {
        console.error(`   ❌ Eroare la procesarea facturii ${numarFactura}:`, error.message)
        errors.push({ numarFactura, error: error.message })
      }
    }

    const totalTransferred = transferred.reduce((sum, t) => sum + t.savedCount, 0)

    console.log(`\n✅ Transfer complet: ${totalTransferred} înregistrări salvate din ${transferred.length} facturi`)

    res.json({
      success: true,
      message: `Transferate ${totalTransferred} înregistrări din ${transferred.length} facturi în cheltuieli`,
      transferred: totalTransferred,
      invoices: transferred.length,
      skipped: skipped.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('❌ Error transferring electric invoices:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/export-electric-to-sheet
// Exportă datele extrase într-un model Excel cu calcul kWh/slot din slots_monthly
router.post('/export-electric-to-sheet', authenticateToken, async (req, res) => {
  console.log('\n📤 EXPORT ELECTRIC TO EXCEL')
  try {
    const { extractedData } = req.body

    console.log('📋 Received extractedData:', JSON.stringify(extractedData, null, 2).substring(0, 500))

    if (!extractedData) {
      console.log('❌ No extractedData provided')
      return res.status(400).json({ success: false, error: 'Datele extrase sunt necesare' })
    }

    const pool = req.app.get('pool')
    if (!pool) {
      console.log('❌ No pool available')
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    console.log('📦 Importing XLSX...')
    // Import XLSX pentru generare Excel
    const XLSX = (await import('xlsx')).default
    console.log('✅ XLSX imported')

    // Extrage datele necesare
    const locationName = extractedData.location_name || extractedData.location || ''
    const consumKwh = parseFloat(extractedData.consum_kwh || extractedData.consum || 0)
    const numarFactura = extractedData.numar_factura || extractedData.factura || ''
    const perioadaFacturare = extractedData.perioada_facturare || extractedData.perioada || ''

    // Extrage anul și luna din perioada_facturare sau data_emiterii
    let year = null
    let month = null

    if (perioadaFacturare) {
      // Format: "01.11.2024 - 30.11.2024" sau "01/11/2024 - 30/11/2024"
      const dateMatch = perioadaFacturare.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
      if (dateMatch) {
        month = parseInt(dateMatch[2])
        year = parseInt(dateMatch[3])
      }
    }

    if (!year || !month) {
      // Încearcă din data_emiterii
      const dataEmiterii = extractedData.data_emiterii || extractedData.data || ''
      if (dataEmiterii) {
        const date = new Date(dataEmiterii)
        if (!isNaN(date.getTime())) {
          year = date.getFullYear()
          month = date.getMonth() + 1
        }
      }
    }

    // Dacă încă nu avem an/lună, folosim data curentă
    if (!year || !month) {
      const now = new Date()
      year = year || now.getFullYear()
      month = month || now.getMonth() + 1
    }

    // Calculează kWh/slot din slots_monthly
    let kwhPerSlot = null
    let slotsCount = null

    if (locationName && year && month) {
      try {
        // Query pentru slots_count din slots_monthly
        const result = await pool.query(`
          SELECT slots_count
          FROM slots_monthly
          WHERE location_name = $1
            AND year = $2
            AND month = $3
            AND slots_count > 0
          LIMIT 1
        `, [locationName, year, month])

        if (result.rows.length > 0) {
          slotsCount = parseInt(result.rows[0].slots_count) || 0
          if (slotsCount > 0 && consumKwh > 0) {
            kwhPerSlot = (consumKwh / slotsCount).toFixed(2)
          }
        }
      } catch (dbError) {
        console.error('❌ Error querying slots_monthly:', dbError)
      }
    }

    // Construiește textul pentru coloana Explanation
    const explanationParts = []
    if (numarFactura) {
      explanationParts.push(`Factură: ${numarFactura}`)
    }
    if (perioadaFacturare) {
      explanationParts.push(`Perioadă: ${perioadaFacturare}`)
    }
    if (kwhPerSlot !== null) {
      explanationParts.push(`kWh/slot: ${kwhPerSlot}`)
    }
    const explanation = explanationParts.join(' | ')

    // Creează workbook Excel
    const workbook = XLSX.utils.book_new()

    // FOAIE 1: Rezumat factură
    const summaryData = [
      ['REZUMAT FACTURĂ ELECTRICĂ'],
      [],
      ['Număr Factură', extractedData.numar_factura || 'N/A'],
      ['Data Emiterii', extractedData.data_emiterii || 'N/A'],
      ['Data Scadentă', extractedData.data_scadenta || 'N/A'],
      ['Perioadă Facturare', perioadaFacturare || 'N/A'],
      ['Furnizor', extractedData.furnizor || 'N/A'],
      [],
      ['TOTALURI'],
      ['Sumă Totală', `${extractedData.suma_totala || 0} RON`],
      ['Consum Total', `${extractedData.consum_kwh || 0} kWh`],
      ['Preț/kWh (general)', `${extractedData.pret_per_kwh || 'N/A'} lei/kWh`],
      ['TVA', `${extractedData.tva || 19}%`],
      [],
      ['STATISTICI'],
      ['Nr. sloturi', slotsCount || 'N/A'],
      ['kWh/slot', kwhPerSlot || 'N/A'],
      ['Cost/slot', slotsCount && extractedData.suma_totala ? `${(parseFloat(extractedData.suma_totala) / slotsCount).toFixed(2)} RON` : 'N/A']
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Rezumat')

    // FOAIE 2: Detalii NLC-uri
    const nlcData = extractedData.nlc_data || []
    if (nlcData.length > 0) {
      const nlcSheetData = [
        ['NLC', 'Locație', 'Sumă (RON)', 'Consum (kWh)', 'Preț/kWh', 'Perioadă', 'Verificare Preț']
      ]

      let totalSum = 0
      let totalConsum = 0

      for (const nlc of nlcData) {
        try {
          const suma = parseFloat(nlc.suma) || 0
          const consum = parseFloat(nlc.consum) || 0
          let pret = 'N/A'
          if (nlc.pretCalculat && typeof nlc.pretCalculat === 'number') {
            pret = nlc.pretCalculat.toFixed(4)
          } else if (consum > 0 && suma > 0) {
            pret = (suma / consum).toFixed(4)
          }

          let verificare = '-'
          if (nlc.pretVerificare && typeof nlc.pretVerificare === 'object') {
            verificare = nlc.pretVerificare.esteCorect
              ? `OK (${nlc.pretVerificare.diferentaPercent || '0'}%)`
              : `Dif ${nlc.pretVerificare.diferentaPercent || '?'}%`
          }

          nlcSheetData.push([
            String(nlc.nlc || 'N/A'),
            String(nlc.location || 'N/A'),
            suma.toFixed(2),
            consum.toFixed(2),
            String(pret),
            String(nlc.period || 'N/A'),
            String(verificare)
          ])

          totalSum += suma
          totalConsum += consum
        } catch (nlcError) {
          console.error('Error processing NLC:', nlc, nlcError)
        }
      }

      // Rând TOTAL
      nlcSheetData.push([])
      nlcSheetData.push(['TOTAL', '', totalSum.toFixed(2), totalConsum.toFixed(2), '', '', ''])

      const nlcSheet = XLSX.utils.aoa_to_sheet(nlcSheetData)
      nlcSheet['!cols'] = [
        { wch: 15 }, // NLC
        { wch: 20 }, // Locație
        { wch: 15 }, // Sumă
        { wch: 15 }, // Consum
        { wch: 12 }, // Preț
        { wch: 25 }, // Perioadă
        { wch: 20 }  // Verificare
      ]
      XLSX.utils.book_append_sheet(workbook, nlcSheet, 'NLC-uri')
    }

    // FOAIE 3: Explanation (pentru import în alte sisteme)
    const explanationSheet = XLSX.utils.aoa_to_sheet([
      ['Explanation'],
      [explanation]
    ])
    XLSX.utils.book_append_sheet(workbook, explanationSheet, 'Explanation')

    console.log('📊 Creating Excel buffer...')
    // Generează buffer Excel
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    })

    console.log(`✅ Excel buffer created, size: ${excelBuffer.length} bytes`)

    // Setează headers pentru download Excel
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Factura_Electrica_${new Date().toISOString().split('T')[0]}.xlsx"`)

    console.log('📤 Sending Excel file...')
    res.send(excelBuffer)
    console.log('✅ Export complete!')
  } catch (error) {
    console.error('❌ Error exporting to Excel:', error)
    console.error('Stack:', error.stack)
    res.status(500).json({ success: false, error: error.message || 'Eroare la export' })
  }
})

// ==================== SLOTS MONTHLY ENDPOINTS ====================
// Folosesc EXACT aceeași logică ca în /api/incasari/slots-by-month-location

// Helper function pentru normalizarea numelor de locații (EXACT ca în incasari.js)
// Folosește doar logica simplă de eliminare E.S, restul se face prin locations.json
const normalizeLocationName = (name) => {
  if (!name) return ''
  let n = name.toString().trim()
  // Elimină sufixe de tip E.S / E.S. / ES
  n = n.replace(/\s+E\.?S\.?$/i, '')
  return n.trim()
}

// Helper function pentru a încărca datele din locations (similar cu incasari.js)
const loadLocationsData = async (pool) => {
  try {
    // Încearcă să încarce din tabelul locations din baza de date
    const result = await pool.query(`
      SELECT id, name 
      FROM locations 
      WHERE name IS NOT NULL 
      ORDER BY name
    `)

    if (result.rows.length > 0) {
      return result.rows.map(row => ({
        id: row.id,
        name: row.name
      }))
    }

    // Fallback: încarcă din JSON (dacă există)
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const { dirname } = await import('path')

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const filePath = path.join(__dirname, '..', 'cyber-data', 'locations.json')

    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      return data
    }

    return []
  } catch (error) {
    console.error('Error loading locations:', error)
    return []
  }
}

// GET /api/expenditures/slots-monthly
// Returnează datele din slots_monthly cu filtrare
router.get('/slots-monthly', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { location, year, month, search } = req.query

    let query = `
      SELECT 
        sm.id,
        sm.location_name,
        sm.year,
        sm.month,
        sm.slots_count,
        sm.source,
        sm.notes,
        sm.created_at,
        sm.updated_at,
        COALESCE(u.full_name, u.username) as created_by_name,
        COALESCE(u2.full_name, u2.username) as updated_by_name
      FROM slots_monthly sm
      LEFT JOIN users u ON sm.created_by = u.id
      LEFT JOIN users u2 ON sm.updated_by = u2.id
      WHERE 1=1
    `
    const params = []
    let paramIndex = 1

    if (location && location !== 'all' && location !== 'Toate locațiile') {
      query += ` AND sm.location_name = $${paramIndex}`
      params.push(location)
      paramIndex++
    }

    if (year) {
      query += ` AND sm.year = $${paramIndex}`
      params.push(parseInt(year))
      paramIndex++
    }

    if (month && month !== 'all' && month !== 'Toate lunile') {
      query += ` AND sm.month = $${paramIndex}`
      params.push(parseInt(month))
      paramIndex++
    }

    if (search) {
      query += ` AND (
        sm.location_name ILIKE $${paramIndex} OR
        sm.notes ILIKE $${paramIndex}
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    query += ` ORDER BY sm.year DESC, sm.month DESC, sm.location_name ASC`

    const result = await pool.query(query, params)

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('❌ Error fetching slots-monthly:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/expenditures/slots-monthly/summary
// Returnează date agregate pentru tabelul centralizator pentru toți anii disponibili (2024, 2025, etc.)
router.get('/slots-monthly/summary', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Obține toți anii disponibili din slots_monthly ȘI incasari_daily (minim 2024)
    const yearsResult = await pool.query(`
      SELECT DISTINCT year FROM (
        SELECT year FROM slots_monthly WHERE year >= 2024
        UNION
        SELECT EXTRACT(YEAR FROM audit_date)::INTEGER as year FROM incasari_daily WHERE audit_date >= '2024-01-01'
      ) as combined_years
      ORDER BY year ASC
    `)

    let availableYears = yearsResult.rows.map(row => row.year)
    if (availableYears.length === 0) {
      availableYears = [2024, 2025, 2026] // Fallback
    }

    // Ensure 2026 is present if current date suggests it
    const currentYear = new Date().getFullYear()
    if (!availableYears.includes(currentYear)) availableYears.push(currentYear)
    if (!availableYears.includes(currentYear + 1)) availableYears.push(currentYear + 1)

    // De-duplicate and sort
    availableYears = [...new Set(availableYears)].sort((a, b) => a - b)

    // Folosește locations.json pentru mapping (EXACT ca în incasari.js)
    const locationsData = loadExportedData('locations.json')
    const locationMap = new Map()
    locationsData.forEach((loc) => {
      if (loc && typeof loc.id !== 'undefined') {
        const locationName = normalizeLocationName(loc.name || loc.location || `Loc ${loc.id}`)
        // Exclude "Depozit" din tabel
        if (locationName.toLowerCase() !== 'depozit') {
          locationMap.set(String(loc.id), locationName)
        }
      }
    })

    // Obține toate locațiile unice (normalizate)
    const allLocationNames = new Set()
    locationMap.forEach((name) => {
      if (name.toLowerCase() !== 'depozit') {
        allLocationNames.add(name)
      }
    })
    const sortedLocationNames = Array.from(allLocationNames).sort()

    // Construiește structura de date: an -> lună -> locație -> count
    // Folosește datele din slots_monthly (care includ și modificările manuale)
    const allData = {}

    for (const year of availableYears) {
      // Inițializează structura pentru acest an
      allData[year] = {}

      // Obține datele din slots_monthly pentru acest an (inclusiv cele editate manual)
      // 1. Întotdeauna calculăm mai întâi din incasari_daily (date automate)
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      const sql = `
        SELECT 
          EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
          location_id,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND location_id IS NOT NULL
          AND serial_number IS NOT NULL
          AND serial_number != ''
        GROUP BY EXTRACT(MONTH FROM audit_date), location_id
        ORDER BY month, location_id
      `

      const calculatedResult = await pool.query(sql, [startDate, endDate])

      // Populează cu datele calculate automat
      calculatedResult.rows.forEach(row => {
        const month = row.month
        const locationId = String(row.location_id || '')
        const locationName = locationMap.get(locationId)

        if (month && locationName && locationName.toLowerCase() !== 'depozit') {
          if (!allData[year][month]) {
            allData[year][month] = {}
          }
          allData[year][month][locationName] = Number(row.slots_count || 0)
        }
      })

      // 2. Suprapunem datele din slots_monthly (modificări manuale sau salvate explicit)
      const slotsMonthlyResult = await pool.query(`
        SELECT 
          month,
          location_name,
          slots_count
        FROM slots_monthly
        WHERE year = $1
          AND location_name IS NOT NULL
          AND location_name != ''
          AND LOWER(location_name) != 'depozit'
        ORDER BY month, location_name
      `, [year])

      slotsMonthlyResult.rows.forEach(row => {
        const month = row.month
        const locationName = row.location_name

        if (month && locationName && locationName.toLowerCase() !== 'depozit') {
          if (!allData[year][month]) {
            allData[year][month] = {}
          }
          // Aici SUPRA-SCRIEM valoarea cu cea din slots_monthly, deoarece este considerată "corecție manuală" sau "sursă de adevăr"
          allData[year][month][locationName] = Number(row.slots_count || 0)
        }
      })
    }

    res.json({
      success: true,
      years: availableYears,
      locations: sortedLocationNames,
      data: allData
    })
  } catch (error) {
    console.error('❌ Error in /api/expenditures/slots-monthly/summary:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/expenditures/slots-monthly/years
// Returnează anii disponibili din slots_monthly
router.get('/slots-monthly/years', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(`
      SELECT DISTINCT year
      FROM slots_monthly
      WHERE year >= 2024
      ORDER BY year ASC
    `)

    const years = result.rows.map(row => row.year)

    // Dacă nu există date, returnează anii default
    if (years.length === 0) {
      const currentYear = new Date().getFullYear()
      years.push(2024, 2025)
      if (currentYear >= 2026) {
        years.push(2026)
      }
    }

    res.json({
      success: true,
      years
    })
  } catch (error) {
    console.error('❌ Error in /api/expenditures/slots-monthly/years:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/slots-monthly/sync-from-incasari
// Sincronizează datele din incasari_daily în slots_monthly folosind EXACT aceeași logică
router.post('/slots-monthly/sync-from-incasari', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { onlyNew = true } = req.body
    const userId = req.user?.userId || req.user?.id

    console.log(`🔄 [slots-monthly/sync] Starting sync from incasari_daily (onlyNew: ${onlyNew})`)

    // Folosește EXACT aceeași logică ca în /api/incasari/slots-by-month-location
    // Numără serial_number distincte (1 serial = 1 slot) grupate pe lună și locație
    const sql = `
      SELECT 
        EXTRACT(YEAR FROM audit_date)::INTEGER AS year,
        EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
        location_id,
        COUNT(DISTINCT serial_number) AS slots_count
      FROM incasari_daily
      WHERE location_id IS NOT NULL
        AND serial_number IS NOT NULL
        AND serial_number != ''
      GROUP BY EXTRACT(YEAR FROM audit_date), EXTRACT(MONTH FROM audit_date), location_id
      ORDER BY year, month, location_id
    `

    const result = await pool.query(sql)
    console.log(`📊 [slots-monthly/sync] Găsite ${result.rows.length} rânduri în incasari_daily`)

    // Folosește locations.json pentru mapping (EXACT ca în incasari.js)
    const locationsData = loadExportedData('locations.json')
    const locationMap = new Map()
    locationsData.forEach((loc) => {
      if (loc && typeof loc.id !== 'undefined') {
        const locationName = normalizeLocationName(loc.name || loc.location || `Loc ${loc.id}`)
        // Exclude "Depozit" din tabel
        if (locationName.toLowerCase() !== 'depozit') {
          locationMap.set(String(loc.id), locationName)
        }
      }
    })

    // Debug: verifică dacă există date pentru Craiova
    const craiovaLocationIds = []
    locationMap.forEach((name, id) => {
      if (name === 'Craiova') {
        craiovaLocationIds.push(id)
      }
    })
    console.log(`🔍 [slots-monthly/sync] Location IDs pentru Craiova:`, craiovaLocationIds)

    const craiovaRows = result.rows.filter(r => craiovaLocationIds.includes(String(r.location_id)))
    console.log(`🔍 [slots-monthly/sync] Rânduri pentru Craiova (după mapping): ${craiovaRows.length}`)
    if (craiovaRows.length > 0) {
      console.log(`🔍 [slots-monthly/sync] Primele 3 rânduri Craiova:`, craiovaRows.slice(0, 3))
    } else {
      // Verifică ce locații sunt găsite
      const uniqueLocationIds = [...new Set(result.rows.map(r => String(r.location_id)))]
      console.log(`🔍 [slots-monthly/sync] Location IDs găsite:`, uniqueLocationIds.slice(0, 10))

      // Verifică dacă există date în incasari_daily pentru locații care conțin "craiova"
      const debugQuery = `
        SELECT DISTINCT l.id, l.name, COUNT(DISTINCT id.serial_number) as slots_count
        FROM incasari_daily id
        INNER JOIN locations l ON id.location_id = l.id
        WHERE LOWER(l.name) LIKE '%craiova%'
          AND id.serial_number IS NOT NULL
          AND id.serial_number != ''
        GROUP BY l.id, l.name
        LIMIT 10
      `
      const debugResult = await pool.query(debugQuery)
      console.log(`🔍 [slots-monthly/sync] Debug - Locații cu "craiova" în nume:`, debugResult.rows)
    }

    // Procesează rândurile și normalizează numele locațiilor
    const processedRows = []
    result.rows.forEach(row => {
      const locationId = String(row.location_id || '')
      const locationName = locationMap.get(locationId)

      if (locationName && locationName.toLowerCase() !== 'depozit') {
        processedRows.push({
          year: row.year,
          month: row.month,
          location_name: locationName,
          slots_count: Number(row.slots_count || 0)
        })
      }
    })

    console.log(`📊 [slots-monthly/sync] După procesare: ${processedRows.length} rânduri`)

    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const row of processedRows) {
      try {
        const { year, month, location_name, slots_count } = row

        // Verifică dacă există deja
        const existing = await pool.query(
          `SELECT id, slots_count, source FROM slots_monthly 
           WHERE year = $1 AND month = $2 AND location_name = $3`,
          [year, month, location_name]
        )

        if (existing.rows.length > 0) {
          const existingRecord = existing.rows[0]

          // Dacă onlyNew = true, actualizează doar dacă:
          // 1. slots_count este 0 (date lipsă)
          // 2. slots_count este diferit (date greșite)
          // 3. source nu este 'edited' (nu suprascriem date editate manual)
          if (onlyNew) {
            if (existingRecord.source === 'edited') {
              skipped++
              continue
            }

            if (existingRecord.slots_count === 0 || existingRecord.slots_count !== slots_count) {
              await pool.query(
                `UPDATE slots_monthly 
                 SET slots_count = $1, source = 'cyber', updated_at = NOW(), updated_by = $2
                 WHERE id = $3`,
                [slots_count, userId, existingRecord.id]
              )
              updated++
              console.log(`✅ [slots-monthly/sync] Updated: ${location_name} ${year}-${month}: ${existingRecord.slots_count} -> ${slots_count}`)
            } else {
              skipped++
            }
          } else {
            // Dacă onlyNew = false, actualizează întotdeauna (dar nu suprascriem 'edited')
            if (existingRecord.source !== 'edited') {
              await pool.query(
                `UPDATE slots_monthly 
                 SET slots_count = $1, source = 'cyber', updated_at = NOW(), updated_by = $2
                 WHERE id = $3`,
                [slots_count, userId, existingRecord.id]
              )
              updated++
            } else {
              skipped++
            }
          }
        } else {
          // Inserare nouă
          await pool.query(
            `INSERT INTO slots_monthly (year, month, location_name, slots_count, source, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'cyber', $5, NOW(), NOW())`,
            [year, month, location_name, slots_count, userId]
          )
          inserted++
          console.log(`✅ [slots-monthly/sync] Inserted: ${location_name} ${year}-${month}: ${slots_count} sloturi`)
        }
      } catch (error) {
        console.error(`❌ [slots-monthly/sync] Error processing ${row.location_name} ${row.year}-${row.month}:`, error)
      }
    }

    console.log(`✅ [slots-monthly/sync] Sync complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped`)

    res.json({
      success: true,
      message: `Sincronizare completă: ${inserted} noi, ${updated} actualizate, ${skipped} omise`,
      inserted,
      updated,
      skipped,
      total: result.rows.length
    })
  } catch (error) {
    console.error('❌ Error syncing slots-monthly from incasari_daily:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/expenditures/slots-monthly
// Creează sau actualizează o înregistrare în slots_monthly
router.post('/slots-monthly', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { year, month, location_name, slots_count, notes } = req.body
    const userId = req.user?.userId || req.user?.id

    if (!year || !month || !location_name || slots_count === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Verifică dacă există deja
    const existing = await pool.query(
      `SELECT id FROM slots_monthly 
       WHERE year = $1 AND month = $2 AND location_name = $3`,
      [year, month, location_name]
    )

    if (existing.rows.length > 0) {
      // Actualizează
      const result = await pool.query(
        `UPDATE slots_monthly 
         SET slots_count = $1, notes = $2, source = 'edited', updated_at = NOW(), updated_by = $3
         WHERE id = $4
         RETURNING *`,
        [slots_count, notes || null, userId, existing.rows[0].id]
      )
      res.json({ success: true, data: result.rows[0] })
    } else {
      // Creează nou
      const result = await pool.query(
        `INSERT INTO slots_monthly (year, month, location_name, slots_count, notes, source, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'edited', $6, NOW(), NOW())
         RETURNING *`,
        [year, month, location_name, slots_count, notes || null, userId]
      )
      res.json({ success: true, data: result.rows[0] })
    }
  } catch (error) {
    console.error('❌ Error creating/updating slots-monthly:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/expenditures/slots-monthly/:id
// Actualizează o înregistrare existentă
router.put('/slots-monthly/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { id } = req.params
    const { slots_count, notes } = req.body
    const userId = req.user?.userId || req.user?.id

    if (slots_count === undefined) {
      return res.status(400).json({ success: false, error: 'slots_count is required' })
    }

    const result = await pool.query(
      `UPDATE slots_monthly 
       SET slots_count = $1, notes = $2, source = 'edited', updated_at = NOW(), updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [slots_count, notes || null, userId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('❌ Error updating slots-monthly:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/expenditures/slots-monthly/:id
// Șterge o înregistrare
router.delete('/slots-monthly/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { id } = req.params

    const result = await pool.query(
      `DELETE FROM slots_monthly WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' })
    }

    res.json({ success: true, message: 'Record deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting slots-monthly:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/expenditures/slots-monthly/cleanup-old
// Șterge toate înregistrările dinainte de 2024
router.delete('/slots-monthly/cleanup-old', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const result = await pool.query(
      `DELETE FROM slots_monthly WHERE year < 2024 RETURNING id, year, month, location_name`
    )

    console.log(`🗑️ [slots-monthly/cleanup-old] Șterse ${result.rowCount} înregistrări dinainte de 2024`)

    res.json({
      success: true,
      message: `Șterse ${result.rowCount} înregistrări dinainte de 2024`,
      deletedCount: result.rowCount
    })
  } catch (error) {
    console.error('❌ Error cleaning up old slots-monthly:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router

