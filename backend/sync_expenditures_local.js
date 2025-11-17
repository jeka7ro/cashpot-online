#!/usr/bin/env node

/**
 * LOCAL SYNC SCRIPT pentru Cheltuieli
 * 
 * LOCAȚIE: backend/sync_expenditures_local.js
 * 
 * RULARE:
 *   cd backend
 *   npm run sync-expenditures
 * SAU:
 *   node sync_expenditures_local.js
 * SAU cu date range:
 *   node sync_expenditures_local.js 2025-01-01 2025-11-07
 * 
 * CE FACE:
 * 1. Conectare la DB extern (192.168.1.39) - LAN access OK!
 * 2. Fetch toate datele (casino_payments + JOIN-uri)
 * 3. Upload la Render Backend (/api/expenditures/upload)
 * 4. Render salvează în expenditures_sync table
 * 5. Frontend afișează datele!
 * 
 * RULEAZĂ DOAR DIN BIROU (LAN)!
 */

import pkg from 'pg'
const { Pool } = pkg
import axios from 'axios'
import dotenv from 'dotenv'

// Load .env (suntem în backend/ folder)
dotenv.config()

// External DB config (LAN)
const externalPool = new Pool({
  user: process.env.EXPENDITURES_DB_USER || 'cashpot',
  password: process.env.EXPENDITURES_DB_PASSWORD || '129hj8oahwd7yaw3e21321',
  host: process.env.EXPENDITURES_DB_HOST || '82.76.35.50', // IP EXTERN pentru acces de oriunde
  port: parseInt(process.env.EXPENDITURES_DB_PORT || '26257'),
  database: process.env.EXPENDITURES_DB_NAME || 'cashpot',
  ssl: false
})

// Render backend URL
const RENDER_BACKEND = process.env.RENDER_BACKEND_URL || 'https://cashpot-backend.onrender.com'

// Date range (default: ultimii 3 ani: 2023-2025)
const today = new Date()
const startDate = process.argv[2] || `${today.getFullYear() - 2}-01-01` // 2023-01-01
const endDate = process.argv[3] || `${today.getFullYear()}-12-31`       // 2025-12-31

console.log('🚀 Starting LOCAL sync script...')
console.log(`📅 Date range: ${startDate} → ${endDate}`)
console.log(`🔌 External DB: ${process.env.EXPENDITURES_DB_HOST || '192.168.1.39'}:${process.env.EXPENDITURES_DB_PORT || '26257'}`)
console.log(`🌐 Render Backend: ${RENDER_BACKEND}`)

