import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'
import { scheduleBackups } from './backup.js'
import backupRoutes from './routes/backup.js'
import uploadRoutes from './routes/upload.js'
import gamesRoutes from './routes/games.js'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5001

// Initialize SQLite database
const db = new sqlite3.Database(join(__dirname, 'cashpot.db'))

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Companies table
  db.run(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    license TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    contactPerson TEXT,
    status TEXT DEFAULT 'Active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Locations table
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    company TEXT NOT NULL,
    surface REAL,
    status TEXT DEFAULT 'Active',
    coordinates TEXT,
    planFile TEXT,
    notes TEXT,
    createdBy TEXT DEFAULT 'admin',
    updatedBy TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Slots table for capacity calculation
  db.run(`CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slotId TEXT NOT NULL,
    location TEXT NOT NULL,
    game TEXT,
    payout REAL,
    status TEXT DEFAULT 'Active',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Providers table
  db.run(`CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    contact TEXT NOT NULL,
    phone TEXT NOT NULL,
    gamesCount INTEGER DEFAULT 0,
    contractType TEXT DEFAULT 'Standard',
    contractEnd TEXT,
    status TEXT DEFAULT 'Active',
    logo TEXT,
    notes TEXT,
    createdBy TEXT DEFAULT 'admin',
    updatedBy TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Insert sample data
  db.run(`INSERT OR IGNORE INTO users (username, email, password, fullName, role) 
    VALUES ('admin', 'admin@cashpot-v7.com', 'admin123', 'Administrator Sistem', 'admin')`)

  db.run(`INSERT OR IGNORE INTO companies (name, license, email, phone, address, contactPerson) 
    VALUES ('BRML Industries SRL', 'L-2024-001', 'contact@brml.ro', '+40 21 123 4567', 'Str. Centrală nr. 1, București', 'Ion Popescu')`)

  db.run(`INSERT OR IGNORE INTO companies (name, license, email, phone, address, contactPerson) 
    VALUES ('RMC Technologies', 'L-2024-002', 'info@rmc-tech.ro', '+40 264 987 654', 'Bd. Nordului nr. 25, Cluj', 'Maria Ionescu')`)

  db.run(`INSERT OR IGNORE INTO providers (name, company, contact, phone, gamesCount, contractType, contractEnd, status) 
    VALUES ('EGT Digital', 'BRML Industries SRL', 'contact@egt-digital.com', '+40 21 555 1234', 45, 'Exclusiv', '2025-12-31', 'Active')`)

  db.run(`INSERT OR IGNORE INTO providers (name, company, contact, phone, gamesCount, contractType, contractEnd, status) 
    VALUES ('Novomatic', 'BRML Industries SRL', 'info@novomatic.ro', '+40 21 555 5678', 38, 'Standard', '2025-06-30', 'Active')`)

  db.run(`INSERT OR IGNORE INTO providers (name, company, contact, phone, gamesCount, contractType, contractEnd, status) 
    VALUES ('Amusnet Interactive', 'RMC Technologies', 'sales@amusnet.com', '+40 21 444 9876', 52, 'Premium', '2026-03-31', 'Active')`)
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
})
app.use('/api/', limiter)

// Routes
app.use('/api/backup', backupRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/games', gamesRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  
  if (username === 'admin' && password === 'admin123') {
    const user = {
      id: 1,
      username: 'admin',
      email: 'admin@cashpot-v7.com',
      fullName: 'Administrator Sistem',
      role: 'admin',
      status: 'active'
    }
    
    res.json({
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user
    })
  } else {
    res.status(401).json({
      success: false,
      message: 'Credențiale invalide'
    })
  }
})

// Companies routes
app.get('/api/companies', (req, res) => {
  db.all('SELECT * FROM companies ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message })
    } else {
      res.json(rows)
    }
  })
})

app.post('/api/companies', (req, res) => {
  const { name, license, email, phone, address, contactPerson, status } = req.body
  
  db.run(
    'INSERT INTO companies (name, license, email, phone, address, contactPerson, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, license, email, phone, address, contactPerson, status || 'Active'],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else {
        // Return the complete created item
        const newItem = {
          id: this.lastID,
          name,
          license,
          email,
          phone,
          address,
          contactPerson,
          status: status || 'Active',
          createdAt: new Date().toISOString()
        }
        res.json(newItem)
      }
    }
  )
})

app.put('/api/companies/:id', (req, res) => {
  const { id } = req.params
  const { name, license, email, phone, address, contactPerson, status } = req.body
  
  db.run(
    'UPDATE companies SET name = ?, license = ?, email = ?, phone = ?, address = ?, contactPerson = ?, status = ? WHERE id = ?',
    [name, license, email, phone, address, contactPerson, status || 'Active', id],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else if (this.changes === 0) {
        res.status(404).json({ success: false, error: 'Company not found' })
      } else {
        res.json({ success: true, message: 'Company updated successfully' })
      }
    }
  )
})

app.delete('/api/companies/:id', (req, res) => {
  const { id } = req.params
  
  db.run(
    'DELETE FROM companies WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else if (this.changes === 0) {
        res.status(404).json({ success: false, error: 'Company not found' })
      } else {
        res.json({ success: true, message: 'Company deleted successfully' })
      }
    }
  )
})

