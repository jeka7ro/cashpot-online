import express from 'express'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import { fileURLToPath } from 'url'
import { authenticateToken } from '../middleware/auth.js'
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

const router = express.Router()
const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Config MariaDB Cyber (la fel ca în import-incasari-from-cyber.js)
const CYBER_CONFIG = {
  host: process.env.CYBER_DB_HOST || '161.97.133.165',
  port: Number(process.env.CYBER_DB_PORT || 3306),
  user: process.env.CYBER_DB_USER || 'eugen',
  password: process.env.CYBER_DB_PASSWORD || '(@Ee0wRHVohZww33',
  database: process.env.CYBER_DB_NAME || 'cyberslot_dbn'
}

let cyberPool = null
const getCyberPool = async () => {
  if (cyberPool) return cyberPool
  cyberPool = mysql.createPool({
    ...CYBER_CONFIG,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  })
  console.log('✅ [INCASARI] Pool MariaDB (Cyber) creat pentru debug/compare')
  return cyberPool
}

// JSON fallback loader (la fel ca în routes/cyber.js)
const loadExportedData = (filename) => {
  try {
    const filePath = path.join(__dirname, '..', 'cyber-data', filename)
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      console.log(`✅ [INCASARI] Loaded ${data.length} items from ${filename} (fallback JSON)`)
      return data
    }
  } catch (error) {
    console.error(`[INCASARI] Error loading ${filename}:`, error.message)
  }
  return []
}

// Helper: normalizează numele de locație (ex: „Craiova E.S” → „Craiova”)
const normalizeLocationName = (name) => {
  if (!name) return ''
  let n = name.toString().trim()
  // Elimină sufixe de tip E.S / E.S. / ES / E.S / E.S. (cu sau fără puncte, cu sau fără spații)
  n = n.replace(/\s*E\.?\s*S\.?\s*$/i, '')
  // Elimină și alte variante posibile
  n = n.replace(/\s*ES\s*$/i, '')

  // ROBUST: Lowercase and strip accents to match Expenditures logic
  n = n.replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  return n.trim()
}

// Cache pentru lista de sloturi din slots.json
// IMPORTANT: momentan NU mai filtrăm pe "active", ca să putem replica exact
// valorile din Cyber (inclusiv locații fără sloturi marcate ca active).
let activeSlotsCache = null

const getActiveSlots = () => {
  if (activeSlotsCache) return activeSlotsCache

  try {
    const slotsData = loadExportedData('slots.json')
    const all = []

    if (Array.isArray(slotsData)) {
      slotsData.forEach((slot) => {
        if (!slot || typeof slot.id === 'undefined') return
        all.push(slot)
      })
    } else {
      console.warn('⚠️ [INCASARI] slots.json nu este un array, folosim array gol')
    }

    activeSlotsCache = all
    console.log(
      `✅ [INCASARI] Loaded ${activeSlotsCache.length} slots (TOATE statusurile) pentru analize încasări`
    )
    return activeSlotsCache
  } catch (error) {
    console.error('❌ [INCASARI] Eroare la încărcarea slots.json:', error)
    activeSlotsCache = []
    return []
  }
}

// Sloturi ACTIVE (după status) pentru număr de aparate unice
// Folosit DOAR pentru numărătoare (card "Număr sloturi", coloana "Sloturi"),
// nu și pentru sume (IN/OUT/GGR) ca să nu stricăm egalitatea cu Cyber.
const getActiveMachineIdsForCounts = ({ includeLocations } = {}) => {
  const slots = getActiveSlots()
  const allowedLocations =
    Array.isArray(includeLocations) && includeLocations.length > 0
      ? new Set(includeLocations.map((loc) => normalizeLocationName(loc)))
      : null

  const filtered = slots.filter((slot) => {
    if (!slot || typeof slot.id === 'undefined') return false

    const rawStatus = (slot.status || '').toString().toLowerCase().trim()

    // Excludem explicit statusuri care conțin "inactiv"
    if (rawStatus.includes('inactiv')) return false

    // Considerăm active statusurile care conțin "activ" sau "active"
    if (!rawStatus.includes('activ')) return false

    const slotLocation = slot.location || ''
    const normalizedSlotLocation = normalizeLocationName(slotLocation)
    if (allowedLocations && !allowedLocations.has(normalizedSlotLocation)) return false
    return true
  })

  return filtered
    .map((slot) => Number(slot.id))
    .filter((id) => Number.isFinite(id))
}