async function syncExpenditures() {
  try {
    // STEP 1: Load settings from Render (ce a debifat user-ul)
    console.log('\n⚙️ Loading filter settings from Render...')
    let filterSettings = {
      includedDepartments: [],
      includedExpenditureTypes: [],
      includedLocations: []
    }
    
    try {
      const settingsResponse = await axios.get(`${RENDER_BACKEND}/api/expenditures/settings`)
      filterSettings = settingsResponse.data
      console.log('✅ Filter settings loaded:')
      console.log(`   - Departments: ${filterSettings.includedDepartments?.length || 0} included`)
      console.log(`   - Categories: ${filterSettings.includedExpenditureTypes?.length || 0} included`)
      console.log(`   - Locations: ${filterSettings.includedLocations?.length || 0} included`)
    } catch (settingsError) {
      console.warn('⚠️ Could not load settings, will sync ALL data')
    }
    
    // Test external DB connection
    console.log('\n🔍 Testing external DB connection...')
    const testResult = await externalPool.query('SELECT NOW() as current_time')
    console.log('✅ External DB connection OK:', testResult.rows[0].current_time)
    
    // Fetch data from external DB
    console.log('\n📡 Fetching expenditures from external DB...')
    
    const query = `
      SELECT 
        l.id as location_id,
        l.name as location_name,
        d.name as department_name,
        et.name as expenditure_type,
        p.amount,
        p.explanation,
        p.operational_date
      FROM public.casino_payments p
      LEFT JOIN public.casino_locations l ON p.location_id = l.id
      LEFT JOIN public.casino_departments d ON p.department_id = d.id
      LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
      WHERE p.operational_date >= $1 AND p.operational_date <= $2
        AND p.is_deleted = false
        AND et.name NOT IN ('Alpha Bank', 'Casino Technology', 'Bambouane', 'Cafes', 'Catering')
      ORDER BY p.operational_date DESC, l.name, et.name
    `
    
    const result = await externalPool.query(query, [startDate, endDate])
    console.log(`✅ Fetched ${result.rows.length} records from external DB`)
    
    if (result.rows.length === 0) {
      console.log('⚠️ No data found for this date range!')
      process.exit(0)
    }
    
    const normalizeDate = (value) => {
      if (!value) return null
      if (value instanceof Date) {
        return value.toISOString().split('T')[0]
      }
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
    }
    
    // Transform data
    let records = result.rows.map(row => ({
      location_name: row.location_name,
      department_name: row.department_name,
      expenditure_type: row.expenditure_type,
      amount: row.amount,
      description: row.explanation || null,
      operational_date: normalizeDate(row.operational_date),
      original_location_id: row.location_id,
      data_source: 'bat_sync'
    }))
    
    const dateStats = records.reduce((acc, record) => {
      const key = record.operational_date || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const sortedDates = Object.keys(dateStats).filter(Boolean).sort()
    const earliestDate = sortedDates[0] || 'N/A'
    const latestDate = sortedDates[sortedDates.length - 1] || 'N/A'
    const latestPreview = sortedDates.slice(-5).reverse()
    console.log(`📅 BAT date range in query: ${earliestDate} → ${latestDate}`)
    if (latestPreview.length) {
      console.log('🗓️ Latest BAT dates:')
      latestPreview.forEach(date => console.log(`   ${date}: ${dateStats[date]} records`))
    }
    
    // STEP 2: Apply user filter settings (ce a DEBIFAT user-ul se EXCLUDE!)
    const beforeFilterCount = records.length
    
    // Filter by INCLUDED departments (dacă lista NU e goală)
    // TEMPORAR DEZACTIVAT pentru a vedea TOATE departamentele noi!
    // if (filterSettings.includedDepartments && filterSettings.includedDepartments.length > 0) {
    //   records = records.filter(r => filterSettings.includedDepartments.includes(r.department_name))
    //   console.log(`🔧 Department filter: ${beforeFilterCount} → ${records.length} records (excluded ${beforeFilterCount - records.length})`)
    // }
    console.log(`✅ Department filter: DISABLED - syncing ALL departments (${records.length} records)`)
    
    // Filter by INCLUDED expenditure types (dacă lista NU e goală)
    if (filterSettings.includedExpenditureTypes && filterSettings.includedExpenditureTypes.length > 0) {
      const beforeCategoryFilter = records.length
      records = records.filter(r => filterSettings.includedExpenditureTypes.includes(r.expenditure_type))
      console.log(`🔧 Category filter: ${beforeCategoryFilter} → ${records.length} records (excluded ${beforeCategoryFilter - records.length})`)
    }
    
    // Filter by INCLUDED locations (dacă lista NU e goală)
    if (filterSettings.includedLocations && filterSettings.includedLocations.length > 0) {
      const beforeLocationFilter = records.length
      records = records.filter(r => filterSettings.includedLocations.includes(r.location_name))
      console.log(`🔧 Location filter: ${beforeLocationFilter} → ${records.length} records (excluded ${beforeLocationFilter - records.length})`)
    }
    
    const filteredStats = records.reduce((acc, record) => {
      const key = record.operational_date || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const filteredLatest = Object.keys(filteredStats).filter(Boolean).sort().pop() || 'N/A'
    const describedCount = records.filter(record => record.description && record.description.trim().length > 0).length
    
    console.log(`\n✅ After filtering: ${records.length} records (excluded ${beforeFilterCount - records.length} total)`)
    console.log(`📍 Latest date after filters: ${filteredLatest}`)
    console.log(`📝 Records with descriptions: ${describedCount}/${records.length}`)
    
    if (records.length === 0) {
      console.log('⚠️ No records left after filtering! Check your settings.')
      process.exit(0)
    }
    
    console.log('\n📤 Uploading to Render backend...')
    console.log(`🔗 POST ${RENDER_BACKEND}/api/expenditures/upload`)
    
    // Upload to Render
    const uploadResponse = await axios.post(
      `${RENDER_BACKEND}/api/expenditures/upload`,
      { records },
      {
        headers: {
          'Content-Type': 'application/json',
          // Auth token (dacă e necesar)
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`
        }
      }
    )
    
    console.log('✅ Upload SUCCESS!', uploadResponse.data)
    console.log(`\n🎉 SYNC COMPLET! ${uploadResponse.data.records} înregistrări sincronizate!`)
    
    // Close pools
    await externalPool.end()
    console.log('\n👋 Closing connections...')
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔍 DB-ul extern refuză conexiunea!')
      console.error('🔍 Verifică dacă PostgreSQL rulează pe 192.168.1.39:26257')
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ Timeout! Verifică firewall-ul și network-ul.')
    } else if (error.response) {
      console.error('📋 Render response:', error.response.status, error.response.data)
    }
    
    await externalPool.end()
    process.exit(1)
  }
}

syncExpenditures()

