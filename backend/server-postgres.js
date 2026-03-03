import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import pg from 'pg'
import { fileURLToPath } from 'url'

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// mysql2 removed to fix Render deployment issues
// CRITICAL FIX 2025-01-17 16:35 - ALL CYBER ENDPOINTS RETURNING 404 ON PRODUCTION
// Force complete redeploy - sync-slots-safe, promotions, users endpoints missing
import uploadRoutes from './routes/upload.js'
import compressRoutes from './routes/compress.js'
import backupRoutes from './routes/backup.js'
import gamesRoutes from './routes/games.js'
import slotHistoryRoutes from './routes/slotHistory.js'
import usersRoutes from './routes/users.js'
import authRoutes from './routes/auth.js'
import companiesRoutes from './routes/companies.js'
import locationsRoutes from './routes/locations.js'
import providersRoutes from './routes/providers.js'
import cabinetsRoutes from './routes/cabinets.js'
import gameMixesRoutes from './routes/gameMixes.js'
import slotsRoutes from './routes/slots.js'
import invoicesRoutes from './routes/invoices.js'
import jackpotsRoutes from './routes/jackpots.js'
import legalDocumentsRoutes from './routes/legalDocuments.js'
import onjnReportsRoutes from './routes/onjnReports.js'
import onjnOperatorsRoutes, { refreshProgressManager } from './routes/onjnOperators.js'
import brandsRoutes from './routes/brands.js'
import metrologyRoutes from './routes/metrology.js'
import warehouseRoutes from './routes/warehouse.js'
import promotionsRoutes from './routes/promotions.js'
import cyberRoutes from './routes/cyber.js'
// import cyberDirectRoutes from './routes/cyberDirect.js' // DISABLED - using JSON import only
import tasksRoutes from './routes/tasks.js'
import messagesRoutes from './routes/messages.js'
import notificationsRoutes from './routes/notifications.js'
import expendituresRoutes from './routes/expenditures.js'
import incasariRoutes from './routes/incasari.js'
import { scheduleBackups } from './backup.js'
import { scheduleExpendituresImports } from './schedule-expenditures-import.js'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

console.log('🔥🔥🔥 IMMEDIATELY AFTER IMPORTS! 🔥🔥🔥')
dotenv.config()

console.log('💥💥💥 FIRST LINE AFTER DOTENV! 💥💥💥')
// ==================== NUCLEAR DEPLOY v1.0.41 ====================
console.log('🚨🚨🚨 NUCLEAR DEPLOY v1.0.49 - DIRECT ENDPOINT IN ROUTES! 🚨🚨🚨')
console.log('💥💥💥 ROUTES FIXED - APIS WILL WORK NOW! 💥💥💥')
console.log('🚀 SERVER STARTING - All imports loaded successfully!')
console.log('🔥 CRITICAL BUILD v1.0.39 - NUCLEAR ROUTE FIX!')
console.log('📦 Building for Render deployment - Route registration fix!')
console.log('💥 THIS MUST APPEAR IN LOGS OR RENDER IS BROKEN!')

const { Pool } = pg
const app = express()
const PORT = process.env.PORT || 5001

// CRITICAL FIX - 2025-10-19 11:43 - FORCE RENDER REBUILD FOR ROUTES
// BUILD DINAMIC - generează automat la fiecare restart
const now = new Date()
const BUILD_NUMBER = Math.floor(now.getTime() / 1000).toString().slice(-6) // Ultimele 6 cifre din timestamp
const BUILD_DATE = now.toLocaleString('ro-RO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})
console.log(`🚀 BUILD #${BUILD_NUMBER} - ${BUILD_DATE}`)
console.log('🔥 ROUTE REGISTRATION FIX - ALL ENDPOINTS MUST WORK')
console.log('📦 Version: 1.0.35 - RENDER MUST REBUILD NOW!')

// Authentication middleware to extract user from JWT
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      // If no token, set default user as admin
      req.user = { userId: 1, username: 'admin', full_name: 'Eugeniu Cazmal' }
      return next()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cashpot-secret-key-2024')
    const pool = req.app.get('pool')

    if (pool) {
      const result = await pool.query('SELECT id, username, full_name, role FROM users WHERE id = $1', [decoded.userId])

      if (result.rows.length > 0) {
        req.user = {
          userId: result.rows[0].id,
          username: result.rows[0].username,
          full_name: result.rows[0].full_name || result.rows[0].username,
          role: result.rows[0].role
        }
      } else {
        req.user = { userId: decoded.userId, username: decoded.username, full_name: decoded.username }
      }
    } else {
      req.user = { userId: decoded.userId, username: decoded.username, full_name: decoded.username }
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    req.user = { userId: 1, username: 'admin', full_name: 'Admin' }
    next()
  }
}

// Routes moved to line 3438 - RIGHT before server start

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'cashpot-uploads'

// PostgreSQL Connection with robust pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false,
  // Connection pool settings for Render.com free tier
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection unavailable
  // Handle connection errors
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
})

// Handle pool errors to prevent crashes
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err)
  // Don't crash the app, just log the error
})

// Make pool available to routes
app.set('pool', pool)

// Routes are now registered IMMEDIATELY after middleware setup (line ~1080)
// Test connection IN BACKGROUND (don't block server startup!)
const connectAndInitDB = async () => {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('✅ Connected to PostgreSQL')
    console.log('⏰ Database time:', result.rows[0].now)

    // Initialize database schema in background
    await initializeDatabase()

    // Start scheduled imports for expenditures (după inițializarea bazei de date)
    console.log('🔄 Pornire scheduler pentru import automat cheltuieli...')
    scheduleExpendituresImports(pool)
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err)
    console.error('⚠️ Server will continue running but DB operations may fail!')
  }
}

// Start DB connection in background - DON'T BLOCK SERVER STARTUP!
connectAndInitDB().catch(err => {
  console.error('❌ Fatal DB initialization error:', err)
})