// --- NEW ENDPOINT: DASHBOARD SUMMARY ---
// Returns aggregated data for P&L, Expenses, and Revenue
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  const { startDate, endDate, includeLocations } = req.query // Add includeLocations param
  const pool = req.app.get('pool')
  const userId = req.user?.id

  if (!pool) {
    return res.status(500).json({
      success: false,
      error: 'Database pool not available'
    })
  }

  try {
    // Get user's included filters from settings
    const includedFilters = await getIncludedFiltersForUser(pool, userId)

    // Normalizare text pentru filtre
    const normalizeText = (text) => {
      if (!text) return ''
      return String(text).trim()
        .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    }

    // Parse includeLocations from query (EXACT SAME AS /monthly-by-location)
    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    // CRITICAL FIX: If user is NOT admin and has NO location filters (either from query or settings), 
    // we MUST return empty result. Do NOT show all locations by default for restricted users.
    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin && (!locationsArray || locationsArray.length === 0) && (!includedFilters.locations || includedFilters.locations.length === 0)) {
      console.warn(`🛑 [dashboard/summary] BLOCKED: Non-admin user ${userId} has no location filters. Returning empty.`)
      return res.json({
        success: true,
        pl: { profit: 0, margin: 0, trend: 0 },
        expenses: { total: 0, count: 0, trend: 0 },
        revenue: { total: 0, locations: 0, trend: 0 }
      })
    }

    // Get total revenue from incasari_daily (using profit = in_amount - out_amount)
    const revenueQuery = await pool.query(
      `SELECT 
        COALESCE(SUM(profit), 0) as total,
        COUNT(DISTINCT location_id) as locations
      FROM incasari_daily
      WHERE audit_date BETWEEN $1 AND $2`,
      [startDate, endDate]
    )

    // Build expenses query with user's filters (EXACT SAME LOGIC AS /monthly-by-location)
    let expensesSql = `
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenditures_sync
      WHERE operational_date BETWEEN $1 AND $2
      AND operational_date IS NOT NULL
      AND location_name IS NOT NULL
      AND location_name != ''
    `

    const expensesParams = [startDate, endDate]
    let paramIdx = 3

    // APPLY LOCATION FILTERS (EXACT SAME AS /monthly-by-location)
    const targetLocations = locationsArray || (includedFilters.locations && includedFilters.locations.length > 0 ? includedFilters.locations : null)
    if (targetLocations && targetLocations.length > 0) {
      const normalizedTargetLocations = targetLocations.map(normalizeText).filter(Boolean)
      expensesSql += ` AND normalized_location_name = ANY($${paramIdx}::text[])`
      expensesParams.push(normalizedTargetLocations)
      paramIdx++
    }

    // Apply department filters ONLY if user has them configured (same logic as /monthly-by-location)
    if (includedFilters.departments && includedFilters.departments.length > 0) {
      const normalizedDepartments = includedFilters.departments.map(normalizeText).filter(Boolean)
      expensesSql += ` AND (data_source = 'auto_discount' OR normalized_department_name = ANY($${paramIdx}::text[]))`
      expensesParams.push(normalizedDepartments)
      paramIdx++
    }

    // Apply type filters ONLY if user has them configured (same logic as /monthly-by-location)
    if (includedFilters.types && includedFilters.types.length > 0) {
      const normalizedTypes = includedFilters.types.map(normalizeText).filter(Boolean)
      expensesSql += ` AND (data_source = 'auto_discount' OR normalized_department_name = 'salarii' OR normalized_expenditure_type = ANY($${paramIdx}::text[]))`
      expensesParams.push(normalizedTypes)
      paramIdx++
    }

    const expensesQuery = await pool.query(expensesSql, expensesParams)



    // Get previous period for comparison (same duration)
    const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff)
    const prevEndDate = new Date(endDate)
    prevEndDate.setDate(prevEndDate.getDate() - daysDiff)

    const prevRevenueQuery = await pool.query(
      `SELECT COALESCE(SUM(profit), 0) as total
      FROM incasari_daily
      WHERE audit_date BETWEEN $1 AND $2`,
      [prevStartDate.toISOString().split('T')[0], prevEndDate.toISOString().split('T')[0]]
    )

    // Build previous expenses query with same filters (EXACT SAME LOGIC AS /monthly-by-location)
    let prevExpensesSql = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenditures_sync
      WHERE operational_date BETWEEN $1 AND $2
      AND operational_date IS NOT NULL
      AND location_name IS NOT NULL
      AND location_name != ''
    `

    const prevExpensesParams = [prevStartDate.toISOString().split('T')[0], prevEndDate.toISOString().split('T')[0]]
    let prevParamIdx = 3

    // Apply same location filters for previous period
    if (targetLocations && targetLocations.length > 0) {
      const normalizedTargetLocations = targetLocations.map(normalizeText).filter(Boolean)
      prevExpensesSql += ` AND normalized_location_name = ANY($${prevParamIdx}::text[])`
      prevExpensesParams.push(normalizedTargetLocations)
      prevParamIdx++
    }

    // Apply same department filters for previous period
    if (includedFilters.departments && includedFilters.departments.length > 0) {
      const normalizedDepartments = includedFilters.departments.map(normalizeText).filter(Boolean)
      prevExpensesSql += ` AND (data_source = 'auto_discount' OR normalized_department_name = ANY($${prevParamIdx}::text[]))`
      prevExpensesParams.push(normalizedDepartments)
      prevParamIdx++
    }

    // Apply same type filters for previous period
    if (includedFilters.types && includedFilters.types.length > 0) {
      const normalizedTypes = includedFilters.types.map(normalizeText).filter(Boolean)
      prevExpensesSql += ` AND (data_source = 'auto_discount' OR normalized_department_name = 'salarii' OR normalized_expenditure_type = ANY($${prevParamIdx}::text[]))`
      prevExpensesParams.push(normalizedTypes)
      prevParamIdx++
    }

    const prevExpensesQuery = await pool.query(prevExpensesSql, prevExpensesParams)



    // Calculate current period metrics
    const revenue = parseFloat(revenueQuery.rows[0].total)
    const expenses = parseFloat(expensesQuery.rows[0].total)
    const profit = revenue - expenses
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0

    // Calculate previous period metrics
    const prevRevenue = parseFloat(prevRevenueQuery.rows[0].total)
    const prevExpenses = parseFloat(prevExpensesQuery.rows[0].total)
    const prevProfit = prevRevenue - prevExpenses

    // Calculate trends
    const revenueTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0
    const expensesTrend = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0
    const profitTrend = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : 0

    res.json({
      success: true,
      pl: {
        profit,
        margin,
        trend: profitTrend
      },
      expenses: {
        total: expenses,
        count: parseInt(expensesQuery.rows[0].count),
        trend: expensesTrend
      },
      revenue: {
        total: revenue,
        locations: parseInt(revenueQuery.rows[0].locations),
        trend: revenueTrend
      }
    })

  } catch (err) {
    console.error('Error in dashboard/summary:', err)
    res.status(500).json({ success: false, error: 'Database error', details: err.message })
  }
})


// --- NEW ENDPOINT: EXPENSES ANALYSIS (Breakdown by Dept/Type) ---
// Uses user's expenditure_filter_settings to show ONLY real operational expenses
router.get('/expenses-analysis', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query
  const pool = req.app.get('pool')
  const userId = req.user?.id

  if (!pool) {
    return res.status(500).json({
      success: false,
      error: 'Database pool not available for expenses-analysis'
    })
  }

  try {
    // Get user's included filters from settings table
    const includedFilters = await getIncludedFiltersForUser(pool, userId)

    console.log('🔍 [expenses-analysis] User ID:', userId)
    console.log('🔍 [expenses-analysis] Included Filters:', {
      departments: includedFilters.departments?.slice(0, 10) || 'NONE',
      types: includedFilters.types?.slice(0, 10) || 'NONE'
    })

    // Normalizare text
    const normalizeText = (text) => {
      if (!text) return ''
      return String(text).trim()
        .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    }

    // Query expenses using ONLY user's included departments
    let sql = `
      SELECT
        normalized_department_name as department,
        SUM(amount) as total
      FROM expenditures_sync
      WHERE operational_date BETWEEN $1 AND $2
      AND normalized_location_name IS NOT NULL
      AND normalized_department_name IS NOT NULL
    `

    const params = [startDate, endDate]
    let paramIdx = 3

    // CRITICAL: Apply user's department filters (only show what they checked)
    if (includedFilters.departments && includedFilters.departments.length > 0) {
      const normalizedDepartments = includedFilters.departments.map(normalizeText).filter(Boolean)
      console.log('✅ [expenses-analysis] Applying department filter:', normalizedDepartments.slice(0, 10))
      sql += ` AND (data_source = 'auto_discount' OR normalized_department_name = ANY($${paramIdx}::text[]))`
      params.push(normalizedDepartments)
      paramIdx++
    } else {
      console.log('⚠️ [expenses-analysis] NO department filters - showing ALL departments!')
    }

    // Apply type filters if they exist
    if (includedFilters.types && includedFilters.types.length > 0) {
      const normalizedTypes = includedFilters.types.map(normalizeText).filter(Boolean)
      sql += ` AND (data_source = 'auto_discount' OR normalized_department_name = 'salarii' OR normalized_expenditure_type = ANY($${paramIdx}::text[]))`
      params.push(normalizedTypes)
      paramIdx++
    }

    sql += `
      GROUP BY normalized_department_name
      ORDER BY total DESC
    `

    const result = await pool.query(sql, params)

    res.json({
      success: true,
      data: result.rows
    })

  } catch (err) {
    console.error('Error in expenses-analysis:', err)
    res.status(500).json({ success: false, error: 'Database error' })
  }
})

// Helper function to format game mix: remove everything before "-" if "-" exists
const formatGameMix = (gameMix) => {
  if (!gameMix) return gameMix
  const dashIndex = gameMix.indexOf('-')
  if (dashIndex !== -1 && dashIndex < gameMix.length - 1) {
    return gameMix.substring(dashIndex + 1).trim()
  }
  return gameMix
}

// Returnează lista de machine_id ACTIVE, filtrate opțional după locație / provider / cabinet / game_mix
// includeLocations: listă de locații permise (dacă este setată, se folosește în loc de "location" simplu)
const getActiveMachineIds = ({ location, provider, cabinet, gameMix, includeLocations } = {}) => {
  const slots = getActiveSlots()
  const allowedLocations =
    Array.isArray(includeLocations) && includeLocations.length > 0
      ? new Set(includeLocations.map((loc) => normalizeLocationName(loc)))
      : null
  const normalizedLocation = location ? normalizeLocationName(location) : null

  const filtered = slots.filter((slot) => {
    const slotLocation = slot.location || ''
    const normalizedSlotLocation = normalizeLocationName(slotLocation)

    if (allowedLocations && !allowedLocations.has(normalizedSlotLocation)) {
      return false
    }
    if (!allowedLocations && normalizedLocation && normalizedSlotLocation !== normalizedLocation) {
      return false
    }
    if (provider && (slot.provider || '') !== provider) return false
    if (cabinet && (slot.cabinet || '') !== cabinet) return false
    if (gameMix) {
      const slotGameMix = slot.game_mix || ''
      const formattedSlotGameMix = formatGameMix(slotGameMix)
      // Compară atât formatat cât și original (pentru compatibilitate)
      if (formattedSlotGameMix !== gameMix && slotGameMix !== gameMix) {
        return false
      }
    }
    return true
  })

  return filtered.map((slot) => Number(slot.id))
}

// Helper: date range validation utilitar pentru floorplan
const ensureDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    throw new Error('Lipsește startDate sau endDate')
  }
}

// Endpoint pentru meta-datele de filtre (locații / provideri / cabinete / game-mix)
router.get('/filters-metadata', authenticateToken, async (req, res) => {
  try {
    const slots = getActiveSlots()

    const locationsSet = new Set()
    const providersSet = new Set()
    const cabinetsSet = new Set()
    const mixesSet = new Set()

    slots.forEach((slot) => {
      if (slot.location) {
        const normLoc = normalizeLocationName(slot.location)
        if (normLoc) locationsSet.add(normLoc)
      }
      if (slot.provider) providersSet.add(slot.provider)
      if (slot.cabinet) cabinetsSet.add(slot.cabinet)
      if (slot.game_mix) {
        const formatted = formatGameMix(slot.game_mix)
        if (formatted) mixesSet.add(formatted)
      }
    })

    return res.json({
      success: true,
      locations: Array.from(locationsSet).sort(),
      providers: Array.from(providersSet).sort(),
      cabinets: Array.from(cabinetsSet).sort(),
      gameMixes: Array.from(mixesSet).sort()
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/filters-metadata:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la încărcarea meta-datelor pentru filtre încasări'
    })
  }
})

// GET /api/incasari/cyber-preview
// Returnează datele din tabelul local incasari_daily (importate din Cyber),
// împreună cu lista de coloane. Filtrarea pe perioadă se face în frontend.
router.get('/cyber-preview', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const sql = `
      SELECT
        audit_date AS date,
        location_id,
        machine_id,
        machine_type_id,
        machine_reset_id,
        audit_id_start,
        audit_id_end,
        in_m,
        out_m,
        in_amount AS in,
        out_amount AS out,
        bet,
        win,
        credits,
        games,
        jackpot,
        hh,
        cb_real,
        cb_birthday,
        cb_daily,
        cb_raffle,
        cb_9a_deductible,
        cashback,
        profit,
        serial_number
      FROM incasari_daily
      ORDER BY audit_date, machine_id
    `

    const dataResult = await pool.query(sql)

    const columns = [
      'date',
      'location_id',
      'machine_id',
      'machine_type_id',
      'machine_reset_id',
      'audit_id_start',
      'audit_id_end',
      'in_m',
      'out_m',
      'in',
      'out',
      'bet',
      'win',
      'credits',
      'games',
      'jackpot',
      'hh',
      'cb_real',
      'cb_birthday',
      'cb_daily',
      'cb_raffle',
      'cb_9a_deductible',
      'cashback',
      'profit',
      'serial_number'
    ].map((name) => ({
      name,
      dataType: 'number',
      isNullable: true,
      default: null
    }))

    return res.json({
      success: true,
      mode: 'pg',
      columns,
      rows: dataResult.rows,
      rowCount: dataResult.rowCount
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/cyber-preview (PG incasari_daily):', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la citirea datelor din incasari_daily'
    })
  }
})

// GET /api/incasari/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returnează total IN, OUT, PROFIT și număr zile distincte pentru pagina de Încasări
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { startDate, endDate, location, provider, cabinet, gameMix, includeLocations } =
      req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    // Filtrare pe locații/providers/cabinete/game mix folosind getActiveMachineIds
    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations
    })

    let summarySql
    let params

    // Dacă avem activeIds, folosim filtrarea pe machine_id
    if (activeIds && activeIds.length > 0) {
      summarySql = `
        SELECT
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COUNT(DISTINCT audit_date) AS days_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND machine_id = ANY($3)
      `
      params = [startDate, endDate, activeIds]
    } else {
      // Dacă nu avem activeIds, afișăm toate datele disponibile (fără filtrare pe machine_id)
      summarySql = `
        SELECT
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COUNT(DISTINCT audit_date) AS days_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
      `
      params = [startDate, endDate]
    }

    const result = await pool.query(summarySql, params)
    const row = result.rows[0] || {
      total_in: 0,
      total_out: 0,
      total_profit: 0,
      total_bet: 0,
      total_win: 0,
      days_count: 0
    }

    // Folosim activeSlotsCount pentru consistență cu overview
    let locationsArray
    if (typeof includeLocations === 'string' && includeLocations.length > 0) {
      locationsArray = includeLocations
        .split(',')
        .map((s) => normalizeLocationName(s))
        .filter(Boolean)
    }
    const activeIdsForCounts = getActiveMachineIdsForCounts({
      includeLocations: locationsArray
    })
    const slots = activeIdsForCounts.length // Număr de sloturi active (consistent cu overview)

    const days = Number(row.days_count || 0)
    const totalIn = Number(row.total_in || 0)
    const totalBet = Number(row.total_bet || 0)
    const totalWin = Number(row.total_win || 0)
    // Average Drop corect: SUM(IN) / număr zile / număr sloturi active
    const avgDrop = days > 0 && slots > 0 ? totalIn / days / slots : 0
    const winBetPercent = totalBet > 0 ? (totalWin / totalBet) * 100 : 0

    return res.json({
      success: true,
      startDate,
      endDate,
      totalIn,
      totalOut: Number(row.total_out || 0),
      totalProfit: Number(row.total_profit || 0),
      totalBet,
      totalWin,
      winBetPercent,
      daysCount: days,
      slotsCount: slots,
      averageDrop: avgDrop
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/summary:', error)
    console.error('Stack trace:', error.stack)
    console.error('Request params:', { startDate, endDate, location, provider, cabinet, gameMix, includeLocations })
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul sumarului de încasări',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/incasari/daily-stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Date zilnice agregate pentru grafice (total pe zi)
router.get('/daily-stats', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { startDate, endDate, location, provider, cabinet, gameMix, includeLocations } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    // Verifică dacă este luna trecută completă și dacă nu sunt filtre location/provider/cabinet/gameMix
    const currentDate = new Date()
    const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
    const formatDateLocal = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const lastMonthStartStr = formatDateLocal(lastMonthStart)
    const lastMonthEndStr = formatDateLocal(lastMonthEnd)
    const isLastMonth = startDate === lastMonthStartStr && endDate === lastMonthEndStr
    const hasNoFilters = (!location || location === 'all') && (!provider || provider === 'all') && (!cabinet || cabinet === 'all') && (!gameMix || gameMix === 'all')

    // Pentru luna trecută, fără filtre location/provider/cabinet/gameMix, calculăm direct din Cyber (ca overview.lastMonth)
    if (isLastMonth && hasNoFilters) {
      try {
        console.log(`🔥 [daily-stats] Calcul direct din Cyber pentru luna trecută: ${lastMonthStartStr} - ${lastMonthEndStr}`)
        const cyberPool = await getCyberPool()

        // Construiește lista de location_id-uri permise dacă includeLocations este setat
        let locationIdsFilter = null
        if (locationsArray && locationsArray.length > 0) {
          const activeSlots = getActiveSlots()
          const allowed = new Set(locationsArray)
          const locationIds = new Set()
          activeSlots.forEach((slot) => {
            if (
              slot &&
              slot.location &&
              allowed.has(normalizeLocationName(slot.location)) &&
              slot.location_id
            ) {
              locationIds.add(Number(slot.location_id))
            }
          })
          if (locationIds.size > 0) {
            locationIdsFilter = Array.from(locationIds)
          }
        }

        let cyberSql = `
          SELECT
            mas.date,
            COALESCE(SUM(mas.in), 0) AS total_in,
            COALESCE(SUM(mas.out), 0) AS total_out,
            COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
            COUNT(DISTINCT mas.machine_id) AS slots_count
          FROM cyberslot_dbn.machine_audit_summaries mas
          WHERE mas.date >= ? AND mas.date <= ?
        `
        const cyberParams = [lastMonthStartStr, lastMonthEndStr]
        if (locationIdsFilter && locationIdsFilter.length > 0) {
          const placeholders = locationIdsFilter.map(() => '?').join(',')
          cyberSql += ` AND mas.location_id IN (${placeholders})`
          cyberParams.push(...locationIdsFilter)
        }
        cyberSql += ` GROUP BY mas.date ORDER BY mas.date`

        const [cyberRows] = await cyberPool.query(cyberSql, cyberParams)
        console.log(`🔥 [daily-stats] Luna trecută DIN CYBER - ${cyberRows.length} zile găsite`)

        const rows = (cyberRows || []).map((row) => ({
          date: row.date,
          total_in: Number(row.total_in || 0),
          total_out: Number(row.total_out || 0),
          total_profit: Number(row.total_profit || 0),
          slots_count: Number(row.slots_count || 0)
        }))

        return res.json({
          success: true,
          startDate,
          endDate,
          rows,
          source: 'cyber' // Indică că datele vin direct din Cyber
        })
      } catch (error) {
        console.error('❌ Error fetching from Cyber, fallback to PostgreSQL:', error.message)
        // Continuă cu calculul din PostgreSQL (ca mai jos)
      }
    }

    // Calcul normal din incasari_daily (pentru alte perioade sau când sunt filtre)
    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    let sql
    let params

    // Dacă avem activeIds, folosim filtrarea pe machine_id
    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          audit_date AS date,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND machine_id = ANY($3)
          AND serial_number IS NOT NULL
          AND serial_number != ''
        GROUP BY audit_date
        ORDER BY audit_date
      `
      params = [startDate, endDate, activeIds]
    } else {
      // Dacă nu avem activeIds, afișăm toate datele disponibile (fără filtrare pe machine_id)
      sql = `
        SELECT
          audit_date AS date,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND serial_number IS NOT NULL
          AND serial_number != ''
        GROUP BY audit_date
        ORDER BY audit_date
      `
      params = [startDate, endDate]
    }

    const result = await pool.query(sql, params)

    return res.json({
      success: true,
      startDate,
      endDate,
      rows: result.rows || []
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/daily-stats:', error)
    console.error('Stack trace:', error.stack)
    console.error('Request params:', { startDate, endDate, location, provider, cabinet, gameMix, includeLocations })
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul statisticilor zilnice de încasări',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/incasari/avg-in-by-location?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// IN total și IN mediu pe săli (pentru pie chart pe locații)
router.get('/avg-in-by-location', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { startDate, endDate, location, provider, cabinet, gameMix, includeLocations } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    // Verifică dacă este luna trecută completă și dacă nu sunt filtre location/provider/cabinet/gameMix
    const currentDate = new Date()
    const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
    const formatDateLocal = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const lastMonthStartStr = formatDateLocal(lastMonthStart)
    const lastMonthEndStr = formatDateLocal(lastMonthEnd)
    const isLastMonth = startDate === lastMonthStartStr && endDate === lastMonthEndStr
    const hasNoFilters = (!location || location === 'all') && (!provider || provider === 'all') && (!cabinet || cabinet === 'all') && (!gameMix || gameMix === 'all')

    // Pentru luna trecută, fără filtre location/provider/cabinet/gameMix, calculăm direct din Cyber (ca overview.lastMonth)
    if (isLastMonth && hasNoFilters) {
      try {
        console.log(`🔥 [avg-in-by-location] Calcul direct din Cyber pentru luna trecută: ${lastMonthStartStr} - ${lastMonthEndStr}`)
        const cyberPool = await getCyberPool()

        // Construiește lista de location_id-uri permise dacă includeLocations este setat
        let locationIdsFilter = null
        if (locationsArray && locationsArray.length > 0) {
          const activeSlots = getActiveSlots()
          const allowed = new Set(locationsArray)
          const locationIds = new Set()
          activeSlots.forEach((slot) => {
            if (
              slot &&
              slot.location &&
              allowed.has(normalizeLocationName(slot.location)) &&
              slot.location_id
            ) {
              locationIds.add(Number(slot.location_id))
            }
          })
          if (locationIds.size > 0) {
            locationIdsFilter = Array.from(locationIds)
          }
        }

        let cyberSql = `
          SELECT
            mas.location_id,
            COALESCE(SUM(mas.in), 0) AS total_in,
            COALESCE(SUM(mas.out), 0) AS total_out,
            COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
            COALESCE(SUM(mas.bet), 0) AS total_bet,
            COALESCE(SUM(mas.win), 0) AS total_win,
            COALESCE(SUM(mas.jackpot), 0) AS total_jackpot,
            COALESCE(SUM(mas.hh), 0) AS total_hh,
            COALESCE(SUM(mas.cb_real), 0) AS total_cb_real,
            COALESCE(SUM(mas.cb_birthday), 0) AS total_cb_birthday,
            COALESCE(SUM(mas.cb_raffle), 0) AS total_cb_raffle,
            COUNT(DISTINCT mas.machine_id) AS slots_count
          FROM cyberslot_dbn.machine_audit_summaries mas
          WHERE mas.date >= ? AND mas.date <= ?
        `
        const cyberParams = [lastMonthStartStr, lastMonthEndStr]
        if (locationIdsFilter && locationIdsFilter.length > 0) {
          const placeholders = locationIdsFilter.map(() => '?').join(',')
          cyberSql += ` AND mas.location_id IN (${placeholders})`
          cyberParams.push(...locationIdsFilter)
        }
        cyberSql += ` GROUP BY mas.location_id ORDER BY mas.location_id`

        const [cyberRows] = await cyberPool.query(cyberSql, cyberParams)
        console.log(`🔥 [avg-in-by-location] Luna trecută DIN CYBER - ${cyberRows.length} locații găsite`)

        // Încarcă datele pentru locații (folosind fallback dacă fișierul nu există)
        let locationsData = []
        try {
          locationsData = loadExportedData('locations.json')
          if (!Array.isArray(locationsData)) {
            console.warn('⚠️ locations.json nu este un array, folosim array gol')
            locationsData = []
          }
        } catch (error) {
          console.error('❌ Eroare la încărcarea locations.json:', error)
          locationsData = []
        }

        const locationMap = new Map()
        locationsData.forEach((loc) => {
          if (loc && typeof loc.id !== 'undefined') {
            locationMap.set(String(loc.id), loc.name || loc.location || `Loc ${loc.id}`)
          }
        })

        const rows = (cyberRows || []).map((row) => {
          const locationId = row.location_id
          const key =
            locationId === null || typeof locationId === 'undefined' ? null : String(locationId)
          const locationName = key ? locationMap.get(key) || `Loc ${key}` : 'Nesetat'
          const totalIn = Number(row.total_in || 0)
          const slotsCount = Number(row.slots_count || 0)
          const averageIn = slotsCount > 0 ? totalIn / slotsCount : 0
          return {
            locationId,
            locationName,
            totalProfit: Number(row.total_profit || 0),
            totalIn,
            totalBet: Number(row.total_bet || 0),
            totalWin: Number(row.total_win || 0),
            totalJackpot: Number(row.total_jackpot || 0),
            totalHh: Number(row.total_hh || 0),
            totalCbReal: Number(row.total_cb_real || 0),
            totalCbBirthday: Number(row.total_cb_birthday || 0),
            totalCbRaffle: Number(row.total_cb_raffle || 0),
            slotsCount,
            averageIn
          }
        })

        return res.json({
          success: true,
          startDate,
          endDate,
          rows,
          source: 'cyber' // Indică că datele vin direct din Cyber
        })
      } catch (error) {
        console.error('❌ Error fetching from Cyber, fallback to PostgreSQL:', error.message)
        // Continuă cu calculul din PostgreSQL (ca mai jos)
      }
    }

    // Calcul normal din incasari_daily (pentru alte perioade sau când sunt filtre)
    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    let sql
    let params

    // Dacă avem activeIds, folosim filtrarea pe machine_id
    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          location_id,
          COALESCE(SUM(profit), 0) AS total_profit,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cb_real,
          COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
          COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND machine_id = ANY($3)
        GROUP BY location_id
        ORDER BY location_id
      `
      params = [startDate, endDate, activeIds]
    } else {
      // Dacă nu avem activeIds, afișăm toate datele disponibile (fără filtrare pe machine_id)
      sql = `
        SELECT
          location_id,
          COALESCE(SUM(profit), 0) AS total_profit,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cb_real,
          COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
          COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
        GROUP BY location_id
        ORDER BY location_id
      `
      params = [startDate, endDate]
    }

    const result = await pool.query(sql, params)

    // Încarcă datele pentru locații (folosind fallback dacă fișierul nu există)
    let locationsData = []
    try {
      locationsData = loadExportedData('locations.json')
      if (!Array.isArray(locationsData)) {
        console.warn('⚠️ locations.json nu este un array, folosim array gol')
        locationsData = []
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea locations.json:', error)
      locationsData = []
    }

    const locationMap = new Map()
    locationsData.forEach((loc) => {
      if (loc && typeof loc.id !== 'undefined') {
        locationMap.set(String(loc.id), loc.name || loc.location || `Loc ${loc.id}`)
      }
    })

    const rows = (result.rows || []).map((row) => {
      const locationId = row.location_id
      const key =
        locationId === null || typeof locationId === 'undefined' ? null : String(locationId)
      const locationName = key ? locationMap.get(key) || `Loc ${key}` : 'Nesetat'
      const totalIn = Number(row.total_in || 0)
      const slotsCount = Number(row.slots_count || 0)
      const averageIn = slotsCount > 0 ? totalIn / slotsCount : 0
      return {
        locationId,
        locationName,
        totalProfit: Number(row.total_profit || 0),
        totalIn,
        totalBet: Number(row.total_bet || 0),
        totalWin: Number(row.total_win || 0),
        totalJackpot: Number(row.total_jackpot || 0),
        totalHh: Number(row.total_hh || 0),
        totalCbReal: Number(row.total_cb_real || 0),
        totalCbBirthday: Number(row.total_cb_birthday || 0),
        totalCbRaffle: Number(row.total_cb_raffle || 0),
        slotsCount,
        averageIn
      }
    })

    return res.json({
      success: true,
      startDate,
      endDate,
      rows
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/avg-in-by-location:', error)
    console.error('Stack trace:', error.stack)
    console.error('Request params:', { startDate, endDate, location, provider, cabinet, gameMix, includeLocations })
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul IN mediu pe săli',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/incasari/daily-by-location?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/daily-by-location', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { startDate, endDate, location, provider, cabinet, gameMix, includeLocations } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    let sql
    let params

    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          audit_date AS date,
          location_id,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND machine_id = ANY($3)
          AND serial_number IS NOT NULL
          AND serial_number != ''
        GROUP BY audit_date, location_id
        ORDER BY audit_date, location_id
      `
      params = [startDate, endDate, activeIds]
    } else {
      sql = `
        SELECT
          audit_date AS date,
          location_id,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND serial_number IS NOT NULL
          AND serial_number != ''
        GROUP BY audit_date, location_id
        ORDER BY audit_date, location_id
      `
      params = [startDate, endDate]
    }

    const result = await pool.query(sql, params)

    return res.json({
      success: true,
      startDate,
      endDate,
      rows: result.rows || []
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/daily-by-location:', error)
    console.error('Stack trace:', error.stack)
    console.error('Request params:', { startDate, endDate, location, provider, cabinet, gameMix, includeLocations })
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul statisticilor zilnice pe săli',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/incasari/avg-in-by-cabinet?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// IN total și IN mediu pe cabinete (folosind mapping din slots.json)
router.get('/avg-in-by-cabinet', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { startDate, endDate, location, provider, cabinet, gameMix, includeLocations } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    let sql
    let params

    // Dacă avem activeIds, folosim filtrarea pe machine_id
    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          serial_number,
          COALESCE(SUM(in_amount), 0) AS total_in
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND machine_id = ANY($3)
          AND serial_number IS NOT NULL
          AND serial_number != ''
        GROUP BY serial_number
      `
      params = [startDate, endDate, activeIds]
    } else {
      // Dacă nu avem activeIds, afișăm toate datele disponibile (fără filtrare pe machine_id)
      sql = `
        SELECT
          serial_number,
          COALESCE(SUM(in_amount), 0) AS total_in
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND serial_number IS NOT NULL
          AND serial_number != ''
        GROUP BY serial_number
      `
      params = [startDate, endDate]
    }

    const result = await pool.query(sql, params)

    // Încarcă datele pentru sloturi (folosind fallback dacă fișierul nu există)
    let slotsData = []
    try {
      slotsData = loadExportedData('slots.json')
      if (!Array.isArray(slotsData)) {
        console.warn('⚠️ slots.json nu este un array, folosim array gol')
        slotsData = []
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea slots.json:', error)
      slotsData = []
    }

    const slotMap = new Map()
    if (slotsData && Array.isArray(slotsData)) {
      slotsData.forEach((slot) => {
        if (slot && typeof slot.id !== 'undefined') {
          // Map by serial_number pentru a găsi cabinet-ul
          if (slot.serial_number) {
            slotMap.set(slot.serial_number, slot)
          }
          // Fallback: map by machine_id
          slotMap.set(String(slot.id), slot)
        }
      })
    }

    const cabinetMap = new Map()

      ; (result.rows || []).forEach((row) => {
        const serialNumber = row.serial_number
        if (!serialNumber) return

        // Caută slot-ul după serial_number
        const slot = slotMap.get(serialNumber)
        const cabinetName = slot?.cabinet || 'Necunoscut'

        if (!cabinetMap.has(cabinetName)) {
          cabinetMap.set(cabinetName, {
            cabinetName,
            totalIn: 0,
            slotsCount: 0,
            serialNumbers: new Set()
          })
        }

        const agg = cabinetMap.get(cabinetName)
        agg.totalIn += Number(row.total_in || 0)
        // Numără serial_number distincte
        agg.serialNumbers.add(serialNumber)
        agg.slotsCount = agg.serialNumbers.size
      })

    const rows = Array.from(cabinetMap.values()).map((item) => ({
      cabinetName: item.cabinetName,
      totalIn: item.totalIn,
      slotsCount: item.slotsCount,
      averageIn: item.slotsCount > 0 ? item.totalIn / item.slotsCount : 0
    }))

    return res.json({
      success: true,
      startDate,
      endDate,
      rows
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/avg-in-by-cabinet:', error)
    console.error('Stack trace:', error.stack)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul IN mediu pe cabinete',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/incasari/overview
// Returnează date pentru cardul "Prezentare generală": Azi, Ieri, Luna curentă, Luna trecută
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { includeLocations } = req.query

    let locationsArray
    if (typeof includeLocations === 'string' && includeLocations.length > 0) {
      locationsArray = includeLocations
        .split(',')
        .map((s) => normalizeLocationName(s))
        .filter(Boolean)
    }

    // Ziua operațională Cyber: 08:00 dimineața - 08:00 dimineața următoare
    // Datele din incasari_daily sunt agregate pe zi completă (audit_date)
    const now = new Date()
    const currentHour = now.getHours()

    let todayDate, yesterdayDate

    if (currentHour >= 8) {
      // Dacă este după 08:00, "Azi" operațional = ziua de azi (08:00 azi - 08:00 mâine)
      // Dar datele sunt agregate pe zi, deci folosim ziua de azi
      todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      // "Ieri" operațional = ziua de ieri (08:00 ieri - 08:00 azi)
      yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    } else {
      // Dacă este înainte de 08:00, "Azi" operațional = ziua de ieri (08:00 ieri - 08:00 azi)
      todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      // "Ieri" operațional = ziua de alaltăieri (08:00 alaltăieri - 08:00 ieri)
      yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
    }

    const formatDateLocal = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const todayStr = formatDateLocal(todayDate)
    const yesterdayStr = formatDateLocal(yesterdayDate)

    // Pentru luna curentă, folosim TOATĂ luna (1-30/31) pentru consistență
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Ultima zi a lunii curente
    const currentMonthStartStr = `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}-${String(currentMonthStart.getDate()).padStart(2, '0')}`
    const currentMonthEndStr = `${currentMonthEnd.getFullYear()}-${String(currentMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(currentMonthEnd.getDate()).padStart(2, '0')}`

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const lastMonthStartStr = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}-${String(lastMonthStart.getDate()).padStart(2, '0')}`
    const lastMonthEndStr = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`

    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const currentYearEnd = new Date(now.getFullYear(), 11, 31)
    const currentYearStartStr = `${currentYearStart.getFullYear()}-${String(currentYearStart.getMonth() + 1).padStart(2, '0')}-${String(currentYearStart.getDate()).padStart(2, '0')}`
    const currentYearEndStr = `${currentYearEnd.getFullYear()}-${String(currentYearEnd.getMonth() + 1).padStart(2, '0')}-${String(currentYearEnd.getDate()).padStart(2, '0')}`

    // Număr de sloturi ACTIVE UNICE (din slots.json) pentru locațiile vizibile.
    const activeIdsForCounts = getActiveMachineIdsForCounts({
      includeLocations: locationsArray
    })
    const activeSlotsCount = activeIdsForCounts.length

    // Construiește lista de location_id-uri permise dacă includeLocations este setat
    let locationIdsFilter = null
    if (locationsArray && locationsArray.length > 0) {
      const activeSlots = getActiveSlots()
      const allowed = new Set(locationsArray)
      const locationIds = new Set()
      activeSlots.forEach((slot) => {
        if (
          slot &&
          slot.location &&
          allowed.has(normalizeLocationName(slot.location)) &&
          slot.location_id
        ) {
          locationIds.add(Number(slot.location_id))
        }
      })
      if (locationIds.size > 0) {
        locationIdsFilter = Array.from(locationIds)
      }
    }

    // Construiește query-ul pentru zile (today/yesterday) cu filtrare pe locații dacă este necesar
    const buildOverviewSql = (dateStr) => {
      let sql = `
        SELECT
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cb_real,
          COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
          COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle
        FROM incasari_daily
        WHERE audit_date = $1
      `

      // Dacă avem filtrare pe locații, adăugăm condiția
      if (locationIdsFilter && locationIdsFilter.length > 0) {
        const placeholders = locationIdsFilter.map((_, idx) => `$${idx + 2}`).join(',')
        sql += ` AND location_id = ANY(ARRAY[${placeholders}])`
      }

      return sql
    }

    // Prepare parameters for overview queries
    const overviewParams = (dateStr) => {
      const params = [dateStr]
      if (locationIdsFilter && locationIdsFilter.length > 0) {
        params.push(...locationIdsFilter)
      }
      return params
    }

    // CITIM AZI ȘI IERI TOT DIN CYBER (ca și luna curentă) pentru date fresh!
    const getTodayFromCyber = async () => {
      try {
        const cyberPool = await getCyberPool()
        let cyberSql = `
          SELECT
            COALESCE(SUM(mas.in), 0) AS total_in,
            COALESCE(SUM(mas.out), 0) AS total_out,
            COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
            COALESCE(SUM(mas.bet), 0) AS total_bet,
            COALESCE(SUM(mas.win), 0) AS total_win,
            COALESCE(SUM(mas.jackpot), 0) AS total_jackpot,
            COALESCE(SUM(mas.hh), 0) AS total_hh,
            COALESCE(SUM(mas.cb_real), 0) AS total_cb_real,
            COALESCE(SUM(mas.cb_birthday), 0) AS total_cb_birthday,
            COALESCE(SUM(mas.cb_raffle), 0) AS total_cb_raffle
          FROM cyberslot_dbn.machine_audit_summaries mas
          WHERE mas.date = ?
        `
        const cyberParams = [todayStr]
        if (locationIdsFilter && locationIdsFilter.length > 0) {
          const placeholders = locationIdsFilter.map(() => '?').join(',')
          cyberSql += ` AND mas.location_id IN (${placeholders})`
          cyberParams.push(...locationIdsFilter)
        }
        const [cyberRows] = await cyberPool.query(cyberSql, cyberParams)
        return { rows: [cyberRows[0] || {}] }
      } catch (error) {
        console.error('❌ Error fetching today from Cyber, fallback to PostgreSQL:', error.message)
        return await pool.query(buildOverviewSql(todayStr), overviewParams(todayStr))
      }
    }

    const getYesterdayFromCyber = async () => {
      try {
        const cyberPool = await getCyberPool()
        let cyberSql = `
          SELECT
            COALESCE(SUM(mas.in), 0) AS total_in,
            COALESCE(SUM(mas.out), 0) AS total_out,
            COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
            COALESCE(SUM(mas.bet), 0) AS total_bet,
            COALESCE(SUM(mas.win), 0) AS total_win,
            COALESCE(SUM(mas.jackpot), 0) AS total_jackpot,
            COALESCE(SUM(mas.hh), 0) AS total_hh,
            COALESCE(SUM(mas.cb_real), 0) AS total_cb_real,
            COALESCE(SUM(mas.cb_birthday), 0) AS total_cb_birthday,
            COALESCE(SUM(mas.cb_raffle), 0) AS total_cb_raffle
          FROM cyberslot_dbn.machine_audit_summaries mas
          WHERE mas.date = ?
        `
        const cyberParams = [yesterdayStr]
        if (locationIdsFilter && locationIdsFilter.length > 0) {
          const placeholders = locationIdsFilter.map(() => '?').join(',')
          cyberSql += ` AND mas.location_id IN (${placeholders})`
          cyberParams.push(...locationIdsFilter)
        }
        const [cyberRows] = await cyberPool.query(cyberSql, cyberParams)
        return { rows: [cyberRows[0] || {}] }
      } catch (error) {
        console.error('❌ Error fetching yesterday from Cyber, fallback to PostgreSQL:', error.message)
        return await pool.query(buildOverviewSql(yesterdayStr), overviewParams(yesterdayStr))
      }
    }

    const [todayResult, yesterdayResult] = await Promise.all([
      getTodayFromCyber(),
      getYesterdayFromCyber()
    ])

    // Construiește query-ul pentru luni cu filtrare pe locații dacă este necesar
    const buildMonthSql = (dateStart, dateEnd) => {
      let sql = `
        SELECT
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(profit), 0) AS total_profit,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cb_real,
          COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
          COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
      `

      // Dacă avem filtrare pe locații, adăugăm condiția
      if (locationIdsFilter && locationIdsFilter.length > 0) {
        const placeholders = locationIdsFilter.map((_, idx) => `$${idx + 3}`).join(',')
        sql += ` AND location_id = ANY(ARRAY[${placeholders}])`
      }

      return sql
    }

    const monthSql = buildMonthSql

    // Get POS data for each period
    // Dacă includeLocations este setat, filtrează pe locații; altfel, toate locațiile
    // POS poate fi setat fie în `expenditure_type`, fie în `department_name`
    // Folosim DATE() pentru comparație corectă și gestionăm NULL-urile
    const buildPosSql = (dateStart, dateEnd) => {
      let sql = `
        SELECT
          COALESCE(SUM(amount), 0) AS total_pos
        FROM expenditures_sync
        WHERE DATE(operational_date) BETWEEN DATE($1::text) AND DATE($2::text)
          AND (
            (expenditure_type IS NOT NULL AND UPPER(TRIM(expenditure_type)) = 'POS')
            OR (department_name IS NOT NULL AND UPPER(TRIM(department_name)) = 'POS')
          )
      `

      // Dacă includeLocations este setat, filtrează pe locații
      if (locationsArray && locationsArray.length > 0) {
        const locationPlaceholders = locationsArray.map((_, idx) => `$${idx + 3}`).join(',')
        sql += ` AND location_name = ANY(ARRAY[${locationPlaceholders}])`
      }

      return sql
    }

    const posSqlToday = buildPosSql(todayStr, todayStr)
    const posSqlYesterday = buildPosSql(yesterdayStr, yesterdayStr)
    const posSqlCurrentMonth = buildPosSql(currentMonthStartStr, currentMonthEndStr)
    const posSqlLastMonth = buildPosSql(lastMonthStartStr, lastMonthEndStr)
    const posSqlCurrentYear = buildPosSql(currentYearStartStr, currentYearEndStr)

    // Prepare parameters for POS queries
    const posParams = (dateStart, dateEnd) => {
      const params = [dateStart, dateEnd]
      if (locationsArray && locationsArray.length > 0) {
        params.push(...locationsArray)
      }
      return params
    }

    // Debug: verifică ce zile există în incasari_daily pentru luna curentă
    const debugCurrentMonthSql = `
      SELECT 
        audit_date,
        COUNT(*) as row_count,
        COALESCE(SUM(in_amount), 0) AS total_in
      FROM incasari_daily
      WHERE audit_date BETWEEN $1 AND $2
      GROUP BY audit_date
      ORDER BY audit_date
    `
    const debugCurrentMonthResult = await pool.query(debugCurrentMonthSql, [currentMonthStartStr, currentMonthEndStr])
    console.log(`📊 [overview] Luna curentă: ${currentMonthStartStr} - ${currentMonthEndStr}`)
    console.log(`📊 [overview] Zile găsite în incasari_daily:`, debugCurrentMonthResult.rows.map(r => r.audit_date).join(', '))
    console.log(`📊 [overview] Total zile găsite: ${debugCurrentMonthResult.rows.length}`)

    // Prepare parameters for month queries
    const monthParams = (dateStart, dateEnd) => {
      const params = [dateStart, dateEnd]
      if (locationIdsFilter && locationIdsFilter.length > 0) {
        params.push(...locationIdsFilter)
      }
      return params
    }

    // FUNCȚIE SPECIALĂ: pentru luna curentă, luăm datele DIRECT din Cyber, nu din PostgreSQL
    // pentru că datele sunt acolo și pot fi incomplete în PostgreSQL
    const getCurrentMonthFromCyber = async () => {
      try {
        console.log(`🔥 [overview] Încep citirea din Cyber pentru luna curentă: ${currentMonthStartStr} - ${currentMonthEndStr}`)

        const cyberPool = await getCyberPool()

        // Mai întâi, verificăm dacă există date în Cyber pentru această perioadă
        const checkSql = `
          SELECT COUNT(*) as count, 
                 MIN(date) as min_date, 
                 MAX(date) as max_date,
                 COUNT(DISTINCT date) as distinct_days
          FROM cyberslot_dbn.machine_audit_summaries
          WHERE date >= ? AND date <= ?
        `
        const checkParams = [currentMonthStartStr, currentMonthEndStr]
        const [checkRows] = await cyberPool.query(checkSql, checkParams)
        const checkRow = checkRows[0] || {}
        console.log(`🔥 [overview] Cyber check - Total rânduri: ${checkRow.count || 0}, Zile distincte: ${checkRow.distinct_days || 0}, Min date: ${checkRow.min_date || 'N/A'}, Max date: ${checkRow.max_date || 'N/A'}`)

        // Construim query-ul exact ca în import-incasari-from-cyber.js
        let cyberSql = `
          SELECT
            COALESCE(SUM(mas.in), 0) AS total_in,
            COALESCE(SUM(mas.out), 0) AS total_out,
            COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
            COALESCE(SUM(mas.bet), 0) AS total_bet,
            COALESCE(SUM(mas.win), 0) AS total_win,
            COALESCE(SUM(mas.jackpot), 0) AS total_jackpot,
            COALESCE(SUM(mas.hh), 0) AS total_hh,
            COALESCE(SUM(mas.cb_real), 0) AS total_cb_real,
            COALESCE(SUM(mas.cb_birthday), 0) AS total_cb_birthday,
            COALESCE(SUM(mas.cb_raffle), 0) AS total_cb_raffle
          FROM cyberslot_dbn.machine_audit_summaries mas
          WHERE mas.date >= ? AND mas.date <= ?
        `

        const cyberParams = [currentMonthStartStr, currentMonthEndStr]

        // Dacă avem filtrare pe locații, adăugăm condiția WHERE
        if (locationIdsFilter && locationIdsFilter.length > 0) {
          const placeholders = locationIdsFilter.map(() => '?').join(',')
          cyberSql += ` AND mas.location_id IN (${placeholders})`
          cyberParams.push(...locationIdsFilter)
          console.log(`🔥 [overview] Cyber query cu filtrare pe ${locationIdsFilter.length} locații: [${locationIdsFilter.join(', ')}]`)
        } else {
          console.log(`🔥 [overview] Cyber query FĂRĂ filtrare pe locații (toate locațiile)`)
        }

        console.log(`🔥 [overview] Execut query Cyber:`, cyberSql.replace(/\s+/g, ' ').trim())
        console.log(`🔥 [overview] Parametri Cyber:`, cyberParams)

        const [cyberRows] = await cyberPool.query(cyberSql, cyberParams)
        const cyberRow = cyberRows[0] || {}

        const totalIn = Number(cyberRow.total_in || 0)
        const totalOut = Number(cyberRow.total_out || 0)
        const totalProfit = Number(cyberRow.total_profit || 0)

        console.log(`🔥 [overview] Luna curentă DIN CYBER - Total IN: ${totalIn}`)
        console.log(`🔥 [overview] Luna curentă DIN CYBER - Total OUT: ${totalOut}`)
        console.log(`🔥 [overview] Luna curentă DIN CYBER - Total GGR: ${totalProfit}`)
        console.log(`🔥 [overview] Luna curentă DIN CYBER - Total BET: ${Number(cyberRow.total_bet || 0)}`)
        console.log(`🔥 [overview] Luna curentă DIN CYBER - Total WIN: ${Number(cyberRow.total_win || 0)}`)

        if (totalIn === 0) {
          console.warn(`⚠️ [overview] ATENȚIE: Cyber returnează IN = 0 pentru ${currentMonthStartStr} - ${currentMonthEndStr}`)
        }

        // Returnează în formatul așteptat de formatRow
        return {
          rows: [{
            total_in: totalIn,
            total_out: totalOut,
            total_profit: totalProfit,
            total_bet: Number(cyberRow.total_bet || 0),
            total_win: Number(cyberRow.total_win || 0),
            total_jackpot: Number(cyberRow.total_jackpot || 0),
            total_hh: Number(cyberRow.total_hh || 0),
            total_cb_real: Number(cyberRow.total_cb_real || 0),
            total_cb_birthday: Number(cyberRow.total_cb_birthday || 0),
            total_cb_raffle: Number(cyberRow.total_cb_raffle || 0)
          }]
        }
      } catch (error) {
        console.error('❌ [overview] Eroare la citirea din Cyber pentru luna curentă:', error)
        console.error('❌ [overview] Stack trace:', error.stack)
        console.error(`❌ [overview] Interval: ${currentMonthStartStr} - ${currentMonthEndStr}`)
        // Fallback la PostgreSQL dacă Cyber eșuează
        console.log(`🔄 [overview] Fallback la PostgreSQL pentru luna curentă`)
        return await pool.query(buildMonthSql(currentMonthStartStr, currentMonthEndStr), monthParams(currentMonthStartStr, currentMonthEndStr))
      }
    }

    // Funcție pentru luna trecută din Cyber
    const getLastMonthFromCyber = async () => {
      try {
        console.log(`🔥 [overview] Încep citirea din Cyber pentru luna trecută: ${lastMonthStartStr} - ${lastMonthEndStr}`)
        const cyberPool = await getCyberPool()
        let cyberSql = `
          SELECT
            COALESCE(SUM(mas.in), 0) AS total_in,
            COALESCE(SUM(mas.out), 0) AS total_out,
            COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
            COALESCE(SUM(mas.bet), 0) AS total_bet,
            COALESCE(SUM(mas.win), 0) AS total_win,
            COALESCE(SUM(mas.jackpot), 0) AS total_jackpot,
            COALESCE(SUM(mas.hh), 0) AS total_hh,
            COALESCE(SUM(mas.cb_real), 0) AS total_cb_real,
            COALESCE(SUM(mas.cb_birthday), 0) AS total_cb_birthday,
            COALESCE(SUM(mas.cb_raffle), 0) AS total_cb_raffle
          FROM cyberslot_dbn.machine_audit_summaries mas
          WHERE mas.date >= ? AND mas.date <= ?
        `
        const cyberParams = [lastMonthStartStr, lastMonthEndStr]
        if (locationIdsFilter && locationIdsFilter.length > 0) {
          const placeholders = locationIdsFilter.map(() => '?').join(',')
          cyberSql += ` AND mas.location_id IN (${placeholders})`
          cyberParams.push(...locationIdsFilter)
        }
        const [cyberRows] = await cyberPool.query(cyberSql, cyberParams)
        console.log(`🔥 [overview] Luna trecută DIN CYBER - Total GGR: ${Number(cyberRows[0]?.total_profit || 0)}`)
        return { rows: [cyberRows[0] || {}] }
      } catch (error) {
        console.error('❌ Error fetching last month from Cyber, fallback to PostgreSQL:', error.message)
        return await pool.query(buildMonthSql(lastMonthStartStr, lastMonthEndStr), monthParams(lastMonthStartStr, lastMonthEndStr))
      }
    }

    const [
      currentMonthResult,
      lastMonthResult,
      currentYearResult,
      todayPosResult,
      yesterdayPosResult,
      currentMonthPosResult,
      lastMonthPosResult,
      currentYearPosResult
    ] = await Promise.all([
      getCurrentMonthFromCyber(), // FOLOSIM CYBER pentru luna curentă!
      getLastMonthFromCyber(), // FOLOSIM CYBER pentru luna trecută!
      pool.query(buildMonthSql(currentYearStartStr, currentYearEndStr), monthParams(currentYearStartStr, currentYearEndStr)),
      pool.query(posSqlToday, posParams(todayStr, todayStr)),
      pool.query(posSqlYesterday, posParams(yesterdayStr, yesterdayStr)),
      pool.query(posSqlCurrentMonth, posParams(currentMonthStartStr, currentMonthEndStr)),
      pool.query(posSqlLastMonth, posParams(lastMonthStartStr, lastMonthEndStr)),
      pool.query(posSqlCurrentYear, posParams(currentYearStartStr, currentYearEndStr))
    ])

    console.log(`📊 [overview] Luna curentă - Total IN: ${currentMonthResult.rows[0]?.total_in || 0}`)
    console.log(`📊 [overview] Luna curentă - Total OUT: ${currentMonthResult.rows[0]?.total_out || 0}`)
    console.log(`📊 [overview] Luna curentă - Total GGR: ${currentMonthResult.rows[0]?.total_profit || 0}`)
    console.log(`📊 [overview] Luna curentă - Total BET: ${currentMonthResult.rows[0]?.total_bet || 0}`)
    if (currentMonthResult.rows[0]?.total_in === 0) {
      console.warn(`⚠️ [overview] ATENȚIE: Luna curentă are IN = 0! Verifică dacă există date în incasari_daily pentru ${currentMonthStartStr} - ${currentMonthEndStr}`)
    }

    // Calculate estimated profit for each period (average DAILY profit of last 15 days excluding the period end date)
    const calculateEstimatedProfit = async (endDateStr) => {
      const endDateObj = new Date(endDateStr + 'T00:00:00')
      const endExclusive = new Date(endDateObj)
      endExclusive.setDate(endExclusive.getDate() - 1) // Exclude endDate
      const startDateObj = new Date(endExclusive)
      startDateObj.setDate(startDateObj.getDate() - 15) // Last 15 days before endDate

      const startStr = formatDateLocal(startDateObj)
      const endStr = formatDateLocal(endExclusive)

      // CORECT: Mai întâi calculăm SUM(profit) per zi, apoi facem media zilnică
      const sql = `
        SELECT COALESCE(AVG(daily_profit), 0) AS avg_profit
        FROM (
          SELECT audit_date, SUM(profit) AS daily_profit
          FROM incasari_daily
          WHERE audit_date >= $1 AND audit_date <= $2
          GROUP BY audit_date
        ) daily_sums
      `

      const result = await pool.query(sql, [startStr, endStr])
      return Number(result.rows[0]?.avg_profit || 0)
    }

    const [todayEstimated, yesterdayEstimated, currentMonthEstimated, lastMonthEstimated, currentYearEstimated] = await Promise.all([
      calculateEstimatedProfit(todayStr),
      calculateEstimatedProfit(yesterdayStr),
      calculateEstimatedProfit(currentMonthEndStr),
      calculateEstimatedProfit(lastMonthEndStr),
      calculateEstimatedProfit(currentYearEndStr)
    ])

    const slotsToday = activeSlotsCount
    const slotsYesterday = activeSlotsCount
    const slotsCurrentMonth = activeSlotsCount
    const slotsLastMonth = activeSlotsCount
    const slotsCurrentYear = 0 // Nu afișăm număr de sloturi pentru "Anul curent"

    const formatRow = (row, posRow, slotsCount = 0, estimatedProfit = 0) => {
      const pos = Number(posRow?.rows?.[0]?.total_pos || 0)
      if (!row || row.rows.length === 0) {
        return {
          in: 0,
          out: 0,
          profit: 0,
          bet: 0,
          win: 0,
          jackpot: 0,
          hh: 0,
          cb_real: 0,
          cb_birthday: 0,
          cb_raffle: 0,
          ggr: 0,
          ggrEstimated: estimatedProfit,
          winBetPercent: 0,
          pos,
          slotsCount,
          slots: slotsCount // Alias pentru frontend
        }
      }
      const data = row.rows[0] || {}
      const bet = Number(data.total_bet || 0)
      const win = Number(data.total_win || 0)
      return {
        in: Number(data.total_in || 0),
        out: Number(data.total_out || 0),
        profit: Number(data.total_profit || 0),
        bet,
        win,
        jackpot: Number(data.total_jackpot || 0),
        hh: Number(data.total_hh || 0),
        cb_real: Number(data.total_cb_real || 0),
        cb_birthday: Number(data.total_cb_birthday || 0),
        cb_raffle: Number(data.total_cb_raffle || 0),
        ggr: Number(data.total_profit || 0), // GGR = profit
        ggrEstimated: estimatedProfit,
        winBetPercent: bet > 0 ? (win / bet) * 100 : 0,
        pos,
        slotsCount,
        slots: slotsCount // Alias pentru frontend
      }
    }

    // Calculează datele de comparație
    // Alaltăieri (pentru Ieri)
    const dayBeforeYesterday = new Date(yesterdayDate)
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1)
    const dayBeforeYesterdayStr = formatDateLocal(dayBeforeYesterday)
    const dayBeforeYesterdayResult = await pool.query(buildOverviewSql(dayBeforeYesterdayStr), overviewParams(dayBeforeYesterdayStr))
    const dayBeforeYesterdayPosResult = await buildPosSql(dayBeforeYesterdayStr, dayBeforeYesterdayStr)
    const dayBeforeYesterdayEstimated = 0 // Nu calculăm estimat pentru alaltăieri
    const slotsDayBeforeYesterday = activeSlotsCount

    // Luna precedentă (2 luni în urmă, pentru Luna trecută)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0)
    const previousMonthStartStr = `${previousMonthStart.getFullYear()}-${String(previousMonthStart.getMonth() + 1).padStart(2, '0')}-${String(previousMonthStart.getDate()).padStart(2, '0')}`
    const previousMonthEndStr = `${previousMonthEnd.getFullYear()}-${String(previousMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(previousMonthEnd.getDate()).padStart(2, '0')}`
    const previousMonthResult = await pool.query(buildMonthSql(previousMonthStartStr, previousMonthEndStr), monthParams(previousMonthStartStr, previousMonthEndStr))
    const previousMonthPosResult = await buildPosSql(previousMonthStartStr, previousMonthEndStr)
    const previousMonthEstimated = 0
    const slotsPreviousMonth = activeSlotsCount

    // Aceeași perioadă din anul trecut (pentru Anul curent)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
    const lastYearStartStr = `${lastYearStart.getFullYear()}-${String(lastYearStart.getMonth() + 1).padStart(2, '0')}-${String(lastYearStart.getDate()).padStart(2, '0')}`
    const lastYearEndStr = `${lastYearEnd.getFullYear()}-${String(lastYearEnd.getMonth() + 1).padStart(2, '0')}-${String(lastYearEnd.getDate()).padStart(2, '0')}`

    // Calculăm aceeași perioadă de zile din anul trecut (de la 1 ianuarie până la data de azi)
    const daysPassedThisYear = Math.floor((now - currentYearStart) / (1000 * 60 * 60 * 24)) + 1
    const lastYearPeriodEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const lastYearPeriodEndStr = formatDateLocal(lastYearPeriodEnd)
    const lastYearResult = await pool.query(buildMonthSql(lastYearStartStr, lastYearPeriodEndStr), monthParams(lastYearStartStr, lastYearPeriodEndStr))
    const lastYearPosResult = await buildPosSql(lastYearStartStr, lastYearPeriodEndStr)
    const lastYearEstimated = 0
    const slotsLastYear = activeSlotsCount

    // Aceleași zile din luna trecută (pentru Luna curentă)
    const daysInCurrentMonth = now.getDate()
    const sameDaysLastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const sameDaysLastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, daysInCurrentMonth)
    const sameDaysLastMonthStartStr = formatDateLocal(sameDaysLastMonthStart)
    const sameDaysLastMonthEndStr = formatDateLocal(sameDaysLastMonthEnd)
    const sameDaysLastMonthResult = await pool.query(buildMonthSql(sameDaysLastMonthStartStr, sameDaysLastMonthEndStr), monthParams(sameDaysLastMonthStartStr, sameDaysLastMonthEndStr))
    const sameDaysLastMonthPosResult = await buildPosSql(sameDaysLastMonthStartStr, sameDaysLastMonthEndStr)
    const sameDaysLastMonthEstimated = 0
    const slotsSameDaysLastMonth = activeSlotsCount

    return res.json({
      success: true,
      today: formatRow(todayResult, todayPosResult, slotsToday, todayEstimated),
      yesterday: formatRow(yesterdayResult, yesterdayPosResult, slotsYesterday, yesterdayEstimated),
      currentMonth: formatRow(currentMonthResult, currentMonthPosResult, slotsCurrentMonth, currentMonthEstimated),
      lastMonth: formatRow(lastMonthResult, lastMonthPosResult, slotsLastMonth, lastMonthEstimated),
      currentYear: formatRow(currentYearResult, currentYearPosResult, slotsCurrentYear, currentYearEstimated),
      // Date de comparație
      dayBeforeYesterday: formatRow(dayBeforeYesterdayResult, dayBeforeYesterdayPosResult, slotsDayBeforeYesterday, dayBeforeYesterdayEstimated),
      previousMonth: formatRow(previousMonthResult, previousMonthPosResult, slotsPreviousMonth, previousMonthEstimated),
      lastYear: formatRow(lastYearResult, lastYearPosResult, slotsLastYear, lastYearEstimated),
      sameDaysLastMonth: formatRow(sameDaysLastMonthResult, sameDaysLastMonthPosResult, slotsSameDaysLastMonth, sameDaysLastMonthEstimated)
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/overview:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul overview-ului de încasări'
    })
  }
})

// GET /api/incasari/debug-day?date=YYYY-MM-DD
// Endpoint de debug care arată EXACT ce există în incasari_daily pentru o zi:
//  - totaluri pe zi
//  - agregat pe locații
//  - top 100 aparate după IN
router.get('/debug-day', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { date } = req.query
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește parametrul obligatoriu "date" (YYYY-MM-DD)'
      })
    }

    const totalsSql = `
      SELECT
        COALESCE(SUM(in_amount), 0) AS total_in,
        COALESCE(SUM(out_amount), 0) AS total_out,
        COALESCE(SUM(profit), 0) AS total_profit,
        COALESCE(SUM(bet), 0) AS total_bet,
        COALESCE(SUM(win), 0) AS total_win,
        COALESCE(SUM(jackpot), 0) AS total_jackpot,
        COALESCE(SUM(hh), 0) AS total_hh,
        COALESCE(SUM(cb_real), 0) AS total_cb_real,
        COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
        COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle,
        COUNT(*) AS rows_count,
        COUNT(DISTINCT machine_id) AS machines_count,
        COUNT(DISTINCT location_id) AS locations_count
      FROM incasari_daily
      WHERE audit_date = $1
    `

    const byLocationSql = `
      SELECT
        location_id,
        COUNT(*) AS rows_count,
        COUNT(DISTINCT machine_id) AS machines_count,
        COALESCE(SUM(in_amount), 0) AS total_in,
        COALESCE(SUM(out_amount), 0) AS total_out,
        COALESCE(SUM(profit), 0) AS total_profit
      FROM incasari_daily
      WHERE audit_date = $1
      GROUP BY location_id
      ORDER BY total_in DESC
    `

    const topMachinesSql = `
      SELECT
        machine_id,
        location_id,
        serial_number,
        COALESCE(in_amount, 0) AS in_amount,
        COALESCE(out_amount, 0) AS out_amount,
        COALESCE(profit, 0) AS profit
      FROM incasari_daily
      WHERE audit_date = $1
      ORDER BY in_amount DESC
      LIMIT 100
    `

    const [totalsResult, byLocationResult, topMachinesResult] = await Promise.all([
      pool.query(totalsSql, [date]),
      pool.query(byLocationSql, [date]),
      pool.query(topMachinesSql, [date])
    ])

    return res.json({
      success: true,
      date,
      totals: totalsResult.rows[0] || null,
      byLocation: byLocationResult.rows || [],
      topMachines: topMachinesResult.rows || []
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/debug-day:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la debug-day pentru încasări'
    })
  }
})

// GET /api/incasari/compare-cyber?date=YYYY-MM-DD
// Compară direct suma din Postgres (incasari_daily) cu suma brută din Cyber (MariaDB)
router.get('/compare-cyber', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { date } = req.query
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește parametrul obligatoriu "date" (YYYY-MM-DD)'
      })
    }

    // 1) Suma din Postgres (incasari_daily)
    const pgSql = `
      SELECT
        COALESCE(SUM(in_amount), 0) AS total_in,
        COALESCE(SUM(out_amount), 0) AS total_out,
        COALESCE(SUM(profit), 0) AS total_profit,
        COUNT(*) AS rows_count,
        COUNT(DISTINCT machine_id) AS machines_count
      FROM incasari_daily
      WHERE audit_date = $1
    `
    const pgResult = await pool.query(pgSql, [date])
    const pgRow = pgResult.rows[0] || {
      total_in: 0,
      total_out: 0,
      total_profit: 0,
      rows_count: 0,
      machines_count: 0
    }

    // 2) Suma brută direct din Cyber (MariaDB)
    const cyberPool = await getCyberPool()
    const [cyberRows] = await cyberPool.query(
      `
      SELECT
        COALESCE(SUM(mas.in), 0) AS total_in,
        COALESCE(SUM(mas.out), 0) AS total_out,
        COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
        COUNT(*) AS rows_count,
        COUNT(DISTINCT mas.machine_id) AS machines_count
      FROM cyberslot_dbn.machine_audit_summaries mas
      WHERE mas.date = ?
      `,
      [date]
    )
    const cyberRow = cyberRows[0] || {
      total_in: 0,
      total_out: 0,
      total_profit: 0,
      rows_count: 0,
      machines_count: 0
    }

    return res.json({
      success: true,
      date,
      postgres: {
        total_in: Number(pgRow.total_in || 0),
        total_out: Number(pgRow.total_out || 0),
        total_profit: Number(pgRow.total_profit || 0),
        rows_count: Number(pgRow.rows_count || 0),
        machines_count: Number(pgRow.machines_count || 0)
      },
      cyber: {
        total_in: Number(cyberRow.total_in || 0),
        total_out: Number(cyberRow.total_out || 0),
        total_profit: Number(cyberRow.total_profit || 0),
        rows_count: Number(cyberRow.rows_count || 0),
        machines_count: Number(cyberRow.machines_count || 0)
      },
      diff: {
        in: Number(pgRow.total_in || 0) - Number(cyberRow.total_in || 0),
        out: Number(pgRow.total_out || 0) - Number(cyberRow.total_out || 0),
        profit: Number(pgRow.total_profit || 0) - Number(cyberRow.total_profit || 0)
      }
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/compare-cyber:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la compare-cyber pentru încasări'
    })
  }
})

// VARIANTĂ FĂRĂ AUTENTIFICARE, DOAR PENTRU DEBUG LOCAL
// GET /api/incasari/compare-cyber-open?date=YYYY-MM-DD
router.get('/compare-cyber-open', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { date } = req.query
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește parametrul obligatoriu \"date\" (YYYY-MM-DD)'
      })
    }

    const pgSql = `
      SELECT
        COALESCE(SUM(in_amount), 0) AS total_in,
        COALESCE(SUM(out_amount), 0) AS total_out,
        COALESCE(SUM(profit), 0) AS total_profit,
        COUNT(*) AS rows_count,
        COUNT(DISTINCT machine_id) AS machines_count
      FROM incasari_daily
      WHERE audit_date = $1
    `
    const pgResult = await pool.query(pgSql, [date])
    const pgRow = pgResult.rows[0] || {
      total_in: 0,
      total_out: 0,
      total_profit: 0,
      rows_count: 0,
      machines_count: 0
    }

    const cyberPool = await getCyberPool()
    const [cyberRows] = await cyberPool.query(
      `
      SELECT
        COALESCE(SUM(mas.in), 0) AS total_in,
        COALESCE(SUM(mas.out), 0) AS total_out,
        COALESCE(SUM(mas.in - mas.out), 0) AS total_profit,
        COUNT(*) AS rows_count,
        COUNT(DISTINCT mas.machine_id) AS machines_count
      FROM cyberslot_dbn.machine_audit_summaries mas
      WHERE mas.date = ?
      `,
      [date]
    )
    const cyberRow = cyberRows[0] || {
      total_in: 0,
      total_out: 0,
      total_profit: 0,
      rows_count: 0,
      machines_count: 0
    }

    return res.json({
      success: true,
      date,
      postgres: {
        total_in: Number(pgRow.total_in || 0),
        total_out: Number(pgRow.total_out || 0),
        total_profit: Number(pgRow.total_profit || 0),
        rows_count: Number(pgRow.rows_count || 0),
        machines_count: Number(pgRow.machines_count || 0)
      },
      cyber: {
        total_in: Number(cyberRow.total_in || 0),
        total_out: Number(cyberRow.total_out || 0),
        total_profit: Number(cyberRow.total_profit || 0),
        rows_count: Number(cyberRow.rows_count || 0),
        machines_count: Number(cyberRow.machines_count || 0)
      },
      diff: {
        in: Number(pgRow.total_in || 0) - Number(cyberRow.total_in || 0),
        out: Number(pgRow.total_out || 0) - Number(cyberRow.total_out || 0),
        profit: Number(pgRow.total_profit || 0) - Number(cyberRow.total_profit || 0)
      }
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/compare-cyber-open:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la compare-cyber-open pentru încasări'
    })
  }
})

// GET /api/incasari/dynamics
// Returnează dinamica IN și Profit: perioada selectată vs aceleași zile din luna trecută
router.get('/dynamics', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { startDate, endDate, location, provider, cabinet, gameMix, includeLocations } = req.query

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    // Dacă avem startDate și endDate, folosim perioada selectată
    // Altfel, folosim luna curentă (comportament vechi pentru backward compatibility)
    let currentStartStr, currentEndStr, lastStartStr, lastEndStr

    if (startDate && endDate) {
      // Folosim perioada selectată
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Calculează aceleași zile din luna trecută
      const lastStart = new Date(start.getFullYear(), start.getMonth() - 1, start.getDate())
      const lastEnd = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate())

      currentStartStr = startDate
      currentEndStr = endDate
      lastStartStr = `${lastStart.getFullYear()}-${String(lastStart.getMonth() + 1).padStart(2, '0')}-${String(lastStart.getDate()).padStart(2, '0')}`
      lastEndStr = `${lastEnd.getFullYear()}-${String(lastEnd.getMonth() + 1).padStart(2, '0')}-${String(lastEnd.getDate()).padStart(2, '0')}`
    } else {
      // Comportament vechi: luna curentă
      const today = new Date()
      const currentHour = today.getHours()
      let currentDay
      if (currentHour >= 8) {
        currentDay = today.getDate()
      } else {
        currentDay = today.getDate() - 1
      }
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const currentMonthEnd = new Date(today.getFullYear(), today.getMonth(), currentDay)
      currentStartStr = `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}-${String(currentMonthStart.getDate()).padStart(2, '0')}`
      currentEndStr = `${currentMonthEnd.getFullYear()}-${String(currentMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(currentMonthEnd.getDate()).padStart(2, '0')}`

      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth() - 1, currentDay)
      lastStartStr = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}-${String(lastMonthStart.getDate()).padStart(2, '0')}`
      lastEndStr = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`
    }

    let dynamicsSql
    let currentParams, lastParams

    // Dacă avem activeIds, folosim filtrarea pe machine_id
    if (activeIds && activeIds.length > 0) {
      dynamicsSql = `
        SELECT
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(profit), 0) AS total_profit
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
          AND machine_id = ANY($3)
      `
      currentParams = [currentStartStr, currentEndStr, activeIds]
      lastParams = [lastStartStr, lastEndStr, activeIds]
    } else {
      // Dacă nu avem activeIds, afișăm toate datele disponibile (fără filtrare pe machine_id)
      dynamicsSql = `
        SELECT
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(profit), 0) AS total_profit
        FROM incasari_daily
        WHERE audit_date BETWEEN $1 AND $2
      `
      currentParams = [currentStartStr, currentEndStr]
      lastParams = [lastStartStr, lastEndStr]
    }

    const [currentResult, lastResult] = await Promise.all([
      pool.query(dynamicsSql, currentParams),
      pool.query(dynamicsSql, lastParams)
    ])

    const currentIn = Number(currentResult.rows[0]?.total_in || 0)
    const currentProfit = Number(currentResult.rows[0]?.total_profit || 0)
    const lastIn = Number(lastResult.rows[0]?.total_in || 0)
    const lastProfit = Number(lastResult.rows[0]?.total_profit || 0)

    const inChange = lastIn > 0 ? Math.round(((currentIn - lastIn) / lastIn) * 100) : 0
    const profitChange = lastProfit > 0 ? Math.round(((currentProfit - lastProfit) / lastProfit) * 100) : 0

    return res.json({
      success: true,
      currentMonthDays: { in: currentIn, profit: currentProfit },
      lastMonthSameDays: { in: lastIn, profit: lastProfit },
      inChange,
      profitChange
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/dynamics:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul dinamicii de încasări'
    })
  }
})

// GET /api/incasari/location-daily?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// PONT de P&L: agregă IN / OUT / GGR pe ZI + LOCAȚIE din incasari_daily
// (vom adăuga ulterior și cheltuielile din expenditures_sync pe aceeași cheie)
router.get('/location-daily', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { startDate, endDate, includeLocations } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    let locationsArray
    if (typeof includeLocations === 'string' && includeLocations.length > 0) {
      locationsArray = includeLocations
        .split(',')
        .map((s) => normalizeLocationName(s))
        .filter(Boolean)
    }

    // Limităm la locațiile vizibile, dacă sunt setate
    let locationIdsFilter = null
    if (Array.isArray(locationsArray) && locationsArray.length > 0) {
      const activeSlots = getActiveSlots()
      const allowed = new Set(locationsArray)
      const locationIds = new Set()
      activeSlots.forEach((slot) => {
        if (
          slot &&
          slot.location &&
          allowed.has(normalizeLocationName(slot.location)) &&
          slot.location_id
        ) {
          locationIds.add(Number(slot.location_id))
        }
      })
      if (locationIds.size > 0) {
        locationIdsFilter = Array.from(locationIds)
      }
    }

    const baseSql = `
      SELECT
        i.audit_date AS date,
        i.location_id,
        l.name AS location_name,
        COALESCE(SUM(i.in_amount), 0) AS total_in,
        COALESCE(SUM(i.out_amount), 0) AS total_out,
        COALESCE(SUM(i.profit), 0) AS total_profit
      FROM incasari_daily i
      LEFT JOIN locations l ON i.location_id = l.id
      WHERE i.audit_date BETWEEN $1 AND $2
    `

    const sql = locationIdsFilter
      ? `${baseSql} AND i.location_id = ANY($3) GROUP BY i.audit_date, i.location_id, l.name ORDER BY i.audit_date, l.name`
      : `${baseSql} GROUP BY i.audit_date, i.location_id, l.name ORDER BY i.audit_date, l.name`

    const params = locationIdsFilter ? [startDate, endDate, locationIdsFilter] : [startDate, endDate]
    const result = await pool.query(sql, params)

    return res.json({
      success: true,
      startDate,
      endDate,
      rows: result.rows || []
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/location-daily:', error)
    console.error('Stack trace:', error.stack)
    console.error('Request params:', { startDate, endDate, includeLocations })
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la agregarea datelor pe zi + locație',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// GET /api/incasari/pos-data
// Returnează date POS din expenditures_sync pentru un interval de date.
// - Dacă nu se trimit filtre → toate locațiile
// - Dacă se trimit `location` / `includeLocations` → filtrează pe aceste locații
router.get('/pos-data', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru expenditures_sync'
      })
    }

    const { startDate, endDate, location, includeLocations } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    // Construim lista de locații pentru filtrare (dacă este cazul)
    let locationsArray
    if (typeof includeLocations === 'string' && includeLocations.length > 0) {
      locationsArray = includeLocations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (location && location !== 'all') {
      // Dacă există și location explicit, îl folosim cu prioritate
      locationsArray = [location]
    }

    // Sumă pe zi pentru POS:
    //  - POS poate fi setat fie în `expenditure_type`, fie în `department_name`,
    //    așa că le luăm pe ambele ca să nu ratăm înregistrări.
    //  - Folosim DATE() pentru comparație corectă și gestionăm NULL-urile.
    let sql = `
      SELECT
        DATE(operational_date) AS date,
        COALESCE(SUM(amount), 0) AS total_pos
      FROM expenditures_sync
      WHERE DATE(operational_date) BETWEEN DATE($1::text) AND DATE($2::text)
        AND (
          (expenditure_type IS NOT NULL AND UPPER(TRIM(expenditure_type)) = 'POS')
          OR (department_name IS NOT NULL AND UPPER(TRIM(department_name)) = 'POS')
        )
    `

    const params = [startDate, endDate]
    if (locationsArray && locationsArray.length > 0) {
      // Filtrare pe locații, dacă este cazul
      sql += ' AND location_name = ANY($3)'
      params.push(locationsArray)
    }

    sql += `
      GROUP BY DATE(operational_date)
      ORDER BY DATE(operational_date)
    `

    const result = await pool.query(sql, params)

    return res.json({
      success: true,
      startDate,
      endDate,
      rows: result.rows || []
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/pos-data:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul datelor POS'
    })
  }
})

// GET /api/incasari/floorplan-data
// Returnează date agregate pe sloturi pentru o locație (pentru floorplan SVG)
router.get('/floorplan-data', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { location, startDate, endDate } = req.query

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește parametrul location'
      })
    }
    ensureDateRange(startDate, endDate)

    // Pentru floorplan folosim DOAR sloturi ACTIVE în locația selectată
    const slots = getActiveSlots()
      .filter((slot) => slot && (slot.location || '') === location)
      .filter((slot) => {
        const rawStatus = (slot.status || '').toString().toLowerCase().trim()
        if (rawStatus.includes('inactiv')) return false
        if (!rawStatus.includes('activ')) return false
        return true
      })

    if (!slots || slots.length === 0) {
      return res.json({
        success: true,
        location,
        startDate,
        endDate,
        tiles: []
      })
    }

    const machineIds = slots
      .map((s) => Number(s.id))
      .filter((id) => Number.isFinite(id))

    if (machineIds.length === 0) {
      return res.json({
        success: true,
        location,
        startDate,
        endDate,
        tiles: []
      })
    }

    const sql = `
      SELECT
        machine_id,
        COALESCE(SUM(in_amount), 0) AS total_in,
        COALESCE(SUM(profit), 0) AS total_profit,
        COALESCE(SUM(bet), 0) AS total_bet,
        COUNT(DISTINCT audit_date) AS days_count
      FROM incasari_daily
      WHERE audit_date BETWEEN $1 AND $2
        AND machine_id = ANY($3)
      GROUP BY machine_id
    `

    const result = await pool.query(sql, [startDate, endDate, machineIds])

    // Mapăm și "order"-ul (numărul de ordine din sală) din tabela machines din Cyber
    const cyberPool = await getCyberPool()
    let orderMap = new Map()
    if (machineIds.length > 0) {
      const placeholders = machineIds.map(() => '?').join(',')
      const [orderRows] = await cyberPool.query(
        `
        SELECT id, \`order\` AS machine_order
        FROM cyberslot_dbn.machines
        WHERE id IN (${placeholders})
        `,
        machineIds
      )
      orderMap = new Map(
        orderRows.map((r) => [Number(r.id), Number(r.machine_order || 0) || null])
      )
    }

    const aggMap = new Map()
    const machineIdsWithData = new Set()
    result.rows.forEach((row) => {
      const id = Number(row.machine_id)
      const daysCount = Number(row.days_count || 0)
      aggMap.set(id, {
        totalIn: Number(row.total_in || 0),
        totalGgr: Number(row.total_profit || 0),
        totalBet: Number(row.total_bet || 0),
        daysCount
      })
      if (daysCount > 0) {
        machineIdsWithData.add(id)
      }
    })

    const allowedMachineIds = new Set(orderMap.keys())

    const tiles = slots
      // doar aparatele care:
      // 1) au avut cel puțin o zi cu date în perioada selectată
      // 2) au avut cel puțin o încasare (totalIn > 0) - NU sloturi cu drop zero
      // 3) există în tabela machines din Cyber (au un id de aparat real în sală)
      .filter((slot) => {
        const id = Number(slot.id)
        if (!Number.isFinite(id)) return false
        if (!machineIdsWithData.has(id)) return false
        if (allowedMachineIds.size > 0 && !allowedMachineIds.has(id)) return false

        // FILTRU IMPORTANT: Excludem sloturile cu totalIn = 0 (nu au avut nicio încasare)
        const agg = aggMap.get(id)
        if (!agg || agg.totalIn <= 0) return false

        return true
      })
      .map((slot) => {
        const id = Number(slot.id)
        const agg = aggMap.get(id) || {
          totalIn: 0,
          totalGgr: 0,
          totalBet: 0,
          daysCount: 0
        }
        const avgDrop =
          agg.daysCount > 0 ? agg.totalIn / agg.daysCount : 0
        return {
          machineId: id,
          serialNumber: slot.serial_number || slot.name || `Slot ${id}`,
          name: slot.name || slot.serial_number || `Slot ${id}`,
          provider: slot.provider || null,
          cabinet: slot.cabinet || null,
          gameMix: slot.game_mix || null,
          location: slot.location || null,
          totalIn: agg.totalIn,
          totalGgr: agg.totalGgr,
          totalBet: agg.totalBet,
          daysCount: agg.daysCount,
          avgDrop,
          order: orderMap.get(id) || null
        }
      })

    return res.json({
      success: true,
      location,
      startDate,
      endDate,
      tiles
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/floorplan-data:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la agregarea datelor pentru floorplan'
    })
  }
})

