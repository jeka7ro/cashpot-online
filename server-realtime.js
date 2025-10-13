import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import morgan from 'morgan'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'

// Middleware
app.use(cors())
app.use(express.json())
app.use(helmet())
app.use(compression())
app.use(morgan('dev'))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only images, PDFs, and Office documents are allowed'))
    }
  }
})

let db

// Initialize SQLite database with enhanced schema
async function initializeDatabase() {
  db = await open({
    filename: './cashpot.db',
    driver: sqlite3.Database
  })

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      fullName TEXT,
      email TEXT,
      role TEXT,
      status TEXT,
      lastLogin TEXT,
      avatar TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      license TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      contactPerson TEXT,
      status TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      address TEXT,
      company TEXT,
      capacity INTEGER,
      status TEXT,
      coordinates TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      contact TEXT,
      phone TEXT,
      gamesCount INTEGER,
      contractType TEXT,
      contractEnd TEXT,
      status TEXT,
      avatar TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cabinets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cabinetId TEXT,
      location TEXT,
      game TEXT,
      serialNumber TEXT,
      lastMaintenance TEXT,
      status TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gameMixes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mixName TEXT,
      games TEXT,
      probability TEXT,
      status TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slotId TEXT,
      game TEXT,
      location TEXT,
      payout TEXT,
      status TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warehouse (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itemName TEXT,
      category TEXT,
      quantity INTEGER,
      supplier TEXT,
      status TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metrology (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deviceId TEXT,
      type TEXT,
      lastCalibration TEXT,
      nextCalibration TEXT,
      status TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jackpots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jackpotId TEXT,
      game TEXT,
      amount TEXT,
      winner TEXT,
      status TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNumber TEXT,
      customer TEXT,
      amount TEXT,
      status TEXT,
      dueDate TEXT,
      filePath TEXT,
      createdBy TEXT,
      updatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS onjnReports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reportType TEXT,
      period TEXT,
      status TEXT,
      filePath TEXT,
      generatedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS legalDocuments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      documentName TEXT,
      type TEXT,
      version TEXT,
      status TEXT,
      filePath TEXT,
      uploadedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      action TEXT,
      entity TEXT,
      entityId TEXT,
      details TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Insert default admin user if not exists
  const adminUser = await db.get('SELECT * FROM users WHERE username = ?', ['admin'])
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await db.run(
      'INSERT INTO users (username, password, fullName, email, role, status, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['admin', hashedPassword, 'Administrator Sistem', 'admin@cashpot-v7.com', 'admin', 'active', 'https://ui-avatars.com/api/?name=Admin&size=32&background=4F46E5&color=fff']
    )
    console.log('Default admin user created.')
  }

  // Insert sample data
  await insertSampleData()
}

async function insertSampleData() {
  // Sample companies
  const companiesCount = await db.get('SELECT COUNT(*) as count FROM companies')
  if (companiesCount.count === 0) {
    await db.run(
      'INSERT INTO companies (name, license, email, phone, address, contactPerson, status, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['BRML Industries SRL', 'L-2024-001', 'contact@brml.ro', '+40 21 123 4567', 'Str. Centrală nr. 1, București', 'Ion Popescu', 'Active', 'admin']
    )
    await db.run(
      'INSERT INTO companies (name, license, email, phone, address, contactPerson, status, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['RMC Technologies', 'L-2024-002', 'info@rmc-tech.ro', '+40 264 987 654', 'Bd. Nordului nr. 25, Cluj', 'Maria Ionescu', 'Active', 'admin']
    )
    console.log('Sample companies inserted.')
  }
  
  // Sample locations
  const locationsCount = await db.get('SELECT COUNT(*) as count FROM locations')
  if (locationsCount.count === 0) {
    await db.run(
      'INSERT INTO locations (name, address, company, capacity, status, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      ['Locația Centru', 'Str. Centrală nr. 1, București', 'BRML Industries', 50, 'Activ', 'admin']
    )
    await db.run(
      'INSERT INTO locations (name, address, company, capacity, status, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      ['Locația Nord', 'Bd. Nordului nr. 25, Cluj', 'RMC Technologies', 30, 'Activ', 'admin']
    )
    console.log('Sample locations inserted.')
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', (room) => {
    socket.join(room)
    console.log(`User ${socket.id} joined room: ${room}`)
  })

  socket.on('leave-room', (room) => {
    socket.leave(room)
    console.log(`User ${socket.id} left room: ${room}`)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Helper function to broadcast changes
function broadcastChange(entity, action, data, userId) {
  io.emit('data-change', {
    entity,
    action,
    data,
    userId,
    timestamp: new Date().toISOString()
  })
}

// Helper function to log activity
async function logActivity(userId, action, entity, entityId, details) {
  try {
    await db.run(
      'INSERT INTO activity_logs (userId, action, entity, entityId, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, entity, entityId, JSON.stringify(details)]
    )
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username])

  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    
    // Update last login
    await db.run('UPDATE users SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), user.id])
    
    // Log activity
    await logActivity(user.id, 'LOGIN', 'users', user.id, { username: user.username })
    
    res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role, 
        status: user.status,
        avatar: user.avatar
      } 
    })
  } else {
    res.status(401).json({ success: false, message: 'Credențiale invalide' })
  }
})