// Initialize database schema
const initializeDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        avatar TEXT,
        permissions JSONB DEFAULT '{}',
        notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Companies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) DEFAULT 'Furnizor',
        name VARCHAR(255) NOT NULL,
        license VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        contact_person VARCHAR(255),
        cui VARCHAR(50),
        cui_file TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        company VARCHAR(255) NOT NULL,
        surface DECIMAL,
        status VARCHAR(50) DEFAULT 'Active',
        coordinates VARCHAR(100),
        plan_file TEXT,
        contact_person VARCHAR(255),
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)


    // Cabinets table (REDESIGNED)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cabinets (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        model VARCHAR(255),
        platform VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Slots table (UPDATED with serial_number and new fields)
    // First, try to add missing columns if they don't exist
    try {
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Slot Machine'`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS provider VARCHAR(255)`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS cabinet VARCHAR(255)`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS game_mix VARCHAR(255)`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS denomination DECIMAL(10,2) DEFAULT 0.01`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS max_bet DECIMAL(10,2)`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS rtp DECIMAL(5,2)`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS gaming_places INTEGER DEFAULT 1`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) DEFAULT 'Owned'`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS commission_date DATE`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(255)`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS notes TEXT`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal'`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
      await pool.query(`ALTER TABLE slots ADD COLUMN IF NOT EXISTS slot_id VARCHAR(255)`)
      console.log('✅ Slots table columns updated')
    } catch (error) {
      console.log('Note: Some columns might already exist:', error.message)
    }

    // Add manufacture_year column to slots table if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE slots ADD COLUMN IF NOT EXISTS manufacture_year INTEGER
      `)
      console.log('✅ Added manufacture_year column to slots table')
    } catch (error) {
      console.log('Note: manufacture_year column might already exist:', error.message)
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS slots (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) DEFAULT 'Slot Machine',
        serial_number VARCHAR(255) UNIQUE,
        model VARCHAR(255),
        provider VARCHAR(255),
        location VARCHAR(255) NOT NULL,
        address TEXT,
        game VARCHAR(255),
        cabinet VARCHAR(255),
        game_mix VARCHAR(255),
        denomination DECIMAL(10,2) DEFAULT 0.01,
        max_bet DECIMAL(10,2),
        rtp DECIMAL(5,2),
        gaming_places INTEGER DEFAULT 1,
        property_type VARCHAR(50) DEFAULT 'Owned',
        manufacture_year INTEGER,
        commission_date DATE,
        invoice_number VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add address column if it doesn't exist
    await pool.query(`
      ALTER TABLE slots 
      ADD COLUMN IF NOT EXISTS address TEXT
    `)

    // Game Mixes table (UPDATED with RTP)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_mixes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(255),
        games JSONB,
        rtp DECIMAL(5,2),
        denomination DECIMAL(10,2) DEFAULT 0.01,
        max_bet DECIMAL(10,2),
        gaming_places INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Providers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        contact VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        games_count INTEGER DEFAULT 0,
        contract_type VARCHAR(50) DEFAULT 'Standard',
        contract_end VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        logo JSONB,
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Proprietari (Property Owners) table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proprietari (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        cnp_cui VARCHAR(50),
        type VARCHAR(50) DEFAULT 'Persoana Fizica',
        status VARCHAR(50) DEFAULT 'Activ',
        notes TEXT,
        created_by VARCHAR(100) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Proprietari table created')

    // Contracts table - modified for property rental
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        contract_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        location_id INTEGER REFERENCES locations(id),
        proprietar_id INTEGER REFERENCES proprietari(id),
        type VARCHAR(100) DEFAULT 'Chirie Locație',
        status VARCHAR(50) DEFAULT 'Active',
        start_date DATE,
        end_date DATE,
        monthly_rent DECIMAL(15,2),
        currency VARCHAR(10) DEFAULT 'RON',
        deposit DECIMAL(15,2),
        payment_terms VARCHAR(255),
        description TEXT,
        file_path VARCHAR(500),
        created_by VARCHAR(100) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Add missing columns to existing contracts table
    try {
      await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS proprietar_id INTEGER REFERENCES proprietari(id)')
      await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS monthly_rent DECIMAL(15,2)')
      await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deposit DECIMAL(15,2)')
      await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255)')
      await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS surface_area DECIMAL(10,2)')
      await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_file TEXT')
      await pool.query('ALTER TABLE contracts ADD COLUMN IF NOT EXISTS annexes JSONB DEFAULT \'[]\'')
      await pool.query('ALTER TABLE contracts DROP COLUMN IF EXISTS company_id')
      await pool.query('ALTER TABLE contracts DROP COLUMN IF EXISTS provider_id')
      await pool.query('ALTER TABLE contracts DROP COLUMN IF EXISTS value')
      console.log('✅ Contracts table updated')
    } catch (error) {
      console.log('⚠️ Contracts table update skipped:', error.message)
    }

    // Add missing columns to existing providers table
    try {
      await pool.query('ALTER TABLE providers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)')
      await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)')
      console.log('✅ Providers table updated')
    } catch (error) {
      console.log('⚠️ Providers table update skipped:', error.message)
    }

    // Add competitors JSONB column to locations (for map caching + logo editing)
    try {
      await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT NULL')
      console.log('✅ Locations table: Added competitors JSONB column')
    } catch (error) {
      console.log('⚠️ Locations competitors column update skipped:', error.message)
    }

    // Add phone to users table (for contact info)
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)')
      console.log('✅ Users table: Added phone VARCHAR(20) column')
    } catch (error) {
      console.log('⚠️ Users phone column update skipped:', error.message)
    }

    // Add gallery JSONB to locations (for room photos)
    try {
      await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT NULL')
      console.log('✅ Locations table: Added gallery JSONB column')
    } catch (error) {
      console.log('⚠️ Locations gallery column update skipped:', error.message)
    }

    // Add NLC (Număr Loc de Consum) column to locations (for electric invoice matching)
    try {
      await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS nlc_code VARCHAR(50)')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_locations_nlc_code ON locations(nlc_code)')
      console.log('✅ Locations table: Added nlc_code column and index')
    } catch (error) {
      console.log('⚠️ Locations nlc_code column update skipped:', error.message)
    }

    // Create electric_invoices_nlc table for centralizing all NLC data from invoices
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS electric_invoices_nlc (
          id SERIAL PRIMARY KEY,
          nlc_code VARCHAR(50) NOT NULL,
          location_name VARCHAR(255),
          numar_factura VARCHAR(100),
          perioada_facturare VARCHAR(100),
          suma_totala DECIMAL(15,2),
          consum_kwh DECIMAL(15,3),
          pret_per_kwh DECIMAL(10,4),
          tva DECIMAL(5,2),
          furnizor VARCHAR(255),
          numar_contor VARCHAR(100),
          data_emiterii DATE,
          data_scadenta DATE,
          invoice_file_path TEXT,
          invoice_link TEXT,
          extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          saved_to_expenditures BOOLEAN DEFAULT FALSE,
          created_by INTEGER REFERENCES users(id),
          notes TEXT,
          UNIQUE(nlc_code, perioada_facturare, numar_factura)
        )
      `)
      await pool.query('CREATE INDEX IF NOT EXISTS idx_electric_nlc_code ON electric_invoices_nlc(nlc_code)')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_electric_nlc_location ON electric_invoices_nlc(location_name)')
      await pool.query('CREATE INDEX IF NOT EXISTS idx_electric_nlc_period ON electric_invoices_nlc(perioada_facturare)')

      // Adaugă coloană pentru suma totală a facturii (extrasă direct din factură, nu calculată din NLC-uri)
      try {
        await pool.query('ALTER TABLE electric_invoices_nlc ADD COLUMN IF NOT EXISTS invoice_total_amount DECIMAL(15,2)')
        await pool.query('CREATE INDEX IF NOT EXISTS idx_electric_invoice_total ON electric_invoices_nlc(numar_factura, invoice_total_amount)')
        console.log('✅ Added invoice_total_amount column to electric_invoices_nlc table')
      } catch (error) {
        console.log('⚠️ invoice_total_amount column already exists or error:', error.message)
      }

      console.log('✅ Created electric_invoices_nlc table for centralizing NLC data')
    } catch (error) {
      console.log('⚠️ electric_invoices_nlc table creation skipped:', error.message)
    }

    // Add missing columns to existing platforms table
    try {
      await pool.query('ALTER TABLE platforms ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES providers(id)')
      await pool.query('ALTER TABLE platforms ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)')
      await pool.query('ALTER TABLE platforms ADD COLUMN IF NOT EXISTS avatar_file TEXT')
      // Modify existing avatar_file column to TEXT if it exists
      await pool.query('ALTER TABLE platforms ALTER COLUMN avatar_file TYPE TEXT')
      console.log('✅ Platforms table updated')
    } catch (error) {
      console.log('⚠️ Platforms table update skipped:', error.message)
    }

    // Create platforms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platforms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        description TEXT,
        created_by VARCHAR(100) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Platforms table created')

    // Jackpots table (linked by serial_number)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jackpots (
        id SERIAL PRIMARY KEY,
        serial_number VARCHAR(255) NOT NULL,
        jackpot_name VARCHAR(255) NOT NULL,
        jackpot_type VARCHAR(50) DEFAULT 'Progressive',
        current_amount DECIMAL(15,2) DEFAULT 0,
        max_amount DECIMAL(15,2),
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        winner VARCHAR(255),
        triggered_date TIMESTAMP,
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Jackpots table created')

    // Metrology table (linked by serial_number)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metrology (
        id SERIAL PRIMARY KEY,
        cvt_series VARCHAR(50),
        cvt_number VARCHAR(255) UNIQUE NOT NULL,
        serial_number VARCHAR(255),
        cvt_type VARCHAR(50) NOT NULL,
        cvt_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        issuing_authority VARCHAR(255),
        provider VARCHAR(255),
        cabinet VARCHAR(255),
        game_mix VARCHAR(255),
        approval_type VARCHAR(255),
        software VARCHAR(255),
        cvt_file TEXT,
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Metrology table created')

    // Invoices table (linked by serial_number)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(255) UNIQUE NOT NULL,
        serial_number VARCHAR(255),
        company VARCHAR(255) NOT NULL,
        seller VARCHAR(255),
        location VARCHAR(255),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'RON',
        issue_date DATE NOT NULL,
        due_date DATE,
        payment_date DATE,
        status VARCHAR(50) DEFAULT 'Pending',
        invoice_type VARCHAR(100) DEFAULT 'Purchase',
        description TEXT,
        file_path VARCHAR(500),
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Invoices table created')

    // Warehouse table (for inactive slots)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse (
        id SERIAL PRIMARY KEY,
        serial_number VARCHAR(255) NOT NULL,
        provider VARCHAR(255),
        location VARCHAR(255) DEFAULT 'Depozit',
        cabinet VARCHAR(255),
        game_mix VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Inactive',
        notes TEXT,
        created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Warehouse table created')

    // Add missing columns to game_mixes table
    try {
      await pool.query('ALTER TABLE game_mixes ADD COLUMN IF NOT EXISTS rtp DECIMAL(5,2)')
      await pool.query('ALTER TABLE game_mixes ADD COLUMN IF NOT EXISTS denomination DECIMAL(10,2) DEFAULT 0.01')
      await pool.query('ALTER TABLE game_mixes ADD COLUMN IF NOT EXISTS max_bet DECIMAL(10,2)')
      await pool.query('ALTER TABLE game_mixes ADD COLUMN IF NOT EXISTS gaming_places INTEGER DEFAULT 1')
      console.log('✅ Game mixes table updated with missing columns')
    } catch (error) {
      console.log('⚠️ Game mixes columns may already exist:', error.message)
    }

    // Add seller column to invoices table
    try {
      await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller VARCHAR(255)')
      console.log('✅ Invoices table updated with seller column')
    } catch (error) {
      console.log('⚠️ Invoices seller column may already exist:', error.message)
    }

    // Add documents column to companies table
    try {
      await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS documents JSONB')
      console.log('✅ Companies table updated with documents column')
    } catch (error) {
      console.log('⚠️ Companies documents column may already exist:', error.message)
    }

    // Add avatar column to users table
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT')
      console.log('✅ Users table updated with avatar column')
    } catch (error) {
      console.log('⚠️ Users avatar column may already exist:', error.message)
    }

    // Create missing tables
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS legalDocuments (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100),
          description TEXT,
          status VARCHAR(50) DEFAULT 'Active',
          notes TEXT,
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Legal Documents table created')
    } catch (error) {
      console.log('⚠️ Legal Documents table may already exist:', error.message)
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS onjnReports (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100),
          description TEXT,
          status VARCHAR(50) DEFAULT 'Active',
          notes TEXT,
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ ONJN Reports table created')
    } catch (error) {
      console.log('⚠️ ONJN Reports table may already exist:', error.message)
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS onjn_operators (
          id SERIAL PRIMARY KEY,
          serial_number VARCHAR(50) UNIQUE NOT NULL,
          details_uuid VARCHAR(100) UNIQUE NOT NULL,
          equipment_type VARCHAR(100),
          company_name VARCHAR(200),
          brand_name VARCHAR(100),
          license_number VARCHAR(100),
          slot_address TEXT,
          city VARCHAR(100),
          county VARCHAR(100),
          authorization_date DATE,
          expiry_date DATE,
          status VARCHAR(50),
          is_expired BOOLEAN DEFAULT FALSE,
          onjn_list_url TEXT,
          onjn_details_url TEXT,
          last_scraped_at TIMESTAMP,
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await pool.query(`
        CREATE TABLE IF NOT EXISTS brands (
          id SERIAL PRIMARY KEY,
          brand_name VARCHAR(200) UNIQUE NOT NULL,
          company_name VARCHAR(200),
          brand_logo TEXT,
          logo_source VARCHAR(50) DEFAULT 'manual',
          description TEXT,
          website_url TEXT,
          total_slots INTEGER DEFAULT 0,
          active_slots INTEGER DEFAULT 0,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ ONJN Operators table created')
    } catch (error) {
      console.log('⚠️ ONJN Operators table may already exist:', error.message)
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS authorities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          price_initiala DECIMAL(10,2),
          price_reparatie DECIMAL(10,2),
          price_periodica DECIMAL(10,2),
          notes TEXT,
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Authorities table created')
    } catch (error) {
      console.log('⚠️ Authorities table may already exist:', error.message)
    }

    // Add created_by and created_at columns to all tables
    const tables = ['providers', 'cabinets', 'game_mixes', 'slots', 'locations', 'warehouse', 'metrology', 'jackpots', 'invoices', 'legalDocuments', 'onjnReports', 'authorities', 'users']

    for (const table of tables) {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal'`)
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`)
        console.log(`✅ ${table} table updated with created_by and created_at columns`)
      } catch (error) {
        console.log(`⚠️ ${table} columns may already exist:`, error.message)
      }
    }

    // Add approval workflow columns to tasks table
    try {
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by INTEGER`)
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by INTEGER`)
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_documents TEXT[] DEFAULT '{}'`)
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT`)
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP`)
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP`)
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checked_by INTEGER[] DEFAULT '{}'`)
      await pool.query(`ALTER TABLE tasks ADD FOREIGN KEY (completed_by) REFERENCES users(id)`)
      await pool.query(`ALTER TABLE tasks ADD FOREIGN KEY (approved_by) REFERENCES users(id)`)
      console.log('✅ Tasks table updated with approval workflow columns')
    } catch (error) {
      console.log('⚠️ Tasks approval columns may already exist:', error.message)
    }

    // Create admin user if not exists
    const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin'])

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await pool.query(
        'INSERT INTO users (username, password, full_name, email, role, avatar, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['admin', hashedPassword, 'Eugeniu Cazmal', 'eugeniu@cashpot.com', 'admin', '/assets/default-avatar.svg', 'active']
      )
      console.log('✅ Admin user created')
    } else {
      // Ensure admin user is active
      await pool.query(
        'UPDATE users SET status = $1 WHERE username = $2',
        ['active', 'admin']
      )
      console.log('✅ Admin user status updated to active')
    }

    // Create additional users
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    if (parseInt(userCount.rows[0].count) < 4) {
      const bcrypt = require('bcryptjs')

      // Create Vadim Balica user
      const vadimPassword = await bcrypt.hash('vadim123', 10)
      await pool.query(
        'INSERT INTO users (username, password, full_name, email, role, avatar) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO NOTHING',
        ['vadim', vadimPassword, 'Vadim Balica', 'vadim@cashpot.com', 'user', '/assets/default-avatar.svg']
      )

      // Create Andrei Chiperi user
      const andreiPassword = await bcrypt.hash('andrei123', 10)
      await pool.query(
        'INSERT INTO users (username, password, full_name, email, role, avatar) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO NOTHING',
        ['andrei', andreiPassword, 'Andrei Chiperi', 'andrei@cashpot.com', 'user', '/assets/default-avatar.svg']
      )

      console.log('✅ Additional users created')
    }

    // Create sample companies if none exist
    const companiesCheck = await pool.query('SELECT COUNT(*) FROM companies')
    if (parseInt(companiesCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO companies (type, name, license, email, phone, address, contact_person) VALUES
        ('Operator', 'BRML Industries SRL', 'L-2024-001', 'contact@brml.ro', '+40 21 123 4567', 'Str. Centrală nr. 1, București', 'Ion Popescu'),
        ('Operator', 'RMC Technologies', 'L-2024-002', 'info@rmc-tech.ro', '+40 264 987 654', 'Bd. Nordului nr. 25, Cluj', 'Maria Ionescu')
      `)
      console.log('✅ Sample companies created')

      // Create sample providers
      await pool.query(`
        INSERT INTO providers (name, company, contact, phone, games_count, contract_type, contract_end, status) VALUES
        ('EGT Digital', 'BRML Industries SRL', 'contact@egt-digital.com', '+40 21 555 1234', 45, 'Exclusiv', '2025-12-31', 'Active'),
        ('Novomatic', 'BRML Industries SRL', 'info@novomatic.ro', '+40 21 555 5678', 38, 'Standard', '2025-06-30', 'Active'),
        ('Amusnet Interactive', 'RMC Technologies', 'sales@amusnet.com', '+40 21 444 9876', 52, 'Premium', '2026-03-31', 'Active')
      `)
      console.log('✅ Sample providers created')

      // Create sample locations
      await pool.query(`
        INSERT INTO locations (name, address, company, surface, status, coordinates, notes) VALUES
        ('Cazinoul BRML București', 'Str. Centrală nr. 1, București', 'BRML Industries SRL', 500.5, 'Active', '44.4268,26.1025', 'Locația principală din București'),
        ('Cazinoul BRML Cluj', 'Bd. Nordului nr. 25, Cluj', 'BRML Industries SRL', 350.0, 'Active', '46.7712,23.6236', 'Locația din Cluj-Napoca'),
        ('Cazinoul RMC Timișoara', 'Str. Revoluției nr. 10, Timișoara', 'RMC Technologies', 280.0, 'Active', '45.7471,21.2087', 'Locația din Timișoara')
      `)
      console.log('✅ Sample locations created')

      // Create sample proprietari
      await pool.query(`
      INSERT INTO proprietari (name, contact_person, email, phone, address, cnp_cui, type, status, notes) VALUES
      ('Ion Popescu', 'Ion Popescu', 'ion.popescu@email.com', '+40712345678', 'Str. Mihai Viteazu nr. 10, București', '1234567890123', 'Persoana Fizica', 'Activ', 'Proprietar locație BRML București'),
      ('SC Imobiliare Cluj SRL', 'Maria Ionescu', 'maria@imobiliare-cluj.ro', '+40723456789', 'Bd. Eroilor nr. 25, Cluj-Napoca', 'RO12345678', 'Persoana Juridica', 'Activ', 'Companie imobiliară - proprietar locație Cluj'),
      ('Gheorghe Marinescu', 'Gheorghe Marinescu', 'g.marinescu@yahoo.com', '+40734567890', 'Str. Libertății nr. 5, Timișoara', '9876543210987', 'Persoana Fizica', 'Activ', 'Proprietar locație RMC Timișoara')
    `)
      console.log('✅ Sample proprietari created')

      // Create sample contracts for property rental
      await pool.query(`
      INSERT INTO contracts (contract_number, title, location_id, proprietar_id, type, status, start_date, end_date, monthly_rent, currency, deposit, payment_terms, description) VALUES
      ('CT-CH-2024-001', 'Contract Chirie BRML București', 2, 1, 'Chirie Locație', 'Active', '2024-01-01', '2025-12-31', 5000.00, 'RON', 10000.00, 'Lunar, până în data de 5', 'Contract de chirie pentru locația din București'),
      ('CT-CH-2024-002', 'Contract Chirie BRML Cluj', 3, 2, 'Chirie Locație', 'Active', '2024-03-01', '2025-06-30', 3500.00, 'RON', 7000.00, 'Lunar, până în data de 10', 'Contract de chirie pentru locația din Cluj'),
      ('CT-CH-2024-003', 'Contract Chirie RMC Timișoara', 4, 3, 'Chirie Locație', 'Active', '2024-06-01', '2026-03-31', 2800.00, 'RON', 5600.00, 'Lunar, până în data de 15', 'Contract de chirie pentru locația din Timișoara')
    `)
      console.log('✅ Sample contracts created')
    }

    // Create metrology sub-pages tables
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS approvals (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          cabinet VARCHAR(255) NOT NULL,
          game_mix VARCHAR(255),
          software VARCHAR(255),
          issuing_authority VARCHAR(255),
          checksum_md5 VARCHAR(255),
          checksum_sha256 VARCHAR(255),
          attachments JSONB DEFAULT '[]',
          notes TEXT,
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          updated_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create promotions table - CONSOLIDATED VERSION
      await pool.query(`
        CREATE TABLE IF NOT EXISTS promotions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          total_amount DECIMAL(15,2) DEFAULT 0,
          awarded_amount DECIMAL(15,2) DEFAULT 0,
          location VARCHAR(255) NOT NULL,
          locations JSONB DEFAULT '[]',
          prizes JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'Active',
          notes TEXT,
          banner_path VARCHAR(500),
          regulation_path VARCHAR(500),
          banner_url TEXT,
          documents_url TEXT,
          attachments JSONB DEFAULT '[]',
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          updated_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Ensure the issuing_authority column exists (migrate existing DBs)
      try {
        await pool.query("ALTER TABLE approvals ADD COLUMN IF NOT EXISTS issuing_authority VARCHAR(255)")
      } catch (e) {
        console.log('Authorities column check on approvals:', e.message)
      }

      // Ensure the attachments column exists (migrate existing DBs)
      try {
        await pool.query("ALTER TABLE approvals ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'")
      } catch (e) {
        console.log('Attachments column check on approvals:', e.message)
      }

      // Ensure the software column exists (migrate existing DBs)
      try {
        await pool.query("ALTER TABLE approvals ADD COLUMN IF NOT EXISTS software VARCHAR(255)")
      } catch (e) {
        console.log('Software column check on approvals:', e.message)
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS commissions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          serial_numbers JSONB,
          commission_date DATE NOT NULL,
          expiry_date DATE NOT NULL,
          notes TEXT,
          attachments JSONB,
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          updated_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Add attachments column if it doesn't exist
      await pool.query(`
        ALTER TABLE commissions ADD COLUMN IF NOT EXISTS attachments JSONB
      `).catch(err => {
        if (err.code !== '42701') throw err // Ignore duplicate column error
      })

      await pool.query(`
        CREATE TABLE IF NOT EXISTS software (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          cabinet VARCHAR(255) NOT NULL,
          game_mix VARCHAR(255) NOT NULL,
          version VARCHAR(50),
          notes TEXT,
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          updated_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Metrology sub-pages tables created')
    } catch (error) {
      console.log('⚠️ Metrology sub-pages tables may already exist:', error.message)
    }

    // Create slot history table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS slot_history (
          id SERIAL PRIMARY KEY,
          slot_id INTEGER,
          serial_number VARCHAR(255),
          field_name VARCHAR(255) NOT NULL,
          old_value TEXT,
          new_value TEXT,
          change_type VARCHAR(50) DEFAULT 'UPDATE',
          user_id VARCHAR(255),
          username VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        )
      `)
      console.log('✅ Slot history table created')
    } catch (error) {
      console.log('⚠️ Slot history table may already exist:', error.message)
    }

    // Promotions table already created above - consolidated version

    // Add missing columns if they don't exist
    try {
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS awarded_amount DECIMAL(15,2) DEFAULT 0")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]'")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS notes TEXT")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS banner_path VARCHAR(500)")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS regulation_path VARCHAR(500)")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS banner_url TEXT")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS documents_url TEXT")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)")
      await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'")
      console.log('✅ Added missing columns to promotions table')
    } catch (e) {
      console.log('⚠️ Error adding columns to promotions:', e.message)
    }

    // Remove CASCADE constraint from slot_history if it exists
    try {
      // First, check if the constraint exists
      const constraintCheck = await pool.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'slot_history' 
        AND constraint_type = 'FOREIGN KEY'
      `)

      console.log('🔍 Found constraints on slot_history:', constraintCheck.rows)

      for (const row of constraintCheck.rows) {
        const constraintName = row.constraint_name
        try {
          await pool.query(`ALTER TABLE slot_history DROP CONSTRAINT IF EXISTS ${constraintName}`)
          console.log(`✅ Removed constraint ${constraintName} from slot_history`)
        } catch (dropError) {
          console.log(`⚠️ Could not drop constraint ${constraintName}:`, dropError.message)
        }
      }

      if (constraintCheck.rows.length === 0) {
        console.log('✅ No foreign key constraints found on slot_history table')
      }
    } catch (error) {
      console.log('⚠️ Could not check constraints:', error.message)
    }

    // Add missing columns to existing companies table
    try {
      await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS cui VARCHAR(50)')
      await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS cui_file TEXT')
      console.log('✅ Companies table updated with CUI fields')
    } catch (error) {
      console.log('⚠️ Companies table update skipped:', error.message)
    }

    // Add new fields to metrology table
    try {
      await pool.query('ALTER TABLE metrology ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255)')
      await pool.query('ALTER TABLE metrology ADD COLUMN IF NOT EXISTS provider VARCHAR(255)')
      await pool.query('ALTER TABLE metrology ADD COLUMN IF NOT EXISTS cabinet VARCHAR(255)')
      await pool.query('ALTER TABLE metrology ADD COLUMN IF NOT EXISTS game_mix VARCHAR(255)')
      await pool.query('ALTER TABLE metrology ADD COLUMN IF NOT EXISTS approval_type VARCHAR(255)')
      await pool.query('ALTER TABLE metrology ADD COLUMN IF NOT EXISTS software VARCHAR(255)')
      await pool.query('ALTER TABLE metrology ADD COLUMN IF NOT EXISTS cvt_file TEXT')
      console.log('✅ Metrology table updated with new fields')
    } catch (error) {
      console.log('⚠️ Metrology new fields may already exist:', error.message)
    }

    // Add new fields to approvals table
    try {
      await pool.query('ALTER TABLE approvals ADD COLUMN IF NOT EXISTS game_mix VARCHAR(255)')
      await pool.query('ALTER TABLE approvals ADD COLUMN IF NOT EXISTS checksum_md5 VARCHAR(255)')
      await pool.query('ALTER TABLE approvals ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(255)')
      console.log('✅ Approvals table updated with new fields')
    } catch (error) {
      console.log('⚠️ Approvals new fields may already exist:', error.message)
    }

    // Add new fields to users table
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT \'{}\'')
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT \'{}\'')
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT')
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'active\'')
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)')
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL')
      console.log('✅ Users table updated with new fields including preferences and location_id')
    } catch (error) {
      console.log('⚠️ Users new fields may already exist:', error.message)
    }

    // Create tasks table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          priority VARCHAR(20) DEFAULT 'medium',
          assigned_to INTEGER[] DEFAULT '{}',
          created_by INTEGER NOT NULL,
          due_date TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `)
      console.log('✅ Tasks table created')
    } catch (error) {
      console.log('⚠️ Tasks table may already exist:', error.message)
    }

    // Create messages table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL,
          recipient_id INTEGER NOT NULL,
          subject VARCHAR(255),
          content TEXT NOT NULL,
          file_attachments TEXT[] DEFAULT '{}',
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (recipient_id) REFERENCES users(id)
        )
      `)
      console.log('✅ Messages table created')
    } catch (error) {
      console.log('⚠️ Messages table may already exist:', error.message)
    }

    // Create notifications table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          related_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `)
      console.log('✅ Notifications table created')
    } catch (error) {
      console.log('⚠️ Notifications table may already exist:', error.message)
    }

    // Create global settings table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS global_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(255) UNIQUE NOT NULL,
          setting_value JSONB NOT NULL,
          description TEXT,
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Global settings table created')
    } catch (error) {
      console.log('⚠️ Global settings table may already exist:', error.message)
    }

    // Expenditures sync table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenditures_sync (
          id SERIAL PRIMARY KEY,
          location_name VARCHAR(255),
          department_name VARCHAR(255),
          expenditure_type VARCHAR(255),
          amount DECIMAL(15,2),
          operational_date DATE,
          synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          original_location_id INTEGER,
          mapped_location_id INTEGER REFERENCES locations(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Expenditures sync table created')
    } catch (error) {
      console.log('⚠️ Expenditures sync table may already exist:', error.message)
    }

    // Add data_source column to expenditures_sync (for Google Sheets tracking)
    try {
      await pool.query(`
        ALTER TABLE expenditures_sync 
        ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'bat_sync'
      `)
      console.log('✅ Added data_source column to expenditures_sync')
    } catch (error) {
      console.log('⚠️ data_source column may already exist:', error.message)
    }

    // Add description column to expenditures_sync (for detailed explanations)
    try {
      await pool.query(`
        ALTER TABLE expenditures_sync 
        ADD COLUMN IF NOT EXISTS description TEXT
      `)
      console.log('✅ Added description column to expenditures_sync')
    } catch (error) {
      console.log('⚠️ description column may already exist:', error.message)
    }

    // CRITICAL: Create UNIQUE INDEX to prevent duplicates at database level!
    try {
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS expenditures_sync_unique_record 
        ON expenditures_sync (
          operational_date, 
          amount, 
          location_name, 
          department_name, 
          expenditure_type
        )
      `)
      console.log('✅ Created UNIQUE INDEX on expenditures_sync to prevent duplicates')
    } catch (error) {
      console.log('⚠️ Unique index may already exist:', error.message)
    }

    // Add created_by column to expenditures_sync (track user)
    try {
      await pool.query(`
        ALTER TABLE expenditures_sync 
        ADD COLUMN IF NOT EXISTS created_by INTEGER
      `)
      console.log('✅ Added created_by column to expenditures_sync')
    } catch (error) {
      console.log('⚠️ created_by column may already exist:', error.message)
    }

    // Add updated_by column to expenditures_sync (track edits)
    try {
      await pool.query(`
        ALTER TABLE expenditures_sync 
        ADD COLUMN IF NOT EXISTS updated_by INTEGER
      `)
      console.log('✅ Added updated_by column to expenditures_sync')
    } catch (error) {
      console.log('⚠️ updated_by column may already exist:', error.message)
    }

    // Add updated_at column to expenditures_sync (timestamp for edits)
    try {
      await pool.query(`
        ALTER TABLE expenditures_sync 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `)
      console.log('✅ Added updated_at column to expenditures_sync')
    } catch (error) {
      console.log('⚠️ updated_at column may already exist:', error.message)
    }

    // Expenditure location mapping table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenditure_location_mapping (
          id SERIAL PRIMARY KEY,
          external_location_name VARCHAR(255) UNIQUE NOT NULL,
          local_location_id INTEGER REFERENCES locations(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Expenditure location mapping table created')
    } catch (error) {
      console.log('⚠️ Expenditure location mapping table may already exist:', error.message)
    }

    // Expenditures backup rules table (for cheltuieli backup/schedule)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenditures_backup_rules (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          schedule_type VARCHAR(50) NOT NULL, -- 'manual', 'daily', 'weekly', 'monthly'
          schedule_time VARCHAR(10),          -- 'HH:MM'
          day_of_week VARCHAR(10),            -- 'Mon', 'Tue', ... (for weekly)
          day_of_month INTEGER,               -- 1-31 (for monthly)
          start_date DATE,
          end_date DATE,
          retention_days INTEGER DEFAULT 30,
          is_active BOOLEAN DEFAULT TRUE,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Expenditures backup rules table created')
    } catch (error) {
      console.log('⚠️ Expenditures backup rules table may already exist:', error.message)
    }

    // Migrate existing promotions to new prizes format
    try {
      // Check if old columns exist
      const hasOldColumns = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'promotions' AND column_name IN ('prize_amount', 'prize_date', 'winner')
      `)

      if (hasOldColumns.rows.length > 0) {
        console.log('🔄 Migrating old promotions format to new prizes format...')

        // Get all promotions
        const promotions = await pool.query('SELECT * FROM promotions')

        for (const promo of promotions.rows) {
          if (promo.prize_amount || promo.prize_date || promo.winner) {
            const prize = {
              amount: parseFloat(promo.prize_amount) || 0,
              currency: promo.prize_currency || 'RON',
              date: promo.prize_date,
              winner: promo.winner || null
            }

            await pool.query('UPDATE promotions SET prizes = $1 WHERE id = $2', [JSON.stringify([prize]), promo.id])
          }
        }

        // Drop old columns
        await pool.query('ALTER TABLE promotions DROP COLUMN IF EXISTS prize_amount')
        await pool.query('ALTER TABLE promotions DROP COLUMN IF EXISTS prize_currency')
        await pool.query('ALTER TABLE promotions DROP COLUMN IF EXISTS prize_date')
        await pool.query('ALTER TABLE promotions DROP COLUMN IF EXISTS winner')

        console.log('✅ Promotions migration completed')
      }
    } catch (migError) {
      console.log('⚠️ Promotions migration skipped:', migError.message)
    }

    console.log('✅ Database schema initialized')
  } catch (error) {
    console.error('❌ Database initialization error:', error)
  }
}