// Helper function pentru a obține filtrele din setări (similar cu expenditures.js)
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
        SELECT role, preferences
        FROM users
        WHERE id = $1
      `,
      [userId]
    )

    if (settingsResult.rows.length === 0) return result

    const userRecord = settingsResult.rows[0]
    const userRole = userRecord.role
    const preferences = userRecord.preferences?.expendituresSettings

    // PENTRU LOCAȚII: Păstrăm preferințele userului (dacă există)
    if (preferences && Array.isArray(preferences.includedLocations) && preferences.includedLocations.length > 0) {
      result.locations = preferences.includedLocations.filter(Boolean)
    }

    // PENTRU DEPARTAMENTE ȘI TIPURI:
    // Dacă NU este admin, FORȚĂM setările ADMINULUI (ID 1).
    // Astfel, userii obișnuiți văd exact ce a filtrat Adminul în contul său.
    if (userRole !== 'admin') {
      console.log(`🔒 [P&L] User ${userId} is (${userRole}). FORCING Admin (ID 1) Settings.`)

      try {
        const adminSettingsResult = await pool.query(`
          SELECT preferences 
          FROM users 
          WHERE id = 1
        `)

        if (adminSettingsResult.rows.length > 0) {
          const adminPref = adminSettingsResult.rows[0].preferences?.expendituresSettings

          if (adminPref) {
            if (Array.isArray(adminPref.includedDepartments)) {
              result.departments = adminPref.includedDepartments.filter(Boolean)
            }
            if (Array.isArray(adminPref.includedExpenditureTypes)) {
              result.types = adminPref.includedExpenditureTypes.filter(Boolean)
            }
          }
        }
      } catch (adminErr) {
        console.error('⚠️ [P&L] Failed to load Admin settings:', adminErr.message)
      }
      return result // Returnăm aici pentru non-admini
    }

    // PENTRU ADMINI: Folosim preferințele personale dacă există, altfel fallback la Global (mai jos)
    if (preferences) {
      if (Array.isArray(preferences.includedDepartments) && preferences.includedDepartments.length > 0) {
        result.departments = preferences.includedDepartments.filter(Boolean)
      }
      if (Array.isArray(preferences.includedExpenditureTypes) && preferences.includedExpenditureTypes.length > 0) {
        result.types = preferences.includedExpenditureTypes.filter(Boolean)
      }
    }
    // 4. FALLBACK: Dacă nu există filtre personale (user nou sau neconfigurat), 
    // încărcăm setările GLOBALE (cele setate de Admin în Sincronizare)
    // Astfel, userii văd direct ce a configurat Adminul, nu "totul" (sume astronomice).
    // EXCEPTIE: ADMINII trebuie să vadă TOTUL dacă nu au filtre personale setate!
    if (!result.departments || !result.types) {
      // CRITICAL FIX: Skip fallback for admins to match Expenditures page behavior
      if (userRole === 'admin') {
        console.log(`🌍 [P&L] User ${userId} is ADMIN and has no personal filters. NOT using global fallback (Showing ALL).`)
        return result
      }

      try {
        const globalResult = await pool.query(`
          SELECT setting_value 
          FROM global_settings 
          WHERE setting_key = 'expenditures_sync_config'
        `)

        if (globalResult.rows.length > 0 && globalResult.rows[0].setting_value) {
          const globalConfig = typeof globalResult.rows[0].setting_value === 'string'
            ? JSON.parse(globalResult.rows[0].setting_value)
            : globalResult.rows[0].setting_value

          // Fallback pentru departamente
          if (!result.departments && Array.isArray(globalConfig.includedDepartments) && globalConfig.includedDepartments.length > 0) {
            console.log(`🌍 [P&L] User ${userId} has no department filters. Using GLOBAL defaults.`)
            result.departments = globalConfig.includedDepartments.filter(Boolean)
          }

          // Fallback pentru tipuri cheltuieli
          if (!result.types && Array.isArray(globalConfig.includedExpenditureTypes) && globalConfig.includedExpenditureTypes.length > 0) {
            console.log(`🌍 [P&L] User ${userId} has no type filters. Using GLOBAL defaults.`)
            result.types = globalConfig.includedExpenditureTypes.filter(Boolean)
          }
        }
      } catch (globalErr) {
        console.error('⚠️ [P&L] Failed to load global fallback settings:', globalErr.message)
      }
    }
  } catch (error) {
    console.error('Error loading expenditures settings for location-expenditures:', error)
  }

  return result
}

// GET /api/incasari/location-expenditures
// Returnează cheltuieli totale pe locație pentru un interval de date (pentru P&L per locație)
// APLICĂ FILTRELE DIN SETĂRI (departamente și tipuri incluse)
router.get('/location-expenditures', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru expenditures_sync'
      })
    }

    const { startDate, endDate, includeLocations } = req.query
    const userId = req.user?.userId || req.user?.id

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Lipsește startDate sau endDate'
      })
    }

    // Obține filtrele din setări
    const includedFilters = await getIncludedFiltersForUser(pool, userId)

    console.log(`🔍 [location-expenditures] User ID: ${userId}`)
    console.log(`🔍 [location-expenditures] Filtre obținute:`, {
      departments: includedFilters.departments?.length || 0,
      types: includedFilters.types?.length || 0,
      locations: includedFilters.locations?.length || 0
    })
    if (includedFilters.departments && includedFilters.departments.length > 0) {
      console.log(`🔍 [location-expenditures] Primele 5 departamente:`, includedFilters.departments.slice(0, 5))
    }
    if (includedFilters.types && includedFilters.types.length > 0) {
      console.log(`🔍 [location-expenditures] Primele 5 tipuri:`, includedFilters.types.slice(0, 5))
    }

    let locationsArray
    if (typeof includeLocations === 'string' && includeLocations.length > 0) {
      locationsArray = includeLocations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }

    // Calculează cheltuielile folosind filtrele din setări

    // Normalizare text (IDENTICĂ cu cea din expenditures.js)
    const normalizeText = (text) => {
      if (!text) return ''
      return String(text).trim()
        .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    }

    let sql = `
      SELECT
        COALESCE(location_name, 'Nespecificat') AS location_name,
        COALESCE(SUM(amount), 0) AS total_expenditures
      FROM expenditures_sync
      WHERE DATE(operational_date) BETWEEN DATE($1::text) AND DATE($2::text)
        AND (normalized_department_name NOT IN ('unknown', 'null', ''))
    `

    const params = [startDate, endDate]
    let paramIndex = 3

    // APLICĂ FILTRELE DIN SETĂRI: Doar departamentele incluse
    if (includedFilters.departments && includedFilters.departments.length > 0) {
      const normalizedDepartments = includedFilters.departments.map(normalizeText).filter(Boolean)
      sql += ` AND normalized_department_name = ANY($${paramIndex}::text[])`
      params.push(normalizedDepartments)
      paramIndex++
    }

    // APLICĂ FILTRELE DIN SETĂRI: Doar tipurile incluse
    if (includedFilters.types && includedFilters.types.length > 0) {
      const normalizedTypes = includedFilters.types.map(normalizeText).filter(Boolean)
      // Excepție Salarii
      sql += ` AND (normalized_department_name = 'salarii' OR normalized_expenditure_type = ANY($${paramIndex}::text[]))`
      params.push(normalizedTypes)
      paramIndex++
    }

    // APLICĂ FILTRELE DIN SETĂRI: Doar locațiile incluse (dacă nu sunt specificate explicit în includeLocations)
    if (!locationsArray && includedFilters.locations && includedFilters.locations.length > 0) {
      const normalizedLocations = includedFilters.locations.map(normalizeText).filter(Boolean)
      sql += ` AND normalized_location_name = ANY($${paramIndex}::text[])`
      params.push(normalizedLocations)
      paramIndex++
    }

    // Dacă sunt specificate locații explicit în includeLocations, folosim doar pe acelea
    if (locationsArray && locationsArray.length > 0) {
      const normalizedLocationsArray = locationsArray.map(normalizeText).filter(Boolean)
      sql += ` AND normalized_location_name = ANY($${paramIndex}::text[])`
      params.push(normalizedLocationsArray)
      paramIndex++
    }

    sql += `
      GROUP BY COALESCE(location_name, 'Nespecificat')
      ORDER BY COALESCE(location_name, 'Nespecificat')
    `

    const result = await pool.query(sql, params)

    console.log(`📊 [location-expenditures] Filtre aplicate: departments=${includedFilters.departments?.length || 'all'}, types=${includedFilters.types?.length || 'all'}, rows=${result.rows.length}`)

    return res.json({
      success: true,
      startDate,
      endDate,
      rows: result.rows || []
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/location-expenditures:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la agregarea cheltuielilor pe locație'
    })
  }
})

// GET /api/incasari/monthly-by-location - Date lunare grupate pe ani, luni și locații
router.get('/monthly-by-location', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available'
      })
    }

    const { location, provider, cabinet, gameMix, includeLocations } = req.query
    const userId = req.user?.userId || req.user?.id

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    // Get user's included filters from settings (same as dashboard)
    const includedFilters = await getIncludedFiltersForUser(pool, userId)

    // CRITICAL FIX: If user is NOT admin and has NO location filters (either from query or settings), 
    // we MUST return empty result. Do NOT show all locations by default for restricted users.
    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin && (!locationsArray || locationsArray.length === 0) && (!includedFilters.locations || includedFilters.locations.length === 0)) {
      console.warn(`🛑 [monthly-by-location] BLOCKED: Non-admin user ${userId} has no location filters. Returning empty.`)
      return res.json({
        success: true,
        data: [],
        total: { revenue: 0, expenses: 0, profit: 0, margin: 0 }
      })
    }

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    let sql
    let params

    // Query OPTIMIZAT pentru date lunare grupate pe an, lună și locație
    // Folosește DATE_TRUNC pentru performanță mai bună și limitează la ultimii 2 ani (optimizat pentru viteză)
    const currentYear = new Date().getFullYear()
    const startYear = 2024 // STRICT FILTER: User requested data ONLY from 2024 onwards

    console.log(`🔍 [monthly-by-location] activeIds count: ${activeIds?.length || 0}`)

    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          EXTRACT(YEAR FROM audit_date)::INTEGER AS year,
          EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
          location_id,
          COALESCE(SUM(profit), 0) AS total_ggr,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cashback_real,
          COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
          COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE machine_id = ANY($1)
          AND audit_date >= $2::date
        GROUP BY EXTRACT(YEAR FROM audit_date), EXTRACT(MONTH FROM audit_date), location_id
        ORDER BY year DESC, month DESC, location_id
      `
      params = [activeIds, `${startYear}-01-01`]
    } else {
      // Fallback: Dacă nu avem activeIds, dar avem includeLocations, încercăm să filtrăm după location_id mapate din locations.json
      let locationFilterClause = ''
      const fallbackParams = [`${startYear}-01-01`]

      if (locationsArray && locationsArray.length > 0) {
        // Încarcă locațiile pentru a găsi ID-urile corespunzătoare numelor solicitate
        const locs = loadExportedData('locations.json')
        const targetIds = locs
          .filter(l => locationsArray.includes(normalizeLocationName(l.name || l.location)))
          .map(l => l.id)
          .filter(id => id !== undefined && id !== null)

        if (targetIds.length > 0) {
          locationFilterClause = ` AND location_id = ANY($2::integer[])`
          fallbackParams.push(targetIds)
          console.log(`🔍 [monthly-by-location] Fallback filtering by location_ids: ${targetIds.join(', ')}`)
        }
      }

      sql = `
        SELECT
          EXTRACT(YEAR FROM audit_date)::INTEGER AS year,
          EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
          location_id,
          COALESCE(SUM(profit), 0) AS total_ggr,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cashback_real,
          COALESCE(SUM(cb_birthday), 0) AS total_cb_birthday,
          COALESCE(SUM(cb_raffle), 0) AS total_cb_raffle,
          COUNT(DISTINCT serial_number) AS slots_count
        FROM incasari_daily
        WHERE audit_date >= $1::date ${locationFilterClause}
        GROUP BY EXTRACT(YEAR FROM audit_date), EXTRACT(MONTH FROM audit_date), location_id
        ORDER BY year DESC, month DESC, location_id
      `
      params = fallbackParams
    }

    // Prevent caching logic conflicts
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    res.set('Surrogate-Control', 'no-store')

    // --- CACHE LOGIC START ---
    // --- CACHE LOGIC START ---
    const cacheParams = {
      userId,
      location, provider, cabinet, gameMix, includeLocations,
      startYear, // cache depends on start year
      // CRITICAL: Include active filters in cache key!
      // This ensures that if filters change (or are enforced differently), a new cache entry is created.
      filters: {
        d: includedFilters.departments ? includedFilters.departments.length : 0,
        t: includedFilters.types ? includedFilters.types.length : 0,
        // Include a simple hash/string of the first few to catch changes
        s: (includedFilters.departments || []).slice(0, 3).join(',')
      }
    }
    const cacheKeyString = JSON.stringify(cacheParams)
    const cacheHash = crypto.createHash('md5').update(cacheKeyString).digest('hex')
    const cacheKey = `incasari_monthly_v2_${cacheHash}`

    try {
      // Check cache (valid for 1 hour)
      const cacheResult = await pool.query(`
        SELECT data FROM incasari_monthly_cache 
        WHERE cache_key = $1 
          AND created_at > NOW() - INTERVAL '1 hour'
      `, [cacheKey])

      if (cacheResult.rows.length > 0) {
        console.log(`⚡ [monthly-by-location] CACHE HIT (${cacheKey})`)
        return res.json(cacheResult.rows[0].data)
      }
    } catch (err) {
      console.warn('⚠️ Cache check failed:', err.message)
    }
    // --- CACHE LOGIC END ---

    console.log('📊 [monthly-by-location] Executare query optimizat pentru ultimii 2 ani (CACHE MISS)...')
    const startTime = Date.now()
    const result = await pool.query(sql, params)
    console.log(`✅ [monthly-by-location] Query incasari_daily completat în ${Date.now() - startTime}ms, ${result.rows.length} rânduri`)

    // Încarcă datele pentru locații
    let locationsData = []
    try {
      locationsData = loadExportedData('locations.json')
      if (!Array.isArray(locationsData)) {
        locationsData = []
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea locations.json:', error)
      locationsData = []
    }

    const locationMap = new Map()
    // Normalization Map: normalized -> Official Name
    const normalizedToOfficialMap = new Map()

    locationsData.forEach((loc) => {
      if (loc && typeof loc.id !== 'undefined') {
        let officialName = loc.name || loc.location || `Loc ${loc.id}`

        // DEBUG: Log original name
        if (officialName.includes('Craiova')) console.log(`🔍 [MAP-DEBUG] Processing ID ${loc.id}: "${officialName}"`)

        // CLEANUP: Force remove "E.S" suffix from display name to merge duplicates visually
        officialName = officialName.replace(/\s*E\.?\s*S\.?\s*$/i, '')

        // DEBUG: Log sanitized name
        if (officialName.includes('Craiova')) console.log(`🔍 [MAP-DEBUG] Sanitized ID ${loc.id}: "${officialName}"`)

        locationMap.set(String(loc.id), officialName)
        normalizedToOfficialMap.set(normalizeLocationName(officialName), officialName)
      }
    })

    // Obține filtrele din setări pentru a aplica filtrele corecte
    // (deja obtinute la inceputul functiei)

    console.log(`🔍 [monthly-by-location] User ID: ${userId}`)
    console.log(`🔍 [monthly-by-location] Filtre obținute:`, {
      departments: includedFilters.departments?.length || 0,
      types: includedFilters.types?.length || 0,
      locations: includedFilters.locations?.length || 0
    })
    if (includedFilters.departments && includedFilters.departments.length > 0) {
      console.log(`🔍 [monthly-by-location] Primele 5 departamente:`, includedFilters.departments.slice(0, 5))
    }
    if (includedFilters.types && includedFilters.types.length > 0) {
      console.log(`🔍 [monthly-by-location] Primele 5 tipuri:`, includedFilters.types.slice(0, 5))
    }

    // Normalizare text (IDENTICĂ cu cea din expenditures.js)
    const normalizeText = (text) => {
      if (!text) return ''
      return String(text).trim()
        .replace(/ţ/g, 'ț').replace(/ş/g, 'ș')
        .replace(/Ţ/g, 'Ț').replace(/Ş/g, 'Ș')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
    }

    // Obține cheltuielile din expenditures_sync grupate pe an, lună și locație
    const expendituresStartTime = Date.now()
    let expendituresSql = `
      SELECT
        EXTRACT(YEAR FROM operational_date)::INTEGER AS year,
        EXTRACT(MONTH FROM operational_date)::INTEGER AS month,
        location_name,
        COALESCE(SUM(amount), 0) AS total_expenditures
      FROM expenditures_sync
      WHERE operational_date IS NOT NULL
        AND operational_date >= $1::date
        AND location_name IS NOT NULL
        AND location_name != ''
        -- INCLUDE ALL DEPARTMENTS (even unknown) to match Expenditures page
        -- AND (normalized_department_name NOT IN ('unknown', 'null', ''))
    `

    const expendituresParams = [`${startYear}-01-01`]
    let expendituresParamIndex = 2

    // APLICĂ FILTRELE DIN SETĂRI: Doar locațiile incluse (ZIDUL FINAL - lipsea filtrarea pe locații!)
    // Dacă avem includeLocations în query, filtrăm după ele. Dacă nu, filtrăm după cele din setări.
    const targetLocations = locationsArray || (includedFilters.locations && includedFilters.locations.length > 0 ? includedFilters.locations : null)
    if (targetLocations && targetLocations.length > 0) {
      const normalizedTargetLocations = targetLocations.map(normalizeText).filter(Boolean)
      expendituresSql += ` AND normalized_location_name = ANY($${expendituresParamIndex}::text[])`
      expendituresParams.push(normalizedTargetLocations)
      expendituresParamIndex++
    }

    // APLICĂ FILTRELE DIN SETĂRI: Doar departamentele incluse
    if (includedFilters.departments && includedFilters.departments.length > 0) {
      const normalizedDepartments = includedFilters.departments.map(normalizeText).filter(Boolean)
      // Force include auto_discount ONLY (Google Sheets respects filters now that normalization is fixed)
      expendituresSql += ` AND (data_source = 'auto_discount' OR normalized_department_name = ANY($${expendituresParamIndex}::text[]))`
      expendituresParams.push(normalizedDepartments)
      expendituresParamIndex++
    }

    // APLICĂ FILTRELE DIN SETĂRI: Doar tipurile incluse
    if (includedFilters.types && includedFilters.types.length > 0) {
      const normalizedTypes = includedFilters.types.map(normalizeText).filter(Boolean)
      // Excepție Auto-Discounts (Pepsi) rămâne activă că e sistem automat
      expendituresSql += ` AND (data_source = 'auto_discount' OR normalized_expenditure_type = ANY($${expendituresParamIndex}::text[]))`
      expendituresParams.push(normalizedTypes)
      expendituresParamIndex++
    }

    expendituresSql += `
      GROUP BY EXTRACT(YEAR FROM operational_date), EXTRACT(MONTH FROM operational_date), location_name
      ORDER BY year DESC, month DESC, location_name
    `
    const expendituresResult = await pool.query(expendituresSql, expendituresParams)
    console.log(`✅ [monthly-by-location] Query expenditures_sync completat în ${Date.now() - expendituresStartTime}ms, ${expendituresResult.rows.length} rânduri`)
    console.log(`📊 [monthly-by-location] Filtre aplicate: departments=${includedFilters.departments?.length || 'all'}, types=${includedFilters.types?.length || 'all'}`)

    // --- MERGE LOGIC (FULL OUTER JOIN) ---
    // Create a map of ALL keys (Year-Month-Location) from both datasets
    const mergedData = new Map()

    // Helper to get/create merged entry
    const getMergedEntry = (key) => {
      if (!mergedData.has(key)) {
        mergedData.set(key, {
          year: 0, month: 0, locationKey: '',
          locationId: null, locationName: 'Unknown',
          totalGgr: 0, totalIn: 0, totalBet: 0, totalWin: 0,
          totalJackpot: 0, totalHh: 0, totalCbReal: 0,
          totalCbBirthday: 0, totalCbRaffle: 0, slotsCount: 0,
          totalExpenditures: 0
        })
      }
      return mergedData.get(key)
    }

    // 1. Process Income Data (result.rows) and populate Map
    (result.rows || []).forEach((row) => {
      const locationId = row.location_id
      // Get location unique identifier (try ID first, then Name)
      // Note: Income data has location_id. Expenditures data has location_name.
      // We need a common key. We used "Year-Month-NormalizedName".

      const locIdStr = locationId === null || typeof locationId === 'undefined' ? null : String(locationId)
      const locationName = locIdStr ? locationMap.get(locIdStr) || `Loc ${locIdStr}` : 'Nesetat'
      const normalizedLocationName = normalizeLocationName(locationName)

      const key = `${parseInt(row.year)}-${parseInt(row.month)}-${normalizedLocationName}`
      const entry = getMergedEntry(key)

      entry.year = parseInt(row.year)
      entry.month = parseInt(row.month)
      entry.locationKey = normalizedLocationName
      entry.locationId = locationId
      entry.locationName = locationName // Name from ID mapping

      entry.totalGgr += Number(row.total_ggr || 0)
      entry.totalIn += Number(row.total_in || 0)
      entry.totalBet += Number(row.total_bet || 0)
      entry.totalWin += Number(row.total_win || 0)
      entry.totalJackpot += Number(row.total_jackpot || 0)
      entry.totalHh += Number(row.total_hh || 0)
      entry.totalCbReal += Number(row.total_cb_real || 0)
      entry.totalCbBirthday += Number(row.total_cb_birthday || 0)
      entry.totalCbRaffle += Number(row.total_cb_raffle || 0)
      entry.slotsCount = Math.max(entry.slotsCount, Number(row.slots_count || 0))
    })

    // 2. Process Expenditures Data (expendituresResult.rows) and populate/update Map
    expendituresResult.rows.forEach((row) => {
      const normalizedLocationName = normalizeLocationName(row.location_name)
      const key = `${parseInt(row.year)}-${parseInt(row.month)}-${normalizedLocationName}`
      const entry = getMergedEntry(key)

      // Set identification fields if this is a new entry (Expense-only row)
      if (entry.year === 0) {
        entry.year = parseInt(row.year)
        entry.month = parseInt(row.month)
        entry.locationKey = normalizedLocationName

        // Use name from expense as raw fallback
        // BUT TRY TO MATCH IT TO OFFICIAL NAME
        const officialName = normalizedToOfficialMap.get(normalizedLocationName)

        if (officialName) {
          entry.locationName = officialName
        } else {
          // Fallback: Clean the raw name too just in case it wasn't in the map
          entry.locationName = row.location_name.replace(/\s*E\.?\s*S\.?\s*$/i, '')
        }

        // Try to find ID from Name (Reverse lookup via map)
        if (!entry.locationId && officialName) {
          for (const [lId, lName] of locationMap.entries()) {
            if (lName === officialName) {
              entry.locationId = Number(lId)
              break
            }
          }
        }
      }

      entry.totalExpenditures += Number(row.total_expenditures || 0)
    })

    // Convert Map values to Array
    const rows = Array.from(mergedData.values()).sort((a, b) => {
      // Sort by Year DESC, Month DESC, Location Name ASC
      if (b.year !== a.year) return b.year - a.year
      if (b.month !== a.month) return b.month - a.month
      return a.locationName.localeCompare(b.locationName)
    })

    console.log(`📊 [monthly-by-location] Merged ${rows.length} rows (Income + Expenses)`)

    console.log(`📊 [monthly-by-location] Procesat ${rows.length} rânduri pentru raspuns final`)
    if (rows.length > 0) {
      const sample = rows[0]
      console.log(`🔍 [monthly-by-location] Sample result (first row): ${sample.year}-${sample.month} | ${sample.locationName} | GGR: ${sample.totalGgr}`)
    } else {
      console.warn(`⚠️ [monthly-by-location] Rezultat empty pentru parametrii:`, cacheParams)
    }

    const responseData = {
      success: true,
      rows
    }

    // --- SAVE TO CACHE (at the end, after all processing) ---
    try {
      await pool.query(`
        INSERT INTO incasari_monthly_cache (cache_key, data, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (cache_key) 
        DO UPDATE SET data = $2, created_at = NOW()
      `, [cacheKey, responseData])

      console.log(`💾 [monthly-by-location] Result saved to cache (Rows: ${rows.length})`)
    } catch (err) {
      console.warn('⚠️ Error saving to cache:', err.message)
    }
    // --- CACHE SAVE END ---

    return res.json(responseData)
  } catch (error) {
    console.error('❌ Error in /api/incasari/monthly-by-location:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la obținerea datelor lunare'
    })
  }
})

