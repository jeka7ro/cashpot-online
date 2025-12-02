import pg from 'pg'
import dotenv from 'dotenv'
import axios from 'axios'

// Load environment variables
dotenv.config()

const { Pool } = pg

async function syncExpenditures() {
  let externalPool = null
  let localPool = null

  try {
    console.log('🚀 Starting expenditures sync from external DB to Render...')
    console.log('📅 Date range: 2023-01-01 to 2025-12-31')
    console.log('')

    // External DB connection (BAT - 192.168.1.39 sau 82.76.35.50)
    const externalConfig = {
      user: process.env.EXPENDITURES_DB_USER || 'cashpot',
      password: process.env.EXPENDITURES_DB_PASSWORD || '129hj8oahwd7yaw3e21321',
      host: process.env.EXPENDITURES_DB_HOST || '82.76.35.50',
      port: parseInt(process.env.EXPENDITURES_DB_PORT || '26257'),
      database: process.env.EXPENDITURES_DB_NAME || 'cashpot'
    }

    console.log('🔌 Connecting to external DB:', externalConfig.host + ':' + externalConfig.port)
    externalPool = new Pool(externalConfig)

    // Test external connection
    await externalPool.query('SELECT NOW()')
    console.log('✅ External DB connection: OK')
    console.log('')

    // Render backend URL
    const renderUrl = process.env.RENDER_BACKEND_URL || 'https://cashpot-backend.onrender.com'
    console.log('🌐 Render backend URL:', renderUrl)
    console.log('')

    // Fetch ALL data from external DB (2023-2025)
    console.log('📥 Fetching ALL data from external DB (2023-2025)...')
    const result = await externalPool.query(`
      SELECT 
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
      WHERE p.is_deleted = false
        AND p.operational_date >= '2023-01-01'
        AND p.operational_date <= '2025-12-31'
      ORDER BY p.operational_date DESC
    `)

    const records = result.rows.map(row => ({
      location_name: row.location_name || 'Unknown',
      department_name: row.department_name || 'Unknown',
      expenditure_type: row.expenditure_type || 'Unknown',
      amount: parseFloat(row.amount || 0),
      operational_date: row.operational_date,
      data_source: 'bat_sync'
    }))

    console.log(`✅ Fetched ${records.length} records from external DB`)
    console.log('')

    if (records.length === 0) {
      console.log('⚠️ No records to sync!')
      await externalPool.end()
      process.exit(0)
    }

    // Upload to Render backend using /upload endpoint
    // CRITICAL: Folosim endpoint-ul /upload care ACUM NU MAI ȘTERGE DATELE!
    console.log('📤 Uploading to Render backend (NU șterge datele vechi!)...')
    const uploadResponse = await axios.post(
      `${renderUrl}/api/expenditures/upload`,
      {
        records: records,
        syncToken: 'SYNC_UPLOAD_TOKEN_2025'
      },
      {
        timeout: 300000, // 5 minute timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Upload response:', uploadResponse.data)
    console.log('')
    console.log(`✅ SYNC COMPLET!`)
    console.log(`   - ${uploadResponse.data.records || 0} înregistrări noi`)
    console.log(`   - ${uploadResponse.data.updated || 0} actualizate`)
    console.log(`   - Total în DB: ${uploadResponse.data.totalAfter || 0} (înainte: ${uploadResponse.data.totalBefore || 0})`)
    console.log('')
    console.log('📊 Datele vechi (2023, 2024) SUNT PĂSTRATE!')
    console.log('📊 Doar datele noi din noiembrie 2025 au fost adăugate!')

    // Close pools
    await externalPool.end()
    console.log('\n👋 Closing connections...')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message)

    if (error.code === 'ECONNREFUSED') {
      console.error('🔍 DB-ul extern refuză conexiunea!')
      console.error('🔍 Verifică dacă PostgreSQL rulează pe 82.76.35.50:26257')
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ Timeout! Verifică firewall-ul și network-ul.')
    } else if (error.response) {
      console.error('📋 Render response:', error.response.status, error.response.data)
    } else {
      console.error('📋 Error stack:', error.stack)
    }

    if (externalPool) {
      await externalPool.end().catch(() => {})
    }
    if (localPool) {
      await localPool.end().catch(() => {})
    }
    process.exit(1)
  }
}

syncExpenditures()