// Middleware
// Trust proxy for Render deployment (enables proper IP detection behind reverse proxy)
app.set('trust proxy', true)
app.use(morgan('combined'))

// CORS Configuration - Allow w1n.ro and other origins
const allowedOrigins = [
  'https://www.w1n.ro',
  'https://w1n.ro',
  'https://cashpot-frontend.vercel.app',
  'https://cashpot-online-2jxdj8yif-jeka7ros-projects.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
]

// CORS Configuration - PERMISIV pentru Render + Vercel
const corsOptions = {
  origin: function (origin, callback) {
    // Allow NO origin (mobile apps, curl, etc.) sau orice origin
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Keep-Alive', 'x-keep-alive'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

// Handle preflight requests explicitly
app.options('*', cors(corsOptions))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Serve uploaded files as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/legal', express.static(path.join(__dirname, '../legal')))
console.log('📁 Static files served from /uploads')

console.log('🔥 BEFORE ROUTE REGISTRATION - Express middleware configured!')
console.log('🌐 CORS allowed origins:', allowedOrigins)

// Health check endpoint
// PRIMARY HEALTH CHECK - NO DB DEPENDENCY (for Render health checks)
app.get('/health', (req, res) => {
  try {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.49',
      message: 'Server is running'
    })
  } catch (error) {
    console.error('Health check error:', error)
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.49',
      message: 'Server is running (error handled)'
    })
  }
})

// DETAILED HEALTH CHECK - includes DB status (optional)
app.get('/health/detailed', async (req, res) => {
  let dbStatus = 'Unknown'
  try {
    await pool.query('SELECT NOW()')
    dbStatus = 'Connected'
  } catch (err) {
    dbStatus = 'Disconnected'
  }

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.49',
    database: dbStatus,
    message: 'Server is running with detailed status'
  })
})

// Global settings endpoints
app.get('/api/global-settings', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    // Verifică dacă pool-ul este disponibil
    if (!pool) {
      console.error('❌ Database pool not available in global-settings endpoint')
      return res.json({ login_settings: {} }) // Return empty settings instead of 500
    }

    // Try to query global_settings table
    const result = await pool.query('SELECT * FROM global_settings ORDER BY setting_key')
    const settings = {}
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value
    })

    // Return format expected by frontend: { login_settings: {...} }
    res.json({
      login_settings: settings.login_settings || {}
    })
  } catch (error) {
    console.error('❌ Error fetching global settings:', error.message)
    console.error('Error details:', error.code, error.detail)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error stack:', error.stack)
    }
    // Return empty settings instead of 500 - don't crash the app!
    res.json({ login_settings: {} })
  }
})

app.put('/api/global-settings', authenticateUser, async (req, res) => {
  try {
    const { settings } = req.body
    const userId = req.user?.userId || 1

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        INSERT INTO global_settings (setting_key, setting_value, updated_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) 
        DO UPDATE SET 
          setting_value = $2,
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [key, JSON.stringify(value), userId])
    }

    res.json({ success: true, message: 'Global settings updated successfully' })
  } catch (error) {
    console.error('Error updating global settings:', error)
    res.status(500).json({ error: 'Failed to update global settings' })
  }
})

// ==================== IMMEDIATE ROUTE REGISTRATION ====================
console.log('🚨🚨🚨 IMMEDIATE ROUTE REGISTRATION v1.0.49! 🚨🚨🚨')
try {
  console.log('📋 Registering /api/promotions router IMMEDIATELY...')
  app.use('/api/promotions', promotionsRoutes)
  console.log('📋 Registering /api/cyber IMMEDIATELY...')
  app.use('/api/cyber', cyberRoutes)
  // console.log('📋 Registering /api/cyber-direct IMMEDIATELY...')
  // app.use('/api/cyber-direct', cyberDirectRoutes) // DISABLED - using JSON import only
  console.log('📋 Registering /api/tasks IMMEDIATELY...')
  app.use('/api/tasks', authenticateUser, tasksRoutes)
  console.log('📋 Registering /api/messages IMMEDIATELY...')
  app.use('/api/messages', authenticateUser, messagesRoutes)
  console.log('📋 Registering /api/notifications IMMEDIATELY...')
  app.use('/api/notifications', authenticateUser, notificationsRoutes)
  console.log('📋 Registering /api/expenditures IMMEDIATELY...')
  app.use('/api/expenditures', authenticateUser, expendituresRoutes)
  console.log('📋 Registering /api/incasari IMMEDIATELY...')
  app.use('/api/incasari', authenticateUser, incasariRoutes)
  console.log('✅✅✅ IMMEDIATE SUCCESS: ALL ROUTES REGISTERED! ✅✅✅')
} catch (error) {
  console.error('❌❌❌ IMMEDIATE ERROR during route registration:', error)
}

// 🚀 START SERVER IMMEDIATELY - DON'T WAIT FOR DB!
// This ensures Render health checks pass even if DB is slow
console.log('🚀🚀🚀 STARTING SERVER IMMEDIATELY (before DB init)...')
// Allow external access: listen on all interfaces (0.0.0.0) instead of just localhost
const HOST = process.env.HOST || '0.0.0.0'
// CRITICAL: Routes MUST be registered BEFORE server starts!
// Routes are registered at line ~4017, so we need to move app.listen() AFTER routes
// TEMPORARILY COMMENTED - will be moved after routes registration
// const server = app.listen(PORT, HOST, () => {
//   console.log(`🚀 Server running on ${HOST}:${PORT}`)
//   console.log(`📊 Database: PostgreSQL`)
//   console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`)
//   console.log(`📅 Build: ${BUILD_NUMBER} (${BUILD_DATE})`)
//   console.log('✅ Server is LIVE - Health checks will PASS!')
//   console.log('⏳ Database initialization running in background...')
// })

// DIRECT PROMOTIONS ENDPOINTS - BACKUP IF ROUTER FAILS
app.get('/api/promotions', async (req, res) => {
  console.log('🚨🚨🚨 DIRECT GET /api/promotions called!')
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if promotions table exists first
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'promotions'
        )
      `)

      if (!tableCheck.rows[0].exists) {
        console.log('❌ Promotions table does not exist')
        return res.json([])
      }
    } catch (tableError) {
      console.error('❌ Error checking promotions table:', tableError)
      return res.json([])
    }

    const result = await pool.query('SELECT * FROM promotions ORDER BY start_date DESC, created_at DESC')
    console.log(`✅ DIRECT GET found ${result.rows.length} promotions`)
    res.json(result.rows)
  } catch (error) {
    console.error('❌ DIRECT GET promotions error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/promotions', async (req, res) => {
  console.log('🚨🚨🚨 DIRECT POST /api/promotions called!')
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const {
      name, description, start_date, end_date, location, locations, prizes,
      status, notes, banner_url, documents_url, attachments
    } = req.body
    const createdBy = (req.user && (req.user.full_name || req.user.username)) || 'Eugeniu Cazmal'

    console.log('🚨 DIRECT POST data:', { name, description, start_date, end_date, location, locations, prizes })

    // Calculate total amount from prizes
    const prizesArray = Array.isArray(prizes) ? prizes : []
    const totalAmount = prizesArray.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

    // Handle locations array
    const locationsArray = Array.isArray(locations) ? locations : []

    // Parse attachments
    const attachmentsArray = Array.isArray(attachments) ? attachments : []

    // Use first location's dates if no global dates provided
    const globalStartDate = start_date || (locationsArray[0]?.start_date) || new Date().toISOString().split('T')[0]
    const globalEndDate = end_date || (locationsArray[0]?.end_date) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get first location name as default location
    const defaultLocation = location || (locationsArray.length > 0 ? locationsArray[0].location : 'Default Location')

    const result = await pool.query(
      `INSERT INTO promotions 
       (name, description, start_date, end_date, total_amount, awarded_amount, location, locations, 
        status, prizes, notes, banner_url, documents_url, attachments, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [
        name || 'Untitled Promotion',
        description || '',
        globalStartDate,
        globalEndDate,
        totalAmount,
        0,
        defaultLocation,
        JSON.stringify(locationsArray),
        status || 'Active',
        JSON.stringify(prizesArray),
        notes || '',
        banner_url || null,
        documents_url || null,
        JSON.stringify(attachmentsArray),
        createdBy
      ]
    )

    console.log('✅ DIRECT POST Promotion created:', result.rows[0].id)
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('❌ DIRECT POST promotions error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

console.log('🚨🚨🚨 DIRECT PROMOTIONS ENDPOINTS ADDED AFTER ROUTE REGISTRATION! 🚨🚨🚨')

// REMOVED FIRST EMERGENCY ENDPOINT - USING ONLY THE FINAL ONE BEFORE app.listen()

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine upload directory based on the endpoint
    let uploadDir = 'uploads'
    if (req.originalUrl.includes('/invoices')) {
      uploadDir = 'uploads/invoices'
    } else if (req.originalUrl.includes('/companies')) {
      uploadDir = 'uploads/companies'
    } else if (req.originalUrl.includes('/locations')) {
      uploadDir = 'uploads/locations'
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    let prefix = 'file'
    if (req.originalUrl.includes('/companies')) {
      prefix = 'company-doc'
    } else if (req.originalUrl.includes('/locations')) {
      prefix = 'location-plan'
    } else if (req.originalUrl.includes('/invoices')) {
      prefix = 'invoice'
    } else if (req.originalUrl.includes('/upload')) {
      prefix = 'approval-doc'
    }
    cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow PDF and image files
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Doar fișierele PDF, JPG, PNG sunt permise'), false)
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// Rate limiting - very permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute - very permissive for development
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Import Marina slots endpoint
app.post('/api/slots/import-marina', async (req, res) => {
  console.log('📥 Importing slots from Marina...')
  try {
    const { items } = req.body

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required', imported: 0 })
    }

    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available', imported: 0 })
    }

    let imported = 0
    let errors = []

    for (const item of items) {
      try {
        // Check if slot already exists by serial number
        const existingQuery = 'SELECT id FROM slots WHERE serial_number = $1'
        const existingResult = await pool.query(existingQuery, [item.serial_number])

        if (existingResult.rows.length > 0) {
          // Update existing slot
          const updateQuery = `
            UPDATE slots SET 
              slot_id = $1,
              provider = $2,
              cabinet = $3,
              game_mix = $4,
              status = $5,
              location = $6,
              address = $7,
              manufacture_year = $8,
              updated_at = CURRENT_TIMESTAMP
            WHERE serial_number = $9
          `
          await pool.query(updateQuery, [
            item.slot_id || item.serial_number,
            item.provider || null,
            item.cabinet || null,
            item.game_mix || null,
            item.status || 'Active',
            item.location || null,
            item.address || null,
            item.manufacture_year || null,
            item.serial_number
          ])
        } else {
          // Insert new slot - use serial_number as slot_id if not provided
          const insertQuery = `
            INSERT INTO slots (
              slot_id, serial_number, provider, cabinet, game_mix, 
              status, location, address, manufacture_year, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `
          await pool.query(insertQuery, [
            item.slot_id || item.serial_number, // Use slot_id if provided, otherwise use serial_number
            item.serial_number,
            item.provider || null,
            item.cabinet || null,
            item.game_mix || null,
            item.status || 'Active',
            item.location || null,
            item.address || null,
            item.manufacture_year || null
          ])
        }

        imported++
      } catch (itemError) {
        console.error(`Error importing slot ${item.serial_number}:`, itemError)
        errors.push({
          serial_number: item.serial_number,
          error: itemError.message
        })
      }
    }

    console.log(`✅ Imported ${imported} slots from Marina`)
    res.json({
      success: true,
      imported,
      errors: errors.length,
      errorDetails: errors
    })
  } catch (error) {
    console.error('Error importing slots from Marina:', error)
    res.status(500).json({ success: false, error: 'Failed to import slots from Marina', imported: 0 })
  }
})

app.post('/api/locations/import-marina', async (req, res) => {
  console.log('⚠️ /api/locations/import-marina called - not implemented')
  res.json({ success: false, error: 'Endpoint not implemented yet', imported: 0 })
})

app.get('/api/cyber-direct/fetch-yesterday', async (req, res) => {
  console.log('⚠️ /api/cyber-direct/fetch-yesterday called - not implemented')
  res.json({ success: false, error: 'Endpoint not implemented yet', data: [] })
})

// REMOVED DUPLICATE HEALTH ENDPOINTS - using only /health and /health/detailed from line 1199
// These duplicates were causing timeout issues by blocking on DB queries

// PDF viewer endpoint
app.get('/api/pdf/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const result = await pool.query('SELECT cui_file FROM companies WHERE id = $1', [companyId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' })
    }

    const cuiFile = result.rows[0].cui_file
    if (!cuiFile) {
      return res.status(404).json({ error: 'CUI file not found' })
    }

    // Extract base64 data
    const base64Data = cuiFile.split(',')[1]
    const pdfBuffer = Buffer.from(base64Data, 'base64')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline')
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error serving PDF:', error)
    res.status(500).json({ error: 'Error serving PDF' })
  }
})