// GET /api/incasari/operational - Date lunare agregate pentru tabelul Operational
router.get('/operational', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available'
      })
    }

    // Creează indexuri pentru performanță (dacă nu există deja)
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_incasari_daily_audit_date 
        ON incasari_daily (audit_date)
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_incasari_daily_machine_audit 
        ON incasari_daily (machine_id, audit_date)
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_expenditures_sync_operational_date 
        ON expenditures_sync (operational_date)
      `)
      console.log('✅ [operational] Indexuri verificate/create')
    } catch (indexError) {
      console.warn('⚠️ [operational] Eroare la crearea indexurilor:', indexError.message)
    }

    const { location, provider, cabinet, gameMix, includeLocations } = req.query

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    let sql
    let params

    // Query OPTIMIZAT pentru date lunare agregate (fără locații, doar totaluri pe lună)
    // Folosește DATE_TRUNC pentru performanță mai bună și limitează la ultimii 5 ani
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 4 // Ultimii 5 ani

    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          EXTRACT(YEAR FROM DATE_TRUNC('month', audit_date))::INTEGER AS year,
          EXTRACT(MONTH FROM DATE_TRUNC('month', audit_date))::INTEGER AS month,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(profit), 0) AS total_ggr,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(cb_raffle), 0) AS total_raffles,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cashback_real
        FROM incasari_daily
        WHERE machine_id = ANY($1)
          AND audit_date >= $2::date
          AND location_id != 3
        GROUP BY DATE_TRUNC('month', audit_date)
        ORDER BY DATE_TRUNC('month', audit_date) DESC
      `
      params = [activeIds, `${startYear}-01-01`]
    } else {
      sql = `
        SELECT
          EXTRACT(YEAR FROM DATE_TRUNC('month', audit_date))::INTEGER AS year,
          EXTRACT(MONTH FROM DATE_TRUNC('month', audit_date))::INTEGER AS month,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(profit), 0) AS total_ggr,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(cb_raffle), 0) AS total_raffles,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cashback_real
        FROM incasari_daily
        WHERE audit_date >= $1::date
          AND location_id != 3
        GROUP BY DATE_TRUNC('month', audit_date)
        ORDER BY DATE_TRUNC('month', audit_date) DESC
      `
      params = [`${startYear}-01-01`]
    }

    console.log('📊 [operational] Executare query optimizat pentru ultimii 5 ani...')
    const startTime = Date.now()

    // Debug: EXPLAIN ANALYZE pentru performanță
    try {
      const explainSql = `EXPLAIN ANALYZE ${sql}`
      const explainResult = await pool.query(explainSql, params)
      console.log('📊 [operational] EXPLAIN ANALYZE:', explainResult.rows.map(r => r['QUERY PLAN']).join('\n'))
    } catch (explainError) {
      console.warn('⚠️ [operational] Nu s-a putut executa EXPLAIN ANALYZE:', explainError.message)
    }

    const result = await pool.query(sql, params)
    console.log(`✅ [operational] Query incasari_daily completat în ${Date.now() - startTime}ms, ${result.rows.length} rânduri`)

    // Obține cheltuielile de marketing din expenditures_sync grupate pe an și lună (OPTIMIZAT)
    const marketingStartTime = Date.now()
    const marketingSql = `
      SELECT
        EXTRACT(YEAR FROM DATE_TRUNC('month', operational_date))::INTEGER AS year,
        EXTRACT(MONTH FROM DATE_TRUNC('month', operational_date))::INTEGER AS month,
        COALESCE(SUM(amount), 0) AS total_marketing
      FROM expenditures_sync
      WHERE operational_date IS NOT NULL
        AND operational_date >= $1::date
        AND (LOWER(TRIM(COALESCE(department_name, ''))) LIKE '%marketing%'
             OR LOWER(TRIM(COALESCE(expenditure_type, ''))) LIKE '%marketing%')
      GROUP BY DATE_TRUNC('month', operational_date)
      ORDER BY DATE_TRUNC('month', operational_date) DESC
    `
    const marketingResult = await pool.query(marketingSql, [`${startYear}-01-01`])
    console.log(`✅ [operational] Query marketing completat în ${Date.now() - marketingStartTime}ms, ${marketingResult.rows.length} rânduri`)

    // Creează un map pentru marketing: key = "year-month"
    const marketingMap = new Map()
    marketingResult.rows.forEach((row) => {
      const key = `${parseInt(row.year)}-${parseInt(row.month)}`
      marketingMap.set(key, Number(row.total_marketing || 0))
    })

    const rows = (result.rows || []).map((row) => {
      const key = `${parseInt(row.year)}-${parseInt(row.month)}`
      const totalMarketing = marketingMap.get(key) || 0

      return {
        year: parseInt(row.year),
        month: parseInt(row.month),
        in: Number(row.total_in || 0),
        out: Number(row.total_out || 0),
        win: Number(row.total_win || 0),
        bet: Number(row.total_bet || 0),
        ggr: Number(row.total_ggr || 0),
        jackpots: Number(row.total_jackpot || 0),
        raffles: Number(row.total_raffles || 0),
        hh: Number(row.total_hh || 0),
        cashbackReal: Number(row.total_cashback_real || 0),
        marketing: totalMarketing
      }
    })

    return res.json({
      success: true,
      rows
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/operational:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la obținerea datelor operational'
    })
  }
})

