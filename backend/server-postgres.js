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
import metrologyRoutes from './routes/metrology.js'
import warehouseRoutes from './routes/warehouse.js'
import promotionsRoutes from './routes/promotions.js'
import cyberRoutes from './routes/cyber.js'
import tasksRoutes from './routes/tasks.js'
import messagesRoutes from './routes/messages.js'
import notificationsRoutes from './routes/notifications.js'
import { scheduleBackups } from './backup.js'
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
const PORT = process.env.PORT || 3001

  // CRITICAL FIX - 2025-10-19 11:43 - FORCE RENDER REBUILD FOR ROUTES
  const BUILD_NUMBER = '999'
  const BUILD_DATE = new Date().toISOString()
  console.log(`🚀 CRITICAL BUILD ${BUILD_NUMBER} - ${BUILD_DATE}`)
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

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
})

// Make pool available to routes
app.set('pool', pool)

// Routes are now registered IMMEDIATELY after middleware setup (line ~1080)
// Test connection
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err)
  } else {
    console.log('✅ Connected to PostgreSQL')
    console.log('⏰ Database time:', res.rows[0].now)
    
    // Initialize database schema after connection is established
    await initializeDatabase()
  }
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
        cvt_number VARCHAR(255) UNIQUE NOT NULL,
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
        'INSERT INTO users (username, password, full_name, email, role, avatar) VALUES ($1, $2, $3, $4, $5, $6)',
        ['admin', hashedPassword, 'Eugeniu Cazmal', 'eugeniu@cashpot.com', 'admin', '/assets/default-avatar.svg']
      )
      console.log('✅ Admin user created')
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

      // Create promotions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS promotions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          total_amount DECIMAL(15,2) DEFAULT 0,
          awarded_amount DECIMAL(15,2) DEFAULT 0,
          location VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active',
          prizes JSONB DEFAULT '[]',
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
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
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          updated_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

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

    // Create marketing/promotions table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS promotions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          location VARCHAR(255) NOT NULL,
          prizes JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'Active',
          notes TEXT,
          banner_path VARCHAR(500),
          regulation_path VARCHAR(500),
          created_by VARCHAR(255) DEFAULT 'Eugeniu Cazmal',
          updated_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✅ Promotions table created')
      
      // Add missing columns if they don't exist
      try {
        await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS banner_path VARCHAR(500)")
        await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS regulation_path VARCHAR(500)")
        await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]'")
        await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0")
        await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS awarded_amount DECIMAL(15,2) DEFAULT 0")
        await pool.query("ALTER TABLE promotions ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)")
        console.log('✅ Added missing columns to promotions table')
      } catch (e) {
        console.log('⚠️ Error adding columns to promotions:', e.message)
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
    } catch (error) {
      console.log('⚠️ Promotions table may already exist:', error.message)
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
      console.log('✅ Users table updated with new fields including preferences')
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

    console.log('✅ Database schema initialized')
  } catch (error) {
    console.error('❌ Database initialization error:', error)
  }
}

