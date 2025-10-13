import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://jeka7ro:your_password@jeka7ro.gkyalir.mongodb.net/cashpot?retryWrites=true&w=majority&appName=jeka7ro'

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch((err) => console.error('❌ MongoDB connection error:', err))

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: String,
  email: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  license: String,
  email: String,
  phone: String,
  address: String,
  status: { type: String, default: 'Active' },
  contactPerson: String,
  notes: String,
  createdBy: { type: String, default: 'admin' },
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  company: { type: String, required: true },
  surface: Number,
  status: { type: String, default: 'Active' },
  coordinates: String,
  planFile: String,
  notes: String,
  createdBy: { type: String, default: 'admin' },
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const slotSchema = new mongoose.Schema({
  slotId: { type: String, required: true },
  location: { type: String, required: true },
  game: String,
  payout: Number,
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const providerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  contact: { type: String, required: true },
  phone: { type: String, required: true },
  gamesCount: { type: Number, default: 0 },
  contractType: { type: String, default: 'Standard' },
  contractEnd: String,
  status: { type: String, default: 'Active' },
  logo: {
    type: { type: String, enum: ['upload', 'link'] },
    url: String,
    file: String
  },
  notes: String,
  createdBy: { type: String, default: 'admin' },
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const cabinetSchema = new mongoose.Schema({
  cabinetId: String,
  location: String,
  game: String,
  status: String,
  lastMaintenance: Date,
  createdAt: { type: Date, default: Date.now }
})

const gameMixSchema = new mongoose.Schema({
  mixName: String,
  games: [String],
  probability: Number,
  status: String,
  createdAt: { type: Date, default: Date.now }
})

const warehouseSchema = new mongoose.Schema({
  itemName: String,
  category: String,
  quantity: Number,
  supplier: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
})

const metrologySchema = new mongoose.Schema({
  deviceId: String,
  type: String,
  lastCalibration: Date,
  nextCalibration: Date,
  status: String,
  createdAt: { type: Date, default: Date.now }
})

const jackpotSchema = new mongoose.Schema({
  jackpotId: String,
  game: String,
  amount: Number,
  winner: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
})

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  customer: String,
  amount: Number,
  status: String,
  dueDate: Date,
  createdAt: { type: Date, default: Date.now }
})

const onjnReportSchema = new mongoose.Schema({
  reportType: String,
  period: String,
  status: String,
  generatedBy: String,
  createdAt: { type: Date, default: Date.now }
})

const legalDocumentSchema = new mongoose.Schema({
  documentName: String,
  type: String,
  version: String,
  status: String,
  uploadedBy: String,
  createdAt: { type: Date, default: Date.now }
})

// Models
const User = mongoose.model('User', userSchema)
const Company = mongoose.model('Company', companySchema)
const Location = mongoose.model('Location', locationSchema)
const Slot = mongoose.model('Slot', slotSchema)
const Provider = mongoose.model('Provider', providerSchema)
const Cabinet = mongoose.model('Cabinet', cabinetSchema)
const GameMix = mongoose.model('GameMix', gameMixSchema)
const Warehouse = mongoose.model('Warehouse', warehouseSchema)
const Metrology = mongoose.model('Metrology', metrologySchema)
const Jackpot = mongoose.model('Jackpot', jackpotSchema)
const Invoice = mongoose.model('Invoice', invoiceSchema)
const ONJNReport = mongoose.model('ONJNReport', onjnReportSchema)
const LegalDocument = mongoose.model('LegalDocument', legalDocumentSchema)