// GET /api/incasari/operational-by-location - Date operational defalcate pe locații pentru o lună specifică
router.get('/operational-by-location', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available'
      })
    }

    const { year, month, location, provider, cabinet, gameMix, includeLocations } = req.query

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: 'Year and month are required'
      })
    }

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    // Query pentru date pe locații pentru luna specificată
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

    let sql
    let params

    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          location_id,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(profit), 0) AS total_ggr,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(cb_raffle), 0) AS total_raffles,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cashback_real
        FROM incasari_daily
        WHERE machine_id = ANY($1)
          AND audit_date >= $2::date
          AND audit_date <= $3::date
          AND location_id != 3
        GROUP BY location_id
        ORDER BY location_id
      `
      params = [activeIds, startDate, endDate]
    } else {
      sql = `
        SELECT
          location_id,
          COALESCE(SUM(in_amount), 0) AS total_in,
          COALESCE(SUM(out_amount), 0) AS total_out,
          COALESCE(SUM(win), 0) AS total_win,
          COALESCE(SUM(bet), 0) AS total_bet,
          COALESCE(SUM(profit), 0) AS total_ggr,
          COALESCE(SUM(jackpot), 0) AS total_jackpot,
          COALESCE(SUM(cb_raffle), 0) AS total_raffles,
          COALESCE(SUM(hh), 0) AS total_hh,
          COALESCE(SUM(cb_real), 0) AS total_cashback_real
        FROM incasari_daily
        WHERE audit_date >= $1::date
          AND audit_date <= $2::date
          AND location_id != 3
        GROUP BY location_id
        ORDER BY location_id
      `
      params = [startDate, endDate]
    }

    const result = await pool.query(sql, params)

    // Încarcă datele pentru locații
    let locationsData = []
    try {
      locationsData = loadExportedData('locations.json')
      if (!Array.isArray(locationsData)) {
        locationsData = []
      }
    } catch (error) {
      console.error('❌ Eroare la încărcarea locations.json:', error)
      locationsData = []
    }

    const locationMap = new Map()
    locationsData.forEach((loc) => {
      if (loc && typeof loc.id !== 'undefined') {
        locationMap.set(String(loc.id), loc.name || loc.location || `Loc ${loc.id}`)
      }
    })

    // Obține cheltuielile de marketing pe locații pentru luna specificată
    const marketingSql = `
      SELECT
        location_name,
        COALESCE(SUM(amount), 0) AS total_marketing
      FROM expenditures_sync
      WHERE operational_date >= $1::date
        AND operational_date <= $2::date
        AND (LOWER(TRIM(COALESCE(department_name, ''))) LIKE '%marketing%'
             OR LOWER(TRIM(COALESCE(expenditure_type, ''))) LIKE '%marketing%')
      GROUP BY location_name
    `
    const marketingResult = await pool.query(marketingSql, [startDate, endDate])
    const marketingMap = new Map()
    marketingResult.rows.forEach((row) => {
      const normalizedLocationName = normalizeLocationName(row.location_name)
      const existing = marketingMap.get(normalizedLocationName) || 0
      marketingMap.set(normalizedLocationName, existing + Number(row.total_marketing || 0))
    })

    const rows = (result.rows || []).map((row) => {
      const locationId = row.location_id
      const key = locationId === null || typeof locationId === 'undefined' ? null : String(locationId)
      const locationName = key ? locationMap.get(key) || `Loc ${key}` : 'Nesetat'
      const normalizedLocationName = normalizeLocationName(locationName)
      const totalMarketing = marketingMap.get(normalizedLocationName) || 0

      return {
        locationId,
        locationName,
        in: Number(row.total_in || 0),
        out: Number(row.total_out || 0),
        win: Number(row.total_win || 0),
        bet: Number(row.total_bet || 0),
        ggr: Number(row.total_ggr || 0),
        jackpots: Number(row.total_jackpot || 0),
        raffles: Number(row.total_raffles || 0),
        hh: Number(row.total_hh || 0),
        cashbackReal: Number(row.total_cashback_real || 0),
        marketing: totalMarketing
      }
    })

    return res.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      rows
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/operational-by-location:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la obținerea datelor operational pe locații'
    })
  }
})

// GET /api/incasari/operational-by-provider-cabinet - Date operational defalcate pe provider și cabinet pentru o locație și lună specifică
router.get('/operational-by-provider-cabinet', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available'
      })
    }

    const { year, month, locationId, location, provider, cabinet, gameMix, includeLocations } = req.query

    if (!year || !month || !locationId) {
      return res.status(400).json({
        success: false,
        error: 'Year, month and locationId are required'
      })
    }

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => normalizeLocationName(s)).filter(Boolean)
        : undefined

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    // Query pentru date pe provider și cabinet pentru locația și luna specificată
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]

    let sql
    let params

    // Obține provider și cabinet din slots.json (fallback)
    const slots = getActiveSlots()
    const slotMap = new Map()
    slots.forEach(slot => {
      if (slot.id) {
        slotMap.set(Number(slot.id), {
          provider: slot.provider || '',
          cabinet: slot.cabinet || ''
        })
      }
    })

    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT
          i.machine_id,
          COALESCE(SUM(i.in_amount), 0) AS total_in,
          COALESCE(SUM(i.out_amount), 0) AS total_out,
          COALESCE(SUM(i.win), 0) AS total_win,
          COALESCE(SUM(i.bet), 0) AS total_bet,
          COALESCE(SUM(i.profit), 0) AS total_ggr,
          COALESCE(SUM(i.jackpot), 0) AS total_jackpot,
          COALESCE(SUM(i.cb_raffle), 0) AS total_raffles,
          COALESCE(SUM(i.hh), 0) AS total_hh,
          COALESCE(SUM(i.cb_real), 0) AS total_cashback_real
        FROM incasari_daily i
        WHERE i.machine_id = ANY($1)
          AND i.audit_date >= $2::date
          AND i.audit_date <= $3::date
          AND i.location_id = $4
          AND i.location_id != 3
        GROUP BY i.machine_id
        ORDER BY i.machine_id
      `
      params = [activeIds, startDate, endDate, locationId]
    } else {
      sql = `
        SELECT
          i.machine_id,
          COALESCE(SUM(i.in_amount), 0) AS total_in,
          COALESCE(SUM(i.out_amount), 0) AS total_out,
          COALESCE(SUM(i.win), 0) AS total_win,
          COALESCE(SUM(i.bet), 0) AS total_bet,
          COALESCE(SUM(i.profit), 0) AS total_ggr,
          COALESCE(SUM(i.jackpot), 0) AS total_jackpot,
          COALESCE(SUM(i.cb_raffle), 0) AS total_raffles,
          COALESCE(SUM(i.hh), 0) AS total_hh,
          COALESCE(SUM(i.cb_real), 0) AS total_cashback_real
        FROM incasari_daily i
        WHERE i.audit_date >= $1::date
          AND i.audit_date <= $2::date
          AND i.location_id = $3
          AND i.location_id != 3
        GROUP BY i.machine_id
        ORDER BY i.machine_id
      `
      params = [startDate, endDate, locationId]
    }

    const result = await pool.query(sql, params)

    // Grupează pe provider și cabinet folosind slotMap
    const groupedData = new Map()
    result.rows.forEach((row) => {
      const slotInfo = slotMap.get(Number(row.machine_id)) || { provider: '', cabinet: '' }
      const key = `${slotInfo.provider}|||${slotInfo.cabinet}`

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          provider: slotInfo.provider,
          cabinet: slotInfo.cabinet,
          in: 0,
          out: 0,
          win: 0,
          bet: 0,
          ggr: 0,
          jackpots: 0,
          raffles: 0,
          hh: 0,
          cashbackReal: 0
        })
      }

      const group = groupedData.get(key)
      group.in += Number(row.total_in || 0)
      group.out += Number(row.total_out || 0)
      group.win += Number(row.total_win || 0)
      group.bet += Number(row.total_bet || 0)
      group.ggr += Number(row.total_ggr || 0)
      group.jackpots += Number(row.total_jackpot || 0)
      group.raffles += Number(row.total_raffles || 0)
      group.hh += Number(row.total_hh || 0)
      group.cashbackReal += Number(row.total_cashback_real || 0)
    })

    const rows = Array.from(groupedData.values()).map((group) => ({
      provider: group.provider,
      cabinet: group.cabinet,
      in: group.in,
      out: group.out,
      win: group.win,
      bet: group.bet,
      ggr: group.ggr,
      jackpots: group.jackpots,
      raffles: group.raffles,
      hh: group.hh,
      cashbackReal: group.cashbackReal,
      marketing: 0 // Marketing nu se calculează pe provider/cabinet
    }))

    return res.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      locationId: parseInt(locationId),
      rows
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/operational-by-provider-cabinet:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la obținerea datelor operational pe provider/cabinet'
    })
  }
})