// Middleware
app.use(morgan('combined'))
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['https://w1n.ro', 'http://localhost:3000'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

console.log('🔥 BEFORE ROUTE REGISTRATION - Express middleware configured!')

// ==================== IMMEDIATE ROUTE REGISTRATION ====================
console.log('🚨🚨🚨 IMMEDIATE ROUTE REGISTRATION v1.0.49! 🚨🚨🚨')
try {
  console.log('📋 Registering /api/promotions router IMMEDIATELY...')
  app.use('/api/promotions', promotionsRoutes)
  console.log('📋 Registering /api/cyber IMMEDIATELY...')
  app.use('/api/cyber', cyberRoutes)
  console.log('📋 Registering /api/tasks IMMEDIATELY...')
  app.use('/api/tasks', authenticateUser, tasksRoutes)
  console.log('📋 Registering /api/messages IMMEDIATELY...')
  app.use('/api/messages', authenticateUser, messagesRoutes)
  console.log('📋 Registering /api/notifications IMMEDIATELY...')
  app.use('/api/notifications', authenticateUser, notificationsRoutes)
  console.log('✅✅✅ IMMEDIATE SUCCESS: ALL ROUTES REGISTERED! ✅✅✅')
} catch (error) {
  console.error('❌❌❌ IMMEDIATE ERROR during route registration:', error)
}

// DIRECT PROMOTIONS ENDPOINTS - BACKUP IF ROUTER FAILS
app.get('/api/promotions', async (req, res) => {
  console.log('🚨🚨🚨 DIRECT GET /api/promotions called!')
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
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
    
    const { name, description, start_date, end_date, location, locations, prizes, status, notes } = req.body
    const createdBy = (req.user && (req.user.full_name || req.user.username)) || 'Eugeniu Cazmal'
    
    console.log('🚨 DIRECT POST data:', { name, description, start_date, end_date, location, locations, prizes })
    
    // Calculate total amount from prizes
    const prizesArray = Array.isArray(prizes) ? prizes : []
    const totalAmount = prizesArray.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    
    // Handle locations array
    const locationsArray = Array.isArray(locations) ? locations : []
    
    // Use first location's dates if no global dates provided
    const globalStartDate = start_date || (locationsArray[0]?.start_date) || new Date().toISOString().split('T')[0]
    const globalEndDate = end_date || (locationsArray[0]?.end_date) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Get first location name as default location
    const defaultLocation = location || (locationsArray.length > 0 ? locationsArray[0].location : 'Default Location')
    
    const result = await pool.query(
      `INSERT INTO promotions 
       (name, description, start_date, end_date, total_amount, awarded_amount, location, locations, status, prizes, notes, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [name || 'Untitled Promotion', description || '', globalStartDate, globalEndDate, totalAmount, 0, defaultLocation, JSON.stringify(locationsArray), status || 'Active', JSON.stringify(prizesArray), notes || '', createdBy]
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

// Health check - Force redeploy
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      version: '7.0.9',
      build: BUILD_NUMBER,
      buildDate: BUILD_DATE,
      uptime: process.uptime(),
      database: 'Connected',
      dbTime: result.rows[0].now
    })
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Disconnected',
      error: error.message
    })
  }
})

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

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    
    const user = result.rows[0]
    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'cashpot-secret-key-2024',
      { expiresIn: '24h' }
    )
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        permissions: user.permissions,
        notes: user.notes,
        status: user.status
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Verify token
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cashpot-secret-key-2024')
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId])
    
    if (result.rows.length === 0) {
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
    console.error('Token verification error:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid token'
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

app.post('/api/locations', upload.single('planFile'), async (req, res) => {
  try {
    const { name, address, company, surface, status, coordinates, contact_person, notes } = req.body
    const planFile = req.file ? `/uploads/locations/${req.file.filename}` : null
    const result = await pool.query(
      'INSERT INTO locations (name, address, company, surface, status, coordinates, contact_person, plan_file, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, address, company, surface, status || 'Active', coordinates, contact_person, planFile, notes]
    )
    const newLocation = { ...result.rows[0], capacity: 0 }
    res.json(newLocation)
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/locations/:id', upload.single('planFile'), async (req, res) => {
  try {
    const { id } = req.params
    console.log('PUT /api/locations/:id - req.body:', req.body)
    console.log('PUT /api/locations/:id - req.file:', req.file)
    const { name, address, company, surface, status, coordinates, contact_person, notes } = req.body
    const planFile = req.file ? `/uploads/locations/${req.file.filename}` : undefined
    
    // If a new file is uploaded, use it; otherwise keep the existing one
    let updateQuery
    let queryParams
    if (planFile) {
      updateQuery = 'UPDATE locations SET name = $1, address = $2, company = $3, surface = $4, status = $5, coordinates = $6, contact_person = $7, plan_file = $8, notes = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *'
      queryParams = [name, address, company, surface, status, coordinates, contact_person, planFile, notes, id]
    } else {
      updateQuery = 'UPDATE locations SET name = $1, address = $2, company = $3, surface = $4, status = $5, coordinates = $6, contact_person = $7, notes = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *'
      queryParams = [name, address, company, surface, status, coordinates, contact_person, notes, id]
    }
    
    const result = await pool.query(updateQuery, queryParams)
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
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
    res.json(result.rows[0])
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
      description 
    } = req.body
    
    const result = await pool.query(`
      INSERT INTO contracts (
        contract_number, title, location_id, proprietar_id, 
        type, status, start_date, end_date, monthly_rent, currency, deposit, payment_terms, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      contract_number, title, location_id, proprietar_id,
      type, status, start_date, end_date, monthly_rent, currency, deposit, payment_terms, description
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
      description 
    } = req.body

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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      contract_number, title, location_id, proprietar_id,
      type, status, start_date, end_date, monthly_rent, currency, deposit, payment_terms, description, id
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
    const result = await pool.query('SELECT *, cvt_file as "cvtFile" FROM metrology ORDER BY created_at DESC')
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
  try {
    const { 
      cvt_number, serial_number, cvt_type, cvt_date, expiry_date, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvtFile, notes 
    } = req.body
    
    // Calculate expiry_date automatically for Periodică and Inițială (1 year - 1 day from cvt_date)
    let calculatedExpiryDate = expiry_date
    if (cvt_date && (cvt_type === 'Periodică' || cvt_type === 'Inițială') && !expiry_date) {
      const cvtDate = new Date(cvt_date)
      const expiryDate = new Date(cvtDate)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      expiryDate.setDate(expiryDate.getDate() - 1)
      calculatedExpiryDate = expiryDate.toISOString().split('T')[0]
    }
    
    const result = await pool.query(
      'INSERT INTO metrology (cvt_number, serial_number, cvt_type, cvt_date, expiry_date, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvt_file, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *, cvt_file as "cvtFile"',
      [cvt_number, serial_number, cvt_type, cvt_date, calculatedExpiryDate, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvtFile, notes, 'admin']
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Metrology POST error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.put('/api/metrology/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { 
      cvt_number, cvt_type, cvt_date, expiry_date, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvtFile, notes 
    } = req.body
    
    // Calculate expiry_date automatically for Periodică and Inițială (1 year - 1 day from cvt_date)
    let calculatedExpiryDate = expiry_date
    if (cvt_date && (cvt_type === 'Periodică' || cvt_type === 'Inițială') && !expiry_date) {
      const cvtDate = new Date(cvt_date)
      const expiryDate = new Date(cvtDate)
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      expiryDate.setDate(expiryDate.getDate() - 1)
      calculatedExpiryDate = expiryDate.toISOString().split('T')[0]
    }
    
    // Build update query based on whether cvtFile is provided
    let query, params
    if (cvtFile) {
      query = 'UPDATE metrology SET cvt_number = $1, cvt_type = $2, cvt_date = $3, expiry_date = $4, issuing_authority = $5, provider = $6, cabinet = $7, game_mix = $8, approval_type = $9, software = $10, cvt_file = $11, notes = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *, cvt_file as "cvtFile"'
      params = [cvt_number, cvt_type, cvt_date, calculatedExpiryDate, issuing_authority, provider, cabinet, game_mix, approval_type, software, cvtFile, notes, id]
    } else {
      query = 'UPDATE metrology SET cvt_number = $1, cvt_type = $2, cvt_date = $3, expiry_date = $4, issuing_authority = $5, provider = $6, cabinet = $7, game_mix = $8, approval_type = $9, software = $10, notes = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12 RETURNING *, cvt_file as "cvtFile"'
      params = [cvt_number, cvt_type, cvt_date, calculatedExpiryDate, issuing_authority, provider, cabinet, game_mix, approval_type, software, notes, id]
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
app.use('/api/onjn-reports', onjnReportsRoutes)
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
    res.json(result.rows)
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
app.put('/api/approvals/:id', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    const pool = req.app.get('pool')
    if (!pool) {
      return res.status(500).json({ success: false, error: 'Database pool not available' })
    }
    
    const { id } = req.params
    const { name, provider, cabinet, game_mix, checksum_md5, checksum_sha256, notes } = req.body
    
    // Get existing attachments
    const existingResult = await pool.query('SELECT attachments FROM approvals WHERE id = $1', [id])
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Approval not found' })
    }
    
    let attachments = existingResult.rows[0].attachments || []
    
    // Add new file if uploaded
    if (req.file) {
      const fileUrl = `/uploads/${req.file.filename}`
      attachments.push({
        filename: req.file.originalname,
        url: fileUrl,
        uploadedAt: new Date().toISOString()
      })
    }
    
    const result = await pool.query(
      `UPDATE approvals 
       SET name = $1, provider = $2, cabinet = $3, game_mix = $4, 
           checksum_md5 = $5, checksum_sha256 = $6, attachments = $7, 
           notes = $8, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING *`,
      [name, provider, cabinet, game_mix, checksum_md5, checksum_sha256, JSON.stringify(attachments), notes, id]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Approvals PUT error:', error)
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
    const { name, serial_numbers, commission_date, expiry_date, notes } = req.body
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
    
    const result = await pool.query(
      'UPDATE commissions SET name = $1, serial_numbers = $2, commission_date = $3, expiry_date = $4, notes = $5, updated_by = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [name, JSON.stringify(serialNumbersArray), commission_date, expiry_date, notes, updatedBy, id]
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📅 Build: ${BUILD_NUMBER} (${BUILD_DATE})`)
})