// Middleware
app.use(morgan('combined'))
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
})
app.use('/api/', limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  })
})

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    let user = await User.findOne({ username })
    
    // Create default admin if not exists
    if (!user && username === 'admin') {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      user = await User.create({
        username: 'admin',
        password: hashedPassword,
        fullName: 'Administrator',
        email: 'admin@cashpot.com',
        role: 'admin'
      })
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    
    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }
    
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'cashpot-secret-key-2024',
      { expiresIn: '24h' }
    )
    
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Generic CRUD Routes
const createCRUDRoutes = (path, Model) => {
  // GET all
  app.get(`/api/${path}`, async (req, res) => {
    try {
      let items
      
      // Special handling for locations to calculate capacity
      if (path === 'locations') {
        items = await Model.find().sort({ createdAt: -1 })
        
        // Calculate capacity from slots for each location
        for (let location of items) {
          const slotCount = await Slot.countDocuments({ location: location.name })
          location.capacity = slotCount
        }
        
        // Convert to plain objects
        items = items.map(item => {
          const obj = item.toObject()
          obj.capacity = item.capacity || 0
          return obj
        })
      } else {
        items = await Model.find().sort({ createdAt: -1 })
      }
      
      res.json(items)
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })
  
  // GET by ID
  app.get(`/api/${path}/:id`, async (req, res) => {
    try {
      const item = await Model.findById(req.params.id)
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item not found' })
      }
      res.json(item)
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })
  
  // POST create
  app.post(`/api/${path}`, async (req, res) => {
    try {
      const item = await Model.create(req.body)
      res.json(item)
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })
  
  // PUT update
  app.put(`/api/${path}/:id`, async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: new Date() },
        { new: true }
      )
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item not found' })
      }
      res.json({ success: true, message: 'Item updated successfully', item })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })
  
  // DELETE
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id)
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item not found' })
      }
      res.json({ success: true, message: 'Item deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })
}

// Create CRUD routes for all models
createCRUDRoutes('companies', Company)
createCRUDRoutes('locations', Location)
createCRUDRoutes('slots', Slot)
createCRUDRoutes('providers', Provider)
createCRUDRoutes('cabinets', Cabinet)
createCRUDRoutes('gameMixes', GameMix)
createCRUDRoutes('warehouse', Warehouse)
createCRUDRoutes('metrology', Metrology)
createCRUDRoutes('jackpots', Jackpot)
createCRUDRoutes('invoices', Invoice)
createCRUDRoutes('onjnReports', ONJNReport)
createCRUDRoutes('legalDocuments', LegalDocument)
createCRUDRoutes('users', User)

// Initialize database with sample data
const initializeDatabase = async () => {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ username: 'admin' })
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await User.create({
        username: 'admin',
        password: hashedPassword,
        fullName: 'Administrator',
        email: 'admin@cashpot.com',
        role: 'admin'
      })
      console.log('✅ Admin user created')
    }
    
    // Check if we need sample data
    const companiesCount = await Company.countDocuments()
    
    if (companiesCount === 0) {
      // Create sample companies
      await Company.create([
        {
          name: 'BRML Industries',
          license: 'LIC-2024-001',
          email: 'contact@brml.ro',
          phone: '+40 21 123 4567',
          address: 'Str. Aviatorilor nr. 10, București',
          status: 'Active',
          contactPerson: 'Ion Popescu'
        },
        {
          name: 'RMC Technologies',
          license: 'LIC-2024-002',
          email: 'info@rmc.ro',
          phone: '+40 21 234 5678',
          address: 'Bd. Unirii nr. 25, Cluj-Napoca',
          status: 'Active',
          contactPerson: 'Maria Ionescu'
        }
      ])
      
      // Create sample locations
      await Location.create([
        {
          name: 'Locația Centru',
          address: 'Str. Centrală nr. 1, București',
          company: 'BRML Industries',
          surface: 150,
          status: 'Active'
        },
        {
          name: 'Locația Nord',
          address: 'Bd. Nordului nr. 25, Cluj',
          company: 'RMC Technologies',
          surface: 200,
          status: 'Active'
        }
      ])
      
      console.log('✅ Sample data created')
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error)
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 API: http://localhost:${PORT}/api`)
  console.log(`💚 Health: http://localhost:${PORT}/health`)
  
  // Initialize database
  await initializeDatabase()
})

export default app