// GET /api/incasari/estimated-profit
// Returnează profit estimat = media ultimilor 15 zile de profit (fără azi)
router.get('/estimated-profit', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available pentru incasari_daily'
      })
    }

    const { location, provider, cabinet, gameMix, includeLocations } = req.query

    const locationsArray =
      typeof includeLocations === 'string' && includeLocations.length > 0
        ? includeLocations.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined

    const activeIds = getActiveMachineIds({
      location,
      provider,
      cabinet,
      gameMix,
      includeLocations: locationsArray
    })

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const fifteenDaysAgo = new Date(today)
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
    const fifteenDaysAgoStr = `${fifteenDaysAgo.getFullYear()}-${String(fifteenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(fifteenDaysAgo.getDate()).padStart(2, '0')}`

    let sql
    let params

    // CORECT: Mai întâi calculăm SUM(profit) per zi, apoi facem media zilnică
    // Dacă avem activeIds, folosim filtrarea pe machine_id
    if (activeIds && activeIds.length > 0) {
      sql = `
        SELECT 
          COALESCE(AVG(daily_profit), 0) AS avg_profit,
          COUNT(*) AS days_count
        FROM (
          SELECT audit_date, SUM(profit) AS daily_profit
          FROM incasari_daily
          WHERE audit_date >= $1
            AND audit_date < $2
            AND machine_id = ANY($3)
          GROUP BY audit_date
        ) daily_sums
      `
      params = [fifteenDaysAgoStr, todayStr, activeIds]
    } else {
      // Dacă nu avem activeIds, afișăm toate datele disponibile (fără filtrare pe machine_id)
      sql = `
        SELECT 
          COALESCE(AVG(daily_profit), 0) AS avg_profit,
          COUNT(*) AS days_count
        FROM (
          SELECT audit_date, SUM(profit) AS daily_profit
          FROM incasari_daily
          WHERE audit_date >= $1
            AND audit_date < $2
          GROUP BY audit_date
        ) daily_sums
      `
      params = [fifteenDaysAgoStr, todayStr]
    }

    const result = await pool.query(sql, params)
    const avgProfit = Number(result.rows[0]?.avg_profit || 0)
    const daysUsed = Number(result.rows[0]?.days_count || 0)

    // Calculează numărul de zile din luna curentă
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const daysInCurrentMonth = currentMonthEnd.getDate()

    // Profit estimat = GGR medie ultimele 15 zile (mai puțin today) x numărul de zile din luna curentă
    const estimatedProfit = avgProfit * daysInCurrentMonth

    return res.json({
      success: true,
      estimatedProfit: estimatedProfit,
      daysUsed
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/estimated-profit:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul profitului estimat'
    })
  }
})

