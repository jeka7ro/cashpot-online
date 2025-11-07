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
  host: process.env.EXPENDITURES_DB_HOST || '192.168.1.39',
  port: parseInt(process.env.EXPENDITURES_DB_PORT || '26257'),
  database: process.env.EXPENDITURES_DB_NAME || 'cashpot',
  ssl: false
})

// Render backend URL
const RENDER_BACKEND = process.env.RENDER_BACKEND_URL || 'https://cashpot-backend.onrender.com'

// Date range (default: anul curent)
const today = new Date()
const startDate = process.argv[2] || `${today.getFullYear()}-01-01`
const endDate = process.argv[3] || `${today.getFullYear()}-12-31`

console.log('🚀 Starting LOCAL sync script...')
console.log(`📅 Date range: ${startDate} → ${endDate}`)
console.log(`🔌 External DB: ${process.env.EXPENDITURES_DB_HOST || '192.168.1.39'}:${process.env.EXPENDITURES_DB_PORT || '26257'}`)
console.log(`🌐 Render Backend: ${RENDER_BACKEND}`)

async function syncExpenditures() {
  try {
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
        p.operational_date
      FROM public.casino_payments p
      LEFT JOIN public.casino_locations l ON p.location_id = l.id
      LEFT JOIN public.casino_departments d ON p.department_id = d.id
      LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
      WHERE p.operational_date >= $1 AND p.operational_date <= $2
        AND p.is_deleted = false
      ORDER BY p.operational_date DESC, l.name, et.name
    `
    
    const result = await externalPool.query(query, [startDate, endDate])
    console.log(`✅ Fetched ${result.rows.length} records from external DB`)
    
    if (result.rows.length === 0) {
      console.log('⚠️ No data found for this date range!')
      process.exit(0)
    }
    
    // Transform data
    const records = result.rows.map(row => ({
      location_name: row.location_name,
      department_name: row.department_name,
      expenditure_type: row.expenditure_type,
      amount: row.amount,
      operational_date: row.operational_date,
      original_location_id: row.location_id
    }))
    
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