// Locations endpoints with capacity calculation from slots
app.get('/api/locations', (req, res) => {
  db.all(`
    SELECT l.*, 
           COALESCE(slot_count.slot_count, 0) as capacity
    FROM locations l
    LEFT JOIN (
      SELECT location, COUNT(*) as slot_count 
      FROM slots 
      GROUP BY location
    ) slot_count ON l.name = slot_count.location
    ORDER BY l.createdAt DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message })
    } else {
      res.json(rows)
    }
  })
})

app.post('/api/locations', (req, res) => {
  const { name, address, company, surface, status, coordinates, notes } = req.body
  
  db.run(
    'INSERT INTO locations (name, address, company, surface, status, coordinates, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, address, company, surface, status || 'Active', coordinates, notes],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else {
        const newItem = {
          id: this.lastID,
          name,
          address,
          company,
          surface,
          capacity: 0, // Will be calculated from slots
          status: status || 'Active',
          coordinates,
          notes,
          createdAt: new Date().toISOString()
        }
        res.json(newItem)
      }
    }
  )
})

app.put('/api/locations/:id', (req, res) => {
  const { id } = req.params
  const { name, address, company, surface, status, coordinates, notes } = req.body
  
  db.run(
    'UPDATE locations SET name = ?, address = ?, company = ?, surface = ?, status = ?, coordinates = ?, notes = ? WHERE id = ?',
    [name, address, company, surface, status || 'Active', coordinates, notes, id],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else if (this.changes === 0) {
        res.status(404).json({ success: false, error: 'Location not found' })
      } else {
        res.json({ success: true, message: 'Location updated successfully' })
      }
    }
  )
})

app.delete('/api/locations/:id', (req, res) => {
  const { id } = req.params
  
  db.run(
    'DELETE FROM locations WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else if (this.changes === 0) {
        res.status(404).json({ success: false, error: 'Location not found' })
      } else {
        res.json({ success: true, message: 'Location deleted successfully' })
      }
    }
  )
})

// Providers routes
app.get('/api/providers', (req, res) => {
  db.all('SELECT * FROM providers ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message })
    } else {
      // Parse logo JSON
      const providers = rows.map(row => ({
        ...row,
        logo: row.logo ? JSON.parse(row.logo) : null
      }))
      res.json(providers)
    }
  })
})

app.post('/api/providers', (req, res) => {
  const { name, company, contact, phone, gamesCount, contractType, contractEnd, status, logo, notes } = req.body
  const logoJson = logo ? JSON.stringify(logo) : null
  
  db.run(
    'INSERT INTO providers (name, company, contact, phone, gamesCount, contractType, contractEnd, status, logo, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, company, contact, phone, gamesCount || 0, contractType || 'Standard', contractEnd, status || 'Active', logoJson, notes],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else {
        const newItem = {
          id: this.lastID,
          name,
          company,
          contact,
          phone,
          gamesCount: gamesCount || 0,
          contractType: contractType || 'Standard',
          contractEnd,
          status: status || 'Active',
          logo: logo || null,
          notes,
          createdAt: new Date().toISOString()
        }
        res.json(newItem)
      }
    }
  )
})

app.put('/api/providers/:id', (req, res) => {
  const { id } = req.params
  const { name, company, contact, phone, gamesCount, contractType, contractEnd, status, logo, notes } = req.body
  const logoJson = logo ? JSON.stringify(logo) : null
  
  db.run(
    'UPDATE providers SET name = ?, company = ?, contact = ?, phone = ?, gamesCount = ?, contractType = ?, contractEnd = ?, status = ?, logo = ?, notes = ? WHERE id = ?',
    [name, company, contact, phone, gamesCount || 0, contractType || 'Standard', contractEnd, status || 'Active', logoJson, notes, id],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else if (this.changes === 0) {
        res.status(404).json({ success: false, error: 'Provider not found' })
      } else {
        res.json({ success: true, message: 'Provider updated successfully' })
      }
    }
  )
})

app.delete('/api/providers/:id', (req, res) => {
  const { id } = req.params
  
  db.run(
    'DELETE FROM providers WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        res.status(500).json({ success: false, error: err.message })
      } else if (this.changes === 0) {
        res.status(404).json({ success: false, error: 'Provider not found' })
      } else {
        res.json({ success: true, message: 'Provider deleted successfully' })
      }
    }
  )
})

// Generic route for other entities (return empty arrays for now)
const entities = ['cabinets', 'gameMixes', 'slots', 'warehouse', 'metrology', 'jackpots', 'invoices', 'onjnReports', 'legalDocuments', 'users']

entities.forEach(entity => {
  app.get(`/api/${entity}`, (req, res) => {
    res.json([])
  })
  
  app.post(`/api/${entity}`, (req, res) => {
    res.json({ success: true, message: `${entity} endpoint not implemented yet` })
  })
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
  
  // Check AWS configuration
  const isS3Enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  if (isS3Enabled) {
    console.log(`☁️ AWS S3 enabled - files and backups will be stored in cloud`)
    console.log(`📦 S3 Bucket: ${process.env.AWS_S3_BUCKET}`)
  } else {
    console.log(`💾 AWS S3 not configured - using local storage`)
    console.log(`⚠️ Configure AWS credentials in .env for cloud storage`)
  }
  
  // Start automatic backups
  scheduleBackups()
})

export default app