// POST /api/incasari/sync
// Rulează import-incasari-from-cyber.js în background
// Acceptă parametrul forceCurrentMonth pentru a forța importul pentru toată luna curentă
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { spawn } = await import('child_process')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)

    // Initialize globals for progress tracking
    if (typeof global._incasariSyncRunning === 'undefined') {
      global._incasariSyncRunning = false
      global._incasariSyncOutput = ''
      global._incasariSyncStartTime = null
      global._incasariSyncEndTime = null
      global._incasariSyncChild = null
    }

    // Check if already syncing
    if (global._incasariSyncRunning) {
      return res.status(400).json({
        success: false,
        error: 'Sincronizare deja în curs. Vă rugăm să așteptați finalizarea.'
      })
    }

    // Verifică dacă se cere import forțat pentru luna curentă
    const { forceCurrentMonth } = req.body
    let scriptArgs = []

    if (forceCurrentMonth) {
      // Calculează prima și ultima zi a lunii curente
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const startYear = currentMonthStart.getFullYear()
      const startMonth = String(currentMonthStart.getMonth() + 1).padStart(2, '0')
      const startDay = String(currentMonthStart.getDate()).padStart(2, '0')
      const start = `${startYear}-${startMonth}-${startDay}`

      const endYear = currentMonthEnd.getFullYear()
      const endMonth = String(currentMonthEnd.getMonth() + 1).padStart(2, '0')
      const endDay = String(currentMonthEnd.getDate()).padStart(2, '0')
      const end = `${endYear}-${endMonth}-${endDay}`

      scriptArgs = [start, end]
      console.log(`🔄 [SYNC] Import forțat pentru luna curentă: ${start} → ${end}`)
    }

    // Return immediately (non-blocking)
    res.json({
      success: true,
      message: forceCurrentMonth
        ? 'Import forțat pentru luna curentă început. Datele vor fi actualizate în curând.'
        : 'Sincronizare începută. Datele vor fi actualizate în curând.'
    })

    // Start sync in background
    global._incasariSyncRunning = true
    global._incasariSyncOutput = ''
    global._incasariSyncStartTime = new Date().toISOString()
    global._incasariSyncEndTime = null

    const scriptPath = path.join(__dirname, '..', 'import-incasari-from-cyber.js')

    const child = spawn('node', [scriptPath, ...scriptArgs], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    })

    // Salvează referința la proces pentru a-l putea opri
    global._incasariSyncChild = child

    child.stdout.on('data', (data) => {
      const text = data.toString()
      global._incasariSyncOutput += text
      console.log(`[INCASARI SYNC] ${text}`)
    })

    child.stderr.on('data', (data) => {
      const text = data.toString()
      global._incasariSyncOutput += text
      console.error(`[INCASARI SYNC ERROR] ${text}`)
    })

    child.on('close', (code) => {
      global._incasariSyncRunning = false
      global._incasariSyncEndTime = new Date().toISOString()
      global._incasariSyncChild = null
      if (code === 0) {
        console.log('✅ [INCASARI SYNC] Sincronizare finalizată cu succes')
      } else {
        console.error(`❌ [INCASARI SYNC] Sincronizare finalizată cu eroare (code: ${code})`)
        console.error(`❌ [INCASARI SYNC] Output final:`, global._incasariSyncOutput)
      }
    })

    child.on('error', (error) => {
      global._incasariSyncRunning = false
      global._incasariSyncChild = null
      console.error('❌ [INCASARI SYNC] Eroare la pornirea procesului:', error)
      global._incasariSyncOutput += `\n❌ Eroare: ${error.message}\n`
    })
  } catch (error) {
    global._incasariSyncRunning = false
    console.error('❌ Error in /api/incasari/sync:', error)
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Eroare la pornirea sincronizării'
      })
    }
  }
})