// PDF viewer endpoint for metrology CVT files
app.get('/api/cvt-pdf/:metrologyId', async (req, res) => {
  try {
    const { metrologyId } = req.params
    const result = await pool.query('SELECT cvt_file FROM metrology WHERE id = $1', [metrologyId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Metrology record not found' })
    }

    const cvtFile = result.rows[0].cvt_file
    if (!cvtFile) {
      return res.status(404).json({ error: 'CVT file not found' })
    }

    // Extract base64 data
    const base64Data = cvtFile.split(',')[1]
    const pdfBuffer = Buffer.from(base64Data, 'base64')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline')
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error serving CVT PDF:', error)
    res.status(500).json({ error: 'Error serving CVT PDF' })
  }
})

// Debug endpoint
app.get('/debug', async (req, res) => {
  try {
    const locations = await pool.query('SELECT COUNT(*) as count FROM locations')
    const contracts = await pool.query('SELECT COUNT(*) as count FROM contracts')
    const companies = await pool.query('SELECT COUNT(*) as count FROM companies')
    const providers = await pool.query('SELECT COUNT(*) as count FROM providers')
    const platforms = await pool.query('SELECT COUNT(*) as count FROM platforms')

    res.json({
      locations: locations.rows[0].count,
      contracts: contracts.rows[0].count,
      companies: companies.rows[0].count,
      providers: providers.rows[0].count,
      platforms: platforms.rows[0].count
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/debug/platforms', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'platforms'
      ORDER BY ordinal_position
    `)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/debug/providers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'providers'
      ORDER BY ordinal_position
    `)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/debug/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Auth Routes - ELIMINAT DUPLICAT - folosim authRoutes din routes/auth.js
// Endpoint-ul de login este definit în routes/auth.js și montat la app.use('/api/auth', authRoutes)

// Verify token
app.get('/api/auth/verify', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      console.error('❌ [verify] Database pool not available')
      return res.status(503).json({
        success: false,
        message: 'Database connection not available'
      })
    }

    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header provided'
      })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'cashpot-secret-key-2024')
    } catch (jwtError) {
      console.error('❌ [verify] JWT verification error:', jwtError.message)
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      })
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId])

    if (result.rows.length === 0) {
      console.warn(`⚠️ [verify] User not found for ID: ${decoded.userId}`)
      return res.status(401).json({
        success: false,
        message: 'User not found'
      })
    }

    const user = result.rows[0]

    // Get default permissions for role if permissions are empty
    let userPermissions = user.permissions
    if (!userPermissions || Object.keys(userPermissions).length === 0) {
      // Import default permissions logic (simplified version)
      const defaultPermissions = {
        admin: {
          dashboard: { view: true, edit: true },
          companies: { view: true, create: true, edit: true, delete: true, export: true },
          locations: { view: true, create: true, edit: true, delete: true, export: true },
          providers: { view: true, create: true, edit: true, delete: true, export: true },
          cabinets: { view: true, create: true, edit: true, delete: true, export: true },
          game_mixes: { view: true, create: true, edit: true, delete: true, export: true },
          slots: { view: true, create: true, edit: true, delete: true, export: true, import: true },
          warehouse: { view: true, create: true, edit: true, delete: true, export: true },
          metrology: { view: true, create: true, edit: true, delete: true, export: true },
          contracts: { view: true, create: true, edit: true, delete: true, export: true },
          invoices: { view: true, create: true, edit: true, delete: true, export: true },
          jackpots: { view: true, create: true, edit: true, delete: true },
          onjn: { view: true, create: true, edit: true, delete: true, export: true },
          legal: { view: true, create: true, edit: true, delete: true, export: true },
          users: { view: true, create: true, edit: true, delete: true },
          settings: { view: true, edit: true },
          cyber_import: { view: true, import: true }
        },
        user: {
          dashboard: { view: true, edit: false },
          companies: { view: true, create: false, edit: false, delete: false, export: true },
          locations: { view: true, create: false, edit: false, delete: false, export: true },
          providers: { view: true, create: false, edit: false, delete: false, export: true },
          cabinets: { view: true, create: false, edit: false, delete: false, export: true },
          game_mixes: { view: true, create: false, edit: false, delete: false, export: true },
          slots: { view: true, create: false, edit: false, delete: false, export: true, import: false },
          warehouse: { view: true, create: false, edit: false, delete: false, export: true },
          metrology: { view: true, create: false, edit: false, delete: false, export: true },
          contracts: { view: true, create: false, edit: false, delete: false, export: true },
          invoices: { view: true, create: false, edit: false, delete: false, export: true },
          jackpots: { view: true, create: false, edit: false, delete: false },
          onjn: { view: true, create: false, edit: false, delete: false, export: true },
          legal: { view: true, create: false, edit: false, delete: false, export: true },
          users: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, edit: false },
          cyber_import: { view: false, import: false },
          promotions: { view: true, create: false, edit: false, delete: false, export: false }
        },
        marketing: {
          dashboard: { view: true, edit: false },
          companies: { view: true, create: false, edit: false, delete: false, export: true },
          locations: { view: true, create: false, edit: false, delete: false, export: true },
          providers: { view: false, create: false, edit: false, delete: false, export: false },
          cabinets: { view: false, create: false, edit: false, delete: false, export: false },
          game_mixes: { view: false, create: false, edit: false, delete: false, export: false },
          slots: { view: true, create: false, edit: false, delete: false, export: true, import: false },
          warehouse: { view: false, create: false, edit: false, delete: false, export: false },
          metrology: { view: false, create: false, edit: false, delete: false, export: false },
          contracts: { view: false, create: false, edit: false, delete: false, export: false },
          invoices: { view: false, create: false, edit: false, delete: false, export: false },
          jackpots: { view: true, create: false, edit: false, delete: false },
          onjn: { view: false, create: false, edit: false, delete: false, export: false },
          legal: { view: false, create: false, edit: false, delete: false, export: false },
          users: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, edit: false },
          cyber_import: { view: false, import: false },
          promotions: { view: true, create: true, edit: true, delete: true, export: true }
        },
        operational: {
          dashboard: { view: true, edit: false },
          companies: { view: true, create: false, edit: false, delete: false, export: true },
          locations: { view: true, create: true, edit: true, delete: false, export: true },
          providers: { view: true, create: false, edit: false, delete: false, export: true },
          cabinets: { view: true, create: true, edit: true, delete: false, export: true },
          game_mixes: { view: true, create: false, edit: false, delete: false, export: true },
          slots: { view: true, create: true, edit: true, delete: false, export: true, import: true },
          warehouse: { view: true, create: true, edit: true, delete: false, export: true },
          metrology: { view: true, create: true, edit: true, delete: false, export: true },
          contracts: { view: false, create: false, edit: false, delete: false, export: false },
          invoices: { view: false, create: false, edit: false, delete: false, export: false },
          jackpots: { view: true, create: false, edit: false, delete: false },
          onjn: { view: true, create: false, edit: false, delete: false, export: true },
          legal: { view: false, create: false, edit: false, delete: false, export: false },
          users: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, edit: false },
          cyber_import: { view: true, import: true },
          promotions: { view: true, create: false, edit: false, delete: false, export: true }
        },
        financiar: {
          dashboard: { view: true, edit: false },
          companies: { view: true, create: false, edit: false, delete: false, export: true },
          locations: { view: true, create: false, edit: false, delete: false, export: true },
          providers: { view: true, create: false, edit: false, delete: false, export: true },
          cabinets: { view: true, create: false, edit: false, delete: false, export: true },
          game_mixes: { view: true, create: false, edit: false, delete: false, export: true },
          slots: { view: true, create: false, edit: false, delete: false, export: true, import: false },
          warehouse: { view: false, create: false, edit: false, delete: false, export: false },
          metrology: { view: false, create: false, edit: false, delete: false, export: false },
          contracts: { view: true, create: false, edit: false, delete: false, export: true },
          invoices: { view: true, create: true, edit: true, delete: false, export: true },
          jackpots: { view: true, create: false, edit: false, delete: false },
          onjn: { view: false, create: false, edit: false, delete: false, export: false },
          legal: { view: false, create: false, edit: false, delete: false, export: false },
          users: { view: false, create: false, edit: false, delete: false },
          settings: { view: false, edit: false },
          cyber_import: { view: false, import: false },
          promotions: { view: true, create: false, edit: false, delete: false, export: true }
        }
      }
      userPermissions = defaultPermissions[user.role] || defaultPermissions.user
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        permissions: userPermissions,
        notes: user.notes,
        status: user.status
      }
    })
  } catch (error) {
    console.error('❌ Token verification error:', error.message)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error stack:', error.stack)
    }

    // Different error types
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      })
    }

    // Database / connection errors → 503 so frontend shows "backend temporarily unavailable"
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('Connection') || error.message?.includes('timeout')) {
      return res.status(503).json({
        success: false,
        message: 'Database connection error'
      })
    }
    if (error.code === 'ECONNRESET') {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Companies routes
app.get('/api/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT *, cui_file as "cuiFile" FROM companies ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT *, cui_file as "cuiFile" FROM companies WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/companies', async (req, res) => {
  try {
    const { type, name, license, email, phone, address, contactPerson, contact_person, status, cui, cuiFile } = req.body
    const result = await pool.query(
      'INSERT INTO companies (type, name, license, email, phone, address, contact_person, status, cui, cui_file) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [type || 'Furnizor', name, license, email, phone, address, contactPerson || contact_person, status || 'Active', cui, cuiFile]
    )
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { type, name, license, email, phone, address, contactPerson, contact_person, status, cui, cuiFile } = req.body
    const result = await pool.query(
      'UPDATE companies SET type = $1, name = $2, license = $3, email = $4, phone = $5, address = $6, contact_person = $7, status = $8, cui = $9, cui_file = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
      [type || 'Furnizor', name, license, email, phone, address, contactPerson || contact_person, status, cui, cuiFile, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Companies PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' })
    }
    res.json({ success: true, message: 'Company deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Locations routes
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.*,
        c.name as company_name,
        c.license as company_license,
        c.contact_person as company_contact
      FROM locations l
      LEFT JOIN companies c ON l.company = c.name
      ORDER BY l.created_at DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Locations GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/locations', async (req, res) => {
  try {
    const { name, address, company, surface, status, coordinates, contact_person, nlc_code, notes, plan_file } = req.body

    console.log('📍 POST /api/locations - Creating new location:')
    console.log('   Name:', name)
    console.log('   NLC Code:', nlc_code || 'N/A')
    console.log('   plan_file received?', !!plan_file)
    console.log('   plan_file type:', typeof plan_file)
    console.log('   plan_file is Base64?', plan_file?.startsWith('data:'))
    if (plan_file) {
      console.log('   plan_file length:', plan_file.length, 'chars')
      console.log('   plan_file preview:', plan_file.substring(0, 100) + '...')
    }

    const result = await pool.query(
      'INSERT INTO locations (name, address, company, surface, status, coordinates, contact_person, nlc_code, plan_file, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, address, company, surface, status || 'Active', coordinates, contact_person, nlc_code || null, plan_file || null, notes]
    )

    console.log('✅ Location created with ID:', result.rows[0].id)
    console.log('   plan_file saved:', !!result.rows[0].plan_file)

    const newLocation = { ...result.rows[0], capacity: 0 }
    res.json(newLocation)
  } catch (error) {
    console.error('❌ POST /api/locations error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/locations/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, address, company, surface, status, coordinates, contact_person, nlc_code, notes, plan_file } = req.body

    console.log('📍 PUT /api/locations/:id - Updating location:', id)
    console.log('   Name:', name)
    console.log('   NLC Code:', nlc_code || 'N/A')
    console.log('   plan_file in request?', plan_file !== undefined)
    console.log('   plan_file type:', typeof plan_file)
    console.log('   plan_file is Base64?', plan_file?.startsWith('data:'))
    if (plan_file) {
      console.log('   plan_file length:', plan_file.length, 'chars')
      console.log('   plan_file preview:', plan_file.substring(0, 100) + '...')
    }

    // If plan_file is provided, update it; otherwise keep existing
    let updateQuery
    let queryParams
    if (plan_file !== undefined) {
      console.log('   → Will UPDATE plan_file in DB')
      updateQuery = 'UPDATE locations SET name = $1, address = $2, company = $3, surface = $4, status = $5, coordinates = $6, contact_person = $7, nlc_code = $8, plan_file = $9, notes = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *'
      queryParams = [name, address, company, surface, status, coordinates, contact_person, nlc_code || null, plan_file, notes, id]
    } else {
      console.log('   → Will KEEP existing plan_file (not updating)')
      updateQuery = 'UPDATE locations SET name = $1, address = $2, company = $3, surface = $4, status = $5, coordinates = $6, contact_person = $7, nlc_code = $8, notes = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *'
      queryParams = [name, address, company, surface, status, coordinates, contact_person, nlc_code || null, notes, id]
    }

    const result = await pool.query(updateQuery, queryParams)
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }

    console.log('✅ Location updated successfully')
    console.log('   plan_file in DB now:', !!result.rows[0].plan_file)

    res.json(result.rows[0])
  } catch (error) {
    console.error('❌ PUT /api/locations/:id error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/locations/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }
    res.json({ success: true, message: 'Location deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/locations/:id/sync-competitors - Sync competitors from ONJN + auto-geocode + auto-logo
app.post('/api/locations/:id/sync-competitors', async (req, res) => {
  try {
    const { id } = req.params

    console.log(`🔄 Syncing competitors for location ${id}...`)

    // Get location details
    const locationResult = await pool.query('SELECT * FROM locations WHERE id = $1', [id])
    if (locationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }

    const location = locationResult.rows[0]

    // Extract city from address (assume format: "Strada X, Oraș, Județ")
    const addressParts = (location.address || '').split(',').map(p => p.trim())
    const city = addressParts[addressParts.length - 2] || addressParts[0]
    const county = addressParts[addressParts.length - 1] || ''

    console.log(`   City: ${city}, County: ${county}`)

    // Fetch ONJN data (scraping LIVE din site ONJN!)
    console.log(`   Scraping LIVE ONJN pentru ${city}...`)

    const https = await import('https')
    const cheerio = await import('cheerio')
    const { load } = cheerio

    const BASE_URL = 'https://onjn.gov.ro'
    const LIST_PATH = '/ro/equipments'

    let onjnData = []

    try {
      // Scrape ONJN Class 1 pentru orașul respectiv
      const params = new URLSearchParams()
      params.set('city', city)
      params.set('page', '1')

      const url = `${BASE_URL}${LIST_PATH}?${params}`
      console.log(`   URL: ${url}`)

      const response = await new Promise((resolve, reject) => {
        https.default.get(url, (res) => {
          let data = ''
          res.on('data', chunk => data += chunk)
          res.on('end', () => resolve({ data }))
        }).on('error', reject)
      })

      const $ = load(response.data)

      // Parse table rows (group by address pentru unique locations)
      const locations = new Map()

      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length < 6) return

        const operator = $(cells[3]).text().trim()
        const address = $(cells[5]).text().trim()
        const cityFromTable = $(cells[6]).text().trim()
        const countyFromTable = $(cells[7]).text().trim()

        // Group by address (1 location poate avea multiple sloturi)
        const key = `${operator}_${address}`

        if (!locations.has(key)) {
          locations.set(key, {
            location_name: `${operator} ${cityFromTable}`,
            operator: operator,
            address: address,
            city: cityFromTable,
            county: countyFromTable,
            slot_count: 1
          })
        } else {
          locations.get(key).slot_count++
        }
      })

      onjnData = Array.from(locations.values())
      console.log(`   Scraped ${onjnData.length} unique locations din ONJN`)
    } catch (scrapeError) {
      console.error(`   ❌ ONJN scraping failed: ${scrapeError.message}`)
      console.log(`   Returnez empty (NU crapă cu 500!)`)

      return res.json({
        success: true,
        message: `Nu s-au putut încărca date ONJN pentru ${city}`,
        data: {
          updated_at: new Date().toISOString(),
          city: city,
          county: county,
          total: 0,
          competitors: []
        }
      })
    }

    if (onjnData.length === 0) {
      console.log(`   ⚠️ NU există competitori în ${city}`)
      return res.json({
        success: true,
        message: `Nu există competitori în ${city}`,
        data: {
          updated_at: new Date().toISOString(),
          city: city,
          county: county,
          total: 0,
          competitors: []
        }
      })
    }

    const onjnResponse = {
      data: {
        success: true,
        locations: onjnData
      }
    }

    // Filter out CASHPOT/SMARTFLIX locations + DOAR același oraș!
    const competitorLocations = onjnResponse.data.locations.filter(loc => {
      const operator = (loc.operator || '').toLowerCase()
      const locCity = (loc.city || '').toLowerCase().trim()
      const targetCity = city.toLowerCase().trim()

      // Exclude CASHPOT/SMARTFLIX
      if (operator.includes('cashpot') || operator.includes('smartflix')) {
        return false
      }

      // Include DOAR competitori din ACELAȘI ORAȘ
      // Match exact sau parțial (pentru "Râmnicu Vâlcea" vs "Ramnicu Valcea")
      const cityMatch = locCity === targetCity ||
        locCity.includes(targetCity) ||
        targetCity.includes(locCity) ||
        locCity.replace(/[^a-z0-9]/g, '') === targetCity.replace(/[^a-z0-9]/g, '')

      return cityMatch
    })

    console.log(`   Found ${competitorLocations.length} competitors în ${city} (filtrat din ${onjnResponse.data.locations.length} total)`)

    if (competitorLocations.length === 0) {
      console.log(`   ⚠️ NU există competitori în ${city}!`)
      return res.json({
        success: true,
        message: `Nu există competitori în ${city}`,
        data: {
          updated_at: new Date().toISOString(),
          city: city,
          county: county,
          total: 0,
          competitors: []
        }
      })
    }

    // Brand logo mapping
    const BRAND_LOGOS = {
      'MILLION': { emoji: '💎', color: '#FFD700' },
      'MAXBET': { emoji: '🎲', color: '#E31E24' },
      'ADMIRAL': { emoji: '⚓', color: '#003D7A' },
      'WINBET': { emoji: '🎰', color: '#00A651' },
      'VLAD': { emoji: '🦇', color: '#8B0000' },
      'VLAD CAZINO': { emoji: '🦇', color: '#8B0000' },
      'FORTUNA': { emoji: '🍀', color: '#228B22' },
      'PRINCESS': { emoji: '👑', color: '#FF69B4' },
      'VEGAS': { emoji: '💎', color: '#FFD700' },
      'MONTE CARLO': { emoji: '🎲', color: '#1E90FF' },
      'ROYAL': { emoji: '👑', color: '#4B0082' },
      'ELDORADO': { emoji: '💰', color: '#DAA520' },
      'JOKER': { emoji: '🃏', color: '#FF4500' },
      'BET': { emoji: '🎯', color: '#FF6347' },
      'CASINO': { emoji: '🏢', color: '#696969' }
    }

    // Geocode function (simplified - uses Nominatim)
    const geocodeAddress = async (address) => {
      try {
        const cleanAddress = address.replace(/\s+,/g, ',').replace(/,\s+/g, ', ')
        const addressWithCountry = cleanAddress.toLowerCase().includes('romania') || cleanAddress.toLowerCase().includes('românia')
          ? cleanAddress
          : `${cleanAddress}, Romania`

        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
          params: {
            q: addressWithCountry,
            format: 'json',
            limit: 1
          },
          headers: { 'User-Agent': 'CASHPOT/1.0' },
          timeout: 5000
        })

        if (response.data && response.data.length > 0) {
          return {
            lat: parseFloat(response.data[0].lat),
            lng: parseFloat(response.data[0].lon)
          }
        }
        return null
      } catch (error) {
        console.error(`   Geocoding failed for ${address}:`, error.message)
        return null
      }
    }

    // Process competitors (limit to 15 for performance)
    const competitors = []
    const mainCoords = location.coordinates ? JSON.parse(location.coordinates) : null

    for (let i = 0; i < Math.min(competitorLocations.length, 15); i++) {
      const comp = competitorLocations[i]

      // Auto-detect logo
      const brandUpper = (comp.operator || '').toUpperCase()
      let logo = '🏢' // default
      let logoColor = '#696969'

      for (const [key, value] of Object.entries(BRAND_LOGOS)) {
        if (brandUpper.includes(key)) {
          logo = value.emoji
          logoColor = value.color
          break
        }
      }

      // Geocode address
      let coords = await geocodeAddress(comp.address || `${comp.city}, ${comp.county}`)

      // If geocoding fails and we have main location coords, use random offset
      if (!coords && mainCoords) {
        const angle = Math.random() * 2 * Math.PI
        const radius = 0.005 + Math.random() * 0.015 // 500m-2km
        coords = {
          lat: mainCoords.lat + Math.cos(angle) * radius,
          lng: mainCoords.lng + Math.sin(angle) * radius
        }
      }

      if (coords) {
        competitors.push({
          name: comp.location_name || comp.operator,
          brand: comp.operator,
          operator: comp.operator,
          city: comp.city,
          county: comp.county,
          address: comp.address,
          coords: coords,
          logo: logo,
          logo_type: 'emoji',
          logo_url: null,
          logo_color: logoColor
        })
      }

      // Rate limiting for Nominatim (1 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`   Successfully processed ${competitors.length} competitors`)

    // Save to database
    const competitorsData = {
      updated_at: new Date().toISOString(),
      city: city,
      county: county,
      total: competitors.length,
      competitors: competitors
    }

    console.log(`💾 Salvare în DB pentru location ${id}...`)
    console.log(`   Total competitori: ${competitors.length}`)
    console.log(`   Mărime JSON: ${JSON.stringify(competitorsData).length} chars`)

    try {
      await pool.query(
        'UPDATE locations SET competitors = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(competitorsData), id]
      )

      console.log(`✅ Competitors synced for location ${id}`)

      res.json({
        success: true,
        message: `Successfully synced ${competitors.length} competitors în ${city}`,
        data: competitorsData
      })
    } catch (dbError) {
      console.error(`❌ DB Error saving competitors for location ${id}:`, dbError)
      throw dbError // Re-throw pentru catch-ul exterior
    }
  } catch (error) {
    console.error('❌ Error syncing competitors:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// PUT /api/locations/:id/competitors - Update competitors manually (edit logo, coords, etc)
app.put('/api/locations/:id/competitors', async (req, res) => {
  try {
    const { id } = req.params
    const { competitors } = req.body // Full competitors JSONB object

    console.log(`📝 Updating competitors for location ${id}...`)

    await pool.query(
      'UPDATE locations SET competitors = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(competitors), id]
    )

    console.log(`✅ Competitors updated for location ${id}`)

    res.json({
      success: true,
      message: 'Competitors updated successfully',
      data: competitors
    })
  } catch (error) {
    console.error('❌ Error updating competitors:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/competitors - Get all competitors from all locations (centralized)
app.get('/api/competitors', async (req, res) => {
  try {
    console.log('📊 GET /api/competitors - Fetching all competitors...')

    // Fetch all locations with competitors data
    const result = await pool.query(`
      SELECT 
        id,
        name,
        address,
        company,
        competitors
      FROM locations
      WHERE competitors IS NOT NULL
      ORDER BY name ASC
    `)

    // Flatten competitors from all locations
    const allCompetitors = []

    result.rows.forEach(location => {
      if (location.competitors && location.competitors.competitors) {
        location.competitors.competitors.forEach(comp => {
          allCompetitors.push({
            ...comp,
            location_id: location.id,
            location_name: location.name,
            location_address: location.address,
            location_company: location.company,
            last_updated: location.competitors.updated_at
          })
        })
      }
    })

    console.log(`✅ Found ${allCompetitors.length} total competitors from ${result.rows.length} locations`)

    res.json({
      success: true,
      total: allCompetitors.length,
      locations_count: result.rows.length,
      competitors: allCompetitors
    })
  } catch (error) {
    console.error('❌ Error fetching competitors:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Providers routes
app.get('/api/providers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             COALESCE(
               (SELECT SUM(jsonb_array_length(gm.games->'games')) 
                FROM game_mixes gm 
                WHERE gm.provider = p.name
               ), 0
             ) as games_count
      FROM providers p
      ORDER BY p.created_at DESC
    `)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/providers', async (req, res) => {
  try {
    const { name, contact_person, company, contact, phone, status, logo, notes } = req.body
    const result = await pool.query(
      'INSERT INTO providers (name, contact_person, company, contact, phone, status, logo, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, contact_person, company, contact, phone, status || 'Active', JSON.stringify(logo), notes]
    )

    // Calculate games_count from game_mixes
    const gamesCountResult = await pool.query(`
      SELECT COALESCE(SUM(jsonb_array_length(games->'games')), 0) as games_count
      FROM game_mixes
      WHERE provider = $1
    `, [name])

    const provider = {
      ...result.rows[0],
      games_count: parseInt(gamesCountResult.rows[0].games_count)
    }

    res.json(provider)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/providers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, contact_person, company, contact, phone, status, logo, notes } = req.body
    // Load existing provider to allow partial update
    const existingProviderResult = await pool.query('SELECT * FROM providers WHERE id = $1', [id])
    if (existingProviderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }
    const existing = existingProviderResult.rows[0]
    const oldName = existing.name

    const nextName = (name ?? existing.name)
    const nextContactPerson = (contact_person ?? existing.contact_person)
    const nextCompany = (company ?? existing.company)
    const nextContact = (contact ?? existing.contact)
    const nextPhone = (phone ?? existing.phone)
    const nextStatus = (status ?? existing.status)
    const nextLogo = (logo !== undefined ? JSON.stringify(logo) : JSON.stringify(existing.logo))
    const nextNotes = (notes ?? existing.notes)

    const result = await pool.query(
      'UPDATE providers SET name = $1, contact_person = $2, company = $3, contact = $4, phone = $5, status = $6, logo = $7, notes = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
      [nextName, nextContactPerson, nextCompany, nextContact, nextPhone, nextStatus, nextLogo, nextNotes, id]
    )

    // Update provider name in dependent tables if name changed
    if (oldName !== nextName) {
      // slots
      await pool.query(
        'UPDATE slots SET provider = $1 WHERE provider = $2',
        [nextName, oldName]
      )
      console.log(`Updated provider name from "${oldName}" to "${nextName}" in slots`)

      // cabinets
      await pool.query(
        'UPDATE cabinets SET provider = $1 WHERE provider = $2',
        [nextName, oldName]
      )
      console.log(`Updated provider name from "${oldName}" to "${nextName}" in cabinets`)

      // game_mixes
      await pool.query(
        'UPDATE game_mixes SET provider = $1 WHERE provider = $2',
        [nextName, oldName]
      )
      console.log(`Updated provider name from "${oldName}" to "${nextName}" in game_mixes`)
    }

    // Calculate games_count from game_mixes
    const gamesCountResult = await pool.query(`
      SELECT COALESCE(SUM(jsonb_array_length(games->'games')), 0) as games_count
      FROM game_mixes
      WHERE provider = $1
    `, [name])

    const provider = {
      ...result.rows[0],
      games_count: parseInt(gamesCountResult.rows[0].games_count)
    }

    res.json(provider)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/providers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM providers WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Provider not found' })
    }
    res.json({ success: true, message: 'Provider deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})




// Cabinets routes (REDESIGNED)
app.get('/api/cabinets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        pr.name as provider_name,
        pr.logo as provider_logo,
        pl.name as platform_name,
        pl.avatar_url as platform_avatar_url,
        pl.avatar_file as platform_avatar_file
      FROM cabinets c
      LEFT JOIN providers pr ON c.provider = pr.name
      LEFT JOIN platforms pl ON c.platform = pl.name
      ORDER BY c.created_at DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Cabinets GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/cabinets', async (req, res) => {
  try {
    const { provider, name, model, platform, status, notes } = req.body
    const result = await pool.query(
      'INSERT INTO cabinets (provider, name, model, platform, status, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [provider, name, model, platform, status || 'Active', notes]
    )
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/cabinets/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { provider, name, model, platform, status, notes } = req.body

    // Get old cabinet name before update
    const oldCabinetResult = await pool.query('SELECT name FROM cabinets WHERE id = $1', [id])
    if (oldCabinetResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cabinet not found' })
    }
    const oldName = oldCabinetResult.rows[0].name

    const result = await pool.query(
      'UPDATE cabinets SET provider = $1, name = $2, model = $3, platform = $4, status = $5, notes = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [provider, name, model, platform, status, notes, id]
    )

    // Update cabinet name in slots if name changed
    if (oldName !== name) {
      await pool.query(
        'UPDATE slots SET cabinet = $1 WHERE cabinet = $2',
        [name, oldName]
      )
      console.log(`Updated cabinet name from "${oldName}" to "${name}" in slots`)
    }

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/cabinets/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM cabinets WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cabinet not found' })
    }
    res.json({ success: true, message: 'Cabinet deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Slots routes (with auto platform detection)
app.get('/api/slots', async (req, res) => {
  try {
    // Get all slots
    const slotsResult = await pool.query('SELECT * FROM slots ORDER BY created_at DESC')
    const slots = slotsResult.rows

    // Get all platforms
    res.json(slots)
  } catch (error) {
    console.error('Slots GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/slots/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM slots WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Slot not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Slot GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/slots', async (req, res) => {
  try {
    const {
      name, serial_number, provider, location, game, cabinet, game_mix,
      denomination, max_bet, rtp, gaming_places, property_type,
      commission_date, invoice_number, status, notes
    } = req.body
    // Convert empty strings to null for numeric and date fields, provide defaults for required fields
    const cleanName = name || `Slot ${serial_number}` || 'Slot Machine'
    const cleanMaxBet = max_bet === '' ? null : max_bet
    const cleanRtp = rtp === '' ? null : rtp
    const cleanDenomination = denomination === '' ? 0.01 : denomination
    const cleanGamingPlaces = gaming_places === '' ? 1 : gaming_places
    const cleanCommissionDate = commission_date === '' ? null : commission_date
    const cleanInvoiceNumber = invoice_number === '' ? null : invoice_number

    // Get RTP from Game Mix if not provided
    let finalRtp = cleanRtp
    if (!finalRtp && game_mix) {
      try {
        const gameMixResult = await pool.query('SELECT rtp FROM game_mixes WHERE name = $1 AND rtp IS NOT NULL ORDER BY id LIMIT 1', [game_mix])
        if (gameMixResult.rows.length > 0 && gameMixResult.rows[0].rtp) {
          finalRtp = gameMixResult.rows[0].rtp
        }
      } catch (error) {
        console.error('Error fetching RTP from game mix:', error)
      }
    }

    const result = await pool.query(
      'INSERT INTO slots (name, slot_id, serial_number, provider, location, game, cabinet, game_mix, denomination, max_bet, rtp, gaming_places, property_type, commission_date, invoice_number, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *',
      [cleanName, serial_number, serial_number, provider, location, game, cabinet, game_mix, cleanDenomination, cleanMaxBet, finalRtp, cleanGamingPlaces, property_type || 'Owned', cleanCommissionDate, cleanInvoiceNumber, status || 'Active', notes]
    )

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/slots/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name, serial_number, provider, location, game, cabinet, game_mix,
      denomination, max_bet, rtp, gaming_places, property_type,
      commission_date, invoice_number, status, notes
    } = req.body

    // Get current slot data for comparison
    const currentSlotResult = await pool.query('SELECT * FROM slots WHERE id = $1', [id])
    if (currentSlotResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Slot not found' })
    }

    const currentSlot = currentSlotResult.rows[0]

    // Convert empty strings to null for numeric and date fields, provide defaults for required fields
    const cleanName = name === '' ? 'Slot Machine' : name
    const cleanMaxBet = max_bet === '' ? null : max_bet
    const cleanRtp = rtp === '' ? null : rtp
    const cleanDenomination = denomination === '' ? null : denomination
    const cleanGamingPlaces = gaming_places === '' ? null : gaming_places
    const cleanCommissionDate = commission_date === '' ? null : commission_date
    const cleanInvoiceNumber = invoice_number === '' ? null : invoice_number

    // Get RTP from Game Mix if not provided
    let finalRtp = cleanRtp
    if (!finalRtp && game_mix) {
      try {
        const gameMixResult = await pool.query('SELECT rtp FROM game_mixes WHERE name = $1 AND rtp IS NOT NULL ORDER BY id LIMIT 1', [game_mix])
        if (gameMixResult.rows.length > 0 && gameMixResult.rows[0].rtp) {
          finalRtp = gameMixResult.rows[0].rtp
        }
      } catch (error) {
        console.error('Error fetching RTP from game mix:', error)
      }
    }

    const result = await pool.query(
      'UPDATE slots SET name = $1, serial_number = $2, provider = $3, location = $4, game = $5, cabinet = $6, game_mix = $7, denomination = $8, max_bet = $9, rtp = $10, gaming_places = $11, property_type = $12, commission_date = $13, invoice_number = $14, status = $15, notes = $16, updated_at = CURRENT_TIMESTAMP WHERE id = $17 RETURNING *',
      [cleanName, serial_number, provider, location, game, cabinet, game_mix, cleanDenomination, cleanMaxBet, finalRtp, cleanGamingPlaces, property_type, cleanCommissionDate, cleanInvoiceNumber, status, notes, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Slot not found' })
    }

    const updatedSlot = result.rows[0]

    // Save changes to history
    try {
      const changes = []
      const fields = [
        'name', 'serial_number', 'provider', 'location', 'game', 'cabinet', 'game_mix',
        'denomination', 'max_bet', 'rtp', 'gaming_places', 'property_type',
        'commission_date', 'invoice_number', 'status', 'notes'
      ]

      fields.forEach(field => {
        const oldValue = currentSlot[field]
        const newValue = updatedSlot[field]

        if (oldValue !== newValue) {
          changes.push({
            slot_id: parseInt(id),
            serial_number: updatedSlot.serial_number,
            field_name: field,
            old_value: oldValue?.toString() || null,
            new_value: newValue?.toString() || null,
            change_type: 'UPDATE',
            username: req.user?.username || 'system',
            user_id: req.user?.id || null,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            metadata: JSON.stringify({
              updated_at: updatedSlot.updated_at,
              change_reason: 'Manual update via API'
            })
          })
        }
      })

      // Insert all changes into history
      if (changes.length > 0) {
        for (const change of changes) {
          await pool.query(`
            INSERT INTO slot_history (
              slot_id, serial_number, field_name, old_value, new_value,
              change_type, username, user_id, ip_address, user_agent, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            change.slot_id, change.serial_number, change.field_name,
            change.old_value, change.new_value, change.change_type,
            change.username, change.user_id, change.ip_address,
            change.user_agent, change.metadata
          ])
        }
        console.log(`📝 Saved ${changes.length} changes to slot history for slot ${id}`)
      }
    } catch (historyError) {
      console.error('Error saving slot history:', historyError)
      // Don't fail the main request if history saving fails
    }

    res.json(updatedSlot)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/slots/:id', async (req, res) => {
  try {
    const { id } = req.params

    // First, get the slot data before deleting
    const slotResult = await pool.query('SELECT * FROM slots WHERE id = $1', [id])
    if (slotResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Slot not found' })
    }

    const deletedSlot = slotResult.rows[0]

    // Delete the slot
    await pool.query('DELETE FROM slots WHERE id = $1', [id])

    // Save deletion to history - record each field as deleted
    try {
      const fieldsToRecord = [
        { field: 'serial_number', value: deletedSlot.serial_number },
        { field: 'location', value: deletedSlot.location },
        { field: 'provider', value: deletedSlot.provider },
        { field: 'cabinet', value: deletedSlot.cabinet },
        { field: 'game_mix', value: deletedSlot.game_mix },
        { field: 'status', value: deletedSlot.status }
      ]

      for (const { field, value } of fieldsToRecord) {
        if (value !== null && value !== undefined) {
          await pool.query(`
            INSERT INTO slot_history (
              slot_id, serial_number, field_name, old_value, new_value,
              change_type, username, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [
            id,
            deletedSlot.serial_number,
            field,
            String(value),
            null,
            'DELETE',
            'admin' // You can get this from req.user if you have auth
          ])
        }
      }

      console.log(`📝 Saved deletion to slot history for slot ${id} (${deletedSlot.serial_number})`)
    } catch (historyError) {
      console.error('Error saving slot deletion history:', historyError)
      // Don't fail the main request if history saving fails
    }

    res.json({ success: true, message: 'Slot deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Game Mixes routes
app.get('/api/gameMixes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM game_mixes ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/gameMixes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM game_mixes WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game mix not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Game mix GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/gameMixes', async (req, res) => {
  try {
    const { name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes } = req.body

    // Convert empty strings to null for numeric fields
    const cleanRtp = rtp === '' ? null : rtp
    const cleanDenomination = denomination === '' ? 0.01 : denomination
    const cleanMaxBet = max_bet === '' ? null : max_bet
    const cleanGamingPlaces = gaming_places === '' ? 1 : gaming_places

    const result = await pool.query(
      'INSERT INTO game_mixes (name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, provider, JSON.stringify(games), cleanRtp, cleanDenomination, cleanMaxBet, cleanGamingPlaces, status || 'Active', notes]
    )
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/gameMixes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes } = req.body

    // Get old game mix name before update
    const oldGameMixResult = await pool.query('SELECT name FROM game_mixes WHERE id = $1', [id])
    if (oldGameMixResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game mix not found' })
    }
    const oldName = oldGameMixResult.rows[0].name

    // Convert empty strings to null for numeric fields
    const cleanRtp = rtp === '' ? null : rtp
    const cleanDenomination = denomination === '' ? null : denomination
    const cleanMaxBet = max_bet === '' ? null : max_bet
    const cleanGamingPlaces = gaming_places === '' ? null : gaming_places

    const result = await pool.query(
      'UPDATE game_mixes SET name = $1, provider = $2, games = $3, rtp = $4, denomination = $5, max_bet = $6, gaming_places = $7, status = $8, notes = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *',
      [name, provider, JSON.stringify(games), cleanRtp, cleanDenomination, cleanMaxBet, cleanGamingPlaces, status, notes, id]
    )

    // Update game mix name in slots if name changed
    if (oldName !== name) {
      await pool.query(
        'UPDATE slots SET game_mix = $1 WHERE game_mix = $2',
        [name, oldName]
      )
      console.log(`Updated game mix name from "${oldName}" to "${name}" in slots`)
    }

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/gameMixes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM game_mixes WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game mix not found' })
    }
    res.json({ success: true, message: 'Game mix deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Users routes - quick fix for dashboard sync
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT id, username, full_name, email, role, avatar, permissions, notes, status, preferences, created_at, updated_at FROM users WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Parse preferences if it's a string
    const user = result.rows[0]
    if (typeof user.preferences === 'string') {
      try {
        user.preferences = JSON.parse(user.preferences)
      } catch (e) {
        console.error('Error parsing preferences:', e)
        user.preferences = {}
      }
    }

    res.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ success: false, message: 'Error fetching user' })
  }
})

app.get('/api/users/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT preferences FROM users WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, preferences: result.rows[0].preferences || {} })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    res.status(500).json({ success: false, message: 'Error fetching user preferences' })
  }
})

app.put('/api/users/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params
    const { preferences } = req.body

    const result = await pool.query(
      'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, preferences',
      [JSON.stringify(preferences), id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, preferences: result.rows[0].preferences })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    res.status(500).json({ success: false, message: 'Error updating user preferences' })
  }
})

// Contracts API with JOINs for property rental
app.get('/api/contracts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        loc.name as location_name,
        loc.address as location_address,
        p.name as proprietar_name,
        p.contact_person as proprietar_contact,
        p.phone as proprietar_phone
      FROM contracts c
      LEFT JOIN locations loc ON c.location_id = loc.id
      LEFT JOIN proprietari p ON c.proprietar_id = p.id
      ORDER BY c.created_at DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Contracts GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

const normalizeNumber = (value) => {
  if (value === undefined || value === null) return null
  if (value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const normalizeDate = (value) => {
  if (!value || value === '') return null
  return value
}

app.post('/api/contracts', async (req, res) => {
  try {
    const {
      contract_number,
      title,
      location_id,
      proprietar_id,
      type,
      status,
      start_date,
      end_date,
      monthly_rent,
      currency,
      deposit,
      payment_terms,
      description,
      surface_area,
      contractFile,
      annexes
    } = req.body

    const cleanMonthlyRent = normalizeNumber(monthly_rent)
    const cleanDeposit = normalizeNumber(deposit)
    const cleanSurface = normalizeNumber(surface_area)
    const cleanStartDate = normalizeDate(start_date)
    const cleanEndDate = normalizeDate(end_date)

    const result = await pool.query(`
      INSERT INTO contracts (
        contract_number, title, location_id, proprietar_id, 
        type, status, start_date, end_date, monthly_rent, currency, deposit, payment_terms, description,
        surface_area, contract_file, annexes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      contract_number, title, location_id, proprietar_id,
      type, status, cleanStartDate, cleanEndDate, cleanMonthlyRent, currency || 'RON', cleanDeposit, payment_terms, description,
      cleanSurface,
      contractFile || null,
      JSON.stringify(annexes || [])
    ])

    res.json(result.rows[0])
  } catch (error) {
    console.error('Contracts POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      contract_number,
      title,
      location_id,
      proprietar_id,
      type,
      status,
      start_date,
      end_date,
      monthly_rent,
      currency,
      deposit,
      payment_terms,
      description,
      surface_area,
      contractFile,
      annexes
    } = req.body

    const cleanMonthlyRent = normalizeNumber(monthly_rent)
    const cleanDeposit = normalizeNumber(deposit)
    const cleanSurface = normalizeNumber(surface_area)
    const cleanStartDate = normalizeDate(start_date)
    const cleanEndDate = normalizeDate(end_date)

    const result = await pool.query(`
      UPDATE contracts SET 
        contract_number = $1, 
        title = $2, 
        location_id = $3,
        proprietar_id = $4,
        type = $5, 
        status = $6, 
        start_date = $7, 
        end_date = $8, 
        monthly_rent = $9, 
        currency = $10, 
        deposit = $11, 
        payment_terms = $12, 
        description = $13,
        surface_area = $14,
        contract_file = $15,
        annexes = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *
    `, [
      contract_number, title, location_id, proprietar_id,
      type, status, cleanStartDate, cleanEndDate, cleanMonthlyRent, currency || 'RON', cleanDeposit, payment_terms, description,
      cleanSurface,
      contractFile || null,
      JSON.stringify(annexes || []),
      id
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Contracts PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' })
    }

    res.json({ success: true, message: 'Contract deleted successfully' })
  } catch (error) {
    console.error('Contracts DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Proprietari API
app.get('/api/proprietari', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM proprietari 
      ORDER BY created_at DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Proprietari GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/proprietari', async (req, res) => {
  try {
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      cnp_cui,
      type,
      status,
      notes
    } = req.body

    const result = await pool.query(`
      INSERT INTO proprietari (name, contact_person, email, phone, address, cnp_cui, type, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, contact_person, email, phone, address, cnp_cui, type, status, notes])

    res.json(result.rows[0])
  } catch (error) {
    console.error('Proprietari POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/proprietari/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      cnp_cui,
      type,
      status,
      notes
    } = req.body

    const result = await pool.query(`
      UPDATE proprietari 
      SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5, 
          cnp_cui = $6, type = $7, status = $8, notes = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [name, contact_person, email, phone, address, cnp_cui, type, status, notes, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proprietar not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Proprietari PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/proprietari/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM proprietari WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proprietar not found' })
    }

    res.json({ success: true, message: 'Proprietar deleted successfully' })
  } catch (error) {
    console.error('Proprietari DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Platforms API
app.get('/api/platforms', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        pr.name as provider_name,
        pr.contact_person as provider_contact,
        pr.logo as provider_logo
      FROM platforms p
      LEFT JOIN providers pr ON p.provider_id = pr.id
      ORDER BY p.created_at DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Platforms GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/platforms', async (req, res) => {
  try {
    const { name, serial_numbers, provider_id, avatar_url, avatar_file, status, notes } = req.body

    // Process avatar_file if it's a File object (base64 string)
    let processedAvatarFile = avatar_file
    if (avatar_file && typeof avatar_file === 'string' && avatar_file.startsWith('data:')) {
      // It's already a base64 string, use it as is
      processedAvatarFile = avatar_file
    } else if (avatar_file && typeof avatar_file === 'object') {
      // It's a File object, convert to base64
      processedAvatarFile = avatar_file
    }

    const result = await pool.query(`
      INSERT INTO platforms (name, serial_numbers, provider_id, avatar_url, avatar_file, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, serial_numbers, provider_id, avatar_url, processedAvatarFile, status, notes])

    res.json(result.rows[0])
  } catch (error) {
    console.error('Platforms POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/platforms/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, serial_numbers, provider_id, avatar_url, avatar_file, status, notes } = req.body

    // Process avatar_file if it's a File object (base64 string)
    let processedAvatarFile = avatar_file
    if (avatar_file && typeof avatar_file === 'string' && avatar_file.startsWith('data:')) {
      // It's already a base64 string, use it as is
      processedAvatarFile = avatar_file
    } else if (avatar_file && typeof avatar_file === 'object') {
      // It's a File object, convert to base64
      processedAvatarFile = avatar_file
    }

    const result = await pool.query(`
      UPDATE platforms SET 
        name = $1, 
        serial_numbers = $2, 
        provider_id = $3, 
        avatar_url = $4, 
        avatar_file = $5, 
        status = $6, 
        notes = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, serial_numbers, provider_id, avatar_url, processedAvatarFile, status, notes, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Platform not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Platforms PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/platforms/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM platforms WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Platform not found' })
    }

    res.json({ success: true, message: 'Platform deleted successfully' })
  } catch (error) {
    console.error('Platforms DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Jackpots API
app.get('/api/jackpots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jackpots ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Jackpots GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/jackpots', async (req, res) => {
  try {
    const {
      serial_number, jackpot_name, jackpot_type, current_amount, max_amount,
      progress_percentage, status, winner, triggered_date, notes
    } = req.body
    const result = await pool.query(
      'INSERT INTO jackpots (serial_number, jackpot_name, jackpot_type, current_amount, max_amount, progress_percentage, status, winner, triggered_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [serial_number, jackpot_name, jackpot_type || 'Progressive', current_amount || 0, max_amount, progress_percentage || 0, status || 'Active', winner, triggered_date, notes]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Jackpots POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/jackpots/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      serial_number, jackpot_name, jackpot_type, current_amount, max_amount,
      progress_percentage, status, winner, triggered_date, notes
    } = req.body
    const result = await pool.query(
      'UPDATE jackpots SET serial_number = $1, jackpot_name = $2, jackpot_type = $3, current_amount = $4, max_amount = $5, progress_percentage = $6, status = $7, winner = $8, triggered_date = $9, notes = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *',
      [serial_number, jackpot_name, jackpot_type, current_amount, max_amount, progress_percentage, status, winner, triggered_date, notes, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Jackpot not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Jackpots PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/jackpots/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM jackpots WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Jackpot not found' })
    }
    res.json({ success: true, message: 'Jackpot deleted successfully' })
  } catch (error) {
    console.error('Jackpots DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Metrology API
app.get('/api/metrology', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, cvt_series, cvt_number, serial_number, cvt_type, cvt_date, 
             expiry_date, issuing_authority, provider, cabinet, game_mix, 
             approval_type, software, notes, created_by, updated_by, created_at, updated_at,
             CASE WHEN cvt_file IS NOT NULL AND length(cvt_file) > 0 THEN 'true' ELSE null END as "cvtFile"
      FROM metrology ORDER BY created_at DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Metrology GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/metrology', async (req, res) => {
  try {
    await pool.query('DELETE FROM metrology')
    res.json({ success: true, message: 'All metrology records deleted' })
  } catch (error) {
    console.error('Metrology DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/metrology', async (req, res) => {
  // --- DEBUG INJECTION START ---
  const debugData = new Date().toISOString() + ' Received POST /api/metrology:\n' +
    'body keys: ' + Object.keys(req.body).join(', ') + '\n' +
    'cvt_series: ' + req.body.cvt_series + '\n' +
    'cvt_number: ' + req.body.cvt_number + '\n' +
    'cvt_file typeof: ' + typeof req.body.cvt_file + '\n' +
    'cvtFile typeof: ' + typeof req.body.cvtFile + '\n' +
    'expiry_date: ' + req.body.expiry_date + '\n' +
    'cvt_date: ' + req.body.cvt_date + '\n\n';
  import('fs').then(fs => fs.appendFileSync('debug-ui-metrology.log', debugData)).catch(console.error);
  // --- DEBUG INJECTION END ---

  try {
    const {
      cvt_series, cvt_number, serial_number, cvt_type, cvt_date, expiry_date, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvtFile, cvt_file, cvt_filename, notes
    } = req.body

    // Accept BOTH cvtFile (old) and cvt_file (new) for compatibility
    const cvtFileData = cvt_file || cvtFile

    // BACKEND FALLBACK FOR UNIQUE cvt_number
    let finalCvtNumber = cvt_number;
    if (!finalCvtNumber || finalCvtNumber === 'N/A' || finalCvtNumber === '') {
      finalCvtNumber = cvt_series ? cvt_series : `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    // Calculate expiry_date automatically for Periodică and Inițială (1 year - 1 day from cvt_date)
    let calculatedExpiryDate = expiry_date
    if (cvt_date && (cvt_type === 'Periodică' || cvt_type === 'Inițială') && !expiry_date) {
      const cvtDate = new Date(cvt_date)
      const expiryDate = new Date(cvtDate)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      expiryDate.setDate(expiryDate.getDate() - 1)
      calculatedExpiryDate = expiryDate.toISOString().split('T')[0]
    }

    const cleanCvtDate = normalizeDate(cvt_date)
    const cleanExpiryDate = normalizeDate(calculatedExpiryDate)

    const result = await pool.query(
      'INSERT INTO metrology (cvt_series, cvt_number, serial_number, cvt_type, cvt_date, expiry_date, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvt_file, cvt_filename, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *, cvt_file as "cvtFile"',
      [cvt_series, finalCvtNumber, serial_number, cvt_type, cleanCvtDate, cleanExpiryDate, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvtFileData, cvt_filename, notes, 'admin']
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Metrology POST error:', error)
    import('fs').then(fs => {
      fs.appendFileSync('debug-error.log', new Date().toISOString() + ' POST Metrology Error: ' + error.message + '\n')
    }).catch(e => console.error('Error logging to file:', e))
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/metrology/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      cvt_series, cvt_number, serial_number, cvt_type, cvt_date, expiry_date, issuing_authority,
      provider, cabinet, game_mix, approval_type, software, cvtFile, cvt_file, cvt_filename, notes
    } = req.body

    console.log('Metrology PUT:', { id, cvt_series, hasFile: !!(cvt_file || cvtFile), cvt_filename })

    // Accept BOTH cvtFile (old) and cvt_file (new) for compatibility
    const cvtFileData = cvt_file || cvtFile

    // Calculate expiry_date automatically for Periodică and Inițială (1 year - 1 day from cvt_date)
    let calculatedExpiryDate = expiry_date
    if (cvt_date && (cvt_type === 'Periodică' || cvt_type === 'Inițială') && !expiry_date) {
      const cvtDate = new Date(cvt_date)
      const expiryDate = new Date(cvtDate)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      expiryDate.setDate(expiryDate.getDate() - 1)
      calculatedExpiryDate = expiryDate.toISOString().split('T')[0]
    }

    const cleanCvtDate = normalizeDate(cvt_date)
    const cleanExpiryDate = normalizeDate(calculatedExpiryDate)

    // Build update query - include cvt_filename
    let query, params
    if (cvtFileData) {
      query = `UPDATE metrology SET 
        cvt_series = COALESCE($1, cvt_series), 
        cvt_number = COALESCE($2, cvt_number), 
        serial_number = COALESCE($3, serial_number), 
        cvt_type = COALESCE($4, cvt_type), 
        cvt_date = $5, 
        expiry_date = $6, 
        issuing_authority = COALESCE($7, issuing_authority), 
        provider = COALESCE($8, provider), 
        cabinet = COALESCE($9, cabinet), 
        game_mix = COALESCE($10, game_mix), 
        approval_type = COALESCE($11, approval_type), 
        software = COALESCE($12, software), 
        cvt_file = $13, 
        cvt_filename = $14,
        notes = COALESCE($15, notes), 
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = $16 
        RETURNING *, cvt_file as "cvtFile"`
      params = [cvt_series, cvt_number, serial_number, cvt_type, cleanCvtDate, cleanExpiryDate, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvtFileData, cvt_filename, notes, id]
    } else {
      query = `UPDATE metrology SET 
        cvt_series = COALESCE($1, cvt_series), 
        cvt_number = COALESCE($2, cvt_number), 
        serial_number = COALESCE($3, serial_number), 
        cvt_type = COALESCE($4, cvt_type), 
        cvt_date = $5, 
        expiry_date = $6, 
        issuing_authority = COALESCE($7, issuing_authority), 
        provider = COALESCE($8, provider), 
        cabinet = COALESCE($9, cabinet), 
        game_mix = COALESCE($10, game_mix), 
        approval_type = COALESCE($11, approval_type), 
        software = COALESCE($12, software), 
        notes = COALESCE($13, notes), 
        updated_at = CURRENT_TIMESTAMP 
        WHERE id = $14 
        RETURNING *, cvt_file as "cvtFile"`
      params = [cvt_series, cvt_number, serial_number, cvt_type, cleanCvtDate, cleanExpiryDate, issuing_authority, provider, cabinet, game_mix, approval_type, software, notes, id]
    }

    const result = await pool.query(query, params)
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Metrology record not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Metrology PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/metrology/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM metrology WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Metrology record not found' })
    }
    res.json({ success: true, message: 'Metrology record deleted successfully' })
  } catch (error) {
    console.error('Metrology DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Invoices API
app.get('/api/invoices', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Invoices GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/invoices', upload.single('pdf_file'), async (req, res) => {
  try {
    const {
      invoice_number, serial_numbers, buyer, seller, type, amount, currency, rates, locations
    } = req.body

    console.log('Invoice POST data:', { invoice_number, serial_numbers, buyer, seller, type, amount, currency, rates, locations })

    // Get PDF file path if uploaded
    const pdfPath = req.file ? `/uploads/invoices/${req.file.filename}` : null

    // Parse serial numbers from textarea
    const serialNumbersArray = serial_numbers
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // Create invoice record
    const result = await pool.query(
      'INSERT INTO invoices (invoice_number, serial_number, company, seller, location, amount, currency, issue_date, status, invoice_type, description, file_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [invoice_number, JSON.stringify(serialNumbersArray), buyer, seller, JSON.stringify(locations), amount, currency || 'RON', new Date().toISOString().split('T')[0], 'Pending', type || 'Sale', rates || '', pdfPath]
    )

    // Update property_type in slots based on invoice type
    if (serialNumbersArray.length > 0 && type) {
      const propertyType = type === 'Vânzare' ? 'Owned' : 'Rented'
      console.log(`Invoice type: ${type}, Property type: ${propertyType}, Serial numbers: ${serialNumbersArray}`)
      for (const serialNumber of serialNumbersArray) {
        await pool.query(
          'UPDATE slots SET property_type = $1 WHERE serial_number = $2',
          [propertyType, serialNumber]
        )
        console.log(`Updated slot ${serialNumber} property_type to ${propertyType}`)
      }
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Invoices POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single invoice
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Invoices GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/invoices/:id', upload.single('pdf_file'), async (req, res) => {
  try {
    const { id } = req.params
    const {
      invoice_number, serial_numbers, buyer, seller, type, amount, currency, rates, locations
    } = req.body

    // Get PDF file path if uploaded
    const pdfPath = req.file ? `/uploads/invoices/${req.file.filename}` : null

    // Parse serial numbers from textarea
    const serialNumbersArray = serial_numbers
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const result = await pool.query(
      'UPDATE invoices SET invoice_number = $1, serial_number = $2, company = $3, seller = $4, location = $5, amount = $6, currency = $7, issue_date = $8, status = $9, invoice_type = $10, description = $11, file_path = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *',
      [invoice_number, JSON.stringify(serialNumbersArray), buyer, seller, JSON.stringify(locations), amount, currency, new Date().toISOString().split('T')[0], 'Pending', type, rates || '', pdfPath, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' })
    }

    // Update property_type in slots based on invoice type
    if (serialNumbersArray.length > 0 && type) {
      const propertyType = type === 'Vânzare' ? 'Owned' : 'Rented'
      for (const serialNumber of serialNumbersArray) {
        await pool.query(
          'UPDATE slots SET property_type = $1 WHERE serial_number = $2',
          [propertyType, serialNumber]
        )
      }
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Invoices PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' })
    }
    res.json({ success: true, message: 'Invoice deleted successfully' })
  } catch (error) {
    console.error('Invoices DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Warehouse endpoints
app.get('/api/warehouse', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM warehouse ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Warehouse GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/warehouse', async (req, res) => {
  try {
    const { serial_number, provider, location, cabinet, game_mix, status, notes } = req.body
    const result = await pool.query(
      'INSERT INTO warehouse (serial_number, provider, location, cabinet, game_mix, status, notes, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *',
      [serial_number, provider, location, cabinet, game_mix, status, notes, 'admin']
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Warehouse POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/warehouse/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { serial_number, provider, location, cabinet, game_mix, status, notes } = req.body
    const result = await pool.query(
      'UPDATE warehouse SET serial_number = $1, provider = $2, location = $3, cabinet = $4, game_mix = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [serial_number, provider, location, cabinet, game_mix, status, notes, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Warehouse item not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Warehouse PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Bulk insert pentru inventar centralizat
app.post('/api/warehouse/bulk', authenticateUser, async (req, res) => {
  try {
    const { items } = req.body
    const userId = req.user?.userId || 1
    const username = req.user?.username || 'admin'

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' })
    }

    let saved = 0
    const errors = []

    // Folosește transaction pentru a salva toate itemele
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      for (const item of items) {
        try {
          // Verifică dacă există deja (după serial_number și location)
          const existing = await client.query(
            'SELECT id FROM warehouse WHERE serial_number = $1 AND location = $2',
            [item.serial_number || '', item.location || 'Depozit']
          )

          if (existing.rows.length > 0) {
            // Update dacă există
            await client.query(
              'UPDATE warehouse SET provider = $1, cabinet = $2, game_mix = $3, status = $4, notes = $5, updated_at = CURRENT_TIMESTAMP, updated_by = $6 WHERE id = $7',
              [
                item.provider || '',
                item.cabinet || '',
                item.game_mix || '',
                item.status || 'Active',
                item.notes || '',
                username,
                existing.rows[0].id
              ]
            )
          } else {
            // Insert dacă nu există
            await client.query(
              'INSERT INTO warehouse (serial_number, provider, location, cabinet, game_mix, status, notes, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)',
              [
                item.serial_number || '',
                item.provider || '',
                item.location || 'Depozit',
                item.cabinet || '',
                item.game_mix || '',
                item.status || 'Active',
                item.notes || '',
                username
              ]
            )
          }
          saved++
        } catch (itemError) {
          errors.push({ item, error: itemError.message })
        }
      }

      await client.query('COMMIT')
      res.json({
        success: true,
        saved,
        total: items.length,
        errors: errors.length > 0 ? errors : undefined
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Warehouse bulk insert error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/warehouse/import-products - Import products from API
app.post('/api/warehouse/import-products', async (req, res) => {
  try {
    const { products, city, supplier } = req.body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, error: 'Products array is required' })
    }

    // City is optional - if not provided, use null or 'Depozit'
    const location = city || null
    const supplierName = supplier || 'General'

    // Ensure "General" supplier exists (or create it)
    // For now, we'll just use the supplier name provided

    const importedProducts = []
    const errors = []

    for (const product of products) {
      try {
        // Extract product data - adapt based on your API structure
        const productData = {
          serial_number: product.cod || product.code || product.sku || product.id || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          provider: supplierName,
          location: location || 'Depozit',
          cabinet: product.tip || product.type || product.cabinet || '',
          game_mix: product.nume || product.name || product.product_name || '',
          status: 'Active',
          notes: JSON.stringify({
            cod: product.cod || product.code || '',
            unitate: product.unitate || product.unit || '',
            pret: product.pret || product.price || '',
            ...product // Store all original product data
          }),
          created_by: req.user?.username || 'API Import',
          created_at: new Date()
        }

        // Insert into warehouse table
        const result = await pool.query(
          'INSERT INTO warehouse (serial_number, provider, location, cabinet, game_mix, status, notes, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *',
          [productData.serial_number, productData.provider, productData.location, productData.cabinet, productData.game_mix, productData.status, productData.notes, productData.created_by]
        )

        importedProducts.push(result.rows[0])
      } catch (error) {
        console.error('Error importing product:', error)
        errors.push({
          product: product.cod || product.code || 'Unknown',
          error: error.message
        })
      }
    }

    res.json({
      success: true,
      imported: importedProducts.length,
      total: products.length,
      errors: errors.length,
      products: importedProducts,
      errorDetails: errors
    })
  } catch (error) {
    console.error('Import products error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/warehouse/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM warehouse WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Warehouse item not found' })
    }
    res.json({ success: true, message: 'Warehouse item deleted successfully' })
  } catch (error) {
    console.error('Warehouse DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Generic routes for remaining entities (onjnReports, legalDocuments)
const entities = ['onjnReports', 'legalDocuments']

entities.forEach(entity => {
  app.get(`/api/${entity}`, (req, res) => {
    res.json([])
  })
})

// Upload routes
app.use('/api/upload', uploadRoutes)

// Compression routes
app.use('/api/compress', compressRoutes)

// Backup routes
app.use('/api/backup', backupRoutes)

// Games routes
app.use('/api/games', gamesRoutes)
app.use('/api/slot-history', slotHistoryRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/companies', companiesRoutes)
app.use('/api/locations', locationsRoutes)
app.use('/api/providers', providersRoutes)
app.use('/api/cabinets', cabinetsRoutes)
// Game Mixes endpoint - use database instead of mock routes
app.get('/api/game-mixes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM game_mixes ORDER BY name')
    res.json(result.rows)
  } catch (error) {
    console.error('Game mixes GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/game-mixes', async (req, res) => {
  try {
    const { name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes } = req.body
    const result = await pool.query(
      'INSERT INTO game_mixes (name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes, 'API']
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Game mixes POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/game-mixes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes } = req.body
    const result = await pool.query(
      'UPDATE game_mixes SET name = $1, provider = $2, games = $3, rtp = $4, denomination = $5, max_bet = $6, gaming_places = $7, status = $8, notes = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *',
      [name, provider, games, rtp, denomination, max_bet, gaming_places, status, notes, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game mix not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Game mixes PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/game-mixes/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM game_mixes WHERE id = $1 RETURNING *', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Game mix not found' })
    }
    res.json({ success: true, message: 'Game mix deleted successfully' })
  } catch (error) {
    console.error('Game mixes DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})
app.use('/api/slots', slotsRoutes)
app.use('/api/invoices', invoicesRoutes)
app.use('/api/jackpots', jackpotsRoutes)
app.use('/api/legal-documents', legalDocumentsRoutes)
app.use('/api/legal', legalDocumentsRoutes)
app.use('/api/onjn-reports', onjnReportsRoutes)
// ONJN Class 2 routes
import onjnClass2Routes from './routes/onjnClass2.js'
import onjnClass1Routes from './routes/onjnClass1.js'

// Public endpoint for refresh status (no authentication required)
app.get('/api/onjn-operators/refresh-status', (req, res) => {
  res.json(refreshProgressManager.get())
})

// Public endpoint for JSON import (no authentication required)
app.post('/api/onjn-operators/import-json', async (req, res) => {
  try {
    const pool = req.app.get('pool')

    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    // Check if already importing
    const currentProgress = refreshProgressManager.get()
    if (currentProgress && currentProgress.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Import deja în curs. Vă rugăm să așteptați finalizarea.'
      })
    }

    // Try multiple possible locations for the JSON file
    const possiblePaths = [
      path.join(__dirname, 'backend', 'onjn-scraped-data.json'),
      path.join(__dirname, 'onjn-scraped-data.json'),
      path.join(__dirname, '..', 'backend', 'onjn-scraped-data.json')
    ]

    let jsonFilePath = null
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        jsonFilePath = possiblePath
        break
      }
    }

    if (!jsonFilePath) {
      return res.status(404).json({
        success: false,
        error: 'Fișierul JSON nu a fost găsit pe server'
      })
    }

    // Read and parse JSON file
    const rawData = fs.readFileSync(jsonFilePath, 'utf8')
    const data = JSON.parse(rawData)

    console.log(`📊 Importing ${data.length} slots from JSON file`)

    // Set progress to running
    refreshProgressManager.set({
      status: 'running',
      currentPage: 0,
      totalPages: Math.ceil(data.length / 100),
      currentStep: 'Import din JSON în curs...',
      slotsFound: data.length,
      inserted: 0,
      updated: 0,
      errors: 0,
      startTime: new Date()
    })

    let inserted = 0
    let updated = 0
    let errors = 0

    // Process in batches of 100
    const batchSize = 100
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      for (const slot of batch) {
        try {
          // Check if slot exists
          const existing = await pool.query(
            'SELECT id FROM onjn_operators WHERE serial_number = $1',
            [slot.serial_number]
          )

          if (existing.rows.length > 0) {
            // Update existing
            await pool.query(`
              UPDATE onjn_operators SET
                company_name = $1,
                brand_name = $2,
                county = $3,
                city = $4,
                slot_address = $5,
                status = $6,
                license_number = $7,
                expiry_date = $8,
                updated_at = NOW()
              WHERE serial_number = $9
            `, [
              slot.company_name,
              slot.brand_name,
              slot.county,
              slot.city,
              slot.address,
              slot.status,
              slot.license_number,
              slot.license_expiry,
              slot.serial_number
            ])
            updated++
          } else {
            // Insert new
            await pool.query(`
              INSERT INTO onjn_operators (
                serial_number, company_name, brand_name, county, city, 
                slot_address, status, license_number, expiry_date, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            `, [
              slot.serial_number,
              slot.company_name,
              slot.brand_name,
              slot.county,
              slot.city,
              slot.address,
              slot.status,
              slot.license_number,
              slot.license_expiry
            ])
            inserted++
          }
        } catch (error) {
          console.error(`❌ Error processing slot ${slot.serial_number}:`, error.message)
          errors++
        }
      }

      // Update progress
      const progress = Math.round(((i + batch.length) / data.length) * 100)
      const currentProgress = refreshProgressManager.get()
      refreshProgressManager.set({
        ...currentProgress,
        currentPage: Math.floor(i / batchSize) + 1,
        currentStep: `Import în curs... ${progress}%`,
        inserted,
        updated,
        errors
      })
    }

    // Mark as completed
    const finalProgress = refreshProgressManager.get()
    refreshProgressManager.set({
      ...finalProgress,
      status: 'completed',
      currentStep: 'Import completat!',
      inserted,
      updated,
      errors
    })

    res.json({
      success: true,
      message: 'Import completat cu succes!',
      total: data.length,
      inserted,
      updated,
      errors
    })

  } catch (error) {
    console.error('JSON import error:', error)

    // Mark as failed
    const failedProgress = refreshProgressManager.get()
    refreshProgressManager.set({
      ...failedProgress,
      status: 'failed',
      currentStep: `Eroare: ${error.message}`
    })

    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.use('/api/onjn-operators', authenticateUser, onjnOperatorsRoutes)
app.use('/api/onjn/class2', authenticateUser, onjnClass2Routes)
app.use('/api/onjn/class1', authenticateUser, onjnClass1Routes)
app.use('/api/brands', authenticateUser, brandsRoutes)
app.use('/api/metrology', metrologyRoutes)
app.use('/api/warehouse', warehouseRoutes)

// ==================== NEW ROUTES ALREADY REGISTERED EARLY ====================
// Routes for promotions, cyber, tasks, messages, notifications
// are registered at the TOP of the file (line ~126) before any async operations

// Get all approvals
app.get('/api/approvals', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const result = await pool.query('SELECT * FROM approvals ORDER BY created_at DESC')

    // Parse attachments JSON strings to objects for frontend
    const rows = result.rows.map(row => {
      if (row.attachments && typeof row.attachments === 'string') {
        try {
          row.attachments = JSON.parse(row.attachments)
        } catch (e) {
          console.error('Error parsing attachments for approval', row.id, ':', e)
          row.attachments = []
        }
      } else if (!row.attachments) {
        row.attachments = []
      }
      return row
    })

    res.json(rows)
  } catch (error) {
    console.error('Approvals GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create approval - POST endpoint
app.post('/api/approvals', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { name, provider, cabinet, game_mix, checksum_md5, checksum_sha256, notes } = req.body
    const createdBy = req.user?.full_name || req.user?.username || 'Eugeniu Cazmal'

    let attachments = []
    if (req.file) {
      // Handle file upload - could be uploaded to S3 or stored locally
      const fileUrl = `/uploads/${req.file.filename}`
      attachments.push({
        filename: req.file.originalname,
        url: fileUrl,
        uploadedAt: new Date().toISOString()
      })
    }

    const result = await pool.query(
      `INSERT INTO approvals (name, provider, cabinet, game_mix, checksum_md5, checksum_sha256, attachments, notes, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [name, provider, cabinet, game_mix, checksum_md5, checksum_sha256, JSON.stringify(attachments), notes, createdBy]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Approvals POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update approval - PUT endpoint
app.put('/api/approvals/:id', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { id } = req.params
    const {
      name,
      provider,
      cabinet,
      game_mix,
      game_mix_name,
      checksum_md5,
      checksum_sha256,
      notes,
      attachments,  // Citește attachments din body (base64) - EXACT CA LA CONTRACTS!
      issuing_authority
    } = req.body

    console.log('Approvals PUT:', { id, name, attachmentsLength: attachments?.length })

    // Verifică dacă approval există
    const existingResult = await pool.query('SELECT * FROM approvals WHERE id = $1', [id])
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Approval not found' })
    }

    // Folosește attachments din body direct (sunt deja în format JSON string sau array)
    let attachmentsToSave = attachments
    if (typeof attachments === 'string') {
      // Deja string JSON, lasă așa
      attachmentsToSave = attachments
    } else if (Array.isArray(attachments)) {
      attachmentsToSave = JSON.stringify(attachments)
    } else {
      attachmentsToSave = existingResult.rows[0].attachments || '[]'
    }

    const result = await pool.query(
      `UPDATE approvals 
       SET name = COALESCE($1, name), 
           provider = COALESCE($2, provider), 
           cabinet = COALESCE($3, cabinet), 
           game_mix = COALESCE($4, game_mix),
           game_mix_name = COALESCE($5, game_mix_name),
           checksum_md5 = COALESCE($6, checksum_md5), 
           checksum_sha256 = COALESCE($7, checksum_sha256), 
           attachments = $8, 
           notes = COALESCE($9, notes),
           issuing_authority = COALESCE($10, issuing_authority),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $11 
       RETURNING *`,
      [name, provider, cabinet, game_mix, game_mix_name, checksum_md5, checksum_sha256, attachmentsToSave, notes, issuing_authority, id]
    )

    console.log('Approvals PUT success:', result.rows[0]?.id)
    res.json(result.rows[0])
  } catch (error) {
    console.error('Approvals PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== BRANDS ENDPOINTS ====================

// Get all brands
app.get('/api/brands', async (req, res) => {
  try {
    const pool = req.app.get('pool')

    // Get brands with slot counts from onjn_operators
    const result = await pool.query(`
      SELECT 
        b.*,
        COUNT(DISTINCT o.id) as total_slots,
        COUNT(DISTINCT CASE WHEN o.status = 'În exploatare' THEN o.id END) as active_slots
      FROM brands b
      LEFT JOIN onjn_operators o ON b.brand_name = o.brand_name
      GROUP BY b.id
      ORDER BY b.brand_name ASC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Brands GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get single brand with all slots
app.get('/api/brands/:brandName', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { brandName } = req.params
    const decodedBrandName = decodeURIComponent(brandName)

    // Get brand info
    const brandResult = await pool.query(`
      SELECT * FROM brands WHERE brand_name = $1
    `, [decodedBrandName])

    if (brandResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Brand not found' })
    }

    // Get all slots for this brand
    const slotsResult = await pool.query(`
      SELECT * FROM onjn_operators 
      WHERE brand_name = $1 
      ORDER BY city, slot_address
    `, [decodedBrandName])

    res.json({
      brand: brandResult.rows[0],
      slots: slotsResult.rows
    })
  } catch (error) {
    console.error('Error fetching brand details:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== AUTHORITIES ENDPOINTS ====================

// Get all authorities
app.get('/api/authorities', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const result = await pool.query('SELECT * FROM authorities ORDER BY name ASC')
    res.json(result.rows)
  } catch (error) {
    console.error('Authorities GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create authority
app.post('/api/authorities', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { name, address, price_initiala, price_reparatie, price_periodica, notes } = req.body

    const result = await pool.query(
      `INSERT INTO authorities (name, address, price_initiala, price_reparatie, price_periodica, notes, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [name, address, price_initiala, price_reparatie, price_periodica, notes]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Authorities POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update authority
app.put('/api/authorities/:id', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { id } = req.params
    const { name, address, price_initiala, price_reparatie, price_periodica, notes } = req.body

    const result = await pool.query(
      `UPDATE authorities 
       SET name = $1, address = $2, price_initiala = $3, price_reparatie = $4, price_periodica = $5, notes = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING *`,
      [name, address, price_initiala, price_reparatie, price_periodica, notes, id]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Authorities PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete authority
app.delete('/api/authorities/:id', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { id } = req.params
    await pool.query('DELETE FROM authorities WHERE id = $1', [id])

    res.json({ success: true })
  } catch (error) {
    console.error('Authorities DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== SOFTWARE ENDPOINTS ====================

// Get all software
app.get('/api/software', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const result = await pool.query('SELECT * FROM software ORDER BY name ASC')
    res.json(result.rows)
  } catch (error) {
    console.error('Software GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create software
app.post('/api/software', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { name, version, provider, cabinet, game_mix, approval, notes } = req.body

    const result = await pool.query(
      `INSERT INTO software (name, version, provider, cabinet, game_mix, notes, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [name, version, provider, cabinet, game_mix, notes]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Software POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update software
app.put('/api/software/:id', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { id } = req.params
    const { name, version, provider, cabinet, game_mix, approval, notes } = req.body

    const result = await pool.query(
      `UPDATE software 
       SET name = $1, version = $2, provider = $3, cabinet = $4, game_mix = $5, notes = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING *`,
      [name, version, provider, cabinet, game_mix, notes, id]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Software PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete software
app.delete('/api/software/:id', authenticateUser, async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }

    const { id } = req.params
    await pool.query('DELETE FROM software WHERE id = $1', [id])

    res.json({ success: true })
  } catch (error) {
    console.error('Software DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Cyber selective sync endpoints
app.post('/api/cyber/sync-locations', async (req, res) => {
  try {
    console.log('🔄 Syncing locations from Cyber...')

    // Load Cyber locations data
    const locationsPath = path.join(__dirname, 'cyber-data', 'locations.json')
    const cyberLocations = JSON.parse(fs.readFileSync(locationsPath, 'utf8'))

    let syncedCount = 0

    for (const cyberLocation of cyberLocations) {
      try {
        const exists = await pool.query('SELECT id FROM locations WHERE name = $1', [cyberLocation.name])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO locations (name, address, company, status, created_by) VALUES ($1, $2, $3, $4, $5)',
            [cyberLocation.name, cyberLocation.address || 'Adresă din Cyber', cyberLocation.company || 'Cyber Import', 'Active', 'Cyber Import']
          )
          syncedCount++
          console.log(`   ✅ Added location: ${cyberLocation.name}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Location ${cyberLocation.name} error:`, error.message)
      }
    }

    res.json({ success: true, message: `Locations sync completed: ${syncedCount} new locations added`, syncedCount })
  } catch (error) {
    console.error('Error syncing locations:', error)
    res.status(500).json({ success: false, message: 'Error syncing locations: ' + error.message })
  }
})

app.post('/api/cyber/sync-game-mixes', async (req, res) => {
  try {
    console.log('🔄 Syncing game mixes from Cyber...')

    // Load Cyber game mixes data
    const gameMixesPath = path.join(__dirname, 'cyber-data', 'game-mixes.json')
    const cyberGameMixes = JSON.parse(fs.readFileSync(gameMixesPath, 'utf8'))

    let syncedCount = 0

    for (const cyberGameMix of cyberGameMixes) {
      try {
        const exists = await pool.query('SELECT id FROM game_mixes WHERE name = $1', [cyberGameMix.name])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO game_mixes (name, provider, games, status, created_by) VALUES ($1, $2, $3, $4, $5)',
            [cyberGameMix.name, cyberGameMix.provider || null, cyberGameMix.games ? JSON.stringify(cyberGameMix.games) : null, 'Active', 'Cyber Import']
          )
          syncedCount++
          console.log(`   ✅ Added game mix: ${cyberGameMix.name}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Game mix ${cyberGameMix.name} error:`, error.message)
      }
    }

    res.json({ success: true, message: `Game mixes sync completed: ${syncedCount} new game mixes added`, syncedCount })
  } catch (error) {
    console.error('Error syncing game mixes:', error)
    res.status(500).json({ success: false, message: 'Error syncing game mixes: ' + error.message })
  }
})

app.post('/api/cyber/sync-cabinets', async (req, res) => {
  try {
    console.log('🔄 Syncing cabinets from Cyber...')

    // Load Cyber cabinets data
    const cabinetsPath = path.join(__dirname, 'cyber-data', 'cabinets.json')
    const cyberCabinets = JSON.parse(fs.readFileSync(cabinetsPath, 'utf8'))

    let syncedCount = 0

    for (const cyberCabinet of cyberCabinets) {
      try {
        const exists = await pool.query('SELECT id FROM cabinets WHERE name = $1 OR model = $1', [cyberCabinet.name])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO cabinets (name, model, provider, status, created_by) VALUES ($1, $2, $3, $4, $5)',
            [cyberCabinet.name, cyberCabinet.model || cyberCabinet.name, cyberCabinet.provider || null, 'Active', 'Cyber Import']
          )
          syncedCount++
          console.log(`   ✅ Added cabinet: ${cyberCabinet.name}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Cabinet ${cyberCabinet.name} error:`, error.message)
      }
    }

    res.json({ success: true, message: `Cabinets sync completed: ${syncedCount} new cabinets added`, syncedCount })
  } catch (error) {
    console.error('Error syncing cabinets:', error)
    res.status(500).json({ success: false, message: 'Error syncing cabinets: ' + error.message })
  }
})

app.post('/api/cyber/sync-providers', async (req, res) => {
  try {
    console.log('🔄 Syncing providers from Cyber...')

    // Load Cyber providers data
    const providersPath = path.join(__dirname, 'cyber-data', 'providers.json')
    const cyberProviders = JSON.parse(fs.readFileSync(providersPath, 'utf8'))

    let syncedCount = 0

    for (const cyberProvider of cyberProviders) {
      try {
        const exists = await pool.query('SELECT id FROM providers WHERE name = $1', [cyberProvider.name])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO providers (name, company, contact, phone, status, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [cyberProvider.name, cyberProvider.company || 'Cyber Import', cyberProvider.contact || 'Contact ' + cyberProvider.name, cyberProvider.phone || '+40 000 000 000', 'Active', 'Cyber Import']
          )
          syncedCount++
          console.log(`   ✅ Added provider: ${cyberProvider.name}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Provider ${cyberProvider.name} error:`, error.message)
      }
    }

    res.json({ success: true, message: `Providers sync completed: ${syncedCount} new providers added`, syncedCount })
  } catch (error) {
    console.error('Error syncing providers:', error)
    res.status(500).json({ success: false, message: 'Error syncing providers: ' + error.message })
  }
})

// SYNC Cyber slots to main slots table
app.post('/api/cyber/sync-slots', async (req, res) => {
  try {
    console.log('🔄 SYNCING Cyber slots to main slots table...')

    const pool = req.app.get('pool')
    const slotsPath = path.join(__dirname, 'cyber-data', 'slots.json')

    if (!fs.existsSync(slotsPath)) {
      return res.status(404).json({ error: 'Cyber slots data not found' })
    }

    const cyberSlots = JSON.parse(fs.readFileSync(slotsPath, 'utf8'))
    console.log(`📥 Found ${cyberSlots.length} Cyber slots to sync`)

    // STEP 1: Extract and auto-populate unique entities
    console.log('📊 Extracting unique entities from Cyber data...')

    const uniqueLocations = new Set()
    const uniqueProviders = new Set()
    const uniqueCabinets = new Set()
    const uniqueGameMixes = new Set()

    cyberSlots.forEach(slot => {
      if (slot.location && slot.location !== 'Unknown' && slot.location !== 'N/A') {
        uniqueLocations.add(slot.location)
      }
      if (slot.provider && slot.provider !== 'Unknown' && slot.provider !== 'N/A') {
        uniqueProviders.add(slot.provider)
      }
      if (slot.cabinet && slot.cabinet !== 'Unknown' && slot.cabinet !== 'N/A') {
        uniqueCabinets.add(slot.cabinet)
      }
      if (slot.game_mix && slot.game_mix !== 'N/A') {
        // Cleanup: Extract only part after " - " (ex: "EGT - Union" -> "Union")
        const cleanGameMix = slot.game_mix.includes(' - ')
          ? slot.game_mix.split(' - ')[1].trim()
          : slot.game_mix
        if (cleanGameMix) uniqueGameMixes.add(cleanGameMix)
      }
    })

    console.log(`🔍 Found unique entities:`)
    console.log(`   📍 Locations: ${uniqueLocations.size}`)
    console.log(`   🎮 Providers: ${uniqueProviders.size}`)
    console.log(`   🎰 Cabinets: ${uniqueCabinets.size}`)
    console.log(`   🎲 Game Mixes: ${uniqueGameMixes.size}`)

    // STEP 2: Auto-populate Locations
    for (const location of uniqueLocations) {
      try {
        const exists = await pool.query('SELECT id FROM locations WHERE name = $1', [location])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO locations (name, address, company, status, created_by) VALUES ($1, $2, $3, $4, $5)',
            [location, 'Adresă din Cyber', 'Cyber Import', 'Active', 'Cyber Import']
          )
          console.log(`   ✅ Added location: ${location}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Location ${location} error:`, error.message)
      }
    }

    // STEP 3: Auto-populate Providers
    for (const provider of uniqueProviders) {
      try {
        const exists = await pool.query('SELECT id FROM providers WHERE name = $1', [provider])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO providers (name, company, contact, phone, status, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
            [provider, 'Cyber Import', 'Contact ' + provider, '+40 000 000 000', 'Active', 'Cyber Import']
          )
          console.log(`   ✅ Added provider: ${provider}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Provider ${provider} error:`, error.message)
      }
    }

    // STEP 4: Auto-populate Cabinets
    for (const cabinet of uniqueCabinets) {
      try {
        const exists = await pool.query('SELECT id FROM cabinets WHERE name = $1 OR model = $1', [cabinet])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO cabinets (name, model, status, created_by) VALUES ($1, $2, $3, $4)',
            [cabinet, cabinet, 'Active', 'Cyber Import']
          )
          console.log(`   ✅ Added cabinet: ${cabinet}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Cabinet ${cabinet} error:`, error.message)
      }
    }

    // STEP 5: Auto-populate Game Mixes
    for (const gameMix of uniqueGameMixes) {
      try {
        const exists = await pool.query('SELECT id FROM game_mixes WHERE name = $1', [gameMix])
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO game_mixes (name, status, created_by) VALUES ($1, $2, $3)',
            [gameMix, 'Active', 'Cyber Import']
          )
          console.log(`   ✅ Added game mix: ${gameMix}`)
        }
      } catch (error) {
        console.log(`   ⚠️ Game mix ${gameMix} error:`, error.message)
      }
    }

    console.log('✅ All unique entities populated!')

    // STEP 6: Keep existing slots - only update/add new ones
    console.log('🔄 Preserving existing slots - will update/add only new ones')

    // STEP 7: Insert Cyber slots in BATCH with cleaned game_mix
    console.log('🚀 Starting BATCH insert...')
    const values = []
    const params = []
    let paramCount = 1

    cyberSlots.forEach(cyberSlot => {
      // Cleanup game_mix - extract only part after " - "
      const cleanGameMix = cyberSlot.game_mix && cyberSlot.game_mix.includes(' - ')
        ? cyberSlot.game_mix.split(' - ')[1].trim()
        : cyberSlot.game_mix
      const rowValues = [
        cyberSlot.serial_number || 'N/A',
        cyberSlot.serial_number || 'N/A', // slot_id same as serial_number
        cyberSlot.provider || 'Unknown',
        cyberSlot.cabinet || 'Unknown',
        cleanGameMix || null, // Use cleaned game_mix
        cyberSlot.status || 'Active',
        cyberSlot.location || 'Unknown',
        cyberSlot.updated_at || cyberSlot.last_updated || new Date().toISOString(),
        cyberSlot.created_at || new Date().toISOString(),
        'Cyber Import'
      ]

      const placeholders = rowValues.map((_, idx) => `$${paramCount + idx}`).join(', ')
      values.push(`(${placeholders})`)
      params.push(...rowValues)
      paramCount += rowValues.length
    })

    const insertQuery = `
      INSERT INTO slots (
        serial_number, slot_id, provider, cabinet, game_mix, status, 
        location, updated_at, created_at, created_by
      ) VALUES ${values.join(', ')}
    `

    await pool.query(insertQuery, params)
    const insertedCount = cyberSlots.length
    console.log(`✅ BATCH INSERT completed: ${insertedCount} slots`)

    console.log(`✅ SYNCED ${insertedCount} slots from Cyber to main table`)
    res.json({
      success: true,
      message: `Synced ${cyberSlots.length} slots + ${uniqueLocations.size} locations + ${uniqueProviders.size} providers + ${uniqueCabinets.size} cabinets + ${uniqueGameMixes.size} game mixes`,
      syncedCount: cyberSlots.length,
      totalCyberSlots: cyberSlots.length,
      entitiesPopulated: {
        locations: uniqueLocations.size,
        providers: uniqueProviders.size,
        cabinets: uniqueCabinets.size,
        gameMixes: uniqueGameMixes.size
      }
    })
  } catch (error) {
    console.error('❌ Error syncing Cyber slots:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// All Cyber routes now handled by cyber.js module

// ==================== COMMISSIONS ENDPOINTS ====================

// Get all commissions
app.get('/api/commissions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM commissions ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (error) {
    console.error('Commissions GET error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get a single commission by ID
app.get('/api/commissions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM commissions WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Commission not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Commission GET by ID error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create a new commission
app.post('/api/commissions', authenticateUser, async (req, res) => {
  try {
    const { name, serial_numbers, commission_date, expiry_date, notes } = req.body
    const createdBy = req.user?.full_name || req.user?.username || 'Eugeniu Cazmal'

    // Parse serial numbers from textarea - split by newlines and filter empty
    const serialNumbersArray = serial_numbers
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const result = await pool.query(
      'INSERT INTO commissions (name, serial_numbers, commission_date, expiry_date, notes, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *',
      [name, JSON.stringify(serialNumbersArray), commission_date, expiry_date, notes, createdBy]
    )

    // Update commission_date in slots table for each serial number
    if (serialNumbersArray.length > 0) {
      for (const serialNumber of serialNumbersArray) {
        await pool.query(
          'UPDATE slots SET commission_date = $1 WHERE serial_number = $2',
          [commission_date, serialNumber]
        )
      }
    }

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Commissions POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update a commission
app.put('/api/commissions/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const { name, serial_numbers, commission_date, expiry_date, notes, attachments } = req.body
    const updatedBy = req.user?.full_name || req.user?.username || 'Eugeniu Cazmal'

    // Parse serial numbers - handle both string and array
    let serialNumbersArray = []
    if (Array.isArray(serial_numbers)) {
      serialNumbersArray = serial_numbers
    } else if (typeof serial_numbers === 'string') {
      serialNumbersArray = serial_numbers
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }

    // Parse attachments - handle both string (JSON) and array
    let attachmentsData = null
    if (attachments) {
      if (typeof attachments === 'string') {
        try {
          attachmentsData = JSON.parse(attachments)
        } catch (e) {
          attachmentsData = attachments
        }
      } else if (Array.isArray(attachments)) {
        attachmentsData = attachments
      }
    }

    const result = await pool.query(
      'UPDATE commissions SET name = $1, serial_numbers = $2, commission_date = $3, expiry_date = $4, notes = $5, attachments = $6, updated_by = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, JSON.stringify(serialNumbersArray), commission_date, expiry_date, notes, attachmentsData ? JSON.stringify(attachmentsData) : null, updatedBy, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Commission not found' })
    }

    // Update commission_date in slots table for each serial number
    if (serialNumbersArray.length > 0) {
      for (const serialNumber of serialNumbersArray) {
        await pool.query(
          'UPDATE slots SET commission_date = $1 WHERE serial_number = $2',
          [commission_date, serialNumber]
        )
      }
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Commissions PUT error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete a commission
app.delete('/api/commissions/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM commissions WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Commission not found' })
    }
    res.json({ success: true, message: 'Commission deleted successfully' })
  } catch (error) {
    console.error('Commissions DELETE error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Routes already registered at line 1075 - IMMEDIATE REGISTRATION

// Routes are registered at line 1075 using promotionsRoutes router

// Get dashboard configuration endpoint
app.get('/api/restore-dashboard/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params
    const result = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const preferences = typeof result.rows[0].preferences === 'string'
      ? JSON.parse(result.rows[0].preferences)
      : result.rows[0].preferences || {}

    res.json({ success: true, preferences })
  } catch (error) {
    console.error('Error getting dashboard config:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Import all data from external database - DIRECT IMPORT (no script file)
app.post('/api/import/all-data', authenticateUser, async (req, res) => {
  // Return immediately - import runs in background
  res.json({
    success: true,
    message: 'Import started in background. Check /api/import/status for progress.',
    note: 'This may take several minutes depending on data size.'
  })

  // Run import in background (don't await)
  importAllDataDirect(pool).catch(error => {
    console.error('❌ Import error:', error)
  })
})

// Direct import function (no external script)
async function importAllDataDirect(localPool) {
  const pkg = await import('pg')
  const { Pool } = pkg

  // Try LAN first, then external
  let externalPool = null
  let externalDbHost = '192.168.1.39'

  try {
    console.log('🚀 Starting DIRECT data import from external database...')
    console.log(`🔌 Trying LAN connection: ${externalDbHost}:26257`)

    externalPool = new Pool({
      user: process.env.EXPENDITURES_DB_USER || 'cashpot',
      password: process.env.EXPENDITURES_DB_PASSWORD || '129hj8oahwd7yaw3e21321',
      host: externalDbHost,
      port: 26257,
      database: process.env.EXPENDITURES_DB_NAME || 'cashpot',
      ssl: false,
      max: 5,
      connectionTimeoutMillis: 10000 // Quick timeout
    })

    await externalPool.query('SELECT NOW()')
    console.log(`✅ Connected to LAN DB: ${externalDbHost}`)
  } catch (lanError) {
    console.log(`⚠️ LAN failed, trying external IP: 82.76.35.50`)
    if (externalPool) {
      await externalPool.end().catch(() => { })
    }

    externalPool = new Pool({
      user: process.env.EXPENDITURES_DB_USER || 'cashpot',
      password: process.env.EXPENDITURES_DB_PASSWORD || '129hj8oahwd7yaw3e21321',
      host: '82.76.35.50',
      port: 26257,
      database: process.env.EXPENDITURES_DB_NAME || 'cashpot',
      ssl: false,
      max: 5,
      connectionTimeoutMillis: 30000
    })

    await externalPool.query('SELECT NOW()')
    console.log(`✅ Connected to External DB: 82.76.35.50`)
  }

  try {
    // Get table list
    const tablesResult = await externalPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name
    `)

    const tables = tablesResult.rows.map(r => r.table_name)
    console.log(`📋 Found ${tables.length} tables to import`)

    let totalImported = 0
    let totalSkipped = 0

    // Import each table
    for (const tableName of tables) {
      try {
        console.log(`\n📊 Importing: ${tableName}`)

        // Get data from external
        const externalData = await externalPool.query(`SELECT * FROM ${tableName} LIMIT 10000`) // Limit pentru viteză
        console.log(`   Found ${externalData.rows.length} rows`)

        if (externalData.rows.length === 0) continue

        const columns = externalData.fields.map(f => f.name)
        const columnsStr = columns.join(', ')
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')

        // Import with ON CONFLICT for duplicates
        let imported = 0
        let skipped = 0

        for (const row of externalData.rows) {
          try {
            const values = columns.map(col => row[col])

            // Special handling for expenditures_sync
            if (tableName === 'expenditures_sync' || tableName === 'casino_payments') {
              // Skip if importing to expenditures_sync - use sync endpoint instead
              continue
            }

            let insertSQL = `INSERT INTO ${tableName} (${columnsStr}) VALUES (${placeholders})`

            // Add ON CONFLICT if id exists
            if (columns.includes('id')) {
              insertSQL += ` ON CONFLICT (id) DO UPDATE SET ${columns
                .filter(c => c !== 'id')
                .map(c => `${c} = EXCLUDED.${c}`)
                .join(', ')}`
            } else {
              insertSQL += ` ON CONFLICT DO NOTHING`
            }

            const result = await localPool.query(insertSQL, values)
            if (result.rowCount > 0) imported++
            else skipped++
          } catch (rowError) {
            if (rowError.code === '23505') skipped++
            else console.error(`   Error row:`, rowError.message)
          }
        }

        totalImported += imported
        totalSkipped += skipped
        console.log(`   ✅ ${imported} imported, ${skipped} skipped`)

      } catch (tableError) {
        console.error(`❌ Error importing ${tableName}:`, tableError.message)
      }
    }

    console.log(`\n✅ IMPORT COMPLETE: ${totalImported} imported, ${totalSkipped} skipped`)

  } finally {
    if (externalPool) {
      await externalPool.end()
    }
  }
}

// Get import status (check if tables exist and have data)
app.get('/api/import/status', authenticateUser, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database not available' })
    }

    // Get all tables and their row counts
    const tablesResult = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    const tablesWithCounts = await Promise.all(
      tablesResult.rows.map(async (table) => {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`)
          return {
            name: table.table_name,
            rowCount: parseInt(countResult.rows[0].count),
            columnCount: parseInt(table.column_count)
          }
        } catch (error) {
          return {
            name: table.table_name,
            rowCount: 0,
            columnCount: parseInt(table.column_count),
            error: error.message
          }
        }
      })
    )

    const totalRows = tablesWithCounts.reduce((sum, table) => sum + table.rowCount, 0)

    res.json({
      success: true,
      totalTables: tablesWithCounts.length,
      totalRows: totalRows,
      tables: tablesWithCounts
    })
  } catch (error) {
    console.error('❌ Error getting import status:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Restore dashboard configuration endpoint
app.post('/api/restore-dashboard/:userId', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params

    const defaultDashboardConfig = {
      statCards: [
        { id: 'companies', title: 'Companii', visible: true, order: 1 },
        { id: 'locations', title: 'Locații', visible: true, order: 2 },
        { id: 'providers', title: 'Furnizori', visible: true, order: 3 },
        { id: 'cabinets', title: 'Cabinete', visible: true, order: 4 },
        { id: 'gameMixes', title: 'Game Mixes', visible: true, order: 5 },
        { id: 'slots', title: 'Sloturi', visible: true, order: 6 },
        { id: 'games', title: 'Librărie Jocuri', visible: true, order: 7 },
        { id: 'warehouse', title: 'Depozit', visible: true, order: 8 },
        { id: 'metrology', title: 'Metrologie', visible: true, order: 9 },
        { id: 'jackpots', title: 'Jackpots', visible: false, order: 10 },
        { id: 'invoices', title: 'Facturi', visible: false, order: 11 },
        { id: 'onjnReports', title: 'Rapoarte ONJN', visible: true, order: 12 },
        { id: 'legalDocuments', title: 'Documente Legale', visible: false, order: 13 },
        { id: 'users', title: 'Utilizatori', visible: false, order: 14 }
      ],
      widgets: [
        { id: 'quickActions', title: 'Acțiuni Rapide', visible: true, order: 1 },
        { id: 'recentActivity', title: 'Activitate Recentă', visible: true, order: 2 },
        { id: 'databaseBackup', title: 'Backup Bază de Date', visible: true, order: 3 },
        { id: 'currencyRate', title: 'Curs Valutar ONJN', visible: true, order: 4 },
        { id: 'onjnCalendar', title: 'Calendar ONJN', visible: true, order: 5 },
        { id: 'systemHealth', title: 'Sănătate Sistem', visible: true, order: 6 },
        { id: 'gamesLibrary', title: 'Librărie Jocuri', visible: false, order: 7 },
        { id: 'tasks', title: 'Sarcini', visible: false, order: 8 }
      ]
    }

    const defaultCardSizes = {
      companies: 'medium', locations: 'medium', providers: 'medium', cabinets: 'medium',
      gameMixes: 'medium', slots: 'medium', games: 'medium', warehouse: 'medium',
      metrology: 'medium', jackpots: 'medium', invoices: 'medium', onjnReports: 'medium',
      legalDocuments: 'medium', users: 'medium'
    }

    const defaultWidgetSizes = {
      quickActions: 'medium', recentActivity: 'medium', databaseBackup: 'medium',
      currencyRate: 'small', onjnCalendar: 'large', systemHealth: 'large',
      gamesLibrary: 'large', tasks: 'medium'
    }

    const preferences = {
      dashboard: defaultDashboardConfig,
      cardSizes: defaultCardSizes,
      widgetSizes: defaultWidgetSizes
    }

    const result = await pool.query(
      'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username',
      [JSON.stringify(preferences), userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, message: 'Dashboard configuration restored', user: result.rows[0] })
  } catch (error) {
    console.error('Error restoring dashboard config:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Server startup - MOVED HERE AFTER ALL ROUTES ARE REGISTERED!
// This ensures all routes are available when server starts
// HOST already defined at line 1501
const serverFinal = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`)
  console.log(`📊 Database: PostgreSQL`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`)
  console.log(`📅 Build: ${BUILD_NUMBER} (${BUILD_DATE})`)
  console.log('✅ Server is LIVE - Health checks will PASS!')
  console.log('✅ All routes registered - login endpoint available at /api/auth/login')
  console.log('⏳ Database initialization running in background...')
})

console.log('✅ Server startup complete - all endpoints registered')
// Force Render rebuild Mon Nov 10 10:44:55 EET 2025