// Middleware to protect API routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.sendStatus(401)

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedUsers: io.engine.clientsCount
  })
})

// Generic CRUD for entities with real-time updates
const setupCrudRoutes = (entityName, tableName) => {
  // Get all items
  app.get(`/api/${entityName}`, authenticateToken, async (req, res) => {
    try {
      const items = await db.all(`SELECT * FROM ${tableName} ORDER BY updatedAt DESC`)
      res.json(items)
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  })

  // Get single item
  app.get(`/api/${entityName}/:id`, authenticateToken, async (req, res) => {
    try {
      const item = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id])
      if (item) {
        res.json(item)
      } else {
        res.status(404).json({ message: 'Item not found' })
      }
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  })

  // Create item
  app.post(`/api/${entityName}`, authenticateToken, async (req, res) => {
    try {
      const { columns, values, placeholders } = formatInsertData(req.body, req.user.id)
      const result = await db.run(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
        values
      )
      
      const newItem = { id: result.lastID, ...req.body, createdBy: req.user.id, updatedBy: req.user.id }
      
      // Log activity
      await logActivity(req.user.id, 'CREATE', entityName, result.lastID, newItem)
      
      // Broadcast change
      broadcastChange(entityName, 'CREATE', newItem, req.user.id)
      
      res.status(201).json(newItem)
    } catch (err) {
      res.status(400).json({ message: err.message })
    }
  })

  // Update item
  app.put(`/api/${entityName}/:id`, authenticateToken, async (req, res) => {
    try {
      const { updates, values } = formatUpdateData(req.body, req.user.id)
      await db.run(
        `UPDATE ${tableName} SET ${updates} WHERE id = ?`,
        [...values, req.params.id]
      )
      
      const updatedItem = { id: req.params.id, ...req.body, updatedBy: req.user.id }
      
      // Log activity
      await logActivity(req.user.id, 'UPDATE', entityName, req.params.id, updatedItem)
      
      // Broadcast change
      broadcastChange(entityName, 'UPDATE', updatedItem, req.user.id)
      
      res.json({ message: 'Item updated successfully', id: req.params.id, ...req.body })
    } catch (err) {
      res.status(400).json({ message: err.message })
    }
  })

  // Delete item
  app.delete(`/api/${entityName}/:id`, authenticateToken, async (req, res) => {
    try {
      await db.run(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id])
      
      // Log activity
      await logActivity(req.user.id, 'DELETE', entityName, req.params.id, {})
      
      // Broadcast change
      broadcastChange(entityName, 'DELETE', { id: req.params.id }, req.user.id)
      
      res.json({ message: 'Item deleted successfully' })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  })
}

// Helper to format data for INSERT statements
const formatInsertData = (data, userId) => {
  const enhancedData = {
    ...data,
    createdBy: userId,
    updatedBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  const columns = Object.keys(enhancedData).join(', ')
  const placeholders = Object.keys(enhancedData).map(() => '?').join(', ')
  const values = Object.values(enhancedData)
  return { columns, values, placeholders }
}

// Helper to format data for UPDATE statements
const formatUpdateData = (data, userId) => {
  const enhancedData = {
    ...data,
    updatedBy: userId,
    updatedAt: new Date().toISOString()
  }
  
  const updates = Object.keys(enhancedData).map(key => `${key} = ?`).join(', ')
  const values = Object.values(enhancedData)
  return { updates, values }
}

// File upload routes
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString()
    }
    
    // Log activity
    logActivity(req.user.id, 'UPLOAD', 'files', req.file.filename, fileInfo)
    
    res.json({ success: true, file: fileInfo })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Activity logs endpoint
app.get('/api/activity-logs', authenticateToken, async (req, res) => {
  try {
    const logs = await db.all(`
      SELECT al.*, u.fullName, u.username 
      FROM activity_logs al 
      LEFT JOIN users u ON al.userId = u.id 
      ORDER BY al.timestamp DESC 
      LIMIT 100
    `)
    res.json(logs)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Setup CRUD for all entities
const entities = ['companies', 'locations', 'providers', 'cabinets', 'gameMixes', 'slots', 'warehouse', 'metrology', 'jackpots', 'invoices', 'onjnReports', 'legalDocuments', 'users']
entities.forEach(entity => {
  setupCrudRoutes(entity, entity)
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// Initialize database and start server
initializeDatabase().then(() => {
  console.log('✅ SQLite database initialized and populated.')
  server.listen(PORT, () => {
    console.log(`🚀 Real-time Backend Server running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/health`)
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
    console.log(`🔌 Socket.io enabled for real-time updates`)
  })
}).catch(err => {
  console.error('❌ Failed to initialize database:', err)
  process.exit(1)
})