// GET /api/incasari/sync-status
// Returnează statusul sincronizării (pentru UI de progres)
router.get('/sync-status', authenticateToken, async (req, res) => {
  try {
    return res.json({
      success: true,
      running: !!global._incasariSyncRunning,
      startTime: global._incasariSyncStartTime || null,
      endTime: global._incasariSyncEndTime || null,
      output: global._incasariSyncOutput || ''
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/sync-status:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la citirea statusului de sincronizare încasări'
    })
  }
})

// DELETE /api/incasari/sync-stop
// Oprește sincronizarea în curs
router.delete('/sync-stop', authenticateToken, async (req, res) => {
  try {
    if (!global._incasariSyncRunning || !global._incasariSyncChild) {
      return res.status(400).json({
        success: false,
        error: 'Nu există sincronizare în curs de oprit'
      })
    }

    try {
      // Oprește procesul
      global._incasariSyncChild.kill('SIGTERM')

      // Așteaptă puțin, apoi forțează oprirea dacă nu s-a oprit
      setTimeout(() => {
        if (global._incasariSyncChild && !global._incasariSyncChild.killed) {
          global._incasariSyncChild.kill('SIGKILL')
        }
      }, 2000)

      global._incasariSyncRunning = false
      global._incasariSyncEndTime = new Date().toISOString()
      global._incasariSyncOutput += '\n\n🛑 Sincronizare oprită manual de utilizator\n'
      global._incasariSyncChild = null

      console.log('🛑 [INCASARI SYNC] Sincronizare oprită manual')

      return res.json({
        success: true,
        message: 'Sincronizarea a fost oprită'
      })
    } catch (killError) {
      console.error('❌ [INCASARI SYNC] Eroare la oprirea procesului:', killError)
      return res.status(500).json({
        success: false,
        error: 'Eroare la oprirea procesului: ' + killError.message
      })
    }
  } catch (error) {
    console.error('❌ Error in /api/incasari/sync-stop:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la oprirea sincronizării'
    })
  }
})

// GET /api/incasari/slots-by-month-location
// Returnează numărul distinct de sloturi (serial_number) grupate pe lună și locație pentru anul curent
// Acceptă filtre: provider, cabinet, gameMix
router.get('/slots-by-month-location', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available'
      })
    }

    const currentYear = new Date().getFullYear()
    const startDate = `${currentYear}-01-01`
    const endDate = `${currentYear}-12-31`

    // Obține filtrele din query params
    const provider = req.query.provider && req.query.provider !== 'all' ? req.query.provider : null
    const cabinet = req.query.cabinet && req.query.cabinet !== 'all' ? req.query.cabinet : null
    const gameMix = req.query.gameMix && req.query.gameMix !== 'all' ? req.query.gameMix : null

    // Obține lista de machine_id-uri filtrate
    let filteredMachineIds = null
    if (provider || cabinet || gameMix) {
      const activeMachineIds = getActiveMachineIds({ provider, cabinet, gameMix })
      if (activeMachineIds && activeMachineIds.length > 0) {
        filteredMachineIds = activeMachineIds
      } else {
        // Dacă nu există machine_id-uri care se potrivesc cu filtrele, returnează date goale
        return res.json({
          success: true,
          year: currentYear,
          locations: [],
          monthData: {}
        })
      }
    }

    // Construiește query-ul SQL cu filtre opționale
    let sql = `
      SELECT 
        EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
        location_id,
        COUNT(DISTINCT serial_number) AS slots_count
      FROM incasari_daily
      WHERE audit_date BETWEEN $1 AND $2
        AND location_id IS NOT NULL
        AND serial_number IS NOT NULL
        AND serial_number != ''
    `
    const params = [startDate, endDate]
    let paramIndex = 3

    // Adaugă filtrul pentru machine_id dacă există filtre
    if (filteredMachineIds && filteredMachineIds.length > 0) {
      sql += ` AND machine_id = ANY($${paramIndex})`
      params.push(filteredMachineIds)
      paramIndex++
    }

    sql += `
      GROUP BY EXTRACT(MONTH FROM audit_date), location_id
      ORDER BY month, location_id
    `

    const result = await pool.query(sql, params)
    console.log(`📊 [slots-by-month-location] Găsite ${result.rows.length} rânduri pentru anul ${currentYear}`)
    if (result.rows.length > 0) {
      console.log('📊 [slots-by-month-location] Primele 5 rânduri:', result.rows.slice(0, 5))
    }

    // Debug: verifică dacă există date în incasari_daily pentru anul curent
    const debugSql = `
      SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT location_id) as unique_locations,
        COUNT(DISTINCT machine_id) as unique_slots,
        MIN(audit_date) as min_date,
        MAX(audit_date) as max_date
      FROM incasari_daily
      WHERE audit_date BETWEEN $1 AND $2
        AND machine_id IS NOT NULL
    `
    const debugResult = await pool.query(debugSql, [startDate, endDate])
    console.log('📊 [slots-by-month-location] Debug info:', debugResult.rows[0])

    // Folosește locations.json pentru mapping (la fel ca în celelalte endpoint-uri)
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

    // Obține toate locațiile unice (normalizate) pentru a inițializa structura
    // Exclude "Depozit"
    const allLocationNames = new Set()
    locationMap.forEach((name) => {
      if (name.toLowerCase() !== 'depozit') {
        allLocationNames.add(name)
      }
    })

    // Construiește structura de date: lună -> locație -> count
    // Inițializează toate lunile cu toate locațiile la 0
    const monthData = {}
    const sortedLocationNames = Array.from(allLocationNames).sort()

    for (let month = 1; month <= 12; month++) {
      monthData[month] = {}
      sortedLocationNames.forEach(locationName => {
        monthData[month][locationName] = 0
      })
    }

    // Populează cu datele reale (exclude "Depozit")
    result.rows.forEach(row => {
      const month = row.month
      const locationId = String(row.location_id || '')
      const locationName = locationMap.get(locationId)

      // Exclude "Depozit"
      if (month && locationName && locationName.toLowerCase() !== 'depozit' && monthData[month]) {
        const currentCount = monthData[month][locationName] || 0
        const newCount = Number(row.slots_count || 0)
        // Folosim MAX pentru că poate exista mai multe rânduri pentru aceeași lună/locație
        monthData[month][locationName] = Math.max(currentCount, newCount)
      }
    })

    console.log('📊 [slots-by-month-location] Structura finală pentru Ianuarie:', monthData[1])

    return res.json({
      success: true,
      year: currentYear,
      locations: sortedLocationNames,
      monthData
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/slots-by-month-location:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul sloturilor pe lună și locație'
    })
  }
})

// GET /api/incasari/ggr-by-month-location
// Returnează GGR (total_profit) grupate pe lună și locație pentru anul selectat
// Pentru luna curentă, folosește TOATĂ luna (1-30/31) pentru consistență cu Prezentare generală
router.get('/ggr-by-month-location', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({
        success: false,
        error: 'Database pool not available'
      })
    }

    const year = parseInt(req.query.year) || new Date().getFullYear()
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Pentru anul curent, calculează până la sfârșitul lunii curente (nu ziua operațională)
    // Pentru anii trecuți, calculează pentru tot anul
    let startDate, endDate
    if (year === currentYear) {
      // Anul curent: de la 1 ianuarie până la sfârșitul lunii curente (pentru consistență)
      startDate = `${year}-01-01`
      const lastDayOfCurrentMonth = new Date(year, currentMonth, 0).getDate()
      endDate = `${year}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfCurrentMonth).padStart(2, '0')}`
    } else {
      // Ani trecuți: tot anul
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
    }

    // Calculează GGR (profit) pentru fiecare lună și locație
    const sql = `
      SELECT 
        EXTRACT(MONTH FROM audit_date)::INTEGER AS month,
        location_id,
        SUM(profit) AS total_ggr
      FROM incasari_daily
      WHERE audit_date BETWEEN $1 AND $2
        AND location_id IS NOT NULL
      GROUP BY EXTRACT(MONTH FROM audit_date), location_id
      ORDER BY month, location_id
    `

    const result = await pool.query(sql, [startDate, endDate])
    console.log(`📊 [ggr-by-month-location] Găsite ${result.rows.length} rânduri pentru anul ${year} (${startDate} - ${endDate})`)

    // Folosește locations.json pentru mapping
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

    // Obține toate locațiile unice (normalizate) pentru a inițializa structura
    // Exclude "Depozit"
    const allLocationNames = new Set()
    locationMap.forEach((name) => {
      if (name.toLowerCase() !== 'depozit') {
        allLocationNames.add(name)
      }
    })

    // Construiește structura de date: lună -> locație -> GGR
    // Inițializează toate lunile cu toate locațiile la 0
    const monthData = {}
    const sortedLocationNames = Array.from(allLocationNames).sort()

    for (let month = 1; month <= 12; month++) {
      monthData[month] = {}
      sortedLocationNames.forEach(locationName => {
        monthData[month][locationName] = 0
      })
    }

    // Populează cu datele reale (exclude "Depozit")
    result.rows.forEach(row => {
      const month = row.month
      const locationId = String(row.location_id || '')
      const locationName = locationMap.get(locationId)

      // Exclude "Depozit"
      if (month && locationName && locationName.toLowerCase() !== 'depozit' && monthData[month]) {
        monthData[month][locationName] = Number(row.total_ggr || 0)
      }
    })

    console.log('📊 [ggr-by-month-location] Structura finală pentru Ianuarie:', monthData[1])

    return res.json({
      success: true,
      year: year,
      locations: sortedLocationNames,
      monthData
    })
  } catch (error) {
    console.error('❌ Error in /api/incasari/ggr-by-month-location:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Eroare la calculul GGR pe lună și locație'
    })
  }
})

// AWS S3 Configuration pentru cache încasări
const s3Client = process.env.AWS_ACCESS_KEY_ID ? new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}) : null

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'cashpot-documents'
const S3_PREFIX = 'incasari-cache/'

// GET /api/incasari/aws-status
// Verifică dacă AWS S3 este configurat
router.get('/aws-status', authenticateToken, async (req, res) => {
  try {
    const available = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION &&
      s3Client
    )

    return res.json({
      success: true,
      available
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// POST /api/incasari/aws-save
// Salvează date în AWS S3
router.post('/aws-save', authenticateToken, async (req, res) => {
  try {
    if (!s3Client) {
      return res.status(503).json({
        success: false,
        error: 'AWS S3 nu este configurat'
      })
    }

    const { key, data, timestamp } = req.body

    const body = JSON.stringify({
      data,
      timestamp: timestamp || Date.now(),
      version: '1.0'
    })

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      CacheControl: 'max-age=3600'
    })

    await s3Client.send(command)

    return res.json({
      success: true,
      message: 'Date salvate în AWS S3'
    })
  } catch (error) {
    console.error('❌ Eroare la salvare AWS S3:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/incasari/aws-get
// Citește date din AWS S3
router.get('/aws-get', authenticateToken, async (req, res) => {
  try {
    if (!s3Client) {
      return res.status(503).json({
        success: false,
        error: 'AWS S3 nu este configurat'
      })
    }

    const { key } = req.query

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    })

    const response = await s3Client.send(command)
    const body = await response.Body.transformToString()
    const parsed = JSON.parse(body)

    return res.json({
      success: true,
      data: parsed.data,
      timestamp: parsed.timestamp
    })
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({
        success: false,
        error: 'Cheie nu există în AWS S3'
      })
    }

    console.error('❌ Eroare la citire AWS S3:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/incasari/aws-timestamp
// Verifică timestamp-ul unui item din AWS S3
router.get('/aws-timestamp', authenticateToken, async (req, res) => {
  try {
    if (!s3Client) {
      return res.status(503).json({
        success: false,
        error: 'AWS S3 nu este configurat'
      })
    }

    const { key } = req.query

    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    })

    const response = await s3Client.send(command)
    const metadata = response.Metadata || {}

    // Încearcă să citească timestamp din metadata sau din fișier
    if (metadata.timestamp) {
      return res.json({
        success: true,
        timestamp: parseInt(metadata.timestamp)
      })
    }

    // Dacă nu e în metadata, citește fișierul
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    })

    const getResponse = await s3Client.send(getCommand)
    const body = await getResponse.Body.transformToString()
    const parsed = JSON.parse(body)

    return res.json({
      success: true,
      timestamp: parsed.timestamp || null
    })
  } catch (error) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
      return res.status(404).json({
        success: false,
        error: 'Cheie nu există'
      })
    }

    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// GET /api/incasari/aws-list
// Listă toate cheile din cache AWS
router.get('/aws-list', authenticateToken, async (req, res) => {
  try {
    if (!s3Client) {
      return res.status(503).json({
        success: false,
        error: 'AWS S3 nu este configurat'
      })
    }

    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: S3_PREFIX
    })

    const response = await s3Client.send(command)
    const keys = (response.Contents || []).map(item =>
      item.Key.replace(S3_PREFIX, '').replace('.json', '')
    )

    return res.json({
      success: true,
      keys
    })
  } catch (error) {
    console.error('❌ Eroare la listare AWS cache:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router


